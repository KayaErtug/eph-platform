const PAYMENT_PATHS = ["/ucretlendirme", "/odeme", "/odemeler", "/kontor"];

export function paymentReturnPath(value: string | null): string {
  if (!value || /[\\\s]/.test(value)) return "/ucretlendirme";
  const pathname = value.split(/[?#]/, 1)[0];
  return PAYMENT_PATHS.includes(pathname) ? value : "/ucretlendirme";
}
