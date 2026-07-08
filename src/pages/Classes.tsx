import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { Campus, Teacher, Class, UserRole } from "../types";
import {
  GraduationCap,
  PlusCircle,
  MapPin,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle,
  X,
  Pencil,
  Trash2
} from "lucide-react";

export const Classes: React.FC = () => {
  const {
    campuses,
    teachers,
    classes,
    addCampus,
    updateCampus,
    deleteCampus,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    addClass,
    updateClass,
    deleteClass,
    updateLanguage,
    uniqueLanguages,
    currentUser,
    schoolConfig,
    updateSchoolConfig
  } = useData();

  const [activeSegment, setActiveSegment] = useState<"classes" | "teachers" | "campuses" | "languages">("classes");

  // State variables for custom language creation & editing
  const [newLanguageName, setNewLanguageName] = useState("");
  const [isSubmittingLanguage, setIsSubmittingLanguage] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
  const [languageRenameVal, setLanguageRenameVal] = useState("");

  // Standard Modals controls
  const [showCampusModal, setShowCampusModal] = useState(false);
  const [campusName, setCampusName] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherLangs, setTeacherLangs] = useState<string[]>([]);
  const [teacherCampusId, setTeacherCampusId] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [showClassModal, setShowClassModal] = useState(false);
  const [classLang, setClassLang] = useState("Allemand");
  const [classLevel, setClassLevel] = useState<"A1" | "A2" | "B1" | "B2" | "C1" | "C2">("A2");
  const [classPeriod, setClassPeriod] = useState<"8h" | "12h" | "15h" | "17h">("12h");
  const [classTeacherId, setClassTeacherId] = useState("");
  const [classCampusId, setClassCampusId] = useState("");
  const [classMaxStudents, setClassMaxStudents] = useState("20");
  const [classStartDate, setClassStartDate] = useState("2026-06-01");
  const [classEndDate, setClassEndDate] = useState("2027-06-01");
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusName || !campusAddress) return;
    setIsSubmitting(true);
    try {
      await addCampus(campusName, campusAddress);
      setCampusName("");
      setCampusAddress("");
      setShowCampusModal(false);
    } catch (err: any) {
      console.error("Erreur lors de la création du campus:", err);
      alert("Erreur lors de la création du campus : " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !teacherCampusId || teacherLangs.length === 0) {
      alert("Veuillez remplir les informations obligatoires (Nom, Campus d'attache, et Langues spécialisées).");
      return;
    }
    setIsSubmitting(true);
    try {
      await addTeacher(teacherName, teacherPhone, teacherEmail, teacherLangs, teacherCampusId);
      setTeacherName("");
      setTeacherPhone("");
      setTeacherEmail("");
      setTeacherLangs([]);
      setTeacherCampusId("");
      setShowTeacherModal(false);
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement de l'enseignant:", err);
      alert("Erreur lors de l'enregistrement de l'enseignant : " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classTeacherId || !classCampusId) {
      alert("Veuillez assigner un Professeur et un Campus.");
      return;
    }
    const max = parseInt(classMaxStudents);
    if (isNaN(max) || max <= 0) return;

    setIsSubmitting(true);
    try {
      await addClass({
        language: classLang,
        level: classLevel,
        period: classPeriod,
        teacherId: classTeacherId,
        campusId: classCampusId,
        maxStudents: max,
        startDate: classStartDate,
        endDate: classEndDate
      });
      setClassMaxStudents("20");
      setShowClassModal(false);
    } catch (err: any) {
      console.error("Erreur lors de la création de la classe:", err);
      alert("Erreur lors de la création de la classe : " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCampusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampus || !editingCampus.name || !editingCampus.address) return;
    setIsSubmitting(true);
    try {
      await updateCampus(editingCampus.id, editingCampus.name, editingCampus.address, editingCampus.isActive);
      setEditingCampus(null);
    } catch (err: any) {
      console.error("Erreur lors de la modification du campus:", err);
      alert("Erreur lors de la modification du campus : " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCampusClick = async (id: string) => {
    if (!window.confirm("⚠️ Voulez-vous vraiment supprimer ce campus ? Cette action est irréversible.")) {
      return;
    }
    try {
      await deleteCampus(id);
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + (err.message || err));
    }
  };

  const handleUpdateTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !editingTeacher.name || !editingTeacher.campusId || editingTeacher.languages.length === 0) {
      alert("Veuillez remplir les informations obligatoires.");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateTeacher(
        editingTeacher.id,
        editingTeacher.name,
        editingTeacher.phone,
        editingTeacher.email,
        editingTeacher.languages,
        editingTeacher.campusId,
        editingTeacher.isActive
      );
      setEditingTeacher(null);
    } catch (err: any) {
      console.error("Erreur lors de la modification du professeur:", err);
      alert("Erreur lors de la modification du professeur : " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacherClick = async (id: string) => {
    if (!window.confirm("⚠️ Voulez-vous vraiment supprimer ce professeur ? Cette action est irréversible.")) {
      return;
    }
    try {
      await deleteTeacher(id);
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + (err.message || err));
    }
  };

  const handleUpdateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.teacherId || !editingClass.campusId) {
      alert("Veuillez assigner un Professeur et un Campus.");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateClass(editingClass.id, {
        language: editingClass.language,
        level: editingClass.level,
        period: editingClass.period,
        teacherId: editingClass.teacherId,
        campusId: editingClass.campusId,
        maxStudents: editingClass.maxStudents,
        startDate: editingClass.startDate,
        endDate: editingClass.endDate,
        isActive: editingClass.isActive
      });
      setEditingClass(null);
    } catch (err: any) {
      console.error("Erreur lors de la modification de la classe:", err);
      alert("Erreur lors de la modification de la classe : " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClassClick = async (id: string) => {
    if (!window.confirm("⚠️ Voulez-vous vraiment supprimer cette classe ? Cette action est irréversible.")) {
      return;
    }
    try {
      await deleteClass(id);
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + (err.message || err));
    }
  };

  const handleRenameLanguageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLanguage || !languageRenameVal.trim()) return;
    
    const cleanNew = languageRenameVal.trim();
    if (uniqueLanguages.map(l => l.toLowerCase()).includes(cleanNew.toLowerCase()) && cleanNew.toLowerCase() !== editingLanguage.toLowerCase()) {
      alert("Cette langue existe déjà.");
      return;
    }

    setIsSubmittingLanguage(true);
    try {
      await updateLanguage(editingLanguage, cleanNew);
      setEditingLanguage(null);
      setLanguageRenameVal("");
    } catch (err: any) {
      console.error("Erreur lors du renommage de la langue:", err);
      alert("Erreur lors du renommage de la langue : " + (err.message || err));
    } finally {
      setIsSubmittingLanguage(false);
    }
  };

  const handleCreateLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLang = newLanguageName.trim();
    if (!cleanLang) return;

    if (uniqueLanguages.map(l => l.toLowerCase()).includes(cleanLang.toLowerCase())) {
      alert("Cette langue existe déjà.");
      return;
    }

    setIsSubmittingLanguage(true);
    try {
      const currentCustoms = schoolConfig?.customLanguages || [];
      await updateSchoolConfig({
        customLanguages: [...currentCustoms, cleanLang]
      });
      setNewLanguageName("");
    } catch (err: any) {
      console.error("Erreur lors de l'ajout de la langue:", err);
      alert("Erreur lors de l'ajout de la langue : " + (err.message || err));
    } finally {
      setIsSubmittingLanguage(false);
    }
  };

  const handleDeleteLanguage = async (lang: string) => {
    const isUsedInClass = classes.some(c => c.language === lang);
    if (isUsedInClass) {
      alert(`Impossible de supprimer cette langue : elle est actuellement enseignée dans une ou plusieurs classes.`);
      return;
    }

    if (!window.confirm(`⚠️ Confirmez-vous le retrait de la langue "${lang}" de la liste de l'établissement ?`)) {
      return;
    }

    try {
      const currentCustoms = schoolConfig?.customLanguages || [];
      await updateSchoolConfig({
        customLanguages: currentCustoms.filter(l => l !== lang)
      });
    } catch (err: any) {
      console.error("Erreur lors de la suppression de la langue:", err);
      alert("Erreur lors de la suppression de la langue : " + (err.message || err));
    }
  };

  const toggleLangSpec = (lang: string) => {
    setTeacherLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  // Helper level color decider
  const getLevelBadgeClasses = (level: string) => {
    if (level === "A1" || level === "A2") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    } else if (level === "B1" || level === "B2") {
      return "bg-green-50 text-green-700 border-green-200";
    } else {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-800">
            Structure de l'École
          </h2>
          <p className="text-sm text-slate-500">
            Configuration globale des campus, embauche des professeurs et création des classes d'exercice.
          </p>
        </div>
      </div>

      {/* Segment switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSegment("classes")}
          className={`pb-2.5 px-5 text-sm font-bold tracking-wider transition border-b-2 uppercase ${
            activeSegment === "classes"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Classes ({classes.length})
        </button>
        <button
          onClick={() => setActiveSegment("teachers")}
          className={`pb-2.5 px-5 text-sm font-bold tracking-wider transition border-b-2 uppercase ${
            activeSegment === "teachers"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Profereurs ({teachers.length})
        </button>
        <button
          onClick={() => setActiveSegment("campuses")}
          className={`pb-2.5 px-5 text-sm font-bold tracking-wider transition border-b-2 uppercase ${
            activeSegment === "campuses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Campus ({campuses.length})
        </button>
        <button
          onClick={() => setActiveSegment("languages")}
          className={`pb-2.5 px-5 text-sm font-bold tracking-wider transition border-b-2 uppercase ${
            activeSegment === "languages"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Langues ({uniqueLanguages.length})
        </button>
      </div>

      {/* Segment 1 Panel: Classes management */}
      {activeSegment === "classes" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase">Planification Scolaire</span>
            <button
              onClick={() => {
                if (campuses.length === 0 || teachers.length === 0) {
                  alert("Veuillez d'abord configurer au moins un campus et un professeur.");
                  return;
                }
                setClassCampusId(campuses[0].id);
                setClassTeacherId(teachers[0].id);
                setShowClassModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer"
            >
              <PlusCircle className="h-4.5 w-4.5" /> Créer une Classe
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {classes.map(cls => {
              const campName = campuses.find(c => c.id === cls.campusId)?.name || "Non specifie";
              const profName = teachers.find(t => t.id === cls.teacherId)?.name || "Non specifie";
              const ratio = cls.currentCount / cls.maxStudents;

              return (
                <div
                  key={cls.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex max-w-max items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${getLevelBadgeClasses(cls.level)}`}>
                        {cls.language} {cls.level}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">
                        Horaires : {cls.period}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {ratio >= 1 ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          Complet
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                          Libre
                        </span>
                      )}
                      {(currentUser?.role === UserRole.DIRECTRICE || currentUser?.role === UserRole.SUPERADMIN || currentUser?.role === UserRole.SECRETAIRE) && (
                        <div className="flex gap-1 mt-0.5">
                          <button
                            onClick={() => setEditingClass(cls)}
                            className="text-slate-405 hover:text-blue-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                            title="Modifier la classe"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClassClick(cls.id)}
                            className="text-slate-405 hover:text-red-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                            title="Supprimer la classe"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 pt-1 border-t border-slate-50">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Campus rattaché :</span>
                      <span className="font-semibold text-slate-700">{campName}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Enseignant :</span>
                      <span className="font-semibold text-slate-700">{profName}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Période académique :</span>
                      <span className="font-semibold text-slate-500 font-mono">
                        {cls.startDate} au {cls.endDate}
                      </span>
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 pt-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-450">
                      <span>Remplissage affecté</span>
                      <span>{cls.currentCount} / {cls.maxStudents} Places</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-blue-600"}`}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segment 2 Panel: Teachers roster */}
      {activeSegment === "teachers" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase">Professeurs Embauchés</span>
            <button
              onClick={() => {
                if (campuses.length === 0) {
                  alert("Veuillez d'abord configurer au moins un campus.");
                  return;
                }
                setTeacherCampusId(campuses[0].id);
                setShowTeacherModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer"
            >
              <PlusCircle className="h-4.5 w-4.5" /> Enregistrer un Professeur
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map(teach => {
              const assignedCampus = campuses.find(c => c.id === teach.campusId)?.name || "Non specifié";
              return (
                <div
                  key={teach.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3.5 items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 font-extrabold text-slate-700 uppercase">
                        Pr
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          {teach.name}
                          <span className={`inline-block h-2 w-2 rounded-full ${teach.isActive ?? true ? "bg-emerald-500" : "bg-slate-300"}`} title={teach.isActive ?? true ? "Actif" : "Inactif"} />
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{teach.phone}</p>
                      </div>
                    </div>
                    {(currentUser?.role === UserRole.DIRECTRICE || currentUser?.role === UserRole.SUPERADMIN) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingTeacher(teach)}
                          className="text-slate-405 hover:text-blue-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          title="Modifier le professeur"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacherClick(teach.id)}
                          className="text-slate-405 hover:text-red-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          title="Supprimer le professeur"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Campus d'affectation :</span>
                      <span className="font-semibold text-slate-705">{assignedCampus}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Spécialisation :</span>
                      <span className="font-semibold text-slate-705">{teach.languages.join(", ")}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Adresse email :</span>
                      <span className="font-semibold text-slate-500 font-mono">{teach.email || "Non specifié"}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segment 3 Panel: Campuses list */}
      {activeSegment === "campuses" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase">Établissements physiques</span>
            <button
              onClick={() => setShowCampusModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer"
            >
              <PlusCircle className="h-4.5 w-4.5" /> Ajouter un Campus
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {campuses.map(camp => {
              const campusSecretaries = teach => campuses.filter(u => u.id === camp.id).length; // Filter mock users Count
              return (
                <div
                  key={camp.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="flex-1 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {camp.name}
                        <span className={`inline-flex h-2 w-2 rounded-full ${camp.isActive ?? true ? "bg-emerald-500" : "bg-slate-300"}`} title={camp.isActive ?? true ? "Actif" : "Inactif"} />
                      </h4>
                      {(currentUser?.role === UserRole.DIRECTRICE || currentUser?.role === UserRole.SUPERADMIN) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingCampus(camp)}
                            className="text-slate-405 hover:text-blue-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                            title="Modifier le campus"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampusClick(camp.id)}
                            className="text-slate-405 hover:text-red-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                            title="Supprimer le campus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-500 font-medium">{camp.address}</p>
                    <p className="pt-2 border-t border-slate-50 flex justify-between text-[11px] text-slate-450 mt-2">
                      <span>Inscriptions autorisées</span>
                      <span className="font-bold text-slate-600 font-mono">100% cloud sécurisé</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segment 4 Panel: Languages management */}
      {activeSegment === "languages" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Card to create a language (Directrice & SuperAdmin only) */}
          {(currentUser?.role === UserRole.DIRECTRICE || currentUser?.role === UserRole.SUPERADMIN) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800">Ajouter une nouvelle langue</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Saisissez le nom d'une nouvelle langue pour l'ajouter à la liste de l'établissement.</p>
                </div>
              </div>
              <form onSubmit={handleCreateLanguage} className="flex flex-col sm:flex-row gap-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Ex: Espagnol, Italien, Arabe..."
                  value={newLanguageName}
                  onChange={e => setNewLanguageName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 p-2.5 text-slate-850 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingLanguage}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLanguage ? "Création..." : "Ajouter la langue"}
                </button>
              </form>
            </div>
          )}

          {/* List of all languages */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {uniqueLanguages.map(lang => {
              const isDefault = ["Allemand", "Anglais", "Chinois", "Espagnol", "Français", "Italien", "Portugais", "Russe"].includes(lang);
              const classesCount = classes.filter(c => c.language === lang).length;
              return (
                <div key={lang} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 text-sm">{lang}</span>
                    <div className="flex gap-2 items-center text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${isDefault ? "bg-slate-100 text-slate-600" : "bg-purple-100 text-purple-700"}`}>
                        {isDefault ? "Standard" : "Personnalisée"}
                      </span>
                      <span className="text-slate-400">{classesCount} classe(s)</span>
                    </div>
                  </div>
                  {!isDefault && (currentUser?.role === UserRole.DIRECTRICE || currentUser?.role === UserRole.SUPERADMIN) && (
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLanguage(lang);
                          setLanguageRenameVal(lang);
                        }}
                        className="text-slate-450 hover:text-blue-600 hover:bg-slate-50 rounded-lg p-1.5 transition inline-flex items-center cursor-pointer"
                        title="Renommer la langue"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLanguage(lang)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition inline-flex items-center cursor-pointer"
                        title="Supprimer la langue"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SHOW CLASS MODAL WIZARDS */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Planifier une Nouvelle Classe</h3>
              <button onClick={() => setShowClassModal(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs text-slate-700">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Lang Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Langue du cours</label>
                  <input
                    type="text"
                    list="language-options"
                    value={classLang}
                    onChange={e => setClassLang(e.target.value)}
                    placeholder="Saisir ou choisir..."
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  />
                  <datalist id="language-options">
                    {uniqueLanguages.map(lang => (
                      <option key={lang} value={lang} />
                    ))}
                  </datalist>
                </div>

                {/* Level Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Niveau (CECRL)</label>
                  <select
                    value={classLevel}
                    onChange={e => setClassLevel(e.target.value as any)}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    <option value="A1">Débutant (A1)</option>
                    <option value="A2">Élémentaire (A2)</option>
                    <option value="B1">Intermédiaire (B1)</option>
                    <option value="B2">Indépendant (B2)</option>
                    <option value="C1">Autonome (C1)</option>
                    <option value="C2">Maîtrise (C2)</option>
                  </select>
                </div>

                {/* Period Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Créneau horaire</label>
                  <select
                    value={classPeriod}
                    onChange={e => setClassPeriod(e.target.value as any)}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    <option value="8h">Matin (8h)</option>
                    <option value="12h">Midi (12h)</option>
                    <option value="15h">Après-midi (15h)</option>
                    <option value="17h">Soirée (17h)</option>
                  </select>
                </div>

                {/* Target Max */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Capacité sièges (Max Éléves)</label>
                  <input
                    type="number"
                    required
                    value={classMaxStudents}
                    onChange={e => setClassMaxStudents(e.target.value)}
                    className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                  />
                </div>

                {/* Campus Target */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-semibold text-slate-650">Campus d'affectation</label>
                  <select
                    value={classCampusId}
                    onChange={e => setClassCampusId(e.target.value)}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Teacher Assign */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-semibold text-slate-650">Enseignant désigné</label>
                  <select
                    value={classTeacherId}
                    onChange={e => setClassTeacherId(e.target.value)}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.languages.join(", ")})</option>
                    ))}
                  </select>
                </div>

                {/* Dates picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Date de début sésion</label>
                  <input
                    type="date"
                    required
                    value={classStartDate}
                    onChange={e => setClassStartDate(e.target.value)}
                    className="rounded-xl border border-slate-200 p-2 bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Date de fin académique</label>
                  <input
                    type="date"
                    required
                    value={classEndDate}
                    onChange={e => setClassEndDate(e.target.value)}
                    className="rounded-xl border border-slate-200 p-2 bg-white"
                  />
                </div>
              </div>

              {/* Actions submit */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Planification..." : "Planifier la Classe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMPUS MODAL FORM */}
      {showCampusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Ajouter un Établissement (Campus)</h3>
              <button onClick={() => setShowCampusModal(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampus} className="space-y-4 text-xs text-slate-700">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Nom complet du Campus *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campus Sud"
                  value={campusName}
                  onChange={e => setCampusName(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Adresse civique exacte *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boulevard de la Réunification, Yaoundé"
                  value={campusAddress}
                  onChange={e => setCampusAddress(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowCampusModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Création..." : "Créer le Campus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER MODAL FORM */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Enregistrer un Enseignant</h3>
              <button onClick={() => setShowTeacherModal(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs text-slate-700">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Nom complet de l'Enseignant *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Marc Fabre"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Téléphone de contact *</label>
                <input
                  type="tel"
                  placeholder="Ex: +237 691 112 233"
                  value={teacherPhone}
                  onChange={e => setTeacherPhone(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Adresse email professionnelle</label>
                <input
                  type="email"
                  placeholder="Ex: m.fabre@lingua.com"
                  value={teacherEmail}
                  onChange={e => setTeacherEmail(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* Languages checkboxes spec list */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Langues enseignées (Choisir ou ajouter) *</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {uniqueLanguages.map(lang => {
                    const active = teacherLangs.includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => toggleLangSpec(lang)}
                        className={`rounded-xl border px-3 py-1.5 text-center text-[11px] font-bold cursor-pointer transition ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-600"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                  {/* Custom language input */}
                  <input
                    type="text"
                    placeholder="Autre langue..."
                    className="rounded-xl border border-slate-200 px-3 py-1 text-[11px] outline-none focus:border-blue-500 w-32"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !teacherLangs.includes(val)) {
                          toggleLangSpec(val);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <span className="text-[9px] text-slate-400 -ml-1">(Entrée pour valider)</span>
                </div>
              </div>

              {/* Campus attachment */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Campus d'affectation principal *</label>
                <select
                  value={teacherCampusId}
                  onChange={e => setTeacherCampusId(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                >
                  <option value="">-- Choisir un campus --</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer l'Enseignant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT CAMPUS MODAL FORM */}
      {editingCampus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Modifier le Campus</h3>
              <button onClick={() => setEditingCampus(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCampusSubmit} className="space-y-4 text-xs text-slate-700">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Nom complet du Campus *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campus Sud"
                  value={editingCampus.name}
                  onChange={e => setEditingCampus({ ...editingCampus, name: e.target.value })}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Adresse civique exacte *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boulevard de la Réunification, Yaoundé"
                  value={editingCampus.address}
                  onChange={e => setEditingCampus({ ...editingCampus, address: e.target.value })}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="campus-active-checkbox"
                  checked={editingCampus.isActive}
                  onChange={e => setEditingCampus({ ...editingCampus, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="campus-active-checkbox" className="font-semibold text-slate-650">Campus Actif / Ouvert</label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingCampus(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-55"
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEACHER MODAL FORM */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Modifier l'Enseignant</h3>
              <button onClick={() => setEditingTeacher(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTeacherSubmit} className="space-y-4 text-xs text-slate-700">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Nom complet de l'Enseignant *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Marc Fabre"
                  value={editingTeacher.name}
                  onChange={e => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Téléphone de contact *</label>
                <input
                  type="tel"
                  placeholder="Ex: +237 691 112 233"
                  value={editingTeacher.phone}
                  onChange={e => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Adresse email professionnelle</label>
                <input
                  type="email"
                  placeholder="Ex: m.fabre@lingua.com"
                  value={editingTeacher.email || ""}
                  onChange={e => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* Languages checkboxes spec list */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Langues enseignées (Choisir ou ajouter) *</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {uniqueLanguages.map(lang => {
                    const active = editingTeacher.languages.includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => {
                          const updated = active
                            ? editingTeacher.languages.filter(l => l !== lang)
                            : [...editingTeacher.languages, lang];
                          setEditingTeacher({ ...editingTeacher, languages: updated });
                        }}
                        className={`rounded-xl border px-3 py-1.5 text-center text-[11px] font-bold cursor-pointer transition ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-600"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                  <input
                    type="text"
                    placeholder="Autre langue..."
                    className="rounded-xl border border-slate-200 px-3 py-1 text-[11px] outline-none focus:border-blue-500 w-32"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !editingTeacher.languages.includes(val)) {
                          setEditingTeacher({ ...editingTeacher, languages: [...editingTeacher.languages, val] });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Campus attachment */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Campus d'affectation principal *</label>
                <select
                  value={editingTeacher.campusId}
                  onChange={e => setEditingTeacher({ ...editingTeacher, campusId: e.target.value })}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                >
                  <option value="">-- Choisir un campus --</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="teacher-active-checkbox"
                  checked={editingTeacher.isActive ?? true}
                  onChange={e => setEditingTeacher({ ...editingTeacher, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="teacher-active-checkbox" className="font-semibold text-slate-650">Enseignant Actif</label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-55"
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL FORM */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Modifier la Classe</h3>
              <button onClick={() => setEditingClass(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateClassSubmit} className="space-y-4 text-xs text-slate-700">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Lang Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Langue du cours</label>
                  <input
                    type="text"
                    list="language-options-edit"
                    value={editingClass.language}
                    onChange={e => setEditingClass({ ...editingClass, language: e.target.value })}
                    placeholder="Saisir ou choisir..."
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  />
                  <datalist id="language-options-edit">
                    {uniqueLanguages.map(lang => (
                      <option key={lang} value={lang} />
                    ))}
                  </datalist>
                </div>

                {/* Level Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Niveau (CECRL)</label>
                  <select
                    value={editingClass.level}
                    onChange={e => setEditingClass({ ...editingClass, level: e.target.value as any })}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    <option value="A1">Débutant (A1)</option>
                    <option value="A2">Élémentaire (A2)</option>
                    <option value="B1">Intermédiaire (B1)</option>
                    <option value="B2">Indépendant (B2)</option>
                    <option value="C1">Autonome (C1)</option>
                    <option value="C2">Maîtrise (C2)</option>
                  </select>
                </div>

                {/* Period Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Créneau horaire</label>
                  <select
                    value={editingClass.period}
                    onChange={e => setEditingClass({ ...editingClass, period: e.target.value as any })}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    <option value="8h">Matin (8h)</option>
                    <option value="12h">Midi (12h)</option>
                    <option value="15h">Après-midi (15h)</option>
                    <option value="17h">Soirée (17h)</option>
                  </select>
                </div>

                {/* Target Max */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Capacité sièges (Max Éléves)</label>
                  <input
                    type="number"
                    required
                    value={editingClass.maxStudents}
                    onChange={e => setEditingClass({ ...editingClass, maxStudents: parseInt(e.target.value) || 0 })}
                    className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                  />
                </div>

                {/* Campus Target */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-semibold text-slate-650">Campus d'affectation</label>
                  <select
                    value={editingClass.campusId}
                    onChange={e => setEditingClass({ ...editingClass, campusId: e.target.value })}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Teacher Assign */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="font-semibold text-slate-650">Enseignant désigné</label>
                  <select
                    value={editingClass.teacherId}
                    onChange={e => setEditingClass({ ...editingClass, teacherId: e.target.value })}
                    className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.languages.join(", ")})</option>
                    ))}
                  </select>
                </div>

                {/* Dates picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Date de début session</label>
                  <input
                    type="date"
                    required
                    value={editingClass.startDate}
                    onChange={e => setEditingClass({ ...editingClass, startDate: e.target.value })}
                    className="rounded-xl border border-slate-200 p-2 bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-650">Date de fin académique</label>
                  <input
                    type="date"
                    required
                    value={editingClass.endDate}
                    onChange={e => setEditingClass({ ...editingClass, endDate: e.target.value })}
                    className="rounded-xl border border-slate-200 p-2 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="class-active-checkbox"
                  checked={editingClass.isActive}
                  onChange={e => setEditingClass({ ...editingClass, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="class-active-checkbox" className="font-semibold text-slate-650">Classe Active</label>
              </div>

              {/* Actions submit */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-55"
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LANGUAGE MODAL FORM */}
      {editingLanguage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Renommer la langue "{editingLanguage}"</h3>
              <button onClick={() => setEditingLanguage(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleRenameLanguageSubmit} className="space-y-4 text-xs text-slate-700">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Nouveau nom de la langue *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Espagnol"
                  value={languageRenameVal}
                  onChange={e => setLanguageRenameVal(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingLanguage(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLanguage}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer disabled:opacity-55"
                >
                  {isSubmittingLanguage ? "Enregistrement..." : "Renommer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
