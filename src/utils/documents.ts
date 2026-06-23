export function maskDocumentPreview(value?: string) {
  const raw = (value ?? "").trim();
  if (!raw) return "—";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length <= 4) return digits;

  return `${digits.slice(0, 4)}${"•".repeat(digits.length - 4)}`;
}
