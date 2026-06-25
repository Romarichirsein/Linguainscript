import fs from "fs";

// Use the fresh access token directly from the config file
const configPath = "C:\\Users\\COMPUTER STORES\\.config\\configstore\\firebase-tools.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const token = config.tokens.access_token;

console.log("Using access token (first 30 chars):", token.substring(0, 30) + "...");

async function run() {
  // 1. List all databases
  console.log("\n--- 1. Listing ALL databases ---");
  const listRes = await fetch("https://firestore.googleapis.com/v1/projects/gestion-ecoles-crm/databases", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const listText = await listRes.text();
  console.log("Status:", listRes.status);
  console.log("Response:", listText);

  // 2. Check (default) database
  console.log("\n--- 2. Checking '(default)' database ---");
  const defaultRes = await fetch("https://firestore.googleapis.com/v1/projects/gestion-ecoles-crm/databases/(default)", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Status:", defaultRes.status);
  console.log("Response:", await defaultRes.text());

  // 3. Check 'default' database (without parentheses) 
  console.log("\n--- 3. Checking 'default' database (no parens) ---");
  const namedRes = await fetch("https://firestore.googleapis.com/v1/projects/gestion-ecoles-crm/databases/default", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Status:", namedRes.status);
  console.log("Response:", await namedRes.text());

  // 4. Try write to 'default' database via REST
  console.log("\n--- 4. Writing to 'default' (no parens) ---");
  const writeRes = await fetch("https://firestore.googleapis.com/v1/projects/gestion-ecoles-crm/databases/default/documents/test_connection", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        status: { stringValue: "REST OK" },
        timestamp: { stringValue: new Date().toISOString() }
      }
    })
  });
  console.log("Status:", writeRes.status);
  console.log("Response:", await writeRes.text());

  // 5. Try write to '(default)' database via REST
  console.log("\n--- 5. Writing to '(default)' ---");
  const writeDefaultRes = await fetch("https://firestore.googleapis.com/v1/projects/gestion-ecoles-crm/databases/(default)/documents/test_connection", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        status: { stringValue: "REST (default) OK" },
        timestamp: { stringValue: new Date().toISOString() }
      }
    })
  });
  console.log("Status:", writeDefaultRes.status);
  console.log("Response:", await writeDefaultRes.text());
}

run().catch(console.error);
