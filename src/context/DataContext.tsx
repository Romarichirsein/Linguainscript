import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { Campus, Teacher, Class, Student, Payment, AuditLog, WaitlistEntry, UserProfile, UserRole, SchoolConfig, Reminder, School, PlanConfig, SystemNotification } from "../types";
import {
  mockCampuses,
  mockTeachers,
  mockClasses,
  mockStudents,
  mockPayments,
  mockWaitlist,
  mockAuditLogs,
  mockUsers
} from "../db/mockData";
import { db, auth } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firebaseErrors";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  getDocFromServer,
  Timestamp,
  serverTimestamp,
  increment,
  getDocFromCache
} from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

type OmitStudentFields = Omit< Student, "id" | "status" | "createdBy" | "createdAt" | "updatedAt" | "paidAmount" | "balance" >;
type StudentUpdate = Partial< Student >;
type OmitClassFields = Omit< Class, "id" | "currentCount" | "isActive" >;
type ClassUpdate = Partial< Class >;

interface DataContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isLocalSession: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginAsDemoUser: (email: string, name: string, role: UserRole, schoolId: string | null) => Promise<void>;
  logout: () => Promise<void>;
  availableUsers: UserProfile[];
  allUsers: UserProfile[];
  switchUser: (userId: string) => void;
  campuses: Campus[];
  teachers: Teacher[];
  classes: Class[];
  students: Student[];
  payments: Payment[];
  auditLogs: AuditLog[];
  waitlist: WaitlistEntry[];
  
  // Raw database tables for SaaS consolidated backups
  rawStudents: Student[];
  rawCampuses: Campus[];
  rawTeachers: Teacher[];
  rawClasses: Class[];
  rawPayments: Payment[];
  rawAuditLogs: AuditLog[];
  rawWaitlist: WaitlistEntry[];
  rawReminders: Reminder[];

  // SaaS Multi-tenant & Subscription management
  schools: School[];
  activeSchoolId: string | null;
  setActiveSchoolId: (id: string | null) => void;
  currentSchool: School | null;
  registerSchool: (name: string, dirName: string, dirEmail: string, pack: "basique" | "premium" | "integral", months: number, customExpiryDate?: string) => Promise<void>;
  renewSchoolSubscription: (schoolId: string, pack: "basique" | "premium" | "integral", months: number, customExpiryDate?: string) => Promise<void>;
  addStaffUser: (name: string, email: string, role: UserRole, campusId: string | null, schoolId?: string | null, password?: string) => Promise<void>;
  deleteStaffUser: (userId: string) => Promise<void>;

  // Plan Configurations
  plansConfig: PlanConfig[];
  updatePlanConfig: (planId: "basique" | "premium" | "integral", newConfig: Partial<PlanConfig>) => Promise<void>;
  currentPlan: PlanConfig;

  // Data actions
  addStudent: (
    studentData: OmitStudentFields,
    paymentAmount: number,
    paymentMode: "Espèces" | "Mobile Money" | "Virement" | null,
    paymentNote?: string,
    addToWaitlistIfFull?: boolean
  ) => Promise<{ success: boolean; studentId?: string; waitlistId?: string; message: string }>;

  updateStudent: (id: string, updated: StudentUpdate) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addPayment: (studentId: string, amount: number, mode: "Espèces" | "Mobile Money" | "Virement", note?: string) => Promise<void>;
  renewStudent: (id: string, newExpirationDate: string, cost: number, paymentAmount: number, mode: "Espèces" | "Mobile Money" | "Virement") => Promise<void>;
  
  addCampus: (name: string, address: string) => Promise<void>;
  updateCampus: (id: string, name: string, address: string, isActive: boolean) => Promise<void>;
  addTeacher: (name: string, phone: string, email: string, languages: string[], campusId: string) => Promise<void>;
  addClass: (classData: OmitClassFields) => Promise<void>;
  updateClass: (id: string, updated: ClassUpdate) => Promise<void>;
  
  promoteFromWaitlist: (waitlistId: string, paymentAmount: number, mode: "Espèces" | "Mobile Money" | "Virement") => Promise<{ success: boolean; message: string }>;
  removeFromWaitlist: (waitlistId: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
  schoolConfig: SchoolConfig | null;
  updateSchoolConfig: (newConfig: Partial<SchoolConfig>) => Promise<void>;
  reminders: Reminder[];
  addReminder: (reminderData: Omit<Reminder, "id" | "createdAt" >) => Promise<void>;
  runAutomaticSMSSweep: () => Promise<{ triggeredCount: number; logs: string[] }>;
  checkRoleAccess: (allowedRoles: UserRole[], actionDescription: string) => void;
  
  // System/SaaS notifications
  systemNotifications: SystemNotification[];
  createSystemNotification: (notif: Omit<SystemNotification, "id" | "createdAt" | "read">) => Promise<void>;
  updateSystemNotification: (id: string, updates: Partial<SystemNotification>) => Promise<void>;
  requestSchoolRenewal: (pack: "basique" | "premium" | "integral", months: number) => Promise<void>;
  approveSchoolRenewal: (notificationId: string) => Promise<void>;
  uniqueLanguages: string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper for mapping Firestore timestamps to ISO strings
function mapDoc<T>(document: any): T {
  const data = document.data();
  const result: any = { id: document.id };
  
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key] === "object" && typeof data[key].toDate === "function") {
      result[key] = data[key].toDate().toISOString();
    } else {
      result[key] = data[key];
    }
  });
  
  return result as T;
}

const defaultPlansConfig: PlanConfig[] = [
  {
    id: "basique",
    name: "Basique",
    price: 5000,
    maxStudents: 20,
    canCreateStudents: true,
    canManageStudents: false,
    canGenerateReceipts: false,
    canGenerateDocuments: false,
    canAdvancedSearch: false,
    canViewHistory: false,
    canViewReports: false,
    canManageWaitlist: false,
    canManageRenewals: false,
    canManageClasses: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: 10000,
    maxStudents: 100,
    canCreateStudents: true,
    canManageStudents: true,
    canGenerateReceipts: false,
    canGenerateDocuments: false,
    canAdvancedSearch: true,
    canViewHistory: false,
    canViewReports: false,
    canManageWaitlist: true,
    canManageRenewals: false,
    canManageClasses: true,
  },
  {
    id: "integral",
    name: "Intégral",
    price: 15000,
    maxStudents: 9999,
    canCreateStudents: true,
    canManageStudents: true,
    canGenerateReceipts: true,
    canGenerateDocuments: true,
    canAdvancedSearch: true,
    canViewHistory: true,
    canViewReports: true,
    canManageWaitlist: true,
    canManageRenewals: true,
    canManageClasses: true,
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plansConfig, setPlansConfig] = useState<PlanConfig[]>(() => {
    try {
      const saved = localStorage.getItem("lingua_plansConfig");
      if (saved) {
        const parsed = JSON.parse(saved);
        return defaultPlansConfig.map(def => {
          const matchingSaved = parsed.find((p: any) => p.id === def.id);
          return matchingSaved ? { ...def, ...matchingSaved } : def;
        });
      }
      return defaultPlansConfig;
    } catch {
      return defaultPlansConfig;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("lingua_plansConfig", JSON.stringify(plansConfig));
    } catch (e) {
      console.warn("localStorage plansConfig sync failed:", e);
    }
  }, [plansConfig]);

  const [firebaseUser, setFirebaseUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("lingua_firebaseUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("lingua_currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Flag to track local/demo sessions where Firebase Auth is not used
  // This prevents onAuthStateChanged from overriding manually set mock users
  // NOTE: We only restore the local session flag from localStorage if it was set by an EXPLICIT demo login.
  // Transient network errors should NOT permanently lock the app in offline mode across reloads.
  const [isLocalSession, setIsLocalSession] = useState(localStorage.getItem("lingua_isDemoLogin") === "true");

  useEffect(() => {
    try {
      if (firebaseUser) {
        localStorage.setItem("lingua_firebaseUser", JSON.stringify(firebaseUser));
      } else {
        localStorage.removeItem("lingua_firebaseUser");
      }
    } catch (e) {
      console.warn("localStorage sync failed:", e);
    }
  }, [firebaseUser]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("lingua_currentUser", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("lingua_currentUser");
      }
    } catch (e) {
      console.warn("localStorage sync failed:", e);
    }
  }, [currentUser]);

  // SaaS states
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Collections raw from database
  const [rawCampuses, setRawCampuses] = useState<Campus[]>([]);
  const [rawTeachers, setRawTeachers] = useState<Teacher[]>([]);
  const [rawClasses, setRawClasses] = useState<Class[]>([]);
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [rawPayments, setRawPayments] = useState<Payment[]>([]);
  const [rawAuditLogs, setRawAuditLogs] = useState<AuditLog[]>([]);
  const [rawWaitlist, setRawWaitlist] = useState<WaitlistEntry[]>([]);
  const [rawReminders, setRawReminders] = useState<Reminder[]>([]);
  
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);

  // Computed tenant specific slices of data
  const campuses = rawCampuses.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);
  const teachers = rawTeachers.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);
  const classes = rawClasses.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);
  const students = rawStudents.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);
  const payments = rawPayments.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);
  const auditLogs = rawAuditLogs.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);
  const waitlist = rawWaitlist.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);
  const reminders = rawReminders.filter(item => ((item as any).schoolId || "school_demo") === activeSchoolId);

  // Current connected school info
  const currentSchool = schools.find(s => s.id === activeSchoolId) || null;
  const currentPlan = plansConfig.find(p => p.id === (currentSchool?.subType || "basique")) || defaultPlansConfig[0];

  const uniqueLanguages = useMemo(() => {
    const defaultLangs = ["Allemand", "Anglais", "Chinois", "Espagnol", "Français", "Italien", "Portugais", "Russe"];
    const customLangs = schoolConfig?.customLanguages || [];
    return Array.from(new Set([...defaultLangs, ...customLangs, ...classes.map(c => c.language)])).sort();
  }, [schoolConfig?.customLanguages, classes]);

  // 1. Connection test & Auth subscriber
  useEffect(() => {
    const testConnection = async () => {
      // Skip connection test in local session mode
      if (isLocalSession) return;
      try {
        // Race against a 6s timeout to tolerate slow mobile/network connections
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection test timeout")), 6000));
        await Promise.race([getDocFromServer(doc(db, "test", "connection")), timeout]);
      } catch (error) {
        // Do NOT persist offline mode. It's a transient issue. The app will try again on next action.
        console.warn("Firestore initial connection check failed. App will retry on next request.", error);
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // If we're in an explicit local/demo session, skip database queries and keep the loaded local profile
      if (isLocalSession) {
        setFirebaseUser(user);
        setLoading(false);
        return;
      }

      setFirebaseUser(user);
      if (user) {
        const userRef = doc(db, "users", user.uid);
        try {
          let snapshot;
          const docTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firestore operation timeout")), 4000));
          try {
            snapshot = await Promise.race([getDoc(userRef), docTimeout]);
          } catch (netErr) {
            console.warn("Network request for user profile failed or timed out. Attempting cache read...");
            try {
              snapshot = await getDocFromCache(userRef);
            } catch (cacheErr) {
              console.error("Cache read failed as well. Falling back to default handler.", cacheErr);
              throw netErr; // Rethrow network error to trigger the main fallback
            }
          }
          const isSuperAdminEmail = user.email === "superadmin@linguainscript.com";

          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            
            // Set user profile and unblock the loading spinner immediately!
            // This allows the dashboard to render under 1 second.
            setCurrentUser(data);
            setLoading(false);

            // Run verification check in the background asynchronously
            (async () => {
              try {
                const cleanEmail = user.email?.toLowerCase();
                if (isSuperAdminEmail && data.role === UserRole.SUPERADMIN) return;
                if (data.role === UserRole.DIRECTRICE && data.schoolId) return;

                const schoolsSnap = await getDocs(collection(db, "schools"));
                const schoolsList = schoolsSnap.docs.map(doc => doc.data() as School);
                const matchingSchool = schoolsList.find(s => s.directriceEmail?.toLowerCase() === cleanEmail);

                if (isSuperAdminEmail && data.role !== UserRole.SUPERADMIN) {
                  const updatedProfile = { ...data, role: UserRole.SUPERADMIN, schoolId: null };
                  await setDoc(userRef, updatedProfile);
                  setCurrentUser(updatedProfile);
                } else if (matchingSchool && (data.role !== UserRole.DIRECTRICE || data.schoolId !== matchingSchool.id)) {
                  const updatedProfile: UserProfile = { 
                    ...data, 
                    role: UserRole.DIRECTRICE, 
                    schoolId: matchingSchool.id,
                    campusId: null
                  };
                  await setDoc(userRef, updatedProfile);
                  setCurrentUser(updatedProfile);
                }
              } catch (bgErr) {
                console.warn("Background profile verification check failed (offline/slow connection):", bgErr);
              }
            })();
            return;
          } else {
            // Check if there is an existing manual placeholder profile created by superadmin with this email
            const qUsers = query(collection(db, "users"), where("email", "==", user.email || ""));
            const usersSnap = await Promise.race([getDocs(qUsers), docTimeout]);
            const usersList = usersSnap.docs.map(d => d.data() as UserProfile);
            const matchingProfile = usersList.find(u => u.email?.toLowerCase() === user.email?.toLowerCase() && u.id !== user.uid);

            if (matchingProfile) {
              // Copy manual profile settings to this actual uid
              const newProfile: UserProfile = {
                ...matchingProfile,
                id: user.uid,
                name: user.displayName || matchingProfile.name
              };
              await Promise.race([setDoc(userRef, newProfile), docTimeout]).catch(err => console.warn("Failed writing user profile: ", err));
              
              // Remove the manual placeholder profile doc
              if (matchingProfile.id !== user.uid) {
                await Promise.race([deleteDoc(doc(db, "users", matchingProfile.id)), docTimeout]).catch(err => console.warn("Failed deleting placeholder: ", err));
              }
              
              setCurrentUser(newProfile);
            } else {
              // Else check if they are flagged as directrice on any school
              const schoolsSnap = await Promise.race([getDocs(collection(db, "schools")), docTimeout]);
              const schoolsList = schoolsSnap.docs.map(doc => doc.data() as School);
              const matchingSchool = schoolsList.find(s => s.directriceEmail?.toLowerCase() === user.email?.toLowerCase());

              if (matchingSchool) {
                const newProfile: UserProfile = {
                  id: user.uid,
                  name: user.displayName || matchingSchool.directriceName || "Directrice Lingua",
                  email: user.email || "",
                  role: UserRole.DIRECTRICE,
                  campusId: null,
                  schoolId: matchingSchool.id
                };
                await Promise.race([setDoc(userRef, newProfile), docTimeout]).catch(err => console.warn("Failed writing profile: ", err));
                setCurrentUser(newProfile);
              } else {
                // Default fallback: SECRETAIRE
                const newProfile: UserProfile = {
                  id: user.uid,
                  name: user.displayName || "Utilisateur Lingua",
                  email: user.email || "",
                  role: isSuperAdminEmail ? UserRole.SUPERADMIN : UserRole.SECRETAIRE,
                  campusId: isSuperAdminEmail ? null : "campus_01",
                  schoolId: isSuperAdminEmail ? null : "school_demo"
                };
                await Promise.race([setDoc(userRef, newProfile), docTimeout]).catch(err => console.warn("Failed writing fallback profile: ", err));
                setCurrentUser(newProfile);
              }
            }
          }
        } catch (err) {
          console.error("Error subscribing to user profile or Firestore offline:", err);
          
          // Temporary fallback: set local mode for this session only (NOT persisted to localStorage)
          // This allows the next page reload to try Firestore again.
          setIsLocalSession(true);

          // Determine profile based on email address
          const cleanEmail = user.email?.trim().toLowerCase() || "";
          let fallbackProfile: UserProfile;
          if (cleanEmail === "superadmin@linguainscript.com") {
            fallbackProfile = {
              id: "superadmin_romaric",
              name: "Super Administrateur SaaS",
              email: cleanEmail,
              role: UserRole.SUPERADMIN,
              campusId: null,
              schoolId: null
            };
          } else if (cleanEmail === "directrice.integral@gmail.com") {
            fallbackProfile = {
              id: "directrice_integral",
              name: "Thérèse Ngono (Directrice)",
              email: cleanEmail,
              role: UserRole.DIRECTRICE,
              campusId: null,
              schoolId: "school_integral"
            };
          } else if (cleanEmail === "secretaire.demo@gmail.com") {
            fallbackProfile = {
              id: "secretaire_demo",
              name: "Sarah Kiman (Secrétaire)",
              email: cleanEmail,
              role: UserRole.SECRETAIRE,
              campusId: "campus_01",
              schoolId: "school_demo"
            };
          } else {
            fallbackProfile = {
              id: user.uid,
              name: user.displayName || "Utilisateur Local",
              email: cleanEmail,
              role: UserRole.SECRETAIRE,
              campusId: "campus_01",
              schoolId: "school_demo"
            };
          }
          setCurrentUser(fallbackProfile);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [isLocalSession]);

  // Multi-tenant active school resolution
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === UserRole.SUPERADMIN) {
        if (!activeSchoolId) {
          setActiveSchoolId("school_demo");
        }
      } else {
        setActiveSchoolId(currentUser.schoolId || "school_demo");
      }
    } else {
      setActiveSchoolId(null);
    }
  }, [currentUser]);

  // Default schools used for both Firestore seeding and local fallback
  const getDefaultSchools = (): School[] => [
    {
      id: "school_demo",
      name: "LinguaInscript Douala",
      directriceEmail: "romarichirsein@gmail.com",
      directriceName: "Romaric Hirsein",
      subType: "integral",
      subStatus: "active",
      subExpiresAt: "2027-12-31T23:59:59.000Z",
      createdAt: new Date().toISOString()
    },
    {
      id: "school_basique",
      name: "Centre Moyen de l'Adamaoua",
      directriceEmail: "directrice.basique@gmail.com",
      directriceName: "Josiane Bello",
      subType: "basique",
      subStatus: "active",
      subExpiresAt: "2026-10-31T23:59:59.000Z",
      createdAt: new Date().toISOString()
    },
    {
      id: "school_premium",
      name: "African English Academy",
      directriceEmail: "directrice.premium@gmail.com",
      directriceName: "Amina Moukoko",
      subType: "premium",
      subStatus: "active",
      subExpiresAt: "2026-11-30T23:59:59.000Z",
      createdAt: new Date().toISOString()
    },
    {
      id: "school_integral",
      name: "Polyglot Hub Yaoundé",
      directriceEmail: "directrice.integral@gmail.com",
      directriceName: "Thérèse Ngono",
      subType: "integral",
      subStatus: "active",
      subExpiresAt: "2027-01-15T23:59:59.000Z",
      createdAt: new Date().toISOString()
    }
  ];

  // Sync schools list
  useEffect(() => {
    if (!firebaseUser) {
      setSchools([]);
      setAllUsers([]);
      return;
    }

    // LOCAL SESSION: seed schools & users from mock data directly into state
    if (isLocalSession) {
      console.log("[Local Session] Loading default schools and mock users into local state.");
      setSchools(getDefaultSchools());
      setAllUsers(mockUsers.map(u => ({ ...u, schoolId: u.schoolId || "school_demo" })));
      return;
    }

    const unsubSchools = onSnapshot(collection(db, "schools"), async (snapshot) => {
      const items = snapshot.docs.map(d => mapDoc<School>(d));
      setSchools(items);

      if (items.length === 0) {
        const batch = writeBatch(db);
        getDefaultSchools().forEach(sch => {
          batch.set(doc(db, "schools", sch.id), sch);
        });
        await batch.commit();
      }
    }, (err) => {
      console.error("Error loading schools list:", err);
      // Fallback: load default schools locally on permission error
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        setSchools(getDefaultSchools());
      }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setAllUsers(snapshot.docs.map(d => mapDoc<UserProfile>(d)));
    }, (err) => {
      console.error("Error loading all users:", err);
    });

    return () => {
      unsubSchools();
      unsubUsers();
    };
  }, [firebaseUser, isLocalSession]);

  // Helper: build a default SchoolConfig for a given school ID
  const getDefaultSchoolConfig = (schoolId: string): SchoolConfig => ({
    id: schoolId,
    name: schoolId === "school_basique" ? "Centre Moyen de l'Adamaoua" : schoolId === "school_premium" ? "African English Academy" : schoolId === "school_integral" ? "Polyglot Hub Yaoundé" : "LinguaInscript Douala",
    slogan: "L'excellence linguistique à portée de main",
    logoUrl: "",
    themeColor: schoolId === "school_basique" ? "emerald" : schoolId === "school_premium" ? "rose" : "blue",
    interfaceLanguage: "fr",
    certificateTitle: "ATTESTATION DE RÉUSSITE",
    certificateBody: "Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} a suivi avec succès tous ses cours de perfectionnement linguistique au sein de notre établissement.",
    certificateSignatory: "La Direction Académique",
    smsEnabled: false,
    smsGateway: "default",
    smsTemplate: "Rappel Lingua: Le solde de scolarité de {etudiant_nom} (tuteur: {parent_nom}) d'un montant de {montant} FCFA est attendu avant le {date_limite} pour éviter toute interruption. Merci.",
    smsDaysBefore: 5,
    customLanguages: []
  });

  // 2. Realtime sync with Firestore once authenticated
  useEffect(() => {
    if (!firebaseUser) {
      setRawCampuses([]);
      setRawTeachers([]);
      setRawClasses([]);
      setRawStudents([]);
      setRawPayments([]);
      setRawAuditLogs([]);
      setRawWaitlist([]);
      setSchoolConfig(null);
      setRawReminders([]);
      return;
    }

    // LOCAL SESSION: load all mock data directly into state, skip Firestore listeners
    if (isLocalSession) {
      console.log("[Local Session] Loading mock data into local state (Firestore bypassed).");
      const currentSchoolId = activeSchoolId || "school_demo";
      setRawCampuses(mockCampuses.map(c => ({ ...c, schoolId: currentSchoolId } as any)));
      setRawTeachers(mockTeachers.map(t => ({ ...t, schoolId: currentSchoolId } as any)));
      setRawClasses(mockClasses.map(c => ({ ...c, schoolId: currentSchoolId } as any)));
      setRawStudents(mockStudents.map(s => ({ ...s, schoolId: currentSchoolId } as any)));
      setRawPayments(mockPayments.map(p => ({ ...p, schoolId: currentSchoolId } as any)));
      setRawAuditLogs(mockAuditLogs.map(a => ({ ...a, schoolId: currentSchoolId } as any)));
      setRawWaitlist(mockWaitlist.map(w => ({ ...w, schoolId: currentSchoolId } as any)));
      setRawReminders([]);
      setSchoolConfig(getDefaultSchoolConfig(currentSchoolId));
      return;
    }

    const unsubCampuses = onSnapshot(collection(db, "campuses"), async (snapshot) => {
      const items = snapshot.docs.map(d => mapDoc<Campus>(d));
      setRawCampuses(items);
      
      // Seed if empty, only if the user is the Super Admin (avoids multiple writes by tenant managers)
      if (items.length === 0 && auth.currentUser?.email === "superadmin@linguainscript.com") {
        console.log("Database is empty. Seeding mock standard data...");
        await doDatabaseSeed();
      }
    }, (err) => {
      console.error("Error loading campuses: ", err);
    });

    const unsubPlansConfig = onSnapshot(collection(db, "plans_config"), async (snapshot) => {
      const items = snapshot.docs.map(d => mapDoc<PlanConfig>(d));
      if (items.length > 0) {
        const order = { basique: 0, premium: 1, integral: 2 };
        items.sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99));
        setPlansConfig(items);
      } else {
        const batch = writeBatch(db);
        defaultPlansConfig.forEach(plan => {
          batch.set(doc(db, "plans_config", plan.id), plan);
        });
        try {
          await batch.commit();
        } catch (e) {
          console.warn("Firestore plans_config seed failed (using local):", e);
        }
      }
    }, (err) => {
      console.warn("Error loading plans config from Firestore, keeping local config:", err);
    });

    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
      setRawTeachers(snapshot.docs.map(d => mapDoc<Teacher>(d)));
    }, (err) => handleFirestoreError(err, OperationType.GET, "teachers"));

    const unsubClasses = onSnapshot(collection(db, "classes"), (snapshot) => {
      setRawClasses(snapshot.docs.map(d => mapDoc<Class>(d)));
    }, (err) => handleFirestoreError(err, OperationType.GET, "classes"));

    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      setRawStudents(snapshot.docs.map(d => mapDoc<Student>(d)));
    }, (err) => handleFirestoreError(err, OperationType.GET, "students"));

    const unsubPayments = onSnapshot(collection(db, "payments"), (snapshot) => {
      setRawPayments(snapshot.docs.map(d => mapDoc<Payment>(d)));
    }, (err) => handleFirestoreError(err, OperationType.GET, "payments"));

    const unsubAuditLogs = onSnapshot(query(collection(db, "audit_logs"), orderBy("timestamp", "desc")), (snapshot) => {
      setRawAuditLogs(snapshot.docs.map(d => mapDoc<AuditLog>(d)));
    }, (err) => handleFirestoreError(err, OperationType.GET, "audit_logs"));

    const unsubWaitlist = onSnapshot(collection(db, "waitlist"), (snapshot) => {
      setRawWaitlist(snapshot.docs.map(d => mapDoc<WaitlistEntry>(d)));
    }, (err) => handleFirestoreError(err, OperationType.GET, "waitlist"));

    const unsubReminders = onSnapshot(collection(db, "reminders"), (snapshot) => {
      setRawReminders(snapshot.docs.map(d => mapDoc<Reminder>(d)));
    }, (err) => handleFirestoreError(err, OperationType.GET, "reminders"));

    const unsubSchoolConfig = onSnapshot(doc(db, "school_config", activeSchoolId || "school_demo"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSchoolConfig({
          id: data.id,
          name: data.name,
          slogan: data.slogan,
          logoUrl: data.logoUrl,
          themeColor: data.themeColor,
          interfaceLanguage: data.interfaceLanguage || "fr",
          certificateTitle: data.certificateTitle || "ATTESTATION DE RÉUSSITE",
          certificateBody: data.certificateBody || "Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} a suivi avec succès tous ses cours de perfectionnement linguistique au sein de notre établissement.",
          certificateSignatory: data.certificateSignatory || "La Direction Académique",
          smsEnabled: data.smsEnabled ?? false,
          smsGateway: data.smsGateway || "default",
          smsTemplate: data.smsTemplate || "Rappel Lingua: Le solde de scolarité de {etudiant_nom} (tuteur: {parent_nom}) d'un montant de {montant} FCFA est attendu avant le {date_limite} pour éviter toute interruption. Merci.",
          smsDaysBefore: data.smsDaysBefore ?? 5,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
          customLanguages: data.customLanguages || []
        });
      } else {
        setSchoolConfig(getDefaultSchoolConfig(activeSchoolId || "school_demo"));
      }
    }, (err) => {
      console.warn("School configuration document error: ", err);
    });

    return () => {
      unsubCampuses();
      unsubPlansConfig();
      unsubTeachers();
      unsubClasses();
      unsubStudents();
      unsubPayments();
      unsubAuditLogs();
      unsubWaitlist();
      unsubReminders();
      unsubSchoolConfig();
    };
  }, [firebaseUser, activeSchoolId, isLocalSession]);

  // Seeder helper
  const doDatabaseSeed = async () => {
    try {
      const batch = writeBatch(db);
      
      mockCampuses.forEach(item => {
        batch.set(doc(db, "campuses", item.id), { ...item, schoolId: "school_demo" });
      });
      
      mockTeachers.forEach(item => {
        batch.set(doc(db, "teachers", item.id), { ...item, schoolId: "school_demo" });
      });
      
      mockClasses.forEach(item => {
        batch.set(doc(db, "classes", item.id), { ...item, schoolId: "school_demo" });
      });
      
      mockStudents.forEach(item => {
        batch.set(doc(db, "students", item.id), {
          ...item,
          schoolId: "school_demo",
          createdAt: Timestamp.fromDate(new Date(item.createdAt)),
          updatedAt: Timestamp.fromDate(new Date(item.updatedAt))
        });
      });
      
      mockPayments.forEach(item => {
        batch.set(doc(db, "payments", item.id), { ...item, schoolId: "school_demo" });
      });

      mockWaitlist.forEach(item => {
        batch.set(doc(db, "waitlist", item.id), { ...item, schoolId: "school_demo" });
      });
      
      // Seed audit logs
      mockAuditLogs.forEach(item => {
        batch.set(doc(db, "audit_logs", item.id), {
          ...item,
          schoolId: "school_demo",
          timestamp: item.timestamp
        });
      });
      
      await batch.commit();
      console.log("Firebase seeding triggered and committed successfully under school_demo workspace.");
    } catch (err) {
      console.error("Error while seeding data:", err);
    }
  };

  const checkRoleAccess = (allowedRoles: UserRole[], actionDescription: string) => {
    if (!currentUser) {
      throw new Error("Authentification requise pour effectuer cette action.");
    }
    if (!allowedRoles.includes(currentUser.role)) {
      const roleLabel = currentUser.role === UserRole.SECRETAIRE ? "Secrétaire Académique" : currentUser.role === UserRole.DIRECTRICE ? "Directrice" : "SuperAdmin";
      throw new Error(`Accès refusé : Votre rôle (${roleLabel}) ne vous autorise pas à réaliser l'action "${actionDescription}".`);
    }
  };

  // SaaS multi-tenant actions
  const registerSchool = async (
    name: string,
    dirName: string,
    dirEmail: string,
    pack: "basique" | "premium" | "integral",
    months: number,
    customExpiryDate?: string
  ) => {
    checkRoleAccess([UserRole.SUPERADMIN], "Enregistrement d'un établissement SaaS");
    const schoolId = `school_${Date.now()}`;
    let expiryStr = "";
    if (customExpiryDate) {
      expiryStr = new Date(customExpiryDate).toISOString();
    } else {
      const subExpiresAt = new Date();
      subExpiresAt.setMonth(subExpiresAt.getMonth() + months);
      expiryStr = subExpiresAt.toISOString();
    }

    const newSchool: School = {
      id: schoolId,
      name,
      directriceName: dirName,
      directriceEmail: dirEmail,
      subType: pack,
      subStatus: "active",
      subExpiresAt: expiryStr,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Create School doc
      await setDoc(doc(db, "schools", schoolId), newSchool);

      // 2. Create default campus
      const campusId = `campus_${Date.now()}`;
      await setDoc(doc(db, "campuses", campusId), {
        id: campusId,
        name: "Campus Centre-Ville",
        address: "Quartier Administratif",
        isActive: true,
        createdAt: new Date().toISOString(),
        schoolId
      });

      // 3. Create default teacher
      const teacherId = `teach_${Date.now()}`;
      await setDoc(doc(db, "teachers", teacherId), {
        id: teacherId,
        name: "M. Ngoa Noah",
        phone: "+237 677 34 56 12",
        email: `ngoa.${schoolId}@linguasaas.com`,
        languages: ["Anglais", "Français"],
        campusId,
        isActive: true,
        schoolId
      });

      // 4. Create default class
      const classId = `class_${Date.now()}`;
      await setDoc(doc(db, "classes", classId), {
        id: classId,
        language: "Anglais d'Affaires",
        level: "B2",
        period: "12h",
        teacherId,
        campusId,
        maxStudents: 25,
        currentCount: 0,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        isActive: true,
        schoolId
      });

      // 5. Config
      await setDoc(doc(db, "school_config", schoolId), {
        id: schoolId,
        name,
        slogan: "Progrès de l'élite linguistique",
        logoUrl: "",
        themeColor: pack === "basique" ? "emerald" : pack === "premium" ? "rose" : "blue",
        updatedAt: new Date().toISOString()
      });

      // 6. Create immediate manual profile for the Directrice so they can login and immediately link
      const directriceProfileId = `profile_dir_${Date.now()}`;
      await setDoc(doc(db, "users", directriceProfileId), {
        id: directriceProfileId,
        name: dirName,
        email: dirEmail.trim().toLowerCase(),
        role: UserRole.DIRECTRICE,
        schoolId,
        campusId: null
      });

      console.log(`School ${name} created and bootstrapped successfully with custom Directrice profile.`);
    } catch (err) {
      console.error("Error seeding new school: ", err);
      handleFirestoreError(err, OperationType.WRITE, `schools/${schoolId}`);
    }
  };

  const renewSchoolSubscription = async (
    schoolId: string,
    pack: "basique" | "premium" | "integral",
    months: number,
    customExpiryDate?: string
  ) => {
    checkRoleAccess([UserRole.SUPERADMIN], "Renouvellement d'abonnement SaaS");
    const school = schools.find(s => s.id === schoolId);
    if (!school) return;

    let expiryStr = "";
    if (customExpiryDate) {
      expiryStr = new Date(customExpiryDate).toISOString();
    } else {
      let expiryDate = new Date(school.subExpiresAt);
      if (isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
        expiryDate = new Date();
      }
      expiryDate.setMonth(expiryDate.getMonth() + months);
      expiryStr = expiryDate.toISOString();
    }

    try {
      await updateDoc(doc(db, "schools", schoolId), {
        subType: pack,
        subStatus: "active",
        subExpiresAt: expiryStr
      });
      console.log(`School ${schoolId} renewed successfully with pack ${pack} with expiration ${expiryStr}`);
    } catch (e) {
      console.error("Failed to renew local school: ", e);
      handleFirestoreError(e, OperationType.WRITE, `schools/${schoolId}`);
    }
  };

  const addStaffUser = async (
    name: string,
    email: string,
    role: UserRole,
    campusId: string | null,
    schoolId?: string | null,
    password?: string
  ) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Création d'un accès utilisateur");
    const cleanId = `profile_${Date.now()}`;
    const newProfile: UserProfile = {
      id: cleanId,
      name,
      email: email.trim().toLowerCase(),
      role,
      campusId,
      schoolId: schoolId || activeSchoolId,
      password: password?.trim() || "lingua123"
    };

    try {
      await setDoc(doc(db, "users", cleanId), newProfile);
      console.log("Added school staff member successfully:", cleanId);
    } catch (error) {
      console.error("Failed to write staff member:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${cleanId}`);
    }
  };

  const deleteStaffUser = async (userId: string) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Révocation d'un accès utilisateur");
    try {
      await deleteDoc(doc(db, "users", userId));
      console.log("Deleted school staff member successfully:", userId);
    } catch (error) {
      console.error("Failed to delete staff member:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Popup authentication failed:", err);
    }
  };

  const loginWithPassword = async (email: string, password: string) => {
    setLoading(true);
    
    // Explicit login: quit demo mode completely
    localStorage.removeItem("lingua_isDemoLogin");
    localStorage.removeItem("lingua_isLocalSession");
    setIsLocalSession(false);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Resolve user profile and credentials first (for both demo users and normal Firestore users)
      let resolvedProfile: UserProfile | null = null;
      let storedPassword = "";

      if (cleanEmail === "superadmin@linguainscript.com" && password === "admin123") {
        storedPassword = "admin123";
        resolvedProfile = {
          id: "superadmin_romaric",
          name: "Super Administrateur SaaS",
          email: cleanEmail,
          role: UserRole.SUPERADMIN,
          campusId: null,
          schoolId: null,
          password: "admin123"
        };
      } else {
        // Search for a matching user in Firestore (with timeout to prevent hanging)
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const queryTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Aucun compte trouvé (la base de données est inaccessible).")), 5000));
        const snap = await Promise.race([getDocs(q), queryTimeout]);
        if (snap.empty) {
          throw new Error("Aucun compte trouvé avec cette adresse email.");
        }

        const userDoc = snap.docs[0];
        resolvedProfile = userDoc.data() as UserProfile;
        storedPassword = resolvedProfile.password || "lingua123";
      }

      // 2. If the password is correct, authenticate the user with Firebase Auth
      if (password !== storedPassword) {
        throw new Error("Mot de passe incorrect.");
      }

      const deterministicPassword = `${cleanEmail}_lingua_auth_2026`;
      let firebaseAuthUser: any = null;
      let firebaseUid = resolvedProfile.id;

      try {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, deterministicPassword);
          firebaseAuthUser = userCredential.user;
        } catch (authErr: any) {
          if (
            authErr.code === "auth/user-not-found" ||
            authErr.code === "auth/invalid-credential" ||
            authErr.code === "auth/wrong-password" ||
            (authErr.message && (
              authErr.message.includes("user-not-found") ||
              authErr.message.includes("invalid-credential") ||
              authErr.message.includes("wrong-password")
            ))
          ) {
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, deterministicPassword);
            firebaseAuthUser = userCredential.user;
          } else {
            throw authErr;
          }
        }
        firebaseUid = auth.currentUser?.uid || firebaseAuthUser?.uid || resolvedProfile.id;
      } catch (authErr: any) {
        console.error("Firebase Auth email/password method failed:", authErr);
        throw new Error("Erreur de connexion sécurisée avec le serveur d'authentification.");
      }

      const mockFUser = {
        uid: firebaseUid,
        email: cleanEmail,
        displayName: resolvedProfile.name,
        emailVerified: true,
        isAnonymous: false,
        providerData: []
      } as any;

      const updatedProfile: UserProfile = {
        ...resolvedProfile,
        id: firebaseUid
      };

      // Only write to Firestore if we have a real Firebase session (not local/demo)
      if (!isLocalSession) {
        try {
          const writeTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 5000));
          await Promise.race([setDoc(doc(db, "users", firebaseUid), updatedProfile), writeTimeout]);
        } catch (dbErr) {
          console.error("Failed writing demo session profile to Firestore:", dbErr);
        }
      }

      setFirebaseUser(mockFUser);
      setCurrentUser(updatedProfile);

    } catch (err: any) {
      console.error("Email/Password authentication failed: ", err);
      throw new Error(err.message || "Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = async (email: string, name: string, role: UserRole, schoolId: string | null) => {
    setLoading(true);
    setIsLocalSession(true);
    // Explicit demo login: persist this flag so reloads stay in demo mode
    localStorage.setItem("lingua_isDemoLogin", "true");
    const mockUid = `demo_${role}_${Date.now()}`;
    const mockFUser = {
      uid: mockUid,
      email: email,
      displayName: name,
      emailVerified: true,
      isAnonymous: false,
      providerData: []
    } as any;
    
    const profile: UserProfile = {
      id: mockUid,
      name,
      email: email.trim().toLowerCase(),
      role,
      campusId: role === UserRole.SUPERADMIN ? null : "campus_01",
      schoolId: schoolId,
      password: "lingua123"
    };

    // Skip Firestore write in local session mode (would hang with persistent cache)
    setFirebaseUser(mockFUser);
    setCurrentUser(profile);
    setLoading(false);
  };

  const logout = async () => {
    // Clear all session flags so onAuthStateChanged can work normally on next login
    setIsLocalSession(false);
    localStorage.removeItem("lingua_isDemoLogin");
    localStorage.removeItem("lingua_isLocalSession"); // Legacy cleanup
    localStorage.removeItem("lingua_firebaseUser");
    localStorage.removeItem("lingua_currentUser");
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setFirebaseUser(null);
      setCurrentUser(null);
    }
  };

  // Switch virtual user profile in DB (mock simulation for presentation)
  const switchUser = async (userId: string) => {
    if (!firebaseUser) return;
    const targetMock = mockUsers.find(u => u.id === userId);
    if (!targetMock) return;

    const userProfileRef = doc(db, "users", firebaseUser.uid);
    try {
      const updatedProfile: UserProfile = {
        id: firebaseUser.uid,
        name: targetMock.name,
        email: firebaseUser.email || targetMock.email,
        role: targetMock.role,
        campusId: targetMock.campusId
      };
      await setDoc(userProfileRef, updatedProfile);
      setCurrentUser(updatedProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }
  };

  const handleAudit = async (
    action: AuditLog["action"],
    targetId: string,
    targetName: string,
    details?: any
  ) => {
    if (!currentUser) return;
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLog = {
      id: logId,
      action,
      targetId,
      targetName,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role, // Trace exact role title (Directrice, Secretaire)
      campusId: currentUser.campusId || "global",
      timestamp: new Date().toISOString(),
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      schoolId: activeSchoolId || "school_demo"
    };

    try {
      await setDoc(doc(db, "audit_logs", logId), newLog);
    } catch (err) {
      console.error("Failed to write audit log:", err);
    }
  };

  // Automated Student Balance Expiry Alerts
  useEffect(() => {
    if (!students || students.length === 0 || !auditLogs || !currentUser) return;

    const today = new Date();
    students.forEach(async (std) => {
      if (!std.nextPaymentDate || std.balance <= 0) return;
      
      const dueDate = new Date(std.nextPaymentDate);
      if (dueDate <= today) {
        // Overdue! Check if we already logged a PAYMENT_EXPIRED audit log for this student
        const hasAlert = auditLogs.some(
          log => log.action === "UPDATE_STUDENT" && log.targetId === std.id && log.details?.action === "ÉCHÉANCE_IMPAYÉE"
        );
        
        if (!hasAlert) {
          console.log(`Triggering payment expiration audit warning for student ${std.id}`);
          try {
            await handleAudit(
              "UPDATE_STUDENT",
              std.id,
              `${std.firstName} ${std.lastName}`,
              {
                action: "ÉCHÉANCE_IMPAYÉE",
                balance: std.balance,
                dueDate: std.nextPaymentDate,
                message: `⚠️ Échéance impayée : Un solde de ${std.balance.toLocaleString('fr-FR')} FCFA est dû par l'élève ${std.firstName} ${std.lastName} (Date limite dépassée le ${new Date(std.nextPaymentDate).toLocaleDateString("fr-FR")}).`
              }
            );
          } catch (err) {
            console.error("Failed to write automated payment expired audit log", err);
          }
        }
      }
    });
  }, [students, auditLogs, currentUser]);

  // Core Mutation Actions
  const addStudent = async (
    studentData: Omit<Student, "id" | "status" | "createdBy" | "createdAt" | "updatedAt" | "paidAmount" | "balance">,
    paymentAmount: number,
    paymentMode: "Espèces" | "Mobile Money" | "Virement" | null,
    paymentNote?: string,
    addToWaitlistIfFull: boolean = false
  ) => {
    if (!currentUser) return { success: false, message: "Non authentifié" };
    if (currentUser.role === UserRole.SUPERADMIN) {
      return { success: false, message: "Le Super Administrateur ne gère pas les élèves. Cette action est réservée aux directrices et secrétaires des écoles." };
    }

    // Check school's subscription plan rules
    const activePlan = plansConfig.find(p => p.id === (currentSchool?.subType || "basique")) || plansConfig[0];
    if (!activePlan.canCreateStudents) {
      return {
        success: false,
        message: `⚠️ Action bloquée : Votre plan d'abonnement actuel (${activePlan.name}) ne vous permet pas d'inscrire de nouveaux élèves.`
      };
    }
    if (students.length >= activePlan.maxStudents) {
      return {
        success: false,
        message: `⚠️ Limite atteinte : Votre école utilise le pack ${activePlan.name} qui limite le nombre total d'élèves à ${activePlan.maxStudents}. Veuillez modifier votre abonnement pour inscrire au-delà.`
      };
    }

    const selectedClass = classes.find(c => c.id === studentData.classId);
    if (!selectedClass) {
      return { success: false, message: "Classe introuvable" };
    }

    const isClassFull = selectedClass.currentCount >= selectedClass.maxStudents;

    if (isClassFull && !addToWaitlistIfFull) {
      return {
        success: false,
        message: `La classe est pleine (${selectedClass.currentCount}/${selectedClass.maxStudents}). Voulez-vous mettre cet élève en liste d'attente ?`
      };
    }

    if (isClassFull && addToWaitlistIfFull) {
      const waitlistId = `wait_${Date.now()}`;
      const classWaitlist = waitlist.filter(w => w.classId === selectedClass.id);
      const position = classWaitlist.length + 1;

      const newWaitlistEntry: WaitlistEntry = {
        id: waitlistId,
        classId: selectedClass.id,
        studentId: `stud_wait_${Date.now()}`,
        studentName: `${studentData.firstName} ${studentData.lastName}`,
        studentPhone: studentData.phone,
        addedAt: new Date().toISOString(),
        position,
        addedBy: {
          userId: currentUser.id,
          userName: currentUser.name
        },
        schoolId: activeSchoolId || "school_demo"
      } as any;

      if (isLocalSession) {
        // Demo mode: update local state only
        setRawWaitlist(prev => [...prev, newWaitlistEntry]);
        return { success: true, waitlistId, message: `L'élève "${newWaitlistEntry.studentName}" a été ajouté en liste d'attente (Mode Démo, Position ${position}).` };
      }

      try {
        await setDoc(doc(db, "waitlist", waitlistId), newWaitlistEntry);
        await handleAudit("ADD_WAITLIST", newWaitlistEntry.studentId, newWaitlistEntry.studentName, {
          class: `${selectedClass.language} ${selectedClass.level} - ${selectedClass.period}`,
          position
        });
        return {
          success: true,
          waitlistId,
          message: `L'élève "${newWaitlistEntry.studentName}" a été ajouté avec succès en liste d'attente (Position ${position}).`
        };
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `waitlist/${waitlistId}`);
        return { success: false, message: `Erreur lors de l'ajout en liste d'attente : ${err?.message || "Erreur Firestore"}` };
      }
    }

    // Normal registration
    const studentId = `stud_${Date.now()}`;
    const newStudent: Student = {
      ...studentData,
      id: studentId,
      status: "actif",
      paidAmount: paymentAmount,
      balance: studentData.totalAmount - paymentAmount,
      createdBy: {
        userId: currentUser.id,
        userName: currentUser.name
      },
      createdAt: new Date().toISOString(), // Fallback before DB write
      updatedAt: new Date().toISOString(),
      schoolId: activeSchoolId || "school_demo"
    } as any;

    // DEMO MODE: update local state only, no Firestore write
    if (isLocalSession) {
      const demoStudent = { ...newStudent, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setRawStudents(prev => [...prev, demoStudent]);
      setRawClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, currentCount: c.currentCount + 1 } : c));
      if (paymentAmount > 0 && paymentMode) {
        const paymentId = `pay_${Date.now()}`;
        const demoPayment: Payment = {
          id: paymentId,
          studentId,
          amount: paymentAmount,
          date: new Date().toISOString().split("T")[0],
          mode: paymentMode,
          recordedBy: { userId: currentUser.id, userName: currentUser.name },
          note: paymentNote || "Paiement initial de l'inscription",
          schoolId: activeSchoolId || "school_demo"
        } as any;
        setRawPayments(prev => [...prev, demoPayment]);
      }
      return { success: true, studentId, message: `L'élève "${newStudent.firstName} ${newStudent.lastName}" a été créé (Mode Démo).` };
    }

    try {
      // 1. Write Student to firestore with server timestamps for strict security compliance
      await setDoc(doc(db, "students", studentId), {
        ...newStudent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Increment student count in classes collection
      await updateDoc(doc(db, "classes", selectedClass.id), {
        currentCount: increment(1)
      });

      // 3. Record payment if paymentAmount > 0
      if (paymentAmount > 0 && paymentMode) {
        const paymentId = `pay_${Date.now()}`;
        const newPayment: Payment = {
          id: paymentId,
          studentId,
          amount: paymentAmount,
          date: new Date().toISOString().split("T")[0],
          mode: paymentMode,
          recordedBy: {
            userId: currentUser.id,
            userName: currentUser.name
          },
          note: paymentNote || "Paiement initial de l'inscription",
          schoolId: activeSchoolId || "school_demo"
        } as any;
        await setDoc(doc(db, "payments", paymentId), newPayment);
        await handleAudit("ADD_PAYMENT", studentId, `${newStudent.firstName} ${newStudent.lastName}`, {
          amount: paymentAmount,
          mode: paymentMode
        });
      }

      await handleAudit("CREATE_STUDENT", studentId, `${newStudent.firstName} ${newStudent.lastName}`, {
        class: `${selectedClass.language} ${selectedClass.level} - ${selectedClass.period}`
      });

      return {
        success: true,
        studentId,
        message: `L'élève "${newStudent.firstName} ${newStudent.lastName}" a été inscrit avec succès.`
      };
    } catch (err: any) {
      // In online mode, propagate the real error to the UI. Don't silently mask it.
      console.error("Firestore write failed for student creation:", err);
      const friendlyMsg = err?.code === "permission-denied"
        ? "Accès refusé : Vos règles Firestore ne permettent pas cette écriture. Vérifiez la configuration Firebase."
        : `Erreur lors de l'inscription : ${err?.message || "Erreur Firestore"}`;
      return { success: false, message: friendlyMsg };
    }
  };

  const updateStudent = async (id: string, updated: StudentUpdate) => {
    if (!currentUser) return;
    const activePlan = plansConfig.find(p => p.id === (currentSchool?.subType || "basique")) || defaultPlansConfig[0];
    if (!activePlan.canManageStudents) {
      throw new Error(`⚠️ Action bloquée : Votre plan d'abonnement actuel (${activePlan.name}) ne vous permet pas de modifier ou de gérer les élèves.`);
    }
    const studentRef = doc(db, "students", id);
    const existingStudent = students.find(s => s.id === id);
    if (!existingStudent) return;

    try {
      await updateDoc(studentRef, {
        ...updated,
        updatedAt: serverTimestamp()
      });

      // Automatically trigger notification when student status passes to "actif" (Validated)
      if (updated.status === "actif" && existingStudent.status === "en_attente") {
        const tempRemId = `rem_${Date.now()}`;
        const paymentLink = `https://pay.linguainscript.com/checkout/${id}`;
        const finalEmail = existingStudent.email || `${existingStudent.firstName.toLowerCase()}.${existingStudent.lastName.toLowerCase()}@test.com`;
        const updatedBalance = typeof updated.balance === "number" ? updated.balance : existingStudent.balance;
        
        await setDoc(doc(db, "reminders", tempRemId), {
          id: tempRemId,
          studentId: id,
          studentName: `${existingStudent.firstName} ${existingStudent.lastName}`,
          studentEmail: finalEmail,
          type: "registration_validated",
          status: "sent",
          medium: "email",
          amountDue: updatedBalance,
          dueDate: existingStudent.expirationDate || new Date().toISOString(),
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          notes: `Bonjour,\n\nNous avons le plaisir de vous informer que l'inscription de l'élève ${existingStudent.firstName} ${existingStudent.lastName} est désormais VALIDÉE.\n\nS'il vous reste un montant à régler sur vos droits de scolarité (${updatedBalance.toLocaleString()} FCFA), vous pouvez procéder au paiement sécurisé en ligne via notre portail sécurisé :\n👉 ${paymentLink}\n\nMerci de votre confiance.\nLa direction administrative.`,
          sentBy: {
            userId: "system",
            userName: "Service de Notification Automatique"
          },
          schoolId: activeSchoolId || "school_demo"
        });
      }

      const changedFields = Object.keys(updated).filter(
        key => JSON.stringify((updated as any)[key]) !== JSON.stringify((existingStudent as any)[key])
      );

      if (changedFields.length > 0) {
        await handleAudit("UPDATE_STUDENT", id, `${existingStudent.firstName} ${existingStudent.lastName}`, {
          field: changedFields.join(", "),
          before: JSON.stringify(changedFields.reduce((acc, f) => ({ ...acc, [f]: (existingStudent as any)[f] }), {})),
          after: JSON.stringify(changedFields.reduce((acc, f) => ({ ...acc, [f]: (updated as any)[f] }), {}))
        });
      }

      // If class was changed, update counts
      if (updated.classId && updated.classId !== existingStudent.classId) {
        await updateDoc(doc(db, "classes", existingStudent.classId), {
          currentCount: increment(-1)
        });
        await updateDoc(doc(db, "classes", updated.classId), {
          currentCount: increment(1)
        });
        await handleAudit("CHANGE_CLASS", id, `${existingStudent.firstName} ${existingStudent.lastName}`, {
          beforeClassId: existingStudent.classId,
          afterClassId: updated.classId
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `students/${id}`);
    }
  };

  const deleteStudent = async (studentId: string) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Suppression d'un élève");
    if (!currentUser) return;

    const student = rawStudents.find(s => s.id === studentId);
    if (!student) return;

    if (isLocalSession) {
      setRawStudents(prev => prev.filter(s => s.id !== studentId));
      if (student.classId) {
        setRawClasses(prev => prev.map(c => c.id === student.classId ? { ...c, currentCount: Math.max(0, c.currentCount - 1) } : c));
      }
      return;
    }

    try {
      // 1. Delete student document
      await deleteDoc(doc(db, "students", studentId));

      // 2. Decrement class count
      if (student.classId) {
        await updateDoc(doc(db, "classes", student.classId), {
          currentCount: increment(-1)
        }).catch(err => console.warn("Failed to update class count on student delete:", err));
      }

      // 3. Log deletion in audit trailing logs
      await handleAudit("DELETE_STUDENT", studentId, `${student.firstName} ${student.lastName}`, {
        classId: student.classId,
        schoolId: student.schoolId
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `students/${studentId}`);
    }
  };

  const addPayment = async (studentId: string, amount: number, mode: "Espèces" | "Mobile Money" | "Virement", note?: string) => {
    if (!currentUser) return;
    const activePlan = plansConfig.find(p => p.id === (currentSchool?.subType || "basique")) || defaultPlansConfig[0];
    if (!activePlan.canManageStudents) {
      throw new Error(`⚠️ Action bloquée : Votre plan d'abonnement actuel (${activePlan.name}) ne vous permet pas de gérer les paiements des élèves.`);
    }
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newAmountPaid = student.paidAmount + amount;
    const newBalance = Math.max(0, student.totalAmount - newAmountPaid);

    try {
      // 1. Update balance
      await updateDoc(doc(db, "students", studentId), {
        paidAmount: newAmountPaid,
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      // 2. Save payment doc
      const paymentId = `pay_${Date.now()}`;
      const newPayment: Payment = {
        id: paymentId,
        studentId,
        amount,
        date: new Date().toISOString().split("T")[0],
        mode,
        recordedBy: {
          userId: currentUser.id,
          userName: currentUser.name
        },
        note: note || "Complément de paiement scolaire",
        schoolId: activeSchoolId || "school_demo"
      } as any;
      await setDoc(doc(db, "payments", paymentId), newPayment);

      await handleAudit("ADD_PAYMENT", studentId, `${student.firstName} ${student.lastName}`, {
        amount,
        mode,
        note
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `payments/${studentId}`);
    }
  };

  const renewStudent = async (id: string, newExpirationDate: string, cost: number, paymentAmount: number, mode: "Espèces" | "Mobile Money" | "Virement") => {
    if (!currentUser) return;
    const activePlan = plansConfig.find(p => p.id === (currentSchool?.subType || "basique")) || defaultPlansConfig[0];
    if (!activePlan.canManageStudents) {
      throw new Error(`⚠️ Action bloquée : Votre plan d'abonnement actuel (${activePlan.name}) ne vous permet pas de renouveler ou de modifier les inscriptions des élèves.`);
    }
    const student = students.find(s => s.id === id);
    if (!student) return;

    const newTotal = student.totalAmount + cost;
    const newPaid = student.paidAmount + paymentAmount;
    const newBalance = newTotal - newPaid;

    try {
      await updateDoc(doc(db, "students", id), {
        status: "actif",
        expirationDate: newExpirationDate,
        totalAmount: newTotal,
        paidAmount: newPaid,
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      if (paymentAmount > 0) {
        const paymentId = `pay_${Date.now()}`;
        const newPayment: Payment = {
          id: paymentId,
          studentId: id,
          amount: paymentAmount,
          date: new Date().toISOString().split("T")[0],
          mode,
          recordedBy: {
            userId: currentUser.id,
            userName: currentUser.name
          },
          note: `Paiement pour renouvellement jusqu'au ${newExpirationDate}`,
          schoolId: activeSchoolId || "school_demo"
        } as any;
        await setDoc(doc(db, "payments", paymentId), newPayment);
      }

      await handleAudit("RENEWAL", id, `${student.firstName} ${student.lastName}`, {
        extendedUntil: newExpirationDate,
        cost,
        paid: paymentAmount
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `students/${id}`);
    }
  };

  const addCampus = async (name: string, address: string) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Ajout d'un campus");
    const id = `campus_${Date.now()}`;
    const newCampus: Campus = {
      id,
      name,
      address,
      isActive: true,
      createdAt: new Date().toISOString(),
      schoolId: activeSchoolId || "school_demo"
    } as any;
    if (isLocalSession) {
      setRawCampuses(prev => [...prev, newCampus as any]);
      return;
    }
    try {
      await setDoc(doc(db, "campuses", id), newCampus);
      await handleAudit("UPDATE_STUDENT", id, name, { action: "Ajout Campus", address });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `campuses/${id}`);
    }
  };

  const updateCampus = async (id: string, name: string, address: string, isActive: boolean) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Modification d'un campus");
    if (isLocalSession) {
      setRawCampuses(prev => prev.map(c => c.id === id ? { ...c, name, address, isActive } as Campus : c));
      return;
    }
    try {
      await updateDoc(doc(db, "campuses", id), { name, address, isActive });
      await handleAudit("UPDATE_STUDENT", id, name, { action: "Modification Campus", address, isActive });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `campuses/${id}`);
    }
  };

  const updatePlanConfig = async (planId: "basique" | "premium" | "integral", newConfig: Partial<PlanConfig>) => {
    if (currentUser?.role !== UserRole.SUPERADMIN) {
      throw new Error("Seul le Super Administrateur peut modifier la configuration des plans.");
    }

    const updatedPlans = plansConfig.map(p => {
      if (p.id === planId) {
        return { ...p, ...newConfig };
      }
      return p;
    });

    // Optimistic local state update
    setPlansConfig(updatedPlans);

    // Save to Firestore
    try {
      const planRef = doc(db, "plans_config", planId);
      await updateDoc(planRef, newConfig as any);
    } catch (error: any) {
      console.warn("Firestore plansConfig update failed, updating local state only:", error);
    }
  };

  const addTeacher = async (name: string, phone: string, email: string, languages: string[], campusId: string) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Enregistrement d'un professeur");
    const id = `teacher_${Date.now()}`;
    const newTeacher: Teacher = {
      id,
      name,
      phone,
      email,
      languages,
      campusId,
      isActive: true,
      schoolId: activeSchoolId || "school_demo"
    } as any;
    if (isLocalSession) {
      setRawTeachers(prev => [...prev, newTeacher as any]);
      return;
    }
    try {
      await setDoc(doc(db, "teachers", id), newTeacher);
      await handleAudit("UPDATE_STUDENT", id, name, { action: "Ajout Professeur", languages });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `teachers/${id}`);
    }
  };

  const addClass = async (classData: OmitClassFields) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE, UserRole.SECRETAIRE], "Enregistrement d'une classe");
    const id = `class_${Date.now()}`;
    const newClass: Class = {
      ...classData,
      id,
      currentCount: 0,
      isActive: true,
      schoolId: activeSchoolId || "school_demo"
    } as any;
    if (isLocalSession) {
      setRawClasses(prev => [...prev, newClass as any]);
      return;
    }
    try {
      await setDoc(doc(db, "classes", id), newClass);
      await handleAudit("UPDATE_STUDENT", id, `${classData.language} ${classData.level}`, { action: "Ajout Classe", period: classData.period });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `classes/${id}`);
    }
  };

  const updateClass = async (id: string, updated: ClassUpdate) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE, UserRole.SECRETAIRE], "Modification d'une classe");
    if (isLocalSession) {
      setRawClasses(prev => prev.map(c => c.id === id ? { ...c, ...updated } as Class : c));
      return;
    }
    try {
      await updateDoc(doc(db, "classes", id), updated);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `classes/${id}`);
    }
  };

  const promoteFromWaitlist = async (waitlistId: string, paymentAmount: number, mode: "Espèces" | "Mobile Money" | "Virement") => {
    if (!currentUser) return { success: false, message: "Non authentifié" };
    
    const activePlan = plansConfig.find(p => p.id === (currentSchool?.subType || "basique")) || defaultPlansConfig[0];
    if (!activePlan.canCreateStudents) {
      return { success: false, message: "⚠️ Action bloquée : Votre plan d'abonnement actuel ne vous permet pas de créer de nouveaux élèves." };
    }
    if (!activePlan.canManageStudents) {
      return { success: false, message: "⚠️ Action bloquée : Votre plan d'abonnement actuel ne vous permet pas de gérer ou de promouvoir les élèves." };
    }
    if (students.length >= activePlan.maxStudents) {
      return { success: false, message: `⚠️ Limite de capacité atteinte : Votre école utilise le pack ${activePlan.name} qui limite le nombre total d'élèves à ${activePlan.maxStudents}.` };
    }

    const entry = waitlist.find(w => w.id === waitlistId);
    if (!entry) return { success: false, message: "Entrée liste d'attente introuvable" };

    const selectedClass = classes.find(c => c.id === entry.classId);
    if (!selectedClass) return { success: false, message: "Classe introuvable" };

    if (selectedClass.currentCount >= selectedClass.maxStudents) {
      return { success: false, message: "La classe est toujours pleine." };
    }

    const nameParts = entry.studentName.split(" ");
    const firstName = nameParts[0] || "Étudiant";
    const lastName = nameParts.slice(1).join(" ") || "Inscrit";

    const studentId = `stud_${Date.now()}`;
    const newStudent: Student = {
      id: studentId,
      firstName,
      lastName,
      birthDate: "2000-01-01",
      phone: entry.studentPhone,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
      parentName: "À renseigner",
      parentPhone: entry.studentPhone,
      campusId: selectedClass.campusId,
      classId: entry.classId,
      status: "actif",
      enrollmentDate: new Date().toISOString().split("T")[0],
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      totalAmount: 150000,
      paidAmount: paymentAmount,
      balance: 150000 - paymentAmount,
      createdBy: {
        userId: currentUser.id,
        userName: currentUser.name
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schoolId: activeSchoolId || "school_demo"
    } as any;

    try {
      // 1. Create student
      await setDoc(doc(db, "students", studentId), {
        ...newStudent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Increment class count
      await updateDoc(doc(db, "classes", selectedClass.id), {
        currentCount: increment(1)
      });

      // 3. Save payment if > 0
      if (paymentAmount > 0) {
        const payId = `pay_${Date.now()}`;
        const newPayment: Payment = {
          id: payId,
          studentId,
          amount: paymentAmount,
          date: new Date().toISOString().split("T")[0],
          mode,
          recordedBy: {
            userId: currentUser.id,
            userName: currentUser.name
          },
          note: `Paiement d'admission depuis liste d'attente`,
          schoolId: activeSchoolId || "school_demo"
        } as any;
        await setDoc(doc(db, "payments", payId), newPayment);
      }

      // 4. Delete waitlist record
      await deleteDoc(doc(db, "waitlist", waitlistId));

      // Automatically trigger notification when student is promoted (Validated)
      const promoRemId = `rem_${Date.now()}`;
      const paymentLink = `https://pay.linguainscript.com/checkout/${studentId}`;
      const finalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`;
      const finalBalance = 150000 - paymentAmount;

      await setDoc(doc(db, "reminders", promoRemId), {
        id: promoRemId,
        studentId,
        studentName: entry.studentName,
        studentEmail: finalEmail,
        type: "registration_validated",
        status: "sent",
        medium: "email",
        amountDue: finalBalance,
        dueDate: newStudent.expirationDate,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        notes: `Bonjour,\n\nNous avons le plaisir de vous informer que l'inscription de l'élève ${entry.studentName} suite à sa libération de la liste d'attente est désormais VALIDÉE.\n\nS'il vous reste un montant à régler sur vos droits de scolarité (${finalBalance.toLocaleString()} FCFA), vous pouvez procéder au paiement sécurisé en ligne via notre portail sécurisé :\n👉 ${paymentLink}\n\nMerci de votre confiance.\nLa direction administrative.`,
        sentBy: {
          userId: "system",
          userName: "Service de Notification Automatique"
        },
        schoolId: activeSchoolId || "school_demo"
      });

      // Re-index other waitlist items
      const remaining = waitlist.filter(w => w.classId === entry.classId && w.id !== waitlistId);
      for (const item of remaining) {
        if (item.position > entry.position) {
          await updateDoc(doc(db, "waitlist", item.id), {
            position: item.position - 1
          });
        }
      }

      await handleAudit("FROM_WAITLIST", studentId, entry.studentName, {
        class: `${selectedClass.language} ${selectedClass.level} · ${selectedClass.period}`
      });

      return { success: true, message: `L'élève ${entry.studentName} a été inscrit avec succès !` };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `students/${studentId}`);
      return { success: false, message: "Échec de la promotion" };
    }
  };

  const removeFromWaitlist = async (waitlistId: string) => {
    const entry = waitlist.find(w => w.id === waitlistId);
    if (!entry) return;

    const activePlan = plansConfig.find(p => p.id === (currentSchool?.subType || "basique")) || defaultPlansConfig[0];
    if (!activePlan.canManageStudents) {
      throw new Error(`⚠️ Action bloquée : Votre plan d'abonnement actuel (${activePlan.name}) ne vous permet pas de modifier ou de gérer les inscriptions de la liste d'attente.`);
    }

    try {
      await deleteDoc(doc(db, "waitlist", waitlistId));

      // Adjust remaining positions
      const remaining = waitlist.filter(w => w.classId === entry.classId && w.id !== waitlistId);
      for (const item of remaining) {
        if (item.position > entry.position) {
          await updateDoc(doc(db, "waitlist", item.id), {
            position: item.position - 1
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `waitlist/${waitlistId}`);
    }
  };

  const resetDatabase = async () => {
    checkRoleAccess([UserRole.SUPERADMIN], "Réinitialisation complète de la base de données");
    // Standard re-seeding triggers on deleting all campuses
    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      // Delete everything we can fetch
      campuses.forEach(c => batch.delete(doc(db, "campuses", c.id)));
      teachers.forEach(t => batch.delete(doc(db, "teachers", t.id)));
      classes.forEach(cl => batch.delete(doc(db, "classes", cl.id)));
      students.forEach(s => batch.delete(doc(db, "students", s.id)));
      payments.forEach(p => batch.delete(doc(db, "payments", p.id)));
      auditLogs.forEach(al => batch.delete(doc(db, "audit_logs", al.id)));
      waitlist.forEach(w => batch.delete(doc(db, "waitlist", w.id)));
      reminders.forEach(r => batch.delete(doc(db, "reminders", r.id)));
      
      await batch.commit();
      
      // Trigger new seed
      await doDatabaseSeed();
      setLoading(false);
    } catch (err) {
      console.error("Reset database error: ", err);
    }
  };

  const addReminder = async (reminderData: Omit<Reminder, "id" | "createdAt">) => {
    if (!currentUser) return;
    const reminderId = `rem_${Date.now()}`;
    const newReminder: Reminder = {
      ...reminderData,
      id: reminderId,
      createdAt: new Date().toISOString(),
      sentBy: {
        userId: currentUser.id,
        userName: currentUser.name
      },
      schoolId: activeSchoolId || "school_demo"
    } as any;

    try {
      await setDoc(doc(db, "reminders", reminderId), newReminder);
      
      // Log notification in audit trail database
      await handleAudit("ADD_REMINDER", reminderData.studentId, reminderData.studentName, {
        medium: reminderData.medium,
        amountDue: reminderData.amountDue,
        info: `Notification manuelle envoyée par ${currentUser.name} (${reminderData.medium}).`
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reminders/${reminderId}`);
    }
  };

  const updateSchoolConfig = async (newConfig: Partial<SchoolConfig>) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Mise à jour de la configuration de l'établissement");
    if (!currentUser) return;
    const targetSchoolId = activeSchoolId || "school_demo";
    const configRef = doc(db, "school_config", targetSchoolId);
    try {
      const mergedConfig = {
        id: targetSchoolId,
        name: newConfig.name !== undefined ? newConfig.name : (schoolConfig?.name || "LinguaInscript"),
        slogan: newConfig.slogan !== undefined ? newConfig.slogan : (schoolConfig?.slogan || "L'excellence linguistique à portée de main"),
        logoUrl: newConfig.logoUrl !== undefined ? newConfig.logoUrl : (schoolConfig?.logoUrl || ""),
        themeColor: newConfig.themeColor !== undefined ? newConfig.themeColor : (schoolConfig?.themeColor || "blue"),
        interfaceLanguage: newConfig.interfaceLanguage !== undefined ? newConfig.interfaceLanguage : (schoolConfig?.interfaceLanguage || "fr"),
        certificateTitle: newConfig.certificateTitle !== undefined ? newConfig.certificateTitle : (schoolConfig?.certificateTitle || "ATTESTATION DE RÉUSSITE"),
        certificateBody: newConfig.certificateBody !== undefined ? newConfig.certificateBody : (schoolConfig?.certificateBody || "Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} a suivi avec succès tous ses cours de perfectionnement linguistique au sein de notre établissement."),
        certificateSignatory: newConfig.certificateSignatory !== undefined ? newConfig.certificateSignatory : (schoolConfig?.certificateSignatory || "La Direction Académique"),
        smsEnabled: newConfig.smsEnabled !== undefined ? newConfig.smsEnabled : (schoolConfig?.smsEnabled ?? false),
        smsGateway: newConfig.smsGateway !== undefined ? newConfig.smsGateway : (schoolConfig?.smsGateway || "default"),
        smsTemplate: newConfig.smsTemplate !== undefined ? newConfig.smsTemplate : (schoolConfig?.smsTemplate || "Rappel Lingua: Le solde de scolarité de {etudiant_nom} (tuteur: {parent_nom}) d'un montant de {montant} FCFA est attendu avant le {date_limite} pour éviter toute interruption. Merci."),
        smsDaysBefore: newConfig.smsDaysBefore !== undefined ? newConfig.smsDaysBefore : (schoolConfig?.smsDaysBefore ?? 5),
        customLanguages: newConfig.customLanguages !== undefined ? newConfig.customLanguages : (schoolConfig?.customLanguages || []),
        updatedAt: new Date().toISOString(),
        updatedBy: {
          userId: currentUser.id,
          userName: currentUser.name
        }
      };
      // For local session, update state directly since Firestore setDoc is simulated/bypassed
      if (isLocalSession) {
        setSchoolConfig(prev => prev ? { ...prev, ...mergedConfig } : (mergedConfig as any));
      }
      await setDoc(configRef, mergedConfig, { merge: true });
      await handleAudit("UPDATE_STUDENT", targetSchoolId, mergedConfig.name, {
        info: "Personnalisation du profil de l'école (Paramètres SMS inclus)"
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `school_config/${targetSchoolId}`);
    }
  };

  const runAutomaticSMSSweep = async () => {
    const currentConfig = schoolConfig;
    const isEnabled = currentConfig?.smsEnabled ?? false;
    const template = currentConfig?.smsTemplate || "Rappel Lingua: Le solde de scolarité de {etudiant_nom} (tuteur: {parent_nom}) d'un montant de {montant} FCFA est attendu avant le {date_limite} pour éviter toute interruption. Merci.";
    const daysBefore = currentConfig?.smsDaysBefore ?? 5;
    const gateway = currentConfig?.smsGateway || "default";

    const logs: string[] = [];
    let triggeredCount = 0;

    const currentSchoolId = activeSchoolId || "school_demo";

    logs.push(`[Service SMS] Démarrage du scan de facturation réseau pour : ${currentConfig?.name || "Lingua Douala"}.`);
    logs.push(`[Service SMS] Statut automatique global : ${isEnabled ? "ACTIVÉ ✅" : "DÉSACTIVÉ ⚠️ (Mode Simulation forcée pour ce scan)"}.`);
    logs.push(`[Service SMS] Passerelle configurée : ${gateway.toUpperCase()} | Déclencheur : J-${daysBefore} jours.`);

    const today = new Date();
    today.setHours(0,0,0,0);

    const checkDateMax = new Date(today);
    checkDateMax.setDate(today.getDate() + daysBefore);

    const checkDateMin = new Date(today);
    checkDateMin.setDate(today.getDate() - 30); // limit lookback window

    for (const stud of students) {
      // Must be active and have debt
      if (stud.status !== "actif" || stud.balance <= 0) continue;

      const expDate = new Date(stud.expirationDate);
      if (expDate >= checkDateMin && expDate <= checkDateMax) {
        // Prevent daily spamming
        const todayStr = new Date().toISOString().split("T")[0];
        const alreadySentToday = rawReminders.some(rem => {
          if (rem.studentId !== stud.id || rem.medium !== "sms" || rem.status !== "sent") return false;
          const remDateStr = rem.sentAt || rem.createdAt;
          if (!remDateStr) return false;
          return remDateStr.split("T")[0] === todayStr;
        });

        if (alreadySentToday) {
          logs.push(`[-] SMS déjà transmis aujourd'hui pour l'élève ${stud.firstName} ${stud.lastName}.`);
          continue;
        }

        triggeredCount++;
        const formattedExp = new Date(stud.expirationDate).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        const bodyText = template
          .replace(/{etudiant_nom}/g, `${stud.firstName} ${stud.lastName}`)
          .replace(/{parent_nom}/g, stud.parentName)
          .replace(/{montant}/g, stud.balance.toLocaleString())
          .replace(/{date_limite}/g, formattedExp)
          .replace(/{ecole}/g, currentConfig?.name || "Lingua School");

        const reminderId = `rem_${Date.now()}_auto_${triggeredCount}`;
        const newReminder: Reminder = {
          id: reminderId,
          studentId: stud.id,
          studentName: `${stud.firstName} ${stud.lastName}`,
          studentEmail: stud.email || "",
          type: "upcoming_deadline",
          status: "sent",
          medium: "sms",
          amountDue: stud.balance,
          dueDate: stud.expirationDate,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          notes: `[Génération Automatique SMS] Message transmis au tuteur ${stud.parentName} (${stud.parentPhone}) via la passerelle ${gateway}. Contenu: "${bodyText}"`,
          schoolId: currentSchoolId
        } as any;

        try {
          await setDoc(doc(db, "reminders", reminderId), newReminder);
          logs.push(`[+] SMS expédié à ${stud.parentPhone} pour ${stud.firstName} ${stud.lastName} : "${bodyText.substring(0, 50)}..."`);
          
          await handleAudit("ADD_REMINDER", stud.id, `${stud.firstName} ${stud.lastName}`, {
            info: `Relance SMS automatique programmée J-${daysBefore} de l'échéance. Solde restant: ${stud.balance.toLocaleString()} FCFA.`
          });
        } catch (err) {
          logs.push(`[x] Échec d'envoi du SMS pour ${stud.firstName} ${stud.lastName} : ${err}`);
        }
      }
    }

    if (triggeredCount === 0) {
      logs.push(`[Service SMS] Scan terminé. Aucun élève débiteur n'est entré dans le créneau d'alerte J-${daysBefore} jours sans relance aujourd'hui.`);
    } else {
      logs.push(`[Service SMS] Scan terminé. ${triggeredCount} SMS automatique(s) traité(s) !`);
    }

    return { triggeredCount, logs };
  };

  // --- Notifications Système & Renouvellements ---
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);

  // écoute en temps réel des notifications système
  useEffect(() => {
    if (!firebaseUser) {
      setSystemNotifications([]);
      return;
    }

    const unsubSystemNotifications = onSnapshot(collection(db, "system_notifications"), (snapshot) => {
      const items = snapshot.docs.map(d => mapDoc<SystemNotification>(d));
      
      // Trier par date décroissante
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setSystemNotifications(items);
    }, (err) => {
      console.warn("Error loading system notifications: ", err);
    });

    return () => unsubSystemNotifications();
  }, [firebaseUser]);

  // Avertissement d'expiration J-7 automatique
  useEffect(() => {
    if (!currentUser || currentUser.role === UserRole.SUPERADMIN || !currentSchool) return;

    const checkSubscriptionExpiry = async () => {
      const expiryDate = new Date(currentSchool.subExpiresAt);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Si l'abonnement expire dans 7 jours ou moins
      if (diffDays >= -30 && diffDays <= 7) {
        const todayStr = now.toDateString();
        const alreadyNotifiedToday = systemNotifications.some(
          n => n.type === "subscription_warning" &&
          n.schoolId === currentSchool.id &&
          new Date(n.createdAt).toDateString() === todayStr
        );

        if (!alreadyNotifiedToday) {
          console.log(`Auto-triggering subscription warning reminder for ${currentSchool.name} (expiring in ${diffDays} days).`);
          await createSystemNotification({
            type: "subscription_warning",
            title: "Alerte d'échéance d'abonnement",
            message: diffDays < 0 
              ? `Votre abonnement a expiré le ${expiryDate.toLocaleDateString("fr-FR")}. Veuillez demander un renouvellement au Super Administrateur.`
              : `Votre abonnement expire le ${expiryDate.toLocaleDateString("fr-FR")} (dans ${diffDays} jour(s)). Veuillez demander un renouvellement au Super Administrateur.`,
            schoolId: currentSchool.id,
            schoolName: currentSchool.name
          });
        }
      }
    };

    const timer = setTimeout(() => {
      checkSubscriptionExpiry();
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentUser, currentSchool, systemNotifications.length]);

  const createSystemNotification = async (notifData: Omit<SystemNotification, "id" | "createdAt" | "read">) => {
    const id = `notif_${Date.now()}`;
    const newNotif: SystemNotification = {
      ...notifData,
      id,
      createdAt: new Date().toISOString(),
      read: false
    };

    if (isLocalSession) {
      setSystemNotifications(prev => [newNotif, ...prev]);
      return;
    }

    try {
      await setDoc(doc(db, "system_notifications", id), newNotif);
    } catch (err) {
      console.error("Failed to create system notification: ", err);
      handleFirestoreError(err, OperationType.WRITE, `system_notifications/${id}`);
    }
  };

  const updateSystemNotification = async (id: string, updates: Partial<SystemNotification>) => {
    if (isLocalSession) {
      setSystemNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
      return;
    }

    try {
      await updateDoc(doc(db, "system_notifications", id), updates);
    } catch (err) {
      console.error("Failed to update system notification: ", err);
      handleFirestoreError(err, OperationType.WRITE, `system_notifications/${id}`);
    }
  };

  const requestSchoolRenewal = async (pack: "basique" | "premium" | "integral", months: number) => {
    checkRoleAccess([UserRole.DIRECTRICE], "Demande de renouvellement d'abonnement");
    if (!currentSchool) return;

    await createSystemNotification({
      type: "renewal_request",
      title: `Demande de renouvellement - ${currentSchool.name}`,
      message: `La directrice demande un renouvellement vers le forfait ${pack.toUpperCase()} pour une durée de ${months} mois.`,
      schoolId: currentSchool.id,
      schoolName: currentSchool.name,
      status: "pending",
      packRequested: pack,
      monthsRequested: months
    });
  };

  const approveSchoolRenewal = async (notificationId: string) => {
    checkRoleAccess([UserRole.SUPERADMIN], "Approbation de renouvellement d'abonnement");
    
    const notif = systemNotifications.find(n => n.id === notificationId);
    if (!notif || notif.type !== "renewal_request" || !notif.schoolId) return;

    const pack = notif.packRequested || "basique";
    const months = notif.monthsRequested || 1;
    
    await renewSchoolSubscription(notif.schoolId, pack, months);
    
    await updateSystemNotification(notificationId, {
      status: "approved",
      read: true,
      message: `${notif.message} (Approuvé par le SuperAdmin le ${new Date().toLocaleDateString("fr-FR")})`
    });
  };

  const availableUsers = useMemo(() => {
    const currentSchoolId = activeSchoolId || "school_demo";
    return allUsers.filter(
      u => (u.schoolId === currentSchoolId || (u as any).schoolId === currentSchoolId) &&
           (u.role === UserRole.DIRECTRICE || u.role === UserRole.SECRETAIRE)
    );
  }, [allUsers, activeSchoolId]);

  return (
    <DataContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isLocalSession,
        loginWithGoogle,
        loginWithPassword,
        loginAsDemoUser,
        logout,
        availableUsers,
        allUsers,
        switchUser,
        campuses,
        teachers,
        classes,
        students,
        payments,
        auditLogs,
        waitlist,
        schools,
        activeSchoolId,
        setActiveSchoolId,
        currentSchool,
        registerSchool,
        renewSchoolSubscription,
        addStaffUser,
        deleteStaffUser,
        plansConfig,
        updatePlanConfig,
        currentPlan,
        addStudent,
        updateStudent,
        deleteStudent,
        addPayment,
        renewStudent,
        addCampus,
        updateCampus,
        addTeacher,
        addClass,
        updateClass,
        promoteFromWaitlist,
        removeFromWaitlist,
        resetDatabase,
        schoolConfig,
        updateSchoolConfig,
        uniqueLanguages,
        reminders,
        addReminder,
        runAutomaticSMSSweep,
        checkRoleAccess,
        
        systemNotifications,
        createSystemNotification,
        updateSystemNotification,
        requestSchoolRenewal,
        approveSchoolRenewal,
        
        // Raw collections
        rawStudents,
        rawCampuses,
        rawTeachers,
        rawClasses,
        rawPayments,
        rawAuditLogs,
        rawWaitlist,
        rawReminders
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
