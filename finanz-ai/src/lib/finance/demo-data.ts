import type { Account, Budget, Transaction } from "./types";

/** Anonymisierte Demo-Daten im Stil eines Sparkasse-Girokontos (kein Live-Bankzugang). */
export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "acc_giro",
    name: "Girokonto",
    ibanMasked: "DE89 ···· ···· ···· 3000",
    bankName: "Sparkasse Demo",
    balanceCents: 384_250,
    currency: "EUR",
  },
  {
    id: "acc_tagesgeld",
    name: "Tagesgeld",
    ibanMasked: "DE55 ···· ···· ···· 1200",
    bankName: "Sparkasse Demo",
    balanceCents: 1_250_000,
    currency: "EUR",
  },
];

const month = currentMonth();

export const DEMO_BUDGETS: Budget[] = [
  { id: "b1", category: "groceries", label: "Lebensmittel", limitCents: 800_00, month },
  { id: "b2", category: "leisure", label: "Freizeit", limitCents: 400_00, month },
  { id: "b3", category: "shopping", label: "Einkäufe", limitCents: 400_00, month },
  { id: "b4", category: "transport", label: "Mobilität", limitCents: 200_00, month },
  { id: "b5", category: "subscriptions", label: "Abos", limitCents: 150_00, month },
];

/**
 * Gehalt 4.200 € − Ausgaben ~3.030 € ≈ 1.170 € frei.
 * Nach 500 € Reserve bleiben ~670 € — Schrank 799 € knapp nicht, Sparplan sinnvoll.
 */
export const DEMO_TRANSACTIONS: Transaction[] = [
  t("tx1", "acc_giro", `${month}-01`, 420_000, "Arbeitgeber GmbH", "Gehalt", "income"),
  t("tx2", "acc_giro", `${month}-01`, -95_000, "Immobilienverwaltung", "Miete Wohnung", "housing"),
  t("tx3", "acc_giro", `${month}-02`, -18_000, "Versicherung AG", "Haftpflicht+Hausrat", "insurance"),
  t("tx4", "acc_giro", `${month}-03`, -12_000, "Stadtwerke", "Strom Abschlag", "housing"),
  t("tx5", "acc_giro", `${month}-04`, -4_500, "Streaming Bundle", "Netflix+Spotify", "subscriptions"),
  t("tx6", "acc_giro", `${month}-05`, -8_500, "Mobilfunk", "Handyvertrag", "subscriptions"),
  t("tx7", "acc_giro", `${month}-06`, -28_000, "REWE", "Wocheneinkauf", "groceries"),
  t("tx8", "acc_giro", `${month}-08`, -26_000, "Edeka", "Einkauf", "groceries"),
  t("tx9", "acc_giro", `${month}-10`, -22_000, "BioMarkt", "Lebensmittel", "groceries"),
  t("tx10", "acc_giro", `${month}-11`, -49_00, "DB Navigator", "Deutschlandticket", "transport"),
  t("tx11", "acc_giro", `${month}-12`, -15_000, "Tankstelle", "Tanken", "transport"),
  t("tx12", "acc_giro", `${month}-14`, -22_000, "Restaurant", "Abendessen", "leisure"),
  t("tx13", "acc_giro", `${month}-16`, -35_000, "IKEA", "Regal", "shopping"),
  t("tx14", "acc_giro", `${month}-18`, -12_000, "Kino+Café", "Freizeit", "leisure"),
  t("tx15", "acc_tagesgeld", `${month}-02`, 40_000, "Girokonto", "Sparrate", "transfer"),
  t("tx16", "acc_giro", `${month}-02`, -40_000, "Tagesgeld", "Sparrate", "transfer"),
];

export const SAFETY_BUFFER_CENTS = 500_00;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function t(
  id: string,
  accountId: string,
  bookedAt: string,
  amountCents: number,
  counterparty: string,
  purpose: string,
  category: Transaction["category"],
): Transaction {
  return { id, accountId, bookedAt, amountCents, counterparty, purpose, category };
}
