import { describe, it, expect, beforeEach } from 'vitest';
import {
  signup,
  login,
  logout,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  addWorkout,
  getWorkouts,
  deleteWorkout,
} from '../app/utils/auth';

beforeEach(() => {
  localStorage.clear();
});

describe('getStoredUser / setStoredUser / clearStoredUser', () => {
  it('returns null when nothing is stored', () => {
    expect(getStoredUser()).toBeNull();
  });

  it('round-trips a user through localStorage', () => {
    const user = { id: '1', email: 'a@b.com', name: 'Alice' };
    setStoredUser(user);
    expect(getStoredUser()).toEqual(user);
  });

  it('clearStoredUser removes the entry', () => {
    setStoredUser({ id: '1', email: 'a@b.com', name: 'Alice' });
    clearStoredUser();
    expect(getStoredUser()).toBeNull();
  });
});

describe('signup', () => {
  it('creates and returns a new user', () => {
    const user = signup('a@b.com', 'secret', 'Alice');
    expect(user).toMatchObject({ email: 'a@b.com', name: 'Alice' });
    expect(user.id).toBeTruthy();
  });

  it('persists the user as the stored session', () => {
    const user = signup('a@b.com', 'secret', 'Alice');
    expect(getStoredUser()).toEqual(user);
  });

  it('throws when the email is already registered', () => {
    signup('a@b.com', 'secret', 'Alice');
    expect(() => signup('a@b.com', 'other', 'Bob')).toThrow('User already exists');
  });
});

describe('login', () => {
  beforeEach(() => {
    signup('a@b.com', 'secret', 'Alice');
    clearStoredUser();
  });

  it('returns user when credentials are correct', () => {
    const user = login('a@b.com', 'secret');
    expect(user).toMatchObject({ email: 'a@b.com', name: 'Alice' });
  });

  it('does not expose password in returned user', () => {
    const user = login('a@b.com', 'secret') as any;
    expect(user.password).toBeUndefined();
  });

  it('sets the stored session on success', () => {
    login('a@b.com', 'secret');
    expect(getStoredUser()?.email).toBe('a@b.com');
  });

  it('throws on wrong password', () => {
    expect(() => login('a@b.com', 'wrong')).toThrow('Invalid email or password');
  });

  it('throws on unknown email', () => {
    expect(() => login('x@y.com', 'secret')).toThrow('Invalid email or password');
  });
});

describe('logout', () => {
  it('clears the stored session', () => {
    signup('a@b.com', 'secret', 'Alice');
    logout();
    expect(getStoredUser()).toBeNull();
  });
});

describe('addWorkout / getWorkouts / deleteWorkout', () => {
  const userId = 'user-1';
  const base = {
    userId,
    type: 'running' as const,
    date: '2026-06-09',
    duration: 30,
    distance: 3.1,
  };

  it('adds a workout and retrieves it', () => {
    const w = addWorkout(base);
    expect(w.id).toBeTruthy();
    expect(getWorkouts(userId)).toHaveLength(1);
    expect(getWorkouts(userId)[0]).toMatchObject(base);
  });

  it('only returns workouts for the given userId', () => {
    addWorkout(base);
    addWorkout({ ...base, userId: 'other-user' });
    expect(getWorkouts(userId)).toHaveLength(1);
  });

  it('deleteWorkout removes the workout', () => {
    const w = addWorkout(base);
    deleteWorkout(w.id);
    expect(getWorkouts(userId)).toHaveLength(0);
  });

  it('deleteWorkout is a no-op for unknown id', () => {
    addWorkout(base);
    deleteWorkout('nonexistent');
    expect(getWorkouts(userId)).toHaveLength(1);
  });
});
