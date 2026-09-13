import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, Shield, Database, BookOpen, School, CheckCircle2 } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number; // Default 10000ms (10 seconds)
}

const MILESTONES = [
  {
    id: 1,
    title: "Initialisation du noyau de sécurité...",
    subtitle: "Chiffrement des clés RBAC & isolation multi-tenant",
    icon: Shield,
    threshold: 20
  },
  {
    id: 2,
    title: "Connexion aux nœuds de base de données...",
    subtitle: "Synchronisation temps réel Firestore & caches locaux",
    icon: Database,
    threshold: 40
  },
  {
    id: 3,
    title: "Chargement des modules de scolarité & facturation...",
    subtitle: "Agrégation des grilles tarifaires et registres élèves",
    icon: BookOpen,
    threshold: 60
  },
  {
    id: 4,
    title: "Synchronisation des structures académiques...",
    subtitle: "Fédération des campus et affectation des créneaux",
    icon: School,
    threshold: 80
  },
  {
    id: 5,
    title: "Finalisation de l'espace de travail...",
    subtitle: "Environnement SaaS optimisé et prêt à l'emploi",
    icon: CheckCircle2,
    threshold: 100
  }
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 10000
}) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // SVG Geometry constants
  const size = 380;
  const center = size / 2; // 190
  const radius = 135;
  const circumference = 2 * Math.PI * radius; // ~848.23

  // Math: calculate photonic comet tip position in real time using cos & sin
  // 0% starts at top (12 o'clock, which is -90 degrees)
  const angleDeg = -90 + (progress / 100) * 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  const cometX = center + radius * Math.cos(angleRad);
  const cometY = center + radius * Math.sin(angleRad);

  // Remaining time in seconds
  const remainingSeconds = Math.max(0, Math.ceil(((100 - progress) / 100) * (durationMs / 1000)));

  // Current milestone determination
  const currentMilestoneIndex = MILESTONES.findIndex(m => progress <= m.threshold);
  const activeMilestone = currentMilestoneIndex !== -1 ? MILESTONES[currentMilestoneIndex] : MILESTONES[MILESTONES.length - 1];

  const handleSkip = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setProgress(100);
    setIsFinished(true);
    setTimeout(() => {
      onComplete();
    }, 650);
  };

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const calculatedProgress = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(calculatedProgress);

      if (calculatedProgress < 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsFinished(true);
        setTimeout(() => {
          onComplete();
        }, 650);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [durationMs, onComplete]);

  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="splash-overlay"
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#030712] via-[#0b0f1f] to-[#030712] text-white select-none overflow-hidden p-6"
        >
          {/* Ambient cosmic lighting backdrops */}
          <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-[#6D5DFC]/15 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-[#00D9FF]/15 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-[#20E3A2]/10 blur-[140px] pointer-events-none" />

          {/* Top subtle branding status bar */}
          <header className="w-full max-w-4xl flex items-center justify-between pt-2 px-4 z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#00D9FF] animate-ping" />
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-cyan-300/80 font-bold">
                CORE SYSTEM ENGINE v4.2
              </span>
            </div>

            <button
              onClick={handleSkip}
              type="button"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] hover:border-cyan-400/40 px-4 py-1.5 font-mono text-[11px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-md shadow-lg shadow-black/40 hover:shadow-cyan-500/10 active:scale-95"
            >
              <span>Accéder directement</span>
              <ArrowRight className="h-3.5 w-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </header>

          {/* Central Orbital Loader section */}
          <main className="flex flex-col items-center justify-center relative my-auto">
            <div className="relative flex items-center justify-center">
              
              {/* SVG Orbital Canvas */}
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible"
              >
                <defs>
                  {/* Tricolor Laser Linear Gradient: Electric Violet -> Neon Cyan -> Emerald Green */}
                  <linearGradient id="orbitalLaserGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6D5DFC" />
                    <stop offset="50%" stopColor="#00D9FF" />
                    <stop offset="100%" stopColor="#20E3A2" />
                  </linearGradient>

                  {/* SVG Diffuse Glow Filter */}
                  <filter id="orbitalLaserGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Photonic Comet Tip Flare Filter */}
                  <filter id="photonicCometGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* ⚙️ 2. Outer Technical Radar Ring with Micro-Graduations */}
                <circle
                  cx={center}
                  cy={center}
                  r="165"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="2 6"
                  strokeOpacity="0.35"
                />

                {/* ⚙️ 2. Intermediate Counter-Rotating Ring (animation: spin 25s linear infinite reverse) */}
                <circle
                  cx={center}
                  cy={center}
                  r="150"
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="16 10 32 10"
                  strokeOpacity="0.45"
                  className="animate-spin-reverse-slow"
                  style={{ transformOrigin: `${center}px ${center}px` }}
                />

                {/* Background Track Circle */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="6"
                  strokeOpacity="0.45"
                />

                {/* 🌀 1. Glowing Orbital Ring Layer (Diffused Glow) */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="url(#orbitalLaserGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  filter="url(#orbitalLaserGlow)"
                  opacity="0.85"
                  transform={`rotate(-90 ${center} ${center})`}
                />

                {/* 🌀 1. Main Vector Orbital Progression Ring */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="url(#orbitalLaserGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${center} ${center})`}
                />

                {/* 🌀 1. Photonic Comet Tip (calculated via cos and sin in real time) */}
                {progress > 0 && (
                  <g>
                    {/* Outer radiant corona */}
                    <circle
                      cx={cometX}
                      cy={cometY}
                      r="16"
                      fill="#00D9FF"
                      opacity="0.35"
                      filter="url(#photonicCometGlow)"
                    />
                    {/* Intermediate energetic bead */}
                    <circle
                      cx={cometX}
                      cy={cometY}
                      r="7"
                      fill="#20E3A2"
                      opacity="0.85"
                    />
                    {/* Core incandescent photon point */}
                    <circle
                      cx={cometX}
                      cy={cometY}
                      r="3.5"
                      fill="#FFFFFF"
                    />
                  </g>
                )}
              </svg>

              {/* 💎 3. Floating Central Core & Breathing Glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Aura Cosmique d'arrière-plan avec pulsation (opacity: [0.3, 0.6, 0.3]) */}
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.94, 1.06, 0.94]
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute h-44 w-44 rounded-full bg-gradient-to-tr from-[#6D5DFC]/35 via-[#00D9FF]/25 to-[#20E3A2]/30 blur-2xl"
                />

                {/* Logo central avec pulsation respiratoire (scale: [0.98, 1.02, 0.98]) */}
                <motion.div
                  animate={{
                    scale: [0.98, 1.02, 0.98]
                  }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-white/20 bg-slate-950/60 backdrop-blur-xl shadow-[0_0_35px_rgba(0,217,255,0.25)]"
                >
                  <img
                    src="/logo.png"
                    alt="LinguaInscript Logo"
                    className="h-20 w-20 object-contain drop-shadow-[0_0_18px_rgba(109,93,252,0.6)]"
                  />
                  {/* Subtle inner reflection edge */}
                  <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />
                </motion.div>
              </div>
            </div>

            {/* App title & Realtime Counters */}
            <div className="mt-7 text-center space-y-2">
              <h1 className="font-sans font-black text-3xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                LinguaInscript
              </h1>

              {/* Real-time Percentage & Countdown */}
              <div className="flex items-center justify-center gap-3 text-xs font-mono">
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 text-lg">
                  {Math.round(progress)}%
                </span>
                <span className="text-slate-500 font-light">·</span>
                <span className="text-slate-400 bg-white/[0.04] border border-white/10 px-2.5 py-0.5 rounded-full">
                  0{remainingSeconds}s restantes
                </span>
              </div>
            </div>
          </main>

          {/* 📊 4. Milestones Indicators & Initialization Steps */}
          <footer className="w-full max-w-xl flex flex-col items-center space-y-4 pb-4 z-10">
            {/* 5 Milestone status bars that stretch and illuminate */}
            <div className="grid grid-cols-5 gap-2 w-full">
              {MILESTONES.map((m, idx) => {
                const isPassed = progress >= m.threshold;
                const isCurrent = currentMilestoneIndex === idx;

                return (
                  <div key={m.id} className="flex flex-col gap-1">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                      <motion.div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPassed
                            ? "bg-gradient-to-r from-[#6D5DFC] via-[#00D9FF] to-[#20E3A2] shadow-[0_0_10px_#00D9FF]"
                            : isCurrent
                            ? "bg-gradient-to-r from-[#6D5DFC] to-[#00D9FF] animate-pulse"
                            : "bg-transparent"
                        }`}
                        style={{
                          width: isPassed
                            ? "100%"
                            : isCurrent
                            ? `${Math.max(10, ((progress - (idx * 20)) / 20) * 100)}%`
                            : "0%"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Milestone descriptive text */}
            <div className="h-12 flex flex-col items-center justify-center text-center">
              <p className="font-sans text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#00D9FF] animate-spin" />
                {activeMilestone.title}
              </p>
              <p className="font-mono text-[10px] text-slate-400 mt-0.5 tracking-wide">
                {activeMilestone.subtitle}
              </p>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
