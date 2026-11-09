import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import * as nodePath from 'path';

const BUCKET_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class StoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoragePathError';
  }
}

export type LocalStorageConfig = {
  publicRoot: string;
  publicBaseUrl: string;
  privateRoot: string;
  privateBuckets: string[];
  signingSecret: string;
  apiBaseUrl: string;
};

/** Ortam değişkenlerinden okunur; sır yoksa imzalama sırasında açık hata verilir. */
export function readLocalStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): LocalStorageConfig {
  const trim = (v?: string) => String(v || '').trim();
  const privateBuckets = trim(env.MEDIA_PRIVATE_BUCKETS || 'documents')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);

  return {
    publicRoot: trim(env.MEDIA_PUBLIC_ROOT),
    publicBaseUrl: trim(env.MEDIA_PUBLIC_BASE_URL).replace(/\/+$/, ''),
    privateRoot: trim(env.MEDIA_PRIVATE_ROOT),
    privateBuckets,
    signingSecret: trim(env.MEDIA_SIGNING_SECRET),
    apiBaseUrl: trim(env.MEDIA_API_BASE_URL).replace(/\/+$/, ''),
  };
}

export const PRIVATE_FILES_ROUTE = 'files/private';

export class LocalStorageDriver {
  constructor(private readonly config: LocalStorageConfig) {}

  isPrivateBucket(bucket: string) {
    return this.config.privateBuckets.includes(bucket);
  }

  /** Göreli yolu doğrular: boş, mutlak, '..'/'.' parçalı, ters eğik çizgili veya NUL içerenleri reddeder. */
  normalizeRelativePath(raw: string) {
    const value = String(raw ?? '');

    if (!value.trim()) {
      throw new StoragePathError('Storage dosya yolu boş olamaz.');
    }

    if (
      value.includes('\0') ||
      value.includes('\\') ||
      value.startsWith('/') ||
      /^[A-Za-z]:/.test(value)
    ) {
      throw new StoragePathError('Geçersiz storage dosya yolu.');
    }

    const segments = value.split('/').filter((s) => s !== '');

    if (
      segments.length === 0 ||
      segments.some((s) => s === '.' || s === '..')
    ) {
      throw new StoragePathError('Geçersiz storage dosya yolu.');
    }

    return segments.join('/');
  }

  private assertBucket(bucket: string) {
    if (!BUCKET_RE.test(String(bucket || ''))) {
      throw new StoragePathError('Geçersiz storage bucket adı.');
    }
  }

  private rootFor(bucket: string) {
    const root = this.isPrivateBucket(bucket)
      ? this.config.privateRoot
      : this.config.publicRoot;

    if (!root) {
      throw new Error(
        this.isPrivateBucket(bucket)
          ? 'MEDIA_PRIVATE_ROOT tanımlı değil.'
          : 'MEDIA_PUBLIC_ROOT tanımlı değil.',
      );
    }

    return nodePath.resolve(root);
  }

  /** Kök dışına çıkışı engelleyerek mutlak dosya yolunu döndürür. */
  absolutePath(bucket: string, relativePath: string) {
    this.assertBucket(bucket);
    const rel = this.normalizeRelativePath(relativePath);
    const root = this.rootFor(bucket);
    const bucketRoot = nodePath.resolve(root, bucket);
    const target = nodePath.resolve(bucketRoot, rel);

    if (!target.startsWith(bucketRoot + nodePath.sep)) {
      throw new StoragePathError('Storage yolu kök dışına çıkamaz.');
    }

    return target;
  }

  async write(
    bucket: string,
    relativePath: string,
    data: Buffer,
  ): Promise<{ path: string; fullPath: string }> {
    const rel = this.normalizeRelativePath(relativePath);
    const target = this.absolutePath(bucket, rel);
    const dir = nodePath.dirname(target);

    await fs.mkdir(dir, { recursive: true, mode: 0o755 });

    const tmp = `${target}.${randomBytes(6).toString('hex')}.tmp`;

    try {
      await fs.writeFile(tmp, data, { mode: 0o644 });
      await fs.chmod(tmp, 0o644);
      await fs.rename(tmp, target);
    } catch (error) {
      await fs.unlink(tmp).catch(() => undefined);
      throw error;
    }

    return { path: rel, fullPath: `${bucket}/${rel}` };
  }

  /** Dosyayı gerçekten siler; olmayan dosya sessizce geçilir. */
  async remove(bucket: string, relativePath: string) {
    const target = this.absolutePath(bucket, relativePath);

    try {
      await fs.unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(bucket: string, relativePath: string) {
    try {
      const stat = await fs.stat(this.absolutePath(bucket, relativePath));
      return stat.isFile();
    } catch {
      return false;
    }
  }

  publicUrl(bucket: string, relativePath: string) {
    this.assertBucket(bucket);

    if (this.isPrivateBucket(bucket)) {
      throw new Error(
        `"${bucket}" gizli bucket; herkese açık URL üretilemez.`,
      );
    }

    if (!this.config.publicBaseUrl) {
      throw new Error('MEDIA_PUBLIC_BASE_URL tanımlı değil.');
    }

    const rel = this.normalizeRelativePath(relativePath);

    return `${this.config.publicBaseUrl}/${bucket}/${encodeSegments(rel)}`;
  }

  private secret() {
    if (!this.config.signingSecret) {
      throw new Error(
        'MEDIA_SIGNING_SECRET tanımlı değil; gizli dosya imzalı URL üretilemez.',
      );
    }

    return this.config.signingSecret;
  }

  private sign(bucket: string, rel: string, exp: number) {
    return createHmac('sha256', this.secret())
      .update(`${bucket}\n${rel}\n${exp}`)
      .digest('base64url');
  }

  signedUrl(
    bucket: string,
    relativePath: string,
    expiresInSeconds: number,
    nowMs = Date.now(),
  ) {
    this.assertBucket(bucket);

    if (!this.config.apiBaseUrl) {
      throw new Error('MEDIA_API_BASE_URL tanımlı değil.');
    }

    const rel = this.normalizeRelativePath(relativePath);
    const exp = Math.floor(nowMs / 1000) + expiresInSeconds;
    const sig = this.sign(bucket, rel, exp);

    return (
      `${this.config.apiBaseUrl}/${PRIVATE_FILES_ROUTE}/${bucket}/` +
      `${encodeSegments(rel)}?exp=${exp}&sig=${sig}`
    );
  }

  /** İmza + süre doğrular; geçerliyse mutlak dosya yolunu döndürür. */
  verifySignedRequest(
    bucket: string,
    relativePath: string,
    expRaw: unknown,
    sigRaw: unknown,
    nowMs = Date.now(),
  ) {
    if (!this.isPrivateBucket(bucket)) {
      throw new StoragePathError('Gizli bucket değil.');
    }

    const rel = this.normalizeRelativePath(relativePath);
    const exp = Number(expRaw);
    const sig = String(sigRaw || '');

    if (!Number.isFinite(exp) || !sig) {
      throw new StoragePathError('İmza eksik.');
    }

    const expected = Buffer.from(this.sign(bucket, rel, exp));
    const given = Buffer.from(sig);

    if (
      expected.length !== given.length ||
      !timingSafeEqual(expected, given)
    ) {
      throw new StoragePathError('İmza geçersiz.');
    }

    if (Math.floor(nowMs / 1000) > exp) {
      throw new StoragePathError('Bağlantının süresi dolmuş.');
    }

    return this.absolutePath(bucket, rel);
  }

  /** Yerel URL'lerden (herkese açık veya imzalı) bucket içi yolu çıkarır; eşleşmezse null. */
  pathFromLocalUrl(bucket: string, url: URL) {
    const candidates: string[] = [];

    if (this.config.publicBaseUrl) {
      try {
        const base = new URL(this.config.publicBaseUrl);
        if (base.host === url.host) {
          candidates.push(
            `${base.pathname.replace(/\/+$/, '')}/${bucket}/`,
          );
        }
      } catch {
        /* geçersiz base: yok say */
      }
    }

    candidates.push(`/${PRIVATE_FILES_ROUTE}/${bucket}/`);

    for (const marker of candidates) {
      const index = url.pathname.indexOf(marker);

      if (index >= 0) {
        const decoded = decodeURIComponent(
          url.pathname.slice(index + marker.length),
        )
          .replace(/^\/+/, '')
          .trim();

        if (decoded) {
          return decoded;
        }
      }
    }

    return null;
  }
}

function encodeSegments(rel: string) {
  return rel.split('/').map(encodeURIComponent).join('/');
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.heic': 'image/heic',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function mimeFromPath(filePath: string) {
  return (
    MIME_BY_EXT[nodePath.extname(filePath).toLowerCase()] ||
    'application/octet-stream'
  );
}
