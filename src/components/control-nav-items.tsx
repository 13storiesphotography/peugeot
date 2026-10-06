import type { ReactNode } from "react";
import type { ControlTab } from "@/components/control-tabs";

export const CONTROL_TABS: {
  id: ControlTab;
  label: string;
  icon: (active: boolean) => ReactNode;
}[] = [
  {
    id: "home",
    label: "Übersicht",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.18 : 0}
        />
      </svg>
    ),
  },
  {
    id: "climate",
    label: "Klima",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3v18M5.5 6.5l13 11M18.5 6.5l-13 11"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {active ? (
          <circle
            cx="12"
            cy="12"
            r="2.5"
            fill="currentColor"
            fillOpacity="0.35"
          />
        ) : null}
      </svg>
    ),
  },
  {
    id: "charge",
    label: "Laden",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.2 : 0}
        />
      </svg>
    ),
  },
  {
    id: "controls",
    label: "Steuern",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke="currentColor"
          strokeWidth="1.7"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.2 : 0}
        />
        <path
          d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];
