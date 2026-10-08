export type FinapiEnv = "sandbox" | "live";

export function getFinapiConfig() {
  const env = (process.env.FINAPI_ENV ?? "sandbox") as FinapiEnv;
  const clientId =
    process.env.FINAPI_CLIENT_ID ?? process.env.OPEN_BANKING_CLIENT_ID ?? "";
  const clientSecret =
    process.env.FINAPI_CLIENT_SECRET ??
    process.env.OPEN_BANKING_CLIENT_SECRET ??
    "";
  const accessBase =
    env === "live" ? "https://live.finapi.io" : "https://sandbox.finapi.io";
  const webformBase =
    env === "live"
      ? "https://webform-live.finapi.io"
      : "https://webform-sandbox.finapi.io";
  const callbackUrl =
    process.env.FINAPI_CALLBACK_URL ??
    process.env.OPEN_BANKING_REDIRECT_URI ??
    "http://localhost:3001/api/banking/callback";

  return {
    env,
    clientId,
    clientSecret,
    accessBase,
    webformBase,
    callbackUrl,
    configured: Boolean(clientId && clientSecret),
    enabled:
      process.env.OPEN_BANKING_ENABLED === "true" ||
      process.env.FINAPI_ENABLED === "true",
  };
}

export function isFinapiReady() {
  const c = getFinapiConfig();
  return c.enabled && c.configured;
}
