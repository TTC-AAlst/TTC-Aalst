import { config, getApiUrl, isDev, isProd } from '../config';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
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
  if (isProd()) return 'prod';
  if (isDev()) return 'local';
  const h = window.location.hostname;
  return (h.split('.')[0] ?? h).replace(/-ttc.*/, '');
}

function envelope(entries: LogEntry[]) {
  return {
    sessionId,
    userAgent: navigator.userAgent,
    // Snapshot at flush time (not per-entry) — good enough for debugging; avoids per-entry capture.
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
