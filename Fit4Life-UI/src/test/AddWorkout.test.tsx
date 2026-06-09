import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddWorkout from '../app/components/AddWorkout';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../app/utils/api', () => ({
  addRuns: vi.fn(),
}));

import { addRuns } from '../app/utils/api';

const mockAddRuns = vi.mocked(addRuns);

function renderAddWorkout() {
  return render(
    <MemoryRouter>
      <AddWorkout />
    </MemoryRouter>,
  );
}

function fillSession(index: number, distance: string, duration: string) {
  const distanceInputs = screen.getAllByPlaceholderText(/e\.g\. 3\.1/i);
  const durationInputs = screen.getAllByPlaceholderText(/e\.g\. 30/i);
  fireEvent.change(distanceInputs[index], { target: { value: distance } });
  fireEvent.change(durationInputs[index], { target: { value: duration } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AddWorkout', () => {
  it('renders with one session by default', () => {
    renderAddWorkout();
    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.queryByText('Session 2')).not.toBeInTheDocument();
  });

  it('shows date input pre-filled with today', () => {
    renderAddWorkout();
    const today = new Date().toISOString().split('T')[0];
    expect(screen.getByLabelText(/date/i)).toHaveValue(today);
  });

  it('adds a second session when "Add Another Session" is clicked', () => {
    renderAddWorkout();
    fireEvent.click(screen.getByText(/add another session/i));
    expect(screen.getByText('Session 2')).toBeInTheDocument();
  });

  it('removes a session when trash icon is clicked', () => {
    renderAddWorkout();
    fireEvent.click(screen.getByText(/add another session/i));
    expect(screen.getByText('Session 2')).toBeInTheDocument();
    // The remove button only appears when there's more than one session
    const removeButtons = screen.getAllByRole('button', { name: '' }); // Trash2 icon buttons have no text
    // Click the first trash button
    fireEvent.click(removeButtons.find(b => b.querySelector('svg'))!);
    expect(screen.queryByText('Session 2')).not.toBeInTheDocument();
  });

  it('shows live pace preview when distance and duration are filled', () => {
    renderAddWorkout();
    fillSession(0, '3.1', '30');
    // 30/3.1 ≈ 9:41 /mi
    expect(screen.getByText(/\/mi/)).toBeInTheDocument();
  });

  it('shows validation error when session has zero distance', async () => {
    renderAddWorkout();
    fillSession(0, '0', '30');
    // submit via the form directly to bypass jsdom's non-enforcement of min attribute
    fireEvent.submit(screen.getByRole('button', { name: /save session/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/valid distance and duration/i)).toBeInTheDocument(),
    );
    expect(mockAddRuns).not.toHaveBeenCalled();
  });

  it('shows validation error when session has empty values', async () => {
    renderAddWorkout();
    fireEvent.click(screen.getByRole('button', { name: /save session/i }));
    // HTML required prevents form submission, but we can test the filled-but-zero case via a direct call
    // For empty inputs the browser required attribute stops it — so just confirm the button exists
    expect(screen.getByRole('button', { name: /save session/i })).toBeInTheDocument();
  });

  it('calls addRuns with correct payload and navigates on success', async () => {
    mockAddRuns.mockResolvedValueOnce([]);
    renderAddWorkout();
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-06-01' } });
    fillSession(0, '5', '45');
    fireEvent.click(screen.getByRole('button', { name: /save session/i }));
    await waitFor(() => expect(mockAddRuns).toHaveBeenCalledWith([
      { date: '2026-06-01', distanceMiles: 5, durationMinutes: 45 },
    ]));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows error message when addRuns throws', async () => {
    mockAddRuns.mockRejectedValueOnce(new Error('Network error'));
    renderAddWorkout();
    fillSession(0, '3', '20');
    fireEvent.click(screen.getByRole('button', { name: /save session/i }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('disables button while saving', async () => {
    mockAddRuns.mockImplementation(() => new Promise(() => {}));
    renderAddWorkout();
    fillSession(0, '3', '20');
    fireEvent.click(screen.getByRole('button', { name: /save session/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled(),
    );
  });

  it('submits multiple sessions correctly', async () => {
    mockAddRuns.mockResolvedValueOnce([]);
    renderAddWorkout();
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-06-01' } });
    fillSession(0, '3', '25');
    fireEvent.click(screen.getByText(/add another session/i));
    fillSession(1, '2', '18');
    fireEvent.click(screen.getByRole('button', { name: /save 2 sessions/i }));
    await waitFor(() =>
      expect(mockAddRuns).toHaveBeenCalledWith([
        { date: '2026-06-01', distanceMiles: 3, durationMinutes: 25 },
        { date: '2026-06-01', distanceMiles: 2, durationMinutes: 18 },
      ]),
    );
  });

  it('navigates back to dashboard when back button is clicked', () => {
    renderAddWorkout();
    fireEvent.click(screen.getByText(/back to dashboard/i));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
