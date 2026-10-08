# Kontura

Persönlicher Finanzüberblick mit AI — sicher, PSD2-ready, iOS-tauglich (PWA).

## Was läuft im MVP

- **Demo-Session** mit Sparkasse-ähnlichen Beispieldaten (kein Live-Bank-Login)
- **Dashboard**: Salden, Einkommen/Ausgaben, Budgets
- **AI-Chat**: „Kann ich mir den Schrank leisten?“ — mit Tools auf aggregierten Daten
- **Open-Banking-Platzhalter** für finAPI/Tink (Consent-Flow vorbereitet)
- **Supabase-Migration** mit RLS für den späteren Live-Betrieb

## Lokal starten

```bash
cd finanz-ai
cp .env.example .env.local
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) → **Demo starten**.

Optional:

- `AI_GATEWAY_API_KEY` für natürliche Sprache via Vercel AI Gateway
- Supabase-URL/Key + Migration `supabase/migrations/20261008140000_kontura_finance.sql`
- Open-Banking-Env wenn AISP-Credentials da sind

## Sicherheit (Grundsätze)

1. Kein Scraping von Online-Banking-Passwörtern
2. Bankzugang nur über lizenzierten AISP (PSD2/SCA)
3. AI sieht nur aggregierte Snapshots, keine PINs/TANs
4. Tokens verschlüsselt serverseitig (Schema vorbereitet)
5. iOS: PWA jetzt; native Shell + Face ID als nächster Schritt

## Eigenes Repo

Dieser Ordner ist absichtlich vom Peugeot-Control-Root getrennt. Später:

```bash
git subtree split -P finanz-ai -b kontura-main
# in leeres GitHub-Repo pushen
```

## Stack

Next.js 16 · React 19 · Tailwind 4 · AI SDK · Supabase (optional) · Open Banking stub
