/**
 * Tests for src/app/utils/api.ts
 * Covers signUp, signIn, signOut, getSession, getRuns, addRuns, deleteRun.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signUp, signIn, signOut, getSession,
  getRuns, addRuns, deleteRun,
} from '../app/utils/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:8000/api';
const TOKEN_KEY = 'fit4life_token';
const USER_KEY  = 'fit4life_user';

/** Build a minimal (unsigned) JWT with the given payload. */
function makeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.fake`;
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

const MOCK_USER   = { id: '1', email: 'test@example.com', name: 'Test User' };
const MOCK_TOKEN  = makeJwt({ sub: '1', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) + 3600 });
const MOCK_RUN    = { id: '10', userId: '1', date: '2024-03-01', distanceMiles: 3.1, durationMinutes: 30, createdAt: '2024-03-01T12:00:00' };

// ── signUp ───────────────────────────────────────────────────────────────────

describe('signUp', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends POST to /auth/signup with email, password, and name', async () => {
    const fetch = mockFetch({ ok: true, data: { user: MOCK_USER } });
    vi.stubGlobal('fetch', fetch);
    await signUp('test@example.com', 'password1', 'Test User');
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/auth/signup`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ email: 'test@example.com', password: 'password1', name: 'Test User' });
  });

  it('returns the user object from the response data', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { user: MOCK_USER } }));
    const user = await signUp('test@example.com', 'password1', 'Test User');
    expect(user).toEqual(MOCK_USER);
  });

  it('throws when the server returns ok=false', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, error: { code: 'SIGNUP_FAILED', message: 'Email already registered' } }, 409));
    await expect(signUp('dup@example.com', 'password1', 'Dup')).rejects.toThrow('Email already registered');
  });
});

// ── signIn ───────────────────────────────────────────────────────────────────

describe('signIn', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('sends POST to /auth/signin with email and password', async () => {
    const fetch = mockFetch({ ok: true, data: { token: MOCK_TOKEN, user: MOCK_USER } });
    vi.stubGlobal('fetch', fetch);
    await signIn('test@example.com', 'password1');
    expect(fetch).toHaveBeenCalledWith(`${BASE}/auth/signin`, expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ email: 'test@example.com', password: 'password1' });
  });

  it('stores the token in localStorage after a successful sign-in', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { token: MOCK_TOKEN, user: MOCK_USER } }));
    await signIn('test@example.com', 'password1');
    expect(localStorage.getItem(TOKEN_KEY)).toBe(MOCK_TOKEN);
  });

  it('stores the user JSON in localStorage after a successful sign-in', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { token: MOCK_TOKEN, user: MOCK_USER } }));
    await signIn('test@example.com', 'password1');
    expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual(MOCK_USER);
  });

  it('returns the user object from the response data', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { token: MOCK_TOKEN, user: MOCK_USER } }));
    const user = await signIn('test@example.com', 'password1');
    expect(user).toEqual(MOCK_USER);
  });

  it('throws when the server returns ok=false', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, error: { code: 'AUTH_ERROR', message: 'Invalid email or password' } }, 401));
    await expect(signIn('bad@example.com', 'wrong')).rejects.toThrow('Invalid email or password');
  });
});

// ── signOut ──────────────────────────────────────────────────────────────────

describe('signOut', () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, MOCK_TOKEN);
    localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER));
  });
  afterEach(() => localStorage.clear());

  it('removes the token from localStorage', async () => {
    await signOut();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('removes the user from localStorage', async () => {
    await signOut();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});

// ── getSession ───────────────────────────────────────────────────────────────

describe('getSession', () => {
  afterEach(() => localStorage.clear());

  it('returns null when no token is in localStorage', async () => {
    expect(await getSession()).toBeNull();
  });

  it('returns null when token is present but user JSON is missing', async () => {
    localStorage.setItem(TOKEN_KEY, MOCK_TOKEN);
    expect(await getSession()).toBeNull();
  });

  it('returns the session when a valid non-expired token and user are stored', async () => {
    localStorage.setItem(TOKEN_KEY, MOCK_TOKEN);
    localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER));
    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session!.user).toEqual(MOCK_USER);
    expect(session!.access_token).toBe(MOCK_TOKEN);
  });

  it('returns null and clears storage when the token is expired', async () => {
    const expiredToken = makeJwt({ sub: '1', email: 'test@example.com', exp: 1 });
    localStorage.setItem(TOKEN_KEY, expiredToken);
    localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER));
    expect(await getSession()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

// ── getRuns ──────────────────────────────────────────────────────────────────

describe('getRuns', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, MOCK_TOKEN));
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('sends GET to /runs with an Authorization header', async () => {
    const fetch = mockFetch({ ok: true, data: { runs: [MOCK_RUN] } });
    vi.stubGlobal('fetch', fetch);
    await getRuns();
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/runs`);
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${MOCK_TOKEN}`);
  });

  it('returns the parsed runs array from the response', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { runs: [MOCK_RUN] } }));
    const runs = await getRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toEqual(MOCK_RUN);
  });

  it('returns an empty array when the server returns an empty runs list', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { runs: [] } }));
    expect(await getRuns()).toEqual([]);
  });
});

// ── addRuns ──────────────────────────────────────────────────────────────────

describe('addRuns', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, MOCK_TOKEN));
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  const SESSION = { date: '2024-03-01', distanceMiles: 3.1, durationMinutes: 30 };

  it('sends POST to /runs with the sessions array in the body', async () => {
    const fetch = mockFetch({ ok: true, data: { runs: [MOCK_RUN] } });
    vi.stubGlobal('fetch', fetch);
    await addRuns([SESSION]);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/runs`);
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init.body as string))).toEqual({ sessions: [SESSION] });
  });

  it('returns the array of created RunSession objects', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { runs: [MOCK_RUN] } }));
    const runs = await addRuns([SESSION]);
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('10');
  });
});

// ── deleteRun ────────────────────────────────────────────────────────────────

describe('deleteRun', () => {
  beforeEach(() => localStorage.setItem(TOKEN_KEY, MOCK_TOKEN));
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('sends DELETE to /runs/:id with an Authorization header', async () => {
    const fetch = mockFetch({ ok: true, data: { deleted: true } });
    vi.stubGlobal('fetch', fetch);
    await deleteRun('10');
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/runs/10`);
    expect((init as RequestInit).method).toBe('DELETE');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${MOCK_TOKEN}`);
  });

  it('resolves without throwing when the server confirms deletion', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, data: { deleted: true } }));
    await expect(deleteRun('10')).resolves.toBeUndefined();
  });

  it('throws when the server returns an error response', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } }, 404));
    await expect(deleteRun('99999')).rejects.toThrow('Run not found');
  });
});
