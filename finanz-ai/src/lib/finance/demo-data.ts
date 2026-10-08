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
  { id: "b1", category: "groceries", label: "Lebensmittel", limitCents: 450_00, month },
  { id: "b2", category: "leisure", label: "Freizeit", limitCents: 180_00, month },
  { id: "b3", category: "shopping", label: "Einkäufe", limitCents: 200_00, month },
  { id: "b4", category: "transport", label: "Mobilität", limitCents: 120_00, month },
  { id: "b5", category: "subscriptions", label: "Abos", limitCents: 65_00, month },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  t("tx1", "acc_giro", `${month}-01`, 320_000, "Arbeitgeber GmbH", "Gehalt", "income"),
  t("tx2", "acc_giro", `${month}-01`, -98_000, "Immobilienverwaltung", "Miete Wohnung", "housing"),
  t("tx3", "acc_giro", `${month}-02`, -24_500, "Versicherung AG", "Haftpflicht+Hausrat", "insurance"),
  t("tx4", "acc_giro", `${month}-03`, -14_900, "Stadtwerke", "Strom Abschlag", "housing"),
  t("tx5", "acc_giro", `${month}-04`, -6_499, "Streaming Bundle", "Netflix+Spotify", "subscriptions"),
  t("tx6", "acc_giro", `${month}-05`, -8_790, "Mobilfunk", "Handyvertrag", "subscriptions"),
  t("tx7", "acc_giro", `${month}-06`, -62_340, "REWE", "Wocheneinkauf", "groceries"),
  t("tx8", "acc_giro", `${month}-08`, -48_120, "Edeka", "Einkauf", "groceries"),
  t("tx9", "acc_giro", `${month}-10`, -39_800, "BioMarkt", "Lebensmittel", "groceries"),
  t("tx10", "acc_giro", `${month}-11`, -49_00, "DB Navigator", "Deutschlandticket", "transport"),
  t("tx11", "acc_giro", `${month}-12`, -28_500, "Tankstelle", "Tanken", "transport"),
  t("tx12", "acc_giro", `${month}-14`, -45_000, "Restaurant", "Abendessen", "leisure"),
  t("tx13", "acc_giro", `${month}-16`, -89_900, "IKEA", "Regal", "shopping"),
  t("tx14", "acc_giro", `${month}-18`, -22_000, "Kino+Café", "Freizeit", "leisure"),
  t("tx15", "acc_giro", `${month}-20`, -35_600, "REWE", "Einkauf", "groceries"),
  t("tx16", "acc_tagesgeld", `${month}-02`, 50_000, "Girokonto", "Sparrate", "transfer"),
  t("tx17", "acc_giro", `${month}-02`, -50_000, "Tagesgeld", "Sparrate", "transfer"),
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
