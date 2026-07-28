# Start engine dev server - tinggal jalankan: .\start.ps1 (dari folder engine/)
# Cara Manual:
# cd engine
# $env:PYTHONPATH = "."; uv run granian --interface asgi --host 0.0.0.0 --port 8000 main:app
$env:PYTHONPATH = $PSScriptRoot
uv run granian --interface asgi --host 0.0.0.0 --port 8000 --log-level debug --reload main:app