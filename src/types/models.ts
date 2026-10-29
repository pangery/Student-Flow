export type Subject = {
  id: string;
  name: string;
  weekday: number;
  date?: string;
  startMinutes: number;
  endMinutes: number;
  location?: string;
  code?: string;
  teacher?: string;
};

export type SchoolSource = {
  source?: 'unicorn';
  sourceUrl?: string;
  sourceState?: string;
};

export type TaskItem = SchoolSource & {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  subjectId?: string;
  subjectName?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
};

export type ExamChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type ExamItem = SchoolSource & {
  isCompleted?: boolean;
  id: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  date: string;
  location?: string;
  notes?: string;
  checklist?: ExamChecklistItem[];
};

export type StudentData = {
  subjects: Subject[];
  tasks: TaskItem[];
  examDate?: string;
  exams?: ExamItem[];
  studentName?: string;
  uuIdentity?: string;
  lastSyncedAt?: string;
};

export type TextbookChapter = {
  id: string;
  title: string;
  order: number;
  readTimeMinutes: number;
  summary: string;
  sections: {
    heading: string;
    body: string;
    codeSnippet?: string;
    tip?: string;
  }[];
};

export type Textbook = {
  id: string;
  subjectId: string;
  subjectName: string;
  code: string;
  title: string;
  author: string;
  version: string;
  updatedAt: string;
  sizeKb: number;
  chapters: TextbookChapter[];
};

export type CachedTextbookMeta = {
  textbookId: string;
  cachedAt: string;
  sizeKb: number;
  version: string;
};

