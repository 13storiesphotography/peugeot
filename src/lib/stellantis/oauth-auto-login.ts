import chromium from "@sparticuz/chromium";
import puppeteer, {
  type Browser,
  type Frame,
  type Page,
} from "puppeteer-core";
import { buildPeugeotAuthorizeUrl } from "@/lib/stellantis/authorize-url";
import { extractOAuthCode } from "@/lib/stellantis/oauth-code";

export type AutoLoginResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

function isServerless(): boolean {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchBrowser(): Promise<Browser> {
  const localPath =
    process.env.CHROME_EXECUTABLE_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (process.platform === "linux" ? "/usr/bin/google-chrome-stable" : undefined);

  if (!isServerless() && localPath) {
    return puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
  }

  return puppeteer.launch({
    args: [
      ...chromium.args,
      "--disable-blink-features=AutomationControlled",
      "--hide-scrollbars",
    ],
    defaultViewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

async function findLoginFrame(page: Page): Promise<Frame | null> {
  for (let i = 0; i < 40; i++) {
    for (const frame of page.frames()) {
      try {
        const handles = await frame.$$("input[name='username']");
        for (const handle of handles) {
          const ok = await handle.evaluate((el) => {
            const input = el as HTMLInputElement;
            const style = window.getComputedStyle(input);
            const rect = input.getBoundingClientRect();
            const placeholder = (input.placeholder || "").toLowerCase();
            const looksLikeLogin =
              placeholder.includes("mail") ||
              placeholder.includes("e-mail") ||
              placeholder.includes("email") ||
              placeholder.includes("benutzer");
            return (
              looksLikeLogin &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              rect.width > 0 &&
              rect.height > 0
            );
          });
          if (ok) return frame;
        }
      } catch {
        /* cross-origin / detached */
      }
    }
    await sleep(500);
  }
  return null;
}

async function pageText(page: Page): Promise<string> {
  const chunks: string[] = [];
  for (const frame of page.frames()) {
    try {
      const text = await frame.evaluate(() => document.body?.innerText || "");
      if (text.trim()) chunks.push(text);
    } catch {
      /* ignore */
    }
  }
  return chunks.join("\n");
}

async function clickVisibleByText(
  root: Page | Frame,
  patterns: RegExp[],
): Promise<boolean> {
  return root.evaluate((sources) => {
    const regexes = sources.map((s) => new RegExp(s, "i"));
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, [role='button'], a, input[type='submit'], input[type='button']",
      ),
    );
    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (
        style.visibility === "hidden" ||
        style.display === "none" ||
        rect.width < 2 ||
        rect.height < 2
      ) {
        continue;
      }
      const text = (
        (el instanceof HTMLInputElement ? el.value : "") ||
        el.innerText ||
        el.textContent ||
        el.getAttribute("aria-label") ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;
      if (regexes.some((re) => re.test(text))) {
        el.click();
        return true;
      }
    }
    return false;
  }, patterns.map((re) => re.source));
}

async function clickAnywhere(page: Page, patterns: RegExp[]): Promise<boolean> {
  if (await clickVisibleByText(page, patterns)) return true;
  for (const frame of page.frames()) {
    try {
      if (await clickVisibleByText(frame, patterns)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * Headless MyPeugeot login: intercept mymap:// redirect and return OAuth code.
 * Password is never persisted — only used for this request.
 */
export async function capturePeugeotOAuthCode(input: {
  countryCode: string;
  email: string;
  password: string;
  timeoutMs?: number;
}): Promise<AutoLoginResult> {
  const email = input.email.trim();
  const password = input.password;
  const countryCode = (input.countryCode || "DE").toUpperCase();
  const timeoutMs = input.timeoutMs ?? 55_000;

  if (!email || !password) {
    return { ok: false, error: "E-Mail und Passwort erforderlich." };
  }

  const authorizeUrl = buildPeugeotAuthorizeUrl(countryCode);
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    let settle: ((code: string) => void) | null = null;
    let fail: ((err: Error) => void) | null = null;
    const codePromise = new Promise<string>((resolve, reject) => {
      settle = resolve;
      fail = reject;
    });

    const timer = setTimeout(() => {
      fail?.(
        new Error(
          "Zeitüberschreitung. Oft blockiert Peugeot den automatischen Login (Captcha). Bitte Code am Computer manuell holen.",
        ),
      );
    }, timeoutMs);

    const tryCapture = (url: string) => {
      if (!/mymap:/i.test(url)) return;
      const code = extractOAuthCode(url);
      if (code) {
        clearTimeout(timer);
        settle?.(code);
      }
    };

    page.on("request", (req) => tryCapture(req.url()));
    page.on("framenavigated", (frame) => tryCapture(frame.url()));

    await page.goto(authorizeUrl, {
      waitUntil: "domcontentloaded",
      timeout: 35_000,
    });

    const loginFrame = await findLoginFrame(page);
    if (!loginFrame) {
      clearTimeout(timer);
      const text = await pageText(page);
      if (/recaptcha|captcha/i.test(text)) {
        return {
          ok: false,
          error:
            "Peugeot zeigt Captcha — automatische Anmeldung geht gerade nicht. Bitte Login-Link am Computer öffnen und den Code manuell einlösen.",
        };
      }
      return {
        ok: false,
        error: "Peugeot-Login-Formular nicht gefunden. Später erneut versuchen oder manuell verbinden.",
      };
    }

    const userInput = await loginFrame.evaluateHandle(() => {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>("input[name='username']"),
      );
      return (
        inputs.find((input) => {
          const style = window.getComputedStyle(input);
          const rect = input.getBoundingClientRect();
          const placeholder = (input.placeholder || "").toLowerCase();
          return (
            (placeholder.includes("mail") ||
              placeholder.includes("e-mail") ||
              placeholder.includes("email")) &&
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.width > 0
          );
        }) || null
      );
    });
    const passInput = await loginFrame.evaluateHandle(() => {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          "input[type='password'][name='password']",
        ),
      );
      return (
        inputs.find((input) => {
          const style = window.getComputedStyle(input);
          const rect = input.getBoundingClientRect();
          const placeholder = (input.placeholder || "").toLowerCase();
          return (
            (placeholder.includes("passwort") ||
              placeholder.includes("password") ||
              placeholder.includes("mot de passe")) &&
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.width > 0
          );
        }) ||
        inputs.find((input) => {
          const style = window.getComputedStyle(input);
          const rect = input.getBoundingClientRect();
          return (
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.width > 0
          );
        }) ||
        null
      );
    });

    const userEl = userInput.asElement() as import("puppeteer-core").ElementHandle<
      Element
    > | null;
    const passEl = passInput.asElement() as import("puppeteer-core").ElementHandle<
      Element
    > | null;
    if (!userEl || !passEl) {
      clearTimeout(timer);
      return { ok: false, error: "E-Mail-/Passwort-Felder nicht gefunden." };
    }

    await userEl.click({ count: 3 });
    await userEl.type(email, { delay: 20 });
    await passEl.click({ count: 3 });
    await passEl.type(password, { delay: 20 });

    // Prefer the visible Gigya submit near the login fields.
    const submitted =
      (await loginFrame
        .evaluate(() => {
          const list = Array.from(document.querySelectorAll("form"));
          for (const form of list) {
            const user = form.querySelector("input[name='username']");
            const pass = form.querySelector(
              "input[type='password'][name='password']",
            );
            const submit = form.querySelector<HTMLElement>(
              "input[type='submit'], button[type='submit']",
            );
            if (user && pass && submit) {
              const style = window.getComputedStyle(submit);
              const rect = submit.getBoundingClientRect();
              if (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0
              ) {
                submit.click();
                return true;
              }
            }
          }
          return false;
        })
        .catch(() => false)) ||
      (await clickAnywhere(page, [
        /^anmelden$/i,
        /^login$/i,
        /^envoyer$/i,
        /^sign in$/i,
        /anmelden/i,
        /login/i,
      ]));

    if (!submitted) {
      await passEl.press("Enter");
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      await sleep(900);
      const text = await pageText(page);
      if (
        /recaptcha enterprise-kontingent|ungültige captcha|captcha.*(fehl|error|invalid)/i.test(
          text,
        )
      ) {
        clearTimeout(timer);
        return {
          ok: false,
          error:
            "Peugeot Captcha blockiert die Automatik. Bitte Login-Link am Computer öffnen und mymap://-Code manuell einlösen.",
        };
      }
      if (
        /(e-mail|passwort|password).{0,40}(ungültig|incorrect|falsch|invalid|erreur)/i.test(
          text,
        ) ||
        /login failed|anmeldung fehlgeschlagen/i.test(text)
      ) {
        clearTimeout(timer);
        return { ok: false, error: "Login abgelehnt — E-Mail oder Passwort prüfen." };
      }

      await clickAnywhere(page, [
        /^weiter$/i,
        /^ok$/i,
        /^continue$/i,
        /^continuer$/i,
        /^next$/i,
        /weiter/i,
      ]);
    }

    const code = await codePromise;
    return { ok: true, code };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Automatische Anmeldung fehlgeschlagen.";
    return { ok: false, error: message };
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
