# Frontend logging to Grafana Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `stacktrace-js` with a lightweight session-correlated frontend logger that pipes structured logs (errors always, breadcrumbs + API calls on non-prod) through the backend into Loki for debugging.

**Architecture:** Browser `logger` buffers structured entries and flushes them to a new backend `POST /api/log`, which logs each at its level via serilog (JSON → Loki). Every API request carries an `X-Session-Id` header that the backend's request-logging middleware enriches onto its own logs, so one Loki query reconstructs a session across both tiers.

**Tech Stack:** React 19 + Redux Toolkit + Vite (rolldown) + Vitest (frontend); ASP.NET (.NET 10) + Serilog + Serilog.Sinks.Grafana.Loki + xUnit integration tests (backend).

**Spec:** `docs/superpowers/specs/2026-06-21-frontend-logging-design.md`

**Refinement vs spec:** API-call logging (success *and* failure) is **non-prod only**, to avoid logging routine prod 401s (e.g. `ValidateToken`) as errors. Prod still captures genuine crashes via the three error sources. Gate rule: an entry is sent when `level === 'error' || !isProd()`.

---

## File structure

| File | Responsibility | Action |
|------|----------------|--------|
| `frontend/src/config.ts` | base-url helper + git-sha version | Modify |
| `frontend/src/utils/logger.ts` | session id, buffer, flush, env gate, public API | Create |
| `frontend/src/utils/spec/loggerSpec.ts` | logger unit tests | Create |
| `frontend/src/utils/httpClient.ts` | attach session header + log API calls | Modify |
| `frontend/src/utils/spec/httpClientSpec.ts` | extend with header + logging tests | Modify |
| `frontend/src/components/App/ErrorBoundary.tsx` | use logger, drop stacktrace-js | Modify |
| `frontend/src/utils/hooks/useErrorHandling.ts` | use logger, drop stacktrace-js | Modify |
| `frontend/src/utils/hooks/spec/useErrorHandlingSpec.tsx` | error-source tests | Create |
| `frontend/src/utils/initialLoad.ts` | migrate prediction-fail log to logger | Modify |
| `frontend/src/routes.tsx` | route-change breadcrumb | Modify |
| `frontend/package.json` | remove `stacktrace-js` | Modify |
| `frontend/Dockerfile` | inject `VITE_APP_VERSION` | Modify |
| `backend/src/Ttc.WebApi/Controllers/LogController.cs` | `POST /api/log` batch endpoint | Create |
| `backend/src/Ttc.UnitTests/Integration/LogControllerTests.cs` | endpoint tests | Create |
| `backend/src/Ttc.WebApi/Utilities/Pipeline/RequestLoggerFilter.cs` | session enrich + skip `/api/log` | Modify |
| `backend/src/Ttc.WebApi/Controllers/ConfigController.cs` | remove dead `Log` action | Modify |

---

## Task 1: Frontend base-url helper + git-sha version

**Files:**
- Modify: `frontend/src/config.ts`
- Modify: `frontend/src/utils/spec/configSpec.ts`

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/utils/spec/configSpec.ts`:

```ts
import { config, getApiUrl } from '../../config';

describe('getApiUrl', () => {
  it('prefixes /api and the dev backend when on localhost', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'localhost' }, writable: true });
    expect(getApiUrl('/log')).toBe('http://localhost:5193/api/log');
  });

  it('prefixes /api with the configured backend in prod', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'ttc-aalst.be' }, writable: true });
    expect(getApiUrl('/log')).toBe('/api/log');
  });
});

describe('config.version', () => {
  it('falls back to "dev" when VITE_APP_VERSION is unset', () => {
    expect(config.version).toBe('dev');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/spec/configSpec.ts`
Expected: FAIL — `getApiUrl is not a function` / `config.version` is `'v1.0'`.

- [ ] **Step 3: Implement**

In `frontend/src/config.ts`, change the `version` line and add the helper:

```ts
export const config = {
  ga: 'G-DFM5137DWX',
  backend: '',
  version: import.meta.env.VITE_APP_VERSION ?? 'dev',
  images: '',
};
```

Add after `isDev()`:

```ts
export function getApiUrl(path: string): string {
  const full = `/api${path}`;
  return isDev() ? `${devUrl}${full}` : `${config.backend}${full}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/spec/configSpec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/config.ts frontend/src/utils/spec/configSpec.ts
git commit -m "feat(config): add getApiUrl helper and build-time version"
```

---

## Task 2: Frontend logger module

**Files:**
- Create: `frontend/src/utils/logger.ts`
- Create: `frontend/src/utils/spec/loggerSpec.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/spec/loggerSpec.ts`:

```ts
import { logger, flush, sessionId } from '../logger';

const setHost = (hostname: string) => Object.defineProperty(window, 'location', { value: { hostname, pathname: '/x' }, writable: true });

describe('logger', () => {
  beforeEach(() => {
    setHost('dev-ttc-aalst.sangu.be');
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    flush(); // drain buffer between tests
    vi.useRealTimers();
  });

  it('has a stable session id', () => {
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
  });

  it('flushes an error immediately as a POST to /api/log', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);

    logger.error('boom', { componentStack: 'at X' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/api/log');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.sessionId).toBe(sessionId);
    expect(body.entries[0]).toMatchObject({ level: 'error', message: 'boom' });
  });

  it('drops breadcrumbs on prod but keeps errors', () => {
    setHost('ttc-aalst.be');
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);

    logger.breadcrumb('nav', { to: '/teams' });
    flush();
    expect(fetchMock).not.toHaveBeenCalled();

    logger.error('crash');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('buffers breadcrumbs on non-prod and flushes on the timer', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);

    logger.breadcrumb('a');
    logger.breadcrumb('b');
    expect(fetchMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.entries).toHaveLength(2);
  });

  it('swallows fetch failures (no throw, no loop)', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));
    expect(() => logger.error('boom')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/spec/loggerSpec.ts`
Expected: FAIL — cannot resolve `../logger`.

- [ ] **Step 3: Implement**

Create `frontend/src/utils/logger.ts`:

```ts
import { config, getApiUrl, isProd } from '../config';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  route: string;
  ts: string;
  fields?: Record<string, unknown>;
}

const MAX_BUFFER = 100;
const FLUSH_MS = 5000;

export const sessionId = crypto.randomUUID();

let buffer: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function envName(): string {
  const h = window.location.hostname;
  if (h === 'ttc-aalst.be' || h === 'www.ttc-aalst.be') return 'prod';
  if (h === 'localhost' || h.startsWith('192.168.')) return 'local';
  return h.split('.')[0].replace(/-ttc.*/, ''); // dev-ttc-aalst -> dev, pr-5-ttc-aalst -> pr-5
}

function envelope(entries: LogEntry[]) {
  return {
    sessionId,
    userAgent: navigator.userAgent,
    isMobile: window.innerWidth <= 767,
    appVersion: config.version,
    env: envName(),
    entries,
  };
}

export function flush(useBeacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (buffer.length === 0) return;
  const entries = buffer;
  buffer = [];
  const url = getApiUrl('/log');
  const body = JSON.stringify(envelope(entries));
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }
  // Fire-and-forget. Never surface logging errors — that would risk an error->log->error loop.
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

function push(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  if (level !== 'error' && isProd()) return; // gate: prod sends errors only
  if (buffer.length >= MAX_BUFFER) buffer.shift();
  buffer.push({ level, message, route: window.location.pathname, ts: new Date().toISOString(), fields });
  if (level === 'error') {
    flush();
  } else if (!timer) {
    timer = setTimeout(() => flush(), FLUSH_MS);
  }
}

export const logger = {
  breadcrumb: (message: string, fields?: Record<string, unknown>) => push('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => push('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => push('error', message, fields),
};

window.addEventListener('pagehide', () => flush(true));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush(true);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/spec/loggerSpec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/logger.ts frontend/src/utils/spec/loggerSpec.ts
git commit -m "feat(logger): session-correlated frontend logger with env gate"
```

---

## Task 3: httpClient — session header + API-call logging

**Files:**
- Modify: `frontend/src/utils/httpClient.ts`
- Modify: `frontend/src/utils/spec/httpClientSpec.ts`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/utils/spec/httpClientSpec.ts`:

```ts
import { sessionId } from '../logger';

describe('httpClient logging + correlation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { hostname: 'dev-ttc-aalst.sangu.be', pathname: '/x' }, writable: true });
    vi.restoreAllMocks();
  });

  it('attaches the X-Session-Id header to requests', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('') } as unknown as Response),
    );
    vi.stubGlobal('fetch', fetchMock);

    await http.get('/players');

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(sessionId);
  });

  it('does not attach the header to its own /api/log POST', async () => {
    // logger.flush uses raw fetch, never httpClient — guard stays a no-op for /log
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('') } as unknown as Response),
    );
    vi.stubGlobal('fetch', fetchMock);
    await http.post('/log', {});
    // assertion: call still succeeds; logging path is excluded (no recursion)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/spec/httpClientSpec.ts`
Expected: FAIL — header undefined.

- [ ] **Step 3: Implement**

In `frontend/src/utils/httpClient.ts`, add imports at top:

```ts
import { sessionId, logger } from './logger';
import { isProd } from '../config';
```

Replace `authHeaders()` usage by composing a shared header set. Add a helper near `authHeaders`:

```ts
function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { 'X-Session-Id': sessionId, ...authHeaders(), ...extra };
}

function logApiCall(method: string, path: string, status: number, ms: number, ok: boolean) {
  if (path === '/log') return; // never log the logging endpoint
  const fields = { method, path, status, ms: Math.round(ms) };
  if (!ok) {
    logger.warn('api', fields);
  } else if (!isProd()) {
    logger.breadcrumb('api', fields);
  }
}
```

In `get`, replace the `fetch` headers with `baseHeaders({ Accept: 'application/json' })` and wrap timing/logging:

```ts
const start = performance.now();
const response = await fetch(url, { headers: baseHeaders({ Accept: 'application/json' }) });
logApiCall('GET', path, response.status, performance.now() - start, response.ok);
```

In `post`, replace headers with `baseHeaders({ Accept: 'application/json', 'Content-Type': 'application/json' })` and add the same timing/logging around the `fetch`:

```ts
const start = performance.now();
const response = await fetch(getUrl(url), {
  method: 'POST',
  headers: baseHeaders({ Accept: 'application/json', 'Content-Type': 'application/json' }),
  body: data !== undefined ? JSON.stringify(data) : undefined,
});
logApiCall('POST', url, response.status, performance.now() - start, response.ok);
```

(Leave `upload`/`uploadImage` unchanged for now — out of scope.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/spec/httpClientSpec.ts`
Expected: PASS (all, including the existing empty-body tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/httpClient.ts frontend/src/utils/spec/httpClientSpec.ts
git commit -m "feat(httpClient): session header + non-prod API-call logging"
```

---

## Task 4: Wire error sources to logger, drop stacktrace-js

**Files:**
- Modify: `frontend/src/components/App/ErrorBoundary.tsx`
- Modify: `frontend/src/utils/hooks/useErrorHandling.ts`
- Create: `frontend/src/utils/hooks/spec/useErrorHandlingSpec.tsx`
- Modify: `frontend/src/utils/initialLoad.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/hooks/spec/useErrorHandlingSpec.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { useErrorHandling } from '../useErrorHandling';
import { logger } from '../../logger';

describe('useErrorHandling', () => {
  it('logs window error events via logger.error', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    renderHook(() => useErrorHandling());

    window.dispatchEvent(new ErrorEvent('error', { message: 'kaboom', error: new Error('kaboom') }));

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('kaboom');
  });

  it('logs unhandled rejections via logger.error', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    renderHook(() => useErrorHandling());

    const event = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', { value: new Error('rejected') });
    window.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/hooks/spec/useErrorHandlingSpec.tsx`
Expected: FAIL — current `useErrorHandling` calls `StackTrace`/`httpClient`, not `logger.error`.

- [ ] **Step 3: Implement**

Replace `frontend/src/utils/hooks/useErrorHandling.ts` entirely:

```ts
import { useEffect } from 'react';
import { logger } from '../logger';

export const useErrorHandling = () => {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      logger.error(`window.onerror: ${event.message}`, {
        stack: event.error?.stack,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      });
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      logger.error(`unhandledrejection: ${event.reason?.message || 'Unhandled rejection'}`, {
        stack: event.reason?.stack,
      });
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);
};
```

Replace the `logErrorToBackend` method in `frontend/src/components/App/ErrorBoundary.tsx` and its imports. Remove `import StackTrace from 'stacktrace-js';` and `import httpClient from '../../utils/httpClient';`; add `import { logger } from '../../utils/logger';`. Replace `componentDidCatch`/`logErrorToBackend` with:

```ts
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ hasError: true });
    logger.error(`ErrorBoundary: ${error.message}`, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }
```

In `frontend/src/utils/initialLoad.ts`, replace the `http.post('/config/log', {...})` call in the predictions `.catch` with:

```ts
        .catch(err => {
          logger.error(`ranking predictions failed: ${err?.message || String(err)}`, { stack: err?.stack });
        });
```

Add `import { logger } from './logger';` to `initialLoad.ts` and remove the now-unused `http` import if no longer referenced (verify other usages first).

Remove `stacktrace-js` from `frontend/package.json` dependencies.

- [ ] **Step 4: Run tests + verify dep removal**

Run: `cd frontend && npx vitest run src/utils/hooks/spec/useErrorHandlingSpec.tsx`
Expected: PASS.

Run: `cd frontend && grep -rn "stacktrace-js" src package.json`
Expected: no matches.

Run: `cd frontend && bun install`
Expected: lockfile updates, `stacktrace-js` gone.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/App/ErrorBoundary.tsx frontend/src/utils/hooks/useErrorHandling.ts frontend/src/utils/hooks/spec/useErrorHandlingSpec.tsx frontend/src/utils/initialLoad.ts frontend/package.json frontend/bun.lock
git commit -m "feat(logging): route error sources through logger, drop stacktrace-js"
```

---

## Task 5: Route-change breadcrumb

**Files:**
- Modify: `frontend/src/routes.tsx`

- [ ] **Step 1: Implement (wiring — verified by build/lint)**

In `frontend/src/routes.tsx`, inside the component that already calls `useErrorHandling()`/`useSignalR()` (line ~32), add a location-change breadcrumb. Add imports:

```ts
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { logger } from './utils/logger';
```

Inside the component body:

```ts
  const location = useLocation();
  useEffect(() => {
    logger.breadcrumb('route', { to: location.pathname });
  }, [location.pathname]);
```

(If `useLocation` must be under the `Router`, place this in the inner layout component that renders the `<Routes>` — follow the existing structure where `useSignalR()` is called.)

- [ ] **Step 2: Verify**

Run: `cd frontend && npx eslint src/routes.tsx && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes.tsx
git commit -m "feat(logging): breadcrumb on route change (non-prod)"
```

---

## Task 6: Inject git sha at build time

**Files:**
- Modify: `frontend/Dockerfile`
- Modify: `docker-compose.yml`

**Context:** The Coolify apps (`ttc-aalst:dev`, `ttc-aalst:main`) use the **docker-compose build pack**. Coolify exposes the commit as the predefined variable `SOURCE_COMMIT`, available for `${...}` interpolation in `docker-compose.yml`. So the sha flows: Coolify `SOURCE_COMMIT` → compose `frontend.build.args` → Dockerfile `ARG` → `VITE_APP_VERSION` → `import.meta.env`. The `:-dev` fallback keeps local `docker compose build` and bare `vite build` working.

- [ ] **Step 1: Implement the Dockerfile change**

In `frontend/Dockerfile`, before `RUN bun run build`, add `ARG`/`ENV`. Full build stage:

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG SOURCE_COMMIT=dev
ENV VITE_APP_VERSION=$SOURCE_COMMIT
RUN bun run build
```

- [ ] **Step 2: Pass the build arg in compose**

In `docker-compose.yml`, change the `frontend` service `build` block to forward Coolify's `SOURCE_COMMIT`:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        SOURCE_COMMIT: ${SOURCE_COMMIT:-dev}
    restart: unless-stopped
    expose:
      - "80"
    depends_on:
      - backend
```

- [ ] **Step 3: Verify locally**

Run: `cd frontend && VITE_APP_VERSION=test123 bun run build && grep -rl "test123" dist/assets/*.js`
Expected: at least one bundle contains `test123` (the injected version).

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile docker-compose.yml
git commit -m "build(frontend): inject git sha as VITE_APP_VERSION via SOURCE_COMMIT"
```

> **Note:** `SOURCE_COMMIT` is Coolify's documented predefined commit variable (confirmed: these apps use the docker-compose build pack). The `:-dev` fallback means a wrong/absent value never breaks the build — it just yields `appVersion: "dev"`.

---

## Task 7: Backend `POST /api/log` endpoint

**Files:**
- Create: `backend/src/Ttc.WebApi/Controllers/LogController.cs`
- Create: `backend/src/Ttc.UnitTests/Integration/LogControllerTests.cs`
- Modify: `backend/src/Ttc.WebApi/Utilities/Pipeline/RequestLoggerFilter.cs`

- [ ] **Step 1: Write the failing test**

Create `backend/src/Ttc.UnitTests/Integration/LogControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;

namespace Ttc.UnitTests.Integration;

public class LogControllerTests : IntegrationTestBase
{
    public LogControllerTests(TtcWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Post_AcceptsBatch_Returns200()
    {
        var batch = new
        {
            sessionId = "abc-123",
            appVersion = "deadbeef",
            env = "pr-5",
            isMobile = true,
            entries = new[]
            {
                new { level = "info", message = "route", route = "/teams", ts = "2026-06-21T08:00:00Z", fields = (object?)null },
                new { level = "error", message = "boom", route = "/teams", ts = "2026-06-21T08:00:01Z", fields = (object?)null },
            },
        };

        var response = await Client.PostAsJsonAsync("/api/log", batch);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Post_EmptyBatch_Returns200()
    {
        var response = await Client.PostAsJsonAsync("/api/log", new { sessionId = "x", entries = new object[0] });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test --filter LogControllerTests`
Expected: FAIL — 404 (no `/api/log` route).

- [ ] **Step 3: Implement**

Create `backend/src/Ttc.WebApi/Controllers/LogController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using Serilog.Context;

namespace Ttc.WebApi.Controllers;

[AllowAnonymous]
[Route("api/log")]
public class LogController : ControllerBase
{
    private readonly ILogger _logger;

    public LogController(ILogger logger) => _logger = logger;

    [HttpPost]
    public IActionResult Post([FromBody] FrontendLogBatch batch)
    {
        foreach (var entry in batch.Entries)
        {
            using (LogContext.PushProperty("source", "frontend"))
            using (LogContext.PushProperty("SessionId", batch.SessionId))
            using (LogContext.PushProperty("Route", entry.Route))
            using (LogContext.PushProperty("AppVersion", batch.AppVersion))
            using (LogContext.PushProperty("Env", batch.Env))
            using (LogContext.PushProperty("IsMobile", batch.IsMobile))
            using (LogContext.PushProperty("Fields", entry.Fields, destructureObjects: true))
            {
                switch (entry.Level)
                {
                    case "error": _logger.Error("{FrontendMessage}", entry.Message); break;
                    case "warn": _logger.Warning("{FrontendMessage}", entry.Message); break;
                    default: _logger.Information("{FrontendMessage}", entry.Message); break;
                }
            }
        }
        return Ok();
    }
}

public class FrontendLogBatch
{
    public string SessionId { get; set; } = "";
    public string AppVersion { get; set; } = "";
    public string Env { get; set; } = "";
    public bool IsMobile { get; set; }
    public List<FrontendLogEntry> Entries { get; set; } = new();
}

public class FrontendLogEntry
{
    public string Level { get; set; } = "info";
    public string Message { get; set; } = "";
    public string Route { get; set; } = "";
    public string Ts { get; set; } = "";
    public object? Fields { get; set; }
}
```

In `backend/src/Ttc.WebApi/Utilities/Pipeline/RequestLoggerFilter.cs`, update the skip-list (line ~21) from `/api/config/Log` to `/api/log`:

```csharp
        if (!context.Request.Path.ToString().StartsWith("/api") || context.Request.Method == HttpMethods.Options
            || context.Request.Path.ToString() == "/api/log")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && dotnet test --filter LogControllerTests`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/Ttc.WebApi/Controllers/LogController.cs backend/src/Ttc.UnitTests/Integration/LogControllerTests.cs backend/src/Ttc.WebApi/Utilities/Pipeline/RequestLoggerFilter.cs
git commit -m "feat(api): POST /api/log batch endpoint for frontend logs"
```

---

## Task 8: Backend session correlation in request logs

**Files:**
- Modify: `backend/src/Ttc.WebApi/Utilities/Pipeline/RequestLoggerFilter.cs`
- Modify: `backend/src/Ttc.UnitTests/Integration/LogControllerTests.cs`

- [ ] **Step 1: Write the failing test**

Add to `LogControllerTests.cs` a smoke test that a request carrying the header succeeds (the enrichment itself is asserted by inspecting Loki manually; this guards the middleware doesn't break requests):

```csharp
    [Fact]
    public async Task Request_WithSessionHeader_StillSucceeds()
    {
        Client.DefaultRequestHeaders.Remove("X-Session-Id");
        Client.DefaultRequestHeaders.Add("X-Session-Id", "sess-789");

        var response = await Client.GetAsync("/api/config");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
```

- [ ] **Step 2: Run test to verify it fails or passes-trivially**

Run: `cd backend && dotnet test --filter LogControllerTests`
Expected: PASS already (header is currently ignored) — this is a regression guard for the next step.

- [ ] **Step 3: Implement enrichment**

In `RequestLoggerFilter.cs`, wrap the body of `Invoke` so every downstream log carries `SessionId`. At the top of `Invoke`:

```csharp
    public async Task Invoke(HttpContext context)
    {
        var sessionId = context.Request.Headers["X-Session-Id"].ToString();
        using var _ = string.IsNullOrEmpty(sessionId)
            ? (IDisposable)NullScope.Instance
            : Serilog.Context.LogContext.PushProperty("SessionId", sessionId);

        // ... existing method body unchanged ...
    }
```

Add a tiny `NullScope` helper at the bottom of the file (so the `using` is uniform):

```csharp
internal sealed class NullScope : IDisposable
{
    public static readonly NullScope Instance = new();
    private NullScope() { }
    public void Dispose() { }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && dotnet test --filter LogControllerTests`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/Ttc.WebApi/Utilities/Pipeline/RequestLoggerFilter.cs backend/src/Ttc.UnitTests/Integration/LogControllerTests.cs
git commit -m "feat(api): enrich request logs with X-Session-Id for correlation"
```

---

## Task 9: Remove dead ConfigController.Log + final verification

**Files:**
- Modify: `backend/src/Ttc.WebApi/Controllers/ConfigController.cs`

- [ ] **Step 1: Verify the POST endpoint is unused**

Run: `cd frontend && grep -rn "config/Log" src`
Expected: ONLY `AdminDev.tsx` referencing `/api/config/Log/Get` (the server-log-file viewer — a GET to `GetLogging`, which we KEEP). No `httpClient.post('/config/Log', ...)` callers remain (all migrated in Tasks 4 + 4b).

Run: `cd backend && grep -rn "ComponentError" src --include=*.cs`
Expected: only the `Log` action + `ComponentError` class in `ConfigController.cs`.

- [ ] **Step 2: Remove dead code (POST Log + ComponentError only)**

In `backend/src/Ttc.WebApi/Controllers/ConfigController.cs`, delete ONLY the `Log` action (the `[HttpPost] Log([FromBody] ComponentError ...)`) and the `ComponentError` class. **KEEP `GetLogging` (the `Log/Get` GET)** — `AdminDev.tsx` links to it as a log-file viewer. Keep `Get`, `Post`, `ClearCache`, `GetLogging`. Remove only `using` directives that become unreferenced after deleting `Log` (verify each before removing — `GetLogging` still uses `TtcLogger`/`Directory`/`File`).

- [ ] **Step 3: Full verification**

Run: `cd frontend && npx tsc --noEmit && npx eslint src && npx vitest run`
Expected: clean, all tests pass.

Run: `cd backend && dotnet build && dotnet test`
Expected: 0 warnings, all tests pass.

Run: `cd frontend && VITE_APP_VERSION=$(git rev-parse --short HEAD) bun run build`
Expected: build succeeds; bundle no longer contains `stacktrace-js`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/Ttc.WebApi/Controllers/ConfigController.cs
git commit -m "chore(api): remove unused frontend log endpoint and ComponentError"
```

---

## Self-review notes

- **Spec coverage:** logger module (T2), session id + correlation header (T2/T3/T8), API-call logging non-prod (T3), breadcrumbs + route change (T2/T5), drop stacktrace-js (T4), context tags incl. git sha (T1/T6), backend batch endpoint with `source="frontend"` + levels (T7), migrate old callers + remove dead endpoint (T4/T9). All spec sections map to a task.
- **Gating deviation** from spec (API failures non-prod only) is documented at the top and implemented consistently in T3.
- **Type consistency:** `FrontendLogBatch`/`FrontendLogEntry` (backend) mirror the `envelope`/`LogEntry` shape (frontend); `logger.error/warn/breadcrumb` names used identically across T2–T5; `getApiUrl` defined in T1 and consumed in T2.
- **Infra dependency:** preview backend must ship stdout to Loki (noted in spec Risks) — verify on first `pr-*` deploy.
