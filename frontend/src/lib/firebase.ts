import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDS-uNx0fY6ZIxaIRboX2bmCddGx3rDNHc",
  authDomain: "eph-platform.firebaseapp.com",
  projectId: "eph-platform",
  storageBucket: "eph-platform.firebasestorage.app",
  messagingSenderId: "1092489352176",
  appId: "1:1092489352176:web:31c3ae821755d205448335",
  measurementId: "G-RD345JKGLV",
};

export const firebaseVapidKey =
  "BDEEZIf_HBJZZo5bfNSDNu9CaABh-IDAl8sfHd_fJpALITtc98PDzgaCwWN0fvBluaSAC5Oi7sd1WpnWtP4iFT0";

export const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

export async function getFirebaseMessaging() {
  const supported = await isSupported();

  if (!supported) {
    return null;
  }

  return getMessaging(firebaseApp);
}