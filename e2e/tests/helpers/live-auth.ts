import { request } from '@playwright/test';

export type LiveAuthUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  capabilities?: string[];
  isApproved?: boolean;
  isVerified?: boolean;
  referralCode?: string | null;
  nominationPoints?: number;
  nominationQuota?: number;
};

export type LiveAuthPayload<TUser extends LiveAuthUser = LiveAuthUser> = {
  token?: string;
  user?: TUser;
  message?: string;
};

type LoginOptions = {
  baseURL: string;
  email: string;
  password: string;
  accountLabel: string;
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
};

type LoginResult<TUser extends LiveAuthUser = LiveAuthUser> = {
  status: number;
  ok: boolean;
  payload: LiveAuthPayload<TUser>;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function loginWithStandaloneRequest<
  TUser extends LiveAuthUser = LiveAuthUser,
>(options: LoginOptions): Promise<LoginResult<TUser>> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? 2));
  const timeoutMs = Math.max(5_000, Math.floor(options.timeoutMs ?? 30_000));
  const retryDelayMs = Math.max(
    0,
    Math.floor(options.retryDelayMs ?? 1_500),
  );
  const loginUrl = `${options.baseURL.replace(/\/$/, '')}/api/auth/login`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const api = await request.newContext();

    try {
      const response = await api.post(loginUrl, {
        data: {
          email: options.email,
          password: options.password,
        },
        timeout: timeoutMs,
      });

      let payload: LiveAuthPayload<TUser> = {};
      try {
        payload = (await response.json()) as LiveAuthPayload<TUser>;
      } catch {
        payload = {};
      }

      return {
        status: response.status(),
        ok: response.ok(),
        payload,
      };
    } catch (error) {
      lastError = error;

      if (attempt < attempts && retryDelayMs > 0) {
        await sleep(retryDelayMs);
      }
    } finally {
      await api.dispose();
    }
  }

  const reason =
    lastError instanceof Error
      ? lastError.message.replace(options.password, '[GIZLI]')
      : 'Bilinmeyen ağ hatası';

  throw new Error(
    `${options.accountLabel} giriş isteği ${attempts} denemede yanıt alamadı: ${reason}`,
  );
}
