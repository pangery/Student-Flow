import type { StudentData } from '../types/models';

const dateAfter = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const sampleData: StudentData = {
  subjects: [
    // Pondělí (weekday 2)
    {
      id: '1',
      name: 'Vývoj mobilních aplikací',
      code: 'UU.APP.DEV',
      weekday: 2,
      startMinutes: 540, // 09:00
      endMinutes: 630, // 10:30
      location: 'Učebna 3.2 (KCD4)',
      teacher: 'Ing. Martin Kovář',
    },
    {
      id: '5',
      name: 'Softwarové architektury',
      code: 'UU.ARC.DES',
      weekday: 2,
      startMinutes: 660, // 11:00
      endMinutes: 750, // 12:30
      location: 'Učebna 2.1',
      teacher: 'RNDr. Pavel Černý, Ph.D.',
    },

    // Úterý (weekday 3)
    {
      id: '2',
      name: 'Databázové systémy',
      code: 'UU.DB.SYS',
      weekday: 3,
      startMinutes: 600, // 10:00
      endMinutes: 690, // 11:30
      location: 'KCD4 1.01',
      teacher: 'Doc. Jana Procházková, CSc.',
    },
    {
      id: '2-lab',
      name: 'Cvičení – Databáze',
      code: 'UU.DB.SYS',
      weekday: 3,
      startMinutes: 780, // 13:00
      endMinutes: 870, // 14:30
      location: 'Počítačová lab 4',
      teacher: 'Ing. Tomáš Nový',
    },

    // Středa (weekday 4)
    {
      id: '3',
      name: 'Softwarové inženýrství',
      code: 'UU.SWE.ENG',
      weekday: 4,
      startMinutes: 840, // 14:00
      endMinutes: 930, // 15:30
      location: 'Online – MS Teams',
      teacher: 'Mgr. Petr Veselý',
    },

    // Čtvrtek (weekday 5)
    {
      id: '4',
      name: 'Webové technologie',
      code: 'UU.WEB.TECH',
      weekday: 5,
      startMinutes: 540, // 09:00
      endMinutes: 630, // 10:30
      location: 'Učebna 1.05',
      teacher: 'Ing. David Marek',
    },
    {
      id: '6',
      name: 'Mobilní UX/UI design',
      code: 'UU.DES.UX',
      weekday: 5,
      startMinutes: 660, // 11:00
      endMinutes: 750, // 12:30
      location: 'Design Lab 2',
      teacher: 'MgA. Eliška Svobodová',
    },

    // Pátek (weekday 6)
    {
      id: '7',
      name: 'Projektový seminář',
      code: 'UU.PRJ.SEM',
      weekday: 6,
      startMinutes: 600, // 10:00
      endMinutes: 690, // 11:30
      location: 'Učebna 3.2',
      teacher: 'Týmová konzultace',
    },
  ],

  tasks: [
    {
      id: '1',
      title: 'Odevzdat návrh mobilní aplikace',
      dueDate: dateAfter(2),
      isCompleted: false,
      subjectId: '1',
      subjectName: 'Vývoj mobilních aplikací',
      priority: 'high',
      notes: 'Architektura v Figmě + specifikace offline synchronizace a cacheování učebnic.',
    },
    {
      id: '2',
      title: 'Semestrální práce – databázové schéma',
      dueDate: dateAfter(8),
      isCompleted: false,
      subjectId: '2',
      subjectName: 'Databázové systémy',
      priority: 'medium',
      notes: 'ER diagram, 3NF normalizace a vytvoření indexů v PostgreSQL.',
    },
    {
      id: '3',
      title: 'Příprava na prezentaci projektu',
      dueDate: dateAfter(14),
      isCompleted: false,
      subjectId: '3',
      subjectName: 'Softwarové inženýrství',
      priority: 'low',
      notes: 'Příprava slidů k agilnímu sprintu a retrospektivě.',
    },
    {
      id: '4',
      title: 'Prostudovat offline režim a AsyncStorage',
      dueDate: dateAfter(1),
      isCompleted: true,
      subjectId: '1',
      subjectName: 'Vývoj mobilních aplikací',
      priority: 'high',
      notes: 'Zkontrolovat cachování kapitol a metadata pro čtení bez internetu.',
    },
    {
      id: 'task-archive-1',
      title: 'Semestrální práce – Algoritmy a datové struktury',
      dueDate: '2026-05-15T12:00:00.000Z',
      isCompleted: true,
      subjectId: 'old-1',
      subjectName: 'Algoritmy (LS 25/26)',
      priority: 'medium',
      notes: 'Archivní úkol z předchozího letního semestru.',
    },
  ],

  examDate: dateAfter(24),

  exams: [
    {
      id: 'exam-1',
      title: 'Zkouška – Vývoj mobilních aplikací',
      subjectId: '1',
      subjectName: 'Vývoj mobilních aplikací',
      date: dateAfter(24),
      location: 'Učebna 3.2 (KCD4)',
      notes: 'Praktická část: implementace offline cache a bezpečné uložení tokenu.',
      checklist: [
        { id: 'c1', title: 'Prostudovat kapitoly v Učebnicích', completed: true },
        { id: 'c2', title: 'Dokončit semestrální projekt v React Native', completed: true },
        { id: 'c3', title: 'Zopakovat si ukázky kódu (PKCE + SecureStore)', completed: false },
        { id: 'c4', title: 'Příprava na ústní obhajobu architektury', completed: false },
      ],
    },
    {
      id: 'exam-2',
      title: 'Zápočtový test – Databázové systémy',
      subjectId: '2',
      subjectName: 'Databázové systémy',
      date: dateAfter(10),
      location: 'KCD4 1.01',
      notes: 'SQL dotazy, normalizace 1NF–3NF, indexování a transakce ACID.',
      checklist: [
        { id: 'c21', title: 'Zopakovat relační algebru a JOIN operace', completed: true },
        { id: 'c22', title: 'Vyřešit cvičné testové otázky z minulých let', completed: false },
        { id: 'c23', title: 'Odevzdat schválené semestrální schéma', completed: true },
      ],
    },
    {
      id: 'exam-3',
      title: 'Předtermín – Softwarové inženýrství',
      subjectId: '3',
      subjectName: 'Softwarové inženýrství',
      date: dateAfter(18),
      location: 'Online – MS Teams',
      notes: 'Scrum ceremonie, CI/CD, Git branching strategie, testování (TDD).',
      checklist: [
        { id: 'c31', title: 'Přečíst skripta o agilním řízení projektů', completed: false },
        { id: 'c32', title: 'Zkontrolovat pokrytí kódu unit testy', completed: false },
      ],
    },
    {
      id: 'exam-archive-1',
      title: 'Zkouška – Algoritmizace (LS 25/26)',
      subjectId: 'old-1',
      subjectName: 'Algoritmy (LS 25/26)',
      date: '2026-05-28T09:00:00.000Z',
      location: 'Učebna 2.1',
      notes: 'Archivní zkouška z předchozího letního semestru.',
      isCompleted: true,
      checklist: [
        { id: 'ca1', title: 'Lineární a binární vyhledávání', completed: true },
        { id: 'ca2', title: 'Řadící algoritmy O(n log n)', completed: true },
      ],
    },
  ],
};
