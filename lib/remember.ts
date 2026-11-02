// "Remember me" off: the session should end with the browser. The sign-in page writes these; the app's sidebar signs
// out a session that was not remembered once the browser has been closed (sessionStorage is gone, localStorage says no).
export const REMEMBER_KEY = 'animave-remember';
export const ALIVE_KEY = 'animave-alive';

export function forgottenSession(): boolean {
  try { return localStorage.getItem(REMEMBER_KEY) === '0' && !sessionStorage.getItem(ALIVE_KEY); } catch { return false; }
}
