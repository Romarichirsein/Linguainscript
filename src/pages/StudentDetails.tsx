import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { Student, UserRole } from "../types";
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  User,
  MapPin,
  Clock,
  Printer,
  BadgeCent,
  Shield,
  FileText,
  AlertTriangle,
  History,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { generateReceipt } from "../utils/generateReceipt";
import { generateInvoice } from "../utils/generateInvoice";
import { generateCertificate } from "../utils/generateCertificate";

interface StudentDetailsProps {
  studentId: string;
  onBack: () => void;
  setCurrentTab: (tab: string) => void;
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({
  studentId,
  onBack,
  setCurrentTab
}) => {
  const { students, classes, campuses, teachers, payments, auditLogs, addPayment, renewStudent, schoolConfig, updateStudent, reminders, addReminder, currentPlan, deleteStudent, currentUser } = useData();

  const [activeSubTab, setActiveSubTab] = useState<"payments" | "history" | "reminders">("payments");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Reminders / Notification states
  const [sendingSimulation, setSendingSimulation] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string>("");
  const [reminderMedium, setReminderMedium] = useState<"email" | "sms" | "whatsapp">("email");
  const [customReminderNotes, setCustomReminderNotes] = useState("");
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);

  // Payment capture sub-form states
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<"Espèces" | "Mobile Money" | "Virement">("Espèces");
  const [payNote, setPayNote] = useState("");

  // Renewal sub-form states
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalAmount, setRenewalAmount] = useState("180000");
  const [renewalPayment, setRenewalPayment] = useState("180000");
  const [renewalMode, setRenewalMode] = useState<"Espèces" | "Mobile Money" | "Virement">("Espèces");

  // Lookup entities
  const student = useMemo(() => {
    return students.find(s => s.id === studentId);
  }, [students, studentId]);

  const studentClass = useMemo(() => {
    if (!student) return undefined;
    return classes.find(c => c.id === student.classId);
  }, [classes, student]);

  const studentCampus = useMemo(() => {
    if (!student) return undefined;
    return campuses.find(c => c.id === student.campusId);
  }, [campuses, student]);

  const teacher = useMemo(() => {
    if (!studentClass) return undefined;
    return teachers.find(t => t.id === studentClass.teacherId);
  }, [teachers, studentClass]);

  const studentPayments = useMemo(() => {
    const baseList = payments.filter(p => p.studentId === studentId);
    // Sort oldest first to determine absolute chronological reference index
    const chronologicalList = [...baseList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const indexed = chronologicalList.map((p, idx) => ({
      ...p,
      chronologicalIndex: idx + 1
    }));
    // Sort based on sortAsc setting
    return indexed.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [payments, studentId, sortAsc]);

  const studentLogs = useMemo(() => {
    return auditLogs.filter(log => log.targetId === studentId);
  }, [auditLogs, studentId]);

  const studentReminders = useMemo(() => {
    return reminders.filter(r => r.studentId === studentId);
  }, [reminders, studentId]);

  const defaultReminderText = useMemo(() => {
    if (!student) return "";
    const name = student.firstName + " " + student.lastName;
    const levelAndLang = studentClass ? `${studentClass.language} ${studentClass.level}` : "cours";
    
    if (student.balance > 0) {
      return `Bonjour ${student.parentName || (student.firstName + ' ' + student.lastName)},\n\nCeci est un rappel de scolarité concernant l'inscription de l'élève ${name} (Classe: ${levelAndLang}) au centre de cours de langues ${schoolConfig?.name || "LinguaInscript"}.\nUn solde débiteur de ${student.balance.toLocaleString()} FCFA est toujours en attente de régularisation pour l'année académique.\n\nMerci de libérer ce montant restant au plus vite par Espèces, Orange Money / MTN Mobile Money, ou par versement bancaire.\n\nCordialement,\nLa direction de ${schoolConfig?.name || "LinguaInscript"}`;
    } else {
      return `Bonjour ${student.parentName || (student.firstName + ' ' + student.lastName)},\n\nNous vous informons de la fin de cycle d'inscription imminente de l'élève ${name} (Classe: ${levelAndLang}) au sein de ${schoolConfig?.name || "LinguaInscript"}.\nL'échéance administrative est fixée au ${new Date(student.expirationDate).toLocaleDateString("fr-FR")}.\nPour continuer à assister aux cours sans interruption, vous pouvez renouveler le contrat annuel auprès du secrétariat.\n\nCordialement,\nLa direction de ${schoolConfig?.name || "LinguaInscript"}`;
    }
  }, [student, studentClass, schoolConfig, reminderMedium]);

  const handleSendReminder = async () => {
    if (!student) return;
    setSendingSimulation(true);
    setSimulationStep("1. Génération du canal de communication...");
    await new Promise(r => setTimeout(r, 1000));
    setSimulationStep("2. Transmission du message par la passerelle...");
    await new Promise(r => setTimeout(r, 1000));
    setSimulationStep("3. Réception de la notification par le destinataire...");
    await new Promise(r => setTimeout(r, 800));
    
    const textToSend = customReminderNotes || defaultReminderText;
    const typeObj = student.balance > 0 ? "overdue_account" : "upcoming_deadline";

    await addReminder({
      studentId: student.id,
      studentName: student.firstName + " " + student.lastName,
      studentEmail: student.email,
      type: typeObj,
      status: "sent",
      medium: reminderMedium,
      amountDue: student.balance,
      dueDate: student.expirationDate,
      notes: textToSend,
      sentAt: new Date().toISOString()
    });

    setSendingSimulation(false);
    setSimulationStep("");
    setCustomReminderNotes("");
    alert("🔔 Message délivré de manière simulée avec succès ! Le log a été enregistré dans le registre de relances de l'étudiant.");
  };

  // Compute expirations thresholds
  const daysLeft = useMemo(() => {
    if (!student) return 0;
    const diff = new Date(student.expirationDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [student]);

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-xs">
        Élève introuvable dans la base de données.
        <button onClick={onBack} className="block mx-auto mt-4 text-blue-600 font-semibold cursor-pointer">
          Retour au registre
        </button>
      </div>
    );
  }

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      alert("Veuillez saisir un montant d'encaissement valide.");
      return;
    }

    addPayment(student.id, amount, payMode, payNote);
    
    // Clear inputs
    setPayAmount("");
    setPayNote("");
  };

  const handleRenewalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(renewalAmount);
    const initialPay = parseFloat(renewalPayment);

    if (isNaN(cost) || isNaN(initialPay)) {
      alert("Veuillez saisir des montants valides.");
      return;
    }

    // Extend expiration date for 1 year
    const nextYear = new Date(student.expirationDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const newExp = nextYear.toISOString().split("T")[0];

    renewStudent(student.id, newExp, cost, initialPay, renewalMode);
    setShowRenewalModal(false);
  };

  const triggerExportReceipt = (pay: any) => {
    generateReceipt(student, pay, studentClass, studentCampus, schoolConfig);
  };

  const triggerExportInvoice = () => {
    generateInvoice(student, studentClass, studentCampus, studentPayments, schoolConfig);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au registre des élèves
        </button>
      </div>

      {/* Exterminating unfair expulsions notifications */}
      {student.balance > 0 && student.status === "actif" && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex gap-4 items-center justify-between flex-wrap md:flex-nowrap animate-fadeIn">
          <div className="flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <h4 className="font-bold">Attention — Profil Débiteur Solde restante</h4>
              <p className="mt-1 leading-relaxed">
                Cet élève a un solde restant de <b>{student.balance.toLocaleString()} FCFA</b> à payer sur son inscription. 
                <span className="font-bold italic"> Rappel réglementaire</span> : Ne pas suspendre de cours cet élève s'il a déjà versé un acompte partiel sur son inscription. Utilisez le formulaire d'encaissement et de scolarité ci-dessous pour solder le compte.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab("reminders")}
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm shadow-red-200 cursor-pointer transition whitespace-nowrap"
          >
            📢 Déclencher Relance
          </button>
        </div>
      )}

      {/* soon expiring banner */}
      {daysLeft >= 0 && daysLeft <= 14 && student.status === "actif" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-4 items-center justify-between flex-wrap md:flex-nowrap animate-fadeIn">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-650 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <h4 className="font-bold">Alerte de Renouvellement Expirant</h4>
              <p className="mt-1 leading-relaxed">
                L'inscription de l'élève se termine dans <b>{daysLeft} jours</b>. Veuillez avertir le parent 
                et cliquer sur le bouton <b>Renouveler l'Inscription</b> pour prolonger son dossier.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab("reminders")}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm shadow-amber-200 cursor-pointer transition whitespace-nowrap"
          >
            📢 Relancer Parent
          </button>
        </div>
      )}

      {/* Main split grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Student Cards details */}
        <div className="lg:col-span-4 space-y-6">
          {/* Identity block */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 uppercase">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            
            <h3 className="font-sans font-bold text-lg text-slate-800 mt-4">
              {student.firstName} {student.lastName}
            </h3>
            
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${
                student.status === "actif"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : student.status === "en_attente"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : student.status === "terminé"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : student.status === "archivé"
                  ? "bg-slate-100 text-slate-700 border-slate-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {student.status === "en_attente"
                  ? "Attente"
                  : student.status === "terminé"
                  ? "Terminé"
                  : student.status === "archivé"
                  ? "Archivé"
                  : student.status}
              </span>
            </div>

            {/* Expiring timeline progress */}
            <div className="mt-6 border-t border-slate-100 pt-4 text-left text-xs space-y-3 text-slate-600">
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
                <span>RENOUVELLEMENT</span>
                {daysLeft > 0 ? (
                  <span className="text-blue-600">{daysLeft} jours restants</span>
                ) : (
                  <span className="text-red-500 font-bold">Expiré</span>
                )}
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${daysLeft <= 14 ? "bg-amber-500" : "bg-blue-600"}`}
                  style={{ width: `${Math.max(0, Math.min(100, (daysLeft / 365) * 100))}%` }}
                />
              </div>

              <div className="flex justify-between bg-slate-50 p-2.5 rounded-lg text-[11px] font-mono border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Inscription</span>
                  <span>{new Date(student.enrollmentDate).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block mb-0.5">Échéance</span>
                  <span className={daysLeft <= 14 ? "text-red-650 font-bold" : ""}>
                    {new Date(student.expirationDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2.5">
              Fiche de Contact complet
            </h4>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <label className="text-[10px] text-slate-400 block">Téléphone de l'élève</label>
                  <span className="font-semibold text-slate-800 font-mono">{student.phone}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <label className="text-[10px] text-slate-400 block">Adresse Email</label>
                  <span className="font-semibold text-slate-800">{student.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <label className="text-[10px] text-slate-400 block">Date de naissance</label>
                  <span className="font-semibold text-slate-800">{new Date(student.birthDate).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>

              {/* Parents emergency card details */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <label className="text-[10px] text-slate-400 block">Parent / Tuteur (Urgence)</label>
                    <span className="font-bold text-slate-800 block">{student.parentName}</span>
                    <span className="font-semibold text-slate-500 font-mono">{student.parentPhone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags / Étiquettes de suivi */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                🏷️ Étiquettes de suivi (Tags)
              </h4>
              <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded font-mono">
                {(student.tags || []).length}
              </span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 font-sans">
              {/* Add tag form */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nouveau tag... (ex: En attente)"
                    id="new-tag-input"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        const input = e.currentTarget;
                        const val = input.value.trim();
                        if (val && !(student.tags || []).includes(val)) {
                          const updatedTags = [...(student.tags || []), val];
                          await updateStudent(student.id, { tags: updatedTags });
                          input.value = "";
                        }
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-550 bg-white"
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById("new-tag-input") as HTMLInputElement | null;
                      const val = input?.value?.trim();
                      if (val && !(student.tags || []).includes(val)) {
                        const updatedTags = [...(student.tags || []), val];
                        await updateStudent(student.id, { tags: updatedTags });
                        if (input) input.value = "";
                      }
                    }}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white px-3 py-1.5 text-xs cursor-pointer transition whitespace-nowrap"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Suggested template tags */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase block">Suggestions rapides :</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Niveau débutant",
                      "Relance paiement",
                      "En attente",
                      "Dossier incomplet",
                      "Excellent élève"
                    ].map((sugg) => {
                      const exists = (student.tags || []).includes(sugg);
                      return (
                        <button
                          key={sugg}
                          disabled={exists}
                          onClick={async () => {
                            const updatedTags = [...(student.tags || []), sugg];
                            await updateStudent(student.id, { tags: updatedTags });
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-medium border transition cursor-pointer ${
                            exists
                              ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                              : "bg-blue-50/50 border-blue-100 text-blue-700 hover:bg-blue-50"
                          }`}
                        >
                          + {sugg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active tags display list */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 font-semibold uppercase block mb-2">Pills actives :</span>
                {(!student.tags || student.tags.length === 0) ? (
                  <p className="text-slate-400 text-[11px] italic">Aucun tag pour le moment. Utilisez les suggestions ci-dessus ou créez vos propres tags pour catégoriser le dossier.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {student.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 pl-2 pr-1.5 py-0.5 text-xs font-semibold tracking-tight transition group cursor-pointer"
                        title="Cliquez pour supprimer l'étiquette de suivi"
                        onClick={async () => {
                          const updatedTags = (student.tags || []).filter(t => t !== tag);
                          await updateStudent(student.id, { tags: updatedTags });
                        }}
                      >
                        {tag}
                        <X className="h-3 w-3 text-slate-400 group-hover:text-red-500 cursor-pointer" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Class Assignation detail */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2.5">
              Affectation Scolaire
            </h4>

            {studentClass ? (
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <label className="text-[10px] text-slate-400 block">Établissement / Campus d'inscription</label>
                    <span className="font-semibold text-slate-800">{studentCampus?.name || "Campus global"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <label className="text-[10px] text-slate-400 block">Classe & Niveau visé</label>
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-100 mt-1">
                      {studentClass.language} {studentClass.level}
                    </span>
                    <span className="block mt-1 font-semibold text-slate-700">Horaire : {studentClass.period}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <label className="text-[10px] text-slate-400 block">Enseignant responsable</label>
                    <span className="font-semibold text-slate-800">{teacher?.name || "Non assigné"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Aucun cours assigné actuellement.</p>
            )}

            {/* Renewal button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  if (!currentPlan.canManageStudents) {
                    alert(`⚠️ Fonctionnalité Bloquée : Le renouvellement d'inscription n'est pas disponible avec le pack ${currentPlan.name}. Veuillez passer au pack Premium ou Intégral pour débloquer cette fonctionnalité.`);
                    return;
                  }
                  setShowRenewalModal(true);
                }}
                className={`w-full flex justify-center items-center gap-1.5 rounded-xl border border-blue-600 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all cursor-pointer ${
                  !currentPlan.canManageStudents ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Clock className="h-4 w-4" /> {currentPlan.canManageStudents ? "" : "🔒 "}Renouveler l'Inscription (+1 an)
              </button>
            </div>
          </div>

          {/* Documents Académiques Officiels Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <span>📜</span><span>Documents Académiques</span>
            </h4>
            <p className="text-[11px] text-slate-500 leading-snug">
              Émettez instantanément le certificat académique officiel de l'élève basé sur le modèle configuré de l'école.
            </p>
            <button
              onClick={() => {
                if (!currentPlan.canGenerateDocuments) {
                  alert(`⚠️ Fonctionnalité Bloquée : La génération de documents académiques n'est pas disponible avec le pack ${currentPlan.name}. Veuillez passer au pack Intégral pour débloquer cette fonctionnalité.`);
                  return;
                }
                generateCertificate(student, studentClass, studentCampus, schoolConfig).catch(e => console.error(e));
              }}
              className={`w-full flex justify-center items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md ${
                !currentPlan.canGenerateDocuments ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <FileText className="h-4 w-4 text-amber-450" /> {currentPlan.canGenerateDocuments ? "" : "🔒 "}Générer Certificat Scolaire
            </button>
          </div>

          {/* Action de statut / Archivage complétée */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2.5">
              Statut & Cycle d'Inscription
            </h4>
            
            <div className="text-xs text-slate-600 space-y-3">
              {student.status === "archivé" ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                  <p className="font-semibold text-slate-700">📁 Dossier Archivé</p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Ce dossier d'inscription est archivé. Il est conservé uniquement pour des fins de traçabilité historique et comptable.
                  </p>
                  <button
                    onClick={async () => {
                      if (confirm(`Désarchiver le profil de ${student.firstName} ${student.lastName} ?`)) {
                        await updateStudent(student.id, { status: "actif" });
                      }
                    }}
                    className="w-full bg-slate-100/60 text-slate-750 hover:bg-slate-200/50 py-2 rounded-lg font-bold text-[11px] cursor-pointer border border-slate-200 transition"
                  >
                    Réactiver & Désarchiver
                  </button>
                </div>
              ) : student.status === "terminé" ? (
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-150 space-y-2.5">
                  <p className="font-semibold text-blue-700">🎓 Scolarité Terminée</p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Le parcours académique est validé. Vous pouvez maintenant archiver ce dossier d'inscription pour désencombrer le registre des élèves actifs.
                  </p>
                  <button
                    onClick={async () => {
                      if (confirm(`Voulez-vous archiver le dossier d'inscription de ${student.firstName} ${student.lastName} ?`)) {
                        await updateStudent(student.id, { status: "archivé" });
                        onBack();
                      }
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg font-bold text-[11px] cursor-pointer transition flex items-center justify-center gap-1.5 shadow"
                  >
                    📦 Archiver l'inscription
                  </button>
                  <button
                    onClick={async () => {
                      await updateStudent(student.id, { status: "actif" });
                    }}
                    className="w-full bg-white hover:bg-slate-50 text-blue-600 py-1.5 rounded-lg border border-blue-200 font-semibold text-[10px] cursor-pointer transition"
                  >
                    Rétablir en cours (Actif)
                  </button>
                </div>
              ) : student.status === "en_attente" ? (
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-250/50 space-y-3">
                  <p className="font-bold text-amber-700 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                    ⏳ Pré-inscription en Attente
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Le dossier de cet élève a été pré-enregistré (par exemple après réception des infos via WhatsApp). Cliquez ci-dessous pour l'admettre officiellement et valider son intégration administrative. Les règlements sont consigné offline par le secrétariat.
                  </p>
                  <button
                    onClick={async () => {
                      if (confirm(`Souhaitez-vous valider officiellement l'inscription de ${student.firstName} ${student.lastName} ? Un avis d'admission et de validation administrative sera enregistré de suite.`)) {
                        await updateStudent(student.id, { status: "actif" });
                        alert("🎉 Inscription Validée de manière automatisée !");
                      }
                    }}
                    className="w-full inline-flex justify-center items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition cursor-pointer shadow-sm shadow-emerald-100"
                  >
                    🎯 Valider l'inscription
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-505 leading-relaxed">
                    Une fois que l'élève a terminé son contrat de formation, vous pouvez clore son dossier pour libérer sa place et l'archiver.
                  </p>
                  <button
                    onClick={async () => {
                      if (confirm(`Marquer la scolarité de ${student.firstName} ${student.lastName} comme Terminée ?`)) {
                        await updateStudent(student.id, { status: "terminé" });
                      }
                    }}
                    className="w-full inline-flex justify-center items-center gap-1.5 rounded-xl border border-blue-200 hover:border-blue-300 bg-blue-50/35 py-2.5 text-xs font-bold text-slate-700 hover:text-blue-700 transition cursor-pointer"
                  >
                    🏆 Marquer comme "Terminé"
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Zone de Danger (Suppression) */}
          {(currentUser?.role === UserRole.SUPERADMIN || currentUser?.role === UserRole.DIRECTRICE) && student && (
            <div className="rounded-2xl border border-red-200 bg-red-50/20 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1.5 border-b border-red-100 pb-2">
                ⚠️ Zone de danger
              </h4>
              <p className="text-[11px] text-slate-500 leading-snug">
                Supprimer définitivement cet élève de la base de données. Cette opération est irréversible, supprimera le dossier et libérera sa place dans sa classe.
              </p>
              <button
                onClick={async () => {
                  if (confirm(`⚠️ ATTENTION : Voulez-vous vraiment supprimer définitivement l'élève ${student.firstName} ${student.lastName} ?`)) {
                    if (confirm(`Cette action va décrémenter les effectifs de sa classe et supprimer son dossier de manière permanente de la base de données Firestore. Confirmer la suppression ?`)) {
                      try {
                        await deleteStudent(student.id);
                        alert("L'élève a été supprimé définitivement.");
                        onBack();
                      } catch (err: any) {
                        alert(`Échec de la suppression : ${err?.message || err}`);
                      }
                    }
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-bold text-xs cursor-pointer transition shadow"
              >
                Supprimer le dossier de l'élève
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Statement of Accounts, Ledger, Payments or History Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Account balance sheet */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Bilan Financier Global
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (!currentPlan.canGenerateDocuments) {
                    alert(`⚠️ Fonctionnalité Bloquée : La génération de facture n'est pas disponible avec le pack ${currentPlan.name}. Veuillez passer au pack Intégral pour débloquer cette fonctionnalité.`);
                    return;
                  }
                  triggerExportInvoice();
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer ${
                  !currentPlan.canGenerateDocuments ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" /> {currentPlan.canGenerateDocuments ? "" : "🔒 "}Générer & Télécharger la Facture PDF
              </button>
            </div>

            {/* Giant color-coded boxes */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Frais Scolarité</span>
                <p className="text-xl font-bold text-slate-800 font-mono mt-1">
                  {student.totalAmount.toLocaleString()} <span className="text-xs">FCFA</span>
                </p>
              </div>

              <div className="rounded-xl border border-green-150 bg-green-50/50 p-4">
                <span className="text-[10px] font-semibold text-green-600 uppercase">Total Réglé</span>
                <p className="text-xl font-bold text-green-700 font-mono mt-1">
                  {student.paidAmount.toLocaleString()} <span className="text-xs">FCFA</span>
                </p>
              </div>

              <div className="rounded-xl border border-red-150 bg-red-55/40 p-4">
                <span className="text-[10px] font-semibold text-red-650 uppercase">Reste à recouvrer</span>
                <p className="text-xl font-bold text-red-650 font-mono mt-1">
                  {student.balance.toLocaleString()} <span className="text-xs">FCFA</span>
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Nav toggler */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveSubTab("payments")}
              className={`pb-2 px-4 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                activeSubTab === "payments"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Récapitulatif des paiements ({studentPayments.length})
            </button>
            <button
              onClick={() => setActiveSubTab("reminders")}
              className={`pb-2 px-4 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                activeSubTab === "reminders"
                  ? "border-blue-600 text-blue-700 font-bold border-b-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              📢 Relances & Rappels ({studentReminders.length})
            </button>
            <button
              onClick={() => {
                if (!currentPlan.canViewHistory) {
                  alert(`⚠️ Fonctionnalité Bloquée : L'historique des modifications n'est pas disponible avec le pack ${currentPlan.name}. Veuillez passer au pack Premium ou Intégral pour débloquer cette fonctionnalité.`);
                  return;
                }
                setActiveSubTab("history");
              }}
              className={`pb-2 px-4 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                !currentPlan.canViewHistory ? "opacity-50" : ""
              } ${
                activeSubTab === "history"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Historique des Modifications {!currentPlan.canViewHistory && "🔒"} ({studentLogs.length})
            </button>
          </div>

          {/* Sub-tab 1 CONTENTS: payments sheet & ledger form */}
          {activeSubTab === "payments" && (
            <div className="space-y-6">
              {/* Register a payment helper form (Resolves Payment recording) */}
              {student.balance > 0 && (
                <div className="rounded-2xl border border-slate-250 bg-slate-50/60 p-5 shadow-sm relative overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-4">
                    <BadgeCent className="h-4.5 w-4.5 text-blue-600" /> Enregistrer un Complément d'Encaissement
                  </h4>

                  {!currentPlan.canManageStudents ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <p className="text-amber-800 font-medium">
                        ⚠️ Fonctionnalité Bloquée : La gestion des paiements n'est pas disponible avec le pack {currentPlan.name}. Veuillez passer au pack Premium ou Intégral pour débloquer cette fonctionnalité.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handlePaySubmit} className="grid gap-4 sm:grid-cols-2 text-xs text-slate-700">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-650">Montant versé aujourd'hui (FCFA) *</label>
                        <input
                          type="number"
                          required
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          placeholder="Ex: 50000"
                          className="rounded-xl border border-slate-200 bg-white p-2 text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-650">Mode de règlement *</label>
                        <select
                          value={payMode}
                          onChange={e => setPayMode(e.target.value as any)}
                          className="rounded-xl border border-slate-200 bg-white p-2"
                        >
                          <option value="Espèces">Espèces</option>
                          <option value="Mobile Money">Mobile Money (OM/Momo)</option>
                          <option value="Virement">Virement bancaire</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="font-semibold text-slate-650">Note / Justificatif (Optionnel)</label>
                        <input
                          type="text"
                          placeholder="Ex: Deuxième acompte frais de formation"
                          value={payNote}
                          onChange={e => setPayNote(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white p-2"
                        />
                      </div>

                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer"
                        >
                          Enregistrer l'Émargement
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Transactions Ledger history */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                      Récapitulatif des paiements
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Journal comptable des versements acquittés pour la scolarité de l'élève.
                    </p>
                  </div>

                  {/* Chronological sorting selector */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSortAsc(true)}
                      className={`cursor-pointer px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        sortAsc
                          ? "bg-white text-blue-600 shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      📅 Chronologique
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortAsc(false)}
                      className={`cursor-pointer px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        !sortAsc
                          ? "bg-white text-blue-600 shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      🔄 Récent d'abord
                    </button>
                  </div>
                </div>
                
                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="p-3">Réf</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3 text-right">Montant</th>
                        <th className="p-3">Reçu par</th>
                        <th className="p-3 text-right">Générer un Reçu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {studentPayments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-slate-400 italic">Aucune transaction enregistrée</td>
                        </tr>
                      ) : (
                        studentPayments.map((pay: any) => (
                          <tr key={pay.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-blue-600">
                              REC-{pay.chronologicalIndex.toString().padStart(3, "0")}
                            </td>
                            <td className="p-3 font-mono">
                              {new Date(pay.date).toLocaleString("fr-FR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit"
                              })}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 border border-slate-150 text-[10px]">
                                {pay.mode}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">{pay.amount.toLocaleString()} FCFA</td>
                            <td className="p-3 text-slate-500">{pay.recordedBy?.userName.split(" ")[0]}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  if (!currentPlan.canGenerateReceipts) {
                                    alert(`⚠️ Fonctionnalité Bloquée : La génération de reçus PDF n'est pas disponible avec le pack ${currentPlan.name}. Veuillez passer au pack Premium ou Intégral pour débloquer cette fonctionnalité.`);
                                    return;
                                  }
                                  triggerExportReceipt(pay);
                                }}
                                title={currentPlan.canGenerateReceipts ? "Télécharger le reçu au format PDF" : "Générer reçu PDF (Bloqué) 🔒"}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg cursor-pointer transition-colors shadow-sm ${
                                  !currentPlan.canGenerateReceipts ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              >
                                <span className="text-[12px] leading-none font-bold">{currentPlan.canGenerateReceipts ? "📄" : "🔒"}</span> Reçu PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 3 CONTENTS: Automated reminders and logs */}
          {activeSubTab === "reminders" && (
            <div className="space-y-6">
              {/* Reminder generator section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                      Assistant Automatique de Relances & Rappels de Paiement
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Détecte l'état comptable de l'élève pour pré-remplir le template le plus adapté.
                    </p>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex gap-1">
                    {student.balance > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded-lg px-2 py-0.5 text-[10px] font-bold border border-red-200 uppercase">
                        🚨 Solde Débiteur
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-[10px] font-bold border border-green-200 uppercase">
                        ✅ Solde Réglé
                      </span>
                    )}

                    {daysLeft <= 30 && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 rounded-lg px-2 py-0.5 text-[10px] font-bold border border-amber-200 uppercase">
                        ⏳ Fin de cycle
                      </span>
                    )}
                  </div>
                </div>

                {/* Form to select channel and edit template */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setReminderMedium("email")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                        reminderMedium === "email"
                          ? "border-blue-600 bg-blue-150/10 text-blue-700"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      <Mail className="h-5 w-5 mb-1" />
                      <span className="font-bold text-xs font-sans">E-mail</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{student.email || "Non renseigné"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReminderMedium("sms")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                        reminderMedium === "sms"
                          ? "border-blue-600 bg-blue-150/10 text-blue-700"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      <Phone className="h-5 w-5 mb-1" />
                      <span className="font-bold text-xs font-sans">SMS standard</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{student.phone || "Non renseigné"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReminderMedium("whatsapp")}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                        reminderMedium === "whatsapp"
                          ? "border-emerald-600 bg-emerald-50/20 text-emerald-700 border-emerald-250"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      <span className="text-lg font-bold mb-1 leading-none text-emerald-600">💬</span>
                      <span className="font-bold text-xs font-sans">WhatsApp</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{student.phone || "Non renseigné"}</span>
                    </button>
                  </div>

                  {/* Template Editor Box */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-750 text-xs">Aperçu & Personnalisation du message</label>
                      <button
                        type="button"
                        onClick={() => setCustomReminderNotes("")}
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        Réinitialiser au template par défaut
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={customReminderNotes !== "" ? customReminderNotes : defaultReminderText}
                      onChange={e => setCustomReminderNotes(e.target.value)}
                      className="rounded-xl border border-slate-200 p-3 text-xs text-slate-800 font-sans focus:ring-1 focus:ring-blue-500 bg-slate-50/20 leading-relaxed"
                      placeholder="Saisissez ou modifiez le contenu de la relance..."
                    />
                  </div>

                  {/* Submission row */}
                  <div className="flex justify-between items-center gap-4 flex-wrap pt-2">
                    <p className="text-[10px] text-slate-400 leading-snug max-w-sm">
                      L'envoi de la notification va s'opérer de manière asynchrone sécurisée. Un accusé de réception instantané sera archivé dans Firestore.
                    </p>
                    
                    {sendingSimulation ? (
                      <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-semibold flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                        <span className="animate-pulse">{simulationStep}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendReminder}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 text-xs shadow-md shadow-blue-100 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        🚀 Déclencher l'Envoi
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Historic tracking logs list of reminders */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-150 pb-3 mb-5 flex items-center gap-1.5 uppercase tracking-wide">
                  📋 Registre des relances ({studentReminders.length})
                </h4>

                {studentReminders.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Aucun rappel de paiement n'a été transmis pour le moment à cet élève.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentReminders.map(rem => (
                      <div key={rem.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/30 text-xs space-y-3">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-850">
                                {rem.type === "overdue_account" ? "⚠️ Rappel compte débiteur" : "⏳ Alerte fin de cycle"}
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold uppercase ${
                                rem.medium === "email" ? "bg-blue-50 text-blue-700" : rem.medium === "sms" ? "bg-purple-50 text-purple-700" : "bg-green-50 text-green-700"
                              }`}>
                                {rem.medium === "email" ? "📧 E-mail" : rem.medium === "sms" ? "📱 SMS" : "💬 WhatsApp"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Déclenché le {new Date(rem.createdAt).toLocaleDateString("fr-FR")} à {new Date(rem.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-250 rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                              ● Délivré
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedReminderId(expandedReminderId === rem.id ? null : rem.id)}
                              className="text-xs text-blue-600 font-bold hover:underline"
                            >
                              {expandedReminderId === rem.id ? "Masquer" : "Consulter le message"}
                            </button>
                          </div>
                        </div>

                        {expandedReminderId === rem.id && (
                          <div className="border-t border-slate-105 pt-3 text-slate-650 bg-white p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner">
                            {rem.notes}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 flex justify-between items-center border-t border-slate-100/50 pt-2 flex-wrap gap-2">
                          <span>Montant ciblé : <b className="font-mono text-slate-600">{rem.amountDue.toLocaleString()} FCFA</b></span>
                          <span>Opérateur : <b className="text-slate-600 font-sans">{rem.sentBy?.userName || "Système"}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 2 CONTENTS: History logs vertical timeline (Satisfies history modifications requirement) */}
          {activeSubTab === "history" && currentPlan.canViewHistory && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-150 pb-3 mb-5 flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-slate-400" /> Traceur de modifications dossier élève
              </h4>

              <div className="relative border-l-2 border-slate-100 pl-5 ml-2.5 space-y-6">
                {studentLogs.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucun historique de modifications d'administration sur ce dossier.</p>
                ) : (
                  studentLogs.map(log => {
                    const date = new Date(log.timestamp);
                    const dateStr = date.toLocaleDateString("fr-FR") + " " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

                    let actionLabel = "Mise à jour";
                    let actionDesc = "";

                    if (log.action === "CREATE_STUDENT") {
                      actionLabel = "Création de la fiche d'inscription";
                      actionDesc = `Secrétaire ${log.userName} a initialisé l'admission en classe: ${log.details?.class}`;
                    } else if (log.action === "ADD_PAYMENT") {
                      actionLabel = "Paiement de scolarité enregistré";
                      actionDesc = `Encaissement de ${log.details?.amount?.toLocaleString()} FCFA [Mode: ${log.details?.mode}].`;
                    } else if (log.action === "RENEWAL") {
                      actionLabel = "Renouvellement administratif";
                      actionDesc = `Prolongation confirmée par ${log.userName} jusqu'au ${log.details?.extendedUntil} pour un montant de ${log.details?.cost?.toLocaleString()} FCFA.`;
                    } else if (log.action === "CHANGE_CLASS") {
                      actionLabel = "Transfert de classe d'apprentissage";
                      actionDesc = `Changement de cours opéré.`;
                    } else {
                      actionDesc = `Modification effectuée sur : ${log.details?.field || "Données d'identité"}`;
                    }

                    return (
                      <div key={log.id} className="relative text-xs">
                        {/* Dot indicator */}
                        <span className="absolute -left-7.5 top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white ring-2 ring-slate-100 text-[9px]">
                          🕒
                        </span>
                        
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 block mb-0.5">{dateStr}</span>
                          <h5 className="font-bold text-slate-800">{actionLabel}</h5>
                          <p className="text-slate-500 mt-1">{actionDesc}</p>
                          <p className="text-[10px] text-slate-400 italic mt-0.5">Opérateur : {log.userName}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RENEWAL MODAL WORKFLOW (Prompt 9) */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Renouvellement de l'Inscription</h3>
              <button
                onClick={() => setShowRenewalModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenewalSubmit} className="space-y-4 text-xs text-slate-700">
              <div className="bg-blue-50 border border-blue-150 rounded-xl p-3 text-blue-700 mb-2">
                <p className="font-bold">Dossier : {student.firstName} {student.lastName}</p>
                <p className="mt-1">
                  Ce formulaire prolonge l'inscription de l'élève pour <b>1 année académique complète (+365 jours)</b> d'apprentissage par rapport à son échéance actuelle.
                </p>
              </div>

              {/* Cost of extension */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Coût de la réinscription (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={renewalAmount}
                  onChange={e => setRenewalAmount(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* Paid initial fee on extension */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Acompte versé ce jour (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={renewalPayment}
                  onChange={e => setRenewalPayment(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* Mode payment selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Mode de paiement de l'acompte *</label>
                <select
                  value={renewalMode}
                  onChange={e => setRenewalMode(e.target.value as any)}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Mobile Money">Mobile Money (OM/MoMo)</option>
                  <option value="Virement">Virement bancaire</option>
                </select>
              </div>

              {/* Actions trigger */}
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRenewalModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer"
                >
                  Valider la Réinscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
