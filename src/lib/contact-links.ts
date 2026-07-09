const INVALID_CONTACT_VALUES = new Set([
  "",
  "-",
  "--",
  "s/n",
  "sn",
  "sem",
  "sem email",
  "sem e-mail",
  "nao informado",
  "não informado",
  "n/a",
]);

export function isUsefulContactValue(value: string | null | undefined) {
  if (!value) return false;
  return !INVALID_CONTACT_VALUES.has(value.trim().toLowerCase());
}

export function getGmailComposeUrl(email: string | null | undefined) {
  if (!isUsefulContactValue(email)) return null;
  const trimmed = email!.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(trimmed)}`;
}

export function normalizeBrazilPhone(value: string | null | undefined) {
  if (!isUsefulContactValue(value)) return null;

  let digits = value!.replace(/\D/g, "");
  if (!digits) return null;

  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  return digits.length >= 11 ? digits : null;
}

export function getWhatsAppUrl(phone: string | null | undefined) {
  const normalized = normalizeBrazilPhone(phone);
  return normalized ? `https://wa.me/${normalized}` : null;
}
