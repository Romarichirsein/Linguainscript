import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  UserCheck,
  Coins,
  ArrowRightLeft
} from "lucide-react";

export const AuditLog: React.FC = () => {
  const { auditLogs } = useData();

  const [searchOperator, setSearchOperator] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (searchOperator.trim()) {
        const query = searchOperator.toLowerCase();
        if (!log.userName.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filterAction && log.action !== filterAction) {
        return false;
      }

      return true;
    });
  }, [auditLogs, searchOperator, filterAction]);

  const getActionStyles = (action: string) => {
    switch (action) {
      case "CREATE_STUDENT":
        return {
          icon: <UserCheck className="h-4 w-4 text-blue-600" />,
          bg: "bg-blue-50 border-blue-100",
          text: "Inscription Élève"
        };
      case "ADD_PAYMENT":
        return {
          icon: <Coins className="h-4 w-4 text-green-600" />,
          bg: "bg-green-50 border-green-100",
          text: "Encaissement Comptable"
        };
      case "RENEWAL":
        return {
          icon: <RefreshCw className="h-4 w-4 text-purple-605" />,
          bg: "bg-purple-50 border-purple-100",
          text: "Renouvellement Dossier"
        };
      case "PROMOTE_WAITLIST":
        return {
          icon: <ArrowRightLeft className="h-4 w-4 text-emerald-600" />,
          bg: "bg-emerald-50 border-emerald-100",
          text: "Promotion Admis"
        };
      default:
        return {
          icon: <ShieldCheck className="h-4 w-4 text-slate-500" />,
          bg: "bg-slate-55 border-slate-150",
          text: "Action Système"
        };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-800">
          Traceur de Transparence (Audit Logs)
        </h2>
        <p className="text-sm text-slate-500">
          Bilan de traçabilité en lecture seule des modifications scolaires pour empêcher la perte de données.
        </p>
      </div>

      {/* Interactive search and category filtering controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par nom du collaborateur / opérateur..."
            value={searchOperator}
            onChange={e => setSearchOperator(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-200 p-2 text-xs text-slate-700 bg-white"
          >
            <option value="">Tous les évènements d'actions</option>
            <option value="CREATE_STUDENT">Création Inscriptions</option>
            <option value="ADD_PAYMENT">Encaissements de scolarité</option>
            <option value="RENEWAL">Renouvellements annuels</option>
            <option value="PROMOTE_WAITLIST">Promotions Liste d'Attente</option>
          </select>
        </div>
      </div>

      {/* Roster Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Horodatage</th>
                <th className="px-6 py-4">Type Action</th>
                <th className="px-6 py-4">Opérateur Responsable</th>
                <th className="px-6 py-4">Campus d'affectation</th>
                <th className="px-6 py-4">Description de la modification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Aucune action de traçabilité trouvée dans le grand livre.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const stamp = new Date(log.timestamp);
                  const formattedTime = stamp.toLocaleDateString("fr-FR") + " " + stamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  const style = getActionStyles(log.action);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono text-slate-450">{formattedTime}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${style.bg}`}>
                          {style.icon}
                          {style.text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{log.userName}</div>
                        {log.userRole && (
                          <span className={`inline-block text-[9px] font-mono leading-none font-bold uppercase px-1.5 py-0.5 mt-1 rounded border ${
                            log.userRole === "SUPERADMIN" 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : log.userRole === "DIRECTRICE" 
                                ? "bg-blue-50 text-blue-700 border-blue-200" 
                                : "bg-slate-50 text-slate-650 border-slate-200"
                          }`}>
                            {log.userRole === "SUPERADMIN" ? "Super Admin" : log.userRole === "DIRECTRICE" ? "Directrice" : "Secrétaire"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-500">{log.campusName || "Global"}</td>
                      <td className="px-6 py-4">
                        {log.action === "CREATE_STUDENT" && (
                          <p className="text-slate-600">
                            Admission de l'élève <b className="text-slate-850">{log.details?.firstName} {log.details?.lastName}</b> en classe <b>{log.details?.class}</b>
                          </p>
                        )}
                        {log.action === "ADD_PAYMENT" && (
                          <p className="text-slate-600">
                            Paiement validé de <b className="text-emerald-700 font-mono font-bold">{log.details?.amount?.toLocaleString()} FCFA</b> [Mode: {log.details?.mode}]. Note : {log.details?.note}
                          </p>
                        )}
                        {log.action === "RENEWAL" && (
                          <p className="text-slate-600">
                            Renouvellement annuel validé. Nouvel échéance : <b className="font-mono">{log.details?.extendedUntil}</b>. Coût de réinscription : {log.details?.cost?.toLocaleString()} f.
                          </p>
                        )}
                        {log.action === "PROMOTE_WAITLIST" && (
                          <p className="text-slate-600">
                            Promotion de la file d'attente vers inscrit actif de l'élève <b className="text-slate-800">{log.details?.firstName} {log.details?.lastName}</b> en classe <b>{log.details?.class}</b>.
                          </p>
                        )}
                        {!["CREATE_STUDENT", "ADD_PAYMENT", "RENEWAL", "PROMOTE_WAITLIST"].includes(log.action) && (
                          <p className="text-slate-500">{log.action}</p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
