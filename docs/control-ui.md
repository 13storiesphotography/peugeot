# Control UI — Peugeot Control

Rules for `/control` (Übersicht, Klima, Laden, Steuern). Landing may differ.
Agents must follow this file for control-surface UI work.

## Tokens

Use CSS variables from `globals.css` — no one-off hex in components except
gradients already defined on `.btn-primary` / switch-on.

| Token | Role |
| --- | --- |
| `--accent-bright` / `--accent` | Active / primary accent |
| `--fg` / `--fg-muted` | Text |
| `--line` | Borders |
| `--warn` / `--danger` | Caution / destructive |
| `--bg-deep` | Shell background `#071018` |

## Surfaces

- **Panels / rows:** `ui-surface` (1rem radius). Active state: `ui-surface-active`.
- **Action tiles** (Übersicht QuickActions, Steuern): `action-btn ui-surface ui-tile`.
- **No nested cards** for decoration. A surface is OK when it groups an interactive block (toggle row, schedule editor).

## Buttons

Always add `action-btn` for press feedback. Prefer classes over inline `style={}`.

| Kind | Classes | Use |
| --- | --- | --- |
| Primary CTA | `action-btn btn-primary rounded-2xl …` | One main action per section (e.g. Vorklima starten) |
| Destructive soft | `action-btn btn-danger-soft rounded-2xl …` | Stop / delete |
| Secondary | `action-btn btn-secondary rounded-2xl …` | Speichern, Import, outline actions |
| Accent soft | `action-btn btn-accent-soft rounded-2xl …` | Add (“+ Vorklima”) |
| Icon tile | `action-btn ui-surface ui-tile` | Steuern / QuickActions |

**Radius:** `rounded-2xl` (matches `ui-surface`). Avoid `rounded-full` on full-width CTAs and text buttons. `rounded-full` is OK for switches, day chips, and icon wells (`ui-tile-icon`).

**Size:** Primary full-width ≈ `px-5 py-4 text-sm font-semibold`. Inline secondary ≈ `px-4 py-2 text-xs font-semibold`.

## Chips & switches

- **Day / filter chips:** `ui-chip` / `ui-chip-on` — not ad-hoc inline borders.
- **Boolean switch:** `ui-switch` (+ `ui-switch-on` when checked) — same as Limit 80% / plan toggles.

## Forms

- Inputs: `ui-field` (time, text). Don’t invent new input chrome.

## Copy

- Short. One job per section.
- No internal jargon in UI (“nativ”, MQTT, slot indices).
- Pro gates: brief CTA, link to `/control/settings#pro`.

## Battery color

SoC accent follows `src/lib/vehicle/battery-tone.ts` (&lt; 12% warn, else teal).
Do **not** tint % / bars by DC Quick charging.

## Don’t

- Purple gradients, cream newspaper layouts, glow stacks, emoji as UI.
- Pill clusters of unrelated actions.
- Reintroduce a separate “Planen” tab — climate plans live under Klima.
