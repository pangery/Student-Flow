import type { ExamItem, TaskItem } from '../types/models';
import { callUuCmd } from './plus4uClient';
import { STUDY_ENGINE_BASE_URI } from './plus4uConfig';
import { isDateInCurrentSemester } from './semester';

// Commands and fields used by Unicorn's uu_studyengineg01-core client (2.15.0).
// Never infer tests from names: test steps have kind="test".
export type StudyEntity = {
  oid: string;
  name: string;
  studyGroupOid?: string;
  assignmentOid?: string;
  certificationExamOid?: string;
  kind?: string;
  state?: string;
  fromTs?: string;
  toTs?: string;
  desc?: string;
  studentMap?: Record<string, unknown>;
  studentResultCacheMap?: Record<string, { state?: string | boolean; points?: number }>;
};

type ListResult = { itemList: StudyEntity[]; pageInfo?: { total?: number } };

export async function listStudyEntities(
  token: string,
  uuIdentity: string,
  command: string,
  baseUri = STUDY_ENGINE_BASE_URI,
): Promise<StudyEntity[]> {
  const items = new Map<string, StudyEntity>();
  const pageSize = 200;
  let received = 0;
  for (let pageIndex = 0; pageIndex < 500; pageIndex++) {
    const result = await callUuCmd<ListResult>(baseUri, command, {
      token,
      dtoIn: { studentUuIdentity: uuIdentity, pageInfo: { pageIndex, pageSize } },
    });
    if (!Array.isArray(result?.itemList)) throw new Error(`${command}: chybí seznam dat.`);
    const previousSize = items.size;
    for (const item of result.itemList) {
      if (!item || typeof item.oid !== 'string' || typeof item.name !== 'string') {
        throw new Error(`${command}: neplatný formát položky.`);
      }
      items.set(item.oid, item);
    }
    received += result.itemList.length;
    const total = result.pageInfo?.total;
    if (typeof total === 'number' ? received >= total : result.itemList.length < pageSize) {
      return [...items.values()];
    }
    if (items.size === previousSize) throw new Error(`${command}: stránkování nevrací další položky.`);
  }
  throw new Error(`${command}: seznam se nepodařilo načíst celý.`);
}

const terminalStepStates = ['completed', 'readyForEvaluation', 'failed'];
const cleanText = (text?: string) => text?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const dateValue = (value?: string) => value && Number.isFinite(Date.parse(value)) ? value : '';

export function mapStudyData(
  assignments: StudyEntity[],
  certifications: StudyEntity[],
  steps: StudyEntity[],
  groups: StudyEntity[],
  uuIdentity: string,
  baseUri = STUDY_ENGINE_BASE_URI,
): { tasks: TaskItem[]; exams: ExamItem[] } {
  const groupMap = new Map(groups.map(group => [group.oid, group]));
  // The server also filters by studentUuIdentity. Check membership locally when supplied.
  const belongsToStudent = (item: StudyEntity) =>
    (!item.studentMap || Object.hasOwn(item.studentMap, uuIdentity)) &&
    isDateInCurrentSemester(item.toTs);
  const ownSteps = steps.filter(item => !item.studentMap || Object.hasOwn(item.studentMap, uuIdentity));
  const parents = new Map([...assignments, ...certifications].filter(belongsToStudent).map(item => [item.oid, item]));
  const sourceUrl = (route: string, oid: string) => `${baseUri.replace(/\/?$/, '/')}student/${route}?oid=${encodeURIComponent(oid)}`;
  const completed = (item: StudyEntity) => {
    const state = item.studentResultCacheMap?.[uuIdentity]?.state;
    if (typeof state === 'boolean') return state;
    if (state === 'completed') return true;
    const children = ownSteps.filter(step => step.assignmentOid === item.oid || step.certificationExamOid === item.oid);
    return children.length > 0 && children.every(step => {
      const childState = step.studentResultCacheMap?.[uuIdentity]?.state;
      return typeof childState === 'string' && terminalStepStates.includes(childState);
    });
  };
  const resultState = (item: StudyEntity): string => {
    const own = item.studentResultCacheMap?.[uuIdentity]?.state;
    if (own !== undefined) return String(own);
    const states = ownSteps
      .filter(step => step.assignmentOid === item.oid || step.certificationExamOid === item.oid)
      .map(step => step.studentResultCacheMap?.[uuIdentity]?.state);
    if (states.includes('needsRevision')) return 'needsRevision';
    if (states.includes('readyForEvaluation')) return 'readyForEvaluation';
    if (states.length && states.every(state => state === 'completed')) return 'completed';
    if (states.includes('failed')) return 'failed';
    if (states.includes('notFinished')) return 'notFinished';
    return item.state ?? '';
  };
  const tasks: TaskItem[] = assignments.filter(belongsToStudent).map(item => ({
    id: `study_assignment_${item.oid}`,
    title: item.name,
    subjectId: item.studyGroupOid,
    subjectName: groupMap.get(item.studyGroupOid ?? '')?.name,
    dueDate: dateValue(item.toTs),
    isCompleted: completed(item),
    notes: cleanText(item.desc),
    source: 'unicorn',
    sourceUrl: sourceUrl('assignmentDetail', item.oid),
    sourceState: resultState(item),
  }));
  const exams: ExamItem[] = certifications.filter(belongsToStudent).map(item => ({
    id: `study_exam_${item.oid}`,
    title: item.name,
    subjectId: item.studyGroupOid,
    subjectName: groupMap.get(item.studyGroupOid ?? '')?.name ?? 'Předmět neuveden',
    date: dateValue(item.toTs),
    notes: cleanText(item.desc),
    source: 'unicorn',
    sourceUrl: sourceUrl('certificationExamDetail', item.oid),
    sourceState: resultState(item),
    isCompleted: completed(item),
  }));
  for (const step of ownSteps) {
    if (step.kind !== 'test') continue;
    // Certification exams already represent their test steps, so do not duplicate them.
    if (step.certificationExamOid && parents.has(step.certificationExamOid)) continue;
    const parent = parents.get(step.assignmentOid ?? '');
    const groupOid = step.studyGroupOid ?? parent?.studyGroupOid;
    const testDate = dateValue(step.toTs ?? parent?.toTs);
    if (!isDateInCurrentSemester(testDate)) continue;
    exams.push({
      id: `study_test_${step.oid}`,
      title: step.name,
      subjectId: groupOid,
      subjectName: groupMap.get(groupOid ?? '')?.name ?? 'Předmět neuveden',
      date: testDate,
      notes: cleanText(step.desc),
      source: 'unicorn',
      // Open the assignment overview, never start or submit a test from the app.
      sourceUrl: parent ? sourceUrl('assignmentDetail', parent.oid) : `${baseUri.replace(/\/?$/, '/')}student`,
      sourceState: resultState(step),
      isCompleted: completed(step),
    });
  }
  return { tasks, exams };
}

export async function fetchStudentStudyData(token: string, uuIdentity: string) {
  if (!uuIdentity) throw new Error('Přihlášenému účtu chybí uuIdentity.');
  const [assignments, certifications, steps, groups] = await Promise.all([
    listStudyEntities(token, uuIdentity, 'assignment/list'),
    listStudyEntities(token, uuIdentity, 'certificationExam/list'),
    listStudyEntities(token, uuIdentity, 'step/list'),
    listStudyEntities(token, uuIdentity, 'studyGroup/list'),
  ]);
  return mapStudyData(assignments, certifications, steps, groups, uuIdentity);
}
