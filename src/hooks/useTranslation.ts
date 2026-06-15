import { useData } from "../context/DataContext";

export const translations = {
  fr: {
    // Sidebar Main Menu
    dashboard: "Tableau de Bord",
    newStudent: "Nouvelle Inscription",
    students: "Gestion des Élèves",
    waitlist: "Liste d'Attente",
    reports: "Rapports & Stats",
    renewals: "Alertes Renouvellement",
    classes: "Classes & Professeurs",
    settings: "Configuration École",
    audit: "Journal d'Audit",
    mainMenu: "Menu Principal",
    administration: "Administration",
    superAdminSaaS: "Super Admin SaaS",
    roleSuperadmin: "Super Administrateur",
    roleDirectrice: "Directrice Générale",
    roleSecretaire: "Secrétaire",
    disconnect: "Se déconnecter",
    roleLabel: "Rôle : ",

    // Navbar
    welcomeTitle: "Bienvenue, ",
    searchPlaceholder: "Rechercher un élève...",
    searchBtn: "Rechercher",
    alerts: "Alertes",
    darkMode: "Mode Sombre",
    lightMode: "Mode Clair",

    // Dashboard
    dashboardTitle: "Tableau de Bord d’Activité",
    dashboardSubtitle: "Aperçu de la scolarité et état des encaissements en temps réel",
    welcomeBack: "Ravi de vous revoir",
    directriceActionCenter: "Centre d'Alertes Contextuelles de Fin de Mois",
    directriceActionCenterDesc: "Synthèse et actions immédiates : recouvrements urgents, dossiers d'élèves incomplets et expirations.",
    activeStudents: "Élèves Actifs",
    activeStudentsDesc: "Inscriptions actives",
    collectedTuition: "Recouvrement Total",
    collectedTuitionDesc: "Montant encaissé",
    activeTeachers: "Enseignants Actifs",
    activeTeachersDesc: "En fonction",
    overdueFees: "Solde Restant Dû",
    overdueFeesDesc: "Impayés à recouvrer",
    waitlistCount: "Liste d'Attente",
    waitlistCountDesc: "Élèves bloqués",
    quickEnrollmentTitle: "Enregistrement d'Inscription Express",
    quickEnrollmentDesc: "Ajouter rapidement un élève à un cours",
    urgentPaymentsLabel: "1. Paiements Urgents",
    incompleteFilesLabel: "2. Dossiers Incomplets",
    imminentExpirationsLabel: "3. Inscriptions Expirant",
    remindParentBtn: "⚡ Relancer parent",
    validateFileBtn: "✓ Valider dossier",
    successAlertBadge: "🚨 SYNTHÈSE COLLECTIVE",

    // General Words
    allCampuses: "Tous les campus",
    studentName: "Élève",
    phone: "Téléphone",
    parentName: "Parent / Tuteur",
    class: "Classe",
    balance: "Solde",
    status: "Statut",
    actions: "Actions",
    noData: "Aucune donnée disponible",
    edit: "Modifier",
    delete: "Supprimer",
    save: "Enregistrer",
    cancel: "Annuler",
    loading: "Chargement...",
    success: "Succès",
    error: "Erreur",
    close: "Fermer",

    // Settings
    settingsTitle: "Personnalisation du Hub École",
    settingsSubtitle: "Configuration visuelle de la marque et captation photo du logo de l'établissement",
    profileSection: "Profil d'Édition Visuel",
    schoolNameLabel: "Nom de l'école de langues *",
    sloganLabel: "Slogan de l'établissement",
    logoSectionTitle: "Logo de l'école & Prise de photo caméra",
    logoDesc: "Pour définir le logo, prenez directement une photo via votre webcam, ou sélectionnez un fichier PNG/JPG standard.",
    webcamBtn: "Prendre une photo caméra",
    uploadBtn: "Choisir un fichier",
    themeColorLabel: "Couleur thématique de la formation",
    darkShadeNotice: "L'application génère automatiquement une nuance plus sombre de la couleur principale choisie afin de garantir une lisibilité et un contraste de premier plan en mode sombre.",
    saveConfigBtn: "Appliquer l'identité",
    langConfigTitle: "Configuration de Langue",
    langConfigDesc: "Définissez la langue d'affichage de l'interface utilisateur pour vos secrétaires.",
    interfaceLanguageLabel: "Langue par défaut de l'interface",
    langFrench: "Français (French)",
    langEnglish: "Anglais (English)",
    accessDeniedNotice: "ACCÈS LÉGÈREMENT RESTREINT (CONSULTATION UNIQUE) : En tant que Secrétaire, les paramètres visuels et d'administration de l'école sont protégés en lecture seule.",
  },
  en: {
    // Sidebar Main Menu
    dashboard: "Dashboard",
    newStudent: "New Registration",
    students: "Manage Students",
    waitlist: "Waitlist Queue",
    reports: "Reports & Stats",
    renewals: "Renewal Alerts",
    classes: "Classes & Teachers",
    settings: "School Settings",
    audit: "Audit Logs",
    mainMenu: "Main Menu",
    administration: "Administration",
    superAdminSaaS: "Super Admin SaaS",
    roleSuperadmin: "Super Administrator",
    roleDirectrice: "General Director",
    roleSecretaire: "Academic Secretary",
    disconnect: "Log Out",
    roleLabel: "Role: ",

    // Navbar
    welcomeTitle: "Welcome, ",
    searchPlaceholder: "Search for a student...",
    searchBtn: "Search",
    alerts: "Alerts",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",

    // Dashboard
    dashboardTitle: "Activity Dashboard",
    dashboardSubtitle: "Overview of student directory and real-time fee collection status",
    welcomeBack: "Good to see you again",
    directriceActionCenter: "Contextual Month-End Notifications Alert Centre",
    directriceActionCenterDesc: "Summary and immediate action items: urgent balance recoveries, incomplete files, and expirations.",
    activeStudents: "Active Students",
    activeStudentsDesc: "Active registrations",
    collectedTuition: "Total Collected",
    collectedTuitionDesc: "Amount collected",
    activeTeachers: "Active Instructors",
    activeTeachersDesc: "Currently active",
    overdueFees: "Unpaid Balance Due",
    overdueFeesDesc: "Pending collections",
    waitlistCount: "Waitlist Queue",
    waitlistCountDesc: "Waiting list entries",
    quickEnrollmentTitle: "Express Course Enrollment",
    quickEnrollmentDesc: "Add a student quickly to an ongoing class",
    urgentPaymentsLabel: "1. Urgent Payments",
    incompleteFilesLabel: "2. Incomplete Files",
    imminentExpirationsLabel: "3. Soon Expiring",
    remindParentBtn: "⚡ Remind parent",
    validateFileBtn: "✓ Complete file",
    successAlertBadge: "🚨 URGENT ACTION CENTRE",

    // General Words
    allCampuses: "All campuses",
    studentName: "Student",
    phone: "Phone",
    parentName: "Parent / Sponsor",
    class: "Class",
    balance: "Balance",
    status: "Status",
    actions: "Actions",
    noData: "No data available",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    success: "Success",
    error: "Error",
    close: "Close",

    // Settings
    settingsTitle: "School Hub Customization",
    settingsSubtitle: "Visual branding configurations, interface language, and camera capture logo",
    profileSection: "Visual Identity Editor",
    schoolNameLabel: "School Name *",
    sloganLabel: "Establishment Slogan",
    logoSectionTitle: "School Logo & Webcam Capture",
    logoDesc: "To customize the logo, take a snapshot with your webcam or select a standard PNG/JPG file.",
    webcamBtn: "Take snapshot with webcam",
    uploadBtn: "Choose visual file",
    themeColorLabel: "Brand Theme Colour",
    darkShadeNotice: "The system automatically synthesises a darker accent of your selected theme color to ensure high-contrast and visual readability on dark displays.",
    saveConfigBtn: "Apply Visual Theme",
    langConfigTitle: "Language Settings",
    langConfigDesc: "Set the default display language of the administrative interface for your academic secretaries.",
    interfaceLanguageLabel: "Interface Language Selection",
    langFrench: "Français (French)",
    langEnglish: "Anglais (English)",
    accessDeniedNotice: "READ-ONLY ACCOUNT ACCESS (RESTRICTED CONSULTATION): As a Secretary, the school's visual branding and administrative parameters are protected.",
  }
};

export type LanguageCode = "fr" | "en";

export function useTranslation() {
  const { schoolConfig } = useData();

  // Pick interfaceLanguage from schoolConfig, defaults to "fr"
  const lang: LanguageCode = (schoolConfig?.interfaceLanguage === "en") ? "en" : "fr";

  const t = (key: keyof typeof translations["fr"]): string => {
    return translations[lang][key] || translations["fr"][key] || key;
  };

  return {
    t,
    lang,
    isEn: lang === "en",
    isFr: lang === "fr"
  };
}
