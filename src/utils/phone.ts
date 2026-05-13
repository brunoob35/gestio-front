export function formatPhoneNumber(value?: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length <= 11) {
    const local = digits.slice(0, 11);
    if (local.length <= 2) return local ? `(${local}` : "";
    if (local.length <= 7) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
    if (local.length <= 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return `(${local.slice(0, 2)}) ${local.slice(2, 3)} ${local.slice(3, 7)}-${local.slice(7)}`;
  }

  const country = digits.slice(0, 2);
  const area = digits.slice(2, 4);
  const rest = digits.slice(4, 13);

  if (rest.length <= 4) return `+${country} (${area}) ${rest}`.trim();
  if (rest.length <= 8) return `+${country} (${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`.trim();
  return `+${country} (${area}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5, 9)}`.trim();
}
