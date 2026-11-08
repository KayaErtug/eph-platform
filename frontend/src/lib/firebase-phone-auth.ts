import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

import { firebaseApp as messagingFirebaseApp } from "@/lib/firebase";

const PHONE_AUTH_APP_NAME = "eph-phone-auth";

void messagingFirebaseApp;

function requireFirebaseEnvironment(
  name: string,
  value: string | undefined,
): string {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(`Eksik Firebase ortam değişkeni: ${name}`);
  }

  return normalizedValue;
}

export function getFirebasePhoneAuth(): Auth {
  const existingApp = getApps().find((app) => app.name === PHONE_AUTH_APP_NAME);

  const phoneAuthApp =
    existingApp ||
    initializeApp(
      {
        apiKey: requireFirebaseEnvironment(
          "NEXT_PUBLIC_FIREBASE_API_KEY",
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        ),
        authDomain: requireFirebaseEnvironment(
          "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        ),
        projectId: requireFirebaseEnvironment(
          "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        ),
        storageBucket: requireFirebaseEnvironment(
          "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        ),
        messagingSenderId: requireFirebaseEnvironment(
          "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        ),
        appId: requireFirebaseEnvironment(
          "NEXT_PUBLIC_FIREBASE_APP_ID",
          process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        ),
      },
      PHONE_AUTH_APP_NAME,
    );

  const auth = getAuth(phoneAuthApp);
  auth.languageCode = "tr";

  return auth;
}
