import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Student } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Users, Save, CheckCircle2, XCircle, AlertCircle, Edit, Search } from 'lucide-react';
import { useToast } from './Toast';

interface Props {
  isReadOnly?: boolean;
  canEditSubmitted?: boolean;
}

export const AttendanceManager: React.FC<Props> = ({ isReadOnly = false, canEditSubmitted = false }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [dbState, setDbState] = useState(db.getRawState());
  useEffect(() => { db.fetchAllData().then(setDbState); }, []);

  // Filters
  const [course, setCourse] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('Period 1');

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Update dependent filters
  useEffect(() => {
    setBranch('');
    setYear('');
    setSemester('');
    setSection('');
  }, [course]);

  const loadStudents = () => {
    if (!course || !year || !section || !subjectId || !date || !period) {
      showToast('Please select all required filters.', 'error');
      return;
    }
    if (course === 'M.PHARM' && !branch) {
      showToast('Please select a branch.', 'error');
      return;
    }
    if (course !== 'PHARM.D' && !semester) {
      showToast('Please select a semester.', 'error');
      return;
    }

    // Check if attendance already exists
    const existing = db.getAttendanceByFilters(date, subjectId, period);
    
    // Check if it's the same class (course/year/section) - for prototype simplicity, we assume subjects are unique to a class
    // Or we just check if existing records have these students
    
    const fetchedStudents = db.getStudentsByFilters({ course, branch, year, semester, section });
    
    if (fetchedStudents.length === 0) {
      showToast('No students found for this selection.', 'error');
      setStudents([]);
      setExistingRecords([]);
      return;
    }

    setStudents(fetchedStudents);

    // If records exist for this subject/date/period, map them
    if (existing.length > 0) {
      const recordsMap: Record<string, 'Present' | 'Absent' | 'Late'> = {};
      let matchCount = 0;
      
      existing.forEach(record => {
        if (fetchedStudents.some(s => s.id === record.student_id)) {
          recordsMap[record.student_id] = record.status;
          matchCount++;
        }
      });

      if (matchCount > 0) {
        setExistingRecords(existing);
        setAttendanceData(recordsMap);
        showToast('Attendance has already been submitted for this class and period.', 'info');
        setIsEditing(false); // Locked by default if it exists
      } else {
        setExistingRecords([]);
        setAttendanceData({});
        setIsEditing(true); // New entry
      }
    } else {
      setExistingRecords([]);
      setAttendanceData({});
      setIsEditing(true);
    }
  };

  const handleMarkAll = (status: 'Present' | 'Absent') => {
    if (!isEditing) return;
    const newData: Record<string, 'Present' | 'Absent' | 'Late'> = {};
    students.forEach(s => {
      newData[s.id] = status;
    });
    setAttendanceData(newData);
  };

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    if (!isEditing) return;
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const saveAttendance = async () => {
    if (!isEditing) return;
    
    if (Object.keys(attendanceData).length !== students.length) {
      showToast('Please mark attendance for all students.', 'error');
      return;
    }

    try {
      if (existingRecords.length > 0 && canEditSubmitted) {
        // Handle Edit Workflow
        const reason = window.prompt("Enter reason for modifying this attendance record:");
        if (!reason) {
          showToast('Modification reason is required to edit attendance.', 'error');
          return;
        }

        // Update existing records
        for (const student of students) {
          const existingRecord = existingRecords.find(r => r.student_id === student.id);
          if (existingRecord && existingRecord.status !== attendanceData[student.id]) {
            await db.updateAttendanceRecord(existingRecord.id, { status: attendanceData[student.id] }, currentUser?.id || '', reason);
          }
        }
        showToast('Attendance records updated successfully.', 'success');
        setIsEditing(false);
        loadStudents(); // reload to get fresh records
        
      } else if (existingRecords.length === 0) {
        // Handle New Creation Workflow
        const recordsToSave = students.map(student => ({
          student_id: student.id,
          roll_number: student.roll_number || '',
          faculty_id: currentUser?.id || '',
          subject_id: subjectId,
          course,
          branch,
          year,
          semester,
          section,
          date,
          period,
          status: attendanceData[student.id]
        }));

        await db.saveAttendanceBatch(recordsToSave);
        showToast('Attendance submitted successfully.', 'success');
        setIsEditing(false);
        loadStudents(); // reload to get fresh records
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save attendance.', 'error');
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.roll_number && s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters Section */}
      <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
        <h3 className="text-lg font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
          <Search size={20} className="text-primary-500" />
          Filter Class
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div>
            <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Course</label>
            <select value={course} onChange={(e) => setCourse(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
              <option value="">Select Course</option>
              <option value="B.PHARM">B.PHARM</option>
              <option value="M.PHARM">M.PHARM</option>
              <option value="PHARM.D">PHARM.D</option>
            </select>
          </div>

          {course === 'M.PHARM' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Branch</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                <option value="">Select Branch</option>
                <option value="Regulatory Affairs">Regulatory Affairs</option>
                <option value="Pharmaceutical Analysis">Pharmaceutical Analysis</option>
                <option value="Pharmacology">Pharmacology</option>
                <option value="Pharmaceutics">Pharmaceutics</option>
              </select>
            </div>
          )}

          {course && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                <option value="">Select Year</option>
                <option value="I Year">I Year</option>
                <option value="II Year">II Year</option>
                {(course === 'B.PHARM' || course === 'PHARM.D') && (
                  <>
                    <option value="III Year">III Year</option>
                    <option value="IV Year">IV Year</option>
                  </>
                )}
                {course === 'PHARM.D' && (
                  <>
                    <option value="V Year">V Year</option>
                    <option value="VI Year">VI Year</option>
                  </>
                )}
              </select>
            </div>
          )}

          {(course === 'B.PHARM' || course === 'M.PHARM') && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                <option value="">Select Semester</option>
                <option value="I Semester">I Semester</option>
                <option value="II Semester">II Semester</option>
                <option value="III Semester">III Semester</option>
                <option value="IV Semester">IV Semester</option>
                {course === 'B.PHARM' && (
                  <>
                    <option value="V Semester">V Semester</option>
                    <option value="VI Semester">VI Semester</option>
                    <option value="VII Semester">VII Semester</option>
                    <option value="VIII Semester">VIII Semester</option>
                  </>
                )}
              </select>
            </div>
          )}

          {course && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                <option value="">Select Section</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                {course !== 'PHARM.D' && (
                  <>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </>
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Subject</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
              <option value="">Select Subject</option>
              {dbState.subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase mb-1">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
              {[1,2,3,4,5,6,7,8].map(p => (
                <option key={p} value={`Period ${p}`}>Period {p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={loadStudents} className="btn-primary flex items-center gap-2">
            <Users size={18} />
            Load Students
          </button>
        </div>
      </div>

      {/* Attendance Table Section */}
      {students.length > 0 && (
        <div className="glass rounded-2xl border border-navy-100 dark:border-navy-800 overflow-hidden flex flex-col animate-slide-up">
          <div className="p-4 border-b border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-navy-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-primary-500" />
              Mark Attendance ({students.length} Students)
            </h3>
            
            <div className="flex flex-wrap items-center gap-2">
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-2 border border-slate-200 dark:border-navy-800 rounded-lg text-sm bg-white dark:bg-navy-950 text-navy-900 dark:text-white w-40"
              />
              {isEditing && (
                <>
                  <button onClick={() => handleMarkAll('Present')} className="px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                    Mark All Present
                  </button>
                  <button onClick={() => handleMarkAll('Absent')} className="px-3 py-2 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                    Mark All Absent
                  </button>
                </>
              )}
            </div>
          </div>

          {!isEditing && existingRecords.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                <AlertCircle size={16} />
                <span>Attendance has already been submitted for this class and period.</span>
              </div>
              {canEditSubmitted && (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors">
                  <Edit size={14} />
                  Edit Records
                </button>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider bg-slate-50/50 dark:bg-navy-900/50">
                  <th className="p-4">Roll No</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-navy-900/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-primary-600 dark:text-primary-400 text-sm">
                      {student.roll_number}
                    </td>
                    <td className="p-4 font-bold text-navy-900 dark:text-white text-sm">
                      {student.name}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <label className={`flex items-center gap-2 cursor-pointer ${!isEditing ? 'opacity-70 pointer-events-none' : ''}`}>
                          <input 
                            type="radio" 
                            name={`status-${student.id}`} 
                            checked={attendanceData[student.id] === 'Present'}
                            onChange={() => handleStatusChange(student.id, 'Present')}
                            className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 border-slate-300"
                            disabled={!isEditing}
                          />
                          <span className={`text-sm font-semibold ${attendanceData[student.id] === 'Present' ? 'text-emerald-600 dark:text-emerald-400' : 'text-navy-500'}`}>Present</span>
                        </label>
                        <label className={`flex items-center gap-2 cursor-pointer ${!isEditing ? 'opacity-70 pointer-events-none' : ''}`}>
                          <input 
                            type="radio" 
                            name={`status-${student.id}`} 
                            checked={attendanceData[student.id] === 'Absent'}
                            onChange={() => handleStatusChange(student.id, 'Absent')}
                            className="w-4 h-4 text-red-500 focus:ring-red-500 border-slate-300"
                            disabled={!isEditing}
                          />
                          <span className={`text-sm font-semibold ${attendanceData[student.id] === 'Absent' ? 'text-red-600 dark:text-red-400' : 'text-navy-500'}`}>Absent</span>
                        </label>
                        <label className={`flex items-center gap-2 cursor-pointer ${!isEditing ? 'opacity-70 pointer-events-none' : ''}`}>
                          <input 
                            type="radio" 
                            name={`status-${student.id}`} 
                            checked={attendanceData[student.id] === 'Late'}
                            onChange={() => handleStatusChange(student.id, 'Late')}
                            className="w-4 h-4 text-amber-500 focus:ring-amber-500 border-slate-300"
                            disabled={!isEditing}
                          />
                          <span className={`text-sm font-semibold ${attendanceData[student.id] === 'Late' ? 'text-amber-600 dark:text-amber-400' : 'text-navy-500'}`}>Late</span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isEditing && (
            <div className="p-4 border-t border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-900 flex justify-end">
              <button onClick={saveAttendance} className="btn-primary flex items-center gap-2">
                <Save size={18} />
                Save Attendance
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
