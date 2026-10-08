import { AppShell } from "@/components/app/AppShell";
import { FinanceChat } from "@/components/chat/FinanceChat";

export const metadata = { title: "AI" };

export default function ChatPage() {
  return (
    <AppShell title="AI Assistent">
      <p className="mb-6 max-w-2xl text-ink-soft">
        Die AI arbeitet nur mit aggregierten Demo-Zahlen. Ohne AI-Gateway
        antwortet ein lokales Finanzmodell auf Kauf- und Sparfragen.
      </p>
      <FinanceChat />
    </AppShell>
  );
}
