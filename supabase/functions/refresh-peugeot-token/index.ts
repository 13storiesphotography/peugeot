/**
 * Supabase Edge keepalive entrypoint.
 *
 * Peugeot's OAuth endpoint frequently fails inside Deno with
 * "error reading a body from connection", which can burn rotated refresh
 * tokens. We proxy to the Vercel Node cron that performs the real refresh.
 */
const CRON_SECRET = "4c25a4532d09a09981ba0d466a041fccb1a3e87603adb7f9";
const VERCEL_REFRESH_URL =
  Deno.env.get("PEUGEOT_REFRESH_CRON_URL")?.trim() ||
  "https://e3008-control.vercel.app/api/cron/refresh-peugeot-token";

Deno.serve(async (req) => {
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
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: message, proxied: true }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
});
