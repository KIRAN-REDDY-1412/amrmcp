import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { TimetableSlot, Student, SubjectAssignment, Subject } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Users, Save, CheckCircle2, XCircle, ArrowLeft, Check, X } from 'lucide-react';
import { useToast } from './Toast';

export const FacultyClassAttendance: React.FC = () => {
  const { currentUser, facultyProfile } = useAuth();
  const { showToast } = useToast();
  const dbState = db.getRawState();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  
  // States for marking attendance
  const [activeSection, setActiveSection] = useState<'A' | 'B'>('A');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Derived slot information
  const [slotSubject, setSlotSubject] = useState<Subject | null>(null);
  const [slotAssignment, setSlotAssignment] = useState<SubjectAssignment | null>(null);

  const getDayOfWeek = (dateString: string) => {
    const d = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
  };

  const selectedDay = getDayOfWeek(date);
  const myTimetable = db.getTimetableForFaculty(facultyProfile?.id || '').filter(t => t.day_of_week === selectedDay);

  const handleSlotClick = (slot: TimetableSlot) => {
    const assignment = dbState.subject_assignments.find(sa => sa.id === slot.subject_assignment_id);
    if (!assignment) return;
    
    const subject = dbState.subjects.find(s => s.id === assignment.subject_id);
    if (!subject) return;

    setSlotAssignment(assignment);
    setSlotSubject(subject);
    setSelectedSlot(slot);
    setAttendanceData({});
    setIsSaved(false);
  };

  useEffect(() => {
    if (!selectedSlot || !slotSubject) return;

    // Load students for the selected subject's parameters and active section
    const fetchedStudents = db.getStudentsByFilters({
      course: slotSubject.course || '',
      year: slotSubject.year || '',
      semester: slotSubject.semester || '',
      section: activeSection
    });

    setStudents(fetchedStudents);

    // Check if attendance already exists
    // Period name can just be the time slot for prototype, e.g., "09:00 - 10:00"
    const periodName = `${selectedSlot.start_time} - ${selectedSlot.end_time}`;
    const existing = db.getAttendanceByFilters(date, slotSubject.id, periodName);
    
    if (existing.length > 0) {
      const recordsMap: Record<string, 'Present' | 'Absent'> = {};
      let matchCount = 0;
      
      existing.forEach(record => {
        if (fetchedStudents.some(s => s.id === record.student_id)) {
          recordsMap[record.student_id] = record.status as 'Present' | 'Absent';
          matchCount++;
        }
      });

      if (matchCount > 0) {
        setAttendanceData(recordsMap);
        setIsSaved(true);
      } else {
        // No attendance marked for this specific section yet
        setAttendanceData({});
        setIsSaved(false);
      }
    } else {
      setAttendanceData({});
      setIsSaved(false);
    }
  }, [selectedSlot, slotSubject, activeSection, date, dbState.attendance]);

  const handleMarkAll = (status: 'Present' | 'Absent') => {
    const newData: Record<string, 'Present' | 'Absent'> = {};
    students.forEach(s => {
      newData[s.id] = status;
    });
    setAttendanceData(newData);
  };

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const saveAttendance = async () => {
    if (Object.keys(attendanceData).length !== students.length) {
      showToast('Please mark attendance for all students in this section.', 'error');
      return;
    }

    const periodName = `${selectedSlot!.start_time} - ${selectedSlot!.end_time}`;

    const recordsToSave = students.map(student => ({
      student_id: student.id,
      roll_number: student.roll_number || '',
      faculty_id: currentUser?.id || '',
      subject_id: slotSubject!.id,
      course: slotSubject!.course || '',
      branch: student.department_id || '', // simplified
      year: slotSubject!.year || '',
      semester: slotSubject!.semester || '',
      section: activeSection,
      date,
      period: periodName,
      status: attendanceData[student.id]
    }));

    try {
      await db.saveAttendanceBatch(recordsToSave);
      showToast('Attendance successfully saved.', 'success');
      setIsSaved(true);
      
      // Update local dbState variable without waiting for reload if needed, 
      // but saveAttendanceBatch already updates memory state in db.ts.
    } catch (err: any) {
      showToast(err.message || 'Failed to save attendance.', 'error');
    }
  };

  // 1. SELECT SLOT VIEW
  if (!selectedSlot) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-navy-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-800 gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy-900 dark:text-white">Class Attendance</h2>
            <p className="text-sm text-navy-500 mt-1">Select a class from your timetable to mark attendance</p>
          </div>
          <div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-2.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-sm font-bold text-navy-900 dark:text-white shadow-sm"
            />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
          <h3 className="font-bold text-navy-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-navy-800">
            {selectedDay} Schedule
          </h3>

          {myTimetable.length === 0 ? (
            <div className="py-16 text-center text-navy-450 border border-dashed border-slate-200 dark:border-navy-800 rounded-2xl">
              <CalendarDays className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-bold text-sm">No classes scheduled.</p>
              <p className="text-xs mt-1">You have no classes assigned for {selectedDay}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTimetable.map(slot => {
                // Find subject details to display
                const assign = dbState.subject_assignments.find(sa => sa.id === slot.subject_assignment_id);
                const sub = dbState.subjects.find(s => s.id === assign?.subject_id);
                
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className="flex flex-col text-left p-5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-2xl hover:border-primary-500 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between w-full items-center mb-2">
                      <span className="text-xs font-black text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">
                        {slot.start_time} - {slot.end_time}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-navy-400">Room: {slot.room}</span>
                    </div>
                    <h4 className="font-bold text-navy-900 dark:text-white group-hover:text-primary-600 transition-colors">
                      {sub?.name || 'Unknown Subject'}
                    </h4>
                    <p className="text-xs text-navy-500 mt-1">
                      {sub?.course} • {sub?.year} • {sub?.semester}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. TAKE ATTENDANCE VIEW
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button 
            onClick={() => setSelectedSlot(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Schedule
          </button>
          <h2 className="text-xl font-black text-navy-950 dark:text-white">
            {slotSubject?.name}
          </h2>
          <p className="text-sm text-navy-500 mt-1">
            {date} • {selectedSlot.start_time} - {selectedSlot.end_time} • {slotSubject?.course} {slotSubject?.year}
          </p>
        </div>

        {/* Section Toggle */}
        <div className="bg-slate-100 dark:bg-navy-950 p-1 rounded-xl flex border border-slate-200 dark:border-navy-800">
          <button
            onClick={() => setActiveSection('A')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              activeSection === 'A' 
                ? 'bg-white dark:bg-navy-800 text-primary-600 shadow-sm' 
                : 'text-navy-500 hover:text-navy-700 dark:hover:text-white'
            }`}
          >
            Section A
          </button>
          <button
            onClick={() => setActiveSection('B')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              activeSection === 'B' 
                ? 'bg-white dark:bg-navy-800 text-primary-600 shadow-sm' 
                : 'text-navy-500 hover:text-navy-700 dark:hover:text-white'
            }`}
          >
            Section B
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl border border-navy-100 dark:border-navy-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-900 flex justify-between items-center">
          <h3 className="font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-primary-500" />
            Section {activeSection} Roster ({students.length})
          </h3>
          
          <div className="flex gap-2">
            <button onClick={() => handleMarkAll('Present')} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
              All Present
            </button>
            <button onClick={() => handleMarkAll('Absent')} className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
              All Absent
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="py-12 text-center text-sm text-navy-450">
            No students found enrolled in this section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider bg-slate-50/50 dark:bg-navy-900/50">
                  <th className="p-4">Roll No</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4 text-right">Attendance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-navy-900/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-primary-600 dark:text-primary-400 text-sm w-32">
                      {student.roll_number}
                    </td>
                    <td className="p-4 font-bold text-navy-900 dark:text-white text-sm">
                      {student.name}
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button
                        onClick={() => handleStatusChange(student.id, 'Present')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          attendanceData[student.id] === 'Present'
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 dark:bg-navy-800 dark:text-navy-400 dark:hover:text-emerald-400'
                        }`}
                      >
                        <Check size={14} /> Present
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'Absent')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          attendanceData[student.id] === 'Absent'
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-slate-100 text-slate-500 hover:bg-red-50 dark:bg-navy-800 dark:text-navy-400 dark:hover:text-red-400'
                        }`}
                      >
                        <X size={14} /> Absent
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-900 flex justify-between items-center">
          <div>
            {isSaved && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={16} /> Attendance Saved
              </span>
            )}
          </div>
          <button 
            onClick={saveAttendance} 
            disabled={students.length === 0}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2"
          >
            <Save size={16} />
            Save Roster
          </button>
        </div>
      </div>
    </div>
  );
};
