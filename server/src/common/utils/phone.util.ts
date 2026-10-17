export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-()]/g, '');

  let local: string;
  if (/^09\d{9}$/.test(digits)) local = digits.slice(1);
  else if (/^9\d{9}$/.test(digits)) local = digits;
  else if (/^\+989\d{9}$/.test(digits)) local = digits.slice(3);
  else if (/^00989\d{9}$/.test(digits)) local = digits.slice(4);
  else if (/^989\d{9}$/.test(digits)) local = digits.slice(2);
  else return null;

  return `+98${local}`;
}

// +989123456789 -> 09123456789. Everything in the database is stored in the
// +98 form, but Iranian SMS gateways expect the local one, so the conversion
// belongs next to the normalizer rather than inside a provider.
export function toLocalPhone(phone: string): string {
  return phone.startsWith('+98') ? `0${phone.slice(3)}` : phone;
}
