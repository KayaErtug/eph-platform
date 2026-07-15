import { createHash, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  App,
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export type FirebasePhoneErrorReason =
  | 'INVALID_CODE'
  | 'INVALID_SESSION'
  | 'SESSION_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'PROVIDER_ERROR';

export class FirebasePhoneVerificationError extends Error {
  constructor(
    public readonly reason: FirebasePhoneErrorReason,
    public readonly providerCode?: string,
  ) {
    super(reason);
    this.name = 'FirebasePhoneVerificationError';
  }
}

interface FirebasePhoneSignInResponse {
  idToken?: string;
  localId?: string;
  phoneNumber?: string;
  isNewUser?: boolean;
}

interface FirebaseErrorResponse {
  error?: {
    message?: string;
  };
}

export interface VerifiedFirebasePhone {
  firebaseUid: string;
  phoneNumber: string;
  isNewFirebaseUser: boolean;
}

@Injectable()
export class FirebasePhoneVerificationService {
  private firebaseApp: App | null = null;

  normalizePhone(value: string): string {
    const input = String(value || '').trim();

    if (!input) {
      return '';
    }

    const digits = input.replace(/\D/g, '');

    if (input.startsWith('+')) {
      return `+${digits}`;
    }

    if (digits.length === 11 && digits.startsWith('0')) {
      return `+90${digits.slice(1)}`;
    }

    if (digits.length === 10 && digits.startsWith('5')) {
      return `+90${digits}`;
    }

    return `+${digits}`;
  }

  hashSessionInfo(sessionInfo: string): string {
    return createHash('sha256')
      .update(String(sessionInfo || ''), 'utf8')
      .digest('hex');
  }

  sessionInfoMatches(sessionInfo: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashSessionInfo(sessionInfo), 'utf8');

    const expected = Buffer.from(String(expectedHash || ''), 'utf8');

    if (actual.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  }

  async verifyCode(
    sessionInfo: string,
    code: string,
  ): Promise<VerifiedFirebasePhone> {
    const normalizedSessionInfo = String(sessionInfo || '').trim();

    const normalizedCode = String(code || '').trim();

    if (!normalizedSessionInfo) {
      throw new FirebasePhoneVerificationError('INVALID_SESSION');
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new FirebasePhoneVerificationError('INVALID_CODE');
    }

    const apiKey = String(process.env.FIREBASE_WEB_API_KEY || '').trim();

    if (!apiKey) {
      throw new FirebasePhoneVerificationError(
        'PROVIDER_ERROR',
        'FIREBASE_WEB_API_KEY_MISSING',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionInfo: normalizedSessionInfo,
            code: normalizedCode,
          }),
          signal: controller.signal,
        },
      );

      const payload = (await response.json()) as
        | FirebasePhoneSignInResponse
        | FirebaseErrorResponse;

      if (!response.ok) {
        const providerCode =
          'error' in payload ? String(payload.error?.message || '') : '';

        throw new FirebasePhoneVerificationError(
          this.mapProviderError(providerCode),
          providerCode || undefined,
        );
      }

      const result = payload as FirebasePhoneSignInResponse;

      if (!result.idToken || !result.localId || !result.phoneNumber) {
        throw new FirebasePhoneVerificationError(
          'PROVIDER_ERROR',
          'INCOMPLETE_PROVIDER_RESPONSE',
        );
      }

      const decodedToken = await getAuth(this.getFirebaseApp()).verifyIdToken(
        result.idToken,
        true,
      );

      if (decodedToken.uid !== result.localId) {
        throw new FirebasePhoneVerificationError(
          'PROVIDER_ERROR',
          'FIREBASE_UID_MISMATCH',
        );
      }

      const phoneNumber = this.normalizePhone(result.phoneNumber);

      if (!phoneNumber) {
        throw new FirebasePhoneVerificationError(
          'PROVIDER_ERROR',
          'FIREBASE_PHONE_MISSING',
        );
      }

      return {
        firebaseUid: decodedToken.uid,
        phoneNumber,
        isNewFirebaseUser: Boolean(result.isNewUser),
      };
    } catch (error) {
      if (error instanceof FirebasePhoneVerificationError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new FirebasePhoneVerificationError(
          'PROVIDER_ERROR',
          'FIREBASE_REQUEST_TIMEOUT',
        );
      }

      throw new FirebasePhoneVerificationError(
        'PROVIDER_ERROR',
        'FIREBASE_REQUEST_FAILED',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getFirebaseApp(): App {
    if (this.firebaseApp) {
      return this.firebaseApp;
    }

    const appName = 'eph-phone-verification';
    const existingApp = getApps().find((app) => app.name === appName);

    this.firebaseApp =
      existingApp ||
      initializeApp(
        {
          credential: applicationDefault(),
          projectId:
            process.env.FIREBASE_PROJECT_ID || 'otp-emlak-portfoy-havuzu',
        },
        appName,
      );

    return this.firebaseApp;
  }

  private mapProviderError(providerCode: string): FirebasePhoneErrorReason {
    const code = providerCode.toUpperCase();

    if (code.includes('INVALID_CODE') || code.includes('MISSING_CODE')) {
      return 'INVALID_CODE';
    }

    if (code.includes('SESSION_EXPIRED')) {
      return 'SESSION_EXPIRED';
    }

    if (
      code.includes('INVALID_SESSION_INFO') ||
      code.includes('MISSING_SESSION_INFO') ||
      code.includes('SESSION_INFO_MISMATCH')
    ) {
      return 'INVALID_SESSION';
    }

    if (code.includes('TOO_MANY_ATTEMPTS') || code.includes('QUOTA_EXCEEDED')) {
      return 'TOO_MANY_ATTEMPTS';
    }

    return 'PROVIDER_ERROR';
  }
}
