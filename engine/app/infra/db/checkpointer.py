"""Setup checkpointer Postgres milik Engine sendiri (LangGraph). Gak ada equivalent di TS -
di TS ini cuma `PostgresSaver.fromConnString(...)` sekali, tapi di Python versi async-nya
(`AsyncPostgresSaver.from_conn_string()`) cuma bikin SATU AsyncConnection - itu bikin semua
checkpoint read/write dari SEMUA chat session concurrent keserialisasi lewat satu koneksi.
Makanya disini bikin AsyncConnectionPool sendiri dan dikasih ke constructor-nya langsung
(cara resmi yang didukung: AsyncPostgresSaver.__init__ terima AsyncConnection | AsyncConnectionPool)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool


@asynccontextmanager
async def build_checkpointer(database_url: str, max_size: int = 10) -> AsyncIterator[AsyncPostgresSaver]:
    pool = AsyncConnectionPool(
        conninfo=database_url,
        max_size=max_size,
        open=False,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
    )
    await pool.open()
    try:
        yield AsyncPostgresSaver(conn=pool)
    finally:
        await pool.close()
