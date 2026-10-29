// StudentFlow - Interactive Mind Map & Relational Data Flow Engine
// Architecture: Mobile Client (iOS) <-> Local Socket <-> Plus4U OIDC <-> MyTerritory <-> uuDwRecord

// --- 1. Nodes Specification (Relational Architecture) ---
const MINDMAP_NODES = [
  // Cluster 1: Student & Client App
  {
    id: 'node_student',
    name: 'Student (Jan Gergel)',
    cluster: 'Uživatel',
    icon: '🎓',
    x: 60,
    y: 380,
    method: 'USER',
    badge: 'Student',
    uri: 'user://uuIdentity/25-8321-1',
    desc: 'Student Unicorn University přistupující k aplikaci na svém zařízení iPhone. Klepnutím na tlačítko "Přihlásit přes Plus4U" iniciuje celý autentizační a synchronizační cyklus.',
    inputs: 'Manuální klepnutí na tlačítko v aplikaci',
    outputs: 'StudentFlow mobilní aplikace',
    codeRef: 'src/screens/DashboardScreen.tsx · handleStartLogin()',
    payload: {
      uuIdentity: '25-8321-1',
      name: 'Jan Gergel',
      institution: 'Unicorn University',
      studyProgramme: 'Software Development & IT',
      action: 'INITIATE_PLUS4U_LOGIN',
    },
  },
  {
    id: 'node_app',
    name: 'StudentFlow App (iOS)',
    cluster: 'Klient (React Native)',
    icon: '📱',
    x: 400,
    y: 380,
    method: 'CLIENT',
    badge: 'React Native',
    uri: 'studentflow://auth/callback',
    desc: 'Mobilní klientská aplikace běžící v nativním iOS prostředí (Expo SDK 58 / Swift 6). Koordinuje spuštění lokálního TCP serveru, otevření ASWebAuthenticationSession a ukládání získaných relací.',
    inputs: 'Uživatelská akce / TCP Callback z lokálního socketu',
    outputs: 'OIDC Discovery Endpoint & Lokální TCP server',
    codeRef: 'src/services/systemBrowserLogin.ts · loginWithSystemBrowser()',
    payload: {
      framework: 'React Native 0.83.1',
      engine: 'Expo SDK 58 (Fabric)',
      customScheme: 'studentflow://',
      storageKey: '@studentflow:session',
    },
  },

  // Cluster 2: Local Loopback TCP & Safari SSO
  {
    id: 'node_tcp_server',
    name: 'Lokální TCP HTTP Server',
    cluster: 'Nativní Socket',
    icon: '🔌',
    x: 760,
    y: 180,
    method: 'TCP / 302',
    badge: 'Loopback 127.0.0.1',
    uri: 'http://127.0.0.1:53682/',
    desc: 'Nativní mikro HTTP server běžící přímo v paměti iPhonu na náhodném volném portu (knihovna react-native-tcp-socket). Plus4U vyžaduje redirect na http://localhost nebo 127.0.0.1. Server odchytí GET dotaz s kódem a odpoví HTTP 302 Found přesměrováním do aplikace.',
    inputs: 'Systémový prohlížeč Safari po úspěšném ověření',
    outputs: 'StudentFlow App (studentflow://auth?code=auth_code_...)',
    codeRef: 'src/services/systemBrowserLogin.ts · createServer() L35-L80',
    payload: {
      host: '127.0.0.1',
      port: 53682,
      responseStatus: 'HTTP/1.1 302 Found',
      locationHeader: 'studentflow://auth?code=auth_code_9a8f27c3',
    },
  },
  {
    id: 'node_safari',
    name: 'Systémový prohlížeč (SSO)',
    cluster: 'Autentizace UI',
    icon: '🧭',
    x: 760,
    y: 580,
    method: 'BROWSER',
    badge: 'ASWebAuthentication',
    uri: 'aswebauthenticationsession://plus4u.net',
    desc: 'Systémová komponenta ASWebAuthenticationSession s plným přístupem ke sdíleným cookies Safari. Pokud je student již v Safari přihlášen k Plus4U nebo přes Google SSO, autentizace proběhne okamžitě bez nutnosti znovu zadávat heslo.',
    inputs: 'Vyvoláno aplikací s vygenerovaným autorizačním URI',
    outputs: 'Plus4U OIDC Authorize Endpoint v cloudu',
    codeRef: 'src/services/systemBrowserLogin.ts · WebBrowser.openAuthSessionAsync()',
    payload: {
      prefersEphemeralWebBrowserSession: false,
      cookiesSharedWithSafari: true,
      googleSSOSupported: true,
    },
  },

  // Cluster 3: Plus4U OIDC Cloud Authority
  {
    id: 'node_discovery',
    name: '1. OIDC Discovery',
    cluster: 'OIDC Provider',
    icon: '🔍',
    x: 1120,
    y: 110,
    method: 'GET',
    badge: 'Discovery',
    uri: 'https://uuidentity.plus4u.net/.../.well-known/openid-configuration',
    desc: 'Standardizovaný OpenID Connect endpoint, který klientské aplikaci poskytuje aktuální adresy pro autorizaci (authorize), výměnu tokenů (token_endpoint) a veřejné JWKS klíče pro validaci digitálního podpisu.',
    inputs: 'Požadavek z mobilní aplikace před zahájením přihlášení',
    outputs: 'Autorizační parametry a URL adresy endpointů',
    codeRef: 'src/services/plus4uOidc.ts · getOidcEndpoints()',
    payload: {
      issuer: 'https://uuidentity.plus4u.net',
      authorization_endpoint: 'https://uuidentity.plus4u.net/uu-oidc-maing02/.../oidc/authorize',
      token_endpoint: 'https://uuidentity.plus4u.net/uu-oidc-maing02/.../oidc/grantToken',
      response_types_supported: ['code', 'id_token'],
    },
  },
  {
    id: 'node_auth',
    name: '2. OIDC Authorize',
    cluster: 'Autorizace',
    icon: '🛡️',
    x: 1120,
    y: 380,
    method: 'GET / 302',
    badge: 'Authorize',
    uri: 'https://uuidentity.plus4u.net/.../authorize',
    desc: 'Cloudový autorizační endpoint Plus4U. Ověří platnost zaregistrovaného client_id (F64b643R05xQ62696875W1j2), oprávnění k rozsahům (openid, MyTerritory) a vygeneruje jednorázový časově omezený autorizační kód (authorization_code).',
    inputs: 'Příjem autorizačního dotazu ze systémového prohlížeče',
    outputs: 'HTTP 302 Redirect na http://127.0.0.1:<port> s parametrem ?code=...',
    codeRef: 'src/services/plus4uOidc.ts · buildAuthorizeUrl()',
    payload: {
      client_id: 'F64b643R05xQ62696875W1j2',
      response_type: 'code',
      scope: 'openid https://uuapp.plus4u.net',
      redirect_uri: 'http://127.0.0.1:53682/',
      issued_code: 'auth_code_9a8f27c3',
    },
  },
  {
    id: 'node_token',
    name: '3. Token Endpoint (grantToken)',
    cluster: 'Kryptografie',
    icon: '🔑',
    x: 1120,
    y: 650,
    method: 'POST',
    badge: 'JWT Grant',
    uri: 'https://uuidentity.plus4u.net/.../grantToken',
    desc: 'Výměna autorizačního kódu za kryptograficky podepsaný RS256 JWT id_token. Token nese ověřené údaje o identitě studenta (uuIdentity, celé jméno, univerzitní role) s expirací 90 minut.',
    inputs: 'POST požadavek z aplikace s kódem authorization_code',
    outputs: 'Podepsaný JWT id_token (předán do Plus4UPeople)',
    codeRef: 'src/services/plus4uOidc.ts · grantToken()',
    payload: {
      id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      decoded_claims: {
        sub: '25-8321-1',
        name: 'Jan Gergel',
        uuIdentity: '25-8321-1',
        exp: 1793456000,
      },
      token_type: 'Bearer',
      expires_in: 5400,
    },
  },

  // Cluster 4: Microservices & Digital Workspace
  {
    id: 'node_people',
    name: '4. Plus4UPeople',
    cluster: 'Identitní služba',
    icon: '👥',
    x: 1480,
    y: 200,
    method: 'GET',
    badge: 'Microservice',
    uri: 'https://uuapp.plus4u.net/.../personalCard/listMTInfoByUuIdentityList',
    desc: 'Dotaz na centrální registr identit Unicorn University. Na základě uuIdentity studenta (25-8321-1) zjistí unikátní bázovou adresu jeho digitálního pracoviště (mtDwBaseUri), kde jsou uložena reálná data rozvrhu.',
    inputs: 'JWT id_token studenta v hlavičce Authorization: Bearer',
    outputs: 'mtDwBaseUri adresa pro dotazy na diář',
    codeRef: 'src/services/plus4uClient.ts · getMyTerritoryBaseUri()',
    payload: {
      uuIdentity: '25-8321-1',
      mtDwBaseUri: 'https://uuapp.plus4u.net/uu-digitalworkspace-maing01/48a29b3c4d5e/',
      mtMainBaseUri: 'https://uuapp.plus4u.net/uu-myterritory-maing01/99a1b2c3d4e5/',
    },
  },
  {
    id: 'node_dw_active',
    name: '5. uuDwRecord (Aktivní)',
    cluster: 'Diář & Události',
    icon: '📖',
    x: 1480,
    y: 440,
    method: 'GET',
    badge: 'uuDwRecord',
    uri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
    desc: 'Načtení všech aktivních událostí studenta za semestrální okno (±60 dní od dnešního data). Obsahuje přednášky, cvičení, termíny odevzdání projektů i naplánované zápočtové testy.',
    inputs: 'mtDwBaseUri + časové rozmezí dateFrom/dateTo + pageSize=4000',
    outputs: 'Pole aktivních záznamů (itemList[]) předané parseru',
    codeRef: 'src/services/plus4uClient.ts · listActiveDiaryRecords()',
    payload: {
      pageSize: 4000,
      totalCount: 32,
      sampleRecord: {
        name: 'Vývoj mobilních aplikací v React Native',
        startDate: '2026-10-27T10:00:00.000Z',
        endDate: '2026-10-27T11:30:00.000Z',
        location: 'Laboratoř 1.4',
        type: 'LESSON',
      },
    },
  },
  {
    id: 'node_dw_final',
    name: '6. uuDwRecord (Finální)',
    cluster: 'Diář & Historie',
    icon: '📂',
    x: 1480,
    y: 680,
    method: 'GET',
    badge: 'uuDwRecord',
    uri: '{mtDwBaseUri}uuDwRecord/listMyFinalDiaryRecords',
    desc: 'Dotaz na uzavřené události a již odevzdané úkoly studenta. Slouží k vyhodnocení splněných předmětů a kontrolu docházky.',
    inputs: 'mtDwBaseUri + časové okno + filtrace ukončených stavů',
    outputs: 'Pole finálních záznamů (itemList[])',
    codeRef: 'src/services/plus4uClient.ts · listFinalDiaryRecords()',
    payload: {
      pageSize: 4000,
      totalCount: 16,
      completedTasks: 1,
      pastLessons: 15,
    },
  },

  // Cluster 5: Transformation Engine
  {
    id: 'node_engine',
    name: '7. Transformační Engine',
    cluster: 'Zpracování dat',
    icon: '⚙️',
    x: 1840,
    y: 440,
    method: 'TRANSFORM',
    badge: 'SyncEngine',
    uri: 'internal://StudentFlow.syncEngine.parseDiaryRecords',
    desc: 'Srdce aplikace v TypeScriptu: Převádí nestrukturovaná data z diáře na přehledný rozvrh. Počítá den v týdnu (startDate.getDay() + 1), převádí čas na minuty od půlnoci (startMinutes), filtruje duplicity a separuje úkoly s deadliny.',
    inputs: 'Surové záznamy z aktivního i finálního diáře',
    outputs: 'Strukturovaný Rozvrh (Po-Pá), Seznam úkolů, Zkoušky',
    codeRef: 'src/services/plus4uSync.ts · parseDiaryRecords()',
    payload: {
      dayCalculation: 'weekday = startDate.getDay() + 1',
      slotDeduplicationKey: '${weekday}_${startMinutes}_${cleanName}',
      parsedSubjectsCount: 7,
      parsedTasksCount: 4,
      parsedExamsCount: 2,
    },
  },

  // Cluster 6: Final Data UI Targets
  {
    id: 'node_schedule',
    name: 'Rozvrh (Po – Pá)',
    cluster: 'UI Výstup',
    icon: '📅',
    x: 2180,
    y: 200,
    method: 'STATE',
    badge: 'Rozvrh',
    uri: 'studentflow://ui/schedule',
    desc: 'Výsledný rozvrh studenta uspořádaný podle dnů v týdnu (Pondělí=2 až Pátek=6). Zahrnuje přesný výpočet právě probíhající hodiny, odečítání minut do konce hodiny a zobrazení učebny i vyučujícího.',
    inputs: 'Transformovaný rozvrh z parsing enginu',
    outputs: 'Mobilní obrazovka DashboardScreen & Webový panel Rozvrh',
    codeRef: 'src/screens/DashboardScreen.tsx · ScheduleWeekdays',
    payload: {
      activeDayIndex: 3,
      dayName: 'Úterý',
      ongoingLesson: 'Vývoj mobilních aplikací v React Native',
      totalWeeklySubjects: 7,
    },
  },
  {
    id: 'node_tasks',
    name: 'Úkoly & Deadliny',
    cluster: 'UI Výstup',
    icon: '⚡',
    x: 2180,
    y: 440,
    method: 'STATE',
    badge: 'Úkoly',
    uri: 'studentflow://ui/tasks',
    desc: 'Seznam semestrálních úkolů vyfiltrovaných z diáře podle klíčových slov a deadlinů. Řazeno podle naléhavosti s označením priorit (Vysoká, Střední).',
    inputs: 'Extrahované úkoly z parsing enginu',
    outputs: 'Mobilní obrazovka Úkoly & Webový panel Úkoly',
    codeRef: 'src/screens/DashboardScreen.tsx · TasksWidget',
    payload: {
      pendingTasksCount: 3,
      completedCount: 1,
      nearestDeadline: 'Semestrální projekt REST API (za 2 dny)',
    },
  },
  {
    id: 'node_exams',
    name: 'Termíny zkoušek',
    cluster: 'UI Výstup',
    icon: '🏆',
    x: 2180,
    y: 680,
    method: 'STATE',
    badge: 'Zkoušky',
    uri: 'studentflow://ui/exams',
    desc: 'Přehled zkoušek a zápočtových testů ve zkouškovém období Unicorn University.',
    inputs: 'Extrahované zkoušky z diáře',
    outputs: 'Mobilní kalendář & Webový přehled',
    codeRef: 'src/services/plus4uSync.ts · parseExams()',
    payload: {
      totalExams: 2,
      firstExamDate: '15. listopadu 2026',
      subject: 'Databázové systémy a Cloud BigQuery',
    },
  },
];

// --- 2. Relational Edges Specification (Data Paths) ---
const MINDMAP_EDGES = [
  { id: 'e1', from: 'node_student', to: 'node_app', step: 1, label: '1. Klepnutí na Přihlásit přes Plus4U' },
  { id: 'e2', from: 'node_app', to: 'node_discovery', step: 2, label: '2. GET .well-known/openid-configuration' },
  { id: 'e3', from: 'node_app', to: 'node_tcp_server', step: 3, label: '3. Start lokálního TCP HTTP serveru (port 53682)' },
  { id: 'e4', from: 'node_app', to: 'node_safari', step: 3, label: '4. Otevření ASWebAuthenticationSession' },
  { id: 'e5', from: 'node_safari', to: 'node_auth', step: 4, label: '5. SSO Autentizace v Plus4U cloudu' },
  { id: 'e6', from: 'node_auth', to: 'node_tcp_server', step: 4, label: '6. Callback na 127.0.0.1:53682?code=XYZ' },
  { id: 'e7', from: 'node_tcp_server', to: 'node_app', step: 5, label: '7. HTTP 302 Found na studentflow://auth' },
  { id: 'e8', from: 'node_app', to: 'node_token', step: 5, label: '8. POST grantToken (Výměna kódu za JWT)' },
  { id: 'e9', from: 'node_token', to: 'node_people', step: 6, label: '9. GET listMTInfoByUuIdentityList' },
  { id: 'e10', from: 'node_people', to: 'node_dw_active', step: 7, label: '10. GET listMyActiveDiaryRecords' },
  { id: 'e11', from: 'node_people', to: 'node_dw_final', step: 7, label: '11. GET listMyFinalDiaryRecords' },
  { id: 'e12', from: 'node_dw_active', to: 'node_engine', step: 8, label: '12. Předání aktivních záznamů k parsování' },
  { id: 'e13', from: 'node_dw_final', to: 'node_engine', step: 8, label: '13. Předání uzavřených záznamů k parsování' },
  { id: 'e14', from: 'node_engine', to: 'node_schedule', step: 8, label: '14. Výpočet dne v týdnu a rozvrhu' },
  { id: 'e15', from: 'node_engine', to: 'node_tasks', step: 8, label: '15. Filtrace nedokončených úkolů' },
  { id: 'e16', from: 'node_engine', to: 'node_exams', step: 8, label: '16. Extrakce termínů zkoušek' },
];

// --- 3. Step Definitions for Animated Data Flow ---
const FLOW_STEPS = [
  {
    stepIndex: 0,
    title: 'Krok 0 z 8: Připraveno ke spuštění toku dat',
    activeNodeIds: [],
    activeEdgeIds: [],
    highlightNodeId: null,
  },
  {
    stepIndex: 1,
    title: 'Krok 1 z 8: Student zahájil přihlášení v mobilní aplikaci',
    activeNodeIds: ['node_student', 'node_app'],
    activeEdgeIds: ['e1'],
    highlightNodeId: 'node_app',
  },
  {
    stepIndex: 2,
    title: 'Krok 2 z 8: Zjištění autorizačních endpointů přes OIDC Discovery',
    activeNodeIds: ['node_app', 'node_discovery'],
    activeEdgeIds: ['e2'],
    highlightNodeId: 'node_discovery',
  },
  {
    stepIndex: 3,
    title: 'Krok 3 z 8: Spuštění lokálního TCP HTTP serveru & otevření Safari',
    activeNodeIds: ['node_app', 'node_tcp_server', 'node_safari'],
    activeEdgeIds: ['e3', 'e4'],
    highlightNodeId: 'node_tcp_server',
  },
  {
    stepIndex: 4,
    title: 'Krok 4 z 8: SSO autorizace a HTTP 302 callback na 127.0.0.1:<port>',
    activeNodeIds: ['node_safari', 'node_auth', 'node_tcp_server'],
    activeEdgeIds: ['e5', 'e6'],
    highlightNodeId: 'node_auth',
  },
  {
    stepIndex: 5,
    title: 'Krok 5 z 8: Přesměrování do aplikace & výměna kódu za podepsaný JWT id_token',
    activeNodeIds: ['node_tcp_server', 'node_app', 'node_token'],
    activeEdgeIds: ['e7', 'e8'],
    highlightNodeId: 'node_token',
  },
  {
    stepIndex: 6,
    title: 'Krok 6 z 8: Dotaz na Plus4UPeople a nalezení adresy MyTerritory (mtDwBaseUri)',
    activeNodeIds: ['node_token', 'node_people'],
    activeEdgeIds: ['e9'],
    highlightNodeId: 'node_people',
  },
  {
    stepIndex: 7,
    title: 'Krok 7 z 8: Paralelní stažení aktivních i finálních záznamů diáře (±60 dní)',
    activeNodeIds: ['node_people', 'node_dw_active', 'node_dw_final'],
    activeEdgeIds: ['e10', 'e11'],
    highlightNodeId: 'node_dw_active',
  },
  {
    stepIndex: 8,
    title: 'Krok 8 z 8: Transformační engine spočítal dny v týdnu, rozvrh a úkoly studenta',
    activeNodeIds: ['node_dw_active', 'node_dw_final', 'node_engine', 'node_schedule', 'node_tasks', 'node_exams'],
    activeEdgeIds: ['e12', 'e13', 'e14', 'e15', 'e16'],
    highlightNodeId: 'node_engine',
  },
];

const WEEKDAYS = [
  { index: 2, label: 'Pondělí', short: 'Po' },
  { index: 3, label: 'Úterý', short: 'Út' },
  { index: 4, label: 'Středa', short: 'St' },
  { index: 5, label: 'Čtvrtek', short: 'Čt' },
  { index: 6, label: 'Pátek', short: 'Pá' },
];

// --- 4. Global State ---
let globalState = {
  currentStudent: { name: 'Jan Gergel', uuIdentity: '25-8321-1', connected: true },
  activePipeline: { stage: 'idle', progress: 0 },
  networkLogs: [],
  schedule: [],
  tasks: [],
  exams: [],
};

let currentFlowStep = 0;
let isPlaying = false;
let playInterval = null;
let zoomScale = 1.0;
let selectedDayIndex = 2; // Default Monday
let activeSelectedNodeId = 'node_app';

// DOM References
const elNodesLayer = document.getElementById('nodes-layer');
const elSvgPathsLayer = document.getElementById('svg-paths-layer');
const elSvgParticlesLayer = document.getElementById('svg-particles-layer');
const elMindmapViewport = document.getElementById('mindmap-viewport');
const elStatusPill = document.getElementById('mindmap-status-pill');
const elBtnTriggerLogin = document.getElementById('btn-trigger-login');
const elBtnStepPrev = document.getElementById('btn-step-prev');
const elBtnStepPlay = document.getElementById('btn-step-play');
const elBtnStepNext = document.getElementById('btn-step-next');
const elPlayIcon = document.getElementById('play-icon');
const elBtnZoomIn = document.getElementById('btn-zoom-in');
const elBtnZoomReset = document.getElementById('btn-zoom-reset');
const elBtnZoomOut = document.getElementById('btn-zoom-out');

// Side Drawer Elements
const elInspectorDrawer = document.getElementById('node-inspector');
const elDrawerCloseBtn = document.getElementById('drawer-close-btn');
const elDrawerNodeIcon = document.getElementById('drawer-node-icon');
const elDrawerNodeTitle = document.getElementById('drawer-node-title');
const elDrawerNodeType = document.getElementById('drawer-node-type');
const elDrawerNodeUri = document.getElementById('drawer-node-uri');
const elDrawerNodeDesc = document.getElementById('drawer-node-desc');
const elDrawerNodeInputs = document.getElementById('drawer-node-inputs');
const elDrawerNodeOutputs = document.getElementById('drawer-node-outputs');
const elDrawerNodePayload = document.getElementById('drawer-node-payload');
const elDrawerNodeCoderef = document.getElementById('drawer-node-coderef');

// Clock Elements
const elDayName = document.getElementById('current-day-name');
const elFullDate = document.getElementById('current-full-date');
const elTimeStr = document.getElementById('current-time-str');

// Schedule & Tasks Elements
const elWeekdaySelector = document.getElementById('weekday-selector');
const elScheduleTimeline = document.getElementById('schedule-timeline');
const elOngoingHero = document.getElementById('ongoing-hero');
const elOngoingTitle = document.getElementById('ongoing-title');
const elOngoingTime = document.getElementById('ongoing-time');
const elOngoingRoom = document.getElementById('ongoing-room');
const elOngoingTeacher = document.getElementById('ongoing-teacher');
const elOngoingProgress = document.getElementById('ongoing-progress');
const elOngoingElapsed = document.getElementById('ongoing-elapsed');
const elOngoingPercent = document.getElementById('ongoing-percent');
const elTasksList = document.getElementById('tasks-list');
const elTaskCountBadge = document.getElementById('task-count-badge');
const elNetworkFeed = document.getElementById('network-feed');
const elBtnClearLogs = document.getElementById('btn-clear-logs');
const elPayloadModal = document.getElementById('payload-modal');
const elModalCloseBtn = document.getElementById('modal-close-btn');
const elModalUriTitle = document.getElementById('modal-uri-title');
const elModalUriText = document.getElementById('modal-uri-text');
const elModalMetaRow = document.getElementById('modal-meta-row');
const elModalJsonContent = document.getElementById('modal-json-content');

// --- 5. Clock & Ongoing Class Calculation ---
function updateClock() {
  const now = new Date();
  const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const dayName = dayNames[now.getDay()];
  elDayName.textContent = dayName;

  elFullDate.textContent = now.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  elTimeStr.textContent = now.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  updateOngoingClass();
}

setInterval(updateClock, 1000);
updateClock();

// Set initial selected day to current day if weekday
const todayDayOfWeek = new Date().getDay() + 1;
if (todayDayOfWeek >= 2 && todayDayOfWeek <= 6) {
  selectedDayIndex = todayDayOfWeek;
}

// --- 6. Render Mind Map Nodes & Interactive Cards ---
function renderMindmapNodes() {
  elNodesLayer.innerHTML = '';

  MINDMAP_NODES.forEach((node) => {
    const card = document.createElement('div');
    card.id = `card_${node.id}`;
    card.className = 'mindmap-node';
    card.style.left = `${node.x}px`;
    card.style.top = `${node.y}px`;

    card.innerHTML = `
      <div class="node-header-row">
        <span class="node-cluster-tag">${node.cluster}</span>
        <span class="node-method-badge">${node.method}</span>
      </div>
      <div class="node-title-group">
        <div class="node-icon-box">${node.icon}</div>
        <div class="node-heading">${node.name}</div>
      </div>
      <div class="node-uri-preview" title="${node.uri}">${node.uri}</div>
      <div class="node-footer-status">
        <span>Stav relace</span>
        <span class="node-status-text waiting" id="status_${node.id}">Připraven</span>
      </div>
    `;

    card.onclick = () => {
      openNodeDrawer(node.id);
    };

    elNodesLayer.appendChild(card);
  });
}

// --- 7. Render Relational Bézier Curves (SVG) ---
function renderRelationalEdges() {
  elSvgPathsLayer.innerHTML = '';
  const nodeMap = new Map(MINDMAP_NODES.map((n) => [n.id, n]));

  MINDMAP_EDGES.forEach((edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) return;

    // Node dimensions (approx card dimensions: width=260, height=110)
    const fromWidth = 260;
    const fromHeight = 110;
    const toHeight = 110;

    let x1, y1, x2, y2, cx1, cy1, cx2, cy2;

    if (edge.from === 'node_tcp_server' && edge.to === 'node_app') {
      // Loopback curve: TCP Server (x: 760, y: 180) -> App (x: 400, y: 380)
      x1 = fromNode.x;
      y1 = fromNode.y + fromHeight / 2;
      x2 = toNode.x + fromWidth;
      y2 = toNode.y + 20;
      cx1 = x1 - 140;
      cy1 = y1 - 40;
      cx2 = x2 + 100;
      cy2 = y2 - 80;
    } else if (edge.from === 'node_auth' && edge.to === 'node_tcp_server') {
      // Callback curve: Auth (x: 1120, y: 380) -> TCP Server (x: 760, y: 180)
      x1 = fromNode.x;
      y1 = fromNode.y + 20;
      x2 = toNode.x + fromWidth;
      y2 = toNode.y + fromHeight / 2;
      cx1 = x1 - 120;
      cy1 = y1 - 80;
      cx2 = x2 + 120;
      cy2 = y2;
    } else {
      // Normal forward flow: right side of source -> left side of target
      x1 = fromNode.x + fromWidth;
      y1 = fromNode.y + fromHeight / 2;
      x2 = toNode.x;
      y2 = toNode.y + toHeight / 2;

      const deltaX = Math.abs(x2 - x1) * 0.55;
      cx1 = x1 + deltaX;
      cy1 = y1;
      cx2 = x2 - deltaX;
      cy2 = y2;
    }

    const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    // Path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `edge_${edge.id}`);
    path.setAttribute('class', 'flow-path');
    path.setAttribute('d', pathD);

    elSvgPathsLayer.appendChild(path);
  });
}

// --- 8. Particle Stream Engine on Active Edges ---
let particleAnimFrame = null;
let particleProgress = 0;

function startParticleAnimation() {
  if (particleAnimFrame) cancelAnimationFrame(particleAnimFrame);

  function animateParticles() {
    particleProgress = (particleProgress + 0.008) % 1;
    elSvgParticlesLayer.innerHTML = '';

    const stepDef = FLOW_STEPS[currentFlowStep];
    if (stepDef && stepDef.activeEdgeIds.length > 0) {
      stepDef.activeEdgeIds.forEach((edgeId) => {
        const pathEl = document.getElementById(`edge_${edgeId}`);
        if (pathEl) {
          const totalLength = pathEl.getTotalLength();
          if (totalLength > 0) {
            // Render 3 traveling photons along each active curve
            [0, 0.33, 0.66].forEach((offset) => {
              const fraction = (particleProgress + offset) % 1;
              const point = pathEl.getPointAtLength(fraction * totalLength);

              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', point.x);
              circle.setAttribute('cy', point.y);
              circle.setAttribute('r', '5.5');
              circle.setAttribute('class', 'flow-particle');

              elSvgParticlesLayer.appendChild(circle);
            });
          }
        }
      });
    }

    particleAnimFrame = requestAnimationFrame(animateParticles);
  }

  animateParticles();
}

// --- 9. Step-by-Step Flow Presentation ---
function applyFlowStep(stepIndex, shouldScrollIntoView = true) {
  currentFlowStep = Math.max(0, Math.min(FLOW_STEPS.length - 1, stepIndex));
  const step = FLOW_STEPS[currentFlowStep];

  // Update Status Pill
  elStatusPill.textContent = step.title;

  // Reset all nodes
  MINDMAP_NODES.forEach((n) => {
    const card = document.getElementById(`card_${n.id}`);
    const statusText = document.getElementById(`status_${n.id}`);
    if (card) {
      card.classList.remove('active', 'pulse-ring');
    }
    if (statusText) {
      statusText.className = 'node-status-text waiting';
      statusText.textContent = 'Čeká';
    }
  });

  // Reset all edges
  MINDMAP_EDGES.forEach((e) => {
    const path = document.getElementById(`edge_${e.id}`);
    if (path) path.classList.remove('active');
  });

  // Activate step nodes & edges
  step.activeNodeIds.forEach((nodeId) => {
    const card = document.getElementById(`card_${nodeId}`);
    const statusText = document.getElementById(`status_${nodeId}`);
    if (card) {
      card.classList.add('active');
      if (nodeId === step.highlightNodeId) {
        card.classList.add('pulse-ring');
      }
    }
    if (statusText) {
      statusText.className = 'node-status-text ok';
      statusText.textContent = 'Aktivní tok';
    }
  });

  step.activeEdgeIds.forEach((edgeId) => {
    const path = document.getElementById(`edge_${edgeId}`);
    if (path) path.classList.add('active');
  });

  // Open inspector for highlight node if available
  if (step.highlightNodeId) {
    openNodeDrawer(step.highlightNodeId, false);

    if (shouldScrollIntoView) {
      const targetNode = MINDMAP_NODES.find((n) => n.id === step.highlightNodeId);
      if (targetNode) {
        elMindmapViewport.scrollTo({
          left: Math.max(0, targetNode.x - 300),
          top: Math.max(0, targetNode.y - 180),
          behavior: 'smooth',
        });
      }
    }
  }
}

// --- 10. Node Inspector Side Drawer ---
function openNodeDrawer(nodeId, shouldHighlight = true) {
  const node = MINDMAP_NODES.find((n) => n.id === nodeId);
  if (!node) return;

  activeSelectedNodeId = nodeId;

  elDrawerNodeIcon.textContent = node.icon;
  elDrawerNodeTitle.textContent = node.name;
  elDrawerNodeType.textContent = `${node.cluster} · ${node.method}`;
  elDrawerNodeUri.textContent = node.uri;
  elDrawerNodeDesc.textContent = node.desc;
  elDrawerNodeInputs.textContent = node.inputs;
  elDrawerNodeOutputs.textContent = node.outputs;
  elDrawerNodePayload.textContent = JSON.stringify(node.payload, null, 2);
  elDrawerNodeCoderef.textContent = node.codeRef;

  elInspectorDrawer.style.display = 'flex';

  if (shouldHighlight) {
    MINDMAP_NODES.forEach((n) => {
      const card = document.getElementById(`card_${n.id}`);
      if (card) card.classList.remove('pulse-ring');
    });
    const activeCard = document.getElementById(`card_${nodeId}`);
    if (activeCard) activeCard.classList.add('pulse-ring');
  }
}

elDrawerCloseBtn.onclick = () => {
  elInspectorDrawer.style.display = 'none';
};

// --- 11. Playback Controls ---
function togglePlay() {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  isPlaying = true;
  elBtnStepPlay.classList.add('active-play');
  elPlayIcon.textContent = '⏸';

  if (currentFlowStep >= FLOW_STEPS.length - 1) {
    currentFlowStep = 0;
  }

  // Trigger backend simulation simultaneously to populate network feed
  fetch('/api/simulate', { method: 'POST' }).catch(() => {});

  stepNext();
  playInterval = setInterval(() => {
    if (currentFlowStep < FLOW_STEPS.length - 1) {
      stepNext();
    } else {
      pausePlayback();
    }
  }, 1600);
}

function pausePlayback() {
  isPlaying = false;
  elBtnStepPlay.classList.remove('active-play');
  elPlayIcon.textContent = '▶';
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}

function stepNext() {
  if (currentFlowStep < FLOW_STEPS.length - 1) {
    applyFlowStep(currentFlowStep + 1);
  }
}

function stepPrev() {
  if (currentFlowStep > 0) {
    applyFlowStep(currentFlowStep - 1);
  }
}

elBtnTriggerLogin.onclick = () => {
  // Switch to mindmap tab if not active
  switchTab('mindmap');
  currentFlowStep = 0;
  startPlayback();
};

elBtnStepPlay.onclick = togglePlay;
elBtnStepNext.onclick = () => {
  pausePlayback();
  stepNext();
};
elBtnStepPrev.onclick = () => {
  pausePlayback();
  stepPrev();
};

// Zoom & Pan Engine
function applyZoom() {
  elNodesLayer.style.transform = `scale(${zoomScale})`;
  elNodesLayer.style.transformOrigin = '0 0';
  elSvgPathsLayer.parentElement.style.transform = `scale(${zoomScale})`;
  elSvgPathsLayer.parentElement.style.transformOrigin = '0 0';
  elBtnZoomReset.textContent = `${Math.round(zoomScale * 100)}%`;
}

elBtnZoomIn.onclick = () => {
  zoomScale = Math.min(1.5, zoomScale + 0.15);
  applyZoom();
};

elBtnZoomOut.onclick = () => {
  zoomScale = Math.max(0.6, zoomScale - 0.15);
  applyZoom();
};

elBtnZoomReset.onclick = () => {
  zoomScale = 1.0;
  applyZoom();
  elMindmapViewport.scrollTo({ left: 300, top: 180, behavior: 'smooth' });
};

// Canvas Mouse Dragging (Pan)
let isDragging = false;
let startX, startY, scrollStartLeft, scrollStartTop;

elMindmapViewport.addEventListener('mousedown', (e) => {
  if (e.target.closest('.mindmap-node') || e.target.closest('.canvas-toolbar') || e.target.closest('.node-inspector-drawer')) {
    return;
  }
  isDragging = true;
  startX = e.pageX - elMindmapViewport.offsetLeft;
  startY = e.pageY - elMindmapViewport.offsetTop;
  scrollStartLeft = elMindmapViewport.scrollLeft;
  scrollStartTop = elMindmapViewport.scrollTop;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const x = e.pageX - elMindmapViewport.offsetLeft;
  const y = e.pageY - elMindmapViewport.offsetTop;
  elMindmapViewport.scrollLeft = scrollStartLeft - (x - startX);
  elMindmapViewport.scrollTop = scrollStartTop - (y - startY);
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// --- 12. View Navigation Tabs ---
function switchTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.onclick = () => {
    const tabName = tab.getAttribute('data-tab');
    switchTab(tabName);
  };
});

// --- 13. Weekday Selector & Schedule Renderer ---
function renderWeekdaySelector() {
  elWeekdaySelector.innerHTML = '';
  WEEKDAYS.forEach((w) => {
    const btn = document.createElement('button');
    btn.className = `weekday-btn ${w.index === selectedDayIndex ? 'active' : ''}`;
    btn.textContent = `${w.short}`;
    btn.title = w.label;
    btn.onclick = () => {
      selectedDayIndex = w.index;
      renderWeekdaySelector();
      renderSchedule();
      updateOngoingClass();
    };
    elWeekdaySelector.appendChild(btn);
  });
}

function renderSchedule() {
  elScheduleTimeline.innerHTML = '';
  const daySubjects = (globalState.schedule || [])
    .filter((s) => s.weekday === selectedDayIndex)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (daySubjects.length === 0) {
    elScheduleTimeline.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 36px;">
        V tento den (${WEEKDAYS.find((w) => w.index === selectedDayIndex)?.label}) nejsou v rozvrhu žádné hodiny.
      </div>
    `;
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = now.getDay() + 1 === selectedDayIndex;

  daySubjects.forEach((sub) => {
    const isCurrent = isToday && currentMinutes >= sub.startMinutes && currentMinutes <= sub.endMinutes;
    const card = document.createElement('div');
    card.className = `schedule-card ${isCurrent ? 'current' : ''}`;

    const startH = String(Math.floor(sub.startMinutes / 60)).padStart(2, '0');
    const startM = String(sub.startMinutes % 60).padStart(2, '0');
    const endH = String(Math.floor(sub.endMinutes / 60)).padStart(2, '0');
    const endM = String(sub.endMinutes % 60).padStart(2, '0');
    const timeFormatted = sub.timeString || `${startH}:${startM} – ${endH}:${endM}`;

    card.innerHTML = `
      <div class="subject-info">
        <div class="subject-code-row">
          <span class="subject-code">${sub.code || 'UU.APP'}</span>
          ${isCurrent ? '<span class="status-indicator" style="background:#10B981;"></span>' : ''}
        </div>
        <div class="subject-name">${sub.name}</div>
        <div class="subject-teacher-room">
          📍 ${sub.location || 'Učebna'} · 👤 ${sub.teacher || 'Vyučující'}
        </div>
      </div>
      <div class="subject-time-badge">${timeFormatted}</div>
    `;

    elScheduleTimeline.appendChild(card);
  });
}

// Ongoing class progress calculation
function updateOngoingClass() {
  const now = new Date();
  const todayIndex = now.getDay() + 1;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySubjects = (globalState.schedule || [])
    .filter((s) => s.weekday === todayIndex)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const ongoing = todaySubjects.find(
    (s) => currentMinutes >= s.startMinutes && currentMinutes <= s.endMinutes
  );

  if (ongoing) {
    elOngoingHero.style.display = 'flex';
    elOngoingTitle.textContent = ongoing.name;
    const startH = String(Math.floor(ongoing.startMinutes / 60)).padStart(2, '0');
    const startM = String(ongoing.startMinutes % 60).padStart(2, '0');
    const endH = String(Math.floor(ongoing.endMinutes / 60)).padStart(2, '0');
    const endM = String(ongoing.endMinutes % 60).padStart(2, '0');
    elOngoingTime.textContent = `${startH}:${startM} – ${endH}:${endM}`;
    elOngoingRoom.textContent = `📍 ${ongoing.location || 'Učebna'}`;
    elOngoingTeacher.textContent = `👤 ${ongoing.teacher || 'Vyučující'}`;

    const totalDuration = ongoing.endMinutes - ongoing.startMinutes;
    const elapsed = currentMinutes - ongoing.startMinutes;
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    const remaining = ongoing.endMinutes - currentMinutes;

    elOngoingProgress.style.width = `${percent}%`;
    elOngoingPercent.textContent = `${percent}% odcvičeno`;
    elOngoingElapsed.textContent = `Zbývá ${remaining} minut`;
  } else {
    const nextUpcoming = todaySubjects.find((s) => s.startMinutes > currentMinutes);
    if (nextUpcoming) {
      elOngoingHero.style.display = 'flex';
      elOngoingTitle.textContent = `Následuje: ${nextUpcoming.name}`;
      const startH = String(Math.floor(nextUpcoming.startMinutes / 60)).padStart(2, '0');
      const startM = String(nextUpcoming.startMinutes % 60).padStart(2, '0');
      elOngoingTime.textContent = `Začátek v ${startH}:${startM}`;
      elOngoingRoom.textContent = `📍 ${nextUpcoming.location || 'Učebna'}`;
      elOngoingTeacher.textContent = `👤 ${nextUpcoming.teacher || 'Vyučující'}`;
      elOngoingProgress.style.width = '0%';
      elOngoingPercent.textContent = 'Příští výuka';
      elOngoingElapsed.textContent = `Začíná za ${nextUpcoming.startMinutes - currentMinutes} minut`;
    } else {
      elOngoingHero.style.display = 'flex';
      elOngoingTitle.textContent = todayIndex >= 2 && todayIndex <= 6
        ? 'Dnes již výuka skončila'
        : 'Dnes je víkend (volno)';
      elOngoingTime.textContent = 'Žádná aktivní hodina';
      elOngoingRoom.textContent = 'Příprava na další dny';
      elOngoingTeacher.textContent = 'Unicorn University';
      elOngoingProgress.style.width = '100%';
      elOngoingPercent.textContent = 'Hotovo';
      elOngoingElapsed.textContent = 'Volný čas';
    }
  }
}

// --- 14. Tasks & Deadlines Renderer ---
function renderTasks() {
  elTasksList.innerHTML = '';
  const tasks = globalState.tasks || [];
  elTaskCountBadge.textContent = `${tasks.length} úkoly`;

  if (tasks.length === 0) {
    elTasksList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 36px;">
        Student nemá v diáři zapsané žádné nedokončené úkoly.
      </div>
    `;
    return;
  }

  tasks.forEach((t) => {
    const card = document.createElement('div');
    card.className = `task-item-card ${t.isCompleted ? 'completed' : ''}`;

    const priorityBadge = t.priority === 'high'
      ? '<span class="task-priority-high">Vysoká priorita</span>'
      : '<span class="task-priority-medium">Střední priorita</span>';

    card.innerHTML = `
      <div class="task-top-row">
        <div class="task-title">${t.isCompleted ? '✓ ' : ''}${t.title}</div>
        ${priorityBadge}
      </div>
      <div class="task-meta-row">
        <span>📚 ${t.subjectName || 'Předmět'}</span>
        <span class="task-due">⏰ ${t.dueFormatted || new Date(t.dueDate).toLocaleDateString('cs-CZ')}</span>
      </div>
      ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ''}
    `;

    elTasksList.appendChild(card);
  });
}

// --- 15. Raw Network Inspector & Modal Viewer ---
function renderNetworkFeed() {
  elNetworkFeed.innerHTML = '';
  const logs = globalState.networkLogs || [];

  if (logs.length === 0) {
    elNetworkFeed.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 36px;">
        Zatím nebyl zaznamenán žádný síťový požadavek. Spusťte tok tlačítkem nahoře nebo v mobilní aplikaci.
      </div>
    `;
    return;
  }

  logs.forEach((log) => {
    const item = document.createElement('div');
    item.className = 'log-entry';
    item.onclick = () => showPayloadModal(log);

    const methodLower = (log.method || 'GET').toLowerCase();
    const timeFormatted = new Date(log.timestamp).toLocaleTimeString('cs-CZ');

    item.innerHTML = `
      <div class="log-left">
        <span class="log-method ${methodLower}">${log.method || 'GET'}</span>
        <div class="log-details">
          <span class="log-title">${log.title || 'HTTP Požadavek'}</span>
          <span class="log-uri">${log.uri}</span>
        </div>
      </div>
      <span class="log-time">${timeFormatted}</span>
    `;

    elNetworkFeed.appendChild(item);
  });
}

function showPayloadModal(log) {
  elModalUriTitle.textContent = log.title || 'Detail HTTP požadavku';
  elModalUriText.textContent = `${log.method || 'GET'} ${log.uri}`;

  elModalMetaRow.innerHTML = `
    <span class="meta-tag">Čas: ${new Date(log.timestamp).toLocaleTimeString('cs-CZ')}</span>
    <span class="meta-tag">Fáze: ${log.stage || 'pipeline'}</span>
  `;

  elModalJsonContent.textContent = JSON.stringify(log.response || log, null, 2);
  elPayloadModal.style.display = 'flex';
}

elModalCloseBtn.onclick = () => {
  elPayloadModal.style.display = 'none';
};

window.onclick = (e) => {
  if (e.target === elPayloadModal) {
    elPayloadModal.style.display = 'none';
  }
};

elBtnClearLogs.onclick = () => {
  globalState.networkLogs = [];
  renderNetworkFeed();
};

// --- 16. Real-time Telemetry & SSE Stream ---
function connectSSE() {
  const eventSource = new EventSource('/api/stream');

  eventSource.addEventListener('init', (e) => {
    const data = JSON.parse(e.data);
    globalState = data.state;
    renderWeekdaySelector();
    renderSchedule();
    renderTasks();
    renderNetworkFeed();
    updateOngoingClass();
  });

  eventSource.addEventListener('telemetry', (e) => {
    const event = JSON.parse(e.data);
    if (!globalState.networkLogs) globalState.networkLogs = [];
    globalState.networkLogs.unshift(event);
    renderNetworkFeed();

    // If mobile app triggers a specific stage, advance mind map step automatically!
    if (event.stage) {
      const stageMap = {
        discovery: 2,
        auth: 3,
        token: 5,
        people: 6,
        diary: 7,
        parsing: 8,
        done: 8,
      };
      if (stageMap[event.stage] !== undefined) {
        applyFlowStep(stageMap[event.stage]);
      }
    }
  });

  eventSource.addEventListener('state_update', (e) => {
    const updatedState = JSON.parse(e.data);
    globalState = updatedState;
    renderSchedule();
    renderTasks();
    updateOngoingClass();
  });

  const elPill = document.getElementById('connection-pill');
  const elStatusTxt = document.getElementById('connection-status-text');

  eventSource.onopen = () => {
    if (elPill) {
      elPill.className = 'connection-status-pill connected';
    }
    if (elStatusTxt) {
      elStatusTxt.textContent = 'Mobilní spojení aktivní';
    }
  };

  eventSource.onerror = () => {
    if (elPill) {
      elPill.className = 'connection-status-pill disconnected';
    }
    if (elStatusTxt) {
      elStatusTxt.textContent = 'Čekám na server...';
    }
  };
}

// --- 17. Initialization ---
function init() {
  renderMindmapNodes();
  renderRelationalEdges();
  startParticleAnimation();
  renderWeekdaySelector();
  applyFlowStep(0);
  openNodeDrawer('node_student', false);
  connectSSE();

  // Center canvas on mobile client node initially
  setTimeout(() => {
    elMindmapViewport.scrollTo({
      left: 100,
      top: 240,
      behavior: 'smooth',
    });
  }, 200);
}

init();
