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
  if (!name) return 'Předmět';
  return name
    .replace(/\s*-\s*\d{4}\s+(zima|léto|ZS|LS).*$/i, '')
    .replace(/\s*-\s*\d{4}.*$/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}
