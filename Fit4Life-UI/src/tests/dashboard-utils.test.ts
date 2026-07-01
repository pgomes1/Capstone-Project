/**
 * Tests for src/app/utils/dashboard-utils.ts
 * Covers groupByDay, filterByRange, formatPace, formatDuration.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  groupByDay, filterByRange, formatPace, formatDuration,
  type Range,
} from '../app/utils/dashboard-utils';
import type { RunSession } from '../app/utils/api';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function run(id: string, date: string, dist: number, dur: number): RunSession {
  return { id, userId: '1', date, distanceMiles: dist, durationMinutes: dur, createdAt: `${date}T00:00:00` };
}

// ── groupByDay ────────────────────────────────────────────────────────────────

describe('groupByDay', () => {
  it('returns an empty array when given no runs', () => {
    expect(groupByDay([])).toEqual([]);
  });

  it('returns one DayData entry per unique date', () => {
    const runs = [run('1', '2024-03-01', 3.0, 30), run('2', '2024-03-02', 5.0, 50)];
    expect(groupByDay(runs)).toHaveLength(2);
  });

  it('groups multiple runs on the same date into one entry', () => {
    const runs = [run('1', '2024-03-01', 3.0, 30), run('2', '2024-03-01', 2.0, 20)];
    const result = groupByDay(runs);
    expect(result).toHaveLength(1);
    expect(result[0].sessionCount).toBe(2);
  });

  it('calculates the average distance for a day with two runs', () => {
    const runs = [run('1', '2024-03-01', 4.0, 40), run('2', '2024-03-01', 2.0, 20)];
    const result = groupByDay(runs);
    expect(result[0].avgDistanceMiles).toBeCloseTo(3.0);
  });

  it('calculates the average duration for a day with two runs', () => {
    const runs = [run('1', '2024-03-01', 3.0, 30), run('2', '2024-03-01', 3.0, 60)];
    const result = groupByDay(runs);
    expect(result[0].avgDurationMinutes).toBeCloseTo(45.0);
  });

  it('calculates average pace as avgDuration / avgDistance', () => {
    const runs = [run('1', '2024-03-01', 4.0, 40)];
    const result = groupByDay(runs);
    expect(result[0].avgPaceMinPerMile).toBeCloseTo(10.0);
  });

  it('sorts entries by date ascending (oldest first)', () => {
    const runs = [run('1', '2024-03-03', 3.0, 30), run('2', '2024-01-01', 5.0, 50)];
    const result = groupByDay(runs);
    expect(result[0].date).toBe('2024-01-01');
    expect(result[1].date).toBe('2024-03-03');
  });
});

// ── filterByRange ─────────────────────────────────────────────────────────────

describe('filterByRange', () => {
  afterEach(() => vi.useRealTimers());

  it("returns all entries when range is 'all'", () => {
    const days = [
      { date: '2020-01-01', label: 'Jan 1', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
      { date: '2024-03-01', label: 'Mar 1', avgDistanceMiles: 3, avgPaceMinPerMile: 10, avgDurationMinutes: 30, sessionCount: 1 },
    ];
    expect(filterByRange(days, 'all')).toHaveLength(2);
  });

  it("keeps only entries within the last 7 days for range 'week'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-10'));
    const days = [
      { date: '2024-03-04', label: '', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
      { date: '2024-02-01', label: '', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
    ];
    const result = filterByRange(days, 'week');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-03-04');
  });

  it("keeps only entries within the last 30 days for range 'month'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-10'));
    const days = [
      { date: '2024-03-01', label: '', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
      { date: '2024-01-01', label: '', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
    ];
    const result = filterByRange(days, 'month');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-03-01');
  });

  it("keeps only entries within the last year for range 'year'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01'));
    const days = [
      { date: '2024-01-01', label: '', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
      { date: '2022-06-01', label: '', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
    ];
    const result = filterByRange(days, 'year');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-01');
  });

  it('returns an empty array when no entries fall within the range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-10'));
    const days = [
      { date: '2020-01-01', label: '', avgDistanceMiles: 1, avgPaceMinPerMile: 10, avgDurationMinutes: 10, sessionCount: 1 },
    ];
    expect(filterByRange(days, 'week')).toHaveLength(0);
  });
});

// ── formatPace ────────────────────────────────────────────────────────────────

describe('formatPace', () => {
  it("returns '—' for a pace of 0", () => {
    expect(formatPace(0)).toBe('—');
  });

  it("returns '—' for a negative pace", () => {
    expect(formatPace(-1)).toBe('—');
  });

  it('formats an exact integer pace correctly', () => {
    expect(formatPace(10)).toBe('10:00');
  });

  it('formats a pace with a fractional second component correctly', () => {
    expect(formatPace(10.5)).toBe('10:30');
  });

  it('pads the seconds field with a leading zero when seconds < 10', () => {
    expect(formatPace(9 + 5 / 60)).toBe('9:05');
  });
});

// ── formatDuration ────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats durations under 60 minutes as whole minutes with an "m" suffix', () => {
    expect(formatDuration(30)).toBe('30m');
  });

  it('rounds sub-minute durations to the nearest minute', () => {
    expect(formatDuration(29.6)).toBe('30m');
  });

  it('formats exactly 60 minutes as "1h"', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('formats 90 minutes as "1h 30m"', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('formats 120 minutes as "2h" with no minute component', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats 135 minutes as "2h 15m"', () => {
    expect(formatDuration(135)).toBe('2h 15m');
  });
});
