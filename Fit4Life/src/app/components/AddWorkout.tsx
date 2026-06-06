import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addRuns } from '../utils/api';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface SessionForm {
  distanceMiles: string;
  durationMinutes: string;
}

export default function AddWorkout() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState<SessionForm[]>([{ distanceMiles: '', durationMinutes: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addSession = () => {
    setSessions([...sessions, { distanceMiles: '', durationMinutes: '' }]);
  };

  const removeSession = (i: number) => {
    setSessions(sessions.filter((_, idx) => idx !== i));
  };

  const updateSession = (i: number, field: keyof SessionForm, value: string) => {
    const updated = [...sessions];
    updated[i] = { ...updated[i], [field]: value };
    setSessions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = sessions.map(s => ({
      date,
      distanceMiles: parseFloat(s.distanceMiles),
      durationMinutes: parseFloat(s.durationMinutes),
    }));

    if (parsed.some(s => isNaN(s.distanceMiles) || isNaN(s.durationMinutes) || s.distanceMiles <= 0 || s.durationMinutes <= 0)) {
      setError('All sessions must have a valid distance and duration.');
      return;
    }

    setLoading(true);
    try {
      await addRuns(parsed);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sessions');
    } finally {
      setLoading(false);
    }
  };

  const paceLabel = (s: SessionForm) => {
    const dist = parseFloat(s.distanceMiles);
    const dur = parseFloat(s.durationMinutes);
    if (!dist || !dur || dist <= 0 || dur <= 0) return null;
    const paceMins = dur / dist;
    const paceM = Math.floor(paceMins);
    const paceS = Math.round((paceMins - paceM) * 60);
    return `${paceM}:${paceS.toString().padStart(2, '0')} /mi`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-background to-secondary/15">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-card rounded-xl shadow-lg p-8 border border-border/50 shadow-[0_0_40px_rgba(255,107,53,0.15)]">
          <h1 className="text-3xl font-bold mb-2">Log Run</h1>
          <p className="text-muted-foreground mb-6">Record one or more running sessions for a day</p>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-2">Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sessions</label>
                <span className="text-xs text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
              </div>

              {sessions.map((session, i) => {
                const pace = paceLabel(session);
                return (
                  <div key={i} className="bg-muted/30 p-4 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground">Session {i + 1}</span>
                      <div className="flex items-center gap-3">
                        {pace && (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {pace}
                          </span>
                        )}
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSession(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Distance (miles)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={session.distanceMiles}
                          onChange={(e) => updateSession(i, 'distanceMiles', e.target.value)}
                          placeholder="e.g. 3.1"
                          className="w-full px-3 py-2 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Duration (minutes)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={session.durationMinutes}
                          onChange={(e) => updateSession(i, 'durationMinutes', e.target.value)}
                          placeholder="e.g. 30"
                          className="w-full px-3 py-2 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addSession}
                className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Another Session
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-60 shadow-[0_0_20px_rgba(255,0,128,0.4)] hover:shadow-[0_0_30px_rgba(255,0,128,0.6)]"
            >
              {loading ? 'Saving…' : `Save ${sessions.length > 1 ? `${sessions.length} Sessions` : 'Session'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
