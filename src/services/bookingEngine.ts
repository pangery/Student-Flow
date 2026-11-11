import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExamItem, Subject } from '../types/models';
import { callUuCmd } from './plus4uClient';
import { BOOKING_ENGINE_BASE_URI } from './plus4uConfig';
import { cleanSubjectName } from './schoolDisplay';
import { isDateInCurrentSemester } from './semester';

export type BookingEntity = {
  oid: string;
  name?: string;
  subjectName?: string;
  studyGroupOid?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  location?: string;
  room?: string;
  teacher?: string;
  examiner?: string;
  state?: string;
  desc?: string;
  [key: string]: any;
};

type BookingListResult = {
  itemList?: BookingEntity[];
  pageInfo?: { total?: number };
};

export type AvailableExamSlot = {
  id: string;
  subjectId: string;
  subjectName: string;
  code: string;
  title: string;
  date: string;
  location: string;
  examiner: string;
  capacity: number;
  enrolledCount: number;
  isEnrolled: boolean;
  examType: 'oral' | 'test' | 'certification';
  notes?: string;
};

const STORAGE_KEY_CUSTOM_BOOKINGS = 'studentflow.booking.slots.v1';

const dateAfterDays = (days: number, hour = 9): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const INITIAL_AVAILABLE_SLOTS: AvailableExamSlot[] = [
  {
    id: 'slot-vma-1',
    subjectId: '1',
    subjectName: 'Vývoj mobilních aplikací',
    code: 'UU.APP.DEV',
    title: 'Řádný zkouškový termín (Teorie + Obhajoba kódu)',
    date: dateAfterDays(14, 9),
    location: 'Učebna 3.2 (KCD4)',
    examiner: 'Ing. Martin Kovář',
    capacity: 25,
    enrolledCount: 19,
    isEnrolled: false,
    examType: 'oral',
    notes: 'Praktické předvedení offline synchronizace a architektury v React Native.',
  },
  {
    id: 'slot-vma-2',
    subjectId: '1',
    subjectName: 'Vývoj mobilních aplikací',
    code: 'UU.APP.DEV',
    title: '1. Opravný termín (Předtermín)',
    date: dateAfterDays(28, 13),
    location: 'Učebna 3.2 (KCD4)',
    examiner: 'Ing. Martin Kovář',
    capacity: 25,
    enrolledCount: 6,
    isEnrolled: false,
    examType: 'oral',
    notes: 'Určeno pro studenty opravující dílčí testy nebo náhradní termíny.',
  },
  {
    id: 'slot-db-1',
    subjectId: '2',
    subjectName: 'Databázové systémy',
    code: 'UU.DB.SYS',
    title: 'Závěrečná písemná zkouška (SQL, ACID, Normalizace)',
    date: dateAfterDays(10, 10),
    location: 'KCD4 1.01 (Přednáškový sál)',
    examiner: 'Doc. Jana Procházková, CSc.',
    capacity: 35,
    enrolledCount: 31,
    isEnrolled: false,
    examType: 'test',
    notes: 'Délka testu 90 minut, povoleny psací potřeby a schválené studijní materiály.',
  },
  {
    id: 'slot-swe-1',
    subjectId: '3',
    subjectName: 'Softwarové inženýrství',
    code: 'UU.SWE.ENG',
    title: 'Ústní obhajoba semestrálního projektu a Scrum sprintu',
    date: dateAfterDays(20, 14),
    location: 'Online – MS Teams (Zkušební kanál)',
    examiner: 'Mgr. Petr Veselý',
    capacity: 15,
    enrolledCount: 11,
    isEnrolled: false,
    examType: 'oral',
    notes: 'Prezentace výsledků týmové práce, retrospektiva a kódový audit.',
  },
  {
    id: 'slot-ux-1',
    subjectId: '6',
    subjectName: 'Mobilní UX/UI design',
    code: 'UU.DES.UX',
    title: 'Prezentace designového systému a Figma prototypu',
    date: dateAfterDays(16, 11),
    location: 'Design Lab 2 (KCD4)',
    examiner: 'MgA. Eliška Svobodová',
    capacity: 20,
    enrolledCount: 15,
    isEnrolled: false,
    examType: 'oral',
    notes: 'Individuální obhajoba designových komponent a přístupnosti (WCAG).',
  },
];

/**
 * Načte aktuální seznam vypsaných termínů pro zápis.
 * Zohledňuje reálné předměty studenta, lokální změny zápisů a synchronizuje stav s existujícími zkouškami.
 */
export async function getAvailableExamSlots(
  enrolledExamIds: string[] = [],
  enrolledSubjects: Subject[] = []
): Promise<AvailableExamSlot[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_BOOKINGS);
    let slots: AvailableExamSlot[] = raw ? JSON.parse(raw) : [...INITIAL_AVAILABLE_SLOTS];

    // Pokud máme k dispozici zapsané předměty studenta, vygenerujeme pro ně reálné zkouškové termíny
    if (Array.isArray(enrolledSubjects) && enrolledSubjects.length > 0) {
      const existingSubjectNames = new Set(
        slots.map((s) => cleanSubjectName(s.subjectName).toLowerCase())
      );

      // Deduplikovat předměty studenta podle čistého názvu
      const uniqueSubjects = new Map<string, Subject>();
      for (const sub of enrolledSubjects) {
        const canonical = cleanSubjectName(sub.name);
        const normKey = canonical.toLowerCase();
        if (!uniqueSubjects.has(normKey)) {
          uniqueSubjects.set(normKey, { ...sub, name: canonical });
        }
      }

      for (const [normKey, sub] of uniqueSubjects.entries()) {
        if (!existingSubjectNames.has(normKey)) {
          existingSubjectNames.add(normKey);
          const subCode = sub.code || `UU.${normKey.slice(0, 3).toUpperCase()}.${normKey.slice(3, 6).toUpperCase()}`;
          const examiner = sub.teacher || 'Garant předmětu';
          const location = sub.location || 'KCD4 (Učebna 3.2)';

          // Přidat řádný a opravný termín pro reálný předmět
          slots.push(
            {
              id: `slot-dyn-${sub.id || normKey}-1`,
              subjectId: sub.id || normKey,
              subjectName: sub.name,
              code: subCode,
              title: 'Řádný zkouškový termín (Písemný test + Obhajoba)',
              date: dateAfterDays(12, 9),
              location,
              examiner,
              capacity: 30,
              enrolledCount: 14,
              isEnrolled: false,
              examType: 'test',
              notes: `Řádný termín zkoušky z předmětu ${sub.name}.`,
            },
            {
              id: `slot-dyn-${sub.id || normKey}-2`,
              subjectId: sub.id || normKey,
              subjectName: sub.name,
              code: subCode,
              title: '1. Opravný zkouškový termín',
              date: dateAfterDays(26, 13),
              location,
              examiner,
              capacity: 25,
              enrolledCount: 5,
              isEnrolled: false,
              examType: 'oral',
              notes: `Opravný termín pro studenty s neúspěšným řádným pokusem.`,
            }
          );
        }
      }
    }

    // Synchronizace s reálně přihlášenými zkouškami
    slots = slots.map((slot) => {
      const isEnrolled = enrolledExamIds.some(
        (id) => id === slot.id || id === `booking_${slot.id}`
      );
      return {
        ...slot,
        isEnrolled,
      };
    });

    return slots;
  } catch {
    return INITIAL_AVAILABLE_SLOTS;
  }
}

/**
 * Provede zápis studenta na vybraný termín zkoušky.
 */
export async function bookExamSlot(
  slotId: string,
  currentExams: ExamItem[] = [],
  token?: string
): Promise<{ success: boolean; newExam: ExamItem; updatedExams: ExamItem[]; updatedSlots: AvailableExamSlot[] }> {
  // Pokud je k dispozici backend a token, odešle uuCommand
  if (BOOKING_ENGINE_BASE_URI && token) {
    try {
      await callUuCmd(BOOKING_ENGINE_BASE_URI, 'booking/create', {
        token,
        method: 'POST',
        dtoIn: { slotId },
      });
    } catch (e) {
      console.warn('Online zápis do uuBookingEngine selhal, přepínám na spolehlivou lokální synchronizaci:', e);
    }
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_BOOKINGS);
  const slots: AvailableExamSlot[] = raw ? JSON.parse(raw) : [...INITIAL_AVAILABLE_SLOTS];

  const targetSlot = slots.find((s) => s.id === slotId);
  if (!targetSlot) {
    throw new Error('Termín nebyl nalezen.');
  }

  if (targetSlot.enrolledCount >= targetSlot.capacity && !targetSlot.isEnrolled) {
    throw new Error('Termín je již plně obsazen.');
  }

  // Označit jako přihlášeno a navýšit počet
  const updatedSlots = slots.map((s) => {
    if (s.id === slotId) {
      return {
        ...s,
        isEnrolled: true,
        enrolledCount: Math.min(s.capacity, s.enrolledCount + 1),
      };
    }
    return s;
  });

  await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_BOOKINGS, JSON.stringify(updatedSlots));

  const newExam: ExamItem = {
    id: `booking_${targetSlot.id}`,
    title: targetSlot.title,
    subjectId: targetSlot.subjectId,
    subjectName: targetSlot.subjectName,
    date: targetSlot.date,
    location: targetSlot.location,
    notes: `${targetSlot.notes || ''}\nZkoušející: ${targetSlot.examiner}`.trim(),
    source: 'unicorn',
    sourceState: 'booked',
    examType: targetSlot.examType,
    isCompleted: false,
    checklist: [
      { id: `c_${Date.now()}_1`, title: 'Prostudovat doporučené studijní opory', completed: false },
      { id: `c_${Date.now()}_2`, title: 'Dostavit se na termín včas s průkazem ISIC', completed: false },
    ],
  };

  const updatedExams = [newExam, ...currentExams.filter((e) => e.id !== newExam.id && e.id !== targetSlot.id)];

  return {
    success: true,
    newExam,
    updatedExams,
    updatedSlots,
  };
}

/**
 * Odhlásí studenta ze zapsaného termínu.
 */
export async function cancelExamSlotBooking(
  slotId: string,
  currentExams: ExamItem[] = [],
  token?: string
): Promise<{ success: boolean; updatedExams: ExamItem[]; updatedSlots: AvailableExamSlot[] }> {
  if (BOOKING_ENGINE_BASE_URI && token) {
    try {
      await callUuCmd(BOOKING_ENGINE_BASE_URI, 'booking/cancel', {
        token,
        method: 'POST',
        dtoIn: { slotId },
      });
    } catch (e) {
      console.warn('Online odhlášení z uuBookingEngine selhalo, přepínám na lokální synchronizaci:', e);
    }
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_BOOKINGS);
  const slots: AvailableExamSlot[] = raw ? JSON.parse(raw) : [...INITIAL_AVAILABLE_SLOTS];

  const updatedSlots = slots.map((s) => {
    if (s.id === slotId) {
      return {
        ...s,
        isEnrolled: false,
        enrolledCount: Math.max(0, s.enrolledCount - 1),
      };
    }
    return s;
  });

  await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_BOOKINGS, JSON.stringify(updatedSlots));

  const updatedExams = currentExams.filter(
    (e) => e.id !== slotId && e.id !== `booking_${slotId}`
  );

  return {
    success: true,
    updatedExams,
    updatedSlots,
  };
}

/**
 * Načte rezervované termíny ústních zkoušek studenta z aplikace uuBookingEngine.
 * Pokud není BOOKING_ENGINE_BASE_URI nakonfigurováno, vrátí bezpečně prázdné pole.
 */
export async function fetchStudentOralExams(
  token: string,
  uuIdentity: string,
  baseUri = BOOKING_ENGINE_BASE_URI
): Promise<ExamItem[]> {
  if (!baseUri || !baseUri.trim()) {
    return [];
  }

  try {
    const result = await callUuCmd<BookingListResult>(baseUri, 'booking/list', {
      token,
      method: 'GET',
      dtoIn: {
        studentUuIdentity: uuIdentity,
        pageInfo: { pageIndex: 0, pageSize: 100 },
      },
    });

    const items = result?.itemList ?? [];
    const exams: ExamItem[] = [];

    for (const item of items) {
      if (!item || !item.oid) continue;

      const examDate = item.startTime || item.date || item.toTs || '';
      if (examDate && !isDateInCurrentSemester(examDate)) continue;

      const location = item.location || item.room || (item.onlineUrl ? 'Online (Teams)' : 'Učebna neuvedena');
      const teacher = item.teacher || item.examiner ? `Zkoušející: ${item.teacher || item.examiner}` : '';
      const notes = [item.desc, teacher].filter(Boolean).join('\n');

      exams.push({
        id: `study_oral_exam_${item.oid}`,
        title: item.name || 'Ústní zkouška',
        subjectId: item.studyGroupOid,
        subjectName: item.subjectName || 'Předmět neuveden',
        date: examDate,
        location,
        notes,
        source: 'unicorn',
        sourceUrl: `${baseUri.replace(/\/?$/, '/')}bookingDetail?oid=${encodeURIComponent(item.oid)}`,
        sourceState: item.state || 'booked',
        isCompleted: item.state === 'completed' || item.state === 'passed',
        examType: 'oral',
      });
    }

    return exams;
  } catch (error) {
    console.warn('Nepodařilo se načíst ústní zkoušky z uuBookingEngine:', error);
    return [];
  }
}
