import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);

async function testRead(dbId: string | undefined) {
  const dbName = dbId || "(default)";
  console.log(`\n=== Testing READ on database: ${dbName} ===`);
  const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  
  try {
    const readPromise = getDocs(collection(db, "users"));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout after 10 seconds")), 10000)
    );
    
    const snap: any = await Promise.race([readPromise, timeoutPromise]);
    console.log(`[${dbName}] SUCCESS! Found ${snap.size} user documents:`);
    snap.forEach((doc: any) => {
      const data = doc.data();
      console.log(`  - ${doc.id}: email=${data.email}, role=${data.role}, name=${data.name}`);
    });
  } catch (error: any) {
    console.error(`[${dbName}] FAILED:`, error.message || error);
    if (error.code) console.error(`  Error code: ${error.code}`);
  }
}

async function run() {
  // Only test the named "default" database (the one actually used by the app)
  await testRead("default");
  
  console.log("\nTest completed. Exiting...");
  process.exit(0);
}

run();
