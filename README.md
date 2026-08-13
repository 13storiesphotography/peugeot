# E-3008 Control

Bessere Fahrzeugsteuerung für den **Peugeot E-3008** – klarer Fokus auf Batterie, Laden, Klima und Fernbedienung.

## Was drin ist

- Live-Dashboard mit Batteriering, Reichweite und Status
- Laden starten/stoppen und Ladelimit setzen (z. B. 80 %)
- Vorklimatisierung und **Batterie-Vorwärmung** (E-3008)
- Verriegeln, Hupe, Lichter, Wake-up
- **Demo-Modus** standardmäßig (ohne Stellantis-Login nutzbar)

## Start

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Live-Anbindung (vorbereitet)

Stellantis liefert keine öffentlichen B2C-API-Credentials. Community-Tools (Home Assistant *Stellantis Vehicles*, PSA Car Controller) nutzen den MyPeugeot-OAuth-Flow.

Sobald Tokens vorliegen:

```bash
STELLANTIS_ACCESS_TOKEN=...
STELLANTIS_VEHICLE_ID=...
```

Der Client in `src/lib/stellantis/client.ts` schaltet dann auf den Live-Pfad um. Die UI bleibt gleich.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · API Routes für Status & Commands
