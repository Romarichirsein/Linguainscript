export enum UserRole {
  SECRETAIRE = "secretaire",
  DIRECTRICE = "directrice",
  SUPERADMIN = "superadmin",
}

export interface School {
  id: string; // schoolId
  name: string;
  directriceEmail: string;
  directriceName: string;
  subType: "basique" | "premium" | "integral";
  subStatus: "active" | "expired";
  subExpiresAt: string; // ISO String
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  campusId?: string | null; // null if directrice/superadmin
  schoolId?: string | null; // null if superadmin
  password?: string;
}

export interface Campus {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email: string;
  languages: string[];
  campusId: string;
  isActive: boolean;
}

export interface Class {
  id: string;
  language: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  period: "8h" | "12h" | "15h" | "17h";
  teacherId: string;
  campusId: string;
  maxStudents: number;
  currentCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  parentName: string;
  parentPhone: string;
  photo?: string;
  campusId: string;
  classId: string;
  status: "actif" | "en_attente" | "expiré" | "terminé" | "archivé";
  enrollmentDate: string;
  expirationDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  createdBy: {
    userId: string;
    userName: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  mode: "Espèces" | "Mobile Money" | "Virement";
  recordedBy: {
    userId: string;
    userName: string;
  };
  note?: string;
}

export interface AuditLog {
  id: string;
  action: "CREATE_STUDENT" | "ADD_PAYMENT" | "UPDATE_STUDENT" | "CHANGE_CLASS" | "ADD_WAITLIST" | "FROM_WAITLIST" | "RENEWAL" | "ADD_REMINDER";
  targetId: string;
  targetName: string;
  userId: string;
  userName: string;
  campusId: string;
  timestamp: string;
  details?: {
    field?: string;
    before?: string;
    after?: string;
    [key: string]: any;
  };
}

export interface WaitlistEntry {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  addedAt: string;
  position: number;
  addedBy: {
    userId: string;
    userName: string;
  };
}

export interface SchoolConfig {
  id: string;
  name: string;
  slogan: string;
  logoUrl: string;
  themeColor: "blue" | "emerald" | "rose" | "amber" | "slate";
  interfaceLanguage?: "fr" | "en";
  certificateTitle?: string;
  certificateBody?: string;
  certificateSignatory?: string;
  smsEnabled?: boolean;
  smsGateway?: "default" | "bulksms" | "orange" | "africastalking";
  smsTemplate?: string;
  smsDaysBefore?: number;
  updatedAt?: string;
  updatedBy?: {
    userId: string;
    userName: string;
  };
}

export interface Reminder {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  type: "upcoming_deadline" | "overdue_account" | "registration_validated";
  status: "pending" | "sent" | "failed";
  medium: "email" | "sms" | "whatsapp";
  amountDue: number;
  dueDate: string;
  sentAt?: string;
  createdAt: string;
  notes?: string;
  sentBy?: {
    userId: string;
    userName: string;
  };
}

export interface PlanConfig {
  id: "basique" | "premium" | "integral";
  name: string;
  price: number;
  maxStudents: number;
  canCreateStudents: boolean;
  canManageStudents: boolean;
  canGenerateReceipts: boolean;
  canGenerateDocuments: boolean;
  canAdvancedSearch: boolean;
  canViewHistory: boolean;
  canViewReports: boolean;
  canManageWaitlist: boolean;
  canManageRenewals: boolean;
  canManageClasses: boolean;
}

