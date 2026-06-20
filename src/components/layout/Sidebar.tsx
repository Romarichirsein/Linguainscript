import React from "react";
import { useData } from "../../context/DataContext";
import { UserRole } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Hourglass,
  TrendingUp,
  History,
  AlertTriangle,
  Settings,
  X,
  PlusCircle,
  GraduationCap
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  setIsOpen
}) => {
  const { currentUser, logout, schoolConfig } = useData();
  const { t } = useTranslation();
  const isDirectrice = currentUser?.role === UserRole.DIRECTRICE;
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;
  const canSeeAdminMenu = isDirectrice; // SuperAdmin does NOT manage students

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    setIsOpen(false);
  };

  const themeColorMap = {
    blue: "bg-blue-600 shadow-blue-500/20",
    emerald: "bg-emerald-600 shadow-emerald-500/20",
    rose: "bg-rose-600 shadow-rose-500/20",
    amber: "bg-amber-600 shadow-amber-500/20",
    slate: "bg-slate-700 shadow-slate-600/20"
  };

  const schoolName = schoolConfig?.name || "LinguaInscript";
  const schoolSlogan = schoolConfig?.slogan || "Languages Hub";
  const schoolColorClass = themeColorMap[schoolConfig?.themeColor || "blue"];
  // Get first 2 letters for logo fallback
  const schoolInitials = schoolName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const menuItems = [
    { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { id: "newStudent", label: t("newStudent"), icon: UserPlus },
    { id: "students", label: t("students"), icon: Users },
    { id: "waitlist", label: t("waitlist"), icon: Hourglass }
  ];

  // Admin exclusive tabs
  const adminMenuItems = [
    { id: "reports", label: t("reports"), icon: TrendingUp },
    { id: "renewals", label: t("renewals"), icon: AlertTriangle },
    { id: "classes", label: t("classes"), icon: GraduationCap },
    { id: "settings", label: t("settings"), icon: Settings },
    { id: "audit", label: t("audit"), icon: History }
  ];

  return (
    <>
      {/* Mobile drawer backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-300 transform lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {schoolConfig?.logoUrl ? (
              <img
                src={schoolConfig.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="h-8 w-8 object-cover rounded shadow-md border border-slate-700"
              />
            ) : (
              <img
                src="/logo.png"
                alt="Logo"
                className="h-8 w-8 object-cover rounded shadow-md border border-slate-700 bg-white"
              />
            )}
            <div>
              <h1 className="font-sans font-bold text-[14px] leading-tight text-white tracking-tight truncate max-w-[140px]">
                {schoolName}
              </h1>
              <p className="font-mono text-[8px] text-slate-500 tracking-wider uppercase truncate max-w-[140px]">
                {schoolSlogan}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">

          {isSuperAdmin && (
            <div>
              <p className="px-2 font-sans text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">
                {t("superAdminSaaS")}
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => handleTabClick("saas")}
                  className={`flex w-full items-center gap-3 rounded px-3 py-1.5 font-sans text-[13px] font-semibold transition-all ${
                    currentTab === "saas"
                      ? "bg-indigo-600/30 text-white border-l-2 border-indigo-500 rounded-r"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-indigo-400" />
                  <span>Gestion SaaS Global</span>
                </button>
              </nav>
            </div>
          )}

          {!isSuperAdmin && (
            <div>
              <p className="px-2 font-sans text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">
                {t("mainMenu")}
              </p>
              <nav className="space-y-1">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`flex w-full items-center gap-3 rounded px-3 py-1.5 font-sans text-[13px] font-semibold transition-all ${
                        isActive
                          ? "bg-blue-600/20 text-white border-l-2 border-blue-500 rounded-r"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-450" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {canSeeAdminMenu && (
            <div>
              <p className="px-2 font-sans text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">
                {t("administration")}
              </p>
              <nav className="space-y-1">
                {adminMenuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`flex w-full items-center gap-3 rounded px-3 py-1.5 font-sans text-[13px] font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600/20 text-white border-l-2 border-blue-500 rounded-r"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-450" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* User Session profile Box */}
        {currentUser && (
          <div className="border-t border-slate-800 p-4 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-bold text-xs text-slate-200">
                {currentUser.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {currentUser.name}
                </p>
                <p className="truncate text-[10px] text-slate-400 capitalize">
                  {currentUser.role === UserRole.SUPERADMIN 
                    ? t("roleSuperadmin") 
                    : currentUser.role === UserRole.DIRECTRICE 
                      ? t("roleDirectrice") 
                      : t("roleSecretaire")}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-semibold">
              <span>{t("roleLabel")}{currentUser.role}</span>
              {currentUser.campusId && (
                <span className="text-blue-400">
                  {currentUser.campusId === "campus_01" ? "Centre-Ville" : "Campus Nord"}
                </span>
              )}
            </div>
            <button
              onClick={logout}
              className="mt-2.5 w-full rounded border border-slate-800 hover:bg-red-500/10 hover:border-red-500/20 py-1 text-center text-[11px] font-bold text-red-400 cursor-pointer transition-colors"
            >
              {t("disconnect")}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
