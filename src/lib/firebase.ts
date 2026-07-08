import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
// NOTE: The Firestore database was created with ID "default" (not the implicit "(default)").
// We must pass the database ID explicitly so the SDK connects to the correct database.
// Using memoryLocalCache instead of persistentLocalCache to avoid IndexedDB
// corruption/locking issues that can cause the SDK to hang in the browser.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, "default");
export const auth = getAuth(app);
