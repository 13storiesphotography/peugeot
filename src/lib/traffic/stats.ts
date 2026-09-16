import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";

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
  /** Set when stats could only be partially loaded (or not at all). */
  loadError?: string | null;
};

const EMPTY_WINDOW: TrafficWindow = { views: 0, visitors: 0 };

export function emptyTrafficStats(loadError?: string): TrafficStats {
  return {
    today: EMPTY_WINDOW,
    days7: EMPTY_WINDOW,
    days30: EMPTY_WINDOW,
    topPaths: [],
    users: { total: 0, last7Days: 0, connected: 0, pro: 0 },
    recentSignups: [],
    generatedAt: new Date().toISOString(),
    loadError: loadError ?? null,
  };
}

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
  const { count: views, error: viewsError } = await admin
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (viewsError) throw new Error(viewsError.message);

  const { data: visitorRows, error: visitorError } = await admin
    .from("page_views")
    .select("visitor_id")
    .gte("created_at", sinceIso);
  if (visitorError) throw new Error(visitorError.message);

  const visitors = new Set(
    (visitorRows ?? []).map((r) => String(r.visitor_id)),
  ).size;

  return { views: views ?? 0, visitors };
}

export async function getTrafficStats(): Promise<TrafficStats> {
  if (!getServiceRoleKey() || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    return emptyTrafficStats(
      "Stats brauchen SUPABASE_SERVICE_ROLE_KEY in Vercel (Production).",
    );
  }

  try {
    const admin = createAdminClient();
    const todayStart = windowStart(1);
    const d7 = windowStart(7);
    const d30 = windowStart(30);

    const [today, days7, days30] = await Promise.all([
      countWindow(admin, todayStart),
      countWindow(admin, d7),
      countWindow(admin, d30),
    ]);

    const { data: pathRows, error: pathError } = await admin
      .from("page_views")
      .select("path")
      .gte("created_at", d7)
      .limit(2000);
    if (pathError) throw new Error(pathError.message);

    const pathCounts = new Map<string, number>();
    for (const row of pathRows ?? []) {
      const path = String(row.path || "/");
      pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
    }
    const topPaths = [...pathCounts.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    let users: { created_at: string }[] = [];
    try {
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listed.error) {
        console.warn("stats listUsers:", listed.error.message);
      } else {
        users = listed.data?.users ?? [];
      }
    } catch (err) {
      console.warn("stats listUsers:", err);
    }

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7Days = users.filter(
      (u) => new Date(u.created_at).getTime() >= weekAgo,
    ).length;

    const { count: connected, error: connectedError } = await admin
      .from("peugeot_connections")
      .select("*", { count: "exact", head: true })
      .eq("connected", true);
    if (connectedError) throw new Error(connectedError.message);

    const { count: pro, error: proError } = await admin
      .from("entitlements")
      .select("*", { count: "exact", head: true })
      .eq("plan", "pro")
      .eq("status", "active");
    if (proError) throw new Error(proError.message);

    const { data: signups, error: signupsError } = await admin
      .from("signups")
      .select("email, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (signupsError) throw new Error(signupsError.message);

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
      loadError: null,
    };
  } catch (err) {
    console.error("getTrafficStats:", err);
    return emptyTrafficStats(
      err instanceof Error
        ? err.message
        : "Stats konnten nicht geladen werden.",
    );
  }
}
