# E-3008 Control

Web-Steuerung für den **Peugeot E-3008** — im Browser anmelden, dann Batterie, Laden, Klima und Fernbedienung bedienen.

## Online nutzen

1. App öffnen (Vercel-URL)
2. **Konto anlegen** mit E-Mail + Passwort
3. Anmelden → Steuerung unter `/control`

## Lokal (nur Entwicklung)

```bash
cp .env.example .env.local
# Supabase-URL und Publishable Key eintragen
npm install
npm run dev
```

## Stack

Next.js · Supabase Auth · Stellantis-Client-Stub (Demo-Fahrzeugdaten) · Vercel
