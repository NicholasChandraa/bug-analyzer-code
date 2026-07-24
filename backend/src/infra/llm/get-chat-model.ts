import { ChatOpenAI } from "@langchain/openai";
import { env } from "../../config/env.js";

/**
 * Provider-agnostic chat model client untuk pipeline LangGraph triage.
 * Nyaris semua LLM gateway (OpenAI, OpenRouter, SumoPod, Groq) menggunakan format Chat Completions yang sama.
 * Kecuali Gemini dan Claude yang punya format gatewaynya sendiri
 * jadi ganti provider tinggal ganti LLM_BASE_URL/LLM_API_KEY/LLM_MODEL di .env
 * gak perlu sentuh kode ini sama sekali.
 * 
 * Kalau nanti butuh provider yang beneran ga compatible (misal native tool-callng Claude tanpa lewat compat layer)
 * tambah cabang baru disini pake integration package Langchain yang sesuai (misalnya @langchain/antropic atau @langchain/gemini)
 */
export function getChatModel() {
    return new ChatOpenAI({
        apiKey: env.LLM_API_KEY,
        model: env.LLM_MODEL,
        configuration: env.LLM_BASE_URL ? { baseURL: env.LLM_BASE_URL } : undefined,
    })
}