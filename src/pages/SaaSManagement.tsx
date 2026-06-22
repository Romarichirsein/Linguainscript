import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { UserRole, School } from "../types";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Sparkles, 
  Plus, 
  Calendar, 
  User, 
  Mail, 
  Coins, 
  ShieldCheck, 
  LayoutGrid, 
  AlertCircle, 
  HelpCircle, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Activity,
  Download,
  ToggleLeft,
  Bell
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

export function SaaSManagement() {
  const { 
    schools, 
    activeSchoolId, 
    setActiveSchoolId, 
    registerSchool, 
    renewSchoolSubscription,
    addStaffUser,
    rawStudents,
    allUsers,
    rawCampuses,
    rawTeachers,
    rawClasses,
    rawPayments,
    rawAuditLogs,
    rawWaitlist,
    rawReminders,
    plansConfig,
    updatePlanConfig,
    systemNotifications,
    updateSystemNotification,
    approveSchoolRenewal
  } = useData();

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        schools,
        users: allUsers,
        campuses: rawCampuses,
        teachers: rawTeachers,
        classes: rawClasses,
        students: rawStudents,
        payments: rawPayments,
        auditLogs: rawAuditLogs,
        waitlist: rawWaitlist,
        reminders: rawReminders
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sauvegarde_globale_lingua_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating backup:", error);
      alert("Une erreur est survenue lors de la création de la sauvegarde.");
    }
  };

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "actions" | "help" | "plans" | "notifications">("dashboard");

  const pendingRequestsCount = (systemNotifications || []).filter(
    n => n.type === "renewal_request" && n.status === "pending"
  ).length;

  // Create school fields
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newDirName, setNewDirName] = useState("");
  const [newDirEmail, setNewDirEmail] = useState("");
  const [newSubType, setNewSubType] = useState<"basique" | "premium" | "integral">("basique");
  const [newMonths, setNewMonths] = useState(1);
  const [newCustomExpiryDate, setNewCustomExpiryDate] = useState("");
  const [registering, setRegistering] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Create standalone Directrice profile fields
  const [dirProfileName, setDirProfileName] = useState("");
  const [dirProfileEmail, setDirProfileEmail] = useState("");
  const [dirProfilePassword, setDirProfilePassword] = useState("");
  const [dirProfileSchoolId, setDirProfileSchoolId] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Renewal fields
  const [selectedSchoolIdForRenewal, setSelectedSchoolIdForRenewal] = useState<string | null>(null);
  const [renewType, setRenewType] = useState<"basique" | "premium" | "integral">("premium");
  const [renewMonths, setRenewMonths] = useState(3);
  const [renewCustomExpiryDate, setRenewCustomExpiryDate] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState(false);

  // FAQ expanded state
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Computed metrics
  const totalSchools = schools.length;
  
  const getPlanPrice = (plan: "basique" | "premium" | "integral") => {
    switch (plan) {
      case "basique": return 5000;
      case "premium": return 10000;
      case "integral": return 15000;
    }
  };

  const activeMonthlyRevenue = schools.reduce((acc, current) => {
    if (current.subStatus === "expired") return acc;
    const isExpired = new Date(current.subExpiresAt) < new Date();
    if (isExpired) return acc;
    return acc + getPlanPrice(current.subType);
  }, 0);

  const activeSchoolsCount = schools.filter(s => {
    const isExpired = new Date(s.subExpiresAt) < new Date();
    return s.subStatus === "active" && !isExpired;
  }).length;
  const expiredSchoolsCount = schools.length - activeSchoolsCount;

  // Plan Distribution Breakdown
  const basiqueCount = schools.filter(s => s.subType === "basique").length;
  const premiumCount = schools.filter(s => s.subType === "premium").length;
  const integralCount = schools.filter(s => s.subType === "integral").length;

  // Chart data source
  const chartData = schools.map(s => {
    const isExpired = new Date(s.subExpiresAt) < new Date();
    const price = isExpired ? 0 : getPlanPrice(s.subType);
    return {
      name: s.name.length > 15 ? s.name.substring(0, 13) + "..." : s.name,
      Revenu: price,
      Plan: s.subType === "basique" ? "Basique" : s.subType === "premium" ? "Premium" : "Intégral",
      PlanRaw: s.subType
    };
  });

  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newDirName.trim() || !newDirEmail.trim()) {
      alert("⚠️ Veuillez remplir tous les champs requis.");
      return;
    }
    setRegistering(true);
    setSuccessMsg("");
    try {
      await registerSchool(
        newSchoolName.trim(),
        newDirName.trim(),
        newDirEmail.trim().toLowerCase(),
        newSubType,
        newMonths,
        newCustomExpiryDate || undefined
      );
      setSuccessMsg(`Félicitations ! L'école "${newSchoolName}" a été créée, le campus bootstrappé et le compte Directrice pour ${newDirName} (${newDirEmail}) a été configuré.`);
      setNewSchoolName("");
      setNewDirName("");
      setNewDirEmail("");
      setNewCustomExpiryDate("");
      setNewMonths(1);
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création de l'école");
    } finally {
      setRegistering(false);
    }
  };

  const handleCreatestandaloneDirectriceProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirProfileName.trim() || !dirProfileEmail.trim() || !dirProfileSchoolId) {
      alert("⚠️ Veuillez remplir tous les champs.");
      return;
    }
    setCreatingProfile(true);
    setProfileSuccessMsg("");
    try {
      const passToUse = dirProfilePassword.trim() || "lingua123";
      await addStaffUser(
        dirProfileName.trim(),
        dirProfileEmail.trim().toLowerCase(),
        UserRole.DIRECTRICE,
        null, // No campus assigned
        dirProfileSchoolId,
        passToUse
      );
      setProfileSuccessMsg(`Le compte Directrice de "${dirProfileName}" a été créé avec succès et associé à l'école ! Identifiant: ${dirProfileEmail.trim().toLowerCase()} | Mot de passe: ${passToUse}`);
      setDirProfileName("");
      setDirProfileEmail("");
      setDirProfilePassword("");
      setDirProfileSchoolId("");
      setTimeout(() => setProfileSuccessMsg(""), 8000);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création du compte.");
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolIdForRenewal) return;
    setRenewing(true);
    setRenewSuccess(false);
    try {
      await renewSchoolSubscription(
        selectedSchoolIdForRenewal, 
        renewType, 
        renewMonths, 
        renewCustomExpiryDate || undefined
      );
      setRenewSuccess(true);
      setRenewCustomExpiryDate("");
      setTimeout(() => {
        setRenewSuccess(false);
        setSelectedSchoolIdForRenewal(null);
      }, 3500);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du renouvellement");
    } finally {
      setRenewing(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "basique": return "#10b981"; // emerald
      case "premium": return "#f43f5e"; // rose
      case "integral": return "#3b82f6"; // blue
      default: return "#6366f1";
    }
  };

  const formatCFA = (value: number) => {
    return value.toLocaleString("fr-FR") + " FCFA";
  };

  const getPlanBadge = (type: "basique" | "premium" | "integral") => {
    switch (type) {
      case "basique": return "bg-emerald-50 text-emerald-700 border-emerald-250";
      case "premium": return "bg-rose-50 text-rose-700 border-rose-250";
      case "integral": return "bg-blue-50 text-blue-700 border-blue-250";
    }
  };

  const faqData = [
    {
      q: "Comment fonctionne l'inscription et la liaison du compte Directrice ?",
      a: "Toute école créée génère immédiatement un espace scolaire de confiance. Lorsque vous définissez l'adresse de raccordement Gmail d'une Directrice, un profil d'utilisateur 'DIRECTRICE' pré-approuvé est injecté. Lors de sa première connexion avec son compte Google officiel, le système détecte de manière transparente son e-mail, fusionne son enregistrement et lui donne le contrôle total de son tableau de bord."
    },
    {
      q: "Quelle est la procédure recommandée de renouvellement d'abonnement physique ?",
      a: "Le client effectue son dépôt en espèces ou via Mobile Money directement auprès de vous. Une fois les fonds encaissés en toute sécurité, recherchez son école dans la liste du tableau de bord, cliquez sur 'Renouveler', examinez le versement estimatif, ajustez la formule voulue et définissez la date de fin brute souhaitée."
    },
    {
      q: "À quoi sert le calendrier de date d'expiration optionnel ?",
      a: "Par défaut, prolonger l'abonnement calcule automatiquement la date d'échéance en ajoutant le nombre de mois choisi. Si vous souhaitez aligner un abonnement sur une date d'échéance administrative précise (par exemple, le dernier jour de l'année scolaire), remplissez le champ 'Date d'expiration personnalisée' pour outrepasser le calcul automatique et enregistrer la date exacte."
    },
    {
      q: "Comment fonctionne le surclassement de forfait (ex: Basique vers Premium) ?",
      a: "Lorsqu'une directrice souhaite obtenir plus de flexibilité (comme l'exportation CSV ou la levée du plafond de 50 étudiants du plan Basique), lancez le module de renouvellement, basculez sa formule active sur 'Premium' ou 'Intégral' et validez. Les restrictions d'accès s'ajusteront instantanément."
    },
    {
      q: "Que se passe-t-il si un abonnement école arrive à expiration ?",
      a: "Une fois la date de fin atteinte, le système se verrouille automatiquement en lecture seule pour cette école. Les secrétaires et directrices pourront continuer à consulter les élèves existants (qui sont persistés localement grâce à la base de données offline), mais ne pourront plus ajouter de nouvelles fiches d'inscription ou d'écriture comptable tant que l'abonnement n'est pas renouvelé."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Banner active indicator */}
      {activeSchoolId !== "school_demo" && activeSchoolId !== null && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 shadow-xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="text-xs font-medium">
              💡 <strong>MODE IMITATION DIRECTE :</strong> Vous gérez actuellement l'espace de 
              l'école <strong>"{schools.find(s => s.id === activeSchoolId)?.name || 'Inconnue'}"</strong> en simulation Directrice.
            </span>
          </div>
          <button 
            onClick={() => setActiveSchoolId("school_demo")} 
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200 shadow-xs hover:bg-amber-100 transition-colors cursor-pointer"
          >
            Quitter la Simulation (Retour Démo)
          </button>
        </div>
      )}

      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-slate-800 flex items-center">
            <ShieldCheck className="mr-2 h-6 w-6 text-indigo-600" />
            Portail Super Administrateur SaaS
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            Superviser et administrer les infrastructures des centres de langues partenaires
          </p>
        </div>

        {/* Tabs Selectors */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "dashboard" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="h-3 w-3 inline mr-1.5" />
            Tableau de Bord & Revenus
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "actions" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus className="h-3 w-3 inline mr-1.5" />
            Enregistrement & Abonnements
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "help" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HelpCircle className="h-3 w-3 inline mr-1.5" />
            FAQ & Centre d'aide
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "plans" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ToggleLeft className="h-3.5 w-3.5 inline mr-1.5" />
            Plans & Fonctionnalités
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "notifications" 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="h-3.5 w-3.5 inline" />
            <span>Demandes & Alertes</span>
            {pendingRequestsCount > 0 && (
              <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: DASHBOARD & REVENUS */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-fade-in">
          {/* Main SaaS Stats Section */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-sans text-xs text-slate-400 font-semibold">Écoles Inscrites</p>
                <h3 className="text-xl font-bold font-sans text-slate-800">{totalSchools}</h3>
                <span className="text-[10px] text-emerald-600 font-sans font-medium flex items-center mt-1">
                  {activeSchoolsCount} actives · {expiredSchoolsCount} expirées
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <p className="font-sans text-xs text-slate-400 font-semibold">Mensuel Estimé (CFA)</p>
                <h3 className="text-xl font-bold font-sans text-emerald-700">{formatCFA(activeMonthlyRevenue)}</h3>
                <span className="text-[10px] text-slate-400 font-sans mt-0.5 block font-medium">
                  ARR (Annuel): {formatCFA(activeMonthlyRevenue * 12)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-sans text-xs text-slate-400 font-semibold">Total Étudiants SaaS</p>
                <h3 className="text-xl font-bold font-sans text-slate-800">{rawStudents.length}</h3>
                <span className="text-[10px] text-indigo-600 font-sans mt-1 block">
                  Tous espaces scolaires confondus
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div>
                <p className="font-sans text-xs text-slate-400 font-semibold">Distribution Forfaits</p>
                <h3 className="text-sm font-bold font-sans text-slate-800 mt-1">
                  {basiqueCount} B · {premiumCount} P · {integralCount} I
                </h3>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  Pénétration d'abonnements
                </span>
              </div>
            </div>
          </div>

          {/* Revenue Analytics visualizer */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Recharts chart */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-sans text-sm font-bold text-slate-800 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-emerald-600" />
                  Flux Financier Actif par Centre Partenaire (FCFA/Mois)
                </h3>
                <p className="text-xs text-slate-400">Représentation des redevances mensuelles récoltées par abonnement actif</p>
              </div>

              <div className="h-64 w-full">
                {schools.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickFormatter={(v) => `${v / 1000}K`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCFA(value), "Flux"]}
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="Revenu" radius={[8, 8, 0, 0]} maxBarSize={45}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getPlanColor(entry.PlanRaw)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                    Aucune école disponible pour tracer le graphique.
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-4 text-xs">
                <span className="flex items-center text-slate-500 font-medium">
                  <span className="h-3 w-3 rounded-md bg-[#10b981] mr-1.5 block"></span>
                  Basique (5 000 FCFA/mo)
                </span>
                <span className="flex items-center text-slate-500 font-medium">
                  <span className="h-3 w-3 rounded-md bg-[#f43f5e] mr-1.5 block"></span>
                  Premium (10 000 FCFA/mo)
                </span>
                <span className="flex items-center text-slate-500 font-medium">
                  <span className="h-3 w-3 rounded-md bg-[#3b82f6] mr-1.5 block"></span>
                  Intégral (15 000 FCFA/mo)
                </span>
                <span className="flex items-center text-rose-500 font-medium ml-auto">
                  ⚠️ Les écoles expirées sont valorisées à 0 FCFA.
                </span>
              </div>
            </div>

            {/* Income breakdown and users stats */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800">Métriques de Performance</h3>
                  <p className="text-xs text-slate-400">Ventilation analytique du réseau Lingua</p>
                </div>

                <div className="divide-y divide-slate-100 text-xs space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 font-semibold">Comptes Directrices Seédés</span>
                    <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {allUsers.filter(u => u.role === UserRole.DIRECTRICE).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 font-semibold">Secrétaires Actives</span>
                    <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {allUsers.filter(u => u.role === UserRole.SECRETAIRE).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 font-semibold">Revenu Moyen par École (ARPU)</span>
                    <span className="font-black text-indigo-700">
                      {formatCFA(Math.round(activeMonthlyRevenue / (activeSchoolsCount || 1)))}/mo
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-xl text-[11px] leading-relaxed">
                  ℹ️ <strong>Encaissement liquide :</strong> LinguaInscript fonctionne sur des abonnements physiques. Renseignez l'échéance brute exacte sous forme de calendrier lors des levées de fonds.
                </div>
              </div>

              {/* Security Archiving & Sovereignty */}
              <div className="rounded-2xl border border-rose-150 bg-rose-50/20 p-6 shadow-sm space-y-3.5">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800 flex items-center">
                    <ShieldCheck className="mr-1.5 h-4.5 w-4.5 text-rose-600 animate-pulse" />
                    Archivage & Souveraineté
                  </h3>
                  <p className="text-xs text-slate-400">Exportation de l'intégralité du réseau SaaS</p>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  Téléchargez à tout moment une sauvegarde souveraine consolidée de la base de données (incluant les tables écoles, campus, enseignants, classes, étudiants, écritures comptables, listes d'attente et audit logs) sous forme de fichier JSON hautement sécurisé pour conservation hors-ligne.
                </p>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Download className="h-4 w-4" />
                  Télécharger la Sauvegarde Globale (JSON)
                </button>
              </div>
            </div>
          </div>

          {/* Table of schools in system */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h4 className="font-sans text-sm font-bold text-slate-800">Centres Scolaires Partenaires</h4>
              <p className="text-xs text-slate-400">Cliquez sur Imiter (💻) pour simuler son environnement ou utiliser le diagnostic Directrice</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 font-semibold">Nom de l'école</th>
                    <th className="py-2.5 font-semibold">Directrice Associée</th>
                    <th className="py-2.5 font-semibold">Abonnement Tarifs</th>
                    <th className="py-2.5 font-semibold">Expiration Échéance</th>
                    <th className="py-2.5 font-semibold text-right">Contrôle direct</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schools.map((school) => {
                    const studentCount = rawStudents.filter((item: any) => item.schoolId === school.id).length;
                    const isSimulationNow = activeSchoolId === school.id;
                    const isExpired = new Date(school.subExpiresAt) < new Date();

                    return (
                      <tr key={school.id} className={`${isSimulationNow ? "bg-amber-50/40" : "hover:bg-slate-50/50"} transition-colors`}>
                        <td className="py-3">
                          <span className="font-sans font-bold text-slate-800 block text-xs">{school.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            ID: <strong className="text-slate-600">{school.id}</strong> · {studentCount} élève{studentCount > 1 ? 's' : ''} enregistré{studentCount > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-sans text-slate-700 block font-semibold">{school.directriceName}</span>
                          <span className="text-[10px] text-indigo-500 font-mono block break-all">{school.directriceEmail}</span>
                        </td>
                        <td className="py-3 font-medium">
                          <span className={`inline-block border rounded-full px-2 py-0.5 text-[9px] font-mono ${getPlanBadge(school.subType)}`}>
                            {school.subType === "basique" ? "Basique 5 000 FCFA" : school.subType === "premium" ? "Premium 10 000 FCFA" : "Intégral 15 000 FCFA"}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center text-[10px] font-mono font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                              <span className={`mr-1 h-1.5 w-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                              {isExpired ? "Abonnement Expiré" : "Forfait Actif"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 mt-0.5 font-bold">
                              Fin: {new Date(school.subExpiresAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setActiveSchoolId(school.id);
                              }}
                              className={`rounded-lg px-2.5 py-1 transition-all text-xs border cursor-pointer font-medium ${
                                isSimulationNow 
                                  ? "bg-amber-100 text-amber-800 border-amber-300" 
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                              }`}
                            >
                              💻 Imiter
                            </button>

                            <button
                              onClick={() => {
                                setSelectedSchoolIdForRenewal(school.id);
                                setRenewType(school.subType);
                                setActiveTab("actions");
                              }}
                              className="bg-indigo-600 text-white rounded-lg px-2.5 py-1 hover:bg-indigo-700 text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              💰 Renouveler
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: ENREGISTREMENT & ACTIONS */}
      {activeTab === "actions" && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in text-slate-700">
          <div className="lg:col-span-6 space-y-6">
            {/* Section A: Create school */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h4 className="font-sans text-sm font-bold text-slate-800 flex items-center">
                  <Plus className="mr-1.5 h-4 w-4 text-indigo-600" />
                  Créer l'Espace d'une Nouvelle École (Liaison Auto)
                </h4>
                <p className="text-xs text-slate-400">Installe les classes par défaut, le campus principal et réserve l'identifiant pour la directrice</p>
              </div>

              <form onSubmit={handleRegisterSchool} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Nom de l'Espace École / Institut *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="ex: Alliance High School Douala"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Nom de la Directrice *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="ex: Dr. Jacqueline Ndjana"
                        value={newDirName}
                        onChange={(e) => setNewDirName(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Gmail de la Directrice *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="ex: jacqueline.ndjana@gmail.com"
                        value={newDirEmail}
                        onChange={(e) => setNewDirEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Formule choisie</label>
                    <select
                      value={newSubType}
                      onChange={(e: any) => setNewSubType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                    >
                      <option value="basique">Pack Basique - 5 000 FCFA</option>
                      <option value="premium">Pack Premium - 10 000 FCFA</option>
                      <option value="integral">Pack Intégral - 15 000 FCFA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Durée (Mois)</label>
                    <select
                      value={newMonths}
                      disabled={!!newCustomExpiryDate}
                      onChange={(e) => setNewMonths(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value={1}>1 Mois</option>
                      <option value={3}>3 Mois</option>
                      <option value={6}>6 Mois</option>
                      <option value={12}>12 Mois</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">
                    📅 Date d'expiration précise (Calendrier manuel)
                  </label>
                  <input
                    type="date"
                    value={newCustomExpiryDate}
                    onChange={(e) => setNewCustomExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                  <span className="text-[9px] font-mono text-indigo-550 mt-1 block">
                    {newCustomExpiryDate ? "💡 La de fin manuelle outrepasse les mois." : "💡 Laissez vide pour utiliser la sélection automatique."}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Montant physique estimé</span>
                    <span className="font-bold text-slate-800 font-sans text-xs">
                      {formatCFA(getPlanPrice(newSubType) * (newCustomExpiryDate ? 1 : newMonths))}
                    </span>
                  </div>
                  <Coins className="h-5 w-5 text-amber-500 shrink-0" />
                </div>

                <button
                  type="submit"
                  disabled={registering}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {registering ? "Initialisation du tenant..." : "Créer l'Espace École & Directrice"}
                </button>

                {successMsg && (
                  <div className="text-[11px] font-sans font-semibold text-emerald-800 bg-emerald-50 border border-emerald-250 rounded-lg p-3">
                    {successMsg}
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            {/* Section B: Renewal with Custom Date */}
            {selectedSchoolIdForRenewal ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/20 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-sans text-sm font-bold text-amber-900 flex items-center">
                    <CreditCard className="mr-1.5 h-4 w-4 text-amber-700" />
                    Renouvellement Manuel d'un Abonnement
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setSelectedSchoolIdForRenewal(null)} 
                    className="text-amber-800 font-semibold text-xs hover:underline cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>

                <div className="text-xs text-amber-800 leading-relaxed font-sans bg-white border border-amber-100 p-3 rounded-xl shadow-xs">
                  Modifiez les accès physiques de l'école <strong>"{schools.find(s => s.id === selectedSchoolIdForRenewal)?.name}"</strong> suite à un versement manuel d'espèces.
                </div>

                <form onSubmit={handleRenewSubscription} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono text-amber-900 uppercase tracking-wider mb-1">Formule et plan d'accès</label>
                    <select
                      value={renewType}
                      onChange={(e: any) => setRenewType(e.target.value)}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500"
                    >
                      <option value="basique">Pack Basique - 5 000 FCFA / mo (limite 50 élèves)</option>
                      <option value="premium">Pack Premium - 10 000 FCFA / mo (élèves illimités & export CSV)</option>
                      <option value="integral">Pack Intégral - 15 000 FCFA / mo (élèves illimités & rapports avancés)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-amber-900 uppercase tracking-wider mb-1">Durée (Mois)</label>
                      <select
                        value={renewMonths}
                        disabled={!!renewCustomExpiryDate}
                        onChange={(e) => setNewMonths(Number(e.target.value))}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value={1}>1 Mois</option>
                        <option value={3}>3 Mois</option>
                        <option value={6}>6 Mois</option>
                        <option value={12}>12 Mois</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-amber-900 uppercase tracking-wider mb-1 font-bold">🎯 Date de fin brute</label>
                      <input
                        type="date"
                        value={renewCustomExpiryDate}
                        onChange={(e) => setRenewCustomExpiryDate(e.target.value)}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white p-3 px-3.5 rounded-xl flex justify-between items-center shadow-xs">
                    <div>
                      <span className="text-[9px] font-mono opacity-85 uppercase block">Versements de scolarité reçu</span>
                      <span className="text-sm font-sans font-black">
                        {formatCFA(getPlanPrice(renewType) * (renewCustomExpiryDate ? 1 : renewMonths))}
                      </span>
                    </div>
                    <Coins className="h-5 w-5 text-indigo-300 animate-pulse" />
                  </div>

                  <button
                    type="submit"
                    disabled={renewing}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2.5 text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {renewing ? "Mise à jour en cours..." : "Valider l'échéance physique & Prolonger"}
                  </button>

                  {renewSuccess && (
                    <div className="text-[11px] font-sans font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center justify-center">
                      Abonnement prolongé avec succès !
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center space-y-2 h-44">
                <Coins className="h-8 w-8 text-slate-400" />
                <h4 className="font-sans text-xs font-bold text-slate-500">Aucun renouvellement actif sélectionné</h4>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Sélectionnez une école et cliquez sur le bouton "Renouveler" dans l'onglet des revenus pour prolonger son forfait en espèces.
                </p>
              </div>
            )}

            {/* Section C: Create manual directrice profile */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h4 className="font-sans text-sm font-bold text-slate-800 flex items-center">
                  <User className="mr-1.5 h-4 w-4 text-indigo-600" />
                  Créer manuellement un Compte Directrice (Standalone)
                </h4>
                <p className="text-xs text-slate-400">Pré-enregistre un profil Directrice dans Firestore et l'affecte à un partenaire existant</p>
              </div>

              <form onSubmit={handleCreatestandaloneDirectriceProfile} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Nom Complet du Compte Directrice *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Mme. Marie Noëlle"
                    value={dirProfileName}
                    onChange={(e) => setDirProfileName(e.target.value)}
                    className="w-full rounded-lg border border-slate-205 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-850 outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Adresse Email Gmail de Connexion Directrice *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ex: marie.noelle@gmail.com"
                    value={dirProfileEmail}
                    onChange={(e) => setDirProfileEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-205 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-850 outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Mot de Passe de Connexion (Laisser vide pour "lingua123")
                  </label>
                  <input
                    type="text"
                    placeholder="Laisser vide pour utiliser le défaut: lingua123"
                    value={dirProfilePassword}
                    onChange={(e) => setDirProfilePassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-205 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-850 outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Associer à l'Espace École Partenaire *
                  </label>
                  <select
                    required
                    value={dirProfileSchoolId}
                    onChange={(e) => setDirProfileSchoolId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500"
                  >
                    <option value="">-- Choisir une école existante --</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creatingProfile}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-2 text-xs font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer"
                >
                  {creatingProfile ? "Seeding en cours..." : "Créer le compte Directrice"}
                </button>

                {profileSuccessMsg && (
                  <div className="text-[11px] font-sans font-semibold text-indigo-750 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    {profileSuccessMsg}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: HELP CENTER / FAQ */}
      {activeTab === "help" && (
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="text-center space-y-1.5 border-b border-slate-100 pb-5">
            <HelpCircle className="h-8 w-8 text-indigo-600 mx-auto" />
            <h3 className="font-sans text-base font-bold text-slate-800">
              Centre d'Aide & Manuel de Gestion d'Abonnements
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Procédures administratives physiques et diagnostics de connexion pour les secrétariats scolaires
            </p>
          </div>

          <div className="space-y-3 text-slate-705">
            {faqData.map((item, index) => {
              const isOpen = expandedFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className="border border-slate-150 rounded-xl overflow-hidden transition-all duration-200 bg-slate-50/20 hover:bg-slate-50/55"
                >
                  <button
                    onClick={() => setExpandedFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between text-left px-5 py-4 font-sans text-xs font-bold text-slate-800 select-none cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-3 rotate-180 transition-transform" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-3 transition-transform" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-650 leading-relaxed font-sans border-t border-slate-100 pt-3 bg-white">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/45 p-4 flex items-start space-x-3 text-xs leading-relaxed text-indigo-900">
            <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-indigo-950 font-sans block mb-1">Support d'Intégration d'Espace</strong>
              Si une directrice signale un problème d'accès, validez d'abord qu'elle s'est connectée avec la bonne adresse e-mail Gmail. Les directrices ont également accès à des options de personnalisation dynamiques (modification de leur slogan, logo de l'école par capture de caméra, et palettes thématiques) pour configurer leur propre campus.
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: PLANS & FONCTIONNALITÉS */}
      {activeTab === "plans" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-sans text-base font-bold text-slate-800 flex items-center gap-2">
              <ToggleLeft className="h-5 w-5 text-indigo-650" /> Configuration des Plans d'Abonnement
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Gérez les fonctionnalités et les limites de chaque plan d'abonnement SaaS. Les modifications sont appliquées instantanément aux écoles concernées.
            </p>
          </div>

          {/* Three plan cards grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {plansConfig?.map((plan) => {
              // Custom styles depending on plan
              let themeColorClass = "indigo";
              let accentBorderClass = "border-t-indigo-500";
              let badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-150";
              let activeToggleBg = "bg-indigo-605";

              if (plan.id === "basique") {
                themeColorClass = "emerald";
                accentBorderClass = "border-t-emerald-500";
                badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-150";
                activeToggleBg = "bg-emerald-650";
              } else if (plan.id === "premium") {
                themeColorClass = "rose";
                accentBorderClass = "border-t-rose-500";
                badgeClass = "bg-rose-50 text-rose-700 border-rose-150";
                activeToggleBg = "bg-rose-650";
              } else if (plan.id === "integral") {
                themeColorClass = "blue";
                accentBorderClass = "border-t-blue-500";
                badgeClass = "bg-blue-50 text-blue-700 border-blue-150";
                activeToggleBg = "bg-blue-650";
              }

              const featuresList = [
                { key: "canCreateStudents", label: "Création d'élèves" },
                { key: "canManageStudents", label: "Gestion des élèves (modification, suppression)" },
                { key: "canGenerateReceipts", label: "Génération de reçus PDF" },
                { key: "canGenerateDocuments", label: "Génération de documents (certificats, factures)" },
                { key: "canAdvancedSearch", label: "Recherche avancée & filtres" },
                { key: "canViewHistory", label: "Consultation de l'historique" },
                { key: "canViewReports", label: "Rapports financiers & statistiques" },
                { key: "canManageWaitlist", label: "Gestion de la file d'attente (Waitlist)" },
                { key: "canManageRenewals", label: "Gestion des renouvellements d'inscriptions" },
                { key: "canManageClasses", label: "Gestion des classes & enseignants" },
              ] as const;

              return (
                <div 
                  key={plan.id} 
                  className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-t-4 ${accentBorderClass} hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
                >
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <h4 className="font-sans text-sm font-bold text-slate-800 capitalize">
                        Plan {plan.name}
                      </h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${badgeClass}`}>
                        {plan.id}
                      </span>
                    </div>

                    {/* Numeric parameters (Price, MaxStudents) */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-500">Tarif (FCFA/mois)</label>
                        <input
                          type="number"
                          value={plan.price}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              updatePlanConfig(plan.id, { price: val });
                            }
                          }}
                          className="rounded-xl border border-slate-200 bg-slate-50/30 p-2 font-bold font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-500">Limite d'élèves</label>
                        <input
                          type="number"
                          value={plan.maxStudents}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              updatePlanConfig(plan.id, { maxStudents: val });
                            }
                          }}
                          className="rounded-xl border border-slate-200 bg-slate-50/30 p-2 font-bold font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Toggles section */}
                    <div className="border-t border-slate-100 pt-4 space-y-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Fonctionnalités incluses
                      </span>

                      {featuresList.map((feat) => {
                        const isChecked = plan[feat.key];
                        return (
                          <div key={feat.key} className="flex justify-between items-center gap-3">
                            <span className="text-xs text-slate-650 leading-tight">
                              {feat.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                updatePlanConfig(plan.id, { [feat.key]: !isChecked });
                              }}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isChecked ? activeToggleBg : "bg-slate-250"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  isChecked ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`mt-6 rounded-xl p-3 text-[11px] leading-relaxed border ${
                    plan.id === "basique" ? "bg-emerald-50/30 text-emerald-800 border-emerald-100/50" :
                    plan.id === "premium" ? "bg-rose-50/30 text-rose-800 border-rose-100/50" :
                    "bg-blue-50/30 text-blue-800 border-blue-100/50"
                  }`}>
                    {plan.id === "basique" && "Le pack Basique est destiné aux petites structures. L'accès aux outils de facturation, à l'historique et à la gestion avancée est bloqué par défaut."}
                    {plan.id === "premium" && "Le pack Premium offre un compromis idéal avec un volume de 100 élèves et la recherche avancée. Les impressions de reçus et documents restent désactivées."}
                    {plan.id === "integral" && "Le pack Intégral confère un accès illimité et complet à l'ensemble du système, incluant tous les modules d'impression et de traçabilité académique."}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start space-x-3 text-xs leading-relaxed text-slate-655">
            <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 font-sans block mb-1">Impact en temps réel</strong>
              Toute modification des prix, de la limite d'élèves ou des autorisations de fonctionnalités s'applique immédiatement à l'ensemble des écoles affiliées à ce plan. Assurez-vous de communiquer toute modification de tarif ou réduction de fonctionnalités à l'avance.
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: NOTIFICATIONS & DEMANDES */}
      {activeTab === "notifications" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center space-x-3 text-indigo-650 mb-1">
              <Bell className="h-6 w-6 text-indigo-600 animate-pulse" />
              <h2 className="font-sans text-xl font-bold text-slate-800">
                Centre de Contrôle des Demandes & Notifications
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Supervisez les demandes de renouvellement d'abonnement envoyées par les directrices d'établissement en temps réel. Suivez également les alertes automatiques générées pour les licences arrivant à expiration.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Col: Pending Requests */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                  <span>Demandes de Renouvellement en Attente</span>
                  {pendingRequestsCount > 0 && (
                    <span className="bg-red-100 text-red-750 px-2 py-0.5 text-[10px] font-extrabold rounded-full animate-pulse">
                      {pendingRequestsCount} active(s)
                    </span>
                  )}
                </h3>

                <div className="divide-y divide-slate-100">
                  {systemNotifications.filter(n => n.type === "renewal_request" && n.status === "pending").length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-450 italic">
                      Aucune demande de renouvellement en attente.
                    </div>
                  ) : (
                    systemNotifications.filter(n => n.type === "renewal_request" && n.status === "pending").map(notif => (
                      <div key={notif.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{notif.schoolName}</span>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-extrabold uppercase tracking-wide">
                              Pack: {notif.packRequested}
                            </span>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold">
                              {notif.monthsRequested} mois
                            </span>
                          </div>
                          <p className="text-xs text-slate-550">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Reçue le {new Date(notif.createdAt).toLocaleDateString("fr-FR")} à {new Date(notif.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>

                        <div className="flex gap-2 self-end sm:self-center">
                          <button
                            onClick={async () => {
                              if (window.confirm("Voulez-vous rejeter cette demande de renouvellement ?")) {
                                try {
                                  await updateSystemNotification(notif.id, { status: "rejected", read: true });
                                  alert("Demande rejetée");
                                } catch (e) {
                                  console.error(e);
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold rounded-xl text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                          >
                            Rejeter
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Confirmer le renouvellement de ${notif.schoolName} pour le forfait ${notif.packRequested?.toUpperCase()} (${notif.monthsRequested} mois) ?`)) {
                                try {
                                  await approveSchoolRenewal(notif.id);
                                  alert("Abonnement renouvelé avec succès !");
                                } catch (e) {
                                  console.error(e);
                                }
                              }
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold rounded-xl text-white shadow shadow-blue-150 transition-colors cursor-pointer"
                          >
                            Approuver & Renouveler ✅
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Resolved / History */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Historique des Demandes Traitées</h3>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {systemNotifications.filter(n => n.type === "renewal_request" && n.status !== "pending").length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Aucun historique de demande traité.
                    </div>
                  ) : (
                    systemNotifications.filter(n => n.type === "renewal_request" && n.status !== "pending").slice(0, 10).map(notif => (
                      <div key={notif.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">{notif.schoolName}</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide ${
                              notif.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}>
                              {notif.status === "approved" ? "Approuvé" : "Rejeté"}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                            Le {new Date(notif.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Expiry Warnings alerts */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Alertes d'Expiration J-7 en cours</h3>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {systemNotifications.filter(n => n.type === "subscription_warning").length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400 italic">Aucune alerte active pour le moment.</p>
                  ) : (
                    systemNotifications.filter(n => n.type === "subscription_warning").map(notif => (
                      <div key={notif.id} className="p-3 bg-rose-50/30 rounded-xl border border-rose-100/50 space-y-1.5 text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-red-700">{notif.schoolName}</span>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {new Date(notif.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{notif.message}</p>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100/50">
                          <span className="text-[9px] text-slate-450 font-medium">Alerte auto J-7</span>
                          <span className={`inline-block w-2 h-2 rounded-full ${notif.read ? "bg-slate-300" : "bg-red-500 animate-pulse"}`} title={notif.read ? "Lu" : "Non lu"} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
