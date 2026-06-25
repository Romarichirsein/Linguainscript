import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

console.log("Initializing Firebase with config:", firebaseConfig);

const app = initializeApp(firebaseConfig);

async function testDatabase(dbId: string | undefined) {
  const dbName = dbId || "(default)";
  console.log(`\n================ Testing database ID: ${dbName} ================`);
  const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  
  try {
    console.log(`[${dbName}] Attempting to write to collection 'test_connection'...`);
    // Set a timeout of 5 seconds for the write operation
    const docPromise = addDoc(collection(db, "test_connection"), {
      timestamp: new Date().toISOString(),
      status: "connected",
      dbId: dbName
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout after 5 seconds")), 5000)
    );
    
    const docRef: any = await Promise.race([docPromise, timeoutPromise]);
    console.log(`[${dbName}] SUCCESS: Document written with ID:`, docRef.id);
    
    console.log(`[${dbName}] Attempting to read from collection 'test_connection'...`);
    const querySnapshot = await getDocs(collection(db, "test_connection"));
    console.log(`[${dbName}] SUCCESS: Documents read:`);
    querySnapshot.forEach((doc) => {
      console.log(`  ${doc.id} =>`, doc.data());
    });
  } catch (error: any) {
    console.error(`[${dbName}] FAILED:`, error.message || error);
  }
}

async function run() {
  // Test default database (default)
  await testDatabase(undefined);
  
  // Test named database "default"
  await testDatabase("default");
  
  console.log("\nAll tests completed. Exiting...");
  process.exit(0);
}

run();
