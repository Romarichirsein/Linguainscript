import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { Campus, Class, Student } from "../types";
import {
  FileSpreadsheet,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  X,
  Play
} from "lucide-react";

interface StudentSheetsImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export const StudentSheetsImport: React.FC<StudentSheetsImportProps> = ({
  onClose,
  onImportComplete
}) => {
  const { campuses, classes, addStudent, currentUser } = useData();

  // Wizard States
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Step 2 Mapping Configuration
  const [targetCampusId, setTargetCampusId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  
  const [mapping, setMapping] = useState({
    firstNameIdx: -1,
    lastNameIdx: -1,
    phoneIdx: -1,
    emailIdx: -1,
    birthDateIdx: -1,
    parentNameIdx: -1,
    parentPhoneIdx: -1,
    totalAmountIdx: -1,
    paidAmountIdx: -1
  });

  // Step 3 Selected rows
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});

  // Step 4 Import results log
  const [importResults, setImportResults] = useState<{
    successCount: number;
    failedCount: number;
    waitlistedCount: number;
    logs: string[];
  }>({
    successCount: 0,
    failedCount: 0,
    waitlistedCount: 0,
    logs: []
  });

  // Filter classes belonging to target campus
  const campusClasses = useMemo(() => {
    return classes.filter(c => c.campusId === targetCampusId);
  }, [classes, targetCampusId]);

  // Clean and transform Google Sheets URL to CSV output
  const extractExportUrl = (url: string): string => {
    let cleanUrl = url.trim();
    
    if (cleanUrl.includes("/pub?") && cleanUrl.includes("output=csv")) {
      return cleanUrl;
    }
    
    const dMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (dMatch) {
      const sheetId = dMatch[1];
      let gid = "";
      const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch) {
        gid = gidMatch[1];
      }
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
    }
    
    const eMatch = cleanUrl.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
    if (eMatch) {
      const pubId = eMatch[1];
      return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`;
    }
    
    return cleanUrl;
  };

  // Safe CSV parser supporting commas and semicolons
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = "";
    
    const cleanText = text.replace(/\r\n/g, "\n");
    
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; 
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = "";
      } else if (char === ';' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = "";
      } else if (char === '\n' && !inQuotes) {
        row.push(currentVal.trim());
        lines.push(row);
        row = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      lines.push(row);
    }
    
    return lines.filter(r => r.length > 0 && r.some(v => v !== ""));
  };

  // Step 1: Connect and fetch sheet
  const handleFetchSheet = async () => {
    if (!sheetUrl) {
      setErrorMessage("Veuillez renseigner un lien Google Sheets public.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const finalExportUrl = extractExportUrl(sheetUrl);

    try {
      const response = await fetch(finalExportUrl);
      if (!response.ok) {
        throw new Error("Impossible d'accéder au fichier. Vérifiez qu'il est public.");
      }

      const text = await response.text();
      const parsed = parseCSV(text);

      if (parsed.length < 2) {
        setErrorMessage("Le document Sheets semble vide ou ne continent pas assez de lignes (en-tête + données minimum).");
        setIsLoading(false);
        return;
      }

      setRawText(text);
      const csvHeaders = parsed[0];
      const csvRows = parsed.slice(1);

      setHeaders(csvHeaders);
      setRows(csvRows);

      // Attempt automatic mapping based on heuristics
      const autoMapping = { ...mapping };
      csvHeaders.forEach((header, idx) => {
        const val = header.toLowerCase();
        if (val.includes("prénom") || val.includes("prenom") || val.includes("first name")) {
          autoMapping.firstNameIdx = idx;
        } else if (val.includes("nom") || val.includes("last name") || val.includes("famille")) {
          autoMapping.lastNameIdx = idx;
        } else if (val.includes("tél") || val.includes("telephone") || val.includes("phone")) {
          autoMapping.phoneIdx = idx;
        } else if (val.includes("mail") || val.includes("email") || val.includes("courriel")) {
          autoMapping.emailIdx = idx;
        } else if (val.includes("naissance") || val.includes("birth") || val.includes("age")) {
          autoMapping.birthDateIdx = idx;
        } else if (val.includes("parent") || val.includes("tuteur") || val.includes("garde")) {
          autoMapping.parentNameIdx = idx;
        } else if (val.includes("parent phone") || val.includes("parent tel") || val.includes("tuteur phone")) {
          autoMapping.parentPhoneIdx = idx;
        } else if (val.includes("total") || val.includes("scolarité") || val.includes("prix") || val.includes("frais")) {
          autoMapping.totalAmountIdx = idx;
        } else if (val.includes("pay") || val.includes("versé") || val.includes("acompte")) {
          autoMapping.paidAmountIdx = idx;
        }
      });

      setMapping(autoMapping);

      // Initialize all rows as checked
      const checked: Record<number, boolean> = {};
      csvRows.forEach((_, index) => {
        checked[index] = true;
      });
      setSelectedRows(checked);

      // Set default campus and class if available
      if (campuses.length > 0) {
        setTargetCampusId(campuses[0].id);
      }

      setStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        "Erreur de connexion. Veuillez vous assurer que l'option 'Partager' -> 'Tous les utilisateurs disposant du lien : Lecteur' est bien configurée sur votre Google Sheet ou essayez d'utiliser le menu 'Fichier' -> 'Publier sur le Web' au format CSV."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper component to bind target classes on campus change
  const handleCampusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const campusId = e.target.value;
    setTargetCampusId(campusId);
    const related = classes.filter(c => c.campusId === campusId);
    if (related.length > 0) {
      setTargetClassId(related[0].id);
    } else {
      setTargetClassId("");
    }
  };

  // Handle configuration verification to proceed to Step 3 Preview
  const handleGoToPreview = () => {
    if (!targetCampusId) {
      setErrorMessage("Veuillez sélectionner un Campus d'affectation.");
      return;
    }
    if (!targetClassId) {
      setErrorMessage("Veuillez sélectionner une Classe d'affectation.");
      return;
    }
    if (mapping.firstNameIdx === -1 || mapping.lastNameIdx === -1) {
      setErrorMessage("Veuillez faire correspondre au minimum les colonnes Prénom et Nom du document.");
      return;
    }
    setErrorMessage("");
    setStep(3);
  };

  // Map parsed index to custom values with safe defaults
  const getMappedValue = (row: string[], index: number, defaultValue: string = ""): string => {
    if (index === -1 || index >= row.length) return defaultValue;
    return row[index] || defaultValue;
  };

  const getMappedNumber = (row: string[], index: number, defaultValue: number = 0): number => {
    if (index === -1 || index >= row.length) return defaultValue;
    const cleanStr = (row[index] || "").replace(/[^0-9]/g, "");
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Trigger registration loops using context functions
  const handleProcessImport = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setStep(4);

    let successes = 0;
    let failures = 0;
    let waitlisted = 0;
    const processLogs: string[] = [];

    const selectedClass = classes.find(c => c.id === targetClassId);
    const defaultFees = selectedClass ? selectedClass.totalAmount : 30000;

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      if (!selectedRows[rIdx]) continue;

      const row = rows[rIdx];
      const firstName = getMappedValue(row, mapping.firstNameIdx);
      const lastName = getMappedValue(row, mapping.lastNameIdx);

      if (!firstName || !lastName) {
        failures++;
        processLogs.push(`❌ Ligne ${rIdx + 2}: Prénom ou Nom absent. Importation impossible.`);
        continue;
      }

      const sPhone = getMappedValue(row, mapping.phoneIdx, "00000000");
      const sEmail = getMappedValue(row, mapping.emailIdx, `${firstName.toLowerCase().replace(/\s/g, "")}.${lastName.toLowerCase().replace(/\s/g, "")}@import.com`);
      const sBirth = getMappedValue(row, mapping.birthDateIdx, "2005-01-01");
      const pName = getMappedValue(row, mapping.parentNameIdx, "Non spécifié");
      const pPhone = getMappedValue(row, mapping.parentPhoneIdx, "00000000");
      const totalAmount = getMappedNumber(row, mapping.totalAmountIdx, defaultFees);
      const paidAmount = getMappedNumber(row, mapping.paidAmountIdx, 0);

      const payload = {
        firstName,
        lastName,
        phone: sPhone,
        email: sEmail,
        birthDate: sBirth,
        parentName: pName,
        parentPhone: pPhone,
        campusId: targetCampusId,
        classId: targetClassId,
        totalAmount,
        enrollmentDate: new Date().toISOString().split("T")[0],
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 30 Days registration
      };

      try {
        const result = await addStudent(
          payload,
          paidAmount,
          paidAmount > 0 ? "Espèces" : null,
          "Importé par Google Sheets",
          true // Always set auto to waitlist if class hits limits
        );

        if (result.success) {
          if (result.waitlistId) {
            waitlisted++;
            processLogs.push(`⏳ ${firstName} ${lastName} a été placé en liste d'attente (Classe saturée).`);
          } else {
            successes++;
            processLogs.push(`✅ ${firstName} ${lastName} importé avec succès (${paidAmount.toLocaleString()} FCFA payés).`);
          }
        } else {
          failures++;
          processLogs.push(`❌ ${firstName} ${lastName} : ${result.message || "Erreur indéterminée"}`);
        }
      } catch (err: any) {
        failures++;
        processLogs.push(`❌ ${firstName} ${lastName} : Erreur serveur (${err?.message || "Inconnu"})`);
      }
    }

    setImportResults({
      successCount: successes,
      failedCount: failures,
      waitlistedCount: waitlisted,
      logs: processLogs
    });

    setIsLoading(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm max-w-4xl mx-auto space-y-5 animate-fadeIn font-sans">
      
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-850">Importation depuis Google Sheets</h3>
            <p className="text-[10px] text-slate-400">Migration accélérée de vos effectifs d'élèves</p>
          </div>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Stepper Status Indicators */}
      <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-3">
        <span className={`px-2.5 py-1 rounded-full ${step === 1 ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400"}`}>
          1. Lien
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className={`px-2.5 py-1 rounded-full ${step === 2 ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400"}`}>
          2. Mappage
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className={`px-2.5 py-1 rounded-full ${step === 3 ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400"}`}>
          3. Aperçu
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className={`px-2.5 py-1 rounded-full ${step === 4 ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400"}`}>
          4. Résultats
        </span>
      </div>

      {/* Warning/Error banners inside component */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* STEP 1: SHEET LINK INPUT AND RETRIEVAL */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Lien public ou publié Google Sheets</label>
            <input
              type="text"
              placeholder="Ex: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit?usp=sharing"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-150 p-4 space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
              <Info className="h-4.5 w-4.5 text-blue-600" />
              Comment configurer votre Google Sheet pour l'import ?
            </div>
            
            <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed text-[11px] text-slate-550">
              <li>Ouvrez votre document Google Sheets qui contient vos élèves.</li>
              <li>Cliquez sur le bouton bleu <strong className="text-blue-700">Partager</strong> en haut à droite.</li>
              <li>Sous "Accès général", changez "Limité" en <strong className="text-blue-700">Tous les utilisateurs disposant du lien</strong> en tant que **Lecteur** (Viewer).</li>
              <li>Copiez le lien complet et collez-le ci-dessus pour que notre système le lise instantanément.</li>
            </ol>
            <p className="text-[10px] text-slate-400 pt-1 leading-snug">
              🚨 Heuristique d'importation : Notre algorithme d'importation map automatiquement les colonnes aux accents équivalents (Prénom, Nom, Téléphone, E-mail etc.).
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={handleFetchSheet}
              disabled={isLoading}
              type="button"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs py-2 px-4 shadow transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Connexion au fichier...
                </>
              ) : (
                <>
                  Analyser la feuille <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ASSIGNMENT & HEADER COLUMNS MAPPING */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">1. Campus d'affectation</label>
              <select
                value={targetCampusId}
                onChange={handleCampusChange}
                className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
              >
                <option value="">Sélectionner un Campus</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">2. Classe de destination</label>
              <select
                value={targetClassId}
                onChange={e => setTargetClassId(e.target.value)}
                className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
              >
                <option value="">Sélectionner une Classe</option>
                {campusClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.language} {c.level} - {c.period} ({c.currentCount}/{c.maxStudents})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">3. Faire correspondre les colonnes</h4>
            <p className="text-[10px] text-slate-400">Associez les champs requis aux colonnes détectées dans votre document Sheets.</p>

            <div className="grid gap-3.5 sm:grid-cols-3 max-h-72 overflow-y-auto pr-1">
              
              {/* First name */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655 flex items-center gap-1">
                  Prénom <strong className="text-rose-500">*</strong>
                </span>
                <select
                  value={mapping.firstNameIdx}
                  onChange={e => setMapping({ ...mapping, firstNameIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Non spécifié --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Last name */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655 flex items-center gap-1">
                  Nom de Famille <strong className="text-rose-500">*</strong>
                </span>
                <select
                  value={mapping.lastNameIdx}
                  onChange={e => setMapping({ ...mapping, lastNameIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Non spécifié --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655">Téléphone d'Élève</span>
                <select
                  value={mapping.phoneIdx}
                  onChange={e => setMapping({ ...mapping, phoneIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Non spécifié --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655">Adresse E-mail</span>
                <select
                  value={mapping.emailIdx}
                  onChange={e => setMapping({ ...mapping, emailIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Non spécifié --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* BirthDate */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655">Date de naissance</span>
                <select
                  value={mapping.birthDateIdx}
                  onChange={e => setMapping({ ...mapping, birthDateIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Non spécifié --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Parent Name */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655">Parent / Tuteur</span>
                <select
                  value={mapping.parentNameIdx}
                  onChange={e => setMapping({ ...mapping, parentNameIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Non spécifié --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Parent Phone */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655">Téléphone Parent</span>
                <select
                  value={mapping.parentPhoneIdx}
                  onChange={e => setMapping({ ...mapping, parentPhoneIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Non spécifié --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Total Scolarite */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-655">Scolarité totale (CFA)</span>
                <select
                  value={mapping.totalAmountIdx}
                  onChange={e => setMapping({ ...mapping, totalAmountIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white"
                >
                  <option value="-1">-- Utiliser Frais de Cours --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Paid Amount */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-indigo-600">Acompte / Montant payé (CFA)</span>
                <select
                  value={mapping.paidAmountIdx}
                  onChange={e => setMapping({ ...mapping, paidAmountIdx: parseInt(e.target.value, 10) })}
                  className="rounded-xl border border-slate-200 p-1.5 text-xs text-slate-700 bg-white hover:border-indigo-400 focus:border-indigo-500"
                >
                  <option value="-1">-- Utiliser 0 FCFA --</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Colonne ${idx + 1}`}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
            <button
              onClick={() => setStep(1)}
              type="button"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold transition cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" /> Changer de fichier
            </button>

            <button
              onClick={handleGoToPreview}
              type="button"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold py-2 px-4 shadow transition cursor-pointer"
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATA GRID PREVIEW & SELECTION */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Détection confirmée</p>
              <h4 className="text-xs font-bold text-slate-800">Cochez les prospects / étudiants à enregistrer</h4>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <button
                type="button"
                onClick={() => {
                  const check: Record<number, boolean> = {};
                  rows.forEach((_, idx) => { check[idx] = true; });
                  setSelectedRows(check);
                }}
                className="hover:text-blue-600 bg-slate-100 px-2 py-1 rounded"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={() => setSelectedRows({})}
                className="hover:text-amber-600 bg-slate-100 px-2 py-1 rounded"
              >
                Tout décocher
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl max-h-80">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-150 sticky top-0 bg-white">
                <tr>
                  <th className="p-2.5 text-center w-12 bg-slate-100">Inscrire</th>
                  <th className="p-2.5">Prénom</th>
                  <th className="p-2.5">Nom de Famille</th>
                  <th className="p-2.5">Téléphone</th>
                  <th className="p-2.5">Scolarité</th>
                  <th className="p-2.5">Payé</th>
                  <th className="p-2.5">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {rows.map((row, index) => {
                  const fName = getMappedValue(row, mapping.firstNameIdx);
                  const lName = getMappedValue(row, mapping.lastNameIdx);
                  const phone = getMappedValue(row, mapping.phoneIdx, "Non renseigné");
                  
                  const selectedClass = classes.find(c => c.id === targetClassId);
                  const defaultFees = selectedClass ? selectedClass.totalAmount : 30000;
                  const total = getMappedNumber(row, mapping.totalAmountIdx, defaultFees);
                  const paid = getMappedNumber(row, mapping.paidAmountIdx, 0);
                  const isChecked = !!selectedRows[index];

                  return (
                    <tr key={index} className={`hover:bg-slate-50/75 transition-colors ${!isChecked ? "opacity-50" : ""}`}>
                      <td className="p-2 w-12 text-center bg-slate-50/50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => setSelectedRows({ ...selectedRows, [index]: e.target.checked })}
                          className="h-3.5 w-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-bold">{fName || "— absant —"}</td>
                      <td className="p-2.5 font-bold uppercase">{lName || "— absant —"}</td>
                      <td className="p-2.5 font-mono">{phone}</td>
                      <td className="p-2.5 font-mono text-slate-800">{total.toLocaleString()} FCFA</td>
                      <td className="p-2.5 font-mono text-emerald-600">{paid.toLocaleString()} FCFA</td>
                      <td className="p-2.5 font-mono text-red-650 font-bold">{(total - paid).toLocaleString()} FCFA</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
            <button
              onClick={() => setStep(2)}
              type="button"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold transition cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" /> Revenir au mappage
            </button>

            <button
              onClick={handleProcessImport}
              type="button"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold py-2 px-5 shadow transition cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" /> Lancer l'Importation ({Object.values(selectedRows).filter(Boolean).length})
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT OUTCOME REPORTS */}
      {step === 4 && (
        <div className="space-y-4 text-xs">
          
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <span className="block text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Succès Clôturés</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">{importResults.successCount}</p>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
              <span className="block text-[10px] text-amber-500 font-bold uppercase tracking-wider">Mises en attente</span>
              <p className="text-xl font-extrabold text-amber-700 mt-1">{importResults.waitlistedCount}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rejetés / Échecs</span>
              <p className="text-xl font-extrabold text-slate-700 mt-1">{importResults.failedCount}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Rapport global d'Activité</h4>
            
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10px] space-y-1 max-h-48 overflow-y-auto leading-relaxed border border-slate-800">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="text-slate-400">Importation du roster en cours...</span>
                </div>
              ) : (
                importResults.logs.map((l, idx) => (
                  <p key={idx}>{l}</p>
                ))
              )}
            </div>
          </div>

          {!isLoading && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                type="button"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold py-2 px-5 cursor-pointer shadow transition"
              >
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" /> Clôturer et Rafraîchir
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
