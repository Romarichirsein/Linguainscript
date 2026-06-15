import React, { useMemo } from "react";
import { useData } from "../context/DataContext";
import { Student } from "../types";
import {
  Hourglass,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Check
} from "lucide-react";

export const Waitlist: React.FC = () => {
  const { students, classes, campuses, promoteStudentFromWaitlist, updateStudentStatus } = useData();

  // Find students in waitlist status
  const waitlistStudents = useMemo(() => {
    return students.filter(s => s.status === "en_attente");
  }, [students]);

  // Compute metrics
  const totalInQueue = waitlistStudents.length;

  const classesWithOpening = useMemo(() => {
    // Counts classes with waitlist candidates that now have vacant seats
    let count = 0;
    const evaluatedClasses = new Set<string>();

    waitlistStudents.forEach(s => {
      if (evaluatedClasses.has(s.classId)) return;
      evaluatedClasses.add(s.classId);

      const cls = classes.find(c => c.id === s.classId);
      if (cls && cls.currentCount < cls.maxStudents) {
        count++;
      }
    });

    return count;
  }, [waitlistStudents, classes]);

  const handlePromote = (student: Student) => {
    const cls = classes.find(c => c.id === student.classId);
    if (!cls) return;

    if (cls.currentCount >= cls.maxStudents) {
      if (!window.confirm("Attention: Cette classe a déjà atteint sa capacité maximale de places. Souhaitez-vous forcer l'admission de cet élève outre-quota ?")) {
        return;
      }
    }

    const response = promoteStudentFromWaitlist(student.id);
    if (response.success) {
      alert(`Félicitations ! ${student.firstName} ${student.lastName} a été officiellement admis en classe.`);
    } else {
      alert(`Erreur: ${response.message}`);
    }
  };

  const handleCancelWaitlist = (student: Student) => {
    if (window.confirm(`Êtes-vous sûr de vouloir retirer ${student.firstName} du registre d'attente ?`)) {
      updateStudentStatus(student.id, "expiré"); // Retire de l'attente active
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-800">
          Supervision de la File d'Attente
        </h2>
        <p className="text-sm text-slate-500">
          Gestionnaire des dossiers bloqués hors-capacité. Promotion d'admission ou réorientation d'élèves.
        </p>
      </div>

      {/* Stats summaries Row */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Candidats en attente</span>
            <span className="rounded bg-amber-50 p-1.5 text-amber-600"><Users className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-slate-850">{totalInQueue}</p>
          <p className="text-[10px] text-slate-400 mt-1">Dossiers d'inscriptions bloqués</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Opportunités d'Admissions</span>
            <span className="rounded bg-green-50 p-1.5 text-green-600"><CheckCircle className="h-4 w-4" /></span>
          </div>
          <p className="text-2xl font-bold text-green-650">{classesWithOpening}</p>
          <p className="text-[10px] text-slate-400 mt-1">Salles ayant désormais des places libres</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm bg-blue-50/10">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Politique de Placement</span>
            <span className="rounded bg-blue-50 p-1.5 text-blue-600"><Hourglass className="h-4 w-4" /></span>
          </div>
          <p className="text-sm font-bold text-slate-800 mt-1.5">Règle FIFO Active</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Premier inscrit, premier promu en cas de libération.</p>
        </div>
      </div>

      {/* Main Waitlist table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50 font-bold uppercase tracking-wider text-slate-600">
                <th className="px-6 py-4">Candidat Élève</th>
                <th className="px-6 py-4">Cours sollicité</th>
                <th className="px-6 py-4">Tuteur responsable</th>
                <th className="px-6 py-4 text-center">Capacité Classe</th>
                <th className="px-6 py-4 text-center">Date blocage</th>
                <th className="px-6 py-4 text-right">Actions placement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {waitlistStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    File d'attente vide ! Toutes les demandes d'affectations d'inscriptions sont honorées.
                  </td>
                </tr>
              ) : (
                waitlistStudents.map(student => {
                  const sClass = classes.find(c => c.id === student.classId);
                  const sCampus = campuses.find(c => c.id === student.campusId)?.name || "Non spécifié";
                  
                  const isFull = sClass ? sClass.currentCount >= sClass.maxStudents : false;
                  const waitingFrom = new Date(student.enrollmentDate).toLocaleDateString("fr-FR");

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 uppercase">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">
                              {student.firstName} {student.lastName}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              ID : {student.id} • {student.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {sClass ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex max-w-max items-center gap-1 rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              {sClass.language} {sClass.level}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {sCampus} • {sClass.period}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Non spécifié</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-slate-600 text-xs">
                          <p className="font-semibold text-slate-700">{student.parentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{student.parentPhone}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {sClass ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-800">
                              {sClass.currentCount} / {sClass.maxStudents}
                            </span>
                            {isFull ? (
                              <span className="text-[9px] text-red-500 font-bold bg-red-50 px-1 py-0.2 rounded border border-red-100 mt-0.5">
                                Complet
                              </span>
                            ) : (
                              <span className="text-[9px] text-green-600 font-bold bg-green-50 px-1 py-0.2 rounded border border-green-150 mt-0.5">
                                {sClass.maxStudents - sClass.currentCount} libres
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center text-xs font-mono text-slate-500">
                        {waitingFrom}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Promote Button */}
                          <button
                            onClick={() => handlePromote(student)}
                            title="Admettre officiellement l'élève"
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 font-bold text-[10px] text-white flex items-center gap-1 cursor-pointer shadow shadow-blue-150"
                          >
                            <Check className="h-3.5 w-3.5" /> Admettre
                          </button>

                          {/* Cancel waiting */}
                          <button
                            onClick={() => handleCancelWaitlist(student)}
                            title="Retirer de la file d'attente"
                            className="rounded-lg p-2 text-slate-405 hover:bg-red-50 hover:text-red-650 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
