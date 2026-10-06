/**
 * Supabase Edge keepalive entrypoint.
 *
 * Peugeot's OAuth endpoint frequently fails inside Deno with
 * "error reading a body from connection", which can burn rotated refresh
 * tokens. We proxy to the Vercel Node cron that performs the real refresh.
 */
const CRON_SECRET = Deno.env.get("CRON_SECRET")?.trim() ?? "";
const VERCEL_REFRESH_URL =
  Deno.env.get("PEUGEOT_REFRESH_CRON_URL")?.trim() ||
  "https://www.peugeotcontrol.app/api/cron/refresh-peugeot-token";

Deno.serve(async (req) => {
  if (!CRON_SECRET || CRON_SECRET.length < 24) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const secret = req.headers.get("x-cron-secret") ?? "";
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(VERCEL_REFRESH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: "{}",
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
