import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createFinanceTools, SYSTEM_PROMPT } from "@/lib/ai/tools";
import { getDemoSession } from "@/lib/auth/demo-session";
import { assessAffordability, buildDemoSnapshot } from "@/lib/finance/snapshot";
import { formatEur } from "@/lib/finance/money";
import { upsertSavingsGoal } from "@/lib/finance/goals";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getDemoSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const tools = createFinanceTools();
  const hasGateway = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );

  if (!hasGateway) {
    const text = await offlineAssistantReply(messages);
    const textId = crypto.randomUUID();
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: text });
          writer.write({ type: "text-end", id: textId });
        },
      }),
    });
  }

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}

/** Deterministischer Fallback ohne AI-Gateway — beantwortet typische Kauf-/Sparfragen. */
async function offlineAssistantReply(messages: UIMessage[]): Promise<string> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text =
    lastUser?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .toLowerCase() ?? "";

  const snapshot = buildDemoSnapshot();
  const priceMatch = text.match(/(\d+[.,]?\d*)\s*€?/);
  const priceEuros = priceMatch
    ? Number(priceMatch[1].replace(",", "."))
    : null;

  if (
    priceEuros &&
    (text.includes("leist") ||
      text.includes("kauf") ||
      text.includes("schrank") ||
      text.includes("sparen"))
  ) {
    const label = text.includes("schrank") ? "Schrank" : "Kaufziel";
    const result = assessAffordability(
      snapshot,
      label,
      Math.round(priceEuros * 100),
    );

    let goalNote = "";
    if (!result.canAffordNow && result.monthlySaveNeededCents > 0) {
      const goal = await upsertSavingsGoal({
        label,
        targetCents: result.priceCents,
        monthlySaveCents: result.monthlySaveNeededCents,
      });
      goalNote = `\n\nSparziel „${goal.label}“ angelegt (${formatEur(goal.monthlySaveCents)} / Monat) — unter Ziele sichtbar.`;
    }

    return `${result.rationale}${goalNote}\n\n_(Lokales Finanzmodell — für natürliche Sprache AI_GATEWAY_API_KEY setzen.)_`;
  }

  return [
    `Aktuell (Demo-Sparkasse): Saldo ${formatEur(snapshot.totals.balanceCents)}, frei ca. ${formatEur(snapshot.totals.freeCashCents)} nach Fixkosten, Reserve ${formatEur(snapshot.totals.safetyBufferCents)}.`,
    "Frag z.B.: „Kann ich mir einen Schrank für 799 € diesen Monat leisten?“",
    "",
    "_(Lokaler Modus — für natürliche Sprache AI_GATEWAY_API_KEY setzen.)_",
  ].join("\n");
}
