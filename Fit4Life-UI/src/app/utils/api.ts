const SERVER =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://localhost:8000/api';

const TOKEN_KEY = 'fit4life_token';
const USER_KEY = 'fit4life_user';

export interface RunSession {
  id: string;
  userId: string;
  date: string;
  distanceMiles: number;
  durationMinutes: number;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface ErrorEnvelope {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

interface SuccessEnvelope<T> {
  ok: true;
  data: T;
}

type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parse<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok || body.ok === false) {
    const msg =
      body.ok === false
        ? body.error?.message ?? fallback
        : fallback;
    throw new Error(msg);
  }
  return body.data;
}

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<SessionUser> {
  const res = await fetch(`${SERVER}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await parse<{ user: SessionUser }>(res, 'Signup failed');
  return data.user;
}

export async function signIn(
  email: string,
  password: string,
): Promise<SessionUser> {
  const res = await fetch(`${SERVER}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parse<{ token: string; user: SessionUser }>(
    res,
    'Login failed',
  );
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function decodeJwtExp(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

export interface Session {
  user: SessionUser;
  access_token: string;
}

export async function getSession(): Promise<Session | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  const userJson = localStorage.getItem(USER_KEY);
  if (!token || !userJson) return null;
  const exp = decodeJwtExp(token);
  if (exp && exp * 1000 < Date.now()) {
    await signOut();
    return null;
  }
  try {
    const user = JSON.parse(userJson) as SessionUser;
    return { user, access_token: token };
  } catch {
    await signOut();
    return null;
  }
}

export async function getRuns(): Promise<RunSession[]> {
  const res = await fetch(`${SERVER}/runs`, { headers: authHeaders() });
  const data = await parse<{ runs: RunSession[] }>(res, 'Failed to fetch runs');
  return data.runs ?? [];
}

export async function addRuns(
  sessions: Array<{ date: string; distanceMiles: number; durationMinutes: number }>,
): Promise<RunSession[]> {
  const res = await fetch(`${SERVER}/runs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sessions }),
  });
  const data = await parse<{ runs: RunSession[] }>(res, 'Failed to add runs');
  return data.runs ?? [];
}

export async function deleteRun(id: string): Promise<void> {
  const res = await fetch(`${SERVER}/runs/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parse<{ deleted: boolean }>(res, 'Failed to delete run');
}
