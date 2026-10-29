import { PLUS4U_PEOPLE_BASE_URI } from './plus4uConfig';
import { callUuCmd } from './plus4uClient';
import type { ExamItem, Subject, TaskItem } from '../types/models';

export type MtInfo = {
  uuIdentity: string;
  mtMainBaseUri?: string;
  mtDwBaseUri: string;
};

export type RawDiaryRecord = {
  id: string;
  name?: string;
  desc?: string;
  startTime: string;
  endTime: string;
  rejected?: boolean;
  tileProps?: {
    submitterMainUuIdentityName?: string;
    activityStateCode?: string;
    location?: string;
    activity?: {
      stateName?: string;
    };
    [key: string]: any;
  };
  [key: string]: any;
};

/**
 * 1) Plus4UPeople: získá mtDwBaseUri (adresa Digital Workspace / Diáře) pro danou uuIdentity.
 */
export async function getMtInfo(token: string, uuIdentity: string): Promise<MtInfo> {
  const dtoOut = await callUuCmd(
    PLUS4U_PEOPLE_BASE_URI,
    'personalCard/listMTInfoByUuIdentityList',
    {
      token,
      method: 'GET',
      dtoIn: {
        uuIdentityList: [uuIdentity],
        pageInfo: { pageIndex: 0, pageSize: 1000 },
      },
    }
  );

  const itemList = dtoOut?.itemList ?? [];
  const item = itemList.find((i: any) => i.uuIdentity === uuIdentity);

  if (!item?.mtDwBaseUri) {
    throw new Error(
      `Plus4UPeople nevrátil Digital Workspace pro uuIdentity: ${uuIdentity}`
    );
  }

  return item as MtInfo;
}

/**
 * Odstraní značky <uu5string> i běžné HTML z textů vrácených z uuApp.
 */
export function stripMarkup(text?: string | null): string {
  return (text ?? '')
    .replace(/<uu5string\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 2) Načte aktivní i finální záznamy diáře pro zadané časové rozmezí.
 */
export async function fetchAllDiaryRecords(
  token: string,
  mtDwBaseUri: string,
  dateFrom: string,
  dateTo: string
): Promise<RawDiaryRecord[]> {
  const listRecords = async (command: string): Promise<RawDiaryRecord[]> => {
    const records: RawDiaryRecord[] = [];
    const pageSize = 200;
    for (let pageIndex = 0; ; pageIndex++) {
      const result = await callUuCmd(mtDwBaseUri, command, {
        token, method: 'GET',
        dtoIn: { dateFrom, dateTo, pageInfo: { pageIndex, pageSize } },
      });
      if (!Array.isArray(result?.itemList)) {
        throw new Error(`${command}: server nevrátil seznam záznamů.`);
      }
      records.push(...result.itemList);
      const total = result.pageInfo?.total;
      if (typeof total === 'number' ? records.length >= total : result.itemList.length < pageSize) break;
      if (!result.itemList.length || pageIndex >= 499) throw new Error('Diář se nepodařilo načíst celý.');
    }
    return records;
  };
  const [activeList, finalList] = await Promise.all([
    listRecords('uuDwRecord/listMyActiveDiaryRecords'),
    listRecords('uuDwRecord/listMyFinalDiaryRecords'),
  ]);

  // Sloučíme a seřadíme podle času zahájení
  const combined = [...activeList, ...finalList];
  const uniqueMap = new Map<string, RawDiaryRecord>();
  for (const item of combined) {
    if (item.id && !uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  }

  return Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export type ParsedPlus4UData = {
  subjects: Subject[];
  exams: ExamItem[];
  tasks: TaskItem[];
  rawCount: number;
  diaryLoaded?: boolean;
  warnings?: string[];
};

/** Diary records only supply the schedule. Assignments and tests come from StudyEngine. */
export function parseDiaryRecords(records: RawDiaryRecord[]): ParsedPlus4UData {
  const subjectsMap = new Map<string, Subject>();
  const exams: ExamItem[] = [];
  const tasks: TaskItem[] = [];

  for (const r of records) {
    if (r.rejected || !Number.isFinite(Date.parse(r.startTime))) continue;
    const rawTitle = stripMarkup(r.name) || '(Bez názvu)';
    const startDate = new Date(r.startTime);
    const endDate = new Date(r.endTime);
    const rawDesc = stripMarkup(r.desc);
    // Extrakce učebny z textů či standardních Unicorn atributů
    const roomFromText =
      rawTitle.match(/(?:učebna|místnost|room|lab)\s*[:\-]?\s*([A-Za-z0-9\.\-\s]+(?:\([^\)]+\))?)/i)?.[0] ||
      rawDesc.match(/(?:učebna|místnost|room|lab)\s*[:\-]?\s*([A-Za-z0-9\.\-\s]+(?:\([^\)]+\))?)/i)?.[0] ||
      rawTitle.match(/([A-Z]\d+[\.\-]\d+|KCD\d*\s*\d+[\.\d]*)/i)?.[0];

    const location =
      r.tileProps?.location ||
      r.location ||
      r.tileProps?.place ||
      r.place ||
      r.tileProps?.room ||
      r.room ||
      r.tileProps?.classroom ||
      r.classroom ||
      (r.tileProps?.activity as any)?.location ||
      (r.tileProps?.activity as any)?.place ||
      roomFromText ||
      (rawTitle.toLowerCase().includes('online') || rawDesc.toLowerCase().includes('online') || rawTitle.toLowerCase().includes('teams') ? 'Online – MS Teams' : undefined);
    const teacher =
      r.tileProps?.submitterMainUuIdentityName ||
      r.tileProps?.teacher ||
      r.teacher ||
      r.tileProps?.lecturer ||
      (r.tileProps?.activity as any)?.teacher;

    // C) Předmět v rozvrhu (pokud to má smysluplný čas a spadá do všedního dne)
    const weekday = startDate.getDay() + 1; // 2 = Po ... 6 = Pá
    if (weekday >= 2 && weekday <= 6 && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

      // Jen hodiny s délkou aspoň 30 minut
      if (endMinutes > startMinutes + 25) {
        const scheduleKey = r.id;

        if (!subjectsMap.has(scheduleKey)) {
          // Použijeme pouze kód uvedený ve zdroji
          const codeMatch = rawTitle.match(/UU\.[\w\.]+/i);

          subjectsMap.set(scheduleKey, {
            id: `diary_${r.id}`,
            date: r.startTime,
            name: rawTitle,
            weekday,
            startMinutes,
            endMinutes,
            location,
            teacher,
            code: codeMatch?.[0],
          });
        }
      }
    }
  }

  return {
    subjects: Array.from(subjectsMap.values()),
    exams,
    tasks,
    rawCount: records.length,
  };
}

import { telemetry } from './telemetry';
import { fetchStudentStudyData } from './studyEngine';

/**
 * 4) Kompletní synchronizační pipeline:
 *    Připojí se k Plus4U, zjistí MyTerritory, stáhne diář na ±60 dní a vrátí data pro StudentFlow.
 */
export async function syncStudentDataFromPlus4U(
  token: string,
  uuIdentity: string
): Promise<ParsedPlus4UData> {
  // School assignments are authoritative. A diary failure must not hide them.
  const studyData = await fetchStudentStudyData(token, uuIdentity);
  let subjects: Subject[] = [];
  let rawCount = 0;
  let diaryLoaded = false;
  const warnings: string[] = [];
  try {
    telemetry.stage('people', 60, PLUS4U_PEOPLE_BASE_URI);
    const mtInfo = await getMtInfo(token, uuIdentity);
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const to = new Date();
    to.setDate(to.getDate() + 65);
    const records = await fetchAllDiaryRecords(token, mtInfo.mtDwBaseUri, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
    const diary = parseDiaryRecords(records);
    subjects = diary.subjects;
    rawCount = diary.rawCount;
    diaryLoaded = true;
  } catch (error) {
    warnings.push(`Rozvrh se nepodařilo obnovit: ${error instanceof Error ? error.message : 'Chyba připojení.'}`);
  }
  const result = { ...studyData, subjects, rawCount, diaryLoaded, warnings };
  telemetry.dataSynced(result);
  return result;
}
