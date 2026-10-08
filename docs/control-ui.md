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

## Layout

- Tabs share the same width (no extra `max-w-md` on Klima only).
- Section title via `SectionHeader`; subsection titles inside a block use
  `text-sm font-semibold` (like Ladegeschwindigkeit), **not** uppercase eyebrows.
- Pro gates: quiet banner like Steuern
  (`rounded-2xl border border-[var(--line)] bg-white/[0.03] …` + text link).
  Not a centered card with a big primary button.

## Surfaces

- **Panels / rows:** `ui-surface` (1rem radius). Active state: `ui-surface-active`.
- **Settings rows** (Limit 80%, Vorklima-Plan): title + muted line + `ui-switch`
  on the right — same rhythm as Laden.
- **Action tiles** (Übersicht QuickActions, Steuern): `action-btn ui-surface ui-tile`.
- **No nested cards** for decoration. One surface per interactive block.

## Buttons

Always add `action-btn` for press feedback. Prefer classes over inline `style={}`.

| Kind | Classes | Use |
| --- | --- | --- |
| Primary CTA | `action-btn btn-primary rounded-2xl …` | One main action per tab section (e.g. Vorklima starten) |
| Destructive soft | `action-btn btn-danger-soft rounded-2xl …` | Stop |
| Secondary | `action-btn btn-secondary rounded-2xl …` | Add plan, outline full-width |
| Text link | `text-xs font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline` | Secondary inline actions |
| Danger text | `text-xs font-semibold text-[var(--danger)] …` | Delete inside a row |
| Icon tile | `action-btn ui-surface ui-tile` | Steuern / QuickActions |

**Radius:** `rounded-2xl` (matches `ui-surface`). Avoid `rounded-full` on full-width CTAs and text buttons. `rounded-full` is OK for switches, day chips, and icon wells (`ui-tile-icon`).

**Size:** Primary full-width ≈ `px-5 py-4 text-sm font-semibold`.

**Don’t** stack Speichern + Löschen as button pills under every row when a
switch/time/day can persist immediately (Limit 80% pattern).

## Chips & switches

- **Day / filter chips:** `ui-chip` / `ui-chip-on` — not ad-hoc inline borders.
- **Boolean switch:** `ui-switch` (+ `ui-switch-on` when checked) — same as Limit 80% / plan toggles.

## Forms

- Inputs: `ui-field` (time, text). Don’t invent new input chrome.

## Copy

- Short. One job per section. Left-aligned like Laden/Steuern (avoid centered walls of helper text).
- No internal jargon in UI (“nativ”, MQTT, slot indices).
- Pro gates: brief inline link, not a second hero CTA.

## Battery color

SoC accent follows `src/lib/vehicle/battery-tone.ts` (&lt; 12% warn, else teal).
Do **not** tint % / bars by DC Quick charging.

## Refresh

- Manual update: header refresh **or** pull-to-refresh (same hard wake + sync).
- Hard refresh also imports onboard Vorklima plans — no separate „Vom Auto“.

## Don’t

- Purple gradients, cream newspaper layouts, glow stacks, emoji as UI.
- Pill clusters of unrelated actions.
- Reintroduce a separate “Planen” tab — climate plans live under Klima.
