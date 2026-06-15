import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { Student } from "../types";
import {
  AlertTriangle,
  History,
  Clock,
  Printer,
  Calendar,
  Sparkles,
  Check
} from "lucide-react";

export const Renewals: React.FC = () => {
  const { students, classes, campuses, renewStudent } = useData();

  // Renewal form popup state
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [renewalAmount, setRenewalAmount] = useState("180000");
  const [renewalPayment, setRenewalPayment] = useState("180000");
  const [renewalMode, setRenewalMode] = useState<"Espèces" | "Mobile Money" | "Virement">("Espèces");

  // Filter students whose expiration date is within 30 days or already passed
  const threatenedStudents = useMemo(() => {
    return students.map(stud => {
      const diff = new Date(stud.expirationDate).getTime() - Date.now();
      const left = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return {
        ...stud,
        daysLeft: left
      };
    }).filter(stud => stud.status === "actif" && stud.daysLeft <= 30) // Expires in <= 30 days
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [students]);

  const totalExpired = useMemo(() => {
    return threatenedStudents.filter(s => s.daysLeft <= 0).length;
  }, [threatenedStudents]);

  const totalWarning = useMemo(() => {
    return threatenedStudents.filter(s => s.daysLeft > 0 && s.daysLeft <= 14).length;
  }, [threatenedStudents]);

  const handleOpenRenew = (s: Student) => {
    setTargetStudent(s);
    setRenewalAmount("180000");
    setRenewalPayment("180000");
  };

  const submitRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;

    const amount = parseFloat(renewalAmount);
    const firstPay = parseFloat(renewalPayment);

    if (isNaN(amount) || isNaN(firstPay) || amount <= 0 || firstPay < 0) {
      alert("Veuillez saisir des montants valides.");
      return;
    }

    // Extend expiration date for 1 yr (365 days)
    const nextExpiration = new Date(targetStudent.expirationDate);
    nextExpiration.setFullYear(nextExpiration.getFullYear() + 1);
    const nextExpStr = nextExpiration.toISOString().split("T")[0];

    renewStudent(targetStudent.id, nextExpStr, amount, firstPay, renewalMode);
    
    alert(`Dossier Prolongé ! ${targetStudent.firstName} ${targetStudent.lastName} est réinscrit avec succès jusqu'au ${new Date(nextExpStr).toLocaleDateString("fr-FR")}.`);
    setTargetStudent(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-800">
          Alertes de Fin d'Inscription
        </h2>
        <p className="text-sm text-slate-500">
          Suivi préventif des dossiers étudiants proches d'expirer pour anticiper et coordonner les réinscriptions.
        </p>
      </div>

      {/* Warning Cards Row */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
          <div className="flex justify-between items-center text-red-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inscriptions Expirées</span>
            <span className="rounded bg-red-100 p-1.5 text-red-650"><AlertTriangle className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-red-700">{totalExpired}</p>
          <p className="text-[10px] text-red-500 mt-1">Dossiers n'ayant plus accès aux salles</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex justify-between items-center text-amber-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Urgences Imminentes</span>
            <span className="rounded bg-amber-100 p-1.5 text-amber-605"><Clock className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{totalWarning}</p>
          <p className="text-[10px] text-amber-500 mt-1">Échéance à moins de 14 jours</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Politique de Continuité</span>
            <span className="rounded bg-blue-50 p-1.5 text-blue-600"><Calendar className="h-4 w-4" /></span>
          </div>
          <p className="text-xs font-bold text-slate-800 mt-1.5">+365 Jours de validité</p>
          <p className="text-[10px] text-slate-400 mt-0.5">La prolongation préserve l'antériorité des classes.</p>
        </div>
      </div>

      {/* Threatened list TABLE */}
      <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase tracking-wider text-slate-600">
                <th className="px-6 py-4">Élève</th>
                <th className="px-6 py-4">Classe & Campus</th>
                <th className="px-6 py-4">Tuteur Parent</th>
                <th className="px-6 py-4 text-center">Échéance Inscription</th>
                <th className="px-6 py-4 text-center">Jours restants</th>
                <th className="px-6 py-4 text-right">Actions relance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {threatenedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Aucune alerte de renouvellement sur les 30 prochains jours. Félicitations !
                  </td>
                </tr>
              ) : (
                threatenedStudents.map(student => {
                  const sClass = classes.find(c => c.id === student.classId);
                  const sCampus = campuses.find(c => c.id === student.campusId);

                  let indicatorClass = "text-green-600 bg-green-50";
                  if (student.daysLeft <= 0) {
                    indicatorClass = "text-red-700 bg-red-50 border border-red-200 font-bold animate-pulse";
                  } else if (student.daysLeft <= 14) {
                    indicatorClass = "text-amber-700 bg-amber-50 border border-amber-200 font-semibold";
                  }

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">
                              {student.firstName} {student.lastName}
                            </h4>
                            <p className="text-[10px] text-slate-550 font-mono">{student.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {sClass ? (
                          <div>
                            <span className="font-bold text-slate-700 text-xs">{sClass.language} {sClass.level}</span>
                            <span className="block text-[10px] text-slate-400">{sCampus?.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-450">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-650">
                        <p className="font-semibold text-slate-700">{student.parentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{student.parentPhone}</p>
                      </td>

                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-600">
                        {new Date(student.expirationDate).toLocaleDateString("fr-FR")}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded text-xs ${indicatorClass}`}>
                          {student.daysLeft <= 0 ? "EXPIRÉ" : `${student.daysLeft} jours`}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenRenew(student)}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-[10px] font-bold text-white cursor-pointer shadow shadow-blue-150"
                        >
                          Renouveler ...
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP RENEWAL FORM */}
      {targetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-105 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Renouvellement administratif dossier</h3>
              <button onClick={() => setTargetStudent(null)} className="rounded p-1 text-slate-450 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={submitRenewal} className="space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-600 mb-2">
                <p className="font-bold text-slate-805">Élève : {targetStudent.firstName} {targetStudent.lastName}</p>
                <p className="text-[11px] mt-0.5">
                  Prestation : Validation de scolarité supplémentaire (1 an d'accès).
                </p>
              </div>

              {/* Renewal fee */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Coût financier annuel de re-scolarité (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={renewalAmount}
                  onChange={e => setRenewalAmount(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* Paid tranche */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Acompte versé / payé ce jour (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={renewalPayment}
                  onChange={e => setRenewalPayment(e.target.value)}
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-850"
                />
              </div>

              {/* pay mode select */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-650">Mode de paiement de l'acompte *</label>
                <select
                  value={renewalMode}
                  onChange={e => setRenewalMode(e.target.value as any)}
                  className="rounded-xl border border-slate-200 p-2.5 bg-white text-slate-850"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Mobile Money">Mobile Money (OM/MoMo)</option>
                  <option value="Virement">Virement bancaire</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setTargetStudent(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow shadow-blue-150 cursor-pointer"
                >
                  Confirmer la Prolongation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
