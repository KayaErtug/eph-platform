import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SupabaseService } from './supabase.service';
import { PrivateFilesController } from './private-files.controller';
import { readLocalStorageConfig } from './local-storage.driver';

const ENV_KEYS = [
  'STORAGE_DRIVER', 'MEDIA_PUBLIC_ROOT', 'MEDIA_PUBLIC_BASE_URL',
  'MEDIA_PRIVATE_ROOT', 'MEDIA_PRIVATE_BUCKETS', 'MEDIA_SIGNING_SECRET',
  'MEDIA_API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

describe('SupabaseService - STORAGE_DRIVER', () => {
  const saved: Record<string, string | undefined> = {};
  let tmp: string;

  beforeEach(async () => {
    ENV_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; });
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'eph93-'));
    process.env.STORAGE_DRIVER = 'local';
    process.env.MEDIA_PUBLIC_ROOT = path.join(tmp, 'pub');
    process.env.MEDIA_PRIVATE_ROOT = path.join(tmp, 'priv');
    process.env.MEDIA_PUBLIC_BASE_URL = 'https://image.example.test/eph';
    process.env.MEDIA_API_BASE_URL = 'https://api.example.test';
    process.env.MEDIA_SIGNING_SECRET = 'test-secret';
  });

  afterEach(async () => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    });
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('STORAGE_DRIVER yoksa varsayılan local (canlı davranışı değişmez; SUPABASE_URL gerekmez)', () => {
    delete process.env.STORAGE_DRIVER;
    const svc = new SupabaseService();
    expect(svc.local).not.toBeNull();
    expect(svc.getPublicUrl('b', 'a/b.jpg')).toBe('https://image.example.test/eph/b/a/b.jpg');
  });

  it('STORAGE_DRIVER=supabase: aktif sürücü Supabase (SUPABASE_URL zorunlu; local aktif değil)', () => {
    process.env.STORAGE_DRIVER = 'supabase';
    expect(() => new SupabaseService()).toThrow('SUPABASE_URL');
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const svc = new SupabaseService();
    expect(svc.local).toBeNull();
    expect(svc.localFallback).not.toBeNull(); // yalnız kota yedeği; aktif sürücü değil
    expect(svc.getPublicUrl('b', 'a/b.jpg')).toBe(
      'https://x.supabase.co/storage/v1/object/public/b/a/b.jpg',
    );
  });

  it('STORAGE_DRIVER=supabase: yükleme/silme Supabase istemcisine gider, yerel diske yazılmaz', async () => {
    process.env.STORAGE_DRIVER = 'supabase';
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const svc = new SupabaseService();
    const upload = jest.fn(async () => ({ data: { path: 'a/b.jpg' }, error: null }));
    const remove = jest.fn(async () => ({ data: [{ name: 'a/b.jpg' }], error: null }));
    (svc as any).supabase = { storage: { from: jest.fn(() => ({ upload, remove })) } };
    await svc.uploadFile('portfolio-images', 'a/b.jpg', Buffer.from('x'), 'image/jpeg');
    expect(upload).toHaveBeenCalledTimes(1);
    await svc.removeFile('portfolio-images', ['a/b.jpg']);
    expect(remove).toHaveBeenCalledWith(['a/b.jpg']);
    await expect(fs.stat(path.join(tmp, 'pub', 'portfolio-images', 'a', 'b.jpg'))).rejects.toThrow();
  });

  it('STORAGE_DRIVER=supabase: kota aşımı (402) bilinçli olarak yerel yedeğe yazar', async () => {
    process.env.STORAGE_DRIVER = 'supabase';
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const svc = new SupabaseService();
    const upload = jest.fn(async () => ({ data: null, error: { message: 'Quota exceeded', statusCode: 402 } }));
    (svc as any).supabase = { storage: { from: jest.fn(() => ({ upload })) } };
    await svc.uploadFile('portfolio-images', 'q/a.jpg', Buffer.from('q'), 'image/jpeg');
    expect((await fs.readFile(path.join(tmp, 'pub', 'portfolio-images', 'q', 'a.jpg'))).toString()).toBe('q');
  });

  it('geçersiz STORAGE_DRIVER hata verir', () => {
    process.env.STORAGE_DRIVER = 'ftp';
    expect(() => new SupabaseService()).toThrow('STORAGE_DRIVER');
  });

  it('local: yükle → public URL → sil', async () => {
    const svc = new SupabaseService();
    await svc.uploadFile('portfolio-images', 'portfolio/u1/p 1/a.jpg', Buffer.from('img'), 'image/jpeg');
    const file = path.join(tmp, 'pub', 'portfolio-images', 'portfolio/u1/p 1/a.jpg');
    expect((await fs.readFile(file)).toString()).toBe('img');
    expect((await fs.readdir(path.dirname(file))).filter((f) => f.endsWith('.tmp'))).toHaveLength(0);

    const url = svc.getPublicUrl('portfolio-images', 'portfolio/u1/p 1/a.jpg');
    expect(url).toBe('https://image.example.test/eph/portfolio-images/portfolio/u1/p%201/a.jpg');
    expect(svc.resolveStoragePath('portfolio-images', url)).toBe('portfolio/u1/p 1/a.jpg');
    expect(svc.getImageDomainUrl('project-media/a.jpg')).toBe(
      'https://image.example.test/eph/portfolio-images/project-media/a.jpg',
    );

    await svc.removeFile('portfolio-images', [url]);
    await expect(fs.stat(file)).rejects.toThrow();
  });

  it('local: eski Supabase URL ve olmayan dosya silinirken hata vermez', async () => {
    const svc = new SupabaseService();
    const old = 'https://x.supabase.co/storage/v1/object/public/portfolio-images/p/old.jpg';
    expect(svc.resolveStoragePath('portfolio-images', old)).toBe('p/old.jpg');
    await expect(
      svc.removeFile('portfolio-images', [old, 'yok/dosya.jpg', 'https://baska.test/x']),
    ).resolves.toBeDefined();
  });

  it('local: path geçişi ve mutlak yol reddedilir', async () => {
    const svc = new SupabaseService();
    for (const bad of ['../x.jpg', 'a/../../x.jpg', '/etc/passwd', 'C:/x.jpg', 'a\\b.jpg', '']) {
      await expect(svc.uploadFile('portfolio-images', bad, Buffer.from('x'), 'image/jpeg')).rejects.toThrow();
    }
    await expect(svc.uploadFile('../evil', 'a.jpg', Buffer.from('x'), 'image/jpeg')).rejects.toThrow();
    await expect(fs.stat(path.join(tmp, 'x.jpg'))).rejects.toThrow();
  });

  it('local: gizli bucket imzalı URL geçerli / süresi dolmuş / bozuk imza / yol geçişi', async () => {
    const svc = new SupabaseService();
    await svc.uploadFile('documents', 'u1/MYK_1.pdf', Buffer.from('pdf'), 'application/pdf');
    await expect(fs.stat(path.join(tmp, 'pub', 'documents'))).rejects.toThrow();
    expect(() => svc.getPublicUrl('documents', 'u1/MYK_1.pdf')).toThrow('gizli');

    const signed = await svc.createSignedUrl('documents', 'u1/MYK_1.pdf', 300);
    const u = new URL(signed);
    expect(u.origin + u.pathname).toBe('https://api.example.test/files/private/documents/u1/MYK_1.pdf');
    const exp = u.searchParams.get('exp');
    const sig = u.searchParams.get('sig');
    const local = svc.local!;

    const file = local.verifySignedRequest('documents', 'u1/MYK_1.pdf', exp, sig);
    expect((await fs.readFile(file)).toString()).toBe('pdf');
    expect(svc.resolveStoragePath('documents', signed)).toBe('u1/MYK_1.pdf');

    expect(() => local.verifySignedRequest('documents', 'u1/MYK_1.pdf', exp, sig, Date.now() + 301_000)).toThrow('süresi');
    expect(() => local.verifySignedRequest('documents', 'u1/MYK_1.pdf', exp, sig!.slice(0, -2) + 'AA')).toThrow('mza geçersiz');
    expect(() => local.verifySignedRequest('documents', 'u2/MYK_1.pdf', exp, sig)).toThrow('mza geçersiz');
    expect(() => local.verifySignedRequest('documents', 'u1/MYK_1.pdf', Number(exp) + 9999, sig)).toThrow('mza geçersiz');
    expect(() => local.verifySignedRequest('documents', '../priv/../x', exp, sig)).toThrow();
    expect(() => local.verifySignedRequest('documents', 'u1/MYK_1.pdf', exp, '')).toThrow();
    expect(() => local.verifySignedRequest('portfolio-images', 'u1/MYK_1.pdf', exp, sig)).toThrow();

    await expect(svc.createSignedUrl('documents', 'yok.pdf')).rejects.toThrow('bulunamadı');
  });

  it('kaynakta sabit imzalama anahtarı yok: MEDIA_SIGNING_SECRET yoksa yapılandırma boş döner ve imza/doğrulama kapalı kalır (N1)', async () => {
    delete process.env.MEDIA_SIGNING_SECRET;
    expect(readLocalStorageConfig().signingSecret).toBe('');
    const svc = new SupabaseService();
    await svc.uploadFile('documents', 'u1/x.pdf', Buffer.from('x'), 'application/pdf');
    expect(() => svc.local!.verifySignedRequest('documents', 'u1/x.pdf', Date.now() + 60_000, 'uydurma-imza')).toThrow('MEDIA_SIGNING_SECRET');
    expect(() => svc.local!.signedUrl('documents', 'u1/x.pdf', 60)).toThrow('MEDIA_SIGNING_SECRET');
  });

  it('local: MEDIA_SIGNING_SECRET yoksa açık hata', async () => {
    delete process.env.MEDIA_SIGNING_SECRET;
    const svc = new SupabaseService();
    await svc.uploadFile('documents', 'a.pdf', Buffer.from('x'), 'application/pdf');
    await expect(svc.createSignedUrl('documents', 'a.pdf')).rejects.toThrow('MEDIA_SIGNING_SECRET');
  });

  it('controller: geçerli imza dosyayı gönderir, bozuk imza 403, supabase modunda 404', async () => {
    const svc = new SupabaseService();
    await svc.uploadFile('documents', 'u1/a.pdf', Buffer.from('pdf'), 'application/pdf');
    const u = new URL(await svc.createSignedUrl('documents', 'u1/a.pdf', 60));
    const ctl = new PrivateFilesController(svc);
    const res: any = { setHeader: jest.fn(), sendFile: jest.fn(), headersSent: false };
    ctl.download('documents', ['u1', 'a.pdf'], u.searchParams.get('exp')!, u.searchParams.get('sig')!, res);
    expect(res.sendFile).toHaveBeenCalledWith(
      path.join(tmp, 'priv', 'documents', 'u1', 'a.pdf'),
      expect.anything(),
      expect.any(Function),
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(() => ctl.download('documents', 'u1/a.pdf', u.searchParams.get('exp')!, 'bozuk', res)).toThrow();
    expect(() =>
      new PrivateFilesController({ local: null } as any).download('documents', 'a', '1', 'x', res),
    ).toThrow();
  });
});
