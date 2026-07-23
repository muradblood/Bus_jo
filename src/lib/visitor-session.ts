const VISITOR_SESSION_KEY = 'visitor-session';

export function getOrCreateVisitorSessionId() {
  const existing = localStorage.getItem(VISITOR_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const randomPart = typeof crypto !== 'undefined'
    ? typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((value) => value.toString(16).padStart(2, '0'))
          .join('')
    : `${Date.now().toString(16)}${performance.now().toString(16).replace('.', '')}`;
  const sessionId = `sess_${Date.now()}_${randomPart}`;
  localStorage.setItem(VISITOR_SESSION_KEY, sessionId);
  return sessionId;
}
