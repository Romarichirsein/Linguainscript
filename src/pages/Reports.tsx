import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import {
  TrendingUp,
  Sliders,
  Printer,
  FileSpreadsheet,
  Coins,
  Hourglass,
  Calendar,
  Users,
  Award
} from "lucide-react";
import { jsPDF } from "jspdf";

export const Reports: React.FC = () => {
  const { students, classes, campuses, teachers, payments, auditLogs, schoolConfig, uniqueLanguages } = useData();

  // Selected period controls
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "prevMonth" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [filterCampusId, setFilterCampusId] = useState("");
  const [temporalGrouping, setTemporalGrouping] = useState<"week" | "month">("week");

  // Determine active date boundaries in memory
  const dateBoundaries = useMemo(() => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (selectedPeriod === "week") {
      // Start of current week (Monday)
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(); // To right now
    } else if (selectedPeriod === "month") {
      // Start of current month (June 2026 in mock)
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date();
    } else if (selectedPeriod === "prevMonth") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    } else {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Filter students enrolled on target period
  const periodStudents = useMemo(() => {
    return students.filter(s => {
      if (filterCampusId && s.campusId !== filterCampusId) return false;
      const enrollDate = new Date(s.enrollmentDate);
      return enrollDate >= dateBoundaries.start && enrollDate <= dateBoundaries.end;
    });
  }, [students, dateBoundaries, filterCampusId]);

  // Filter payments collected on target period
  const periodPayments = useMemo(() => {
    return payments.filter(p => {
      // First find students matching the payment
      const stud = students.find(s => s.id === p.studentId);
      if (!stud) return false;
      if (filterCampusId && stud.campusId !== filterCampusId) return false;

      const payDate = new Date(p.date);
      return payDate >= dateBoundaries.start && payDate <= dateBoundaries.end;
    });
  }, [payments, students, dateBoundaries, filterCampusId]);

  // Executive summaries metrics
  const newInscriptionsCount = periodStudents.length;

  const renewalsCount = useMemo(() => {
    return auditLogs.filter(log => {
      if (log.action !== "RENEWAL") return false;
      if (filterCampusId && log.campusId !== filterCampusId) return false;
      const logDate = new Date(log.timestamp);
      return logDate >= dateBoundaries.start && logDate <= dateBoundaries.end;
    }).length;
  }, [auditLogs, dateBoundaries, filterCampusId]);

  const waitlistInscriptionsCount = useMemo(() => {
    return auditLogs.filter(log => {
      if (log.action !== "ADD_WAITLIST") return false;
      if (filterCampusId && log.campusId !== filterCampusId) return false;
      const logDate = new Date(log.timestamp);
      return logDate >= dateBoundaries.start && logDate <= dateBoundaries.end;
    }).length;
  }, [auditLogs, dateBoundaries, filterCampusId]);

  const totalCollected = periodPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const outstandingDebt = periodStudents.reduce((acc, curr) => acc + curr.balance, 0);

  // Group statistical lists
  // 1. Details by Language
  const languageStats = useMemo(() => {
    return uniqueLanguages.map(lang => {
      const langStudents = periodStudents.filter(s => {
        const cls = classes.find(c => c.id === s.classId);
        return cls && cls.language === lang;
      });

      const langPayments = periodPayments.filter(p => {
        const stud = students.find(s => s.id === p.studentId);
        const cls = stud ? classes.find(c => c.id === stud.classId) : null;
        return cls && cls.language === lang;
      });

      const costAmount = langPayments.reduce((sum, p) => sum + p.amount, 0);

      // Cumulative overall students count for this language
      const totalOverallStudents = students.filter(s => {
        const cls = classes.find(c => c.id === s.classId);
        return cls && cls.language === lang && s.status === "actif";
      }).length;

      return {
        name: lang,
        newCount: langStudents.length,
        overallCount: totalOverallStudents,
        revenue: costAmount
      };
    }).filter(s => s.newCount > 0 || s.overallCount > 0);
  }, [periodStudents, periodPayments, classes, students, uniqueLanguages]);

  // 2. Details by Class
  const classesStats = useMemo(() => {
    return classes
      .filter(cls => !filterCampusId || cls.campusId === filterCampusId)
      .map(cls => {
        const classStudents = students.filter(s => s.classId === cls.id && s.status === "actif");
        const matchSecPayments = periodPayments.filter(p => classStudents.some(s => s.id === p.studentId));
        const totalRev = matchSecPayments.reduce((acc, cr) => acc + cr.amount, 0);

        const campName = campuses.find(c => c.id === cls.campusId)?.name || "Général";
        const profName = teachers.find(t => t.id === cls.teacherId)?.name || "Non specifie";

        return {
          id: cls.id,
          label: `${cls.language} ${cls.level} (${cls.period})`,
          campus: campName,
          prof: profName,
          occupied: classStudents.length,
          max: cls.maxStudents,
          revenue: totalRev
        };
      });
  }, [classes, students, periodPayments, campuses, teachers, filterCampusId]);

  // 3. Details by Registrar Secretary (Audit trace)
  const secretaryStats = useMemo(() => {
    const managers = [
      { id: "user_sec_01", name: "Sarah Kiman", campus: "Campus Centre-Ville" },
      { id: "user_sec_02", name: "Marie Diallo", campus: "Campus Nord" }
    ];

    return managers.map(mgr => {
      const Inscriptions = periodStudents.filter(s => s.createdBy.userId === mgr.id).length;
      const recordedPay = periodPayments.filter(p => p.recordedBy.userId === mgr.id);
      const totalSum = recordedPay.reduce((acc, cr) => acc + cr.amount, 0);

      return {
        name: mgr.name,
        campus: mgr.campus,
        registrations: Inscriptions,
        paymentsCount: recordedPay.length,
        revenue: totalSum
      };
    });
  }, [periodStudents, periodPayments]);

  const temporalStats = useMemo(() => {
    const groups: Record<string, { registrations: number; revenue: number; sortKey: number }> = {};

    const getStartOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday;
    };

    const getStartOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    };

    // Group students
    periodStudents.forEach(s => {
      const date = new Date(s.enrollmentDate);
      let key = "";
      let sortKey = 0;
      if (temporalGrouping === "week") {
        const monday = getStartOfWeek(date);
        key = `Semaine du ${monday.toLocaleDateString("fr-FR")}`;
        sortKey = monday.getTime();
      } else {
        const firstOfMonth = getStartOfMonth(date);
        key = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        key = key.charAt(0).toUpperCase() + key.slice(1);
        sortKey = firstOfMonth.getTime();
      }

      if (!groups[key]) {
        groups[key] = { registrations: 0, revenue: 0, sortKey };
      }
      groups[key].registrations += 1;
    });

    // Group payments
    periodPayments.forEach(p => {
      const date = new Date(p.date);
      let key = "";
      let sortKey = 0;
      if (temporalGrouping === "week") {
        const monday = getStartOfWeek(date);
        key = `Semaine du ${monday.toLocaleDateString("fr-FR")}`;
        sortKey = monday.getTime();
      } else {
        const firstOfMonth = getStartOfMonth(date);
        key = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        key = key.charAt(0).toUpperCase() + key.slice(1);
        sortKey = firstOfMonth.getTime();
      }

      if (!groups[key]) {
        groups[key] = { registrations: 0, revenue: 0, sortKey };
      }
      groups[key].revenue += p.amount;
    });

    return Object.entries(groups)
      .map(([label, data]) => ({
        label,
        registrations: data.registrations,
        revenue: data.revenue,
        sortKey: data.sortKey
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [periodStudents, periodPayments, temporalGrouping]);

  // jsPDF printable Report generator
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const schoolName = schoolConfig?.name || "LinguaInscript";
      const schoolSlogan = schoolConfig?.slogan || "Languages Hub";

      // Top colored accent bar from general school branding theme
      doc.setFillColor(30, 64, 175);
      doc.rect(10, 10, 190, 5, "F");

      // Custom high-quality header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175);
      doc.text(schoolName, 12, 24);

      doc.setFontSize(9);
      doc.setFont("Helvetica", "italic");
      doc.setTextColor(71, 85, 105);
      doc.text(schoolSlogan, 12, 28);

      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Synthèse Mensuelle Académique & Bilan d'Activité", 12, 35);

      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Période consultée : ${dateBoundaries.start.toLocaleDateString("fr-FR")} au ${dateBoundaries.end.toLocaleDateString("fr-FR")}`, 12, 40);
      doc.text(`Établissement : ${filterCampusId ? (campuses.find(c => c.id === filterCampusId)?.name || "") : "Fédération de tous les campus"}`, 12, 44);
      doc.text(`Date d'édition : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 12, 48);

      doc.setDrawColor(226, 232, 240);
      doc.line(10, 52, 200, 52);

      // Section 1 - Key Metrics
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("I. RÉSUMÉ EXÉCUTIF COMPTABLE ET SCOLAIRE", 12, 60);

      doc.setFontSize(9.5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`• Nouveaux élèves inscrits au cours de la période : ${newInscriptionsCount} étudiants`, 15, 68);
      doc.text(`• Prolongations de scolarité validées (Renouvellements) : ${renewalsCount} prolongements`, 15, 74);
      doc.text(`• Inscriptions en liste d'attente enregistrées : ${waitlistInscriptionsCount} candidats`, 15, 80);
      doc.text(`• Soldes restants en attente de recouvrement scolaire : ${outstandingDebt.toLocaleString()} FCFA`, 15, 86);

      // Encaissements Highlight Box
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.rect(12, 92, 186, 12, "FD");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 64, 175);
      doc.text(`TOTAL DES RECETTES COLLECTÉES :   ${totalCollected.toLocaleString()} FCFA`, 18, 100);

      // Section 2 - Inscription Charts/Graphiques
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("II. ANALYSE GRAPHIQUE ET POPULARITÉ DES LANGUES", 12, 116);

      let currentY = 124;
      if (languageStats.length === 0) {
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Aucun nouvel élève enregistré sur cette période pour générer les graphiques d'inscription.", 15, currentY);
        currentY += 10;
      } else {
        languageStats.forEach(stat => {
          const pct = newInscriptionsCount > 0 ? (stat.newCount / newInscriptionsCount) * 100 : 0;
          const barWidthMax = 75; // max width in mm
          const barWidth = (pct / 100) * barWidthMax;

          // Language Label
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(stat.name, 15, currentY + 4.5);

          // Stats helper inline descriptor text
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`(+${stat.newCount} inscrits / ${stat.overallCount} actifs)`, 42, currentY + 4.5);

          // Render Horizontal Bar Chart progress bar
          doc.setFillColor(241, 245, 249);
          doc.rect(100, currentY, barWidthMax, 5, "F");

          if (barWidth > 0) {
            doc.setFillColor(30, 64, 175); // Royal theme color for progress fill
            doc.rect(100, currentY, barWidth, 5, "F");
          }

          // Percent Text label
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(30, 64, 175);
          doc.text(`${Math.round(pct)}%`, 180, currentY + 4);

          currentY += 9;
        });
      }

      // Section 3 - Bilan d'occupation et d'encaissement par classes
      doc.setFontSize(12);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("III. REMPLISSAGE ACADÉMIQUE ET BILAN PAR CLASSE", 12, currentY + 8);
      
      currentY += 15;
      doc.setFillColor(241, 245, 249);
      doc.rect(12, currentY, 186, 7, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Classe d'Apprentissage", 15, currentY + 5);
      doc.text("Campus", 85, currentY + 5);
      doc.text("Occupation", 130, currentY + 5);
      doc.text("Volume Recettes", 168, currentY + 5);

      currentY += 7;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      classesStats.slice(0, 10).forEach(st => {
        // Draw line separator
        doc.setDrawColor(241, 245, 249);
        doc.line(12, currentY, 198, currentY);

        doc.text(st.label, 15, currentY + 5);
        doc.text(st.campus.substring(0, 18), 85, currentY + 5);
        doc.text(`${st.occupied} / ${st.max} élèves`, 130, currentY + 5);
        doc.text(`${st.revenue.toLocaleString()} FCFA`, 168, currentY + 5);
        currentY += 7;
      });

      // Footer
      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Document officiel de synthèse Lingua School. Généré par progiciel sécurisé. Page 1 sur 1", 105, 282, { align: "center" });

      doc.save(`rapport_synthese_linguainscript_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
      console.error("Erreur lors de l'exportation PDF:", e);
    }
  };

  // CSV export generator
  const handleExportCSV = () => {
    try {
      const escapeCSV = (val: any) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows: string[] = [];
      
      // Document Metadata
      rows.push(`${escapeCSV("LinguaInscript — Rapport d'Activité")}`);
      rows.push(`${escapeCSV("Période du Rapport")},${escapeCSV(`${dateBoundaries.start.toLocaleDateString("fr-FR")} au ${dateBoundaries.end.toLocaleDateString("fr-FR")}`)}`);
      rows.push(`${escapeCSV("Établissement (Campus)")},${escapeCSV(filterCampusId ? (campuses.find(c => c.id === filterCampusId)?.name || "") : "Tous les Campus")}`);
      rows.push(`${escapeCSV("Généré le")},${escapeCSV(new Date().toLocaleString("fr-FR"))}`);
      rows.push(""); // empty row

      // Executive metrics
      rows.push(`${escapeCSV("1. RÉSUMÉ EXÉCUTIF COMPTABLE")}`);
      rows.push(`${escapeCSV("Indicateur")},${escapeCSV("Valeur")},${escapeCSV("Unité / Détail")}`);
      rows.push(`${escapeCSV("Nouvelles Inscriptions")},${newInscriptionsCount},${escapeCSV("élèves")}`);
      rows.push(`${escapeCSV("Renouvellements")},${renewalsCount},${escapeCSV("prolongations")}`);
      rows.push(`${escapeCSV("Candidats ajoutés en liste d'attente")},${waitlistInscriptionsCount},${escapeCSV("élèves")}`);
      rows.push(`${escapeCSV("Total des encaissements")},${totalCollected},${escapeCSV("FCFA")}`);
      rows.push(`${escapeCSV("Soldes restant à recouvrer")},${outstandingDebt},${escapeCSV("FCFA")}`);
      rows.push(""); // empty row

      // Section 2 - Languages
      rows.push(`${escapeCSV("2. STATISTIQUES PAR LANGUES")}`);
      rows.push(`${escapeCSV("Langue")},${escapeCSV("Nouveaux")},${escapeCSV("Inscrits Actifs")},${escapeCSV("Recettes (FCFA)")}`);
      languageStats.forEach(stat => {
        rows.push(`${escapeCSV(stat.name)},${stat.newCount},${stat.overallCount},${stat.revenue}`);
      });
      rows.push(""); // empty row

      // Section 3 - Secretaries productivity
      rows.push(`${escapeCSV("3. ACTIVITÉS DES SECRÉTAIRES")}`);
      rows.push(`${escapeCSV("Secrétaire")},${escapeCSV("Campus rattaché")},${escapeCSV("Inscriptions")},${escapeCSV("Paiements")},${escapeCSV("Recettes (FCFA)")}`);
      secretaryStats.forEach(stat => {
        rows.push(`${escapeCSV(stat.name)},${escapeCSV(stat.campus)},${stat.registrations},${stat.paymentsCount},${stat.revenue}`);
      });
      rows.push(""); // empty row

      // Section 4 - Classes
      rows.push(`${escapeCSV("4. BILAN DE COMPTABILITÉ ET D'OCCUPATION PAR CLASSE")}`);
      rows.push(`${escapeCSV("Classe d'Apprentissage")},${escapeCSV("Établissement")},${escapeCSV("Enseignant")},${escapeCSV("Places Occupées")},${escapeCSV("Capacité Max")},${escapeCSV("Recettes Période (FCFA)")}`);
      classesStats.forEach(st => {
        rows.push(`${escapeCSV(st.label)},${escapeCSV(st.campus)},${escapeCSV(st.prof)},${st.occupied},${st.max},${st.revenue}`);
      });

      // Construct and trigger CSV download
      const csvContent = "\uFEFF" + rows.join("\n"); // Prepend UTF-8 BOM so Excel opens with proper French accents
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const campusSuffix = filterCampusId ? `_${filterCampusId}` : "_global";
      const fileDate = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `rapport_linguainscript_${fileDate}${campusSuffix}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erreur lors de l'exportation CSV:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-800">
            Rapports d'Activité & Statistiques
          </h2>
          <p className="text-sm text-slate-500">
            Bilan hebdomadaire, mensuel et annuel de l'école de langues consolidé en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer font-sans"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Exporter CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-250 font-sans"
          >
            <Printer className="h-4 w-4" />
            Exporter en PDF
          </button>
        </div>
      </div>

      {/* Selectors frame */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Sliders className="h-4 w-4 text-blue-600" /> Paramétrage du Rapport d'Activité
        </div>

        <div className="grid gap-4 md:grid-cols-12 text-xs text-slate-700">
          {/* Quick presets */}
          <div className="md:col-span-4 flex flex-col gap-2">
            <label className="font-semibold text-slate-650">Choix de la période</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedPeriod("week")}
                className={`rounded-xl border p-2 font-bold cursor-pointer transition ${
                  selectedPeriod === "week"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Cette Semaine
              </button>
              <button
                onClick={() => setSelectedPeriod("month")}
                className={`rounded-xl border p-2 font-bold cursor-pointer transition ${
                  selectedPeriod === "month"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Ce Mois-ci
              </button>
              <button
                onClick={() => setSelectedPeriod("prevMonth")}
                className={`rounded-xl border p-2 font-bold cursor-pointer transition ${
                  selectedPeriod === "prevMonth"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Mois Précédent
              </button>
              <button
                onClick={() => setSelectedPeriod("custom")}
                className={`rounded-xl border p-2 font-bold cursor-pointer transition ${
                  selectedPeriod === "custom"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                Dates Libres
              </button>
            </div>
          </div>

          {/* Calendar controls */}
          <div className="md:col-span-5 flex items-center gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-semibold text-slate-650">Date de début</label>
              <input
                type="date"
                disabled={selectedPeriod !== "custom"}
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 p-2 text-slate-850 disabled:bg-slate-50"
              />
            </div>
            <div className="pt-5 text-slate-400 font-bold">à</div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-semibold text-slate-650">Date de fin</label>
              <input
                type="date"
                disabled={selectedPeriod !== "custom"}
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 p-2 text-slate-850 disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Filter Campus segment */}
          <div className="md:col-span-3 flex flex-col gap-1.5">
            <label className="font-semibold text-slate-650">Établissement (Campus)</label>
            <select
              value={filterCampusId}
              onChange={e => setFilterCampusId(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 bg-white text-slate-850"
            >
              <option value="">Tous les Campus réunit</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* EXECUTIVE RESUME COMPOSANT */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Nouvelles Inscriptions</span>
            <span className="rounded bg-blue-50 p-1.5 text-blue-600"><Users className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-slate-850">{newInscriptionsCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Élèves enregistrés sur la période</p>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Renouvellements prolongés</span>
            <span className="rounded bg-purple-50 p-1.5 text-purple-600"><Calendar className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-slate-850">{renewalsCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Contrats d'inscriptions prolongés</p>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-slate-250 bg-white p-5 shadow-sm bg-blue-50/10">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total des encaissements</span>
            <span className="rounded bg-green-50 p-1.5 text-green-600"><Coins className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-green-700 font-mono">{totalCollected.toLocaleString()} FCFA</p>
          <p className="text-[10px] text-slate-400 mt-1">Transactions validées</p>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Nouveaux soldes à recouvrer</span>
            <span className="rounded bg-red-50 p-1.5 text-red-500"><Hourglass className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-red-650 font-mono">{outstandingDebt.toLocaleString()} FCFA</p>
          <p className="text-[10px] text-slate-400 mt-1">Crédits restants à recouvrer</p>
        </div>
      </div>

      {/* Temporal Breakdown Analytics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            📈 Bilan Temporel & Évolution
          </h3>
          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setTemporalGrouping("week")}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                temporalGrouping === "week"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-550 hover:text-slate-700"
              }`}
            >
              Par Semaine
            </button>
            <button
              onClick={() => setTemporalGrouping("month")}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                temporalGrouping === "month"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-550 hover:text-slate-700"
              }`}
            >
              Par Mois
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-12 items-start">
          {/* Table */}
          <div className="md:col-span-6 overflow-hidden border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Période</th>
                  <th className="p-3 text-center">Inscriptions</th>
                  <th className="p-3 text-right">Recettes (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {temporalStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400 italic">Aucune donnée sur cette période</td>
                  </tr>
                ) : (
                  temporalStats.map(stat => (
                    <tr key={stat.label} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{stat.label}</td>
                      <td className="p-3 text-center text-blue-600 font-bold">+{stat.registrations}</td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-bold">{stat.revenue.toLocaleString()} FCFA</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Visual chart */}
          <div className="md:col-span-6 space-y-4 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Aperçu Visuel des Recettes</h4>
            <div className="space-y-3.5">
              {temporalStats.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Aucun graphique disponible</p>
              ) : (
                (() => {
                  const maxRevenue = Math.max(...temporalStats.map(s => s.revenue), 1);
                  return temporalStats.map(stat => {
                    const ratio = stat.revenue / maxRevenue;
                    return (
                      <div key={stat.label} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>{stat.label}</span>
                          <span className="font-mono text-blue-600">{stat.revenue.toLocaleString()} F</span>
                        </div>
                        <div className="w-full bg-slate-150 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-650 h-full rounded-full transition-all duration-500"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED STATS GRID */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Table 1: Language Popularity */}
        <div className="md:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            <Award className="h-4.5 w-4.5 text-blue-600" /> popularité par langue de cours
          </h3>

          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Langue</th>
                  <th className="p-3 text-center">Nouveaux</th>
                  <th className="p-3 text-center">Inscrits</th>
                  <th className="p-3 text-right">Recettes reculées</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {languageStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-400">Aucune donnée périodique</td>
                  </tr>
                ) : (
                  languageStats.map(stat => (
                    <tr key={stat.name} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{stat.name}</td>
                      <td className="p-3 text-center text-blue-600 font-bold">+{stat.newCount}</td>
                      <td className="p-3 text-center text-slate-500">{stat.overallCount}</td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-bold">{stat.revenue.toLocaleString()} F</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Managers Secrétaires productivity */}
        <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            🚀 Activités d'inscription des Secrétaires
          </h3>

          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Secrétaire</th>
                  <th className="p-3">Campus rattaché</th>
                  <th className="p-3 text-center">Inscriptions</th>
                  <th className="p-3 text-center">Paiements</th>
                  <th className="p-3 text-right font-bold text-slate-800">Recettes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {secretaryStats.map(stat => (
                  <tr key={stat.name} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800">{stat.name}</td>
                    <td className="p-3 text-slate-500">{stat.campus}</td>
                    <td className="p-3 text-center font-bold text-slate-800">{stat.registrations}</td>
                    <td className="p-3 text-center font-mono text-slate-500">{stat.paymentsCount}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-650">{stat.revenue.toLocaleString()} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Table 3: List of classes occupancy rates */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2.5">
          📊 Bilan d'occupation et d'encaissement par classes
        </h3>

        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3">Intitulé Classe</th>
                <th className="p-3">Établissement</th>
                <th className="p-3">Enseignant</th>
                <th className="p-3 text-center">Remplissage</th>
                <th className="p-3 text-center">Statut classe</th>
                <th className="p-3 text-right font-bold text-slate-800">Recettes récoltées sur période</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {classesStats.map(st => {
                const ratio = st.occupied / st.max;
                let pctClass = "bg-green-50 text-green-755 border-green-200";
                let pctLabel = "Disponible";

                if (ratio >= 1) {
                  pctClass = "bg-red-50 text-red-700 border-red-200";
                  pctLabel = "Complet";
                } else if (ratio >= 0.8) {
                  pctClass = "bg-amber-50 text-amber-700 border-amber-200";
                  pctLabel = "Limité";
                }

                return (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800">{st.label}</td>
                    <td className="p-3 text-slate-500">{st.campus}</td>
                    <td className="p-3 text-slate-500">{st.prof}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <span className="font-bold">{st.occupied} / {st.max}</span>
                        <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(100, ratio * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${pctClass}`}>
                        {pctLabel}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-650">{st.revenue.toLocaleString()} FCFA</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
