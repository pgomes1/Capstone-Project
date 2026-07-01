import type { RunSession } from './api';

export type Range = 'week' | 'month' | 'year' | 'all';

export interface DayData {
  date: string;
  label: string;
  avgDistanceMiles: number;
  avgPaceMinPerMile: number;
  avgDurationMinutes: number;
  sessionCount: number;
}

export function groupByDay(runs: RunSession[]): DayData[] {
  const map = new Map<string, RunSession[]>();
  for (const r of runs) {
    const key = r.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => {
      const avgDist = sessions.reduce((s, r) => s + r.distanceMiles, 0) / sessions.length;
      const avgDur  = sessions.reduce((s, r) => s + r.durationMinutes, 0) / sessions.length;
      const avgPace = avgDist > 0 ? avgDur / avgDist : 0;
      const [y, m, d] = date.split('-');
      const label = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return { date, label, avgDistanceMiles: avgDist, avgPaceMinPerMile: avgPace, avgDurationMinutes: avgDur, sessionCount: sessions.length };
    });
}

export function filterByRange(days: DayData[], range: Range): DayData[] {
  if (range === 'all') return days;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === 'week')  cutoff.setDate(now.getDate() - 7);
  else if (range === 'month') cutoff.setMonth(now.getMonth() - 1);
  else if (range === 'year')  cutoff.setFullYear(now.getFullYear() - 1);
  return days.filter(d => new Date(d.date) >= cutoff);
}

export function formatPace(minPerMile: number): string {
  if (!minPerMile || minPerMile <= 0) return '—';
  const m = Math.floor(minPerMile);
  const s = Math.round((minPerMile - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
