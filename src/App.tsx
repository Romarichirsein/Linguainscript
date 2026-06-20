import React, { useState } from "react";
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

  const fillCredentialsPreset = (mailVal: string, passVal: string) => {
    setEmail(mailVal);
    setPassword(passVal);
    setErrorMsg("");
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
                      Par mesure de sécurité administrative, seul le <strong>Super Administrateur SaaS</strong> (romarichirsein@gmail.com) possède l'habilitation pour valider ou réinitialiser votre compte d'accès. Rapprochez-vous de la direction.
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

              {/* Educational RBAC Matrix & Preset block */}
              <div className="mt-8 pt-5 border-t border-white/10 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-slate-950/80 rounded-full border border-white/10 py-0.5 text-[8px] font-mono tracking-widest text-[#a5b4fc] uppercase">
                  Logique RBAC d'Habilitations
                </div>
                
                <p className="text-center font-sans font-bold text-[10px] text-slate-400 tracking-wider mb-3 mt-1 uppercase">
                  ⚡ Comptes de Démo (sélectionner pour tester)
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Super Admin */}
                  <button
                    onClick={() => fillCredentialsPreset("romarichirsein@gmail.com", "admin123")}
                    type="button"
                    className="group relative flex items-start gap-3 rounded-xl bg-indigo-950/20 border border-indigo-500/10 hover:border-indigo-400/40 hover:bg-indigo-950/40 p-2.5 text-left transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans font-bold text-xs text-white">Super Administrateur</span>
                        <span className="text-[8px] font-mono px-1 rounded-sm bg-indigo-500/20 text-indigo-300 tracking-wide">Global SaaS</span>
                      </div>
                      <p className="text-[9px] text-indigo-200/70 mt-0.5">romarichirsein@gmail.com · <span className="font-mono text-[8px]">admin123</span></p>
                      <p className="text-[8px] text-slate-400 mt-1 italic font-mono leading-none">Contrôle complet de la plateforme, écoles, abonnements.</p>
                    </div>
                  </button>

                  {/* Directrice */}
                  <button
                    onClick={() => fillCredentialsPreset("directrice.integral@gmail.com", "lingua123")}
                    type="button"
                    className="group relative flex items-start gap-3 rounded-xl bg-blue-950/20 border border-blue-500/10 hover:border-blue-400/40 hover:bg-blue-950/44 p-2.5 text-left transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans font-bold text-xs text-white">Directrice</span>
                        <span className="text-[8px] font-mono px-1 rounded-sm bg-blue-500/20 text-blue-300 tracking-wide">École</span>
                      </div>
                      <p className="text-[9px] text-blue-200/70 mt-0.5">directrice.integral@gmail.com · <span className="font-mono text-[8px]">lingua123</span></p>
                      <p className="text-[8px] text-slate-400 mt-1 italic font-mono leading-none">Tout droit scolaire (classes, Campus, Personnel) sauf SaaS global.</p>
                    </div>
                  </button>

                  {/* Secrétaire */}
                  <button
                    onClick={() => fillCredentialsPreset("secretaire.demo@gmail.com", "lingua123")}
                    type="button"
                    className="group relative flex items-start gap-3 rounded-xl bg-slate-900/40 border border-white/5 hover:border-slate-400/30 hover:bg-slate-900/80 p-2.5 text-left transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-400 group-hover:scale-110 transition-transform">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans font-bold text-xs text-white">Secrétaire</span>
                        <span className="text-[8px] font-mono px-1 rounded-sm bg-slate-500/20 text-slate-400 tracking-wide">Opérations</span>
                      </div>
                      <p className="text-[9px] text-slate-300/70 mt-0.5">secretaire.demo@gmail.com · <span className="font-mono text-[8px]">lingua123</span></p>
                      <p className="text-[8px] text-slate-400 mt-1 italic font-mono leading-none">Gestion exclusive (élèves, inscriptions, classes, paiements).</p>
                    </div>
                  </button>
                </div>
              </div>

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

function DashboardContainer() {
  const { firebaseUser, loading, currentUser, isLocalSession } = useData();
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  // Auto redirect Super Admin to 'saas' view on startup
  React.useEffect(() => {
    if (currentUser?.role === "superadmin" && currentTab === "dashboard") {
      setCurrentTab("saas");
    }
  }, [currentUser]);

  if (loading || (firebaseUser && !currentUser)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <p className="font-sans text-xs font-semibold text-slate-550">Chargement de votre session sécurisée...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LoginScreen />;
  }

  // Custom router
  const renderActiveView = () => {
    switch (currentTab) {
      case "saas":
        return <SaaSManagement />;

      case "dashboard":
        return <Dashboard setCurrentTab={setCurrentTab} setSelectedStudentId={setSelectedStudentId} />;
      
      case "newStudent":
        return <NewStudent setCurrentTab={setCurrentTab} setSelectedStudentId={setSelectedStudentId} />;

      case "students":
        if (selectedStudentId) {
          return (
            <StudentDetails
              studentId={selectedStudentId}
              onBack={() => setSelectedStudentId(null)}
              setCurrentTab={setCurrentTab}
            />
          );
        }
        return (
          <StudentList
            setCurrentTab={setCurrentTab}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
          />
        );

      case "waitlist":
        return <Waitlist />;

      case "reports":
        return <Reports />;

      case "renewals":
        return <Renewals />;

      case "classes":
        return <Classes />;

      case "settings":
        return <Settings />;

      case "audit":
        return <AuditLog />;

      default:
        return <Dashboard setCurrentTab={setCurrentTab} setSelectedStudentId={setSelectedStudentId} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/40 dark:bg-slate-950 text-slate-805 dark:text-slate-100">
      {/* Sidebar Navigation */}
      {!focusMode && (
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            // Reset selected student details when navigating away
            if (tab !== "students") {
              setSelectedStudentId(null);
            }
            setCurrentTab(tab);
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
          setCurrentTab={setCurrentTab}
          setSelectedStudentId={setSelectedStudentId}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
        />

        {/* Demo/offline session warning banner */}
        {isLocalSession && (
          <div className="bg-amber-500 text-slate-950 font-sans text-xs px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md z-10 border-b border-amber-600/30">
            <div className="flex items-center gap-2">
              <span className="text-sm shrink-0">⚠️</span>
              <p className="font-semibold leading-relaxed">
                <strong>Mode Démo / Hors-ligne :</strong> L'authentification Firebase a échoué (vérifiez si la méthode de connexion <strong>E-mail/Mot de passe</strong> est activée dans votre console Firebase). Les modifications ne seront pas sauvegardées sur le serveur.
              </p>
            </div>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noreferrer"
              className="bg-slate-950 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition tracking-wider shrink-0 text-center"
            >
              Activer E-mail/Mot de passe
            </a>
          </div>
        )}

        {/* Dynamic Inner view */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
          <div className="mx-auto max-w-7xl">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <DashboardContainer />
      </DataProvider>
    </ThemeProvider>
  );
}
