import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getAuthUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

app.get("/make-server-2d0d4912/health", (c) => c.json({ status: "ok" }));

// Sign up
app.post("/make-server-2d0d4912/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    const supabase = adminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });
    if (error) return c.json({ error: `Signup error: ${error.message}` }, 400);
    return c.json({ user: data.user });
  } catch (e) {
    console.log("Signup error:", e);
    return c.json({ error: `Signup failed: ${e}` }, 500);
  }
});

// Get all run sessions for the authenticated user
app.get("/make-server-2d0d4912/runs", async (c) => {
  const user = await getAuthUser(c.req.header("Authorization") ?? null);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const runs = await kv.getByPrefix(`run:${user.id}:`);
    return c.json({ runs });
  } catch (e) {
    console.log("Get runs error:", e);
    return c.json({ error: `Failed to get runs: ${e}` }, 500);
  }
});

// Add one or more run sessions for a given day
app.post("/make-server-2d0d4912/runs", async (c) => {
  const user = await getAuthUser(c.req.header("Authorization") ?? null);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { sessions } = await c.req.json() as {
      sessions: Array<{ date: string; distanceMiles: number; durationMinutes: number }>;
    };

    const created = [];
    for (const s of sessions) {
      const id = crypto.randomUUID();
      const run = {
        id,
        userId: user.id,
        date: s.date,
        distanceMiles: s.distanceMiles,
        durationMinutes: s.durationMinutes,
        createdAt: new Date().toISOString(),
      };
      await kv.set(`run:${user.id}:${id}`, run);
      created.push(run);
    }

    return c.json({ runs: created });
  } catch (e) {
    console.log("Add runs error:", e);
    return c.json({ error: `Failed to add runs: ${e}` }, 500);
  }
});

// Delete a run session
app.delete("/make-server-2d0d4912/runs/:id", async (c) => {
  const user = await getAuthUser(c.req.header("Authorization") ?? null);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    await kv.del(`run:${user.id}:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log("Delete run error:", e);
    return c.json({ error: `Failed to delete run: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);
