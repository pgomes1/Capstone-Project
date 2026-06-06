export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Workout {
  id: string;
  userId: string;
  type: 'running' | 'weightlifting' | 'cardio' | 'other';
  date: string;
  duration: number;
  notes?: string;
  distance?: number;
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
  }>;
  caloriesBurned?: number;
}

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('fit4life_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setStoredUser = (user: User) => {
  localStorage.setItem('fit4life_user', JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem('fit4life_user');
};

export const signup = (email: string, password: string, name: string): User => {
  const users = JSON.parse(localStorage.getItem('fit4life_users') || '[]');

  if (users.find((u: User) => u.email === email)) {
    throw new Error('User already exists');
  }

  const user: User = {
    id: crypto.randomUUID(),
    email,
    name
  };

  users.push({ ...user, password });
  localStorage.setItem('fit4life_users', JSON.stringify(users));
  setStoredUser(user);

  return user;
};

export const login = (email: string, password: string): User => {
  const users = JSON.parse(localStorage.getItem('fit4life_users') || '[]');
  const user = users.find((u: any) => u.email === email && u.password === password);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const { password: _, ...userWithoutPassword } = user;
  setStoredUser(userWithoutPassword);

  return userWithoutPassword;
};

export const logout = () => {
  clearStoredUser();
};

export const getWorkouts = (userId: string): Workout[] => {
  const workouts = JSON.parse(localStorage.getItem('fit4life_workouts') || '[]');
  return workouts.filter((w: Workout) => w.userId === userId);
};

export const addWorkout = (workout: Omit<Workout, 'id'>): Workout => {
  const workouts = JSON.parse(localStorage.getItem('fit4life_workouts') || '[]');
  const newWorkout: Workout = {
    ...workout,
    id: crypto.randomUUID()
  };
  workouts.push(newWorkout);
  localStorage.setItem('fit4life_workouts', JSON.stringify(workouts));
  return newWorkout;
};

export const deleteWorkout = (id: string) => {
  const workouts = JSON.parse(localStorage.getItem('fit4life_workouts') || '[]');
  const filtered = workouts.filter((w: Workout) => w.id !== id);
  localStorage.setItem('fit4life_workouts', JSON.stringify(filtered));
};
