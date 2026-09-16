export type AuditStep = {
  at: string;
  step: string;
  detail: string;
};

export function auditStep(step: string, detail: string): AuditStep {
  return { at: new Date().toISOString(), step, detail };
}

export function appendAudit(log: AuditStep[], step: string, detail: string) {
  log.push(auditStep(step, detail));
  return log;
}
