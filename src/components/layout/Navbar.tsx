import React, { useState, useRef, useEffect } from "react";
import { useData } from "../../context/DataContext";
import { UserRole } from "../../types";
import { Bell, Menu, Shield, RefreshCw, UserCheck, AlertCircle, Search, X, Sun, Moon, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setCurrentTab: (tab: string) => void;
  setSelectedStudentId?: (id: string | null) => void;
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  setCurrentTab,
  setSelectedStudentId,
  focusMode,
  setFocusMode
}) => {
  const { 
    currentUser, 
    availableUsers, 
    switchUser, 
    students, 
    classes, 
    waitlist, 
    resetDatabase,
    systemNotifications,
    updateSystemNotification,
    approveSchoolRenewal,
    isLocalSession
  } = useData();
  const { darkMode, toggleDarkMode } = useTheme();
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Click-away listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter students based on query (by first name, last name or phone number)
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredStudents = trimmedQuery
    ? students.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        const phone = student.phone.toLowerCase();
        return fullName.includes(trimmedQuery) || phone.includes(trimmedQuery);
      })
    : [];

  // Derive urgent alarms:
  // 1. Students whose enrollment expires soon (< 15 days)
  const expiringStudents = students.filter(s => {
    if (s.status !== "actif") return false;
    const daysLeft = Math.ceil((new Date(s.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 15;
  });

  // 2. Classes with active waitlist entries
  const waitlistClasses = classes.filter(c => waitlist.some(w => w.classId === c.id));

  // 3. Students with outstanding unpaid balances
  const debtStudents = students.filter(s => s.balance > 0 && s.status === "actif");

  // 4. System notifications / warnings for school users
  const schoolSystemWarnings = (systemNotifications || []).filter(
    n => n.type === "subscription_warning" && n.schoolId === currentUser?.schoolId && !n.read
  );

  // 5. Renewal requests for SuperAdmin
  const pendingRenewalRequests = (systemNotifications || []).filter(
    n => n.type === "renewal_request" && n.status === "pending"
  );

  const totalAlerts = currentUser?.role === UserRole.SUPERADMIN
    ? pendingRenewalRequests.length
    : expiringStudents.length + waitlistClasses.length + debtStudents.length + schoolSystemWarnings.length;

  const handleAlertClick = (tabId: string, studentId?: string) => {
    setCurrentTab(tabId);
    if (studentId && setSelectedStudentId) {
      setSelectedStudentId(studentId);
    }
    setShowAlertsDropdown(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-6 dark:bg-slate-900 dark:border-slate-800 text-slate-805 dark:text-slate-100">
      {/* Left items: Menu & Switcher */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Demo Controller Widget */}
        {isLocalSession && (
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <Shield className="h-3 w-3 text-blue-600" /> Profil :
            </span>
            {availableUsers.map(u => {
              const isActive = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {u.name.split(" ")[0]} ({u.role === UserRole.DIRECTRICE ? "Dir." : u.campusId === "campus_01" ? "Centre" : "Nord"})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Global Search Bar */}
      {currentUser?.role !== UserRole.SUPERADMIN ? (
        <div ref={searchContainerRef} className="relative flex-1 max-w-[150px] sm:max-w-[240px] md:max-w-[320px] mx-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 pl-8 pr-8 text-[11px] font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchDropdownOpen(false);
                }}
                className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Global Search Results Dropdown */}
          {isSearchDropdownOpen && trimmedQuery !== "" && (
            <div className="absolute right-0 sm:left-0 mt-2 w-72 sm:w-80 md:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 shadow-xl z-50 max-h-72 overflow-y-auto">
              <div className="px-3 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Résultats ({filteredStudents.length})
                </span>
              </div>
              {filteredStudents.length === 0 ? (
                <p className="px-4 py-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">Aucun élève trouvé</p>
              ) : (
                filteredStudents.map(student => {
                  const studentClass = classes.find(c => c.id === student.classId);
                  return (
                    <button
                      key={student.id}
                      onClick={() => {
                        if (setSelectedStudentId) {
                          setSelectedStudentId(student.id);
                        }
                        setCurrentTab("students");
                        setSearchQuery("");
                        setIsSearchDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50/50 dark:border-slate-800/60 flex items-center justify-between transition-colors last:border-b-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded bg-blue-105/10 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-bold shrink-0">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug truncate">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate leading-none mt-0.5">
                            {student.phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {studentClass && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase tracking-wide">
                            {studentClass.language} {studentClass.level}
                          </span>
                        )}
                        <span className={`block text-[9px] font-bold mt-0.5 ${
                          student.status === "actif" 
                            ? "text-emerald-600" 
                            : student.status === "en_attente" 
                            ? "text-amber-500" 
                            : student.status === "terminé"
                            ? "text-blue-600"
                            : student.status === "archivé"
                            ? "text-slate-400 dark:text-slate-500"
                            : "text-red-500"
                        }`}>
                          {student.status === "actif" 
                            ? "Actif" 
                            : student.status === "en_attente" 
                            ? "En attente" 
                            : student.status === "terminé"
                            ? "Terminé"
                            : student.status === "archivé"
                            ? "Archivé"
                            : "Expiré"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right Items: Actions, Alerts, Database Reset */}
      <div className="flex items-center gap-3">
        {/* Fullscreen / Focus Mode Toggle Button */}
        {currentUser?.role === UserRole.DIRECTRICE && (
          <button
            onClick={() => setFocusMode(!focusMode)}
            title={focusMode ? "Quitter le mode focus" : "Basculer en mode focus (Plein écran)"}
            className="flex h-7 px-2.5 gap-1.5 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 font-sans text-[11px] font-bold"
          >
            {focusMode ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-405 shrink-0" />
                <span className="text-blue-650 dark:text-blue-400 font-bold">Focus Actif</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-305 font-bold">Plein Écran</span>
              </>
            )}
          </button>
        )}

        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-550 shadow-sm transition-all hover:bg-slate-150 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-750"
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {/* Reset Database Button */}
        {isLocalSession && (
          <button
            onClick={() => {
              if (window.confirm("Voulez-vous réinitialiser toutes les données de test de LinguaInscript ?")) {
                resetDatabase();
                setCurrentTab("dashboard");
              }
            }}
            title="Réinitialiser la Base de Données d'exercice"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-350 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3 w-3 text-slate-450 dark:text-slate-400" />
            <span className="hidden md:inline">Remise à zéro</span>
          </button>
        )}

        {/* Notification Bell Dropdown */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
              className="relative rounded p-1.5 text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            >
              <Bell className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
              {totalAlerts > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
              )}
            </button>

            {showAlertsDropdown && (
              <div className="absolute right-0 mt-2.5 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 shadow-xl z-50">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {currentUser.role === UserRole.SUPERADMIN ? "Demandes SaaS" : "Alertes prioritaires"} ({totalAlerts})
                  </span>
                  {totalAlerts > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {totalAlerts === 0 ? (
                    <p className="px-4 py-4 text-center text-xs text-slate-400 dark:text-slate-500">Aucune alerte en attente</p>
                  ) : (
                    <>
                      {/* SuperAdmin Notifications (Renewal requests) */}
                      {currentUser.role === UserRole.SUPERADMIN && (
                        pendingRenewalRequests.map(notif => (
                          <div
                            key={notif.id}
                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2"
                          >
                            <div className="flex gap-2.5 items-start">
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{notif.title}</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-snug mt-0.5">
                                  {notif.message}
                                </p>
                                <span className="inline-block text-[9px] text-slate-400 mt-1 font-mono">
                                  {new Date(notif.createdAt).toLocaleDateString("fr-FR")} à {new Date(notif.createdAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-1 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                              <button
                                onClick={async () => {
                                  try {
                                    await updateSystemNotification(notif.id, { status: "rejected", read: true });
                                    alert("Demande rejetée");
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-[10px] font-bold rounded text-slate-600 dark:text-slate-355 transition-colors cursor-pointer animate-none"
                              >
                                Rejeter
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Confirmer l'approbation du renouvellement pour ${notif.schoolName} ?`)) {
                                    try {
                                      await approveSchoolRenewal(notif.id);
                                      alert("Abonnement prolongé avec succès !");
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold rounded text-white shadow shadow-blue-150 transition-colors cursor-pointer"
                              >
                                Approuver ✅
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Regular School User Alerts */}
                      {currentUser.role !== UserRole.SUPERADMIN && (
                        <>
                          {/* Expirations alert cells (J-7 subscription warnings) */}
                          {schoolSystemWarnings.map(notif => (
                            <div
                              key={notif.id}
                              className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex gap-2.5 items-start bg-red-50/20 dark:bg-red-950/10"
                            >
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-red-600 dark:text-red-400">Renouvellement requis</p>
                                <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-snug mt-0.5">
                                  {notif.message}
                                </p>
                                <div className="flex justify-between items-center mt-1.5">
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {new Date(notif.createdAt).toLocaleDateString("fr-FR")}
                                  </span>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await updateSystemNotification(notif.id, { read: true });
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                    className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    Marquer comme lu
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Student Expirations alert cells */}
                          {expiringStudents.map(student => (
                            <button
                              key={student.id}
                              onClick={() => handleAlertClick("students", student.id)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex gap-2.5 items-start"
                            >
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Expiration élève</p>
                                <p className="text-[11px] text-slate-550 dark:text-slate-400">
                                  L'inscription de <b>{student.firstName} {student.lastName}</b> expire bientôt.
                                </p>
                              </div>
                            </button>
                          ))}

                          {/* Unpaid balances alerts */}
                          {debtStudents.map(student => (
                            <button
                              key={student.id}
                              onClick={() => handleAlertClick("students", student.id)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex gap-2.5 items-start"
                            >
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Solde restant à recouvrer</p>
                                <p className="text-[11px] text-slate-550 dark:text-slate-400">
                                  <b>{student.firstName} {student.lastName}</b> doit encore <b>{student.balance.toLocaleString()} FCFA</b>.
                                </p>
                              </div>
                            </button>
                          ))}

                          {/* Waitlist warnings */}
                          {waitlistClasses.map(cls => (
                            <button
                              key={cls.id}
                              onClick={() => handleAlertClick("waitlist")}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex gap-2.5 items-start"
                            >
                              <UserCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Classe complète & File</p>
                                <p className="text-[11px] text-slate-550 dark:text-slate-400">
                                  La classe <b>{cls.language} {cls.level}</b> est pleine avec des élèves en attente.
                                </p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
