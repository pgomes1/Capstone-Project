/**
 * End-to-end workflow test: renders the full app (routing + Signup,
 * Dashboard, AddWorkout, Login components together) and drives a real user
 * journey by simulating clicks/typing, with only the network boundary
 * (global fetch) mocked. Unlike src/tests/api.test.ts, which unit-tests each
 * api.ts function in isolation, this exercises the components and router
 * wiring that consume them.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

const TOKEN_KEY = 'fit4life_token';

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.fake`;
}

const USER = { id: '1', email: 'alice@example.com', name: 'Alice' };
const TOKEN = makeJwt({ sub: '1', email: 'alice@example.com', exp: Math.floor(Date.now() / 1000) + 3600 });

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('full user workflow: signup -> log a run -> see it -> log out', () => {
  let runs: Array<Record<string, unknown>>;

  beforeEach(() => {
    localStorage.clear();
    runs = [];
    window.history.pushState({}, '', '/signup');
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET';
        const path = url.replace('http://localhost:8000/api', '');

        if (path === '/auth/signup' && method === 'POST') {
          return jsonResponse({ ok: true, data: { user: USER } });
        }
        if (path === '/auth/signin' && method === 'POST') {
          return jsonResponse({ ok: true, data: { token: TOKEN, user: USER } });
        }
        if (path === '/runs' && method === 'GET') {
          return jsonResponse({ ok: true, data: { runs: [...runs] } });
        }
        if (path === '/runs' && method === 'POST') {
          const body = JSON.parse(init!.body as string) as {
            sessions: Array<{ date: string; distanceMiles: number; durationMinutes: number }>;
          };
          const created = body.sessions.map((s, i) => ({
            id: String(runs.length + i + 1),
            userId: USER.id,
            date: s.date,
            distanceMiles: s.distanceMiles,
            durationMinutes: s.durationMinutes,
            createdAt: new Date().toISOString(),
          }));
          runs.push(...created);
          return jsonResponse({ ok: true, data: { runs: created } });
        }
        throw new Error(`Unhandled fetch in workflow test: ${method} ${path}`);
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('signs up, logs a run, sees it on the dashboard, then logs out', async () => {
    const user = userEvent.setup();
    render(<App />);

    // ── Sign up ──
    expect(await screen.findByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Full Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    // ── Lands on the (empty) dashboard, session persisted ──
    expect(await screen.findByText(/No runs yet/i)).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBe(TOKEN);

    // ── Log the first run ──
    await user.click(screen.getByRole('button', { name: /Log Your First Run/i }));
    expect(await screen.findByRole('heading', { name: 'Log Run' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('e.g. 3.1'), '3.1');
    await user.type(screen.getByPlaceholderText('e.g. 30'), '30');
    await user.click(screen.getByRole('button', { name: /Save Session/i }));

    // ── Back on the dashboard, the run now shows in history and stats ──
    await waitFor(() => expect(screen.getByText(/3\.10 mi/)).toBeInTheDocument());
    expect(screen.getByText('1')).toBeInTheDocument(); // Total Sessions stat

    // ── Log out ──
    await user.click(screen.getByRole('button', { name: /Logout/i }));
    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
