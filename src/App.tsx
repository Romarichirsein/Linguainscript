import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { DataProvider, useData } from "./context/DataContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Navbar } from "./components/layout/Navbar";
import { ThemeProvider } from "./context/ThemeContext";
import { motion, AnimatePresence } from "motion/react";

// Page Views
import { Dashboard } from "./pages/Dashboard";
import { StudentList } from "./pages/StudentList";
import { StudentDetails } from "./pages/StudentDetails";
import { NewStudent } from "./pages/NewStudent";
import { Waitlist } from "./pages/Waitlist";
import { Classes } from "./pages/Classes";
import { Reports } from "./pages/Reports";
import { Renewals } from "./pages/Renewals";
import { AuditLog } from "./pages/AuditLog";
import { Settings } from "./pages/Settings";
import { SaaSManagement } from "./pages/SaaSManagement";
import { LogIn, Sparkles, BookOpen, GraduationCap, RefreshCw, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

function LoginScreen() {
  const { loginWithGoogle, loginWithPassword } = useData();
  const [charging, setCharging] = useState(true);
  const [chargingStep, setChargingStep] = useState(0);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgotInfo, setShowForgotInfo] = useState(false);

  // Logo loading animation steps
  const chargingTexts = [
    "Recherche de la clé d'enregistrement...",
    "Vérification des liaisons Firebase...",
    "Synchro de la base des écoles (Douala & Yaoundé)...",
    "Prêt pour le chargement sécurisé..."
  ];

  React.useEffect(() => {
    // Increment step indicator
    const interval = setInterval(() => {
      setChargingStep((prev) => {
        if (prev >= chargingTexts.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 550);

    // Fade out charging layer after 2.4 seconds
    const timeout = setTimeout(() => {
      setCharging(false);
    }, 2400);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Veuillez saisir votre email et votre mot de passe.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await loginWithPassword(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || "Identifiants de connexion invalides.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg("Échec de l'authentification directe avec Google.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white select-none selection:bg-indigo-505/15 overflow-hidden">
      
      {/* Cinematic background glowing ambient lights */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-96 w-96 rounded-full bg-purple-600/5 blur-3xl" />

      {/* Floating interactive visual background nodes for realistic glassmorphism depth */}
      <div className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-blue-500/10 blur-2xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-[10%] right-[15%] w-96 h-96 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
      <div className="absolute top-[60%] left-[80%] w-60 h-60 rounded-full bg-indigo-600/10 blur-2xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {charging ? (
          <motion.div
            key="charging-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col items-center gap-6 max-w-sm px-6 text-center z-10"
          >
            {/* Pulsing professional Logo block */}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-transparent">
              <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain" />
              <div className="absolute -inset-1 rounded-3xl border-2 border-indigo-400/30 animate-ping opacity-60 pointer-events-none" />
            </div>

            <div className="space-y-2 mt-2">
              <h1 className="font-sans font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                LinguaInscript
              </h1>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#a5b4fc] font-bold">
                Portail de Scolarité & Facturation
              </p>
            </div>

            {/* Animated loading bar */}
            <div className="w-56 h-1 bg-white/5 rounded-full overflow-hidden mt-3 p-px border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${((chargingStep + 1) / chargingTexts.length) * 100}%` }}
              />
            </div>

            <p className="font-mono text-[10px] text-slate-400 italic tracking-wider h-4">
              {chargingTexts[chargingStep]}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg flex flex-col items-center justify-center p-4 z-10"
          >
            {/* Main frosted transparent glass card */}
            <div className="w-full rounded-3xl border border-white/20 bg-slate-950/40 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6 sm:p-9 text-white relative overflow-hidden">
              
              {/* Premium top linear glowing line highlighting glass border depth */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/55 to-transparent" />
              
              {/* Floating inner radial glare decoration */}
              <div className="absolute -top-44 -left-44 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

              {/* Portal Header & Logo */}
              <div className="text-center mb-7 relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-transparent">
                  <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain" />
                </div>
                <h2 className="mt-4 font-sans text-3xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-100 to-slate-200 bg-clip-text text-transparent">
                  LinguaInscript
                </h2>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-indigo-300 font-semibold">
                  Espace de Gestion Administrative & Scolaire
                </p>
              </div>

              {/* Credentials login form */}
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                
                {/* Email / Identifiant */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pl-1">Identifiant / Mail</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-10 py-2.5 text-xs text-white placeholder-slate-500 outline-hidden focus:border-indigo-400 focus:bg-white/[0.08] focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans font-semibold"
                    />
                    <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-slate-500/10 to-transparent" />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center w-full px-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotInfo(!showForgotInfo)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-hidden focus:border-indigo-400 focus:bg-white/[0.08] focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-slate-500/10 to-transparent" />
                  </div>
                </div>

                {/* Forgot note warning banner */}
                {showForgotInfo && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-950/60 border border-indigo-500/20 text-[10px] text-indigo-305 rounded-xl p-3 leading-relaxed mt-2 flex gap-2.5"
                  >
                    <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      Par mesure de sécurité administrative, seul le <strong>Super Administrateur SaaS</strong> (superadmin@linguainscript.com) possède l'habilitation pour valider ou réinitialiser votre compte d'accès. Rapprochez-vous de la direction.
                    </div>
                  </motion.div>
                )}

                {/* Backend validation warnings */}
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-950/60 border border-rose-800/30 text-[10px] text-rose-300 rounded-xl p-3 leading-relaxed font-semibold flex items-center gap-2 mt-2"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {/* Primary login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:from-indigo-455 disabled:to-indigo-500 py-3 font-sans text-xs font-black tracking-widest uppercase text-white shadow-xl shadow-indigo-950/20 transition-all hover:-translate-y-0.5 active:translate-y-0 mt-3"
                >
                  {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? "Vérification administrative..." : "Se connecter"}
                </button>
              </form>

              {/* Separator / Divider */}
              <div className="my-6 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] font-extrabold text-slate-500">
                <span className="h-px bg-white/10 flex-1" />
                <span className="px-4">Ou</span>
                <span className="h-px bg-white/10 flex-1" />
              </div>

              {/* Google OAuth Access Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                type="button"
                className="w-full flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-all text-xs font-bold py-2.5 uppercase tracking-wider text-slate-200"
              >
                <svg className="h-4 w-4 fill-current shrink-0 text-indigo-400" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.617l2.42-2.42C17.38 1.57 14.97 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.9 0 9.82-4.14 9.82-10 0-.67-.06-1.3-.18-1.875H12.24z"/>
                </svg>
                Authentification Google
              </button>

            </div>

            {/* Bottom humble metadata footer */}
            <footer className="mt-5 text-center text-[9px] text-indigo-400/50 font-mono tracking-widest max-w-sm leading-normal">
              SECURE LOG ACCESS ENGINE v4.2 · CORE RBAC COMPLIANCY VERIFIED
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Localized route mappings (tab ID <-> URL Route name)
const tabToHashRouteMap: Record<string, string> = {
  dashboard: "tableau-de-bord",
  newStudent: "inscription",
  students: "eleves",
  waitlist: "liste-d-attente",
  reports: "rapports",
  renewals: "renouvellements",
  classes: "classes",
  settings: "parametres",
  audit: "historique",
  saas: "super-admin"
};

const hashRouteToTabMap: Record<string, string> = {
  "tableau-de-bord": "dashboard",
  "inscription": "newStudent",
  "eleves": "students",
  "liste-d-attente": "waitlist",
  "rapports": "reports",
  "renouvellements": "renewals",
  "classes": "classes",
  "parametres": "settings",
  "historique": "audit",
  "super-admin": "saas"
};

function DashboardContainer() {
  const { firebaseUser, loading, currentUser, isLocalSession, currentPlan, schoolSlug, currentSchool, logout } = useData();
  const isSchoolBlocked = currentSchool?.status === "blocked";
  const isSchoolExpired = currentSchool && currentSchool.subExpiresAt ? new Date(currentSchool.subExpiresAt) < new Date() : false;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Determine current tab from pathname
  const currentTab = useMemo(() => {
    if (location.pathname === "/super-admin") return "saas";
    const pathSegment = location.pathname.split("/").pop() || "tableau-de-bord";
    return hashRouteToTabMap[pathSegment] || "dashboard";
  }, [location.pathname]);

  const selectedStudentId = searchParams.get("id");

  const handleSetCurrentTab = (tab: string) => {
    const routePath = tabToHashRouteMap[tab] || "tableau-de-bord";
    if (currentUser?.role === "superadmin" && tab === "saas") {
      navigate("/super-admin");
    } else if (schoolSlug) {
      navigate(`/${schoolSlug}/${routePath}`);
    }
  };

  const handleSetSelectedStudentId = (id: string | null) => {
    if (id) {
      navigate(`/${schoolSlug}/eleves?id=${id}`);
    } else {
      navigate(`/${schoolSlug}/eleves`);
    }
  };



  // Auto redirect Super Admin to 'saas' view on startup if they are at root
  useEffect(() => {
    if (currentUser?.role === "superadmin" && location.pathname === "/") {
      navigate("/super-admin", { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  // Custom router rendering logic based on currentTab
  const renderActiveView = () => {
    if (currentUser?.role === "superadmin" && currentTab !== "saas") {
      // Allow superadmin to view school routes when clicked
    } else if (currentUser?.role !== "superadmin" && currentTab === "saas") {
      return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
    }

    switch (currentTab) {
      case "saas":
        if (currentUser?.role !== "superadmin") {
          return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
        }
        return <SaaSManagement />;

      case "dashboard":
        return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
      
      case "newStudent":
        if (currentPlan && !currentPlan.canCreateStudents) {
          return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
        }
        return <NewStudent setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;

      case "students":
        if (selectedStudentId) {
          return (
            <StudentDetails
              studentId={selectedStudentId}
              onBack={() => handleSetSelectedStudentId(null)}
              setCurrentTab={handleSetCurrentTab}
            />
          );
        }
        return (
          <StudentList
            setCurrentTab={handleSetCurrentTab}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={handleSetSelectedStudentId}
          />
        );

      case "waitlist":
        if (currentPlan && !currentPlan.canManageWaitlist) {
          return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
        }
        return <Waitlist />;

      case "reports":
        if (currentPlan && !currentPlan.canViewReports) {
          return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
        }
        return <Reports />;

      case "renewals":
        if (currentPlan && !currentPlan.canManageRenewals) {
          return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
        }
        return <Renewals />;

      case "classes":
        if (currentPlan && !currentPlan.canManageClasses) {
          return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
        }
        return <Classes />;

      case "settings":
        return <Settings />;

      case "audit":
        if (currentPlan && !currentPlan.canViewHistory) {
          return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
        }
        return <AuditLog />;

      default:
        return <Dashboard setCurrentTab={handleSetCurrentTab} setSelectedStudentId={handleSetSelectedStudentId} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/40 dark:bg-slate-950 text-slate-805 dark:text-slate-100">
      {/* Sidebar Navigation */}
      {!focusMode && (
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            if (tab !== "students") {
              handleSetSelectedStudentId(null);
            }
            handleSetCurrentTab(tab);
          }}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
      )}

      {/* Main workspace container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Navbar */}
        <Navbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setCurrentTab={handleSetCurrentTab}
          setSelectedStudentId={handleSetSelectedStudentId}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
        />



        {/* Dynamic Inner view */}
        <main className="relative flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
          {currentUser && currentUser.role !== "superadmin" && (isSchoolBlocked || isSchoolExpired) && (
            <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 select-none">
              <div className="max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-6">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-455" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isSchoolBlocked ? "Accès Établissement Suspendu" : "Abonnement Expiré"}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-450 dark:text-slate-400 leading-relaxed">
                    {isSchoolBlocked 
                      ? "Votre établissement a été suspendu par le super administrateur. Toutes les fonctionnalités de facturation et de gestion d'élèves ont été bloquées." 
                      : "L'abonnement annuel ou mensuel de votre établissement a expiré. Veuillez renouveler votre formule pour continuer à utiliser la plateforme."}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => logout()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 dark:hover:bg-slate-700 text-white py-2.5 text-xs font-bold transition cursor-pointer"
                  >
                    Retour à la page de connexion
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="mx-auto max-w-7xl">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}

// Authentication guard wrapper
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { firebaseUser, currentUser, isLocalSession, loading } = useData();

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <p className="font-sans text-xs font-semibold text-slate-550">Chargement de votre session sécurisée...</p>
      </div>
    );
  }

  if (!firebaseUser && !(isLocalSession && currentUser)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
// Route guard to enforce school scoping
function SchoolRouteGuard({ children }: { children: React.ReactNode }) {
  const { schoolSlug: urlSlug } = useParams();
  const { currentUser, schools, activeSchoolId, setActiveSchoolId, getSchoolSlug } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || !urlSlug || schools.length === 0) return;

    if (currentUser.role !== "superadmin") {
      const mySchool = schools.find(s => s.id === currentUser.schoolId);
      const mySlug = mySchool ? getSchoolSlug(mySchool.name) : null;
      
      if (mySlug && urlSlug !== mySlug) {
        navigate(`/${mySlug}/tableau-de-bord`, { replace: true });
      } else if (activeSchoolId !== currentUser.schoolId) {
        setActiveSchoolId(currentUser.schoolId);
      }
    } else {
      const targetSchool = schools.find(s => getSchoolSlug(s.name) === urlSlug);
      if (targetSchool) {
        if (activeSchoolId !== targetSchool.id) {
          setActiveSchoolId(targetSchool.id);
        }
      }
    }
  }, [urlSlug, currentUser, schools, activeSchoolId, setActiveSchoolId, getSchoolSlug, navigate]);

  return <>{children}</>;
}


// Handle login page access when already authenticated
function LoginScreenWrapper() {
  const { firebaseUser, currentUser, isLocalSession } = useData();
  if (firebaseUser || (isLocalSession && currentUser)) {
    return <RootRedirect />;
  }
  return <LoginScreen />;
}

// Redirect root index / to correct path based on authentication state
function RootRedirect() {
  const { firebaseUser, currentUser, isLocalSession, schoolSlug } = useData();

  if (!firebaseUser && !(isLocalSession && currentUser)) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser?.role === "superadmin") {
    return <Navigate to="/super-admin" replace />;
  }
  if (schoolSlug) {
    return <Navigate to={`/${schoolSlug}/tableau-de-bord`} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginScreenWrapper />} />
            <Route path="/super-admin" element={<RequireAuth><DashboardContainer /></RequireAuth>} />
            <Route path="/:schoolSlug/*" element={<RequireAuth><SchoolRouteGuard><DashboardContainer /></SchoolRouteGuard></RequireAuth>} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </ThemeProvider>
  );
}
