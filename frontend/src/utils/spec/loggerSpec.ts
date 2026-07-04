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
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('flushes an error immediately as a POST to /api/log', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);

    logger.error('boom', { componentStack: 'at X' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
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
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.entries).toHaveLength(2);
  });

  it('swallows fetch failures (no throw, no loop)', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network'))),
    );
    expect(() => logger.error('boom')).not.toThrow();
  });

  it('evicts the oldest entry when the buffer exceeds 100', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);

    for (let i = 0; i < 101; i++) logger.breadcrumb(String(i)); // overflow by one
    flush();

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.entries).toHaveLength(100);
    expect(body.entries[0].message).toBe('1'); // entry '0' was dropped (oldest-first)
    expect(body.entries[99].message).toBe('100');
  });

  it('uses navigator.sendBeacon (not fetch) when flushing with useBeacon', () => {
    const beacon = vi.fn();
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', { sendBeacon: beacon, userAgent: 'test-agent' });

    logger.breadcrumb('bye');
    flush(true);

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]![0]).toContain('/api/log');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
