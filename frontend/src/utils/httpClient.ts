import dayjs from 'dayjs';
import t from '../locales';
import { IMatch } from '../models/model-interfaces';
import { config, devUrl, isDev, isProd } from '../config';
import { sessionId, logger } from './logger';

const LogRequestTimes = false;

function getUrl(path: string, appendApi = true): string {
  if (path[0] !== '/') {
    // eslint-disable-next-line no-console
    console.error('HttpClient: path passed should start with a /');
  }
  if (path.substring(0, 5) === '/api/') {
    // eslint-disable-next-line no-console
    console.error('HttpClient: path passed should not be prefixed with /api');
  }
  if (appendApi) {
    path = `/api${path}`;
  }

  return isDev() ? `${devUrl}${path}` : `${config.backend}${path}`;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { 'X-Session-Id': sessionId, ...authHeaders(), ...extra };
}

// API-call logging is non-prod only by design: warn (failures) and breadcrumb (successes) are both
// dropped on prod by the logger gate. Routine prod 4xx (e.g. ValidateToken 401s) would be pure noise;
// genuine prod crashes are still captured by the error sources (ErrorBoundary/onerror/unhandledrejection).
function logApiCall(method: string, path: string, status: number, ms: number, ok: boolean) {
  if (path === '/log') return; // never log the logging endpoint
  const fields = { method, path, status, ms: Math.round(ms) };
  if (!ok) {
    logger.warn('api', fields);
  } else if (!isProd()) {
    logger.breadcrumb('api', fields);
  }
}

const HttpClient = {
  get: <T>(path: string, qs?: Record<string, string | number | boolean>): Promise<T> => {
    let url = getUrl(path);
    const qsStringified = qs ? Object.fromEntries(Object.entries(qs).map(([k, v]) => [k, String(v)])) : undefined;
    if (qsStringified) {
      url += `?${new URLSearchParams(qsStringified).toString()}`;
    }
    const fullUrl = `GET ${qsStringified ? `${path}?${new URLSearchParams(qsStringified).toString()}` : path}`;
    return (async () => {
      if (LogRequestTimes) {
        // eslint-disable-next-line no-console
        console.time(fullUrl);
      }

      const start = performance.now();
      const response = await fetch(url, {
        headers: baseHeaders({ Accept: 'application/json' }),
      });
      logApiCall('GET', path, response.status, performance.now() - start, response.ok);

      if (LogRequestTimes) {
        // eslint-disable-next-line no-console
        console.timeEnd(fullUrl);
      }

      return response.json();
    })();
  },
  post: <T>(url: string, data?: unknown): Promise<T> => {
    const fullUrl = `POST ${url}`;
    return (async () => {
      if (LogRequestTimes) {
        // eslint-disable-next-line no-console
        console.time(fullUrl);
      }

      const start = performance.now();
      const response = await fetch(getUrl(url), {
        method: 'POST',
        headers: baseHeaders({ Accept: 'application/json', 'Content-Type': 'application/json' }),
        body: data !== undefined ? JSON.stringify(data) : undefined,
      });
      logApiCall('POST', url, response.status, performance.now() - start, response.ok);

      if (LogRequestTimes) {
        // eslint-disable-next-line no-console
        console.timeEnd(fullUrl);
      }

      // Void backend actions (e.g. POST /config) return 200 with an empty body; response.json() would throw.
      const text = await response.text();
      return text ? JSON.parse(text) : (undefined as T);
    })();
  },
  upload: async (file: File, type = 'temp', typeId = 0): Promise<{ fileName?: string }> => {
    const formData = new FormData();
    formData.append('uploadType', type);
    formData.append('uploadTypeId', String(typeId));
    formData.append('file', file);

    const response = await fetch(getUrl('/upload'), {
      method: 'POST',
      headers: { Accept: 'application/json', ...authHeaders() },
      body: formData,
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('/upload FAIL', response.status, response.statusText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  },
  uploadImage: async (imageBase64: string, dataId: number, type: string): Promise<{ imageVersion: number }> => {
    const response = await fetch(getUrl('/upload/image'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ image: imageBase64, dataId, type }),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('/upload/image', response.status, response.statusText);
      throw new Error(`Image upload failed: ${response.status}`);
    }

    return response.json();
  },
};

function b64ToBlob(b64Data: string, contentType = '', sliceSize = 512) {
  contentType = contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const byteCharacters = atob(b64Data);
  const byteArrays = [] as Uint8Array[];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays as BlobPart[], { type: contentType });
  return blob;
}

function downloadExcel(respBody: string, fileName: string, addTimestampToFileName = false) {
  const blob = b64ToBlob(respBody);
  if (addTimestampToFileName) {
    fileName += ` ${dayjs().format('YYYY-MM-DD')}.xlsx`;
  }

  const link = document.createElement('a');
  link.download = fileName;
  link.href = URL.createObjectURL(blob);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
}

async function downloadJson(path: string): Promise<string> {
  const response = await fetch(getUrl(path), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  return response.json();
}

export const downloadPlayersExcel = async (fileName: string): Promise<void> => {
  const body = await downloadJson('/players/ExcelExport');
  downloadExcel(body, fileName, true);
};

export const downloadScoresheetExcel = async (match: IMatch): Promise<void> => {
  const body = await downloadJson(`/matches/ExcelScoresheet/${match.id}`);
  const fileName = t('comp.scoresheetFileName', {
    frenoyId: match.frenoyMatchId.replace('/', '-'),
    teamCode: match.getTeam().teamCode,
    theirClub: match.getOpponentClub()?.name,
    theirTeam: match.opponent.teamCode,
  });
  downloadExcel(body, fileName);
};

export const downloadTeamsExcel = async (fileName: string): Promise<void> => {
  const body = await downloadJson('/teams/ExcelExport');
  downloadExcel(body, fileName, true);
};

export default HttpClient;
