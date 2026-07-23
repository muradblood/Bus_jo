const VISITOR_SESSION_KEY = 'visitor-session';

export function getOrCreateVisitorSessionId() {
  const existing = localStorage.getItem(VISITOR_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  localStorage.setItem(VISITOR_SESSION_KEY, sessionId);
  return sessionId;
}
