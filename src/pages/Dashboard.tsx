import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { UserRole } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import {
  Users,
  TrendingDown,
  TrendingUp,
  Clock,
  UserPlus,
  Coins,
  AlertOctagon,
  Calendar,
  Layers,
  CheckCircle,
  GraduationCap,
  X,
  AlertCircle,
  Info,
  Sparkles,
  ArrowRight,
  Award,
  BookOpen,
  MapPin,
  Bell,
  AlertTriangle,
  FileWarning,
  MessageSquare
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { D3CourseChart } from "../components/analytics/D3CourseChart";
import { D3PaymentsChart } from "../components/analytics/D3PaymentsChart";
import { RechartsEnrollmentChart } from "../components/analytics/RechartsEnrollmentChart";
import { RechartsRevenueChart } from "../components/analytics/RechartsRevenueChart";

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  setSelectedStudentId: (id: string | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab, setSelectedStudentId }) => {
  const { currentUser, campuses, teachers, classes, students, payments, auditLogs, waitlist, addStudent, schoolConfig, updateStudent } = useData();
  const { t, isEn } = useTranslation();

  // Temporal Filter for D3 Charts/Dashboard
  const [timePeriod, setTimePeriod] = useState<"all" | "week" | "month" | "quarter" | "year" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dashboardSubTab, setDashboardSubTab] = useState<"standard" | "synthese" | "comparatif">("standard");

  const isDirectrice = currentUser?.role === UserRole.DIRECTRICE;
  const userCampusId = currentUser?.campusId;
  
  // Selected Campus Filter (Directrice starts with her assigned campus or first campus, seeing Secretary's local indicators, but can filter/toggle)
  const [selectedCampusId, setSelectedCampusId] = useState<string>(userCampusId || "campus_01");

  // Quick Add Modal States
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [targetCampusId, setTargetCampusId] = useState(userCampusId || "campus_01");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [totalCost, setTotalCost] = useState("180000");
  const [paidAmount, setPaidAmount] = useState("80000");
  const [payMode, setPayMode] = useState<"Espèces" | "Mobile Money" | "Virement">("Espèces");
  const [payNote, setPayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Simulation alerts relance states
  const [relanceLoadingId, setRelanceLoadingId] = useState<string | null>(null);
  const [panelFeedback, setPanelFeedback] = useState<{ id: string; type: "relance" | "complet" | "expiration"; msg: string } | null>(null);

  // Synchronize default campus IDs with actual data (solves empty dashboard for directrice)
  React.useEffect(() => {
    if (campuses.length > 0) {
      if (selectedCampusId !== "all" && !campuses.some(c => c.id === selectedCampusId)) {
        setSelectedCampusId(userCampusId && campuses.some(c => c.id === userCampusId) ? userCampusId : campuses[0].id);
      }
      if (!campuses.some(c => c.id === targetCampusId)) {
        setTargetCampusId(userCampusId && campuses.some(c => c.id === userCampusId) ? userCampusId : campuses[0].id);
      }
    }
  }, [campuses, selectedCampusId, targetCampusId, userCampusId]);

  // Derived properties for Quick Add Class Selection
  const quickAddCampusClasses = useMemo(() => {
    return classes.filter(c => c.campusId === targetCampusId && c.isActive);
  }, [classes, targetCampusId]);

  const resolvedQuickAddClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const resolvedQuickAddTeacherName = useMemo(() => {
    if (!resolvedQuickAddClass) return "";
    return teachers.find(t => t.id === resolvedQuickAddClass.teacherId)?.name || "Non assigné";
  }, [teachers, resolvedQuickAddClass]);

  const isQuickAddClassFull = useMemo(() => {
    if (!resolvedQuickAddClass) return false;
    return resolvedQuickAddClass.currentCount >= resolvedQuickAddClass.maxStudents;
  }, [resolvedQuickAddClass]);

  // Handle Clean closing of Modal
  const handleCloseModal = () => {
    setIsQuickAddOpen(false);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setParentName("");
    setParentPhone("");
    setTargetCampusId(userCampusId && campuses.some(c => c.id === userCampusId) ? userCampusId : (campuses.length > 0 ? campuses[0].id : ""));
    setSelectedClassId("");
    setTotalCost("180000");
    setPaidAmount("80000");
    setPayMode("Espèces");
    setPayNote("");
    setModalError("");
    setModalSuccess("");
  };

  // Submit Quick Add student Action
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    if (!firstName || !lastName || !phone || !parentName || !parentPhone) {
      setModalError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    if (!selectedClassId) {
      setModalError("Veuillez choisir une classe d'apprentissage.");
      return;
    }

    const costNum = parseFloat(totalCost);
    const paidNum = parseFloat(isQuickAddClassFull ? "0" : paidAmount);

    if (isNaN(costNum) || isNaN(paidNum)) {
      setModalError("Le prix ou le montant versé est invalide.");
      return;
    }

    setSubmitting(true);

    try {
      const enrollmentDate = new Date().toISOString().split("T")[0];
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 365); // Default to standard 1 year license
      const expirationDate = expiry.toISOString().split("T")[0];

      const studentPayload = {
        firstName,
        lastName,
        birthDate: "2000-01-01",
        phone,
        email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@linguainscript.com`,
        parentName,
        parentPhone,
        campusId: targetCampusId,
        classId: selectedClassId,
        enrollmentDate,
        expirationDate,
        totalAmount: costNum
      };

      const result = await addStudent(
        studentPayload,
        paidNum,
        paidNum > 0 ? payMode : null,
        payNote || "Acompte d'inscription rapide (Dashboard)",
        isQuickAddClassFull
      );

      if (result.success) {
        setModalSuccess(result.message);
        // Refresh component state parameters slightly or rely on onSnapshot updates
      } else {
        setModalError(result.message);
      }
    } catch (err: any) {
      setModalError(err.message || "Une erreur est survenue lors de l'enregistrement rapide.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter entities according to selected or assigned campus
  const viewCampuses = isDirectrice 
    ? (selectedCampusId === "all" ? campuses : campuses.filter(c => c.id === selectedCampusId))
    : campuses.filter(c => c.id === userCampusId);

  const viewClasses = isDirectrice
    ? (selectedCampusId === "all" ? classes : classes.filter(c => c.campusId === selectedCampusId))
    : classes.filter(c => c.campusId === userCampusId);

  const viewStudents = isDirectrice
    ? (selectedCampusId === "all" ? students : students.filter(s => s.campusId === selectedCampusId))
    : students.filter(s => s.campusId === userCampusId);

  const viewPayments = isDirectrice
    ? (selectedCampusId === "all" ? payments : payments.filter(p => students.some(s => s.id === p.studentId && s.campusId === selectedCampusId)))
    : payments.filter(p => students.some(s => s.id === p.studentId && s.campusId === userCampusId));

  const viewAuditLogs = isDirectrice
    ? (selectedCampusId === "all" ? auditLogs : auditLogs.filter(l => l.campusId === selectedCampusId))
    : auditLogs.filter(l => l.campusId === userCampusId);

  const viewWaitlist = isDirectrice
    ? (selectedCampusId === "all" ? waitlist : waitlist.filter(w => {
        const parentClass = classes.find(c => c.id === w.classId);
        return parentClass && parentClass.campusId === selectedCampusId;
      }))
    : waitlist.filter(w => {
        const parentClass = classes.find(c => c.id === w.classId);
        return parentClass && parentClass.campusId === userCampusId;
      });

  // Contextual Month-End Alert synthesizers
  const monthlyAlerts = useMemo(() => {
    // 1. Urgent Overdue payments: Active with balance > 0
    const urgentPayments = viewStudents.filter(s => s.status === "actif" && s.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    // 2. Incomplete files: Active with tag "Dossier incomplet"
    const incompleteFiles = viewStudents.filter(s => s.status === "actif" && s.tags?.includes("Dossier incomplet"));

    // 3. Imminent expirations: Active expiring within 30 days
    const imminentExpirations = viewStudents.filter(s => {
      if (s.status !== "actif") return false;
      const diff = new Date(s.expirationDate).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

    return {
      urgentPayments,
      incompleteFiles,
      imminentExpirations
    };
  }, [viewStudents]);

  // Comparative registration analytics (Month-over-Month)
  const momComparisonData = useMemo(() => {
    // Current month is 2026-06 (June) and previous month is 2026-05 (May)
    const currentMonthPrefix = "2026-06";
    const previousMonthPrefix = "2026-05";

    const currentEnrollments = viewStudents.filter(s => s.enrollmentDate && s.enrollmentDate.startsWith(currentMonthPrefix));
    const previousEnrollments = viewStudents.filter(s => s.enrollmentDate && s.enrollmentDate.startsWith(previousMonthPrefix));

    const countCurrent = currentEnrollments.length;
    const countPrevious = previousEnrollments.length;

    // Growth calculation
    let pctGrowth = 0;
    if (countPrevious > 0) {
      pctGrowth = Math.round(((countCurrent - countPrevious) / countPrevious) * 100);
    } else if (countCurrent > 0) {
      pctGrowth = 100;
    }

    // Breakdown by campus
    const campusBreakdown = viewCampuses.map(camp => {
      const campCur = currentEnrollments.filter(s => s.campusId === camp.id).length;
      const campPrev = previousEnrollments.filter(s => s.campusId === camp.id).length;
      let campGrowth = 0;
      if (campPrev > 0) {
        campGrowth = Math.round(((campCur - campPrev) / campPrev) * 100);
      } else if (campCur > 0) {
        campGrowth = 100;
      }
      return {
        id: camp.id,
        name: camp.name,
        current: campCur,
        previous: campPrev,
        growth: campGrowth
      };
    });

    // Breakdown by language course
    const uniqueLanguages = Array.from(new Set(viewClasses.map(c => c.language)));
    const languageBreakdown = uniqueLanguages.map(lang => {
      const classIds = viewClasses.filter(c => c.language === lang).map(c => c.id);
      const langCur = currentEnrollments.filter(s => classIds.includes(s.classId)).length;
      const langPrev = previousEnrollments.filter(s => classIds.includes(s.classId)).length;
      let langGrowth = 0;
      if (langPrev > 0) {
        langGrowth = Math.round(((langCur - langPrev) / langPrev) * 100);
      } else if (langCur > 0) {
        langGrowth = 100;
      }
      return {
        language: lang,
        current: langCur,
        previous: langPrev,
        growth: langGrowth
      };
    });

    return {
      countCurrent,
      countPrevious,
      pctGrowth,
      campusBreakdown,
      languageBreakdown,
      currentStudents: currentEnrollments,
      previousStudents: previousEnrollments
    };
  }, [viewStudents, viewCampuses, viewClasses]);

  // Date boundary calculator
  const currentDateBounds = useMemo(() => {
    const refDate = new Date("2026-06-12T12:00:00");
    let start: Date | null = null;
    let end: Date | null = null;

    if (timePeriod === "week") {
      // Start of current week (Monday)
      const startRef = new Date(refDate);
      const day = startRef.getDay();
      const diffToMonday = startRef.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(startRef.setDate(diffToMonday));
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timePeriod === "month") {
      // First day of current month (June)
      start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timePeriod === "quarter") {
      // First day of current quarter
      const currentQuarterMonth = Math.floor(refDate.getMonth() / 3) * 3;
      start = new Date(refDate.getFullYear(), currentQuarterMonth, 1);
      end = new Date(refDate.getFullYear(), currentQuarterMonth + 3, 0, 23, 59, 59, 999);
    } else if (timePeriod === "year") {
      // First day of current year
      start = new Date(refDate.getFullYear(), 0, 1);
      end = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (timePeriod === "custom") {
      if (customStartDate) {
        start = new Date(customStartDate + "T00:00:00");
      }
      if (customEndDate) {
        end = new Date(customEndDate + "T23:59:59");
      }
    }

    return { start, end };
  }, [timePeriod, customStartDate, customEndDate]);

  // Compute dynamic filtered lists
  const filteredStudents = useMemo(() => {
    const { start, end } = currentDateBounds;
    if (!start && !end) return viewStudents;
    return viewStudents.filter(s => {
      if (!s.enrollmentDate) return false;
      const d = new Date(s.enrollmentDate + "T12:00:00");
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [viewStudents, currentDateBounds]);

  const filteredPayments = useMemo(() => {
    const { start, end } = currentDateBounds;
    if (!start && !end) {
      if (timePeriod === "all") {
        // Default to June for "all" to match original Recettes view
        return viewPayments.filter(p => p.date.startsWith("2026-06"));
      }
      return viewPayments;
    }
    return viewPayments.filter(p => {
      if (!p.date) return false;
      const d = new Date(p.date + "T12:00:00");
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [viewPayments, currentDateBounds, timePeriod]);

  // Calculate metrics based on temporal boundaries
  const activeStudents = filteredStudents.filter(s => s.status === "actif");
  const totalStudentsCount = activeStudents.length;

  const collectedThisMonth = filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);

  const studentsWithBalance = filteredStudents.filter(s => s.balance > 0 && s.status === "actif");
  const totalReceivable = studentsWithBalance.reduce((acc, curr) => acc + curr.balance, 0);

  // Overdue students (expirationDate has passed & balance > 0)
  const overdueStudents = useMemo(() => {
    return filteredStudents.filter(s => {
      if (s.balance <= 0 || (s.status !== "actif" && s.status !== "en_attente")) return false;
      const dDate = new Date(s.expirationDate).getTime();
      return dDate < Date.now();
    });
  }, [filteredStudents]);

  const totalOverdueAmount = useMemo(() => {
    return overdueStudents.reduce((acc, curr) => acc + curr.balance, 0);
  }, [overdueStudents]);

  // Expiring within 14 days
  const expiringCount = filteredStudents.filter(s => {
    if (s.status !== "actif") return false;
    const diff = new Date(s.expirationDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 14;
  }).length;

  // Full classes (100%)
  const fullClassesCount = viewClasses.filter(c => c.currentCount >= c.maxStudents).length;

  // Pie chart calculation: registrations by language share
  const languageDataMap = filteredStudents.reduce((acc: { [key: string]: number }, stud) => {
    const cls = classes.find(c => c.id === stud.classId);
    if (cls) {
      acc[cls.language] = (acc[cls.language] || 0) + 1;
    }
    return acc;
  }, {});

  const languageChartData = Object.entries(languageDataMap).map(([name, value]) => ({
    name,
    value
  }));

  const filteredStudentsForCharts = filteredStudents;
  const filteredPaymentsForCharts = filteredPayments;

  // Compilers for D3 Inscriptions Par Cours and Payments Par Mois
  const courseInscriptionsMap = useMemo(() => {
    return filteredStudentsForCharts.reduce((acc: { [key: string]: number }, student) => {
      const cls = viewClasses.find(c => c.id === student.classId);
      const courseName = cls ? `${cls.language} ${cls.level}` : "Non assigné";
      acc[courseName] = (acc[courseName] || 0) + 1;
      return acc;
    }, {});
  }, [filteredStudentsForCharts, viewClasses]);

  const courseD3Data = useMemo(() => {
    return Object.entries(courseInscriptionsMap).map(([name, val]) => ({
      name,
      value: Number(val)
    })).sort((a, b) => b.value - a.value);
  }, [courseInscriptionsMap]);

  const frenchMonths = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const monthlyPaymentsMap = useMemo(() => {
    return filteredPaymentsForCharts.reduce((acc: { [key: string]: number }, p) => {
      if (!p.date) return acc;
      const parts = p.date.split("-");
      if (parts.length >= 2) {
        const year = parts[0];
        const monthStr = parts[1];
        const key = `${year}-${monthStr}`;
        acc[key] = (acc[key] || 0) + p.amount;
      }
      return acc;
    }, {});
  }, [filteredPaymentsForCharts]);

  const activeMonths = useMemo(() => {
    return Object.keys(monthlyPaymentsMap).sort();
  }, [monthlyPaymentsMap]);

  const defaultMonthsList = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  const finalMonthsList = useMemo(() => {
    return activeMonths.length > 0 ? activeMonths : defaultMonthsList;
  }, [activeMonths, defaultMonthsList]);

  const paymentsD3Data = useMemo(() => {
    return finalMonthsList.map(monthKey => {
      const [year, monthStr] = monthKey.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;
      const label = monthIdx >= 0 && monthIdx < 12 ? `${frenchMonths[monthIdx]} ${year.substring(2)}` : monthKey;
      return {
        month: monthKey,
        amount: monthlyPaymentsMap[monthKey] || 0,
        label
      };
    });
  }, [finalMonthsList, monthlyPaymentsMap]);

  const COLORS = ["#2563EB", "#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

  // Bar Chart data: revenues by campus (only relevant if directrice)
  const revenueByCampusData = campuses.map(camp => {
    const campStudents = students.filter(s => s.campusId === camp.id);
    const campPayments = payments.filter(p => campStudents.some(s => s.id === p.studentId));
    const totalAmount = campPayments.reduce((sum, p) => sum + p.amount, 0);
    return { name: camp.name, Recettes: totalAmount };
  });

  // Inscriptions over recent 6 months (mock database distribution)
  const timelineRegistryData = [
    { name: "Janv", Inscriptions: 8 },
    { name: "Févr", Inscriptions: 12 },
    { name: "Mars", Inscriptions: 15 },
    { name: "Avril", Inscriptions: 22 },
    { name: "Mai", Inscriptions: 31 },
    { name: "Juin", Inscriptions: viewStudents.length }
  ];

  const handleActionClick = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-slate-900 border-b-0 pb-0 flex flex-wrap items-center gap-2">
            <span>Tableau de Bord</span>
            {isDirectrice && (
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500 shadow-xs cursor-pointer"
              >
                <option value="all">Consolidé (Tous les campus)</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {!isDirectrice && viewCampuses[0] && (
              <span className="text-slate-500 text-sm font-medium">— {viewCampuses[0].name}</span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDirectrice
              ? "Ajustez le filtre d'établissement pour consulter les mêmes indicateurs locaux et alertes que votre Secrétaire."
              : "Suivi des inscriptions et encaissements sur votre établissement."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-blue-250 cursor-pointer font-sans"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Inscription Rapide</span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-blue-50 text-blue-700 px-2.5 py-2 rounded border border-[#bfdbfe] font-bold">
            <Calendar className="h-3.5 w-3.5" />
            <span>SCOLAIRE ACTIVE : 2026</span>
          </div>
        </div>
      </div>

      {/* Dynamic Global Temporal Filters & Date Picker */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800">Filtre Temporel Global (Directrices & Vision)</h3>
              <p className="text-[11px] text-slate-400">Ajustez dynamiquement la période de calcul de toutes les statistiques, alertes et graphiques.</p>
            </div>
          </div>

          {/* Quick presets group */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "Tout (Juin)" },
              { id: "week", label: "Cette semaine" },
              { id: "month", label: "Ce mois" },
              { id: "quarter", label: "Ce trimestre" },
              { id: "year", label: "Cette année" },
              { id: "custom", label: "Sélection libre 📅" }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setTimePeriod(preset.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  timePeriod === preset.id
                    ? "bg-blue-600 text-white shadow-sm font-extrabold"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-155"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range picking fields (expanded only if custom is selected) */}
        {timePeriod === "custom" && (
          <div className="grid gap-3.5 sm:grid-cols-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Date de début</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full text-xs font-sans font-medium text-slate-800 border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Date de fin</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full text-xs font-sans font-medium text-slate-800 border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:border-blue-600"
              />
            </div>
          </div>
        )}

        {/* Current dynamic range summary indicator */}
        <div className="text-[10px] font-mono text-slate-450 flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Période active :</span>
          <span className="font-bold text-slate-700">
            {currentDateBounds.start ? currentDateBounds.start.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Début des temps"}
          </span>
          <span>jusqu'au</span>
          <span className="font-bold text-slate-700">
            {currentDateBounds.end ? currentDateBounds.end.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Présent"}
          </span>
        </div>
      </div>

      {/* Visual Alerts for Overdue Payments */}
      {overdueStudents.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn ring-1 ring-rose-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 text-white rounded-2xl animate-pulse shadow-md shadow-red-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-sans font-black text-sm text-red-900 uppercase tracking-tight">ALERTE CRITIQUE : Échéances Dépassées</h3>
                <p className="text-xs text-red-750 font-medium">
                  {overdueStudents.length} {overdueStudents.length === 1 ? "élève a" : "élèves ont"} dépassé la date d'échéance de paiement requise avec un solde restant dû.
                </p>
              </div>
            </div>
            
            <div className="bg-rose-100/80 px-4 py-2 rounded-xl text-center border border-rose-200">
              <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider leading-none">Total en Souffrance</p>
              <h4 className="text-lg font-black text-red-750 mt-1 font-sans">{totalOverdueAmount.toLocaleString()} <span className="text-[10px] font-semibold text-red-700">FCFA</span></h4>
            </div>
          </div>

          <div className="border-t border-rose-200/60 pt-3">
            <p className="text-[10px] font-mono font-bold text-red-700 uppercase tracking-widest mb-2.5">
              ⚠️ Liste des fiches en dépassement d'échéance administrative :
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {overdueStudents.slice(0, 9).map(student => {
                const cls = classes.find(c => c.id === student.classId);
                const classLabel = cls ? `${cls.language} ${cls.level}` : "Non déterminée";
                const overdueDays = Math.ceil((Date.now() - new Date(student.expirationDate).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div 
                    key={student.id}
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setCurrentTab("students");
                    }}
                    className="bg-white/95 border border-rose-100 hover:border-red-300 rounded-xl p-3 flex justify-between items-center text-xs shadow-xs transition-all hover:shadow-sm cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-sans font-black text-slate-800 truncate">{student.firstName} {student.lastName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">Classe : {classLabel}</p>
                      <p className="text-[9px] text-red-700 font-bold mt-1 inline-flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md">
                        En retard de {overdueDays}j (Échéance : {new Date(student.expirationDate).toLocaleDateString("fr-FR")})
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-red-655">{student.balance.toLocaleString()}</span>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">FCFA</p>
                    </div>
                  </div>
                );
              })}
              {overdueStudents.length > 9 && (
                <div 
                  onClick={() => setCurrentTab("students")}
                  className="bg-rose-100 hover:bg-rose-200 border border-dashed border-rose-300 rounded-xl p-3 flex items-center justify-center text-xs text-red-750 font-bold cursor-pointer transition-all"
                >
                  Et {overdueStudents.length - 9} autres fiches... de l'école
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              {timePeriod === "all" ? "Total Élèves Actifs" : "Nouveaux Inscrits"}
            </div>
            <div className="text-2xl font-black mt-1 text-slate-900">{totalStudentsCount}</div>
          </div>
          <div className="text-[10px] text-emerald-500 mt-2 font-bold flex items-center gap-1">
            <span>↑ {activeStudents.length} actifs sur la période</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              {timePeriod === "all" ? "Recettes Mensuelles (Juin)" : "Recettes de la Période"}
            </div>
            <div className="text-2xl font-black mt-1 text-slate-900">
              {collectedThisMonth.toLocaleString()} <span className="text-xs font-normal text-slate-400">FCFA</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-450 mt-2 italic font-semibold">
            Sécurisé en temps réel
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm ring-1 ring-amber-100 flex flex-col justify-between">
          <div>
            <div className="text-amber-600 text-[10px] uppercase font-bold tracking-wider">Retard de Paiement</div>
            <div className="text-2xl font-black mt-1 text-amber-600">
              {totalReceivable.toLocaleString()} <span className="text-xs font-normal text-amber-500">FCFA</span>
            </div>
          </div>
          <div className="text-[10px] text-amber-500 mt-2 font-bold flex items-center gap-1">
            <span>⚠️ Sur {studentsWithBalance.length} fiches actives</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Alertes Actions</div>
            <div className="text-2xl font-black mt-1 text-slate-900">
              {expiringCount + fullClassesCount + viewWaitlist.length}
            </div>
          </div>
          <div className="text-[10px] text-blue-500 mt-2 font-bold">
            {expiringCount} exp. · {fullClassesCount} classes pleines
          </div>
        </div>
      </div>

      {/* Contextual Month-End Notifications (Directrice Action Centre) */}
      <div className="rounded-2xl border border-blue-105 bg-gradient-to-r from-blue-50/40 to-indigo-50/20 p-5 shadow-xs space-y-4 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-blue-100/60 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Bell className="h-4.5 w-4.5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800">
                {t("directriceActionCenter")} {isEn ? "(June 2026)" : "(Juin 2026)"}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {t("directriceActionCenterDesc")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto text-[10px] bg-blue-100/50 text-blue-800 font-bold px-2 py-1 rounded">
            {t("successAlertBadge")}
          </div>
        </div>

        {/* Action feedback banner */}
        {panelFeedback && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between animate-fadeIn text-xs text-emerald-800">
            <div className="flex items-center gap-2 flex-1 mr-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-750 font-bold shrink-0">✓</span>
              <p className="font-medium">{panelFeedback.msg}</p>
            </div>
            <button
              onClick={() => setPanelFeedback(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold text-[10px] uppercase cursor-pointer shrink-0"
            >
              Fermer
            </button>
          </div>
        )}

        {/* If no alerts whatsoever */}
        {monthlyAlerts.urgentPayments.length === 0 &&
         monthlyAlerts.incompleteFiles.length === 0 &&
         monthlyAlerts.imminentExpirations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold text-xs text-slate-800">Félicitations Directrice !</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Toutes les situations de fin de mois sont optimales. Aucun impayé critique, aucun dossier incomplet, et tous les contrats sont valides.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 text-xs font-sans">
            {/* 1. URGENT OVERDUE PAYMENTS RECUPERATION */}
            <div className="rounded-xl border border-slate-150 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-slate-800">1. Paiements Urgents ({monthlyAlerts.urgentPayments.length})</span>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">Retard</span>
              </div>

              {monthlyAlerts.urgentPayments.length === 0 ? (
                <p className="text-slate-400 text-[10px] italic pt-2">Aucun impayé actif détecté sur ce mois.</p>
              ) : (
                <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                  {monthlyAlerts.urgentPayments.slice(0, 3).map((stud) => {
                    const studentClass = classes.find(c => c.id === stud.classId);
                    const isLoading = relanceLoadingId === `payment_${stud.id}`;
                    return (
                      <div key={stud.id} className="p-2 rounded bg-slate-50 border border-slate-100 flex flex-col justify-between gap-1.5">
                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <p className="font-bold text-slate-805">{stud.firstName} {stud.lastName}</p>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {studentClass ? `${studentClass.language} ${studentClass.level}` : "Sans classe"} • Tuteur: {stud.parentName}
                            </span>
                          </div>
                          <span className="font-mono font-black text-red-600 text-[11px] shrink-0 text-right">
                            -{stud.balance.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-155">
                          <button
                            onClick={() => {
                              setSelectedStudentId(stud.id);
                              setCurrentTab("students");
                            }}
                            className="text-[9px] text-blue-600 font-bold hover:underline cursor-pointer"
                          >
                            Dossier ↗
                          </button>
                          <button
                            disabled={isLoading}
                            onClick={async () => {
                              setRelanceLoadingId(`payment_${stud.id}`);
                              await new Promise(r => setTimeout(r, 800));
                              setRelanceLoadingId(null);
                              setPanelFeedback({
                                id: stud.id,
                                type: "relance",
                                msg: `Relance de paiement urgente transmise avec succès au tuteur ${stud.parentName} (${stud.parentPhone}) par SMS et WhatsApp pour régulariser le solde de ${stud.balance.toLocaleString()} FCFA.`
                              });
                            }}
                            className="bg-amber-600 hover:bg-amber-700 hover:text-white text-white font-bold text-[9px] px-2 py-0.5 rounded transition cursor-pointer shrink-0"
                          >
                            {isLoading ? "Envoi..." : "⚡ Relancer parent"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {monthlyAlerts.urgentPayments.length > 3 && (
                    <button
                      onClick={() => {
                        setCurrentTab("students");
                      }}
                      className="w-full text-center text-[10px] font-bold text-blue-600 hover:underline pt-1 block"
                    >
                      + Voir les {monthlyAlerts.urgentPayments.length - 3} autres relances
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. INCOMPLETE FILES CONTROLS */}
            <div className="rounded-xl border border-slate-150 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <FileWarning className="h-4 w-4 text-red-500" />
                  <span className="font-bold text-slate-800">2. Dossiers Incomplets ({monthlyAlerts.incompleteFiles.length})</span>
                </div>
                <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded">Règlement</span>
              </div>

              {monthlyAlerts.incompleteFiles.length === 0 ? (
                <p className="text-slate-400 text-[10px] italic pt-2">Tous les dossiers actifs sont complets et validés.</p>
              ) : (
                <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                  {monthlyAlerts.incompleteFiles.slice(0, 3).map((stud) => {
                    const studentClass = classes.find(c => c.id === stud.classId);
                    const isLoading = relanceLoadingId === `incomplete_${stud.id}`;
                    return (
                      <div key={stud.id} className="p-2 rounded bg-slate-50 border border-slate-100 flex flex-col justify-between gap-1.5">
                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <p className="font-bold text-slate-805">{stud.firstName} {stud.lastName}</p>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {studentClass ? `${studentClass.language} ${studentClass.level}` : "Sans classe"} • Tél: {stud.phone}
                            </span>
                          </div>
                          <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 font-semibold px-1 py-0.5 rounded inline-block shrink-0">
                            Incomplet
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-155">
                          <button
                            onClick={() => {
                              setSelectedStudentId(stud.id);
                              setCurrentTab("students");
                            }}
                            className="text-[9px] text-blue-600 font-bold hover:underline cursor-pointer"
                          >
                            Dossier ↗
                          </button>
                          <button
                            disabled={isLoading}
                            onClick={async () => {
                              setRelanceLoadingId(`incomplete_${stud.id}`);
                              const cleanTags = (stud.tags || []).filter(t => t !== "Dossier incomplet");
                              await updateStudent(stud.id, { tags: cleanTags });
                              setRelanceLoadingId(null);
                              setPanelFeedback({
                                id: stud.id,
                                type: "complet",
                                msg: `Le dossier d'inscription de ${stud.firstName} ${stud.lastName} a été marqué comme complet. L'étiquette de suivi 'Dossier incomplet' a été retirée avec succès.`
                              });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 hover:text-white text-white font-bold text-[9px] px-2 py-0.5 rounded transition cursor-pointer shrink-0"
                          >
                            {isLoading ? "Régularisation..." : "✓ Valider dossier"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {monthlyAlerts.incompleteFiles.length > 3 && (
                    <button
                      onClick={() => {
                        setCurrentTab("students");
                      }}
                      className="w-full text-center text-[10px] font-bold text-blue-600 hover:underline pt-1 block"
                    >
                      + Voir les {monthlyAlerts.incompleteFiles.length - 3} autres erreurs de dossiers
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. SOON EXPIRING CONTRACTS RENEWALS */}
            <div className="rounded-xl border border-slate-155 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-sans">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-bold text-slate-800">3. Inscriptions Expirant ({monthlyAlerts.imminentExpirations.length})</span>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">Échéances</span>
              </div>

              {monthlyAlerts.imminentExpirations.length === 0 ? (
                <p className="text-slate-400 text-[10px] italic pt-2 font-sans">Aucune fin de période d'inscription d'ici 30 jours.</p>
              ) : (
                <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                  {monthlyAlerts.imminentExpirations.slice(0, 3).map((stud) => {
                    const studentClass = classes.find(c => c.id === stud.classId);
                    const isLoading = relanceLoadingId === `expiring_${stud.id}`;
                    
                    const leftDays = Math.ceil(
                      (new Date(stud.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div key={stud.id} className="p-2 rounded bg-slate-50 border border-slate-100 flex flex-col justify-between gap-1.5">
                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <p className="font-bold text-slate-805">{stud.firstName} {stud.lastName}</p>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              Expire le {new Date(stud.expirationDate).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded shrink-0 inline-block ${
                            leftDays <= 7 ? "bg-red-50 text-red-700 animate-pulse" : "bg-amber-50 text-amber-700"
                          }`}>
                            J-{leftDays}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-155">
                          <button
                            onClick={() => {
                              setSelectedStudentId(stud.id);
                              setCurrentTab("students");
                            }}
                            className="text-[9px] text-blue-600 font-bold hover:underline cursor-pointer"
                          >
                            Dossier ↗
                          </button>
                          <button
                            disabled={isLoading}
                            onClick={async () => {
                              setRelanceLoadingId(`expiring_${stud.id}`);
                              await new Promise(r => setTimeout(r, 800));
                              setRelanceLoadingId(null);
                              setPanelFeedback({
                                id: stud.id,
                                type: "expiration",
                                msg: `Relance de renouvellement envoyée au tuteur ${stud.parentName} (${stud.parentPhone}) : l'échéance administrative est fixée au ${new Date(stud.expirationDate).toLocaleDateString("fr-FR")}.`
                              });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 hover:text-white text-white font-bold text-[9px] px-2 py-0.5 rounded transition cursor-pointer shrink-0"
                          >
                            {isLoading ? "Envoi..." : "⚡ Relancer parent"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {monthlyAlerts.imminentExpirations.length > 3 && (
                    <button
                      onClick={() => {
                        setCurrentTab("students");
                      }}
                      className="w-full text-center text-[10px] font-bold text-blue-600 hover:underline pt-1 block"
                    >
                      + Voir les {monthlyAlerts.imminentExpirations.length - 3} autres échéances de scolarité
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Tab Selector for Directrices and Staff */}
      <div className="flex border-b border-slate-250 pb-px mb-2 text-xs font-sans overflow-x-auto">
        <button
          onClick={() => setDashboardSubTab("standard")}
          className={`cursor-pointer px-4.5 py-2.5 font-bold tracking-wide transition-all border-b-2 leading-none whitespace-nowrap ${
            dashboardSubTab === "standard"
              ? "border-blue-600 text-blue-600 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Perspective Standard (Chiffres & D3)
        </button>
        <button
          onClick={() => setDashboardSubTab("synthese")}
          className={`cursor-pointer px-4.5 py-2.5 font-bold tracking-wide transition-all border-b-2 leading-none flex items-center gap-1.5 whitespace-nowrap ${
            dashboardSubTab === "synthese"
              ? "border-blue-600 text-blue-600 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          Synthèse Mensuelle (Recharts)
        </button>
        {isDirectrice && (
          <button
            onClick={() => setDashboardSubTab("comparatif")}
            className={`cursor-pointer px-4.5 py-2.5 font-bold tracking-wide transition-all border-b-2 leading-none flex items-center gap-1.5 whitespace-nowrap ${
              dashboardSubTab === "comparatif"
                ? "border-blue-600 text-blue-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
            Performances Mensuelles MoM
          </button>
        )}
      </div>

      {dashboardSubTab === "standard" ? (
        <>
          {/* Active Period Info Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Analyse dynamique D3.js
              </span>
              <h3 className="text-xs font-bold text-slate-700 mt-0.5">
                Statistiques & graphiques synchronisés avec la période globale active.
              </h3>
            </div>
            <div className="text-[10px] bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-500 font-medium">
              Filtre actif : <span className="font-extrabold text-blue-600 capitalize">{timePeriod === "all" ? "Tout" : timePeriod === "week" ? "Cette semaine" : timePeriod === "month" ? "Ce mois" : timePeriod === "quarter" ? "Ce trimestre" : timePeriod === "year" ? "Cette année" : "Personnalisé"}</span>
            </div>
          </div>

          {/* Visual Charts section with D3.js */}
          <div className="grid gap-4 lg:grid-cols-12 animate-fadeIn">
            {/* Monthly payments status using Recharts */}
            <div className="lg:col-span-12 xl:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Encaissements & Chiffre d'Affaires (Recharts)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Suivi de la facturation acquittée cumulée par mois
                  </p>
                </div>
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-100">
                  Recharts
                </span>
              </div>
              <div className="mt-2">
                <RechartsRevenueChart data={paymentsD3Data} themeColor={schoolConfig?.themeColor || "blue"} />
              </div>
            </div>

            {/* Course enrollment distribution using custom D3.js */}
            <div className="lg:col-span-12 xl:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                    Inscriptions par cours (D3.js)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Répartition des effectifs d'élèves par niveau académique
                  </p>
                </div>
                <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Cours
                </span>
              </div>
              <div className="mt-2">
                <D3CourseChart data={courseD3Data} themeColor={schoolConfig?.themeColor || "blue"} />
              </div>
            </div>
          </div>

          {/* Audit Log / Priorities Block */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Interactive Priority Alarms panel */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-2">
                  Dossiers Sensibles (Retards)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {studentsWithBalance.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-slate-400 text-xs italic">
                      Aucun retard de paiement signalé ! Excellence confirmée.
                    </div>
                  ) : (
                    studentsWithBalance.slice(0, 5).map(student => (
                      <div
                        key={student.id}
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          setCurrentTab("students");
                        }}
                        className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 p-2.5 hover:border-slate-300 hover:bg-slate-100/65 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-red-100 text-[9px] font-black text-red-700">
                            DÛ
                          </span>
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-850 leading-tight">
                              {student.firstName} {student.lastName}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-mono">
                              {student.phone}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-extrabold text-red-655">
                            {student.balance.toLocaleString()}
                          </span>
                          <p className="text-[8px] text-slate-405 uppercase font-bold tracking-tighter">FCFA</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <button
                onClick={() => handleActionClick("students")}
                className="mt-3 text-center rounded border border-slate-250 bg-slate-100 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Voir tous les dossiers scolaires
              </button>
            </div>

            {/* Live onSnapshot simulated feed logs */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Journal d'Activité en Continu
                  </h3>
                  <span className="text-[8px] font-mono text-slate-405 font-bold tracking-wider uppercase bg-slate-100 px-1 py-0.5 rounded">DIRECT</span>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {viewAuditLogs.slice(0, 6).map(log => {
                    const date = new Date(log.timestamp);
                    const timeString = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

                    let emoji = "🟢";
                    let message = "";

                    if (log.action === "CREATE_STUDENT") {
                      emoji = "🆕";
                      message = `a inscrit l'élève ${log.targetName} en ${log.details?.class || "classe"}`;
                    } else if (log.action === "ADD_PAYMENT") {
                      emoji = "💰";
                      message = `a enregistré un versement de ${log.details?.amount?.toLocaleString()} FCFA pour ${log.targetName}`;
                    } else if (log.action === "RENEWAL") {
                      emoji = "🔄";
                      message = `a renouvelé l'inscription de ${log.targetName} jusqu'au ${log.details?.extendedUntil}`;
                    } else if (log.action === "ADD_WAITLIST") {
                      emoji = "⏳";
                      message = `a placé ${log.targetName} en liste d'attente (position ${log.details?.position})`;
                    } else if (log.action === "FROM_WAITLIST") {
                      emoji = "✅";
                      message = `a validé l'inscription de ${log.targetName} depuis la liste d'attente`;
                    } else {
                      emoji = "✏️";
                      message = `a modifié la fiche de ${log.targetName} : ${log.details?.field || "mise à jour"}`;
                    }

                    const cleanUserName = log.userName.split(" ")[0];

                    return (
                      <div key={log.id} className="flex gap-2.5 text-[11px] leading-snug">
                        <span className="text-xs shrink-0 select-none">{emoji}</span>
                        <div className="flex-1 border-b border-slate-50 pb-1.5">
                          <div className="flex items-start justify-between">
                            <p className="text-slate-650">
                              <span className="font-extrabold text-slate-805">{cleanUserName}</span> {message}
                            </p>
                            <span className="text-[9px] text-slate-450 font-mono flex items-center gap-0.5 shrink-0 ml-2 font-bold uppercase">
                              {timeString}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {isDirectrice && (
                <button
                  onClick={() => handleActionClick("audit")}
                  className="mt-3 text-center rounded border border-slate-250 bg-slate-100 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Consulter l'historique d'audit complet
                </button>
              )}
            </div>
          </div>
        </>
      ) : dashboardSubTab === "synthese" ? (
        <div className="grid gap-4 lg:grid-cols-12 animate-fadeIn">
          {/* Main Chart Card column with Recharts engines */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-4 animate-fadeIn">
            {/* Enrollment trends block */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block animate-pulse" />
                    Volume Mensuel des Inscriptions (Recharts)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Scolarisations cumulées enregistrées sur les six derniers mois d'exercice
                  </p>
                </div>
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-100">
                  Suivi 6 Mois
                </span>
              </div>

              <div className="mt-4">
                <RechartsEnrollmentChart data={timelineRegistryData} themeColor={schoolConfig?.themeColor || "blue"} />
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 leading-normal bg-slate-50/50 p-2.5 rounded-xl">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <p>
                  Ce graphique s'auto-actualise dès qu'un nouvel élève est enregistré par les secrétaires.
                </p>
              </div>
            </div>

            {/* Total revenue / turnover trends block */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                    Chiffre d'Affaires Mensuel Cumulé (Recharts)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Recettes scolaires globales collectées au cours des six derniers mois d'activité
                  </p>
                </div>
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-100">
                  Suivi Financier
                </span>
              </div>

              <div className="mt-4">
                <RechartsRevenueChart data={paymentsD3Data} themeColor={schoolConfig?.themeColor || "blue"} />
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 leading-normal bg-slate-50/50 p-2.5 rounded-xl">
                <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                <p>
                  Ce graphique reflète les encaissements réels validés par l'administration académique.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column details panels */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5">
                Bilan d'Inscriptions
              </h3>

              <div className="space-y-3.5 text-xs text-slate-655">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px]">
                      N
                    </span>
                    <span className="font-semibold text-slate-700 font-bold">Total Enregistrés (Juin)</span>
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">{viewStudents.length} élèves</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                      %
                    </span>
                    <span className="font-semibold text-slate-700 font-bold">Taux de Remplissage</span>
                  </div>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    {viewClasses.length > 0 
                      ? Math.round((viewClasses.reduce((acc, c) => acc + c.currentCount, 0) / viewClasses.reduce((acc, c) => acc + c.maxStudents, 0)) * 100) 
                      : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold text-[10px]">
                      A
                    </span>
                    <span className="font-semibold text-slate-700 font-bold">File d'Attente Active</span>
                  </div>
                  <span className="font-extrabold text-amber-600 text-sm">{viewWaitlist.length} élèves</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-blue-500/10 blur-xl" />
              <h3 className="font-sans text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 text-indigo-400">
                Légende Executive
              </h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                La synthèse mensuelle aide les directrices à monitorer l'acquisition d'étudiants par rapport aux quotas des campus d'apprentissage afin de maximiser le retour financier de chaque période.
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold bg-white/10 text-white px-2 py-1 rounded">Vite + React</span>
                <span className="text-[9px] font-bold bg-indigo-500/25 text-indigo-200 px-2 py-1 rounded">Recharts Engine</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* COMPARATIVE PERSPECTIVE VIEW FOR DIRECTRICES */
        <div className="space-y-6 animate-fadeIn font-sans">
          
          {/* Header block with explanation */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-55 border border-blue-100/55 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider">
                  <Award className="h-3 w-3" /> Espace Directrice académique
                </div>
                <h4 className="text-sm font-bold text-slate-800 leading-tight">Performances MoM d'Acquisition & Inscription</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                  Pilotez la croissance de votre école de langues en comparant les effectifs d'élèves nouvellement inscrits entre le mois en cours <strong className="text-blue-700 font-bold">Juin 2026</strong> et le mois précédent <strong className="text-slate-700 font-bold">Mai 2026</strong>.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100 shadow-sm self-start sm:self-auto font-mono text-[10px] text-blue-600 font-bold space-x-1">
                📈 ANALYSE DU TRIMESTRE : T2 2026
              </div>
            </div>
          </div>

          {/* KPI Cards section */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* June */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-400 text-[10.5px] uppercase font-bold tracking-widest block mb-1">Inscriptions de ce Mois</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-blue-600">{momComparisonData.countCurrent}</span>
                  <span className="text-xs font-semibold text-slate-400">nouveaux élèves (Juin)</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">Période : 01 Juin 2026 - Aujourd'hui</p>
            </div>

            {/* May */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-400 text-[10.5px] uppercase font-bold tracking-widest block mb-1">Inscriptions du Mois Précédent</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-705">{momComparisonData.countPrevious}</span>
                  <span className="text-xs font-semibold text-slate-400">nouveaux élèves (Mai)</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">Période : 01 Mai 2026 - 31 Mai 2026</p>
            </div>

            {/* Growth indicator */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-emerald-50/15 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-slate-400 text-[10.5px] uppercase font-bold tracking-widest block mb-1">Progression Mensuelle</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {momComparisonData.pctGrowth >= 0 ? (
                    <span className="text-2xl font-black text-emerald-600 shrink-0">
                      ↑ +{momComparisonData.pctGrowth}%
                    </span>
                  ) : (
                    <span className="text-2xl font-black text-rose-600 shrink-0">
                      ↓ {momComparisonData.pctGrowth}%
                    </span>
                  )}
                  <span className="inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold font-mono">
                    MoM {momComparisonData.countCurrent - momComparisonData.countPrevious >= 0 ? "+" : ""}{momComparisonData.countCurrent - momComparisonData.countPrevious} élèves
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 leading-snug">
                {momComparisonData.pctGrowth > 0 
                  ? "Tendance positive : L'activité d'acquisition est en forte accélération académique." 
                  : "Stabilité temporaire ou ralentissement : Ajustez les remises de frais d'inscription."}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            
            {/* Campus comparison panel */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-505" /> Performance d'Inscription par Campus
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">Comparez le nombre d'élèves recrutés par établissement physique.</p>
              </div>

              <div className="space-y-4 pt-1.5">
                {momComparisonData.campusBreakdown.map((camp) => {
                  const maxVal = Math.max(camp.current, camp.previous, 1);
                  const curPct = (camp.current / maxVal) * 100;
                  const prevPct = (camp.previous / maxVal) * 100;

                  return (
                    <div key={camp.id} className="space-y-2 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800">{camp.name}</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                          <span className="text-blue-600 font-bold">{camp.current} (ce mois)</span>
                          <span className="text-slate-300">vs</span>
                          <span className="text-slate-500">{camp.previous} (mai)</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${camp.growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                            {camp.growth >= 0 ? "+" : ""}{camp.growth}%
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bars */}
                      <div className="space-y-1 bg-slate-50 p-2 rounded-lg">
                        {/* Current Month Bar */}
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-400 block font-bold uppercase">Mois de Juin (Courant)</span>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${curPct}%` }} />
                          </div>
                        </div>
                        {/* Previous Month Bar */}
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-slate-400 block font-bold uppercase">Mois de Mai (Précédent)</span>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-slate-400 h-2 rounded-full" style={{ width: `${prevPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Language/Course MoM comparison */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-emerald-500" /> Volume des Inscriptions par Langues d'Étude
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">Répartition MoM de la popularité des langues enseignées.</p>
              </div>

              <div className="overflow-hidden border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="p-2.5">Langue d'apprentissage</th>
                      <th className="p-2.5 text-center">Mai 2026</th>
                      <th className="p-2.5 text-center">Juin 2026</th>
                      <th className="p-2.5 text-right">Évolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {momComparisonData.languageBreakdown.map((lang, idx) => {
                      const diff = lang.current - lang.previous;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-800 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            {lang.language}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-500">{lang.previous}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-blue-600">{lang.current}</td>
                          <td className="p-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${diff > 0 ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                              {diff > 0 ? "+" : ""}{diff} {diff > 0 ? "📈" : diff < 0 ? "📉" : "="}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Detailed Lists tabs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                📁 Liste Interactive des Élèves de la Période
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                Visualisez les profils individuels enregistrés lors de ces deux mois de référence pour faciliter la validation administrative.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              
              {/* June lists */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                  <span className="text-[10.5px] font-extrabold text-blue-700 uppercase tracking-wide">📅 Roster de Juin ({momComparisonData.countCurrent})</span>
                  <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Ce Mois</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {momComparisonData.currentStudents.length === 0 ? (
                    <p className="text-slate-400 text-xs italic py-4 text-center">Aucune inscription ce mois.</p>
                  ) : (
                    momComparisonData.currentStudents.map(student => {
                      const cls = viewClasses.find(c => c.id === student.classId);
                      return (
                        <div
                          key={student.id}
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setCurrentTab("students");
                          }}
                          className="p-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-850">{student.firstName} {student.lastName}</p>
                            <p className="text-[9.5px] text-slate-400 font-mono">
                              Inscrit le {new Date(student.enrollmentDate).toLocaleDateString("fr-FR")} · {cls ? `${cls.language} ${cls.level}` : "Non assigné"}
                            </p>
                          </div>
                          <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full">Actif</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* May lists */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wide">📅 Roster de Mai ({momComparisonData.countPrevious})</span>
                  <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Mois Dernier</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {momComparisonData.previousStudents.length === 0 ? (
                    <p className="text-slate-400 text-xs italic py-4 text-center">Aucune inscription le mois dernier.</p>
                  ) : (
                    momComparisonData.previousStudents.map(student => {
                      const cls = viewClasses.find(c => c.id === student.classId);
                      return (
                        <div
                          key={student.id}
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setCurrentTab("students");
                          }}
                          className="p-2 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-850">{student.firstName} {student.lastName}</p>
                            <p className="text-[9.5px] text-slate-400 font-mono">
                              Inscrit le {new Date(student.enrollmentDate).toLocaleDateString("fr-FR")} · {cls ? `${cls.language} ${cls.level}` : "Non assigné"}
                            </p>
                          </div>
                          <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full">Actif</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Quick Add Student Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden font-sans flex flex-col my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-blue-600" />
                  Inscription Rapide d'Élève
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enregistrez un nouvel étudiant et son premier paiement instantanément depuis le Tableau de Bord.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs shadow-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              
              {modalSuccess && (
                <div className="p-5 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs flex flex-col items-center text-center gap-2.5 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <span className="font-bold text-sm text-slate-800">{modalSuccess}</span>
                  <p className="text-[10px] text-green-600">Le dossier est maintenant mis à jour en temps réel.</p>
                </div>
              )}

              {!modalSuccess && (
                <>
                  {/* Section 1: Civil */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-150">
                      1. Identité Civile de l'Élève
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Prénom de l'élève *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Paul"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Nom de famille *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Kodjo"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Téléphone *</label>
                        <input
                          type="tel"
                          required
                          placeholder="Ex: +228 90..."
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Email (Optionnel)</label>
                        <input
                          type="email"
                          placeholder="jean.dupont@testsite.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Parent info */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-150">
                      2. Parent / Tuteur de Secours
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Nom complet du parent *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Pierre Kodjo"
                          value={parentName}
                          onChange={e => setParentName(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Téléphone d'urgence Parent *</label>
                        <input
                          type="tel"
                          required
                          placeholder="Ex: +228 91..."
                          value={parentPhone}
                          onChange={e => setParentPhone(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Affectation academic */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-150">
                      3. Choix d'Affectation Académique
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Établissement (Campus) *</label>
                        <select
                          disabled={!isDirectrice}
                          value={targetCampusId}
                          onChange={e => {
                            setTargetCampusId(e.target.value);
                            setSelectedClassId("");
                          }}
                          className="rounded-lg border border-slate-200 p-2 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-50"
                        >
                          {campuses.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.id === userCampusId ? "(Votre Campus)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Classe d'apprentissage visée *</label>
                        <select
                          required
                          value={selectedClassId}
                          onChange={e => setSelectedClassId(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          <option value="">-- Choisir la langue et l'horaire --</option>
                          {quickAddCampusClasses.map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.language} {cls.level} · Créneau {cls.period} ({cls.currentCount}/{cls.maxStudents} inscrits)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Class fullness notification module */}
                    {resolvedQuickAddClass && (
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800 text-[11px]">
                            {resolvedQuickAddClass.language} {resolvedQuickAddClass.level} — Sloter à {resolvedQuickAddClass.period}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Enseignant rattaché : {resolvedQuickAddTeacherName}</p>
                        </div>
                        <div>
                          {isQuickAddClassFull ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 rounded px-2.5 py-1 text-amber-600 border border-amber-200 leading-none shadow-sm">
                              <AlertCircle className="h-3 w-3" /> Auto-Waitlist
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 rounded px-2.5 py-1 text-green-600 border border-green-200 leading-none shadow-sm">
                              ✓ {resolvedQuickAddClass.maxStudents - resolvedQuickAddClass.currentCount} places libres
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Budget / Finance */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-150">
                      4. Scolarité & Règlement de Tranche ce jour
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Total Scolarité (FCFA) *</label>
                        <input
                          type="number"
                          required
                          value={totalCost}
                          onChange={e => setTotalCost(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Versement ce jour (FCFA) *</label>
                        <input
                          type="number"
                          required
                          disabled={isQuickAddClassFull}
                          value={isQuickAddClassFull ? "0" : paidAmount}
                          onChange={e => setPaidAmount(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-50"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-slate-655">Mode de paiement *</label>
                        <select
                          disabled={isQuickAddClassFull}
                          value={payMode}
                          onChange={e => setPayMode(e.target.value as any)}
                          className="rounded-lg border border-slate-200 p-2 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-50"
                        >
                          <option value="Espèces">Espèces</option>
                          <option value="Mobile Money">Mobile Money</option>
                          <option value="Virement">Virement Bancaire</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1 sm:col-span-3">
                        <label className="font-semibold text-slate-655">Note comptable / Détails</label>
                        <input
                          type="text"
                          placeholder="Acompte d'inscription rapide (ex: Tranche 1)"
                          value={payNote}
                          onChange={e => setPayNote(e.target.value)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-800 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Modal Footer */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCloseModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  {modalSuccess ? "Fermer" : "Annuler"}
                </button>
                {!modalSuccess && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5 disabled:bg-blue-400"
                  >
                    {submitting ? "Enregistrement..." : isQuickAddClassFull ? "Mettre en Liste d'Attente" : "Inscrire & Enregistrer"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
