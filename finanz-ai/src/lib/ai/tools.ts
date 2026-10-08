import { tool } from "ai";
import { z } from "zod";
import { assessAffordability, budgetUsage, buildDemoSnapshot } from "@/lib/finance/snapshot";
import { formatEur } from "@/lib/finance/money";
import { upsertSavingsGoal } from "@/lib/finance/goals";

export function createFinanceTools() {
  const snapshot = buildDemoSnapshot();

  return {
    getFinanceOverview: tool({
      description:
        "Liefert den aktuellen Finanzüberblick: Salden, Einkommen, Ausgaben, freies Budget und Sicherheitsreserve. Keine Roh-IBAN, keine Zugangsdaten.",
      inputSchema: z.object({}),
      execute: async () => ({
        month: snapshot.month,
        totalBalance: formatEur(snapshot.totals.balanceCents),
        incomeThisMonth: formatEur(snapshot.totals.incomeThisMonthCents),
        spentThisMonth: formatEur(snapshot.totals.spentThisMonthCents),
        fixedCosts: formatEur(snapshot.totals.fixedCostsCents),
        freeCash: formatEur(snapshot.totals.freeCashCents),
        safetyBuffer: formatEur(snapshot.totals.safetyBufferCents),
        accounts: snapshot.accounts.map((a) => ({
          name: a.name,
          bank: a.bankName,
          ibanMasked: a.ibanMasked,
          balance: formatEur(a.balanceCents),
        })),
      }),
    }),

    getBudgetStatus: tool({
      description: "Zeigt Budget-Auslastung je Kategorie für den laufenden Monat.",
      inputSchema: z.object({}),
      execute: async () =>
        budgetUsage(snapshot).map((b) => ({
          label: b.label,
          limit: formatEur(b.limitCents),
          spent: formatEur(b.spentCents),
          remaining: formatEur(b.remainingCents),
          usedPercent: Math.round(b.ratio * 100),
        })),
    }),

    assessPurchase: tool({
      description:
        "Prüft, ob sich ein Kauf diesen Monat leisten lässt und wie viel ggf. gespart werden muss.",
      inputSchema: z.object({
        itemLabel: z.string().min(1).describe("Bezeichnung des Kaufs, z.B. Schrank"),
        priceEuros: z
          .number()
          .positive()
          .describe("Preis in Euro, z.B. 799.99"),
      }),
      execute: async ({ itemLabel, priceEuros }) => {
        const priceCents = Math.round(priceEuros * 100);
        const result = assessAffordability(snapshot, itemLabel, priceCents);
        return {
          item: result.itemLabel,
          price: formatEur(result.priceCents),
          canAffordNow: result.canAffordNow,
          freeCash: formatEur(result.freeCashCents),
          shortfall: formatEur(result.shortfallCents),
          monthsToSave: result.monthsToSave,
          monthlySaveNeeded: formatEur(result.monthlySaveNeededCents),
          rationale: result.rationale,
        };
      },
    }),

    listRecentTransactions: tool({
      description:
        "Listet die letzten Umsätze (anonymisierte Gegenpartei/Zweck, keine Zugangsdaten).",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ limit = 8 }) =>
        snapshot.transactions.slice(0, limit).map((tx) => ({
          date: tx.bookedAt,
          amount: formatEur(tx.amountCents),
          counterparty: tx.counterparty,
          purpose: tx.purpose,
          category: tx.category,
        })),
    }),

    createSavingsGoal: tool({
      description:
        "Legt ein Sparziel an (z.B. nach einer Affordability-Prüfung), wenn der Nutzer sparen möchte.",
      inputSchema: z.object({
        label: z.string().min(1),
        targetEuros: z.number().positive(),
        monthlySaveEuros: z.number().nonnegative(),
      }),
      execute: async ({ label, targetEuros, monthlySaveEuros }) => {
        const goal = await upsertSavingsGoal({
          label,
          targetCents: Math.round(targetEuros * 100),
          monthlySaveCents: Math.round(monthlySaveEuros * 100),
        });
        return {
          id: goal.id,
          label: goal.label,
          target: formatEur(goal.targetCents),
          monthlySave: formatEur(goal.monthlySaveCents),
          message: `Sparziel „${goal.label}“ angelegt. Fortschritt unter /goals.`,
        };
      },
    }),
  };
}

export const SYSTEM_PROMPT = `Du bist Kontura, ein vorsichtiger Finanz-Assistent für den deutschsprachigen Raum.
Antworte auf Deutsch, klar und knapp.
Nutze Tools für Zahlen — erfinde keine Kontostände.
Gib keine Anlageberatung und keine Steuerberatung.
Erwähne, wenn Daten aus dem Demo-Konto stammen.
Niemals nach Bank-Passwörtern, PINs oder TANs fragen.
Bei Kaufentscheidungen: Sicherheitsreserve beachten und sparsame Alternativen vorschlagen.
Wenn Sparen nötig ist und der Nutzer zustimmt, lege mit createSavingsGoal ein Sparziel an.`;
