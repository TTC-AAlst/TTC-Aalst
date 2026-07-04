import http from '../httpClient';
import { sessionId, logger } from '../logger';

describe('httpClient.post', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves on a 200 with an empty body instead of rejecting', async () => {
    // ASP.NET POST actions returning Task send 200 with no body; response.json() would throw.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
          json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
        } as unknown as Response),
      ),
    );

    await expect(http.post('/config', { key: 'year', value: '2026' })).resolves.toBeUndefined();
  });

  it('parses a JSON body when one is returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('{"id":42}'),
          json: () => Promise.resolve({ id: 42 }),
        } as unknown as Response),
      ),
    );

    await expect(http.post('/something')).resolves.toEqual({ id: 42 });
  });
});

describe('httpClient logging + correlation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { hostname: 'dev-ttc-aalst.sangu.be', pathname: '/x' }, writable: true });
    vi.restoreAllMocks();
  });

  it('attaches the X-Session-Id header to requests', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(null), text: () => Promise.resolve('') } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);

    await http.get('/players');

    const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const init = callArgs[1];
    expect((init.headers as Record<string, string>)['X-Session-Id']).toBe(sessionId);
  });

  it('does not throw or recurse when posting to /log', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve('') } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);
    await http.post('/log', {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('logs a warn on a failed (non-2xx) response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null), text: () => Promise.resolve('') } as unknown as Response)),
    );
    const warnSpy = vi.spyOn(logger, 'warn');

    await http.get('/players');

    expect(warnSpy).toHaveBeenCalledWith('api', expect.objectContaining({ status: 404 }));
  });
});
