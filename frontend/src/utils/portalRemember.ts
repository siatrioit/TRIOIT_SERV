const STORAGE_KEY = 'trio-serv-portal-remember';

type RememberedLogin = {
  email: string;
  password: string;
};

export function loadRememberedLogin(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedLogin;
    if (!parsed.email || !parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRememberedLogin(email: string, password: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
}

export function clearRememberedLogin(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasRememberedLogin(): boolean {
  return loadRememberedLogin() !== null;
}
