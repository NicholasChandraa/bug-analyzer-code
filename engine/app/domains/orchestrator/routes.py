"""POST /agent/invoke - NDJSON StreamingResponse (Engine→Backend leg).

Endpoint ini sekarang milik orchestrator (sebelumnya di triage/routes.py).
Orchestrator menerima request, klasifikasi intent, delegasi ke subagent, stream events kembali.
"""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.domains.orchestrator.service import invoke_orchestrator
from app.infra.schemas import AgentInvokeRequest

router = APIRouter()


@router.post("/invoke")
async def invoke(payload: AgentInvokeRequest, request: Request) -> StreamingResponse:
    agent = request.app.state.agent

    async def ndjson_stream():
        async for event in invoke_orchestrator(agent, payload.chat_session_id, payload.content):
            yield (json.dumps(event, default=str) + "\n").encode("utf-8")

    return StreamingResponse(ndjson_stream(), media_type="application/x-ndjson")