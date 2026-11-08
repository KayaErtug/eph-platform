export const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function currentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`;
}

export function monthIndex(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2}(?:T.*)?)?$/.exec(value);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : NaN;
}

export function monthChoices(now = new Date()) {
  const start = monthIndex(currentMonth(now));
  return Array.from({ length: 37 }, (_, offset) => {
    const index = start + offset;
    const year = Math.floor(index / 12);
    const month = index % 12;
    return { value: `${year}-${String(month + 1).padStart(2, '0')}-01`, year: String(year), month: String(month + 1).padStart(2, '0'), label: `${MONTH_NAMES[month]} ${year}` };
  });
}

export function validateProjectDates(stage: string, delivery: string, start = '', now = new Date(), requireStart = true) {
  if (stage === 'READY') return '';
  const current = monthIndex(currentMonth(now));
  const end = monthIndex(delivery);
  if (!delivery) return 'Tahmini teslim ayı ve yılı zorunludur.';
  if (!Number.isFinite(end)) return 'Geçerli bir teslim ayı ve yılı seçin.';
  if (end < current || end > current + 36) return 'Teslim tarihi bu aydan itibaren en fazla 36 ay içinde olmalıdır.';
  if (stage === 'PLANNED') {
    if (!start && requireStart) return 'Proje başlangıç ayı ve yılı zorunludur.';
    if (start) {
      const beginning = monthIndex(start);
      if (!Number.isFinite(beginning) || beginning < current || beginning > current + 36) return 'Başlangıç tarihi bu aydan itibaren en fazla 36 ay içinde olmalıdır.';
      if (beginning > end) return 'Teslim tarihi başlangıç tarihinden önce olamaz.';
    }
  }
  return '';
}

export function parseSharedLocation(input: string): { latitude: number; longitude: number } | null {
  const raw = input.trim();
  let candidates = [raw];
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      if (!['google.com', 'www.google.com', 'maps.google.com', 'maps.apple.com', 'maps.google.com.tr', 'www.google.com.tr', 'maps.app.goo.gl', 'goo.gl'].includes(host)) return null;
      candidates = ['q', 'query', 'll', 'destination'].map(key => url.searchParams.get(key) || '');
      const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url.pathname);
      const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url.pathname);
      if (pin) candidates.unshift(`${pin[1]},${pin[2]}`);
      else if (at) candidates.push(`${at[1]},${at[2]}`);
    } catch { return null; }
  } else if (raw.startsWith('geo:')) candidates = [raw.slice(4).split('?')[0]];
  for (const candidate of candidates) {
    const match = /^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(candidate);
    if (!match) continue;
    const latitude = Number(match[1]); const longitude = Number(match[2]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) return { latitude, longitude };
  }
  return null;
}
