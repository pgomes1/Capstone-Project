import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRuns, deleteRun, signOut, getSession, type RunSession } from '../utils/api';
import { Plus, LogOut, Activity, Trash2, Calendar, Clock, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

type Range = 'week' | 'month' | 'year' | 'all';

interface DayData {
  date: string;
  label: string;
  avgDistanceMiles: number;
  avgPaceMinPerMile: number;
  avgDurationMinutes: number;
  sessionCount: number;
}

function groupByDay(runs: RunSession[]): DayData[] {
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
      const avgDur = sessions.reduce((s, r) => s + r.durationMinutes, 0) / sessions.length;
      const avgPace = avgDist > 0 ? avgDur / avgDist : 0;
      const [y, m, d] = date.split('-');
      const label = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date, label, avgDistanceMiles: avgDist, avgPaceMinPerMile: avgPace, avgDurationMinutes: avgDur, sessionCount: sessions.length };
    });
}

function filterByRange(days: DayData[], range: Range): DayData[] {
  if (range === 'all') return days;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === 'week') cutoff.setDate(now.getDate() - 7);
  else if (range === 'month') cutoff.setMonth(now.getMonth() - 1);
  else if (range === 'year') cutoff.setFullYear(now.getFullYear() - 1);
  return days.filter(d => new Date(d.date) >= cutoff);
}

function formatPace(minPerMile: number): string {
  if (!minPerMile || minPerMile <= 0) return '—';
  const m = Math.floor(minPerMile);
  const s = Math.round((minPerMile - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('month');
  const [userName, setUserName] = useState('');
  const [chartMetric, setChartMetric] = useState<'distance' | 'pace'>('distance');

  const loadRuns = useCallback(async () => {
    try {
      const data = await getRuns();
      setRuns(data);
    } catch (e) {
      console.error('Failed to load runs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSession().then(session => {
      if (!session) { navigate('/login'); return; }
      setUserName(session.user.user_metadata?.name ?? session.user.email ?? '');
      loadRuns();
    });
  }, [navigate, loadRuns]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this run session?')) return;
    try {
      await deleteRun(id);
      setRuns(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Failed to delete run:', e);
    }
  };

  const allDays = groupByDay(runs);
  const filteredDays = filterByRange(allDays, range);

  const totalSessions = runs.length;
  const totalDistance = runs.reduce((s, r) => s + r.distanceMiles, 0);
  const totalDuration = runs.reduce((s, r) => s + r.durationMinutes, 0);
  const overallPace = totalDistance > 0 ? totalDuration / totalDistance : 0;

  const chartData = filteredDays.map(d => ({
    label: d.label,
    distance: parseFloat(d.avgDistanceMiles.toFixed(2)),
    pace: parseFloat(d.avgPaceMinPerMile.toFixed(2)),
    paceLabel: formatPace(d.avgPaceMinPerMile),
  }));

  const sortedRuns = [...runs].sort((a, b) => b.date.localeCompare(a.date));

  const groupedByDate = sortedRuns.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {} as Record<string, RunSession[]>);

  const rangeLabels: Record<Range, string> = { week: '7 Days', month: '30 Days', year: '1 Year', all: 'All Time' };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/15 via-background to-secondary/15">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-background to-secondary/15">
      {/* Nav */}
      <nav className="bg-card border-b border-border/50 shadow-[0_4px_20px_rgba(255,0,128,0.1)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Fit4Life</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {userName ? `Welcome, ${userName.split(' ')[0]}!` : ''}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Your running history and progress</p>
          </div>
          <button
            onClick={() => navigate('/add-workout')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(255,0,128,0.4)] hover:shadow-[0_0_30px_rgba(255,0,128,0.6)]"
          >
            <Plus className="w-4 h-4" />
            Log Run
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Sessions', value: totalSessions.toString(), icon: Activity, color: 'from-primary to-primary/80', shadow: 'shadow-[0_0_20px_rgba(255,0,128,0.3)]' },
            { label: 'Total Distance', value: `${totalDistance.toFixed(1)} mi`, icon: TrendingUp, color: 'from-secondary to-secondary/80', shadow: 'shadow-[0_0_20px_rgba(0,217,255,0.3)]' },
            { label: 'Total Time', value: formatDuration(totalDuration), icon: Clock, color: 'from-accent to-accent/80', shadow: 'shadow-[0_0_20px_rgba(255,107,53,0.3)]' },
            { label: 'Avg Pace', value: `${formatPace(overallPace)} /mi`, icon: Calendar, color: 'from-chart-5 to-chart-5/80', shadow: 'shadow-[0_0_20px_rgba(0,255,136,0.3)]' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} ${stat.shadow} text-white rounded-xl p-5`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium opacity-90">{stat.label}</span>
                <stat.icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        {allDays.length > 0 && (
          <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50 shadow-[0_0_30px_rgba(255,0,128,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Progress Over Time</h3>
                <div className="flex gap-1">
                  {(['distance', 'pace'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setChartMetric(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        chartMetric === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m === 'distance' ? 'Distance' : 'Pace'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {(['week', 'month', 'year', 'all'] as Range[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      range === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {rangeLabels[r]}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No data for this range
              </div>
            ) : chartMetric === 'distance' ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff0080" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff0080" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" mi" />
                  <Tooltip formatter={(v: number) => [`${v} mi`, 'Avg Distance']} />
                  <Area type="monotone" dataKey="distance" stroke="#ff0080" fill="url(#distGrad)" strokeWidth={3} dot={{ r: 4, fill: '#ff0080' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.floor(v)}:${Math.round((v % 1) * 60).toString().padStart(2, '0')}`} domain={['auto', 'auto']} />
                  <Tooltip formatter={(_: number, __: string, props: any) => [props.payload?.paceLabel + ' /mi', 'Avg Pace']} />
                  <Line type="monotone" dataKey="pace" stroke="#00d9ff" strokeWidth={3} dot={{ r: 4, fill: '#00d9ff' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Run history */}
        <div className="bg-card rounded-xl shadow-lg border border-border/50 overflow-hidden shadow-[0_0_30px_rgba(0,217,255,0.1)]">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Run History</h3>
          </div>

          {runs.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">No runs yet — lace up and get going!</p>
              <button
                onClick={() => navigate('/add-workout')}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(255,0,128,0.4)] hover:shadow-[0_0_30px_rgba(255,0,128,0.6)]"
              >
                Log Your First Run
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(groupedByDate).map(([date, daySessions]) => {
                const [y, m, d] = date.split('-');
                const dateLabel = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                });
                const dayTotal = daySessions.reduce((s, r) => ({ dist: s.dist + r.distanceMiles, dur: s.dur + r.durationMinutes }), { dist: 0, dur: 0 });

                return (
                  <div key={date} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{dateLabel}</span>
                      </div>
                      {daySessions.length > 1 && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {daySessions.length} sessions · {dayTotal.dist.toFixed(1)} mi total
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {daySessions.map((run, idx) => {
                        const pace = run.distanceMiles > 0 ? run.durationMinutes / run.distanceMiles : 0;
                        return (
                          <div key={run.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              {daySessions.length > 1 && (
                                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                              )}
                              <span className="flex items-center gap-1.5 font-medium">
                                <Activity className="w-3.5 h-3.5 text-primary" />
                                {run.distanceMiles.toFixed(2)} mi
                              </span>
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuration(run.durationMinutes)}
                              </span>
                              <span className="text-muted-foreground">
                                {formatPace(pace)} /mi
                              </span>
                            </div>
                            <button
                              onClick={() => handleDelete(run.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-3 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
