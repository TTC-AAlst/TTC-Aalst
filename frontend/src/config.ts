export const config = {
  ga: 'G-DFM5137DWX',
  backend: '',
  version: import.meta.env.VITE_APP_VERSION ?? 'dev',
  images: '',
};

export const devUrl = 'http://localhost:5193';

export function isDev() {
  return window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.');
}

// Production is only the public apex. Everything else (local, 192.168.*, dev-*.sangu.be,
// pr-N-*.sangu.be previews) is non-prod and gets a visible header warning.
export function isProd() {
  const { hostname } = window.location;
  return hostname === 'ttc-aalst.be' || hostname === 'www.ttc-aalst.be';
}

export function getApiUrl(path: string): string {
  const full = `/api${path}`;
  return isDev() ? `${devUrl}${full}` : `${config.backend}${full}`;
}

export function getSignalRUrl() {
  return isDev() ? `${devUrl}/hubs/ttc` : `${config.backend}/hubs/ttc`;
}

export function getStaticFileUrl(path: string) {
  return isDev() ? `${devUrl}${path}` : `${config.images}${path}`;
}
