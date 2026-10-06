export type ControlTab = "home" | "climate" | "charge" | "controls";

export function controlTabHref(tab: ControlTab): string {
  return tab === "home" ? "/control" : `/control?tab=${tab}`;
}
