import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../app/components/Signup';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../app/utils/api', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
}));

import { signUp, signIn } from '../app/utils/api';

const mockSignUp = vi.mocked(signUp);
const mockSignIn = vi.mocked(signIn);

function renderSignup() {
  return render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Signup', () => {
  it('renders name, email, password fields and submit button', () => {
    renderSignup();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('shows inline error when password is too short without calling API', async () => {
    renderSignup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('navigates to /dashboard on successful signup + signin', async () => {
    mockSignUp.mockResolvedValueOnce({} as any);
    mockSignIn.mockResolvedValueOnce({} as any);
    renderSignup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
    expect(mockSignUp).toHaveBeenCalledWith('a@b.com', 'secret123', 'Alice');
    expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'secret123');
  });

  it('shows error message when signUp throws', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('Email already taken'));
    renderSignup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => expect(screen.getByText('Email already taken')).toBeInTheDocument());
  });

  it('disables button while loading', async () => {
    mockSignUp.mockImplementation(() => new Promise(() => {}));
    renderSignup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled(),
    );
  });

  it('navigates to /login when Log In link is clicked', () => {
    renderSignup();
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
