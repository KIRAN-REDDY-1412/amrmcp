import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Phone, UserCheck, Building, Clock, MapPin, Search, Calendar as CalendarIcon, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { db } from '../../services/db';

interface Props {
  activeTab: string;
}

export const StudentDashboard: React.FC<Props> = ({ activeTab }) => {
  const { currentUser, studentProfile } = useAuth();
  const [dbState, setDbState] = useState(db.getRawState());
  useEffect(() => { db.fetchAllData().then(setDbState); }, []);

  if (!currentUser || !studentProfile) {
    return (
      <div className="glass p-8 rounded-2xl border border-red-200 text-center animate-fade-in">
        <GraduationCap className="mx-auto w-12 h-12 text-red-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-navy-950 dark:text-white">Profile Config Error</h3>
        <p className="text-sm text-navy-450 mt-1">
          No student profile found for this account.
        </p>
      </div>
    );
  }

  const dept = dbState.departments.find(d => d.id === studentProfile.department_id);

  // --- Attendance State ---
  const [attendanceViewType, setAttendanceViewType] = useState<'Daily' | 'Monthly' | 'Overall'>('Daily');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendancePeriod, setAttendancePeriod] = useState('Period 1');
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM

  // --- Marks State ---
  const [marksCourse, setMarksCourse] = useState(studentProfile.course || 'B.PHARM');
  const [marksYear, setMarksYear] = useState(studentProfile.year || 'I Year');
  const [marksSemester, setMarksSemester] = useState(studentProfile.semester || 'I Semester');
  const [marksSection, setMarksSection] = useState(studentProfile.section || 'A');
  const [marksDepartment, setMarksDepartment] = useState(dept?.name || '');

  // Course specific options
  const getYearsForCourse = (course: string) => {
    if (course === 'M.PHARM') return ['I Year', 'II Year'];
    if (course === 'PHARM.D') return ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year', 'VI Year'];
    return ['I Year', 'II Year', 'III Year', 'IV Year']; // B.PHARM
  };

  const getSemestersForCourse = (course: string) => {
    if (course === 'PHARM.D') return [];
    if (course === 'M.PHARM') return ['I Semester', 'II Semester', 'III Semester', 'IV Semester'];
    return ['I Semester', 'II Semester', 'III Semester', 'IV Semester', 'V Semester', 'VI Semester', 'VII Semester', 'VIII Semester']; // B.PHARM
  };

  const getInternalExamType = (uiExamType: string) => {
    if (uiExamType.startsWith('Mid')) return 'Mid-term';
    return 'End-term';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 glass border border-primary-500/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[10px] uppercase font-extrabold tracking-widest text-primary-500 bg-primary-500/5 px-2.5 py-1 rounded-full self-start">
            STUDENT PORTAL
          </p>
          <h2 className="text-xl font-black text-navy-950 dark:text-white mt-2 uppercase">
            {currentUser.full_name}
          </h2>
          <p className="text-xs text-navy-450 dark:text-navy-400 mt-1 flex items-center gap-2">
            <span className="font-mono text-primary-600 font-bold">{studentProfile.roll_number}</span>
            <span>•</span>
            <span>{studentProfile.course || 'B.Pharmacy'}</span>
          </p>
        </div>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-4">
            <h3 className="font-bold text-navy-950 dark:text-white text-base border-b border-slate-100 dark:border-navy-850 pb-2">
              Academic Information
            </h3>
            
            <div className="flex items-center gap-3 text-sm text-navy-700 dark:text-navy-300">
              <Building size={16} className="text-primary-500" />
              <span className="font-semibold w-24">Department:</span>
              <span>{dept?.name || 'Unknown'}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-navy-700 dark:text-navy-300">
              <UserCheck size={16} className="text-primary-500" />
              <span className="font-semibold w-24">Enrolled On:</span>
              <span>{new Date(studentProfile.enrollment_date).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-4">
            <h3 className="font-bold text-navy-950 dark:text-white text-base border-b border-slate-100 dark:border-navy-850 pb-2">
              Contact Details
            </h3>
            
            <div className="flex items-center gap-3 text-sm text-navy-700 dark:text-navy-300">
              <Phone size={16} className="text-primary-500" />
              <span className="font-semibold w-24">Phone:</span>
              <span>{studentProfile.phone || 'N/A'}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-navy-700 dark:text-navy-300">
              <UserCheck size={16} className="text-primary-500" />
              <span className="font-semibold w-24">Guardian:</span>
              <span>{studentProfile.guardian_name || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. TIMETABLE TAB */}
      {activeTab === 'timetable' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
                My Timetable
              </h2>
              <p className="text-sm text-navy-500 mt-1">
                Your class schedule for {studentProfile.course} • {studentProfile.year} • {studentProfile.semester}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
              // Filter to get subjects for this student's cohort
              const matchingSubjects = dbState.subjects.filter(
                s => s.course === studentProfile.course && s.year === studentProfile.year && s.semester === studentProfile.semester
              );
              const subjectIds = matchingSubjects.map(s => s.id);
              
              const relevantAssignments = dbState.subject_assignments.filter(
                sa => subjectIds.includes(sa.subject_id)
              );
              const assignmentIds = relevantAssignments.map(sa => sa.id);

              const daySlots = dbState.timetable
                .filter(t => t.day_of_week === day && assignmentIds.includes(t.subject_assignment_id))
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              return (
                <div key={day} className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col h-full">
                  <h4 className="font-bold text-navy-900 dark:text-white text-base mb-4 border-b border-slate-100 dark:border-navy-850 pb-2">
                    {day}
                  </h4>

                  {daySlots.length === 0 ? (
                    <div className="py-8 text-center text-xs text-navy-400 m-auto">
                      No classes scheduled
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1">
                      {daySlots.map(slot => {
                        const sa = relevantAssignments.find(a => a.id === slot.subject_assignment_id);
                        const subject = matchingSubjects.find(s => s.id === sa?.subject_id);
                        const faculty = dbState.faculty.find(f => f.id === sa?.faculty_id);
                        const user = dbState.users.find(u => u.id === faculty?.user_id);

                        return (
                          <div key={slot.id} className="p-3.5 bg-slate-50 dark:bg-navy-950/60 rounded-xl border border-slate-100 dark:border-navy-850">
                            <p className="font-bold text-sm text-navy-950 dark:text-white pr-6 leading-tight">
                              {subject?.name || 'Unknown Subject'}
                            </p>
                            <p className="text-[10px] text-navy-500 mt-1 uppercase font-bold tracking-wider">
                              {subject?.code}
                            </p>
                            
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-navy-800 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-navy-700 dark:text-navy-300">
                                <Clock size={12} className="text-primary-500" />
                                <span>{slot.start_time} - {slot.end_time}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-navy-700 dark:text-navy-300">
                                <div className="flex items-center gap-1.5 truncate">
                                  <MapPin size={12} className="text-primary-500 shrink-0" />
                                  <span className="truncate">{user?.full_name || 'TBA'}</span>
                                </div>
                                <span className="font-mono bg-slate-200 dark:bg-navy-800 px-1.5 py-0.5 rounded text-[10px]">
                                  {slot.room}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
                  My Attendance
                </h2>
                <p className="text-sm text-navy-500 mt-1">Track your presence across all enrolled subjects.</p>
              </div>
              <select
                value={attendanceViewType}
                onChange={(e) => setAttendanceViewType(e.target.value as any)}
                className="w-full sm:w-auto p-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-lg text-sm text-navy-900 dark:text-white"
              >
                <option value="Daily">Daily</option>
                <option value="Monthly">Monthly</option>
                <option value="Overall">Overall</option>
              </select>
            </div>

            {/* Attendance Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-navy-950/50 rounded-xl border border-slate-200 dark:border-navy-800 mb-6">
              {attendanceViewType === 'Daily' && (
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-navy-500 uppercase tracking-wider mb-1">Date</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-lg text-sm text-navy-900 dark:text-white"
                    />
                  </div>
              )}
              {attendanceViewType === 'Monthly' && (
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] font-bold text-navy-500 uppercase tracking-wider mb-1">Month</label>
                  <input
                    type="month"
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-lg text-sm text-navy-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Mock Display Logic - Since we don't have real data attached easily */}
            {attendanceViewType === 'Daily' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(period => {
                  // Fake logic to make a couple random ones absent based on date + period + student ID
                  const seed = (studentProfile.id.charCodeAt(0) + attendanceDate.charCodeAt(attendanceDate.length - 1) + period) % 10;
                  const isPresent = seed > 2; // ~70% chance of being present
                  
                  return (
                    <div key={period} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-navy-950 rounded-xl border border-slate-200 dark:border-navy-800">
                      <div>
                        <p className="text-[10px] font-bold text-navy-400 uppercase tracking-wider">Period {period}</p>
                        <p className="font-bold text-navy-900 dark:text-white mt-0.5">Subject {period}</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isPresent ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {isPresent ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span>{isPresent ? 'Present' : 'Absent'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-navy-800 rounded-xl">
                <CalendarIcon className="mx-auto h-10 w-10 text-navy-300 dark:text-navy-700 mb-3" />
                <h3 className="font-bold text-navy-900 dark:text-white">Attendance Records</h3>
                <p className="text-sm text-navy-500 mt-1 max-w-sm mx-auto">
                  {attendanceViewType === 'Monthly'
                    ? `Showing aggregated attendance for ${attendanceMonth}`
                    : `Showing overall academic year attendance`}
                </p>
                
                <div className="mt-6 flex justify-center gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2 border border-green-200 dark:border-green-800">
                      <span className="text-xl font-black text-green-600 dark:text-green-400">85%</span>
                    </div>
                    <span className="text-xs font-bold text-navy-600 dark:text-navy-400">Present</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MARKS TAB */}
      {activeTab === 'marks' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
                  My Marks
                </h2>
                <p className="text-sm text-navy-500 mt-1">Review your examination scores and academic performance.</p>
              </div>
            </div>

            {/* Marks Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-navy-950/50 rounded-xl border border-slate-200 dark:border-navy-800 mb-6">
              <div className="text-sm font-bold text-navy-900 dark:text-white">
                Current Curriculum: <span className="text-primary-500">{marksCourse} • {marksYear} {marksCourse !== 'PHARM.D' ? `• ${marksSemester}` : ''}</span>
              </div>
            </div>

            {/* Marks Display Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2">Subject Code</th>
                    <th className="pb-3">Subject Name</th>
                    <th className="pb-3 text-center">Mid-1</th>
                    <th className="pb-3 text-center">Mid-2</th>
                    {marksCourse === 'PHARM.D' && (
                      <th className="pb-3 text-center">Mid-3</th>
                    )}
                    <th className="pb-3 text-center">Avg</th>
                    <th className="pb-3 text-center">CMM</th>
                    <th className="pb-3 text-center">Int. Total</th>
                    <th className="pb-3 text-center border-l border-slate-200 dark:border-navy-800">Sem Marks</th>
                    <th className="pb-3 pr-2 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                  {dbState.subjects
                    .filter(s => s.course === marksCourse && s.year === marksYear && s.semester === marksSemester)
                    .map((subject, idx) => {
                      const markRecord = dbState.marks.find(m => m.subject_id === subject.id && m.student_id === studentProfile.id);

                      const hasInternal = markRecord && markRecord.internal_status === 'Approved';
                      const hasSemester = markRecord && markRecord.semester_status === 'Approved';
                      const isPharmD = marksCourse === 'PHARM.D';

                      let mid1 = '-', mid2 = '-', mid3 = '-', avgStr = '-', cmm = '-', intTotal = '-';
                      let semMarks = '-', grandTotal = '-';
                      let internalTotalNum = 0;

                      if (hasInternal) {
                        const m1 = markRecord.mid1_marks || 0;
                        const m2 = markRecord.mid2_marks || 0;
                        const m3 = markRecord.mid3_marks || 0;
                        const c = markRecord.cmm_marks || 0;
                        
                        mid1 = String(m1);
                        mid2 = String(m2);
                        mid3 = String(m3);
                        cmm = String(c);
                        
                        let avg = 0;
                        if (isPharmD) {
                          avg = (m1 + m2 + m3) / 3;
                        } else {
                          avg = (m1 + m2) / 2;
                        }
                        avgStr = avg.toFixed(1);
                        internalTotalNum = avg + c;
                        intTotal = internalTotalNum.toFixed(1);
                      }

                      if (hasSemester) {
                        const s = markRecord.semester_marks || 0;
                        semMarks = String(s);
                        grandTotal = (internalTotalNum + s).toFixed(1);
                      }

                      return (
                        <tr key={subject.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                          <td className="py-4 pl-2 font-mono text-xs font-bold text-navy-500">{subject.code}</td>
                          <td className="py-4 font-bold">{subject.name}</td>
                          
                          <td className="py-4 text-center">{mid1}</td>
                          <td className="py-4 text-center">{mid2}</td>
                          {isPharmD && (
                            <td className="py-4 text-center">{mid3}</td>
                          )}
                          <td className="py-4 text-center text-navy-450 font-bold">{avgStr}</td>
                          <td className="py-4 text-center">{cmm}</td>
                          <td className="py-4 text-center font-bold text-primary-500">{intTotal}</td>
                          
                          <td className="py-4 text-center border-l border-slate-200 dark:border-navy-800 font-bold">{semMarks}</td>
                          <td className="py-4 pr-2 text-right">
                            {hasSemester ? (
                              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-navy-800 px-2 py-1 rounded text-xs font-bold">
                                {grandTotal}
                                <CheckCircle2 size={14} className="text-green-500" />
                              </span>
                            ) : (
                              <span className="text-xs text-navy-450 italic">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  
                  {/* Empty State */}
                  {dbState.subjects.filter(s => s.course === marksCourse && s.year === marksYear && s.semester === marksSemester).length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-navy-450">
                        <FileText className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
                        <p className="font-bold text-navy-900 dark:text-white">No Subjects Found</p>
                        <p className="text-xs mt-1">There are no subjects registered for this specific combination.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
