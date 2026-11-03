import type { ExamItem } from '../types/models';
import { callUuCmd } from './plus4uClient';
import { BOOKING_ENGINE_BASE_URI } from './plus4uConfig';
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
    // Služba ještě není ve škole nakonfigurována
    return [];
  }

  try {
    // Standardní čtecí příkazy pro rezervace v uuBookingEngine:
    // zkusíme 'booking/list' s filtrem na studenta
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
    // Výpadek bookingEngine nesmí zablokovat celou synchronizaci
    console.warn('Nepodařilo se načíst ústní zkoušky z uuBookingEngine:', error);
    return [];
  }
}
