/**
 * Klient pro volání uuApp commandů podle uuApp standardu.
 * Každý uuCommand je HTTP endpoint {baseUri}{ucName}; autentizace je Bearer id_token.
 */

export class UuAppError extends Error {
  status: number;
  uuAppErrorMap?: Record<string, any>;

  constructor(message: string, status: number, uuAppErrorMap?: Record<string, any>) {
    super(message);
    this.name = 'UuAppError';
    this.status = status;
    this.uuAppErrorMap = uuAppErrorMap;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

/**
 * dtoIn → query string stejně jako v oficiálním uuAppClient (dot-notation):
 * { pageInfo: { pageSize: 10 } } → "pageInfo.pageSize=10", { list: ["a"] } → "list[0]=a".
 */
export function toQuery(value: any, key: string = ''): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => toQuery(item, `${key}[${i}]`));
  }
  if (value instanceof Date) {
    return toQuery(value.toISOString(), key);
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      toQuery(v, key ? `${key}.${k}` : k)
    );
  }
  return [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`];
}

export type UuCmdOptions = {
  token: string;
  method?: 'GET' | 'POST';
  dtoIn?: Record<string, any>;
};

import { telemetry } from './telemetry';

export async function callUuCmd<T = any>(
  baseUri: string,
  ucName: string,
  opts: UuCmdOptions
): Promise<T> {
  const method = opts.method ?? 'GET';
  let url = baseUri.replace(/\/?$/, '/') + ucName;
  if (method === 'GET' && opts.dtoIn) {
    const queryParts = toQuery(opts.dtoIn);
    if (queryParts.length > 0) {
      url += '?' + queryParts.join('&');
    }
  }

  const stage = ucName.includes('listMTInfo')
    ? 'people'
    : ucName.includes('listMy')
    ? 'diary'
    : 'network';

  telemetry.call({
    uri: url,
    method,
    title: `uuCommand: ${ucName}`,
    detail: `Volání ${method} na ${url.slice(0, 70)}...`,
    stage,
  });

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: 'application/json',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'POST' ? JSON.stringify(opts.dtoIn ?? {}) : undefined,
  });

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Pokud uuApp vrátila jiný obsah než JSON
  }

  if (!res.ok) {
    const map = body?.uuAppErrorMap;
    const first = map && Object.entries(map)[0];
    const detail = first
      ? `${first[0]}: ${first[1]?.message ?? ''}`
      : text.slice(0, 300);

    telemetry.call({
      uri: url,
      method,
      title: `Chyba uuCommand: ${ucName} (HTTP ${res.status})`,
      detail,
      response: body || { raw: text },
      stage,
    });

    throw new UuAppError(
      `${ucName} selhal (HTTP ${res.status}) – ${detail}`,
      res.status,
      map
    );
  }

  if (!body || typeof body !== 'object') {
    throw new UuAppError(`${ucName}: server nevrátil platná JSON data.`, res.status);
  }

  telemetry.call({
    uri: url,
    method,
    title: `Úspěch uuCommand: ${ucName} (HTTP 200)`,
    detail: body?.itemList ? `Vráceno ${body.itemList.length} položek` : 'Odpověď přijata v pořádku',
    response: body,
    stage,
  });

  return body as T;
}
