import { config, devUrl, isDev, getSignalRUrl, getStaticFileUrl, getApiUrl } from '../../config';

describe('config', () => {
  it('has expected properties', () => {
    expect(config.backend).toBe('');
    expect(config.images).toBe('');
    expect(config.ga).toBeTruthy();
    expect(config.version).toBeTruthy();
  });

  it('devUrl points to localhost', () => {
    expect(devUrl).toBe('http://localhost:5193');
  });
});

describe('isDev', () => {
  it('returns true for localhost', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'localhost' }, writable: true });
    expect(isDev()).toBe(true);
  });

  it('returns true for 192.168.x.x', () => {
    Object.defineProperty(window, 'location', { value: { hostname: '192.168.1.100' }, writable: true });
    expect(isDev()).toBe(true);
  });

  it('returns false for production hostname', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'ttc-aalst.be' }, writable: true });
    expect(isDev()).toBe(false);
  });
});

describe('getSignalRUrl', () => {
  it('returns dev URL on localhost', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'localhost' }, writable: true });
    expect(getSignalRUrl()).toBe('http://localhost:5193/hubs/ttc');
  });

  it('returns production URL on prod hostname', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'ttc-aalst.be' }, writable: true });
    expect(getSignalRUrl()).toBe(`${config.backend}/hubs/ttc`);
  });
});

describe('getStaticFileUrl', () => {
  it('returns dev URL on localhost', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'localhost' }, writable: true });
    expect(getStaticFileUrl('/img/test.png')).toBe('http://localhost:5193/img/test.png');
  });

  it('returns production URL on prod hostname', () => {
    Object.defineProperty(window, 'location', { value: { hostname: 'ttc-aalst.be' }, writable: true });
    expect(getStaticFileUrl('/img/test.png')).toBe(`${config.images}/img/test.png`);
  });
});

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
