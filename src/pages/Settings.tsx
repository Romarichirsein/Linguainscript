import React, { useState, useEffect, useRef } from "react";
import { useData } from "../context/DataContext";
import { UserRole } from "../types";
import { useTheme } from "../context/ThemeContext";
import { 
  Paintbrush, 
  Sparkles, 
  AlertCircle, 
  Save, 
  Check, 
  RefreshCw, 
  Camera, 
  Trash2, 
  VideoOff, 
  Lock 
} from "lucide-react";

export function Settings() {
  const { 
    schoolConfig, 
    updateSchoolConfig, 
    currentUser, 
    allUsers, 
    addStaffUser, 
    deleteStaffUser, 
    activeSchoolId, 
    campuses,
    runAutomaticSMSSweep
  } = useData();

  const { themeMode, setThemeMode } = useTheme();

  // State variables for form fields
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [themeColor, setThemeColor] = useState<"blue" | "emerald" | "rose" | "amber" | "slate">("blue");
  const [interfaceLanguage, setInterfaceLanguage] = useState<"fr" | "en">("fr");
  const [certificateTitle, setCertificateTitle] = useState("");
  const [certificateBody, setCertificateBody] = useState("");
  const [certificateSignatory, setCertificateSignatory] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  
  // SMS Notification custom rules states
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsGateway, setSmsGateway] = useState<"default" | "bulksms" | "orange" | "africastalking">("default");
  const [smsTemplate, setSmsTemplate] = useState("");
  const [smsDaysBefore, setSmsDaysBefore] = useState(5);
  const [sweepLogs, setSweepLogs] = useState<string[]>([]);
  const [sweeping, setSweeping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Helper functions to generate dynamic darker color variants for high quality dark environments
  const getThemeHex = (colorName: string): string => {
    switch (colorName) {
      case "blue": return "#2563eb";
      case "emerald": return "#10b981";
      case "rose": return "#f43f5e";
      case "amber": return "#f59e0b";
      case "slate": return "#475569";
      default: return "#2563eb";
    }
  };

  const darkenColor = (hex: string, percent: number): string => {
    if (!hex.startsWith("#")) return hex;
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    const rOut = R < 0 ? 0 : R > 255 ? 255 : R;
    const gOut = G < 0 ? 0 : G > 255 ? 255 : G;
    const bOut = B < 0 ? 0 : B > 255 ? 255 : B;
    return "#" + (
      0x1000000 +
      rOut * 0x10000 +
      gOut * 0x100 +
      bOut
    ).toString(16).slice(1);
  };

  // Staff account state variables (Secretary and Directrice)
  const [secName, setSecName] = useState("");
  const [secEmail, setSecEmail] = useState("");
  const [secRole, setSecRole] = useState<UserRole>(UserRole.SECRETAIRE);
  const [secCampusId, setSecCampusId] = useState("");
  const [addingSec, setAddingSec] = useState(false);
  const [secError, setSecError] = useState("");
  const [secSuccess, setSecSuccess] = useState("");

  const handleCreateSecretary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secName.trim() || !secEmail.trim()) {
      setSecError("⚠️ Veuillez remplir le nom complet et l'adresse Gmail.");
      return;
    }
    setAddingSec(true);
    setSecError("");
    setSecSuccess("");
    try {
      await addStaffUser(
        secName.trim(),
        secEmail.trim().toLowerCase(),
        secRole,
        secCampusId || null,
        activeSchoolId
      );
      const roleLabel = secRole === UserRole.DIRECTRICE ? "directrice" : "secrétaire";
      setSecSuccess(`Félicitations, le compte ${roleLabel} de "${secName}" a été pré-approuvé et initialisé !`);
      setSecName("");
      setSecEmail("");
      setSecCampusId("");
      setSecRole(UserRole.SECRETAIRE);
      setTimeout(() => setSecSuccess(""), 5000);
    } catch (err) {
      setSecError("Échec lors de la création du compte.");
    } finally {
      setAddingSec(false);
    }
  };

  const handleDeleteSecretary = async (userId: string) => {
    if (!window.confirm("⚠️ Confirmez-vous la révocation et suppression de cet accès Secrétaire ? Ce choix est irréversible.")) return;
    try {
      await deleteStaffUser(userId);
    } catch (err) {
      alert("Échec lors de la retrait du compte.");
    }
  };

  // Camera capture states
  const [cameraActive, setCameraActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync state values with schoolConfig on load
  useEffect(() => {
    if (schoolConfig) {
      setName(schoolConfig.name || "LinguaInscript");
      sloganValSync(schoolConfig.slogan || "L'excellence linguistique à portée de main");
      setThemeColor((schoolConfig.themeColor as any) || "blue");
      setLogoUrl(schoolConfig.logoUrl || "");
      setInterfaceLanguage(schoolConfig.interfaceLanguage || "fr");
      setCertificateTitle(schoolConfig.certificateTitle || "ATTESTATION DE RÉUSSITE");
      setCertificateBody(schoolConfig.certificateBody || "Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} a suivi avec succès tous ses cours de perfectionnement linguistique au sein de notre établissement.");
      setCertificateSignatory(schoolConfig.certificateSignatory || "La Direction Académique");
      setSmsEnabled(schoolConfig.smsEnabled ?? false);
      setSmsGateway(schoolConfig.smsGateway || "default");
      setSmsTemplate(schoolConfig.smsTemplate || "Rappel Lingua: Le solde de scolarité de {etudiant_nom} (tuteur: {parent_nom}) d'un montant de {montant} FCFA est attendu avant le {date_limite} pour éviter toute interruption. Merci.");
      setSmsDaysBefore(schoolConfig.smsDaysBefore ?? 5);
    }
  }, [schoolConfig]);

  // Slogan helper state synchronizer to support instant previews
  const sloganValSync = (val: string) => {
    setSlogan(val);
  };

  // Bind video stream to the HTMLVideoElement when camera becomes active
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, cameraActive]);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  // Start webcam access
  const handleStartCamera = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" }
      });
      setVideoStream(stream);
      setCameraActive(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("⚠️ Impossible d'accéder à la caméra de votre dispositif. Veuillez accorder l'autorisation d'accès ou importer un fichier.");
    }
  };

  // Stop camera stream
  const handleStopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setCameraActive(false);
  };

  // Snap photo from the running camera stream and update state
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      
      // Keep canvas resolution in squares
      canvas.width = video.videoWidth || 350;
      canvas.height = video.videoHeight || 350;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const snappedBase64 = canvas.toDataURL("image/png");
        setLogoUrl(snappedBase64);
        setErrorMessage("");
      }
      handleStopCamera();
    } catch (err) {
      console.error(err);
      setErrorMessage("Échec lors de la mémorisation de l'image caméra.");
    }
  };

  // Traditional file upload fallback
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Le logo est trop lourd. Veuillez choisir une image de moins de 2 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
        setErrorMessage("");
      }
    };
    reader.onerror = () => {
      setErrorMessage("Échec du décodage du logo.");
    };
    reader.readAsDataURL(file);
  };

  // Submit and update school configurations
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Le nom de l'école ne peut pas être vide.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSavedSuccess(false);

    try {
      await updateSchoolConfig({
        name: name.trim(),
        slogan: slogan.trim(),
        themeColor,
        logoUrl,
        interfaceLanguage,
        certificateTitle: certificateTitle.trim(),
        certificateBody: certificateBody.trim(),
        certificateSignatory: certificateSignatory.trim(),
        smsEnabled,
        smsGateway,
        smsTemplate: smsTemplate.trim(),
        smsDaysBefore
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4500);
    } catch (err) {
      setErrorMessage("Une erreur est survenue lors de l'enregistrement de l'image ou de la configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSMSSweep = async () => {
    setSweeping(true);
    setSweepLogs(["[Système] Préparation du scan des échéances...", "[Système] Interrogation des tables de facturation..."]);
    try {
      const result = await runAutomaticSMSSweep();
      setSweepLogs(result.logs);
    } catch (err: any) {
      setSweepLogs(prev => [...prev, `[Erreur] Échec de l'exécution : ${err.message || err}`]);
    } finally {
      setSweeping(false);
    }
  };

  const presets = [
    { id: "blue", label: "Bleu Impérial", color: "bg-blue-600" },
    { id: "emerald", label: "Vert Smaragde", color: "bg-emerald-600" },
    { id: "rose", label: "Rubis Royal (Rose/Rouge)", color: "bg-rose-600" },
    { id: "amber", label: "Ambre Chaud (Orange)", color: "bg-amber-500" },
    { id: "slate", label: "Ardoise Minimaliste", color: "bg-slate-700" }
  ];

  const hasWriteAccess = currentUser?.role === UserRole.DIRECTRICE || currentUser?.role === UserRole.SUPERADMIN;

  return (
    <div className="space-y-6">
      {/* Intro header block */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-slate-800">
            Personnalisation du Hub École
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            Configuration visuelle de la marque et captation photo du logo de l'établissement
          </p>
        </div>
      </div>

      {!hasWriteAccess && (
        <div className="flex items-start space-x-3 rounded-xl border border-blue-200 bg-blue-50/55 p-3.5 text-xs text-blue-800 shadow-xs">
          <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>ACCÈS LÉGÈREMENT RESTREINT (CONSULTATION UNIQUE) :</strong>
            <p className="mt-1">
              En tant que <strong>{currentUser?.role === UserRole.SECRETAIRE ? "Secrétaire" : "Utilisateur restreint"}</strong>, 
              les paramètres visuels de l'école sont protégés en lecture uniquement. Seule la <strong>Directrice</strong> ou l'administrateur système de premier rang peut éditer ces informations.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 text-slate-700">
        {/* Form panel */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-sans text-sm font-bold text-slate-800 mb-5 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Paintbrush className="h-4.5 w-4.5 text-indigo-500" /> Profil d'Édition Visuel
          </h3>

          {errorMessage && (
            <div className="mb-4 flex gap-2 items-center rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="mb-4 flex gap-2 items-center rounded-xl bg-green-50 border border-green-200 p-3 text-green-700 text-xs font-medium animate-fadeIn">
              <Check className="h-4 w-4 shrink-0" />
              <span>La personnalisation a été enregistrée avec succès ! Les modifications ont été appliquées à l'ensemble du système.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="grid gap-4 md:grid-cols-2">
              {/* School name input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Nom de l'école de langues *</label>
                <input
                  type="text"
                  required
                  disabled={!hasWriteAccess}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: LinguaInscript"
                  className="rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* Slogan input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Slogan de l'établissement</label>
                <input
                  type="text"
                  disabled={!hasWriteAccess}
                  value={slogan}
                  onChange={(e) => sloganValSync(e.target.value)}
                  placeholder="Ex: L'excellence linguistique à portée de main"
                  className="rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Logo upload field & CAM CAPTURE */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-650">Logo de l'école & Prise de photo caméra</label>
              
              {/* Webcam Video Area */}
              {cameraActive && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-4 space-y-3 flex flex-col items-center">
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-black h-48 w-48 shadow-xl">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      className="h-full w-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-2 left-2 bg-rose-600 text-white font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded-sm animate-pulse">
                      CAMÉRA ACTIVE
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 transition text-[11px] shadow-xs cursor-pointer"
                    >
                      📸 Capturer l'Image
                    </button>
                    <button
                      type="button"
                      onClick={handleStopCamera}
                      className="rounded-lg bg-slate-500 hover:bg-slate-600 text-white px-3 py-1.5 transition text-[11px] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 items-center rounded-xl border border-dashed border-slate-200 p-4 bg-slate-50/50">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white border border-slate-100 overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo Prévu"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-350 text-[10px] font-mono font-bold">AUCUN REC</span>
                  )}
                </div>

                <div className="flex-1 space-y-1 w-full text-center md:text-left">
                  <p className="font-bold text-[11px] text-slate-800">Identité visuelle de votre campus</p>
                  <p className="text-[10px] text-slate-400">Pour définir le logo, prenez directement une photo via votre webcam, ou sélectionnez un fichier PNG/JPG standard.</p>
                  
                  {hasWriteAccess && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1.5">
                      {/* Web Camera trigger */}
                      {!cameraActive && (
                        <button
                          type="button"
                          onClick={handleStartCamera}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 font-bold text-white transition gap-1.5 text-[11px]"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Prendre une photo caméra
                        </button>
                      )}

                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 font-bold text-indigo-700 transition text-[11px]">
                        Choisir un fichier
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-red-500 hover:bg-red-50 transition cursor-pointer text-[11px] inline-flex items-center"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Retirer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Color Palette theme presets selection */}
            <div className="flex flex-col gap-2.5">
              <label className="font-semibold text-slate-650">Couleur thématique de la formation</label>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                {presets.map((p) => {
                  const isActive = themeColor === p.id;
                  return (
                    <button
                      type="button"
                      disabled={!hasWriteAccess}
                      key={p.id}
                      onClick={() => setThemeColor(p.id as any)}
                      className={`flex flex-col items-center gap-2 rounded-xl p-3 border cursor-pointer text-center transition ${
                        isActive
                          ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800"
                          : "border-slate-150 bg-white hover:bg-slate-50"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <span className={`h-6 w-6 rounded-full ${p.color} shadow-sm inline-block`} />
                      <span className="font-medium text-[10px]">{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic darker shade generator visualizer */}
              <div className="mt-2 text-xs bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                  Génération de Variante Sombre pour le Mode Sombre
                </div>
                <p className="text-[10px] text-slate-550 leading-relaxed">
                  Le système génère automatiquement une nuance plus sombre de la couleur principale choisie afin de garantir une lisibilité et un contraste de premier plan en mode sombre.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Shade Standard (Clair)</p>
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded bg-white shadow-xs border border-slate-200 flex items-center justify-center">
                        <span className="h-3.5 w-3.5 rounded-xs" style={{ backgroundColor: getThemeHex(themeColor) }} />
                      </span>
                      <span className="font-mono text-slate-700 font-bold block text-[10px]">{getThemeHex(themeColor).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-4">
                    <p className="text-indigo-650 font-bold uppercase text-[9px] flex items-center gap-1">
                      🌙 Variante Sombre Auto
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded bg-slate-900 shadow-xs flex items-center justify-center">
                        <span className="h-3.5 w-3.5 rounded-xs" style={{ backgroundColor: darkenColor(getThemeHex(themeColor), 22) }} />
                      </span>
                      <span className="font-mono text-indigo-700 font-bold block text-[10px]">{darkenColor(getThemeHex(themeColor), 22).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interface Language selection */}
            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4 mt-2">
              <label className="font-semibold text-slate-650">Langue d'affichage de l'administration</label>
              <p className="text-[10px] text-slate-400">
                Configurez la langue d'affichage des interfaces de l'école (menus, listes, tableaux de bord et formulaires) pour les secrétaires.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={`flex-1 flex items-center justify-between gap-3 rounded-xl p-3 border cursor-pointer transition ${
                  interfaceLanguage === "fr"
                    ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800"
                    : "border-slate-150 bg-white hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇫🇷</span>
                    <span className="font-sans font-bold text-[11px] text-slate-705">Français (French)</span>
                  </div>
                  <input
                    type="radio"
                    name="interfaceLanguage"
                    value="fr"
                    disabled={!hasWriteAccess}
                    checked={interfaceLanguage === "fr"}
                    onChange={() => setInterfaceLanguage("fr")}
                    className="h-4 w-4 text-indigo-650 border-slate-350 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
                <label className={`flex-1 flex items-center justify-between gap-3 rounded-xl p-3 border cursor-pointer transition ${
                  interfaceLanguage === "en"
                    ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800"
                    : "border-slate-150 bg-white hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇬🇧</span>
                    <span className="font-sans font-bold text-[11px] text-slate-705">Anglais (English)</span>
                  </div>
                  <input
                    type="radio"
                    name="interfaceLanguage"
                    value="en"
                    disabled={!hasWriteAccess}
                    checked={interfaceLanguage === "en"}
                    onChange={() => setInterfaceLanguage("en")}
                    className="h-4 w-4 text-indigo-650 border-slate-350 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Visual Theme Selection */}
            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4 mt-2">
              <label className="font-semibold text-slate-650">Thème visuel de l'interface</label>
              <p className="text-[10px] text-slate-400">
                Basculez entre le mode clair, sombre, ou synchronisez l'affichage de l'administration avec le thème système de votre appareil.
              </p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                {[
                  { id: "light", label: "Mode Clair", icon: "☀️" },
                  { id: "dark", label: "Mode Sombre", icon: "🌙" },
                  { id: "system", label: "Suivre le Système", icon: "🖥️" }
                ].map((option) => {
                  const isActive = themeMode === option.id;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setThemeMode(option.id as any)}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 border cursor-pointer text-center transition ${
                        isActive
                          ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800"
                          : "border-slate-150 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base">{option.icon}</span>
                      <span className="font-bold text-[11px] text-slate-705">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modèle de Certificat Officiel */}
            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4 mt-2">
              <label className="font-semibold text-slate-650">Modèle de Certificat Académique Officiel</label>
              <p className="text-[10px] text-slate-400">
                Personnalisez les textes de l'Attestation / Certificat généré depuis la fiche élève. Vous pouvez inclure <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-650 font-bold font-mono">{` {nom_etudiant} `}</code> et <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-650 font-bold font-mono">{` {ecole_nom} `}</code> pour personnaliser les informations dynamiquement.
              </p>
              
              <div className="space-y-3.5 mt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Titre du document</label>
                  <input
                    type="text"
                    disabled={!hasWriteAccess}
                    value={certificateTitle}
                    onChange={(e) => setCertificateTitle(e.target.value)}
                    placeholder="Ex: CERTIFICAT DE SCOLARITÉ / ATTESTATION DE RÉUSSITE"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-sans font-medium text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Texte principal / Corps de l'attestation</label>
                  <textarea
                    disabled={!hasWriteAccess}
                    value={certificateBody}
                    onChange={(e) => setCertificateBody(e.target.value)}
                    rows={4}
                    placeholder="Ex: Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} [...]"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-sans font-medium text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden resize-y"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rôle ou Nom du Signataire</label>
                  <input
                    type="text"
                    disabled={!hasWriteAccess}
                    value={certificateSignatory}
                    onChange={(e) => setCertificateSignatory(e.target.value)}
                    placeholder="Ex: La Directrice Académique / Le Secrétaire Général"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-sans font-medium text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Service de Relance & Notifications SMS automatiques */}
            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4 mt-2">
              <label className="font-semibold text-slate-650 flex items-center gap-1.5">
                <span>📱 Service de Relance de Paiement SMS Automatiques</span>
                <span className="bg-blue-100 text-blue-700 font-extrabold text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0">Nouveau</span>
              </label>
              <p className="text-[10px] text-slate-400">
                Configurez la passerelle d'alertes automatiques pour relancer les tuteurs d'élèves dont les sessions d'apprentissage ou les tranches scolaires arrivent bientôt à terme.
              </p>

              <div className="space-y-4 mt-2">
                {/* Enable checkbox */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-150 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="smsEnabled"
                    disabled={!hasWriteAccess}
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="smsEnabled" className="select-none flex-1 cursor-pointer">
                    <span className="block font-bold text-xs text-slate-800 dark:text-slate-100">Activer l'envoi SMS automatique périodique</span>
                    <span className="block text-[9px] text-slate-400 dark:text-slate-500">
                      Permet au progiciel de balayer quotidiennement la base des inscrits actifs et d'expédier les messages d'échéances imminentes.
                    </span>
                  </label>
                </div>

                {/* Gateway and Days trigger */}
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passerelle opérateur SMS (Gateway)</label>
                    <select
                      disabled={!hasWriteAccess}
                      value={smsGateway}
                      onChange={(e: any) => setSmsGateway(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-850 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:border-slate-800 focus:outline-hidden"
                    >
                      <option value="default">Simulateur d'antennes (Offline)</option>
                      <option value="bulksms">BulkSMS Gateway Global</option>
                      <option value="orange">Orange Money & SMS Cameroon / Senegal</option>
                      <option value="africastalking">Africa's Talking SMS API (Afrique Centrale/Ouest)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seuil de relance d'avance (J-X)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="15"
                        disabled={!hasWriteAccess}
                        value={smsDaysBefore}
                        onChange={(e) => setSmsDaysBefore(parseInt(e.target.value))}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-auto cursor-pointer"
                      />
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md shrink-0">
                        {smsDaysBefore} Jours avant
                      </span>
                    </div>
                  </div>
                </div>

                {/* SMS Text Template and placeholders description */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modèle de Message SMS Personnalisé</label>
                    <span className="text-[9px] text-slate-400 italic">Solde de caractères estimé : {smsTemplate.length} chars</span>
                  </div>
                  <textarea
                    disabled={!hasWriteAccess}
                    value={smsTemplate}
                    onChange={(e) => setSmsTemplate(e.target.value)}
                    rows={3}
                    placeholder="Ex: Rappel Lingua: Le solde de scolarité de {etudiant_nom}... "
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-sans font-medium text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden resize-y"
                  />
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-sans grid grid-cols-2 gap-x-3 gap-y-1">
                    <span><code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-650 font-bold">&#123;etudiant_nom&#125;</code> : Nom de l'élève</span>
                    <span><code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-650 font-bold">&#123;parent_nom&#125;</code> : Nom du tuteur</span>
                    <span><code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-650 font-bold">&#123;montant&#125;</code> : Solde impayé (FCFA)</span>
                    <span><code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-650 font-bold">&#123;date_limite&#125;</code> : Date d'échéance</span>
                  </div>
                </div>

                {/* Diagnostic Manual scan button */}
                <div className="bg-blue-50/10 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4.5 space-y-3">
                  <div>
                    <h4 className="font-sans text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      📶 Simulateur de Lancement Manuel (Cron Sweep)
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Lancez manuellement le scan et expédiez de suite toutes les notifications SMS pour les échéances imminentes se trouvant actuellement dans l'intervalle d'alerte.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={sweeping}
                    onClick={handleTriggerSMSSweep}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    {sweeping ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Scan en cours...
                      </>
                    ) : (
                      <>
                        🚀 Lancer le scan & Émettre les SMS
                      </>
                    )}
                  </button>

                  {/* Simulated Antenna Live Output console log printout */}
                  {sweepLogs.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-black p-3.5 mt-2 shadow-inner">
                      <div className="flex justify-between items-center text-[10px] border-b border-slate-850 pb-1.5 mb-2 font-mono text-slate-500">
                        <span>📡 LIVE LOGS DE L'ANTENNE SMS</span>
                        <button
                          type="button"
                          onClick={() => setSweepLogs([])}
                          className="hover:text-slate-350 text-slate-500 underline"
                        >
                          Effacer
                        </button>
                      </div>
                      <div className="font-mono text-[10px] text-slate-300 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {sweepLogs.map((log, index) => {
                          const isSent = log.startsWith("[+]");
                          const isError = log.startsWith("[x]");
                          const isSystem = log.startsWith("[Système]") || log.startsWith("[Service SMS]");
                          const color = isSent ? "text-emerald-400 font-bold" : isError ? "text-rose-400 font-bold" : isSystem ? "text-blue-400 font-extrabold" : "text-slate-405";
                          return (
                            <div key={index} className={color}>
                              {log}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions submit button */}
            {hasWriteAccess && (
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 min-w-[140px] cursor-pointer disabled:bg-slate-550 transition shadow"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4.5 w-4.5" />
                  )}
                  {saving ? "Enregistrement..." : "Appliquer l'identité"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Real-time Preview panel */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-slate-205 bg-slate-900 p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-blue-500/10 blur-xl" />
            <div className="absolute bottom-0 left-0 -z-10 h-24 w-24 rounded-full bg-slate-500/5 blur-lg" />

            <h3 className="font-sans text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-4">
              Aperçu en temps réel
            </h3>

            {/* Header mockup inside preview space */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="h-10 w-10 overflow-hidden bg-white/10 rounded flex items-center justify-center font-bold text-sm shrink-0 border border-slate-800">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-white">
                    {name ? name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "LI"}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h4 className="font-sans font-bold text-sm text-slate-100 truncate">
                  {name || "LinguaInscript"}
                </h4>
                <p className="font-mono text-[9px] text-slate-400 uppercase truncate">
                  {slogan || "Languages Hub"}
                </p>
              </div>
            </div>

            {/* Dynamic Buttons previews inside preview card */}
            <div className="pt-4 space-y-4">
              <p className="text-[10px] text-slate-400">Cette thématique et vos images seront affichées sur les reçus de paiement et dans la barre de navigation latérale de l'application.</p>

              <div className="pt-1 text-[10px] space-y-3">
                <div className="space-y-1">
                  <span className="block text-slate-400 font-bold uppercase text-[9px]">Aperçu Mode Clair (Standard)</span>
                  <span
                    style={{ backgroundColor: getThemeHex(themeColor) }}
                    className="block text-center rounded-xl text-white font-bold py-2 tracking-wide font-sans shadow transition-all duration-300"
                  >
                    Confirmer le Règlement
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="block text-indigo-400 font-bold uppercase text-[9px]">Aperçu Mode Sombre (Auto-Ajusté)</span>
                  <span
                    style={{ backgroundColor: darkenColor(getThemeHex(themeColor), 22) }}
                    className="block text-center rounded-xl text-white font-bold py-2 tracking-wide font-sans shadow transition-all duration-300 border border-white/5"
                  >
                    Confirmer le Règlement
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interface de gestion globale des utilisateurs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-sans text-sm font-bold text-slate-800 flex items-center gap-2">
            <Lock className="h-4.5 w-4.5 text-indigo-600" />
            Gestion Globale des Accès et Utilisateurs
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Autorisez vos secrétaires et collaboratrices (Directrices) à accéder à la plateforme, à gérer leurs établissements respectifs et enregistrer les activités.
          </p>
        </div>

        {hasWriteAccess ? (
          <div className="grid gap-6 md:grid-cols-12">
            {/* Form to add a user */}
            <div className="md:col-span-5 space-y-4 border-r border-slate-105 pr-0 md:pr-6">
              <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-wider font-mono">
                Créer un nouvel accès
              </h4>

              {secError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-xs font-semibold">
                  {secError}
                </div>
              )}

              {secSuccess && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-green-700 text-xs font-semibold">
                  {secSuccess}
                </div>
              )}

              <form onSubmit={handleCreateSecretary} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-650">Nom Complet de l'utilisateur *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Marie-Louise Ngo"
                    value={secName}
                    onChange={(e) => setSecName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-hidden focus:border-indigo-500 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-650">Adresse Gmail de connexion *</label>
                  <input
                    type="email"
                    required
                    placeholder="ex: louise.ngo@gmail.com"
                    value={secEmail}
                    onChange={(e) => setSecEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-hidden focus:border-indigo-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">
                    L'adresse doit obligatoirement être un Gmail officiel pour se raccorder via Google Sign-In.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-650">Rôle d'accès *</label>
                  <select
                    value={secRole}
                    onChange={(e) => setSecRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-white outline-hidden focus:border-indigo-500 text-slate-850"
                  >
                    <option value={UserRole.SECRETAIRE}>Secrétaire Académique</option>
                    <option value={UserRole.DIRECTRICE}>Directrice Associée / Co-Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-650">Campus d'affectation (Optionnel)</label>
                  <select
                    value={secCampusId}
                    onChange={(e) => setSecCampusId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-white outline-hidden focus:border-indigo-500 text-slate-850"
                  >
                    <option value="">Tous les campus (Accès Global)</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={addingSec}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer disabled:bg-slate-300"
                >
                  {addingSec ? "Configuration en cours..." : "Valider & Pré-approuver"}
                </button>
              </form>
            </div>

            {/* List of users */}
            <div className="md:col-span-7 space-y-4">
              <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-wider font-mono">
                Utilisateurs enregistrés
              </h4>

              {allUsers.filter(u => u.schoolId === activeSchoolId && (u.role === UserRole.SECRETAIRE || u.role === UserRole.DIRECTRICE)).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                  Aucun compte utilisateur n'est enregistré pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        <th className="py-2">Nom</th>
                        <th className="py-2">Rôle / Badge</th>
                        <th className="py-2">Compte Google / Campus</th>
                        <th className="py-2 text-right">Action Extrême</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allUsers
                        .filter(u => u.schoolId === activeSchoolId && (u.role === UserRole.SECRETAIRE || u.role === UserRole.DIRECTRICE))
                        .map(secUser => {
                          const associatedCampus = campuses.find(c => c.id === secUser.campusId);
                          return (
                            <tr key={secUser.id} className="hover:bg-slate-50/45 transition-colors">
                              <td className="py-3 pr-2">
                                <div className="font-semibold text-slate-700">{secUser.name}</div>
                                <div className="font-mono text-slate-400 text-[10px] truncate max-w-[150px]">{secUser.email}</div>
                              </td>
                              <td className="py-3">
                                <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                  secUser.role === UserRole.DIRECTRICE 
                                    ? "bg-purple-100 text-purple-700" 
                                    : "bg-blue-100 text-blue-700"
                                }`}>
                                  {secUser.role === UserRole.DIRECTRICE ? "Directrice" : "Secrétaire"}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`inline-block px-2 py-0.5 rounded-md font-medium text-[10px] ${
                                  associatedCampus ? "bg-slate-100 text-slate-700" : "bg-indigo-55 bg-indigo-50 text-indigo-700 font-bold"
                                }`}>
                                  {associatedCampus ? associatedCampus.name : "Accès Global"}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                {currentUser.id !== secUser.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSecretary(secUser.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition inline-flex items-center cursor-pointer"
                                    title="Supprimer définitivement l'accès"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic font-medium">Vous-même</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 text-slate-550 text-xs rounded-xl flex items-center justify-center">
            ⚠️ Seuls les administrateurs de premier rang ou les Directrices peuvent modifier les comptes utilisateurs.
          </div>
        )}
      </div>
    </div>
  );
}
