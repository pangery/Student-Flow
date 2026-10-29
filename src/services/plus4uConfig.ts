/**
 * Konfigurace Plus4U OIDC a uuApp rozhraní.
 *
 * Hodnoty OIDC klienta jsou převzaté z uuAppDevKit
 * (uu_appg01_devkit-common/src/scripts/oidc-client.js). Jde o veřejného
 * "developer" klienta, který povoluje redirect na http://localhost:<port>.
 */

export const OIDC_URI =
  "https://uuidentity.plus4u.net/uu-oidc-maing02/bb977a99f4cc4c37a2afce3fd599d0a7/oidc";

export const OIDC_CLIENT_ID = "F64b643R05xQ62696875W1j2";
export const OIDC_CLIENT_SECRET =
  "2u1q5KU2Z0Bs5SErmYVwM053+zyKDxT7QLU2Q7Rr7nn5t5%Bt80px8mf3$s16FdK";

/** "https://" jako audience = token je použitelný pro libovolnou https uuApp (např. uuPlus4UPeople i uuDwRecord). */
export const OIDC_SCOPE = "openid https:// http://localhost";

/**
 * Na tuto adresu OIDC server po přihlášení přesměruje.
 * WebView v aplikaci tuto navigaci zachytí dřív, než se načte, a vytáhne z ní ?code=.
 */
export const REDIRECT_URI = "http://localhost:53682";

export const APP_CALLBACK_URL = "studentflow://auth";

export const PLUS4U_PEOPLE_BASE_URI =
  "https://uuapp.plus4u.net/uu-plus4upeople-maing01/56ac93ddb0034de8b8e4f4b829ff7d0f/";

/** Shared school workspace; student selection always uses the authenticated uuIdentity. */
export const STUDY_ENGINE_BASE_URI = process.env.EXPO_PUBLIC_STUDY_ENGINE_BASE_URI ||
  'https://uuapp.plus4u.net/uu-studyengine-maing01/c91f31522347bb551f6d3ba548fc81d2/';
