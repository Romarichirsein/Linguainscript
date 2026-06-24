import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { Student } from "../types";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  BadgeCent,
  Printer,
  X,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  UploadCloud
} from "lucide-react";
import { generateReceipt } from "../utils/generateReceipt";
import { StudentSheetsImport } from "../components/StudentSheetsImport";

interface StudentListProps {
  setCurrentTab: (tab: string) => void;
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  setCurrentTab,
  selectedStudentId,
  setSelectedStudentId
}) => {
  const { students, classes, campuses, teachers, payments, addPayment, currentUser, currentSchool, currentPlan, uniqueLanguages } = useData();

  // Component states
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCampus, setFilterCampus] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDebt, setFilterDebt] = useState(false);
  const [filterClassId, setFilterClassId] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [filterEnrollmentDate, setFilterEnrollmentDate] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showImport, setShowImport] = useState(false);

  // Fast payment modal state
  const [paymentModalStudent, setPaymentModalStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<"Espèces" | "Mobile Money" | "Virement">("Espèces");
  const [payNote, setPayNote] = useState("");

  const isDirectrice = currentUser?.role === "directrice";
  const userCampusId = currentUser?.campusId;

  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    students.forEach(s => {
      s.tags?.forEach(t => allTags.add(t));
    });
    const defaults = ["Niveau débutant", "Relance paiement", "En attente", "Dossier incomplet", "Excellent élève"];
    defaults.forEach(d => allTags.add(d));
    return Array.from(allTags);
  }, [students]);

  // uniqueLanguages is now provided by DataContext (centralized with custom languages)

  // Multi-filter matching pipeline
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // 1. Role boundaries: Secretaries see only their own campus
      if (!isDirectrice && student.campusId !== userCampusId) {
        return false;
      }

      // 2. Search query matching
      if (searchQuery.trim().length >= 1) {
        const query = searchQuery.trim().toLowerCase();
        const firstMatch = student.firstName.toLowerCase().includes(query);
        const lastMatch = student.lastName.toLowerCase().includes(query);
        const phoneMatch = student.phone.includes(query);
        const parentMatch = student.parentName.toLowerCase().includes(query);
        const parentPhoneMatch = student.parentPhone.includes(query);
        const tagsMatch = student.tags?.some(tag => tag.toLowerCase().includes(query)) || false;

        // Date matching inside search query
        const enrollmentRaw = student.enrollmentDate || "";
        const dateObj = new Date(enrollmentRaw);
        const formattedFr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("fr-FR") : "";
        const formattedIso = enrollmentRaw.substring(0, 10);
        const dateMatch = formattedFr.includes(query) || formattedIso.includes(query);

        if (!firstMatch && !lastMatch && !phoneMatch && !parentMatch && !parentPhoneMatch && !dateMatch && !tagsMatch) {
          return false;
        }
      }

      // 3. Dropdowns filters matching
      if (filterCampus && student.campusId !== filterCampus) return false;
      if (filterStatus && student.status !== filterStatus) return false;
      
      // Clean up primary view from archived entries unless specifically selected under status filter
      if (student.status === "archivé" && filterStatus !== "archivé") {
        return false;
      }
      
      if (filterDebt && student.balance <= 0) return false;

      if (filterClassId && student.classId !== filterClassId) return false;

      if (filterPaymentStatus) {
        if (filterPaymentStatus === "fully_paid" && student.balance > 0) return false;
        if (filterPaymentStatus === "has_debt" && student.balance <= 0) return false;
        if (filterPaymentStatus === "overdue") {
          if (student.balance <= 0) return false;
          const isOverdue = new Date(student.expirationDate).getTime() < Date.now();
          if (!isOverdue) return false;
        }
      }
      
      if (filterEnrollmentDate) {
        const studentDate = student.enrollmentDate ? student.enrollmentDate.substring(0, 10) : "";
        if (studentDate !== filterEnrollmentDate) {
          return false;
        }
      }

      if (filterTag && (!student.tags || !student.tags.includes(filterTag))) {
        return false;
      }

      // Find the student's active class to filter by class sub-properties
      const studentClass = classes.find(c => c.id === student.classId);
      if (filterLanguage && studentClass?.language !== filterLanguage) return false;
      if (filterLevel && studentClass?.level !== filterLevel) return false;
      if (filterPeriod && studentClass?.period !== filterPeriod) return false;

      return true;
    });
  }, [students, classes, searchQuery, filterCampus, filterStatus, filterDebt, filterClassId, filterPaymentStatus, filterLanguage, filterLevel, filterPeriod, filterEnrollmentDate, filterTag, currentUser, userCampusId, isDirectrice]);

  // Highlight matches inside strings
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 text-yellow-900 px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Export filtered students directly to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        "ID",
        "Prénom",
        "Nom",
        "Téléphone",
        "E-mail",
        "Statut",
        "Campus",
        "Classe",
        "Frais Totaux",
        "Montant Payé",
        "Solde Restant",
        "Date d'échéance"
      ];
      
      const rows = filteredStudents.map(student => {
        const campus = campuses.find(c => c.id === student.campusId)?.name || "Non spécifié";
        const cls = classes.find(c => c.id === student.classId);
        const classLabel = cls ? `${cls.language} ${cls.level}` : "Non spécifié";
        return [
          student.id,
          student.firstName,
          student.lastName,
          student.phone,
          student.email,
          student.status,
          campus,
          classLabel,
          student.totalAmount,
          student.paidAmount,
          student.balance,
          student.expirationDate
        ];
      });

      // Add Byte Order Mark (\uFEFF) to make Excel open French accents flawlessly 
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `lingua_inscript_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Une erreur s'est produite lors de la génération du document CSV.");
    }
  };

  const handlePrintReceipt = (stud: Student) => {
    // Find latest payment for this specific student
    const studentPayments = payments.filter(p => p.studentId === stud.id);
    if (studentPayments.length === 0) {
      alert("Aucun paiement enregistré pour cet élève !");
      return;
    }

    const latestPayment = studentPayments[0]; // Sorted by date inside provider state
    const studClass = classes.find(c => c.id === stud.classId);
    const studCampus = campuses.find(c => c.id === stud.campusId);

    generateReceipt(stud, latestPayment, studClass, studCampus);
  };

  const handleOpenFastPayment = (stud: Student) => {
    setPaymentModalStudent(stud);
    setPayAmount(stud.balance.toString());
    setPayNote("Solde d'inscription");
  };

  const submitFastPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalStudent) return;

    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    if (amount > paymentModalStudent.balance) {
      if (!window.confirm("Le montant saisi dépasse le solde restant. Voulez-vous continuer ?")) {
        return;
      }
    }

    addPayment(paymentModalStudent.id, amount, payMode, payNote);
    
    // Refresh modal student view state
    setPaymentModalStudent(null);
    setPayAmount("");
    setPayNote("");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-800">
            Registre des Inscriptions
          </h2>
          <p className="text-sm text-slate-500">
            Recherche instantanée et traçabilité complète des dossiers d'élèves, classes et soldes de scolarité.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showImport && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all cursor-pointer animate-fadeIn"
            >
              <UploadCloud className="h-4 w-4 text-blue-600" />
              Importer Google Sheets
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              currentSchool?.subType === "basique"
                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {currentSchool?.subType === "basique" ? (
              <>👑 Exporter Roster (Premium)</>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exporter CSV ({filteredStudents.length})
              </>
            )}
          </button>
        </div>
      </div>

      {showImport ? (
        <StudentSheetsImport
          onClose={() => setShowImport(false)}
          onImportComplete={() => setShowImport(false)}
        />
      ) : (
        <>
          {/* Instant Search Bar & Filter Button */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Recherche instantanée par nom, prénom, téléphone, ou date d'inscription (ex: DD/MM/YYYY ou YYYY-MM-DD)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            if (!currentPlan.canAdvancedSearch) {
              alert(`⚠️ Fonctionnalité Bloquée : Les Filtres Avancés ne sont pas disponibles avec le pack ${currentPlan.name}. Veuillez passer au pack Premium ou Intégral.`);
              return;
            }
            setShowFilters(!showFilters);
          }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
            !currentPlan.canAdvancedSearch
              ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              : showFilters || filterCampus || filterLanguage || filterLevel || filterPeriod || filterStatus || filterDebt || filterEnrollmentDate || filterTag
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="h-4.5 w-4.5" />
          Filtres Avancés {!currentPlan.canAdvancedSearch && "🔒"}
          {currentPlan.canAdvancedSearch && (
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          )}
        </button>
      </div>

      {/* Advanced Collapsible Filters Panel */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fadeIn">
          {/* Directrice Exclusive Campus Filter */}
          {isDirectrice && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-550">Campus</label>
              <select
                value={filterCampus}
                onChange={e => setFilterCampus(e.target.value)}
                className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
              >
                <option value="">Tous les Campus</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Language filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Langue du cours</label>
            <select
              value={filterLanguage}
              onChange={e => setFilterLanguage(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
            >
              <option value="">Toutes les Langues</option>
              {uniqueLanguages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Niveau (CECRL)</label>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
            >
              <option value="">Tous les Niveaux</option>
              <option value="A1">Débutant (A1)</option>
              <option value="A2">Élémentaire (A2)</option>
              <option value="B1">Intermédiaire (B1)</option>
              <option value="B2">Indépendant (B2)</option>
              <option value="C1">Autonome (C1)</option>
              <option value="C2">Maîtrise (C2)</option>
            </select>
          </div>

          {/* Sched Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Créneau horaire</label>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
            >
              <option value="">Tous les Horaires</option>
              <option value="8h">Matin (8h)</option>
              <option value="12h">Midi (12h)</option>
              <option value="15h">Après-midi (15h)</option>
              <option value="17h">Soirée (17h)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Statut scolaire</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
            >
              <option value="">Tous les Statuts (Exclut Archives)</option>
              <option value="actif">Inscrit Actif</option>
              <option value="en_attente">Liste d'Attente</option>
              <option value="expiré">Inscription Expirée</option>
              <option value="terminé">Scolarité Terminée</option>
              <option value="archivé">Dossier Archivé</option>
            </select>
          </div>

          {/* Date of Enrollment Picker Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Date d'inscription</label>
            <input
              type="date"
              value={filterEnrollmentDate}
              onChange={e => setFilterEnrollmentDate(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tag Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Étiquette / Tag de suivi</label>
            <select
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-705 bg-white"
            >
              <option value="">Tous les Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Classe Spécifique</label>
            <select
              value={filterClassId}
              onChange={e => setFilterClassId(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
            >
              <option value="">Toutes les Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.language} {c.level} — {c.period} ({c.teacherName || "Sans Enseignant"})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-550">Statut Financier / Règlement</label>
            <select
              value={filterPaymentStatus}
              onChange={e => setFilterPaymentStatus(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs text-slate-705 bg-white"
            >
              <option value="">Tous les Règlements</option>
              <option value="fully_paid">Règlement Intégral (Solde = 0)</option>
              <option value="has_debt">Solde Débiteur (Reste à payer)</option>
              <option value="overdue">🚨 Échéance Dépassée / En retard</option>
            </select>
          </div>

          {/* Debt selector */}
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="debt-check"
              checked={filterDebt}
              onChange={e => setFilterDebt(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="debt-check" className="text-xs font-semibold text-slate-750 flex items-center gap-1 cursor-pointer">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Uniquement avec solde dû
            </label>
          </div>

          {/* Reset Filters button */}
          <div className="flex items-end lg:col-span-1">
            <button
              onClick={() => {
                setFilterCampus("");
                setFilterLanguage("");
                setFilterLevel("");
                setFilterPeriod("");
                setFilterStatus("");
                setFilterDebt(false);
                setFilterClassId("");
                setFilterPaymentStatus("");
                setFilterEnrollmentDate("");
                setFilterTag("");
              }}
              className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer min-h-[36px]"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        </div>
      )}

      {/* Main Results Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="px-6 py-4">Élève</th>
                <th className="px-6 py-4">Cours assigné</th>
                <th className="px-6 py-4">Parent / Tuteur</th>
                <th className="px-6 py-4 text-right">Frais &versements</th>
                <th className="px-6 py-4 text-center">Statut paye</th>
                <th className="px-6 py-4 text-center">Échéance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Aucun élève ne correspond à vos filtres actifs ou mot-clé de recherche.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const studentClass = classes.find(c => c.id === student.classId);
                  const campusName = campuses.find(c => c.id === student.campusId)?.name || "Général";
                  
                  // Color statuses badges
                  let statusBadgeClass = "bg-green-50 text-green-700 border-green-200";
                  let statusLabel = "Actif";

                  if (student.status === "en_attente") {
                    statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    statusLabel = "Attente";
                  } else if (student.status === "expiré") {
                    statusBadgeClass = "bg-red-50 text-red-700 border-red-200";
                    statusLabel = "Expiré";
                  } else if (student.status === "terminé") {
                    statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    statusLabel = "Terminé";
                  } else if (student.status === "archivé") {
                    statusBadgeClass = "bg-slate-100 text-slate-650 border-slate-200";
                    statusLabel = "Archivé";
                  }

                  const hasDebt = student.balance > 0;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        selectedStudentId === student.id ? "bg-blue-50/25" : ""
                      }`}
                    >
                      {/* Name Card */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 uppercase">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">
                              {highlightText(student.firstName, searchQuery)}{" "}
                              {highlightText(student.lastName, searchQuery)}
                            </h4>
                            <p className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-1.5 leading-none mt-1">
                              <span>{highlightText(student.phone, searchQuery)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-400 font-sans font-medium">
                                Inscrit le {new Date(student.enrollmentDate).toLocaleDateString("fr-FR")}
                              </span>
                            </p>
                            {student.tags && student.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {student.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* assigned Class Badge */}
                      <td className="px-6 py-4">
                        {studentClass ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex max-w-max items-center gap-1 rounded-full border border-blue-100 bg-blue-50/60 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              {studentClass.language} {studentClass.level}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {campusName} • {studentClass.period}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Aucun cours</span>
                        )}
                      </td>

                      {/* Parent name */}
                      <td className="px-6 py-4">
                        <div className="text-slate-700">
                          <h5 className="text-xs font-medium">{highlightText(student.parentName, searchQuery)}</h5>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {highlightText(student.parentPhone, searchQuery)}
                          </p>
                        </div>
                      </td>

                      {/* Payment tracking column (Resolves payment visualization issue) */}
                      <td className="px-6 py-4 text-right font-mono">
                        <div className="text-xs">
                          <span className="text-slate-400">Total:</span>{" "}
                          <span className="font-bold text-slate-700">{student.totalAmount.toLocaleString()} FCFA</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400">Réglé:</span>{" "}
                          <span className="font-bold text-green-600">{student.paidAmount.toLocaleString()} FCFA</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400">Dû:</span>{" "}
                          <span className={`font-bold ${hasDebt ? "text-red-600 font-extrabold" : "text-slate-600"}`}>
                            {student.balance.toLocaleString()} FCFA
                          </span>
                        </div>
                      </td>

                      {/* Status Check badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusBadgeClass}`}>
                          {statusLabel === "Actif" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                          {statusLabel === "Terminé" && <CheckCircle2 className="h-3 w-3 text-blue-600" />}
                          {statusLabel}
                        </span>
                      </td>

                      {/* Expiration warning date */}
                      <td className="px-6 py-4 text-center text-xs text-slate-500 font-mono">
                        <span className={student.status === "expiré" ? "text-red-500 font-semibold" : ""}>
                          {new Date(student.expirationDate).toLocaleDateString("fr-FR")}
                        </span>
                      </td>

                      {/* Actions cells */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Details Page button */}
                          <button
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setCurrentTab("students"); // This Tab acts as details view when ID is selected
                            }}
                            title="Fiche & Suivi"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Quick Payment register */}
                          {hasDebt && (
                             <button
                               onClick={() => {
                                 if (!currentPlan.canManageStudents) {
                                   alert(`⚠️ Fonctionnalité Bloquée : La gestion des paiements n'est pas disponible avec le pack ${currentPlan.name}. Veuillez passer au pack Premium ou Intégral.`);
                                   return;
                                 }
                                 handleOpenFastPayment(student);
                               }}
                               title={currentPlan.canManageStudents ? "Enregistrer encaissement" : "Enregistrer encaissement (Bloqué) 🔒"}
                               className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                 !currentPlan.canManageStudents
                                   ? "text-slate-300 hover:bg-slate-50 cursor-not-allowed"
                                   : "text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                               }`}
                             >
                               <BadgeCent className="h-4.5 w-4.5" />
                             </button>
                           )}

                          {/* Print latest receipt */}
                           <button
                             onClick={() => {
                               if (!currentPlan.canGenerateReceipts) {
                                 alert(`⚠️ Fonctionnalité Bloquée : La génération de reçus n'est pas disponible avec le pack ${currentPlan.name}. Veuillez passer au pack Premium ou Intégral.`);
                                 return;
                               }
                               handlePrintReceipt(student);
                             }}
                             title={currentPlan.canGenerateReceipts ? "Générer reçu PDF" : "Générer reçu PDF (Bloqué) 🔒"}
                             className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                               !currentPlan.canGenerateReceipts
                                 ? "text-slate-300 hover:bg-slate-50 cursor-not-allowed"
                                 : "text-slate-500 hover:bg-slate-100 hover:text-purple-600"
                             }`}
                           >
                             <Printer className="h-4.5 w-4.5" />
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* QUICK FAST CHARGE POPUP COMPONENT (Modals) */}
      {paymentModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Enregistrer un Encaissment</h3>
              <button
                onClick={() => setPaymentModalStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <form onSubmit={submitFastPayment} className="mt-4 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-2">
                <p className="font-semibold text-slate-800">
                  Élève : {paymentModalStudent.firstName} {paymentModalStudent.lastName}
                </p>
                <p className="text-slate-500 font-mono mt-0.5">
                  Solde scolaire Restant à recouvrer :{" "}
                  <b className="text-red-650">{paymentModalStudent.balance.toLocaleString()} FCFA</b>
                </p>
              </div>

              {/* Amount field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Montant du versement (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Ex: 50000"
                  className="rounded-xl border border-slate-200 p-2.5 text-sm"
                />
              </div>

              {/* Payment Mode options */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Mode de paiement *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Espèces", "Mobile Money", "Virement"] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayMode(mode)}
                      className={`rounded-xl border p-2.5 text-center font-semibold cursor-pointer ${
                        payMode === mode
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Note / Commentaire (Optionnel)</label>
                <textarea
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="Ex: Deuxième tranche"
                  className="rounded-xl border border-slate-200 p-2 h-16"
                />
              </div>

              {/* Actions submit */}
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalStudent(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-200 cursor-pointer"
                >
                  Valider l'Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
