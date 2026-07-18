import React, { useState, useRef } from 'react';
import { db } from '../services/db';
import type { Subject, SubjectAssignment, Faculty, User } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { Plus, Trash2, XCircle, UploadCloud, Download, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  // If principal is using this, they see all subjects. If HOD is using it, they see only their dept subjects.
  // Actually, Principal could filter by department, or just see all. 
  // Let's pass `departmentId` if HOD, or `null` if Principal.
  departmentId?: string;
  isPrincipal?: boolean;
}

export const SubjectManagementTab: React.FC<Props> = ({ departmentId, isPrincipal = false }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dbState, setDbState] = useState(db.getRawState());
  const [activeModal, setActiveModal] = useState<'create_subject' | 'assign_subject' | null>(null);

  // Form Fields - Subject
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCourse, setSubCourse] = useState('');
  const [subCredits, setSubCredits] = useState(3);
  const [subYear, setSubYear] = useState('');
  const [subSemester, setSubSemester] = useState('');

  // Form Fields - Assignment
  const [assignSubId, setAssignSubId] = useState('');
  const [assignFacId, setAssignFacId] = useState('');
  const [assignSem, setAssignSem] = useState('');
  const [assignYear, setAssignYear] = useState('');

  // Derived Data
  const mySubjects = isPrincipal 
    ? dbState.subjects 
    : departmentId ? dbState.subjects.filter(s => s.department_id === departmentId) : [];

  const myFacultyProfiles = isPrincipal
    ? dbState.faculty
    : departmentId ? dbState.faculty.filter(f => f.department_id === departmentId) : [];

  const myAssignments = isPrincipal
    ? dbState.subject_assignments
    : myFacultyProfiles.map(f => dbState.subject_assignments.filter(sa => sa.faculty_id === f.id)).flat();

  const getYearsForCourse = (course: string) => {
    if (!course) return [];
    if (course === 'M.PHARM') return ['I Year', 'II Year'];
    if (course === 'PHARM.D') return ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year', 'VI Year'];
    return ['I Year', 'II Year', 'III Year', 'IV Year']; // B.PHARM
  };

  const getSemestersForCourse = (course: string) => {
    if (!course) return [];
    if (course === 'PHARM.D') return [];
    if (course === 'M.PHARM') return ['I Semester', 'II Semester', 'III Semester', 'IV Semester'];
    return ['I Semester', 'II Semester', 'III Semester', 'IV Semester', 'V Semester', 'VI Semester', 'VII Semester', 'VIII Semester']; // B.PHARM
  };

  const groupedSubjects = mySubjects.reduce((acc, sub) => {
    const course = sub.course || 'Unassigned';
    if (!acc[course]) acc[course] = [];
    acc[course].push(sub);
    return acc;
  }, {} as Record<string, Subject[]>);

  // --- Actions ---

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId && !isPrincipal) {
      showToast('Error identifying department', 'error');
      return;
    }
    
    // If principal creates a subject, they might need to pick a department, but let's assume they are assigning it globally or we need a dept picker.
    // Let's just assign it to a default department or the first department if they are principal.
    const deptToAssign = departmentId || dbState.departments[0]?.id;
    if (!deptToAssign) {
       showToast('No departments available.', 'error');
       return;
    }

    try {
      await db.createSubject({
        name: subName,
        code: subCode,
        credits: subCredits,
        department_id: deptToAssign,
        year: subYear,
        semester: subSemester,
        course: subCourse
      });
      showToast('Subject created successfully!');
      setActiveModal(null);
      setSubName('');
      setSubCode('');
      setSubCourse('');
      setSubYear('');
      setSubSemester('');
      setDbState(db.getRawState());
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteSubject = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete ${code}?`)) return;
    try {
      await db.deleteSubject(id);
      showToast('Subject deleted');
      setDbState(db.getRawState());
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.assignSubject({
        faculty_id: assignFacId,
        subject_id: assignSubId,
        semester: assignSem,
        academic_year: assignYear
      });
      showToast('Subject assigned to faculty successfully!');
      setActiveModal(null);
      setAssignSubId('');
      setAssignFacId('');
      setDbState(db.getRawState());
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Remove this subject allocation?')) return;
    try {
      await db.deleteAssignment(id);
      showToast('Allocation removed');
      setDbState(db.getRawState());
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Excel Bulk Upload Template
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Course", "Subject Name", "Subject Code", "Credits", "Year", "Semester"],
      ["B.PHARM", "Pharmacology I", "PH-101", 3, "I Year", "I Semester"]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subjects");
    XLSX.writeFile(wb, "subject_upload_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Read as array of arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rows.length <= 1) {
          showToast('File is empty or missing data rows.', 'error');
          return;
        }

        const newSubjects: Omit<Subject, 'id'>[] = [];
        const deptToAssign = departmentId || dbState.departments[0]?.id;

        if (!deptToAssign) {
          showToast('No department found to assign subjects to.', 'error');
          return;
        }

        // rows[0] is header. Start from rows[1]
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Skip empty rows
          if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;
          
          const course = row[0]?.toString().trim() || 'Unknown';
          const name = row[1]?.toString().trim() || 'Unknown Subject';
          const code = row[2]?.toString().trim() || `SUB-${Math.floor(Math.random() * 1000)}`;
          const credits = parseInt(row[3]) || 3;
          const year = row[4]?.toString().trim() || '';
          const semester = row[5]?.toString().trim() || '';

          if (course || name || code) {
            newSubjects.push({
              course,
              name,
              code,
              credits,
              year,
              semester,
              department_id: deptToAssign
            });
          }
        }

        if (newSubjects.length === 0) {
          showToast('No valid subjects found to upload.', 'error');
          return;
        }

        await db.saveSubjectsBatch(newSubjects);
        showToast(`Successfully imported ${newSubjects.length} subjects!`, 'success');
        setDbState(db.getRawState());
      } catch (err: any) {
        showToast(`Bulk import failed: ${err.message}`, 'error');
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top action bar for Bulk Uploads */}
      <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-primary-500" />
            Subject Management
          </h2>
          <p className="text-sm text-navy-500 mt-1">Manage course catalog and faculty workload allocations.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Template
          </button>
          
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden"
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="btn-primary flex items-center gap-2 cursor-pointer m-0">
            <UploadCloud size={16} /> Bulk Upload Excel
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Subjects listings */}
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-navy-950 dark:text-white text-base">Course Subjects</h4>
            <button
              onClick={() => setActiveModal('create_subject')}
              className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/10"
            >
              <Plus size={14} /> Add Subject
            </button>
          </div>

          {mySubjects.length === 0 ? (
            <div className="py-12 text-center text-xs text-navy-450">
              No subjects configured. Use bulk upload or add manually.
            </div>
          ) : (
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {Object.entries(groupedSubjects).map(([course, subjects]) => (
                <div key={course} className="space-y-3">
                  <h5 className="font-extrabold text-sm text-primary-600 dark:text-primary-400 border-b border-primary-500/20 pb-1">
                    {course}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold uppercase tracking-wider">
                          <th className="pb-2 pl-2">Subject Code</th>
                          <th className="pb-2">Subject Name</th>
                          <th className="pb-2">Year / Sem</th>
                          <th className="pb-2">Credits</th>
                          <th className="pb-2 pr-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-navy-850">
                        {subjects.map((sub) => (
                          <tr key={sub.id} className="text-navy-950 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                            <td className="py-2.5 pl-2 font-mono font-bold text-primary-500">{sub.code}</td>
                            <td className="py-2.5 font-bold">{sub.name}</td>
                            <td className="py-2.5">{sub.year || '-'} {sub.semester ? `/ ${sub.semester}` : ''}</td>
                            <td className="py-2.5">{sub.credits}</td>
                            <td className="py-2.5 pr-2 text-right">
                              <button
                                onClick={() => handleDeleteSubject(sub.id, sub.code)}
                                className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject Assignments */}
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-navy-950 dark:text-white text-base">Teaching Allocations</h4>
            {mySubjects.length > 0 && myFacultyProfiles.length > 0 && (
              <button
                onClick={() => setActiveModal('assign_subject')}
                className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/10"
              >
                <Plus size={14} /> Map Subject
              </button>
            )}
          </div>

          {myAssignments.length === 0 ? (
            <div className="py-12 text-center text-xs text-navy-450">
              No subjects mapped to teachers yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
              {myAssignments.map((sa) => {
                const sub = dbState.subjects.find((s) => s.id === sa.subject_id);
                const fac = dbState.faculty.find((f) => f.id === sa.faculty_id);
                const usr = dbState.users.find((u) => u.id === fac?.user_id);
                
                return (
                  <div key={sa.id} className="p-3.5 bg-slate-50 dark:bg-navy-950/60 rounded-xl border border-slate-100 dark:border-navy-850 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-navy-950 dark:text-white">{sub?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-navy-400 mt-0.5">Assigned to: <strong className="text-primary-500 dark:text-primary-400">{usr?.full_name}</strong></p>
                      <p className="text-[9px] text-navy-400 mt-0.5">Term: {sa.semester} ({sa.academic_year})</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAssignment(sa.id)}
                      className="p-1 text-navy-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-navy-800">
              <h4 className="font-extrabold text-navy-950 dark:text-white text-base">
                {activeModal === 'create_subject' && 'Create Course Subject'}
                {activeModal === 'assign_subject' && 'Map Course to Faculty'}
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded bg-slate-50 dark:bg-navy-950 text-navy-450 hover:text-navy-950"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* D. Create Subject */}
            {activeModal === 'create_subject' && (
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Course</label>
                  <select
                    required
                    value={subCourse}
                    onChange={(e) => setSubCourse(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="">-- Select Course --</option>
                    <option value="B.PHARM">B.PHARM</option>
                    <option value="M.PHARM">M.PHARM</option>
                    <option value="PHARM.D">PHARM.D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Pharmaceutics I"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Subject Code</label>
                    <input
                      type="text"
                      required
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value)}
                      placeholder="e.g. PY-101"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Credits</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={6}
                      value={subCredits}
                      onChange={(e) => setSubCredits(parseInt(e.target.value))}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Year</label>
                    <select
                      required
                      value={subYear}
                      onChange={(e) => setSubYear(e.target.value)}
                      disabled={!subCourse}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">-- Select Year --</option>
                      {getYearsForCourse(subCourse).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {subCourse !== 'PHARM.D' && (
                    <div>
                      <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Semester</label>
                      <select
                        required
                        value={subSemester}
                        onChange={(e) => setSubSemester(e.target.value)}
                        disabled={!subCourse}
                        className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="">-- Select Semester --</option>
                        {getSemestersForCourse(subCourse).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Create Subject
                </button>
              </form>
            )}

            {/* G. Assign Subject Map */}
            {activeModal === 'assign_subject' && (
              <form onSubmit={handleAssignSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Select Course Subject</label>
                  <select
                    required
                    value={assignSubId}
                    onChange={(e) => setAssignSubId(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="">-- Select Subject --</option>
                    {mySubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Select Faculty</label>
                  <select
                    required
                    value={assignFacId}
                    onChange={(e) => setAssignFacId(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="">-- Select Faculty --</option>
                    {myFacultyProfiles.map((f) => {
                      const u = dbState.users.find(usr => usr.id === f.user_id);
                      return (
                        <option key={f.id} value={f.id}>{u?.full_name} ({u?.email})</option>
                      )
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Semester Term</label>
                    <input
                      type="text"
                      required
                      value={assignSem}
                      onChange={(e) => setAssignSem(e.target.value)}
                      placeholder="e.g. Fall 2024"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Academic Year</label>
                    <input
                      type="text"
                      required
                      value={assignYear}
                      onChange={(e) => setAssignYear(e.target.value)}
                      placeholder="e.g. 2024-2025"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Confirm Allocation
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
