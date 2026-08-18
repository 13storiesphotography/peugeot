/** Maps Supabase password-update failures to the existing German UI copy. */
export function mapPasswordUpdateError(error: {
  message?: string;
  status?: number;
}): string {
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("same") || msg.includes("different from the old")) {
    return "Das neue Passwort muss sich vom bisherigen unterscheiden.";
  }
  if (msg.includes("at least") || msg.includes("weak") || msg.includes("pwned")) {
    return "Passwort zu unsicher. Bitte ein längeres wählen.";
  }
  if (msg.includes("session") || error.status === 401) {
    return "Sitzung abgelaufen. Bitte den Link in der E-Mail erneut öffnen oder einen neuen anfordern.";
  }
  return "Passwort konnte nicht gespeichert werden. Bitte erneut versuchen.";
}
