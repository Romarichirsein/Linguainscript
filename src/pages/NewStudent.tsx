import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { Class } from "../types";
import {
  User,
  GraduationCap,
  Wallet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Printer
} from "lucide-react";
import { generateReceipt } from "../utils/generateReceipt";

interface NewStudentProps {
  setCurrentTab: (tab: string) => void;
  setSelectedStudentId: (id: string | null) => void;
}

export const NewStudent: React.FC<NewStudentProps> = ({ setCurrentTab, setSelectedStudentId }) => {
  const { classes, campuses, teachers, addStudent, currentUser, payments } = useData();

  const isDirectrice = currentUser?.role === "directrice";
  const userCampusId = currentUser?.campusId;

  // Form states - Step 1: Personal Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // Step 2: Academic Info
  const [campusId, setCampusId] = useState(userCampusId || "campus_01");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [enrollmentDays, setEnrollmentDays] = useState("365"); // Default 1 year

  // Step 3: Payment Initial info
  const [totalCost, setTotalCost] = useState("180000"); // Standard price preset
  const [paidAmount, setPaidAmount] = useState("80000"); // Standard initial Tranche preset
  const [payMode, setPayMode] = useState<"Espèces" | "Mobile Money" | "Virement">("Espèces");
  const [payNote, setPayNote] = useState("");

  const [step, setStep] = useState(1);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  // Synchronize default campusId with actual data (solves empty dropdown issue for directrice)
  React.useEffect(() => {
    if (campuses.length > 0) {
      if (!campuses.some(c => c.id === campusId)) {
        setCampusId(userCampusId && campuses.some(c => c.id === userCampusId) ? userCampusId : campuses[0].id);
      }
    }
  }, [campuses, campusId, userCampusId]);

  // Cascading Filter Logic derived from the database
  // 1. Get classes matching selected campus
  const campusClasses = useMemo(() => {
    return classes.filter(c => c.campusId === campusId && c.isActive);
  }, [classes, campusId]);

  // 2. Extract available unique languages
  const availableLanguages = useMemo(() => {
    return Array.from(new Set(campusClasses.map(c => c.language)));
  }, [campusClasses]);

  // 3. Get unique levels for the chosen language
  const availableLevels = useMemo(() => {
    if (!selectedLanguage) return [];
    const languageClasses = campusClasses.filter(c => c.language === selectedLanguage);
    return Array.from(new Set(languageClasses.map(c => c.level)));
  }, [campusClasses, selectedLanguage]);

  // 4. Get specific period classes matching the language + level
  const availablePeriodClasses = useMemo(() => {
    if (!selectedLanguage || !selectedLevel) return [];
    return campusClasses.filter(c => c.language === selectedLanguage && c.level === selectedLevel);
  }, [campusClasses, selectedLanguage, selectedLevel]);

  // Resolve matching class detail
  const resolvedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const resolvedTeacherName = useMemo(() => {
    if (!resolvedClass) return "";
    return teachers.find(t => t.id === resolvedClass.teacherId)?.name || "Non assigné";
  }, [teachers, resolvedClass]);

  const isClassFull = useMemo(() => {
    if (!resolvedClass) return false;
    return resolvedClass.currentCount >= resolvedClass.maxStudents;
  }, [resolvedClass]);

  // Actions
  const handleNextStep = () => {
    if (step === 1) {
      if (!firstName || !lastName || !phone || !parentName || !parentPhone) {
        alert("Veuillez remplir tous les champs obligatoires (*).");
        return;
      }
    }
    if (step === 2) {
      if (!selectedClassId) {
        alert("Veuillez choisir un cours d'assignation.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClassId) {
      alert("Veuillez choisir une classe.");
      return;
    }

    const costNum = parseFloat(totalCost);
    const paidNum = parseFloat(paidAmount);

    if (isNaN(costNum) || isNaN(paidNum)) {
      alert("Prix ou versement invalides.");
      return;
    }

    // Set Dates
    const enrollmentDate = new Date().toISOString().split("T")[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + parseInt(enrollmentDays));
    const expirationDate = expDate.toISOString().split("T")[0];

    const studentPayload = {
      firstName,
      lastName,
      birthDate: birthDate || "2000-01-01",
      phone,
      email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@testschool.com`,
      parentName,
      parentPhone,
      campusId,
      classId: selectedClassId,
      enrollmentDate,
      expirationDate,
      totalAmount: costNum
    };

    try {
      const response = await addStudent(
        studentPayload,
        paidNum,
        paidNum > 0 ? payMode : null,
        payNote || "Paiement d'inscription scolaire",
        isClassFull // If class is full, add to waitlist instead if user confirmed
      );

      if (response.success) {
        if (response.studentId) {
          setJustCreatedId(response.studentId);
        }
        setStep(4); // Success step
      } else {
        alert(response.message);
      }
    } catch (error: any) {
      alert(error?.message || "Une erreur est survenue lors de l'enregistrement.");
    }
  };

  const printFormReceipt = () => {
    if (!justCreatedId) return;
    const enrolledStudent = useData().students.find(s => s.id === justCreatedId);
    if (!enrolledStudent) return;

    const enrolledPayments = payments.filter(p => p.studentId === justCreatedId);
    const relatedPayment = enrolledPayments[0];
    const relatedClass = classes.find(c => c.id === enrolledStudent.classId);
    const relatedCampus = campuses.find(c => c.id === enrolledStudent.campusId);

    if (enrolledStudent && relatedPayment) {
      generateReceipt(enrolledStudent, relatedPayment, relatedClass, relatedCampus);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="mb-2">
        <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-800">
          Nouvelle Inscription Étudiante
        </h2>
        <p className="text-sm text-slate-500">
          Saisie guidée en 3 étapes avec détection automatique de classes complètes et basculement d'attente.
        </p>
      </div>

      {/* Stepper Indicators */}
      <div className="relative flex justify-between items-center rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Connection line */}
        <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        
        {/* Step 1 button */}
        <div className="relative flex flex-col items-center gap-1.5 z-10 w-24">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs ring-4 transition ${
            step >= 1 ? "bg-blue-600 text-white ring-blue-50" : "bg-slate-200 text-slate-500 ring-slate-100"
          }`}>
            {step > 1 ? "✓" : "1"}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Identité</span>
        </div>

        {/* Step 2 button */}
        <div className="relative flex flex-col items-center gap-1.5 z-10 w-24">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs ring-4 transition ${
            step >= 2 ? "bg-blue-600 text-white ring-blue-50" : "bg-slate-200 text-slate-500 ring-slate-100"
          }`}>
            {step > 2 ? "✓" : "2"}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Affectation</span>
        </div>

        {/* Step 3 button */}
        <div className="relative flex flex-col items-center gap-1.5 z-10 w-24">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs ring-4 transition ${
            step >= 3 ? "bg-blue-600 text-white ring-blue-50" : "bg-slate-200 text-slate-500 ring-slate-100"
          }`}>
            {step > 3 ? "✓" : "3"}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Paiement</span>
        </div>
      </div>

      {/* Main wizard wrapper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* STEP 1 FORM PANEL */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-4.5 w-4.5 text-blue-600" /> Étape 1 : Informations Civiles (Élève & Tuteur)
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-700">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Prénom de l'élève *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jean"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Nom de famille *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dupont"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Date de naissance (Optionnel)</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850 bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Numéro de téléphone de l'élève *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: +237 699 112 233"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-650">Adresse email scolaire (Optionnel)</label>
                <input
                  type="email"
                  placeholder="Ex: jean.dupont@testsite.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* Parents emergency emergency indicators */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-xs mb-3">En cas d'urgence (Contact Parent/Tuteur)</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-650">Nom complet du parent *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sophie Dupont"
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-650">Téléphone d'urgence du parent *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: +237 671 223 344"
                      value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                      className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-xs text-white hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 FORM PANEL */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <GraduationCap className="h-4.5 w-4.5 text-blue-600" /> Étape 2 : Affectation Linguistique
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-700">
              {/* Target Campus Filter */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-650">Campus d'affectation *</label>
                <select
                  disabled={!isDirectrice} // Restricted if registrar secretary
                  value={campusId}
                  onChange={e => {
                    setCampusId(e.target.value);
                    setSelectedLanguage("");
                    setSelectedLevel("");
                    setSelectedClassId("");
                  }}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850 disabled:bg-slate-50"
                >
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.id === userCampusId ? "(Votre établissement)" : ""}
                    </option>
                  ))}
                </select>
                {!isDirectrice && (
                  <span className="text-[10px] text-slate-450 italic">
                    Restreint : En tant que Secrétaire, les inscriptions s'enregistrent pour votre campus d'affectation.
                  </span>
                )}
              </div>

              {/* cascade selector 1: Language */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Langue souhaitée *</label>
                <select
                  required
                  value={selectedLanguage}
                  onChange={e => {
                    setSelectedLanguage(e.target.value);
                    setSelectedLevel("");
                    setSelectedClassId("");
                  }}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                >
                  <option value="">-- Choisir la langue --</option>
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              {/* cascade selector 2: Level */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Niveau visé (CECRL) *</label>
                <select
                  required
                  disabled={!selectedLanguage}
                  value={selectedLevel}
                  onChange={e => {
                    setSelectedLevel(e.target.value);
                    setSelectedClassId("");
                  }}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850 disabled:bg-slate-50"
                >
                  <option value="">-- Choisir le niveau --</option>
                  {availableLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* cascade selector 3: Schedule slot */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-650">Créneau horaire & Classe *</label>
                <select
                  required
                  disabled={!selectedLevel}
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850 disabled:bg-slate-50"
                >
                  <option value="">-- Choisir le créneau --</option>
                  {availablePeriodClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      Créneau {cls.period} — Max {cls.maxStudents} élèves ({cls.currentCount} déjà inscrits)
                    </option>
                  ))}
                </select>
              </div>

              {/* Feedback cards about selected Class */}
              {resolvedClass && (
                <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div>
                    <h4 className="text-[11px] uppercase text-slate-400 font-mono">Détails d'Affectation</h4>
                    <p className="font-bold text-slate-800 text-sm mt-1">{selectedLanguage} {selectedLevel}</p>
                    <p className="text-slate-500 text-xs font-semibold mt-0.5">Enseignant : {resolvedTeacherName}</p>
                  </div>
                  <div className="sm:text-right">
                    <h4 className="text-[11px] uppercase text-slate-400 font-mono">Disponibilité places</h4>
                    <p className="mt-1">
                      <b className="text-slate-800 text-sm">
                        {resolvedClass.currentCount} / {resolvedClass.maxStudents}
                      </b>{" "}
                      places affectées
                    </p>
                    {isClassFull ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-red-650 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertCircle className="h-3 w-3" /> Classe Complète !
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-1 text-green-650 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        ✓ Places vacantes ({resolvedClass.maxStudents - resolvedClass.currentCount} libres)
                      </span>
                    )}
                  </div>

                  {/* CAPACITY ALARM & AUTO-WAITLIST BASCE MODULE */}
                  {isClassFull && (
                    <div className="sm:col-span-2 mt-2 bg-amber-50 rounded-lg p-3.5 border border-amber-200 flex gap-2.5 items-start">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <h5 className="font-bold text-amber-700 text-xs">Mise en liste d'attente automatique</h5>
                        <p className="text-[11px] text-amber-600 mt-1 leading-relaxed">
                          La classe choisie est au maximum de sa capacité. Si vous validez cette inscription, l'élève sera automatiquement dirigé et inscrit dans la <b>Liste d'Attente</b> (Position active) pour être admis plus tard si une place se libère.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* License schedule period default */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-650">Période de validité d'inscription</label>
                <select
                  value={enrollmentDays}
                  onChange={e => setEnrollmentDays(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                >
                  <option value="365">1 Année complète académique (365 jours)</option>
                  <option value="180">Un semestre d'apprentissage (180 jours)</option>
                  <option value="90">Trimestre intensif (90 jours)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Précédent
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-xs text-white hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 FORM PANEL */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Wallet className="h-4.5 w-4.5 text-blue-600" /> Étape 3 : Émargement Financier
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-700">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Coût annuel de scolarité (FCFA) *</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 180000"
                  value={totalCost}
                  onChange={e => setTotalCost(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* Initial down payment (Pre-emped payment visualization) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Versement initial ce jour (FCFA) *</label>
                <input
                  type="number"
                  required
                  disabled={isClassFull} // If class full, waitlist doesn't require immediate payment
                  placeholder={isClassFull ? "0 (En file d'attente)" : "Ex: 80000"}
                  value={isClassFull ? "0" : paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* Mode */}
              {!isClassFull && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Mode de paiement initial *</label>
                  <select
                    value={payMode}
                    onChange={e => setPayMode(e.target.value as any)}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Mobile Money">Mobile Money (OM / MoMo)</option>
                    <option value="Virement">Virement Bancaire</option>
                  </select>
                </div>
              )}

              {/* Optional comments */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-650">Commentaire du dossier comptable (Optionnel)</label>
                <textarea
                  placeholder="Ex: Tranche 1 validée"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2 h-20 text-slate-850"
                />
              </div>

              {/* Dynamic balance preview */}
              <div className="sm:col-span-2 space-y-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800">Résumé Scolarité :</h4>
                    <p className="text-slate-500 mt-0.5">Solde dû après cet acompte.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-650">
                      {(isClassFull ? 0 : Math.max(0, parseFloat(totalCost || "0") - parseFloat(paidAmount || "0"))).toLocaleString()}{" "}
                      FCFA
                    </span>
                    <p className="text-[10px] text-slate-400">Solde restant</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 rounded-xl text-[10px] border border-amber-100 dark:border-amber-900/40 leading-normal font-medium">
                  ⚠️ <strong>Avis :</strong> Aucun paiement ou prélèvement réel n'est exécuté en ligne par l'application. Cette saisie constitue une écriture d'enregistrement manuel et de pointage comptable offline.
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Précédent
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-5 py-2.5 font-bold text-xs text-white hover:bg-green-700 shadow-md shadow-green-200 cursor-pointer"
              >
                {isClassFull ? "Enregistrer en File d'Attente" : "Inscrire & Enregistrer Paiement"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS SUMMARY & PRINT POP */}
        {step === 4 && (
          <div className="text-center py-6 space-y-5 animate-scaleUp">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-150 text-green-600 mb-2">
              <CheckCircle className="h-8 w-8" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Enregistrement Validé !</h3>
              <p className="text-emerald-600 text-sm font-semibold mt-2">
                L'élève "{firstName} {lastName}" a été créé avec succès.
              </p>
              <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                Le dossier de l'élève a été sécurisé en temps réel dans la base de données.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 max-w-sm mx-auto pt-4">
              {/* Only show print receipt if the student is active, not waitlisted */}
              {justCreatedId && !isClassFull && (
                <button
                  type="button"
                  onClick={printFormReceipt}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 font-bold text-xs text-white hover:bg-blue-700 shadow shadows-blue-200 cursor-pointer animate-pulse"
                >
                  <Printer className="h-4.5 w-4.5" /> 🖨️ Générer le Reçu PDF
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  // Reset form parameters
                  setFirstName("");
                  setLastName("");
                  setPhone("");
                  setEmail("");
                  setParentName("");
                  setParentPhone("");
                  setSelectedLanguage("");
                  setSelectedLevel("");
                  setSelectedClassId("");
                  setJustCreatedId(null);
                  setStep(1);
                  setCurrentTab("students");
                }}
                className="w-full rounded-xl border border-slate-200 py-2.5 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Retourner au registre des élèves
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
