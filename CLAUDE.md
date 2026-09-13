# TTC Aalst - Monorepo

Website for TTC Aalst table tennis club.

## Structure

- `frontend/` - React, TypeScript, Vite frontend (see `frontend/CLAUDE.md`)
- `backend/` - C#, .NET 10, WebApi, MySQL backend (see `backend/CLAUDE.md`)

## Rules

- **Boy scout rule**: When touching a component, add or update tests for it.

## Local Development

### With Docker (recommended)

```bash
docker compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:3000 (Vite HMR)
- Backend: http://localhost:5193/swagger (dotnet watch)
- MySQL: localhost:7202

### Without Docker

```bash
# Start just the database
docker compose -f docker-compose.dev.yml up db

# Backend (in separate terminal)
cd backend
dotnet run --project src/Ttc.WebApi

# Frontend (in separate terminal)
cd frontend
bun install
bun start
```

## LSP

`.mcp.json` wires the `lsp` MCP server (`lsp-mcp-server`) to both stacks via `.lsp-mcp.json`:
`typescript-language-server` for `frontend/`, `csharp-ls` for `backend/src/Ttc.sln`.

```bash
bun add -g lsp-mcp-server typescript-language-server typescript
dotnet tool install -g csharp-ls
```

- TypeScript results only cover files the server has opened. Call `lsp_index_files` with the
  candidate files (`grep -rl <symbol> frontend/src`) before `lsp_find_references` or `lsp_rename`.
- `csharp-ls` takes ~40s to load the solution; the first C# call returns empty.
- `--solution` in `.lsp-mcp.json` resolves against the repo root, not the detected workspace root.
