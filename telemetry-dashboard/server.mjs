import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = 3333;

// Telemetry in-memory store
const state = {
  currentStudent: {
    name: 'Jan Gergel',
    uuIdentity: '25-8321-1',
    connected: false,
    lastSyncedAt: null,
  },
  activePipeline: {
    stage: 'idle', // 'idle' | 'discovery' | 'auth' | 'token' | 'people' | 'diary' | 'parsing' | 'done' | 'error'
    progress: 0,
    currentUri: null,
  },
  networkLogs: [],
  schedule: [],
  tasks: [],
  exams: [],
  systemStats: {
    totalRequests: 0,
    lastPing: Date.now(),
  },
};

// SSE Subscribers
const clients = new Set();

function broadcast(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// Default sample data for simulation / initial view
const SAMPLE_SCHEDULE = [
  {
    id: 'sub_1',
    name: 'Architektura softwarových systémů',
    code: 'UU.SWE.APP',
    weekday: 2, // Pondělí
    weekdayName: 'Pondělí',
    startMinutes: 540, // 09:00
    endMinutes: 630, // 10:30
    timeString: '09:00 – 10:30',
    location: 'Učebna 3.2 (KCD)',
    teacher: 'Ing. Petr Kovář, Ph.D.',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
  },
  {
    id: 'sub_2',
    name: 'Vývoj mobilních aplikací v React Native',
    code: 'UU.MOB.APP',
    weekday: 2, // Pondělí
    weekdayName: 'Pondělí',
    startMinutes: 660, // 11:00
    endMinutes: 750, // 12:30
    timeString: '11:00 – 12:30',
    location: 'Laboratoř 1.4',
    teacher: 'Mgr. Tomáš Dvořák',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
  },
  {
    id: 'sub_3',
    name: 'Databázové systémy a Cloud BigQuery',
    code: 'UU.DAT.SYS',
    weekday: 3, // Úterý
    weekdayName: 'Úterý',
    startMinutes: 480, // 08:00
    endMinutes: 570, // 09:30
    timeString: '08:00 – 09:30',
    location: 'Online MS Teams',
    teacher: 'Ing. Michal Novák',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
  },
  {
    id: 'sub_4',
    name: 'Algoritmy a datové struktury',
    code: 'UU.ALG.DAT',
    weekday: 3, // Úterý
    weekdayName: 'Úterý',
    startMinutes: 600, // 10:00
    endMinutes: 705, // 11:45
    timeString: '10:00 – 11:45',
    location: 'Učebna 2.1',
    teacher: 'RNDr. Jan Procházka, CSc.',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
  },
  {
    id: 'sub_5',
    name: 'Projektové řízení a agilní metodiky',
    code: 'UU.PRJ.MNG',
    weekday: 4, // Středa
    weekdayName: 'Středa',
    startMinutes: 540, // 09:00
    endMinutes: 630, // 10:30
    timeString: '09:00 – 10:30',
    location: 'Učebna 4.5',
    teacher: 'Ing. Eva Černá',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
  },
  {
    id: 'sub_6',
    name: 'Kybernetická bezpečnost a ochrana dat',
    code: 'UU.SEC.DAT',
    weekday: 5, // Čtvrtek
    weekdayName: 'Čtvrtek',
    startMinutes: 780, // 13:00
    endMinutes: 870, // 14:30
    timeString: '13:00 – 14:30',
    location: 'Učebna 3.2',
    teacher: 'Ing. Martin Veselý',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
  },
  {
    id: 'sub_7',
    name: 'Seminář k bakalářské práci',
    code: 'UU.BC.SEM',
    weekday: 6, // Pátek
    weekdayName: 'Pátek',
    startMinutes: 600, // 10:00
    endMinutes: 690, // 11:30
    timeString: '10:00 – 11:30',
    location: 'Učebna 1.1',
    teacher: 'Doc. RNDr. Pavel Marek',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
  },
];

const SAMPLE_TASKS = [
  {
    id: 'task_1',
    title: 'Semestrální projekt: Návrh REST API a architektury',
    subjectName: 'Architektura softwarových systémů',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    dueFormatted: 'Za 2 dny',
    priority: 'high',
    isCompleted: false,
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
    notes: 'Odevzdat diagram komponent, specifikaci OpenAPI a zdrojový kód do GitLabu.',
  },
  {
    id: 'task_2',
    title: 'Implementace přihlašovacího toku a systémového prohlížeče',
    subjectName: 'Vývoj mobilních aplikací v React Native',
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    dueFormatted: 'Za 4 dny',
    priority: 'high',
    isCompleted: true,
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
    notes: 'Podpora ASWebAuthenticationSession, lokálního HTTP serveru a fallbacku.',
  },
  {
    id: 'task_3',
    title: 'Cvičení: Optimalizace SQL dotazů v BigQuery',
    subjectName: 'Databázové systémy a Cloud BigQuery',
    dueDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    dueFormatted: 'Za 6 dní',
    priority: 'medium',
    isCompleted: false,
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
    notes: 'Příprava partitioningu a clusterování pro tabulky diáře.',
  },
  {
    id: 'task_4',
    title: 'Příprava na zápočtový test – vyhledávací stromy a grafy',
    subjectName: 'Algoritmy a datové struktury',
    dueDate: new Date(Date.now() + 86400000 * 9).toISOString(),
    dueFormatted: 'Za 9 dní',
    priority: 'medium',
    isCompleted: false,
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
    notes: 'Prostudovat kapitoly o AVL stromech a Dijkstrově algoritmu.',
  },
];

const SAMPLE_EXAMS = [
  {
    id: 'exam_1',
    title: 'Zápočtový test z Databázových systémů',
    subjectName: 'Databázové systémy a Cloud BigQuery',
    date: new Date(Date.now() + 86400000 * 12).toISOString(),
    dateFormatted: '15. listopadu 2026, 10:00',
    location: 'Učebna 2.1 (PC lab)',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
    notes: 'Test na PC, 60 minut, 3 praktické úlohy v SQL.',
  },
  {
    id: 'exam_2',
    title: 'Předtermín zkoušky – Architektura systémů',
    subjectName: 'Architektura softwarových systémů',
    date: new Date(Date.now() + 86400000 * 25).toISOString(),
    dateFormatted: '28. listopadu 2026, 13:00',
    location: 'Učebna 3.2',
    originUri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords',
    notes: 'Písemná a ústní část. Nutné mít odevzdaný projekt.',
  },
];

state.schedule = SAMPLE_SCHEDULE;
state.tasks = SAMPLE_TASKS;
state.exams = SAMPLE_EXAMS;

// Pipeline URIs specification
const PIPELINE_STEPS = [
  {
    id: 'discovery',
    name: '1. OIDC Discovery Endpoint',
    uri: 'https://uuidentity.plus4u.net/uu-oidc-maing02/bb977a99f4cc4c37a2afce3fd599d0a7/oidc/.well-known/openid-configuration',
    method: 'GET',
    description: 'Zjištění koncových bodů pro autorizaci (authorize) a výměnu tokenů (token_endpoint).',
    outputKey: 'authorization_endpoint, token_endpoint',
  },
  {
    id: 'authorize',
    name: '2. Autorizační přesměrování & Lokální server',
    uri: 'https://uuidentity.plus4u.net/.../auth?client_id=F64b643R05xQ62696875W1j2&redirect_uri=http://127.0.0.1:<port>&scope=openid%20https://%20http://localhost',
    method: 'GET / BROWSER',
    description: 'Systémový prohlížeč (ASWebAuthenticationSession) se sdílenými Safari/Chrome cookies přesměruje na lokální HTTP server s ?code=XYZ.',
    outputKey: 'code (autorizační kód)',
  },
  {
    id: 'token',
    name: '3. Token Endpoint (OIDC grantToken)',
    uri: 'https://uuidentity.plus4u.net/uu-oidc-maing02/bb977a99f4cc4c37a2afce3fd599d0a7/oidc/grantToken',
    method: 'POST',
    description: 'Výměna kódu za JWT id_token podepsaný Plus4U. Dekódování claims v UTF-8.',
    outputKey: 'id_token (JWT claims: uuidentity, name, sub, exp)',
  },
  {
    id: 'people',
    name: '4. Plus4UPeople (Zjištění adresy diáře)',
    uri: 'https://uuapp.plus4u.net/uu-plus4upeople-maing01/56ac93ddb0034de8b8e4f4b829ff7d0f/personalCard/listMTInfoByUuIdentityList',
    method: 'GET',
    description: 'Dotaz s uuIdentity žáka na MyTerritory. Vrací mtDwBaseUri (unikátní URL Digital Workspace studenta).',
    outputKey: 'mtDwBaseUri',
  },
  {
    id: 'diary_active',
    name: '5. uuDwRecord (Aktivní záznamy diáře)',
    uri: '{mtDwBaseUri}uuDwRecord/listMyActiveDiaryRecords?dateFrom=...&dateTo=...&pageInfo.pageSize=4000',
    method: 'GET',
    description: 'Načtení všech aktivních schůzek, přednášek, cvičení a úkolů v semestru (±60 dní).',
    outputKey: 'itemList[] (aktivní záznamy)',
  },
  {
    id: 'diary_final',
    name: '6. uuDwRecord (Finální záznamy diáře)',
    uri: '{mtDwBaseUri}uuDwRecord/listMyFinalDiaryRecords?dateFrom=...&dateTo=...&pageInfo.pageSize=4000',
    method: 'GET',
    description: 'Načtení uzavřených a proběhlých událostí a odevzdaných úkolů.',
    outputKey: 'itemList[] (uzavřené záznamy)',
  },
  {
    id: 'parsing',
    name: '7. Parser rozvrhu, dne v týdnu a úkolů',
    uri: 'internal://StudentFlow.syncEngine.parseDiaryRecords',
    method: 'TRANSFORM',
    description: 'Inteligentní mapování: výpočet dne v týdnu (Po=2 až Pá=6), deduplikace předmětů, filtrace úkolů podle deadlinů.',
    outputKey: 'Rozvrh hodin, Úkoly studenta, Termíny zkoušek',
  },
];

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. SSE Stream: /api/stream
  if (url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    clients.add(res);

    // Initial greeting and state sync
    res.write(`event: init\ndata: ${JSON.stringify({ state, pipelineSteps: PIPELINE_STEPS })}\n\n`);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  // 2. Telemetry ingestion: POST /api/telemetry
  if (url.pathname === '/api/telemetry' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        event.timestamp = event.timestamp || new Date().toISOString();
        event.id = 'evt_' + Math.random().toString(36).slice(2, 9);

        // Update state
        state.systemStats.totalRequests++;
        state.systemStats.lastPing = Date.now();

        if (event.type === 'network_call') {
          state.networkLogs.unshift(event);
          if (state.networkLogs.length > 100) state.networkLogs.pop();
        } else if (event.type === 'pipeline_stage') {
          state.activePipeline = {
            stage: event.stage,
            progress: event.progress ?? state.activePipeline.progress,
            currentUri: event.uri ?? state.activePipeline.currentUri,
          };
        } else if (event.type === 'session_update') {
          state.currentStudent = {
            ...state.currentStudent,
            ...event.data,
            connected: true,
          };
        } else if (event.type === 'data_synced') {
          if (event.subjects) state.schedule = event.subjects;
          if (event.tasks) state.tasks = event.tasks;
          if (event.exams) state.exams = event.exams;
          state.currentStudent.lastSyncedAt = new Date().toLocaleTimeString('cs-CZ');
        }

        broadcast('telemetry', event);
        broadcast('state_update', state);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id: event.id }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  // 3. State API: GET /api/state
  if (url.pathname === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ state, pipelineSteps: PIPELINE_STEPS }));
    return;
  }

  // 4. Trigger simulation: POST /api/simulate
  if (url.pathname === '/api/simulate' && req.method === 'POST') {
    runSimulation();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ started: true }));
    return;
  }

  // 5. Static file serving from PUBLIC_DIR
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Nenalezeno');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Chyba serveru: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

/**
 * Runs animated full data flow simulation so user can immediately see
 * each URI, request payload, response status and data parsing!
 */
async function runSimulation() {
  const steps = [
    {
      stage: 'discovery',
      progress: 15,
      uri: PIPELINE_STEPS[0].uri,
      method: 'GET',
      title: 'Krok 1: OIDC Discovery',
      detail: 'Stahování autorizačních endpointů z .well-known/openid-configuration...',
      responseSnippet: {
        authorization_endpoint: 'https://uuidentity.plus4u.net/.../auth',
        token_endpoint: 'https://uuidentity.plus4u.net/.../grantToken',
        issuer: 'https://uuidentity.plus4u.net',
      },
    },
    {
      stage: 'auth',
      progress: 30,
      uri: 'http://127.0.0.1:53682/?code=auth_code_9a8f27c3',
      method: 'GET',
      title: 'Krok 2: ASWebAuthenticationSession & Lokální server',
      detail: 'Zachycení autorizačního kódu na 127.0.0.1:53682. Odeslání 302 Found na studentflow://auth.',
      responseSnippet: {
        status: 302,
        redirect: 'studentflow://auth?status=ok',
        code: 'auth_code_9a8f27c3',
      },
    },
    {
      stage: 'token',
      progress: 45,
      uri: PIPELINE_STEPS[2].uri,
      method: 'POST',
      title: 'Krok 3: Výměna kódu za id_token (OIDC grantToken)',
      detail: 'Odeslání grant_type=authorization_code. Příjem podepsaného JWT id_tokenu.',
      responseSnippet: {
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNS04MzIxLTEiLCJuYW1lIjoiSmFuIEdlcmdlbCIsInV1aWRlbnRpdHkiOiIyNS04MzIxLTEiLCJleHAiOjE3OTM0NTYwMDB9...',
        token_type: 'Bearer',
        expires_in: 5400,
      },
    },
    {
      stage: 'people',
      progress: 60,
      uri: PIPELINE_STEPS[3].uri,
      method: 'GET',
      title: 'Krok 4: Plus4UPeople (Adresa MyTerritory & Diáře)',
      detail: 'Zjištění mtDwBaseUri pro studenta Jan Gergel (uuIdentity 25-8321-1).',
      responseSnippet: {
        uuIdentity: '25-8321-1',
        mtDwBaseUri: 'https://uuapp.plus4u.net/uu-digitalworkspace-maing01/48a29b3c4d5e/',
        mtMainBaseUri: 'https://uuapp.plus4u.net/uu-myterritory-maing01/99a1b2c3d4e5/',
      },
    },
    {
      stage: 'diary',
      progress: 80,
      uri: PIPELINE_STEPS[4].uri.replace('{mtDwBaseUri}', 'https://uuapp.plus4u.net/uu-digitalworkspace-maing01/48a29b3c4d5e/'),
      method: 'GET',
      title: 'Krok 5 & 6: uuDwRecord (listMyActiveDiaryRecords)',
      detail: 'Paralelní stažení aktivních i finálních záznamů diáře studenta za semestr (celkem 48 položek).',
      responseSnippet: {
        totalRecords: 48,
        activeRecords: 32,
        finalRecords: 16,
        pageSize: 4000,
      },
    },
    {
      stage: 'parsing',
      progress: 95,
      uri: 'internal://StudentFlow.syncEngine.parseDiaryRecords',
      method: 'TRANSFORM',
      title: 'Krok 7: Matematické mapování dne v týdnu a rozvrhu',
      detail: 'Výpočet dnů (Po=2, Út=3, St=4, Čt=5, Pá=6), časových slotů (startMinutes/endMinutes) a deadlinů úkolů.',
      responseSnippet: {
        parsedSubjects: SAMPLE_SCHEDULE.length,
        parsedTasks: SAMPLE_TASKS.length,
        parsedExams: SAMPLE_EXAMS.length,
        todayWeekday: new Date().getDay() + 1,
      },
    },
    {
      stage: 'done',
      progress: 100,
      uri: 'studentflow://app/dashboard',
      method: 'READY',
      title: 'Dokončeno: Rozvrh a úkoly studenta synchronizovány',
      detail: 'Aplikace na mobilu i notebooku zobrazuje přesná aktuální data.',
      responseSnippet: {
        status: 'SUCCESS',
        student: 'Jan Gergel (25-8321-1)',
        syncedAt: new Date().toLocaleTimeString('cs-CZ'),
      },
    },
  ];

  for (const step of steps) {
    state.activePipeline = {
      stage: step.stage,
      progress: step.progress,
      currentUri: step.uri,
    };

    const logEvent = {
      type: 'network_call',
      id: 'sim_' + Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toISOString(),
      uri: step.uri,
      method: step.method,
      title: step.title,
      detail: step.detail,
      response: step.responseSnippet,
      stage: step.stage,
    };

    state.networkLogs.unshift(logEvent);
    if (state.networkLogs.length > 50) state.networkLogs.pop();

    broadcast('telemetry', logEvent);
    broadcast('state_update', state);

    await new Promise((resolve) => setTimeout(resolve, 850));
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 StudentFlow Data Flow Inspector běží na:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   👉 http://127.0.0.1:${PORT}`);
  console.log(`   📡 Telemetry Ingest: POST http://localhost:${PORT}/api/telemetry`);
  console.log(`======================================================\n`);
});
