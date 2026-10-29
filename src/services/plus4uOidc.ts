import {
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
  OIDC_SCOPE,
  OIDC_URI,
  REDIRECT_URI,
} from './plus4uConfig';

export type IdTokenClaims = {
  uuidentity?: string;
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  exp?: number;
  [key: string]: any;
};

export type OidcMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  [key: string]: any;
};

import { telemetry } from './telemetry';

let metadataCache: OidcMetadata | null = null;

/** Krok 0: OIDC discovery, odkud zjistíme authorize a token endpointy. */
export async function getMetadata(): Promise<OidcMetadata> {
  if (metadataCache) return metadataCache;
  const uri = `${OIDC_URI}/.well-known/openid-configuration`;
  telemetry.stage('discovery', 15, uri);
  telemetry.call({
    uri,
    method: 'GET',
    title: 'Krok 1: OIDC Discovery',
    detail: 'Získání authorize a token endpointů z .well-known/openid-configuration',
    stage: 'discovery',
  });
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`OIDC discovery selhalo (HTTP ${res.status})`);
  metadataCache = (await res.json()) as OidcMetadata;
  return metadataCache;
}

/** Krok 1: URL přihlašovací stránky (authorization code flow). */
export function buildAuthorizeUrl(
  metadata: OidcMetadata,
  redirectUri: string = REDIRECT_URI
): string {
  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OIDC_SCOPE,
  });
  return `${metadata.authorization_endpoint}?${params.toString()}`;
}

export type ParseRedirectResult =
  | { code: string; error?: never }
  | { error: string; code?: never };

/**
 * Vrátí null, pokud URL není náš redirect. Jinak vrátí kód nebo chybu z OIDC.
 */
export function parseRedirect(
  url: string,
  redirectUri: string = REDIRECT_URI
): ParseRedirectResult | null {
  if (!url.startsWith(redirectUri)) return null;
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  const code = params.get('code');
  if (code) return { code };
  return {
    error:
      params.get('uuAppErrorMap') ??
      params.get('error') ??
      'Neznámá chyba přihlášení',
  };
}

/** Krok 2: výměna autorizačního kódu za tokeny. */
export async function exchangeCode(
  code: string,
  redirectUri: string = REDIRECT_URI
): Promise<{ id_token: string; [key: string]: any }> {
  const metadata = await getMetadata();
  telemetry.stage('token', 45, metadata.token_endpoint);
  telemetry.call({
    uri: metadata.token_endpoint,
    method: 'POST',
    title: 'Krok 3: Výměna kódu za id_token (OIDC grantToken)',
    detail: `Odeslání autorizačního kódu a client_id. redirect_uri=${redirectUri}`,
    stage: 'token',
  });
  const res = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
      scope: OIDC_SCOPE,
      redirect_uri: redirectUri,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Výměna kódu za token selhala (HTTP ${res.status}): ${body}`);
  }
  const parsed = JSON.parse(body);
  telemetry.call({
    uri: metadata.token_endpoint,
    method: 'POST',
    title: 'Krok 3: id_token úspěšně přijat',
    detail: `Položka id_token získána (délka: ${parsed.id_token?.length || 0} znaků).`,
    response: {
      status: res.status,
      token_type: parsed.token_type,
      expires_in: parsed.expires_in,
      id_token_prefix: parsed.id_token?.slice(0, 30) + '...',
    },
    stage: 'token',
  });
  return parsed;
}

/**
 * Dekódování payloadu JWT bez nutnosti externí knihovny.
 * Správně zpracovává UTF-8 diakritiku (např. české znaky ve jménech).
 */
export function decodeJwt(token: string): IdTokenClaims {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Token není platný JWT');
  const base64 = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(payload.length / 4) * 4, '=');

  // Base64 decoding in React Native / JS environment
  const binary = atob(base64);
  const utf8 = decodeURIComponent(
    Array.from(binary, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  );
  return JSON.parse(utf8) as IdTokenClaims;
}

/** uuIdentity je v Plus4U tokenu v claimu "uuidentity", jako záloha poslouží "sub". */
export function getUuIdentity(claims: IdTokenClaims): string {
  const id = claims.uuidentity ?? claims.sub;
  if (!id) throw new Error('V tokenu chybí uuIdentity (claim uuidentity/sub)');
  return id;
}

export function getDisplayName(claims: IdTokenClaims): string {
  return (
    claims.name ||
    [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
    getUuIdentity(claims)
  );
}

export function isExpired(claims: IdTokenClaims, skewSeconds: number = 30): boolean {
  if (!claims.exp) return false;
  return Date.now() / 1000 > claims.exp - skewSeconds;
}
