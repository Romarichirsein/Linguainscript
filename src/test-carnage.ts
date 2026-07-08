import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "default");

async function checkCarnageAccount() {
  console.log("=== Checking carnage@gmail.com account details ===\n");
  
  // 1. Query exactly like the login flow does
  const cleanEmail = "carnage@gmail.com";
  const q = query(collection(db, "users"), where("email", "==", cleanEmail));
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout after 15 seconds")), 15000)
  );
  
  try {
    const snap: any = await Promise.race([getDocs(q), timeoutPromise]);
    
    if (snap.empty) {
      console.log("❌ No user found with email carnage@gmail.com");
    } else {
      console.log(`✅ Found ${snap.size} user(s) with email carnage@gmail.com:\n`);
      snap.forEach((doc: any) => {
        const data = doc.data();
        console.log(`--- Document ID: ${doc.id} ---`);
        console.log(JSON.stringify(data, null, 2));
        console.log(`\n  → Stored password: "${data.password || '(not set, default: lingua123)'}"`);
        console.log(`  → Role: ${data.role}`);
        console.log(`  → SchoolId: ${data.schoolId || '(none)'}`);
        console.log(`  → CampusId: ${data.campusId || '(none)'}`);
        console.log("");
      });
    }
  } catch (err: any) {
    console.error("❌ Query failed:", err.message);
  }

  // 2. Also check the schools collection for Carnage Academy
  console.log("\n=== Checking schools collection for Carnage Academy ===\n");
  try {
    const schoolsSnap = await getDocs(collection(db, "schools"));
    if (schoolsSnap.empty) {
      console.log("No schools found in the database.");
    } else {
      console.log(`Found ${schoolsSnap.size} school(s):`);
      schoolsSnap.forEach((doc: any) => {
        const data = doc.data();
        console.log(`\n--- School ID: ${doc.id} ---`);
        console.log(JSON.stringify(data, null, 2));
      });
    }
  } catch (err: any) {
    console.error("❌ Schools query failed:", err.message);
  }

  console.log("\n=== Done ===");
  process.exit(0);
}

checkCarnageAccount();
