"""FastAPI app entry point - build pool/checkpointer/agent EAGERLY at startup via lifespan.

TS lazy-singleton agentPromise itu workaround Hono gak punya clean startup hook - FastAPI's
lifespan IS hook itu, jadi build eagerly strictly better: fails fast kalau Postgres unreachable,
di deploy time bukan pas user pertama ngirim message.
"""

from contextlib import AsyncExitStack, asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request

from app.config import settings
from app.domains.orchestrator.agent import create_orchestrator_agent
from app.domains.orchestrator.routes import router as agent_router
from app.infra.backend_client import close_client
from app.infra.db.checkpointer import build_checkpointer
from app.infra.logging import configure_logging, set_request_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    async with AsyncExitStack() as stack:
        # Build pool + checkpointer (context manager ensures pool.close() on shutdown)
        checkpointer = await stack.enter_async_context(build_checkpointer(settings.DATABASE_URL))
        await checkpointer.setup()
        # httpx client cleanup on shutdown
        stack.push_async_callback(close_client)

        # Build orchestrator agent (loads MCP tools + assembles subagents internally).
        app.state.agent = await create_orchestrator_agent(checkpointer)
        yield


app = FastAPI(title="Smart Bug Triage Engine", lifespan=lifespan)
app.include_router(agent_router, prefix="/agent")


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    # Propagate request ID from Backend if forwarded, else generate new.
    rid = request.headers.get("X-Request-Id") or str(uuid4())
    set_request_id(rid)
    response = await call_next(request)
    response.headers["X-Request-Id"] = rid
    return response


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health")
def health_alias() -> dict[str, str]:
    return {"status": "ok"}
