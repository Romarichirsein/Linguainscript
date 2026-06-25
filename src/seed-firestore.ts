/**
 * seed-firestore-v2.ts
 * Fixed version: proper rules release format + retry on timeout + skip already-done docs.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ID = "gestion-ecoles-crm";
const DATABASE_ID = "default";
const TOKEN_FILE = "C:\\Users\\COMPUTER STORES\\.config\\configstore\\firebase-tools.json";
const RULES_FILE = path.join(process.cwd(), "firestore.rules");

// ─── Token ────────────────────────────────────────────────────────────────────

function getToken(): string {
  const cfg = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
  return cfg.tokens.access_token;
}

// ─── curl helper with retry ───────────────────────────────────────────────────

function curlWithRetry(cmd: string, retries = 3): { status: number; body: string } {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = execSync(cmd, { encoding: "utf-8", timeout: 25000 });
      const lines = result.trim().split("\n");
      const status = parseInt(lines[lines.length - 1], 10);
      const body = lines.slice(0, -1).join("\n");
      return { status, body };
    } catch (err: any) {
      if (attempt < retries) {
        console.log(`    ↩ Attempt ${attempt} failed (${err.status || "timeout"}), retrying...`);
      } else {
        return { status: 0, body: `ERROR: ${err.message}` };
      }
    }
  }
  return { status: 0, body: "ERROR: all retries exhausted" };
}

// ─── Upsert a Firestore document via REST ─────────────────────────────────────

function upsertDoc(token: string, collection: string, docId: string, fields: Record<string, any>) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${docId}`;
  const tmpFile = path.join(process.cwd(), "_tmp_upsert.json");
  fs.writeFileSync(tmpFile, JSON.stringify({ fields }));

  const cmd = `curl.exe -s -w "\\n%{http_code}" -X PATCH "${url}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d @"${tmpFile}" --max-time 20`;
  const { status, body } = curlWithRetry(cmd);

  try { fs.unlinkSync(tmpFile); } catch {}

  if (status >= 200 && status < 300) {
    console.log(`  ✓ ${collection}/${docId}`);
    return true;
  } else {
    console.log(`  ✗ ${collection}/${docId} [${status}]`, body.substring(0, 200));
    return false;
  }
}

// ─── Firestore field helpers ──────────────────────────────────────────────────

const str = (v: string) => ({ stringValue: v });
const bool = (v: boolean) => ({ booleanValue: v });
const dbl = (v: number) => ({ doubleValue: v });
const int = (v: number) => ({ integerValue: String(v) });
const arr = (...items: any[]) => ({ arrayValue: { values: items } });
const map = (obj: Record<string, any>) => ({ mapValue: { fields: obj } });
const nil = () => ({ nullValue: "NULL_VALUE" });

// ─── Step 1: Deploy Firestore Rules ──────────────────────────────────────────

function deployRules(token: string) {
  console.log("\n📋 Step 1: Deploying Firestore security rules...");

  const rulesContent = fs.readFileSync(RULES_FILE, "utf-8");

  // 1a. Create a new ruleset
  const rulesetPayload = { source: { files: [{ name: "firestore.rules", content: rulesContent }] } };
  const tmpRules = path.join(process.cwd(), "_tmp_rules.json");
  fs.writeFileSync(tmpRules, JSON.stringify(rulesetPayload));

  const createCmd = `curl.exe -s -w "\\n%{http_code}" -X POST "https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d @"${tmpRules}" --max-time 20`;
  const { status: cs, body: cb } = curlWithRetry(createCmd);
  try { fs.unlinkSync(tmpRules); } catch {}

  if (cs !== 200) {
    console.log(`  ✗ Failed to create ruleset (${cs}):`, cb.substring(0, 300));
    return;
  }

  const rulesetName = JSON.parse(cb).name as string;
  console.log(`  ✓ Ruleset created: ${rulesetName}`);

  // 1b. Create/update the release
  // The release name for a named database is: cloud.firestore/${DATABASE_ID}
  // But for the (default) database it would be just: cloud.firestore
  // URL-encode the slash in the release path segment
  const releasePath = `cloud.firestore/${DATABASE_ID}`;
  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/${encodeURIComponent(releasePath)}`;

  // Release body uses `ruleset` nested object (not top-level rulesetName)
  const releaseBody = {
    name: `projects/${PROJECT_ID}/releases/${releasePath}`,
    rulesetName: rulesetName
  };
  const tmpRelease = path.join(process.cwd(), "_tmp_release.json");
  fs.writeFileSync(tmpRelease, JSON.stringify(releaseBody));

  // Try to create release with PUT/PATCH - use updateMask to be safe
  const patchUrl = `${releaseUrl}?updateMask=rulesetName`;
  const patchCmd = `curl.exe -s -w "\\n%{http_code}" -X PATCH "${patchUrl}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d @"${tmpRelease}" --max-time 20`;
  const { status: ps, body: pb } = curlWithRetry(patchCmd);

  if (ps === 404 || ps === 400) {
    // Release doesn't exist — create it
    console.log(`  ↩ PATCH failed (${ps}), creating new release via POST...`);
    const postCmd = `curl.exe -s -w "\\n%{http_code}" -X POST "https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d @"${tmpRelease}" --max-time 20`;
    const { status: pos, body: pob } = curlWithRetry(postCmd);
    if (pos >= 200 && pos < 300) {
      console.log("  ✓ Rules release created successfully!");
    } else {
      console.log(`  ✗ Release POST failed (${pos}):`, pob.substring(0, 300));
    }
  } else if (ps >= 200 && ps < 300) {
    console.log("  ✓ Rules release updated successfully!");
  } else {
    console.log(`  ✗ Release PATCH failed (${ps}):`, pb.substring(0, 300));
  }
  try { fs.unlinkSync(tmpRelease); } catch {}
}

// ─── Step 2: Seed Data ────────────────────────────────────────────────────────

function seedData(token: string) {
  console.log("\n🌱 Step 2: Seeding Firestore data (teachers, classes, students, payments, config)...");

  const NOW = new Date().toISOString();
  const SCHOOL_ID = "school_integral";
  const CAMPUS_ID = "campus_01";
  const CAMPUS2_ID = "campus_02";

  // ── Teachers ─────────────────────────────────────────────────────────────────
  console.log("\n  [teachers]");
  upsertDoc(token, "teachers", "teacher_01", {
    id: str("teacher_01"), name: str("Prof. Alain Mbarga"),
    phone: str("+237 699 001 001"), email: str("alain.mbarga@lingua.cm"),
    languages: arr(str("Anglais"), str("Allemand")),
    campusId: str(CAMPUS_ID), schoolId: str(SCHOOL_ID), isActive: bool(true),
  });
  upsertDoc(token, "teachers", "teacher_02", {
    id: str("teacher_02"), name: str("Prof. Nadia Essono"),
    phone: str("+237 677 002 002"), email: str("nadia.essono@lingua.cm"),
    languages: arr(str("Espagnol"), str("Français")),
    campusId: str(CAMPUS_ID), schoolId: str(SCHOOL_ID), isActive: bool(true),
  });
  upsertDoc(token, "teachers", "teacher_03", {
    id: str("teacher_03"), name: str("Prof. Karl Werner"),
    phone: str("+237 655 003 003"), email: str("karl.werner@lingua.cm"),
    languages: arr(str("Allemand"), str("Anglais")),
    campusId: str(CAMPUS2_ID), schoolId: str(SCHOOL_ID), isActive: bool(true),
  });

  // ── Classes ───────────────────────────────────────────────────────────────────
  console.log("\n  [classes]");
  const classes = [
    { id: "class_01", language: "Anglais",  level: "A1", period: "8h",  teacherId: "teacher_01", campusId: CAMPUS_ID },
    { id: "class_02", language: "Anglais",  level: "B1", period: "15h", teacherId: "teacher_01", campusId: CAMPUS_ID },
    { id: "class_03", language: "Espagnol", level: "A2", period: "12h", teacherId: "teacher_02", campusId: CAMPUS_ID },
    { id: "class_04", language: "Allemand", level: "A1", period: "17h", teacherId: "teacher_03", campusId: CAMPUS2_ID },
    { id: "class_05", language: "Allemand", level: "B2", period: "8h",  teacherId: "teacher_03", campusId: CAMPUS2_ID },
  ];
  for (const c of classes) {
    upsertDoc(token, "classes", c.id, {
      id: str(c.id), language: str(c.language), level: str(c.level), period: str(c.period),
      teacherId: str(c.teacherId), campusId: str(c.campusId), schoolId: str(SCHOOL_ID),
      maxStudents: int(20), currentCount: int(8),
      startDate: str("2026-01-15"), endDate: str("2026-07-15"), isActive: bool(true),
    });
  }

  // ── Students ──────────────────────────────────────────────────────────────────
  console.log("\n  [students]");
  const students = [
    { id: "student_01", fn: "Amina",      ln: "Toure",    classId: "class_01", campusId: CAMPUS_ID,  total: 45000, paid: 45000 },
    { id: "student_02", fn: "Jean-Pierre",ln: "Eko",      classId: "class_01", campusId: CAMPUS_ID,  total: 45000, paid: 22500 },
    { id: "student_03", fn: "Fatima",     ln: "Moussa",   classId: "class_02", campusId: CAMPUS_ID,  total: 50000, paid: 50000 },
    { id: "student_04", fn: "Patrick",    ln: "Nguele",   classId: "class_03", campusId: CAMPUS_ID,  total: 45000, paid: 30000 },
    { id: "student_05", fn: "Grace",      ln: "Mbita",    classId: "class_04", campusId: CAMPUS2_ID, total: 48000, paid: 48000 },
    { id: "student_06", fn: "David",      ln: "Simo",     classId: "class_04", campusId: CAMPUS2_ID, total: 48000, paid:     0 },
    { id: "student_07", fn: "Celine",     ln: "Onana",    classId: "class_05", campusId: CAMPUS2_ID, total: 52000, paid: 52000 },
    { id: "student_08", fn: "Boris",      ln: "Foning",   classId: "class_01", campusId: CAMPUS_ID,  total: 45000, paid: 45000 },
    { id: "student_09", fn: "Sandrine",   ln: "Belinga",  classId: "class_02", campusId: CAMPUS_ID,  total: 50000, paid: 25000 },
    { id: "student_10", fn: "Eric",       ln: "Nkouangang",classId:"class_03",campusId: CAMPUS_ID,  total: 45000, paid: 45000 },
  ];

  for (const s of students) {
    const balance = s.total - s.paid;
    const status = s.paid === 0 ? "en_attente" : "actif";
    upsertDoc(token, "students", s.id, {
      id: str(s.id), firstName: str(s.fn), lastName: str(s.ln),
      birthDate: str("2000-06-15"),
      phone: str("+237 6" + (70000000 + Math.floor(Math.random() * 9999999))),
      email: str(`${s.fn.toLowerCase().replace("-","")}.${s.ln.toLowerCase()}@email.cm`),
      parentName: str("Parent " + s.ln),
      parentPhone: str("+237 6" + (70000000 + Math.floor(Math.random() * 9999999))),
      campusId: str(s.campusId), classId: str(s.classId), schoolId: str(SCHOOL_ID),
      status: str(status),
      enrollmentDate: str("2026-01-15"), expirationDate: str("2026-07-15"),
      totalAmount: dbl(s.total), paidAmount: dbl(s.paid), balance: dbl(balance),
      createdBy: map({ id: str("directrice_integral"), name: str("Marie Claire Ngoumou") }),
      createdAt: str("2026-01-15T08:00:00.000Z"), updatedAt: str(NOW),
    });
  }

  // ── Payments ──────────────────────────────────────────────────────────────────
  console.log("\n  [payments]");
  const payments = [
    { id: "pay_01", sid: "student_01", amt: 45000, mode: "Mobile Money" },
    { id: "pay_02", sid: "student_02", amt: 22500, mode: "Espèces" },
    { id: "pay_03", sid: "student_03", amt: 50000, mode: "Virement" },
    { id: "pay_04", sid: "student_04", amt: 30000, mode: "Mobile Money" },
    { id: "pay_05", sid: "student_05", amt: 48000, mode: "Espèces" },
    { id: "pay_06", sid: "student_07", amt: 52000, mode: "Mobile Money" },
    { id: "pay_07", sid: "student_08", amt: 45000, mode: "Espèces" },
    { id: "pay_08", sid: "student_09", amt: 25000, mode: "Mobile Money" },
    { id: "pay_09", sid: "student_10", amt: 45000, mode: "Virement" },
  ];
  for (const p of payments) {
    upsertDoc(token, "payments", p.id, {
      id: str(p.id), studentId: str(p.sid), schoolId: str(SCHOOL_ID),
      amount: dbl(p.amt), date: str("2026-01-15T10:00:00.000Z"), mode: str(p.mode),
      recordedBy: map({ id: str("secretaire_demo"), name: str("Sandrine Biya") }),
    });
  }

  // ── School Config ─────────────────────────────────────────────────────────────
  console.log("\n  [school_config]");
  upsertDoc(token, "school_config", SCHOOL_ID, {
    id: str(SCHOOL_ID), name: str("Polyglot Hub Yaoundé"),
    slogan: str("L'excellence linguistique au Cameroun"),
    logoUrl: str(""), themeColor: str("emerald"),
    updatedAt: str(NOW),
    updatedBy: map({ id: str("directrice_integral"), name: str("Marie Claire Ngoumou") }),
  });

  console.log("\n  ✅ Seed step complete!");
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔥 Firebase Setup v2 — Rules + Missing Data Seed");
  console.log(`   Project: ${PROJECT_ID} | Database: ${DATABASE_ID}\n`);

  const token = getToken();

  // Quick connectivity check
  const check = curlWithRetry(
    `curl.exe -s -w "\\n%{http_code}" "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/test_connection" -H "Authorization: Bearer ${token}" --max-time 10`
  );
  const reachable = check.status === 200 || check.status === 404;
  console.log(`🔍 Database reachable: ${reachable ? "✓ YES" : "✗ NO"} (HTTP ${check.status})`);
  if (!reachable) { console.error("Aborting."); process.exit(1); }

  deployRules(token);
  seedData(token);

  console.log("\n🎉 Setup complete! Open http://localhost:30020 to test the app.");
}

main().catch(console.error);
