import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { MarkRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { FileCheck, CheckCircle, XCircle, Save } from 'lucide-react';

interface Props {
  activeTab: string;
}

export const ExamCellDashboard: React.FC<Props> = ({ activeTab }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [dbState, setDbState] = useState(db.getRawState());
  const [innerTab, setInnerTab] = useState<'internal_approvals' | 'semester_entry'>('internal_approvals');

  // Semester Entry States
  const [selectedSubId, setSelectedSubId] = useState('');
  const [semesterMarks, setSemesterMarks] = useState<Record<string, number>>({});
  const [batchStatus, setBatchStatus] = useState<string | null>(null);

  useEffect(() => {
    db.fetchAllData().then(setDbState);
  }, []);

  const triggerStateRefresh = () => {
    db.fetchAllData().then(setDbState);
  };

  const handleApproveInternal = async (subjectId: string) => {
    try {
      await db.updateInternalStatus(subjectId, 'Approved');
      showToast('Internal marks approved and released to students.', 'success');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve marks.', 'error');
    }
  };

  const handleRejectInternal = async (subjectId: string) => {
    try {
      await db.updateInternalStatus(subjectId, 'Rejected');
      showToast('Internal marks rejected and sent back to Faculty.', 'warning');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject marks.', 'error');
    }
  };

  // Group marks by subject for those pending Exam Cell approval
  const pendingInternal = dbState.marks.filter(m => m.internal_status === 'Pending Exam Cell');
  const internalBatches: Record<string, { subjectId: string; studentCount: number }> = {};
  
  pendingInternal.forEach(m => {
    if (!internalBatches[m.subject_id]) {
      internalBatches[m.subject_id] = {
        subjectId: m.subject_id,
        studentCount: 0
      };
    }
    internalBatches[m.subject_id].studentCount++;
  });

  // Load Semester Marks List
  const loadSemesterList = () => {
    if (!selectedSubId) return;
    const existing = dbState.marks.filter(m => m.subject_id === selectedSubId && m.internal_status === 'Approved');
    
    const initialMarks: Record<string, number> = {};
    existing.forEach(m => {
      if (m.semester_marks !== undefined) {
        initialMarks[m.student_id] = m.semester_marks;
      }
    });

    setSemesterMarks(initialMarks);
    setBatchStatus(existing.length > 0 ? existing[0].semester_status || 'Draft' : null);
  };

  useEffect(() => {
    loadSemesterList();
  }, [selectedSubId, dbState.marks]);

  const handleSemMarkChange = (studentId: string, val: string) => {
    const num = val === '' ? 0 : Math.max(parseFloat(val) || 0, 0);
    setSemesterMarks(prev => ({
      ...prev,
      [studentId]: num
    }));
  };

  const handleSaveSemesterMarks = async (submitForApproval: boolean) => {
    if (!selectedSubId) return;

    const existing = dbState.marks.filter(m => m.subject_id === selectedSubId && m.internal_status === 'Approved');
    const records: Pick<MarkRecord, 'subject_id' | 'student_id' | 'semester_marks' | 'semester_status'>[] = existing.map(
      (m) => ({
        subject_id: selectedSubId,
        student_id: m.student_id,
        semester_marks: semesterMarks[m.student_id],
        semester_status: submitForApproval ? 'Pending Principal' : (batchStatus === 'Rejected' ? 'Draft' : (batchStatus as any || 'Draft')),
      })
    );

    try {
      await db.saveSemesterMarksBatch(records);
      showToast(submitForApproval ? 'Semester marks submitted to Principal.' : 'Semester marks draft saved.', 'success');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save marks.', 'error');
    }
  };

  const eligibleSubjects = dbState.subjects.filter(s => 
    dbState.marks.some(m => m.subject_id === s.id && m.internal_status === 'Approved')
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 glass border border-primary-500/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[10px] uppercase font-extrabold tracking-widest text-primary-500 bg-primary-500/5 px-2.5 py-1 rounded-full self-start">
            EXAM CELL PORTAL
          </p>
          <h2 className="text-xl font-black text-navy-950 dark:text-white mt-2 uppercase">
            {currentUser?.full_name}
          </h2>
          <p className="text-xs text-navy-450 dark:text-navy-400 mt-1">
            Exam Management & Approvals
          </p>
        </div>
      </div>

      {activeTab === 'exam_cell' && (
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-slate-200 dark:border-navy-800 pb-2">
            <button
              onClick={() => setInnerTab('internal_approvals')}
              className={`px-4 py-2 font-bold text-sm ${innerTab === 'internal_approvals' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-navy-400 hover:text-navy-600'}`}
            >
              Internal Approvals
            </button>
            <button
              onClick={() => setInnerTab('semester_entry')}
              className={`px-4 py-2 font-bold text-sm ${innerTab === 'semester_entry' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-navy-400 hover:text-navy-600'}`}
            >
              Semester Marks Entry
            </button>
          </div>

          {innerTab === 'internal_approvals' && (
            <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
              <div>
                <h3 className="text-navy-900 dark:text-white font-bold text-lg">Internal Marks Pending Approval</h3>
                <p className="text-xs text-navy-400">Review faculty-submitted internal marks. Approving releases them to students.</p>
              </div>

              {Object.keys(internalBatches).length === 0 ? (
                <div className="py-16 text-center text-navy-450 bg-slate-50 dark:bg-navy-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-navy-800">
                  <FileCheck className="mx-auto w-10 h-10 text-navy-300 dark:text-navy-700 mb-2" />
                  <p className="font-bold text-sm">No pending internal marks.</p>
                  <p className="text-xs mt-1 text-navy-400">All submitted internal marks have been processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                        <th className="pb-3 pl-2">Subject</th>
                        <th className="pb-3">Course</th>
                        <th className="pb-3">Students Graded</th>
                        <th className="pb-3 pr-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                      {Object.values(internalBatches).map((batch) => {
                        const subject = dbState.subjects.find(s => s.id === batch.subjectId);
                        return (
                          <tr key={batch.subjectId} className="text-navy-950 dark:text-navy-200">
                            <td className="py-3 pl-2">
                              <p className="font-bold">{subject?.name || 'Unknown'}</p>
                              <p className="text-[10px] text-primary-500 uppercase">{subject?.code}</p>
                            </td>
                            <td className="py-3 font-bold">{subject?.course}</td>
                            <td className="py-3">{batch.studentCount} Students</td>
                            <td className="py-3 pr-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleApproveInternal(batch.subjectId)}
                                  className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold flex items-center gap-1"
                                >
                                  <CheckCircle size={14} /> Approve
                                </button>
                                <button
                                  onClick={() => handleRejectInternal(batch.subjectId)}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-1"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {innerTab === 'semester_entry' && (
            <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
              <div>
                <h3 className="text-navy-900 dark:text-white font-bold text-lg">Semester Marks Entry</h3>
                <p className="text-xs text-navy-400">Enter final semester marks for students with approved internal marks.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-850 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-navy-500 uppercase">Subject</label>
                  <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="mt-1 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-xs font-semibold text-navy-900 dark:text-white"
                  >
                    <option value="">-- Choose Subject --</option>
                    {eligibleSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) - {s.course}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end">
                  {batchStatus && selectedSubId && (
                    <div className="flex items-center gap-2 p-2.5 w-full bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl">
                      <span className="text-xs font-bold text-navy-600 dark:text-navy-300">Approval Status:</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        batchStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                        batchStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                        batchStatus === 'Pending Principal' ? 'bg-amber-100 text-amber-705' :
                        'bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-navy-300'
                      }`}>
                        {batchStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!selectedSubId ? (
                <div className="py-12 text-center text-xs text-navy-455 bg-slate-50/50 dark:bg-navy-950/20 rounded-2xl">
                  Choose a subject to enter semester scores.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                          <th className="pb-3 pl-2">Student Name</th>
                          <th className="pb-3 text-center">Internal Total</th>
                          <th className="pb-3 text-center">Semester Marks</th>
                          <th className="pb-3 pr-2 text-center text-primary-500">Grand Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                        {dbState.marks.filter(m => m.subject_id === selectedSubId && m.internal_status === 'Approved').map((m) => {
                          const student = dbState.students.find(s => s.id === m.student_id);
                          const isPharmD = dbState.subjects.find(s => s.id === selectedSubId)?.course === 'PHARM.D';
                          
                          let avg = 0;
                          if (isPharmD) {
                            avg = ((m.mid1_marks || 0) + (m.mid2_marks || 0) + (m.mid3_marks || 0)) / 3;
                          } else {
                            avg = ((m.mid1_marks || 0) + (m.mid2_marks || 0)) / 2;
                          }
                          const internalTotal = avg + (m.cmm_marks || 0);
                          
                          const semVal = semesterMarks[m.student_id];
                          const grandTotal = internalTotal + (semVal || 0);
                          const readOnly = batchStatus === 'Approved' || batchStatus === 'Pending Principal';

                          return (
                            <tr key={m.student_id} className="text-navy-950 dark:text-navy-200">
                              <td className="py-3 pl-2">
                                <p className="font-bold">{student?.name}</p>
                                <p className="text-[10px] font-mono text-navy-400">{student?.roll_number}</p>
                              </td>
                              <td className="py-3 text-center font-bold text-navy-400">
                                {internalTotal.toFixed(1)}
                              </td>
                              <td className="py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={semVal ?? ''}
                                  onChange={(e) => handleSemMarkChange(m.student_id, e.target.value)}
                                  disabled={readOnly}
                                  className="w-20 p-1.5 border border-slate-200 dark:border-navy-800 rounded-lg text-center bg-slate-50 dark:bg-navy-950 text-xs focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                                />
                              </td>
                              <td className="py-3 pr-2 text-center font-black text-primary-600 dark:text-primary-400">
                                {grandTotal.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {batchStatus !== 'Approved' && batchStatus !== 'Pending Principal' && (
                    <div className="flex justify-end pt-4 gap-3 border-t border-slate-100 dark:border-navy-850">
                      <button
                        onClick={() => handleSaveSemesterMarks(false)}
                        className="px-6 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700 rounded-xl text-sm font-bold transition-colors"
                      >
                        Save Draft
                      </button>
                      <button
                        onClick={() => handleSaveSemesterMarks(true)}
                        className="px-6 py-2.5 bg-primary-600 text-white hover:bg-primary-700 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/30 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Save size={18} /> Submit to Principal
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
