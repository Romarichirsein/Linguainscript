import React, { createContext, useContext, useState, useEffect } from "react";
import { Campus, Teacher, Class, Student, Payment, AuditLog, WaitlistEntry, UserProfile, UserRole, SchoolConfig, Reminder, School } from "../types";
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
  increment
} from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";

type OmitStudentFields = Omit< Student, "id" | "status" | "createdBy" | "createdAt" | "updatedAt" | "paidAmount" | "balance" >;
type StudentUpdate = Partial< Student >;
type OmitClassFields = Omit< Class, "id" | "currentCount" | "isActive" >;
type ClassUpdate = Partial< Class >;

interface DataContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
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

  // Data actions
  addStudent: (
    studentData: OmitStudentFields,
    paymentAmount: number,
    paymentMode: "Espèces" | "Mobile Money" | "Virement" | null,
    paymentNote?: string,
    addToWaitlistIfFull?: boolean
  ) => Promise<{ success: boolean; studentId?: string; waitlistId?: string; message: string }>;

  updateStudent: (id: string, updated: StudentUpdate) => Promise<void>;
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  // 1. Connection test & Auth subscriber
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userRef = doc(db, "users", user.uid);
        try {
          const snapshot = await getDoc(userRef);
          const isSuperAdminEmail = user.email === "romarichirsein@gmail.com";

          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            
            // Re-verify if directrice email matches standard schools list in case superadmin moved credentials
            const schoolsSnap = await getDocs(collection(db, "schools"));
            const schoolsList = schoolsSnap.docs.map(doc => doc.data() as School);
            const matchingSchool = schoolsList.find(s => s.directriceEmail?.toLowerCase() === user.email?.toLowerCase());

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
            } else {
              setCurrentUser(data);
            }
          } else {
            // Check if there is an existing manual placeholder profile created by superadmin with this email
            const qUsers = query(collection(db, "users"), where("email", "==", user.email || ""));
            const usersSnap = await getDocs(qUsers);
            const usersList = usersSnap.docs.map(d => d.data() as UserProfile);
            const matchingProfile = usersList.find(u => u.email?.toLowerCase() === user.email?.toLowerCase() && u.id !== user.uid);

            if (matchingProfile) {
              // Copy manual profile settings to this actual uid
              const newProfile: UserProfile = {
                ...matchingProfile,
                id: user.uid,
                name: user.displayName || matchingProfile.name
              };
              await setDoc(userRef, newProfile);
              
              // Remove the manual placeholder profile doc
              if (matchingProfile.id.startsWith("profile_")) {
                await deleteDoc(doc(db, "users", matchingProfile.id));
              }
              
              setCurrentUser(newProfile);
            } else {
              // Else check if they are flagged as directrice on any school
              const schoolsSnap = await getDocs(collection(db, "schools"));
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
                await setDoc(userRef, newProfile);
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
                await setDoc(userRef, newProfile);
                setCurrentUser(newProfile);
              }
            }
          }
        } catch (err) {
          console.error("Error subscribing to user profile:", err);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

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

  // Sync schools list
  useEffect(() => {
    if (!firebaseUser) {
      setSchools([]);
      setAllUsers([]);
      return;
    }

    const unsubSchools = onSnapshot(collection(db, "schools"), async (snapshot) => {
      const items = snapshot.docs.map(d => mapDoc<School>(d));
      setSchools(items);

      if (items.length === 0) {
        const defaultSchools: School[] = [
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
        const batch = writeBatch(db);
        defaultSchools.forEach(sch => {
          batch.set(doc(db, "schools", sch.id), sch);
        });
        await batch.commit();
      }
    }, (err) => {
      console.error("Error loading schools list:", err);
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
  }, [firebaseUser]);

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

    const unsubCampuses = onSnapshot(collection(db, "campuses"), async (snapshot) => {
      const items = snapshot.docs.map(d => mapDoc<Campus>(d));
      setRawCampuses(items);
      
      // Seed if empty
      if (items.length === 0) {
        console.log("Database is empty. Seeding mock standard data...");
        await doDatabaseSeed();
      }
    }, (err) => {
      console.error("Error loading campuses: ", err);
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
          updatedBy: data.updatedBy
        });
      } else {
        setSchoolConfig({
          id: activeSchoolId || "school_demo",
          name: activeSchoolId === "school_basique" ? "Centre Moyen de l'Adamaoua" : activeSchoolId === "school_premium" ? "African English Academy" : activeSchoolId === "school_integral" ? "Polyglot Hub Yaoundé" : "LinguaInscript Douala",
          slogan: "L'excellence linguistique à portée de main",
          logoUrl: "",
          themeColor: activeSchoolId === "school_basique" ? "emerald" : activeSchoolId === "school_premium" ? "rose" : "blue",
          interfaceLanguage: "fr",
          certificateTitle: "ATTESTATION DE RÉUSSITE",
          certificateBody: "Nous soussignés, {ecole_nom}, certifions par la présente que l'élève {nom_etudiant} a suivi avec succès tous ses cours de perfectionnement linguistique au sein de notre établissement.",
          certificateSignatory: "La Direction Académique",
          smsEnabled: false,
          smsGateway: "default",
          smsTemplate: "Rappel Lingua: Le solde de scolarité de {etudiant_nom} (tuteur: {parent_nom}) d'un montant de {montant} FCFA est attendu avant le {date_limite} pour éviter toute interruption. Merci.",
          smsDaysBefore: 5
        });
      }
    }, (err) => {
      console.warn("School configuration document error: ", err);
    });

    return () => {
      unsubCampuses();
      unsubTeachers();
      unsubClasses();
      unsubStudents();
      unsubPayments();
      unsubAuditLogs();
      unsubWaitlist();
      unsubReminders();
      unsubSchoolConfig();
    };
  }, [firebaseUser, activeSchoolId]);

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
    }
  };

  const deleteStaffUser = async (userId: string) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Révocation d'un accès utilisateur");
    try {
      await deleteDoc(doc(db, "users", userId));
      console.log("Deleted school staff member successfully:", userId);
    } catch (error) {
      console.error("Failed to delete staff member:", error);
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
    const cleanEmail = email.trim().toLowerCase();

    // Check if hardcoded demo users
    let demoProfile: UserProfile | null = null;
    let demoUid = "";
    let demoDisplayName = "";

    if (cleanEmail === "romarichirsein@gmail.com" && password === "admin123") {
      demoUid = "superadmin_romaric";
      demoDisplayName = "Romaric Hirsein (Super Admin)";
      demoProfile = {
        id: demoUid,
        name: demoDisplayName,
        email: cleanEmail,
        role: UserRole.SUPERADMIN,
        campusId: null,
        schoolId: null,
        password: "admin123"
      };
    } else if (cleanEmail === "directrice.integral@gmail.com" && password === "lingua123") {
      demoUid = "directrice_integral";
      demoDisplayName = "Thérèse Ngono (Directrice)";
      demoProfile = {
        id: demoUid,
        name: demoDisplayName,
        email: cleanEmail,
        role: UserRole.DIRECTRICE,
        campusId: null,
        schoolId: "school_integral",
        password: "lingua123"
      };
    } else if (cleanEmail === "secretaire.demo@gmail.com" && password === "lingua123") {
      demoUid = "secretaire_demo";
      demoDisplayName = "Sarah Kiman (Secrétaire)";
      demoProfile = {
        id: demoUid,
        name: demoDisplayName,
        email: cleanEmail,
        role: UserRole.SECRETAIRE,
        campusId: "campus_01",
        schoolId: "school_demo",
        password: "lingua123"
      };
    }

    if (demoProfile) {
      const mockFUser = {
        uid: demoUid,
        email: cleanEmail,
        displayName: demoDisplayName,
        emailVerified: true,
        isAnonymous: false,
        providerData: []
      } as any;

      try {
        await setDoc(doc(db, "users", demoUid), demoProfile, { merge: true });
      } catch (err) {
        console.error("Failed writing demo session profile to Firestore:", err);
      } finally {
        setFirebaseUser(mockFUser);
        setCurrentUser(demoProfile);
        setLoading(false);
      }
      return;
    }

    // Otherwise, search for a matching user in Firestore
    try {
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error("Aucun compte trouvé avec cette adresse email.");
      }

      // Find first matching user profile doc
      const userDoc = snap.docs[0];
      const userData = userDoc.data() as UserProfile;
      const storedPassword = userData.password || "lingua123";

      if (password !== storedPassword) {
        throw new Error("Mot de passe incorrect.");
      }

      const mockUid = userDoc.id;
      const mockFUser = {
        uid: mockUid,
        email: cleanEmail,
        displayName: userData.name,
        emailVerified: true,
        isAnonymous: false,
        providerData: []
      } as any;

      setFirebaseUser(mockFUser);
      setCurrentUser(userData);

    } catch (err: any) {
      console.error("Email/Password authentication failed: ", err);
      throw new Error(err.message || "Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = async (email: string, name: string, role: UserRole, schoolId: string | null) => {
    setLoading(true);
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

    try {
      await setDoc(doc(db, "users", mockUid), profile);
    } catch (err) {
      console.error("Failed to write mock account profile:", err);
    } finally {
      setFirebaseUser(mockFUser);
      setCurrentUser(profile);
      setLoading(false);
    }
  };

  const logout = async () => {
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

    // Check school's subscription plan rules
    const isBasique = currentSchool?.subType === "basique";
    if (isBasique && students.length >= 50) {
      return {
        success: false,
        message: "⚠️ Limite atteinte : Votre école utilise le pack Basique (5 000 FCFA/mois) qui limite le nombre total d'élèves à 50. Veuillez passer au pack Premium ou Intégral pour s'inscrire au-delà."
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

      try {
        await setDoc(doc(db, "waitlist", waitlistId), newWaitlistEntry);
        await handleAudit("ADD_WAITLIST", newWaitlistEntry.studentId, newWaitlistEntry.studentName, {
          class: `${selectedClass.language} ${selectedClass.level} - ${selectedClass.period}`,
          position
        });
        return {
          success: true,
          waitlistId,
          message: `Élève ajouté avec succès en liste d'attente (Position ${position}).`
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `waitlist/${waitlistId}`);
        return { success: false, message: "Erreur lors de l'ajout en liste d'attente" };
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
        message: "Élève inscrit avec succès !"
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `students/${studentId}`);
      return { success: false, message: "Erreur lors de l'inscription de l'élève" };
    }
  };

  const updateStudent = async (id: string, updated: StudentUpdate) => {
    if (!currentUser) return;
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

  const addPayment = async (studentId: string, amount: number, mode: "Espèces" | "Mobile Money" | "Virement", note?: string) => {
    if (!currentUser) return;
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
    try {
      await setDoc(doc(db, "campuses", id), newCampus);
      await handleAudit("UPDATE_STUDENT", id, name, { action: "Ajout Campus", address });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `campuses/${id}`);
    }
  };

  const updateCampus = async (id: string, name: string, address: string, isActive: boolean) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE], "Modification d'un campus");
    try {
      await updateDoc(doc(db, "campuses", id), { name, address, isActive });
      await handleAudit("UPDATE_STUDENT", id, name, { action: "Modification Campus", address, isActive });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `campuses/${id}`);
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
    try {
      await setDoc(doc(db, "teachers", id), newTeacher);
      await handleAudit("UPDATE_STUDENT", id, name, { action: "Ajout Professeur", languages });
    } catch (err) {
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
    try {
      await setDoc(doc(db, "classes", id), newClass);
      await handleAudit("UPDATE_STUDENT", id, `${classData.language} ${classData.level}`, { action: "Ajout Classe", period: classData.period });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `classes/${id}`);
    }
  };

  const updateClass = async (id: string, updated: ClassUpdate) => {
    checkRoleAccess([UserRole.SUPERADMIN, UserRole.DIRECTRICE, UserRole.SECRETAIRE], "Modification d'une classe");
    try {
      await updateDoc(doc(db, "classes", id), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `classes/${id}`);
    }
  };

  const promoteFromWaitlist = async (waitlistId: string, paymentAmount: number, mode: "Espèces" | "Mobile Money" | "Virement") => {
    if (!currentUser) return { success: false, message: "Non authentifié" };
    
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
        updatedAt: new Date().toISOString(),
        updatedBy: {
          userId: currentUser.id,
          userName: currentUser.name
        }
      };
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

  return (
    <DataContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        loginWithGoogle,
        loginWithPassword,
        loginAsDemoUser,
        logout,
        availableUsers: mockUsers,
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
        addStudent,
        updateStudent,
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
        reminders,
        addReminder,
        runAutomaticSMSSweep,
        checkRoleAccess,
        
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
