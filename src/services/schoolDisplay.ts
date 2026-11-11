export function schoolStateLabel(state?: string): string {
  const labels: Record<string, string> = {
    completed: 'Splněno', readyForEvaluation: 'Čeká na hodnocení',
    needsRevision: 'Vráceno k opravě', failed: 'Neúspěšný pokus',
    notStarted: 'Nezahájeno', notFinished: 'Rozpracováno', assigned: 'Zadáno',
    closed: 'Uzavřeno', true: 'Splněno', false: 'Nesplněno',
  };
  return (state && (labels[state] ?? state)) || 'Stav neuveden';
}

export function deadlineLabel(value: string): string {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
    : 'Termín neuveden';
}

export function cleanSubjectName(name?: string): string {
  if (!name || !name.trim()) return 'Předmět';
  let cleaned = name.trim();

  // 1. Odstranění předpon typů výuky (např. "Přednáška: ", "Cvičení - ", "Seminář - ")
  cleaned = cleaned.replace(
    /^(?:přednáška|prednaska|cvičení|cviceni|seminář|seminar|konzultace|workshop)\s*[:\-\/–—]\s*/i,
    ''
  );

  // 2. Odstranění ročníků a semestrů (např. " - 2024/2025 ZS", " - 2026 LS", " - ZS 2025/2026")
  cleaned = cleaned.replace(/\s*-\s*\d{4}\s*(?:\/|\-)\s*\d{4}.*$/i, '');
  cleaned = cleaned.replace(/\s*-\s*\d{4}\s+(?:zima|léto|leto|ZS|LS).*$/i, '');
  cleaned = cleaned.replace(/\s*-\s*\d{4}.*$/i, '');
  cleaned = cleaned.replace(/\s*-\s*(?:ZS|LS)\s*\d{2,4}.*$/i, '');

  // 3. Odstranění přípon výuky (např. " - přednáška", " - cvičení 1", " / cvičení", " - seminář")
  cleaned = cleaned.replace(
    /\s*(?:[-–—\/]|,)\s*(?:přednáška|prednaska|cvičení|cviceni|seminář|seminar|konzultace|workshop|lecture|lab)(?:\s+\d+)?\s*$/i,
    ''
  );

  // 4. Odstranění závorek na konci (např. "(Přednáška)", "(Cvičení)", "(P301)", "(Online)", "(ZS 2025)")
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');

  // 5. Odstranění přebytečných oddělovačů na konci
  cleaned = cleaned.replace(/[\s\-\/–—]+$/, '').trim();

  return cleaned || 'Předmět';
}

export function isRealExamOrTest(item: {
  title?: string;
  examType?: string;
  isDistanceExam?: boolean;
  location?: string;
  checklist?: unknown[];
}): boolean {
  if (
    item.examType === 'certification' ||
    item.examType === 'test' ||
    item.examType === 'oral' ||
    item.examType === 'distance'
  ) {
    return true;
  }
  if (item.isDistanceExam) return true;
  const t = (item.title || '').toLowerCase();
  const isSelfStudy = /^(samostudium|domácí úkol|cvičení|assignment)/i.test(t);
  const hasExamKeyword = /(zkoušk|zkousk|test|zápoč|zapoc|předtermín|predtermin|obhajob|exam|certifik|kolokv)/i.test(t);
  if (isSelfStudy && !hasExamKeyword) return false;
  return hasExamKeyword || Boolean(item.location) || Boolean(item.checklist?.length);
}

export function isPureTask(item: {
  title?: string;
  examType?: string;
  isDistanceExam?: boolean;
}): boolean {
  if (item.isDistanceExam) return false;
  if (
    item.examType === 'certification' ||
    item.examType === 'test' ||
    item.examType === 'oral' ||
    item.examType === 'distance'
  ) {
    return false;
  }
  const t = (item.title || '').toLowerCase();
  if (/(zkoušk|zkousk|předtermín|predtermin|obhajob|certifik|kolokv)/i.test(t)) {
    return false;
  }
  if (/(?:^|\b|\s|_|-)(?:test|exam)(?:$|\b|\s|_|-)/i.test(t)) {
    return false;
  }
  if (/zápočtov[ýáé]/i.test(t)) {
    return false;
  }
  return true;
}
