import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const SERVER = "http://localhost:8000/api";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
    );
  }
  return supabaseInstance;
}

async function authHeaders(): Promise<HeadersInit> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? publicAnonKey;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface RunSession {
  id: string;
  userId: string;
  date: string;
  distanceMiles: number;
  durationMinutes: number;
  createdAt: string;
}

export async function signUp(email: string, password: string, name: string) {
  const res = await fetch(`${SERVER}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Signup failed");
  return data.data.user;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}

export async function getSession() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getRuns(): Promise<RunSession[]> {
  const res = await fetch(`${SERVER}/runs`, { headers: await authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Failed to fetch runs");
  return data.data?.runs ?? [];
}

export async function addRuns(
  sessions: Array<{ date: string; distanceMiles: number; durationMinutes: number }>,
): Promise<RunSession[]> {
  const res = await fetch(`${SERVER}/runs`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ sessions }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Failed to add runs");
  return data.data?.runs ?? [];
}

export async function deleteRun(id: string) {
  const res = await fetch(`${SERVER}/runs/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error?.message ?? "Failed to delete run");
  }
}
