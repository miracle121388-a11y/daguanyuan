// Site access pass only. Provider API keys always remain on the server.
export const ACCESS_KEY = 'daguanyuan.access.v1';
export function savedAccess() { try { return localStorage.getItem(ACCESS_KEY) ?? ''; } catch { return ''; } }
export function rememberAccess(token: string) {
  try { if (token) localStorage.setItem(ACCESS_KEY, token); else localStorage.removeItem(ACCESS_KEY); return true; } catch { return false; }
}
export async function verifyAccess(token: string, signal?: AbortSignal) {
  const response = await fetch('/api/simulation/access', {headers: {Authorization: `Bearer ${token}`}, signal});
  const result = await response.json();
  if (!response.ok || result.authorized !== true) throw new Error(result.error || '暂时无法验证口令，请重试。');
}
