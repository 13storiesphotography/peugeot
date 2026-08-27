import { createAdminClient } from "@/lib/supabase/admin";

export type TrafficWindow = {
  views: number;
  visitors: number;
};

export type TrafficStats = {
  today: TrafficWindow;
  days7: TrafficWindow;
  days30: TrafficWindow;
  topPaths: { path: string; views: number }[];
  users: {
    total: number;
    last7Days: number;
    connected: number;
    pro: number;
  };
  recentSignups: { email: string | null; createdAt: string }[];
  generatedAt: string;
};

function windowStart(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  if (days > 0) d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString();
}

async function countWindow(
  admin: ReturnType<typeof createAdminClient>,
  sinceIso: string,
): Promise<TrafficWindow> {
  const { count: views } = await admin
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sinceIso);

  const { data: visitorRows } = await admin
    .from("page_views")
    .select("visitor_id")
    .gte("created_at", sinceIso);

  const visitors = new Set(
    (visitorRows ?? []).map((r) => String(r.visitor_id)),
  ).size;

  return { views: views ?? 0, visitors };
}

export async function getTrafficStats(): Promise<TrafficStats> {
  const admin = createAdminClient();
  const todayStart = windowStart(1);
  const d7 = windowStart(7);
  const d30 = windowStart(30);

  const [today, days7, days30] = await Promise.all([
    countWindow(admin, todayStart),
    countWindow(admin, d7),
    countWindow(admin, d30),
  ]);

  const { data: pathRows } = await admin
    .from("page_views")
    .select("path")
    .gte("created_at", d7)
    .limit(2000);

  const pathCounts = new Map<string, number>();
  for (const row of pathRows ?? []) {
    const path = String(row.path || "/");
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
  }
  const topPaths = [...pathCounts.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const { data: authUsers, error: usersError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (usersError) {
    console.warn("stats listUsers:", usersError.message);
  }
  const users = authUsers?.users ?? [];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7Days = users.filter(
    (u) => new Date(u.created_at).getTime() >= weekAgo,
  ).length;

  const { count: connected } = await admin
    .from("peugeot_connections")
    .select("*", { count: "exact", head: true })
    .eq("connected", true);

  const { count: pro } = await admin
    .from("entitlements")
    .select("*", { count: "exact", head: true })
    .eq("plan", "pro")
    .eq("status", "active");

  const { data: signups } = await admin
    .from("signups")
    .select("email, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    today,
    days7,
    days30,
    topPaths,
    users: {
      total: users.length,
      last7Days,
      connected: connected ?? 0,
      pro: pro ?? 0,
    },
    recentSignups: (signups ?? []).map((s) => ({
      email: s.email ? String(s.email) : null,
      createdAt: String(s.created_at),
    })),
    generatedAt: new Date().toISOString(),
  };
}
