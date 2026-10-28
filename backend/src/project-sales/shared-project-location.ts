import { BadRequestException } from '@nestjs/common';
import { get } from 'https';
import { parseSharedLocation } from './planningInput';

const HOSTS = new Set(['google.com','www.google.com','maps.google.com','maps.google.com.tr','www.google.com.tr','maps.app.goo.gl','goo.gl','maps.apple.com']);
export function allowedMapUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && HOSTS.has(url.hostname.toLowerCase());
  } catch { return false; }
}

function locationHeader(url: string): Promise<string> {
  return new Promise((resolve,reject) => {
    const request = get(url, { timeout: 3000, headers: { 'User-Agent': 'EPH-Location/1.0' } }, response => {
      response.resume();
      if ([301,302,303,307,308].includes(response.statusCode || 0) && response.headers.location) resolve(new URL(response.headers.location,url).href);
      else reject(new Error('Konum bağlantısı koordinat içermiyor.'));
    });
    request.on('timeout',()=>request.destroy(new Error('Konum bağlantısı zaman aşımına uğradı.')));
    request.on('error',reject);
  });
}

export async function resolveSharedProjectLocation(value: unknown, redirect: (url:string)=>Promise<string> = locationHeader) {
  if (typeof value !== 'string' || value.length > 2048) throw new BadRequestException('Geçerli bir konum bağlantısı veya koordinat girin.');
  let current=value.trim();
  for (let hop=0;hop<5;hop++) {
    if (/^https?:/i.test(current) && !allowedMapUrl(current)) throw new BadRequestException('Yalnız HTTPS Google ve Apple Haritalar bağlantıları kullanılabilir.');
    const point=parseSharedLocation(current);
    if(point) return point;
    if(!allowedMapUrl(current)) break;
    try { current=await redirect(current); } catch { break; }
  }
  throw new BadRequestException('Konum okunamadı. Haritada konumu açıp bağlantıyı veya enlem, boylam bilgisini paylaşın.');
}
