import { Campus, Teacher, Class, Student, Payment, AuditLog, WaitlistEntry, UserProfile, UserRole } from "../types";

export const mockUsers: UserProfile[] = [
  {
    id: "user_dir_01",
    name: "Catherine Royer",
    email: "directrice@lingua.com",
    role: UserRole.DIRECTRICE,
    campusId: null
  },
  {
    id: "user_sec_01",
    name: "Sarah Kiman",
    email: "sarah.centre@lingua.com",
    role: UserRole.SECRETAIRE,
    campusId: "campus_01" // Centre-ville
  },
  {
    id: "user_sec_02",
    name: "Marie Diallo",
    email: "marie.nord@lingua.com",
    role: UserRole.SECRETAIRE,
    campusId: "campus_02" // Campus Nord
  }
];

export const mockCampuses: Campus[] = [
  {
    id: "campus_01",
    name: "Campus Centre-Ville",
    address: "12 Avenue de l'Indépendance, Douala",
    isActive: true,
    createdAt: "2025-01-10T08:00:00Z"
  },
  {
    id: "campus_02",
    name: "Campus Nord",
    address: "Boulevard National, Akwa",
    isActive: true,
    createdAt: "2025-01-15T09:30:00Z"
  }
];

export const mockTeachers: Teacher[] = [
  {
    id: "teacher_01",
    name: "Prof. Hans Schmidt",
    phone: "+237 699 887 766",
    email: "h.schmidt@lingua.com",
    languages: ["Allemand", "Français"],
    campusId: "campus_01",
    isActive: true
  },
  {
    id: "teacher_02",
    name: "Mme Clara Rossi",
    phone: "+237 677 554 433",
    email: "c.rossi@lingua.com",
    languages: ["Italien", "Anglais"],
    campusId: "campus_01",
    isActive: true
  },
  {
    id: "teacher_03",
    name: "Sr. Carlos Ortega",
    phone: "+237 695 221 100",
    email: "c.ortega@lingua.com",
    languages: ["Espagnol", "Portugais"],
    campusId: "campus_02",
    isActive: true
  },
  {
    id: "teacher_04",
    name: "Mme Amélie Dubois",
    phone: "+237 622 334 455",
    email: "a.dubois@lingua.com",
    languages: ["Français", "Anglais"],
    campusId: "campus_02",
    isActive: true
  }
];

export const mockClasses: Class[] = [
  {
    id: "class_01",
    language: "Allemand",
    level: "A2",
    period: "12h",
    teacherId: "teacher_01",
    campusId: "campus_01",
    maxStudents: 20,
    currentCount: 19,
    startDate: "2026-06-01",
    endDate: "2027-06-01",
    isActive: true
  },
  {
    id: "class_02",
    language: "Italien",
    level: "B1",
    period: "15h",
    teacherId: "teacher_02",
    campusId: "campus_01",
    maxStudents: 15,
    currentCount: 12,
    startDate: "2026-05-15",
    endDate: "2027-05-15",
    isActive: true
  },
  {
    id: "class_03",
    language: "Espagnol",
    level: "A1",
    period: "17h",
    teacherId: "teacher_03",
    campusId: "campus_02",
    maxStudents: 20,
    currentCount: 20, // Class is full!
    startDate: "2026-06-10",
    endDate: "2027-06-10",
    isActive: true
  },
  {
    id: "class_04",
    language: "Allemand",
    level: "B2",
    period: "8h",
    teacherId: "teacher_01",
    campusId: "campus_02",
    maxStudents: 15,
    currentCount: 8,
    startDate: "2026-04-10",
    endDate: "2027-04-10",
    isActive: true
  },
  {
    id: "class_05",
    language: "Portugais",
    level: "C1",
    period: "12h",
    teacherId: "teacher_03",
    campusId: "campus_02",
    maxStudents: 10,
    currentCount: 4,
    startDate: "2026-06-05",
    endDate: "2027-06-05",
    isActive: true
  }
];

export const mockStudents: Student[] = [
  {
    id: "stud_01",
    firstName: "Jean",
    lastName: "Dupont",
    birthDate: "2002-04-12",
    phone: "+237 699 112 233",
    email: "jean.dupont@gmail.com",
    parentName: "Pierre Dupont",
    parentPhone: "+237 677 223 344",
    campusId: "campus_01",
    classId: "class_01", // Allemand A2, campus 1
    status: "actif",
    enrollmentDate: "2026-06-01",
    expirationDate: "2027-06-01",
    totalAmount: 180000,
    paidAmount: 180000, // Fully paid
    balance: 0,
    createdBy: { userId: "user_sec_01", userName: "Sarah Kiman" },
    createdAt: "2026-06-01T10:15:00Z",
    updatedAt: "2026-06-01T10:20:00Z"
  },
  {
    id: "stud_02",
    firstName: "Amina",
    lastName: "Bello",
    birthDate: "2004-11-20",
    phone: "+237 691 445 566",
    email: "amina.bello@yahoo.fr",
    parentName: "Ibrahim Bello",
    parentPhone: "+237 655 443 322",
    campusId: "campus_01",
    classId: "class_01", // Allemand A2, campus 1
    status: "actif",
    enrollmentDate: "2026-06-02",
    expirationDate: "2027-06-02",
    totalAmount: 180000,
    paidAmount: 80000, // Partial payment (unjust expulsion prevention candidate)
    balance: 100000,
    createdBy: { userId: "user_sec_01", userName: "Sarah Kiman" },
    createdAt: "2026-06-02T11:40:00Z",
    updatedAt: "2026-06-02T11:40:00Z"
  },
  {
    id: "stud_03",
    firstName: "Marc",
    lastName: "Kuate",
    birthDate: "2000-08-05",
    phone: "+237 696 778 899",
    email: "marc.kuate@outlook.com",
    parentName: "Sophie Kuate",
    parentPhone: "+237 670 998 877",
    campusId: "campus_02",
    classId: "class_03", // Espagnol A1 (Full)
    status: "actif",
    enrollmentDate: "2026-06-10",
    expirationDate: "2027-06-10",
    totalAmount: 150000,
    paidAmount: 150000,
    balance: 0,
    createdBy: { userId: "user_sec_02", userName: "Marie Diallo" },
    createdAt: "2026-06-10T08:30:00Z",
    updatedAt: "2026-06-10T08:30:00Z"
  },
  {
    id: "stud_04",
    firstName: "Alice",
    lastName: "Menga",
    birthDate: "2003-01-15",
    phone: "+237 694 553 322",
    email: "alice.menga@gmail.com",
    parentName: "Jean Menga",
    parentPhone: "+237 671 112 233",
    campusId: "campus_02",
    classId: "class_04", // Allemand B2
    status: "actif",
    enrollmentDate: "2026-05-15",
    expirationDate: "2026-06-20", // Expiring within 10 days! Let's trigger renewal alert!
    totalAmount: 200000,
    paidAmount: 120000,
    balance: 80000,
    createdBy: { userId: "user_sec_02", userName: "Marie Diallo" },
    createdAt: "2026-05-15T14:10:00Z",
    updatedAt: "2026-05-15T14:12:00Z"
  },
  {
    id: "stud_05",
    firstName: "Paul",
    lastName: "Ewane",
    birthDate: "1998-09-30",
    phone: "+237 622 113 355",
    email: "paul.ewane@live.com",
    parentName: "Therese Ewane",
    parentPhone: "+237 651 887 766",
    campusId: "campus_01",
    classId: "class_02", // Italien B1
    status: "expiré", // Already expired
    enrollmentDate: "2025-05-01",
    expirationDate: "2026-05-01",
    totalAmount: 180000,
    paidAmount: 180000,
    balance: 0,
    createdBy: { userId: "user_sec_01", userName: "Sarah Kiman" },
    createdAt: "2025-05-01T09:00:00Z",
    updatedAt: "2025-05-01T09:00:00Z"
  }
];

export const mockPayments: Payment[] = [
  {
    id: "pay_01",
    studentId: "stud_01",
    amount: 180000,
    date: "2026-06-01",
    mode: "Espèces",
    recordedBy: { userId: "user_sec_01", userName: "Sarah Kiman" },
    note: "Paiement intégral de l'inscription annuelle"
  },
  {
    id: "pay_02",
    studentId: "stud_02",
    amount: 80000,
    date: "2026-06-02",
    mode: "Mobile Money",
    recordedBy: { userId: "user_sec_01", userName: "Sarah Kiman" },
    note: "Acompte inscription (Tranche 1)"
  },
  {
    id: "pay_03",
    studentId: "stud_03",
    amount: 150000,
    date: "2026-06-10",
    mode: "Virement",
    recordedBy: { userId: "user_sec_02", userName: "Marie Diallo" },
    note: "Frais de formation complets"
  },
  {
    id: "pay_04",
    studentId: "stud_04",
    amount: 120000,
    date: "2026-05-15",
    mode: "Mobile Money",
    recordedBy: { userId: "user_sec_02", userName: "Marie Diallo" },
    note: "Versement initial"
  },
  {
    id: "pay_05",
    studentId: "stud_05",
    amount: 180000,
    date: "2025-05-01",
    mode: "Espèces",
    recordedBy: { userId: "user_sec_01", userName: "Sarah Kiman" },
    note: "Inscription promo 2025"
  }
];

export const mockWaitlist: WaitlistEntry[] = [
  {
    id: "wait_01",
    classId: "class_03", // Espagnol A1 (which is full)
    studentId: "stud_wait_01",
    studentName: "Dorian Talla",
    studentPhone: "+237 691 223 344",
    addedAt: "2026-06-10T09:45:00Z",
    position: 1,
    addedBy: { userId: "user_sec_02", userName: "Marie Diallo" }
  },
  {
    id: "wait_02",
    classId: "class_03",
    studentId: "stud_wait_02",
    studentName: "Gisele Nana",
    studentPhone: "+237 671 998 877",
    addedAt: "2026-06-10T11:15:00Z",
    position: 2,
    addedBy: { userId: "user_sec_02", userName: "Marie Diallo" }
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "log_01",
    action: "CREATE_STUDENT",
    targetId: "stud_01",
    targetName: "Jean Dupont",
    userId: "user_sec_01",
    userName: "Sarah Kiman",
    campusId: "campus_01",
    timestamp: "2026-06-01T10:15:00Z",
    details: { class: "Allemand A2 - 12h" }
  },
  {
    id: "log_02",
    action: "ADD_PAYMENT",
    targetId: "stud_01",
    targetName: "Jean Dupont",
    userId: "user_sec_01",
    userName: "Sarah Kiman",
    campusId: "campus_01",
    timestamp: "2026-06-01T10:20:00Z",
    details: { amount: 180000, mode: "Espèces" }
  },
  {
    id: "log_03",
    action: "CREATE_STUDENT",
    targetId: "stud_02",
    targetName: "Amina Bello",
    userId: "user_sec_01",
    userName: "Sarah Kiman",
    campusId: "campus_01",
    timestamp: "2026-06-02T11:40:00Z",
    details: { class: "Allemand A2 - 12h" }
  },
  {
    id: "log_04",
    action: "ADD_PAYMENT",
    targetId: "stud_02",
    targetName: "Amina Bello",
    userId: "user_sec_01",
    userName: "Sarah Kiman",
    campusId: "campus_01",
    timestamp: "2026-06-02T11:41:00Z",
    details: { amount: 80000, mode: "Mobile Money" }
  },
  {
    id: "log_05",
    action: "CREATE_STUDENT",
    targetId: "stud_03",
    targetName: "Marc Kuate",
    userId: "user_sec_02",
    userName: "Marie Diallo",
    campusId: "campus_02",
    timestamp: "2026-06-10T08:30:00Z",
    details: { class: "Espagnol A1 - 17h" }
  },
  {
    id: "log_06",
    action: "ADD_WAITLIST",
    targetId: "stud_wait_01",
    targetName: "Dorian Talla",
    userId: "user_sec_02",
    userName: "Marie Diallo",
    campusId: "campus_02",
    timestamp: "2026-06-10T09:45:00Z",
    details: { class: "Espagnol A1 - 17h", position: 1 }
  }
];
