# Frontend logging to Grafana (remove stacktrace-js)

**Date:** 2026-06-21
**Status:** Approved design

## Context & problem

Frontend errors already reach Grafana/Loki: `ErrorBoundary`, `useErrorHandling`
(`window.onerror` + `unhandledrejection`), and ad-hoc posts (e.g. the
prediction-failure log) all `POST /api/config/Log` → backend serilog
`_logger.Error(...)` → Loki (`service_name="ttc-backend"`).

Two problems:

1. `stacktrace-js` is a heavy dependency whose only job is browser-side sourcemap
   symbolication into `parsedStack`. Sourcemaps aren't deployed, so it adds bundle
   weight without producing useful output.
2. The logs aren't built for *debugging*. Most "it doesn't work" reports never throw
   (empty list, swallowed fetch, wiped state). There is no correlation id to isolate
   one session, no way to tie a frontend action to its backend request, and no
   API-call breadcrumbs.

The consumer of these logs is Claude (the assistant), debugging from Loki alone when
the user reports a problem on a `pr-*` preview viewed from a phone.

## Goals

- Remove `stacktrace-js` entirely.
- A **session correlation id** on every frontend log line, also propagated to backend
  request logs, so one query reconstructs a session across both tiers.
- **Automatic API-call logging** (method, path, status, duration) — failures always,
  successes only on non-prod.
- **Breadcrumbs** (route changes + a `logger.breadcrumb()` API) on non-prod.
- Keep crash logging (the three existing sources), logging `message` + React
  `componentStack` + route — no symbolication.
- **Context tags** on every entry: `sessionId`, `userAgent`, `isMobile`, `route`,
  `env`/preview name, `appVersion` (git sha).

## Non-goals

- Sourcemap symbolication (offline-only if ever needed; not part of this work).
- Logging real prod users beyond crashes.
- A third-party logging SaaS.

## Architecture

```
browser logger ──batch POST /api/log──▶ LogController ──serilog──▶ Loki (JSON lines)
     │                                        ▲
     └── X-Session-Id header on every API ────┘ (RequestLoggingFilter enriches
                                                  request logs with SessionId)
```

Browser never touches Loki (it's `.lan`-internal and unreachable from a public
preview). Serilog already emits JSON lines to Loki, so structured properties
(`source`, `SessionId`, `level`, `route`) are queryable via `| json | ...` without
adding high-cardinality Loki labels.

## Components

### 1. Frontend `logger` module (`src/utils/logger.ts`)

- `sessionId`: `crypto.randomUUID()` minted once per page load (module-level).
- API: `logger.error(message, fields?)`, `logger.breadcrumb(message, fields?)`.
- Buffers entries; flushes via `POST /api/log` on:
  - a short timer (e.g. 5 s) when the buffer is non-empty,
  - immediately on any `error` entry,
  - `pagehide` / `visibilitychange === 'hidden'` (mobile backgrounding) — use
    `navigator.sendBeacon` here so the tail isn't lost.
- **Env gate:** `breadcrumb` and successful-API entries are dropped client-side when
  `isProd()`; `error` entries always send. Buffer cap (e.g. 100) drops oldest with a
  one-line "dropped N" marker.
- The `/api/log` POST is never itself logged (no self-log loop); log-post failures are
  swallowed.

### 2. Envelope & entry shape

```ts
// POST /api/log body
{
  sessionId: string,
  userAgent: string,
  isMobile: boolean,
  appVersion: string,     // git sha
  env: string,            // 'prod' | 'dev' | 'pr-5' ... derived from hostname
  entries: Array<{
    level: 'info' | 'warn' | 'error',
    message: string,
    route: string,
    ts: string,           // ISO
    fields?: Record<string, unknown>,   // e.g. {status, ms, method, path} or {componentStack}
  }>
}
```

### 3. `httpClient` integration

- Attach `X-Session-Id: <sessionId>` header to every request.
- After each call, emit a log entry `{method, path, status, ms}`:
  failures (non-2xx / thrown) at `warn`/`error` always; successes at `info` only when
  `!isProd()`. Exclude `POST /api/log` from this.

### 4. Error sources refactor

- `ErrorBoundary.componentDidCatch` and `useErrorHandling` (`onerror`,
  `unhandledrejection`) call `logger.error(message, { stack, componentStack })`.
- Remove `import StackTrace` and the `stacktrace-js` dependency from `package.json`.

### 5. Route-change breadcrumb

- One effect on `react-router` location change → `logger.breadcrumb('route', { to })`.
  (Non-prod only via the gate.)

### 6. Build: git sha injection

- Vite reads `import.meta.env.VITE_APP_VERSION`. `config.ts` `version` becomes
  `import.meta.env.VITE_APP_VERSION ?? 'dev'`.
- `frontend/Dockerfile`: `ARG SOURCE_COMMIT=dev` → `ENV VITE_APP_VERSION=$SOURCE_COMMIT`
  before `bun run build`. Coolify passes the commit as a build arg.

### 7. Backend `POST /api/log` (`LogController`)

- Anonymous, accepts the batch envelope above.
- For each entry, log at its own level via serilog with properties:
  `source="frontend"`, `SessionId`, `Route`, `AppVersion`, `Env`, `IsMobile`, plus the
  entry's `fields`. So: `{service_name="ttc-backend"} | json | source="frontend"`.
- Replaces single-shot `config/Log`; migrate existing callers (prediction-failure log
  in `initialLoad.ts`) to `logger`. Remove `ConfigController.Log` + `ComponentError`
  once unused.

### 8. Backend session correlation

- `RequestLoggingFilter`: read `X-Session-Id`; `LogContext.PushProperty("SessionId", …)`
  so every request log line for that call carries the same `SessionId`.
- Update its skip-list: skip `/api/log` (was `/api/config/Log`).

## Env gating

| | prod (`ttc-aalst.be`) | non-prod (dev, `pr-*`, localhost) |
|---|---|---|
| `logger.error` | sent | sent |
| `logger.breadcrumb` | dropped | sent |
| API success log | dropped | sent |
| API failure log | sent | sent |

`isProd()` already exists in `config.ts`.

## Debug query (the payoff)

```
{service_name="ttc-backend"} | json | SessionId="<id from user>"
```
→ interleaved: route changes, every API call + status, errors with component names,
across frontend and backend.

## Safety

- No self-logging of `/api/log`; swallow log-post failures (no error loops).
- Buffer cap with drop marker.
- PII: bodies are not logged by the frontend logger (only method/path/status/ms).
  Backend request logging already redacts auth endpoints.

## Testing (TDD)

- `logger`: sessionId stable per load; env gate (prod drops breadcrumb/success, keeps
  error); buffer flush on error; self-log exclusion; buffer cap.
- `httpClient`: adds `X-Session-Id`; logs failure always, success only non-prod;
  skips `/api/log`.
- Backend: `POST /api/log` logs each entry at its level with `source="frontend"`
  (extend `ConfigControllerTests` pattern); `RequestLoggingFilter` enriches `SessionId`.

## Dependencies, assumptions, risks

- **Preview backend ships to Loki.** Assumes a `pr-*` preview's backend stdout reaches
  Loki the same way dev/prod do (homelab log-shipper / serilog Loki sink). Verify on the
  first preview deploy; if not, frontend logs reach the preview backend but never Loki.
- **Coolify commit build arg.** Assumes Coolify exposes the commit sha as a build arg
  (`SOURCE_COMMIT` or similar); fallback `'dev'` if absent.

## Out of scope

- Sourcemap deployment/symbolication.
- Log retention / Loki dashboards.
