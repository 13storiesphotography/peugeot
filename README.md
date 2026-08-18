# Peugeot Control

Web-Steuerung für **Peugeot** mit MyPeugeot — im Browser anmelden, Fahrzeugstatus und Befehle bleiben an deinem Konto.

Aktuell getestet: **E-3008**. Andere Modelle können funktionieren.

## Features

- Login / Konto (Supabase Auth)
- Persistenter Demo-Status pro Nutzer
- Laden, Klima, Batterie-Vorwärmung, Verriegeln, Hupe, Lichter
- Zeitpläne für Laden & Klima
- Aktivitätslog
- Einstellungen: Fahrzeugprofil + MyPeugeot-Verbindung (Token optional)
- Als PWA auf dem Handy speicherbar

## Online

**Production:** https://e3008-control.vercel.app/

Konto anlegen → `/control`.

## Lokal

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```
