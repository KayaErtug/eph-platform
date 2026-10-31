// EPH-92: Mevcut agir unit/proje gorsellerini 1600 px JPEG'e kucultur.
// Kullanim (sunucuda, backend klasorunden; .env otomatik okunur):
//   node scripts/eph92_gorsel_kucult.cjs say [--olc]          -> kac gorsel, toplam boyut (yazma yok)
//   node scripts/eph92_gorsel_kucult.cjs dene 5 [--uygula]    -> ilk 5 aday
//   node scripts/eph92_gorsel_kucult.cjs hepsi [--uygula]     -> tum adaylar
// Varsayilan KURU CALISTIRMA: --uygula olmadan Storage'a yukleme ve DB guncellemesi yapilmaz
//   (gorsel indirilir, yeni boyut hesaplanir, rapor yazilir).
// Aday: DB'deki boyutu > 500 KB (veya bilinmiyor); --olc ile tum gorseller indirilip kenar > 1600 px de olculur.
// Yeni gorsel AYNI anahtara degil "<ad>-k1600.jpg" anahtarina yuklenir; UnitImage / ProjectMediaAsset
// satirinda url, supabaseUrl, path, mimetype, size guncellenir. ESKI DOSYA SILINMEZ.
// Gerekli ortam (.env): DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Sir koda yazilmaz.
// Gerekli paket: sharp (yoksa "say" haric komutlar durur: npm i sharp).
require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const MAX_EDGE = 1600;
const MAX_BYTES = 500 * 1024;
const QUALITY = 80;
const SUFFIX = '-k1600.jpg';
const TABLES = [
  { tag: 'unit', model: 'unitImage' },
  { tag: 'project', model: 'projectMediaAsset' },
];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [command, countArg] = args.filter((a) => !a.startsWith('--'));
const apply = flags.has('--uygula');
const measure = flags.has('--olc');
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

function usage() {
  console.log('Kullanim: node scripts/eph92_gorsel_kucult.cjs say [--olc] | dene <N> [--uygula] | hepsi [--uygula]');
  process.exit(1);
}

function loadSharp() {
  try { return require('sharp'); } catch {
    console.error('sharp kurulu degil. Sunucuda "npm i sharp" gerekir; kurulmadan "say" haric komut calismaz.');
    process.exit(2);
  }
}

async function main() {
  if (!['say', 'dene', 'hepsi'].includes(command)) usage();
  const limit = command === 'dene' ? Number(countArg) : Infinity;
  if (command === 'dene' && !(limit > 0)) usage();
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL (.env) yok.'); process.exit(3); }

  const prisma = new PrismaClient();
  const needStorage = command !== 'say' || measure;
  let supabase = null;
  if (needStorage) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env) yok.'); process.exit(3);
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  }
  const sharp = needStorage ? loadSharp() : null;
  const bucketOf = (row) => row.bucket || process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  async function download(row) {
    const { data, error } = await supabase.storage.from(bucketOf(row)).download(row.path);
    if (error || !data) throw new Error('indirilemedi: ' + (error && error.message ? error.message : 'bos'));
    return Buffer.from(await data.arrayBuffer());
  }

  try {
    const all = [];
    for (const t of TABLES) {
      const rows = await prisma[t.model].findMany({ orderBy: { createdAt: 'asc' } });
      for (const row of rows) all.push({ ...t, row });
    }
    const todo = all.filter(({ row }) => row.path && !row.path.endsWith(SUFFIX));
    const heavyByDb = todo.filter(({ row }) => row.size == null || row.size > MAX_BYTES);
    const totalBytes = all.reduce((sum, { row }) => sum + (row.size || 0), 0);
    const heavyBytes = heavyByDb.reduce((sum, { row }) => sum + (row.size || 0), 0);
    const countOf = (tag) => all.filter((x) => x.tag === tag).length;
    console.log(`Toplam gorsel: ${all.length} (unit: ${countOf('unit')}, project: ${countOf('project')}); toplam boyut: ${mb(totalBytes)}`);
    console.log(`>500 KB veya boyutu bilinmeyen aday: ${heavyByDb.length}; adaylarin boyutu: ${mb(heavyBytes)}; zaten kucultulmus: ${all.length - todo.length}`);

    if (command === 'say' && !measure) { console.log('(1600 px ustunu olcmek icin --olc: tum gorselleri indirir.)'); return; }

    const queue = measure ? todo : heavyByDb;
    let processed = 0, changed = 0, savedBytes = 0, failed = 0, over = 0;
    for (const { row, tag, model } of queue) {
      if (command !== 'say' && processed >= limit) break;
      try {
        const input = await download(row);
        const meta = await sharp(input).metadata();
        const edge = Math.max(meta.width || 0, meta.height || 0);
        if (command === 'say') { if (edge > MAX_EDGE) over++; processed++; continue; }
        if (input.length <= MAX_BYTES && edge <= MAX_EDGE) continue;
        processed++;
        const output = await sharp(input).rotate()
          .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
        if (output.length >= input.length && edge <= MAX_EDGE && meta.format === 'jpeg') continue;
        const dir = path.posix.dirname(row.path);
        const base = path.posix.basename(row.path).replace(/\.[^./]+$/, '');
        const newPath = `${dir}/${base}${SUFFIX}`;
        const tail = `${tag}:${row.id} ${meta.width}x${meta.height} ${meta.format} ${mb(input.length)} -> ${mb(output.length)} ${newPath}`;
        if (!apply) { console.log('[KURU] ' + tail); changed++; savedBytes += input.length - output.length; continue; }
        const bucket = bucketOf(row);
        const up = await supabase.storage.from(bucket).upload(newPath, output, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
        if (up.error && !/already exists|Duplicate/i.test(up.error.message)) throw new Error('yuklenemedi: ' + up.error.message);
        const publicUrl = supabase.storage.from(bucket).getPublicUrl(newPath).data.publicUrl;
        await prisma[model].update({ where: { id: row.id }, data: { url: publicUrl, supabaseUrl: publicUrl, path: newPath, mimetype: 'image/jpeg', size: output.length } });
        console.log('[UYGULANDI] ' + tail);
        changed++; savedBytes += input.length - output.length;
      } catch (error) {
        failed++;
        console.error(`[HATA] ${tag}:${row.id} ${error.message}`);
      }
    }
    if (command === 'say') console.log(`Olculen: ${processed}; 1600 px ustu: ${over}; hata: ${failed}`);
    else console.log(`${apply ? 'Uygulanan' : 'Kuru (yazilmadi)'}: ${changed}; islenen: ${processed}; hata: ${failed}; kazanilan: ${mb(savedBytes)}. Eski dosyalar silinmedi.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
