import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../app/components/Login';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../app/utils/api', () => ({
  signIn: vi.fn(),
}));

import { signIn } from '../app/utils/api';

const mockSignIn = vi.mocked(signIn);

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login', () => {
  it('renders email, password fields and submit button', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows brand heading', () => {
    renderLogin();
    expect(screen.getByText('Fit4Life')).toBeInTheDocument();
  });

  it('navigates to /dashboard on successful login', async () => {
    mockSignIn.mockResolvedValueOnce({} as any);
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows error message on failed login', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());
  });

  it('disables button while loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})); // never resolves
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled(),
    );
  });

  it('navigates to /signup when Sign Up link is clicked', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });
});
