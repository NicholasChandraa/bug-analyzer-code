"""1:1 port dari backend/src/infra/llm/get-chat-model.ts.

Provider-agnostic lewat format Chat Completions ala-OpenAI - ganti provider tinggal ganti
LLM_BASE_URL/LLM_API_KEY/LLM_MODEL di .env, gak perlu sentuh kode ini."""

from langchain_openai import ChatOpenAI

from app.config import settings


def get_chat_model() -> ChatOpenAI:
    return ChatOpenAI(
        api_key=settings.LLM_API_KEY,
        model=settings.LLM_MODEL,
        base_url=settings.LLM_BASE_URL,
    )
