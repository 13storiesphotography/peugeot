import { de } from "@/i18n/de";
import { en, type Messages } from "@/i18n/en";
import { interpolate } from "@/i18n/interpolate";
import type { Locale } from "@/i18n/config";

export function getMessages(locale: Locale): Messages {
  return locale === "de" ? de : en;
}

export type MessageKey = string;

function lookup(messages: Messages, key: string): string {
  const parts = key.split(".");
  let node: unknown = messages;
  for (const part of parts) {
    if (!node || typeof node !== "object" || !(part in node)) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  return interpolate(lookup(getMessages(locale), key), vars);
}

export type Translator = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

export function makeTranslator(locale: Locale): Translator {
  const messages = getMessages(locale);
  return (key, vars) => interpolate(lookup(messages, key), vars);
}
