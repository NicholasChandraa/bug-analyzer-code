from fastapi import FastAPI

app = FastAPI(title="Smart Bug Triage Engine")


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok"}
