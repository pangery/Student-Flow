import type { ExamItem, TaskItem } from '../types/models';

export type SemesterType = 'winter' | 'summer';

export type SemesterInfo = {
  id: string; // e.g. "2026-ZS"
  code: string; // e.g. "ZS 2026/27"
  shortName: string; // e.g. "ZS 26/27"
  fullName: string; // e.g. "Zimní semestr 2026/2027"
  type: SemesterType;
  academicYear: string; // e.g. "2026/2027"
  startDate: Date;
  endDate: Date;
};

/**
 * Vypočítá aktuální semestr na Unicorn University podle harmonogramu akademického roku:
 * - Zimní semestr (ZS): začátek 1. září (zápisy a příprava v září, výuka od konce září),
 *   konec 14. února (zahrnuje lednové a únorové zkouškové období).
 * - Letní semestr (LS): začátek 15. února (výuka od půlky února),
 *   konec 31. srpna (zahrnuje letní zkouškové období i srpnové termíny).
 */
export function getSemesterForDate(dateInput: Date | string = new Date()): SemesterInfo {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const validDate = Number.isFinite(date.getTime()) ? date : new Date();

  const year = validDate.getFullYear();
  const month = validDate.getMonth(); // 0 = Leden, 1 = Únor, ..., 8 = Září
  const day = validDate.getDate();

  const isWinterLate = month >= 8; // Září - Prosinec (8 až 11)
  const isWinterEarly = month === 0 || (month === 1 && day < 15); // 1. ledna - 14. února

  if (isWinterLate) {
    const startYear = year;
    const endYear = year + 1;
    const shortEndYear = String(endYear).slice(-2);
    return {
      id: `${startYear}-ZS`,
      code: `ZS ${startYear}/${shortEndYear}`,
      shortName: `ZS ${String(startYear).slice(-2)}/${shortEndYear}`,
      fullName: `Zimní semestr ${startYear}/${endYear}`,
      type: 'winter',
      academicYear: `${startYear}/${endYear}`,
      startDate: new Date(Date.UTC(startYear, 8, 1, 0, 0, 0, 0)), // 1. září
      endDate: new Date(Date.UTC(endYear, 1, 14, 23, 59, 59, 999)), // 14. února
    };
  } else if (isWinterEarly) {
    const startYear = year - 1;
    const endYear = year;
    const shortEndYear = String(endYear).slice(-2);
    return {
      id: `${startYear}-ZS`,
      code: `ZS ${startYear}/${shortEndYear}`,
      shortName: `ZS ${String(startYear).slice(-2)}/${shortEndYear}`,
      fullName: `Zimní semestr ${startYear}/${endYear}`,
      type: 'winter',
      academicYear: `${startYear}/${endYear}`,
      startDate: new Date(Date.UTC(startYear, 8, 1, 0, 0, 0, 0)), // 1. září předchozího roku
      endDate: new Date(Date.UTC(endYear, 1, 14, 23, 59, 59, 999)), // 14. února
    };
  } else {
    // Letní semestr: 15. února - 31. srpna
    const startYear = year - 1;
    const endYear = year;
    const shortEndYear = String(endYear).slice(-2);
    return {
      id: `${startYear}-LS`,
      code: `LS ${startYear}/${shortEndYear}`,
      shortName: `LS ${String(startYear).slice(-2)}/${shortEndYear}`,
      fullName: `Letní semestr ${startYear}/${endYear}`,
      type: 'summer',
      academicYear: `${startYear}/${endYear}`,
      startDate: new Date(Date.UTC(year, 1, 15, 0, 0, 0, 0)), // 15. února
      endDate: new Date(Date.UTC(year, 7, 31, 23, 59, 59, 999)), // 31. srpna
    };
  }
}

/**
 * Zjistí, zda zadané datum spadá do aktuálního semestru (nebo není z předešlých semestrů).
 * Pokud položka nemá explicitní datum (např. úkol bez termínu), považuje se za aktuální.
 */
export function isDateInCurrentSemester(
  dateStr?: string | null,
  semester: SemesterInfo = getSemesterForDate()
): boolean {
  if (!dateStr || !dateStr.trim()) return true;
  const parsed = Date.parse(dateStr);
  if (!Number.isFinite(parsed)) return true;

  const itemDate = new Date(parsed);
  // Položky z předešlých semestrů mají datum před začátkem aktuálního semestru
  if (itemDate < semester.startDate) {
    return false;
  }
  return true;
}

/**
 * Filtruje úkoly tak, aby se nezobrazovaly staré věci z předešlých semestrů.
 */
export function filterCurrentSemesterTasks(
  tasks: TaskItem[],
  semester: SemesterInfo = getSemesterForDate()
): TaskItem[] {
  return tasks.filter((task) => isDateInCurrentSemester(task.dueDate, semester));
}

/**
 * Filtruje zkoušky tak, aby se nezobrazovaly staré zkoušky z předešlých semestrů.
 */
export function filterCurrentSemesterExams(
  exams: ExamItem[],
  semester: SemesterInfo = getSemesterForDate()
): ExamItem[] {
  return exams.filter((exam) => isDateInCurrentSemester(exam.date, semester));
}
