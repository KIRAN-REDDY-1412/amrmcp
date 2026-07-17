import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { AttendanceRecord, MarkRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StudentManagementTab } from '../../components/StudentManagementTab';
import { AttendanceManager } from '../../components/AttendanceManager';
import {
  Plus,
  Trash2,
  CalendarDays,
  FileCheck,
  Building,
  Save,
  Check,
  X,
  AlertCircle,
  Banknote
} from 'lucide-react';

interface DashboardProps {
  activeTab: string;
  searchFilter?: string;
  onTabChange?: (tabId: string) => void;
}

export const FacultyDashboard: React.FC<DashboardProps> = ({ activeTab, searchFilter }) => {
  const { currentUser, facultyProfile, updateProfileDetails } = useAuth();
  const { showToast } = useToast();

  const [dbState, setDbState] = useState(db.getRawState());
  const [activeModal, setActiveModal] = useState<'apply_leave' | 'add_slot' | null>(null);

  // Profile Edit fields
  const [facPhone, setFacPhone] = useState(facultyProfile?.phone || '');
  const [facQual, setFacQual] = useState(facultyProfile?.qualifications || '');
  const [facDesg, setFacDesg] = useState(facultyProfile?.designation || '');

  // Leaves Form fields
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('Sick');
  const [leaveReason, setLeaveReason] = useState('');

  // Marks Form states
  const [selectedMarkSubId, setSelectedMarkSubId] = useState('');
  const [examType, setExamType] = useState<'Internal' | 'Mid-term' | 'End-term'>('Internal');
  const [marksValues, setMarksValues] = useState<Record<string, number>>({});
  const [maxMarks, setMaxMarks] = useState<number>(100);

  // Timetable Slot Form states
  const [newSlotDay, setNewSlotDay] = useState('Monday');
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('10:00');
  const [newSlotRoom, setNewSlotRoom] = useState('Room 101');
  const [newSlotAssignId, setNewSlotAssignId] = useState('');

  useEffect(() => {
    setDbState(db.getRawState());
  }, [activeModal]);

  const triggerStateRefresh = () => {
    setDbState({ ...db.getRawState() });
  };

  if (!facultyProfile) {
    return (
      <div className="glass p-8 rounded-2xl border border-red-200 text-center animate-fade-in">
        <Building className="mx-auto w-12 h-12 text-red-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-navy-950 dark:text-white">Profile Config Error</h3>
        <p className="text-sm text-navy-450 mt-1">
          No faculty profile details found. HOD must assign your profile to a department before you can access the system.
        </p>
      </div>
    );
  }

  const myDeptId = facultyProfile.department_id;
  const myDept = dbState.departments.find((d) => d.id === myDeptId);
  const myFacultyId = facultyProfile.id;

  // 1. Retrieve Assigned Subjects
  const myAssignments = dbState.subject_assignments.filter((sa) => sa.faculty_id === myFacultyId);
  const myAssignedSubjects = dbState.subjects.filter((sub) =>
    myAssignments.some((sa) => sa.subject_id === sub.id)
  );

  // 2. Retrieve Department Students
  const myDeptStudents = dbState.students.filter((s) => s.department_id === myDeptId);

  // 3. Timetable
  const myTimetable = db.getTimetableForFaculty(myFacultyId);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileDetails({ phone: facPhone, qualifications: facQual, designation: facDesg });
      showToast('Faculty profile details updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    }
  };

  // Submit Leave Request
  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) return;

    try {
      await db.createLeaveRequest({
        user_id: currentUser!.id,
        start_date: leaveStart,
        end_date: leaveEnd,
        type: leaveType,
        reason: leaveReason,
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Submit Leave Application',
        `Faculty submitted leave request from ${leaveStart} to ${leaveEnd}`
      );
      showToast('Leave request submitted successfully.', 'success');
      setActiveModal(null);
      triggerStateRefresh();

      // Reset
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave request.', 'error');
    }
  };

  // Load students and initialize marks state
  const handleLoadMarksList = () => {
    if (!selectedMarkSubId) return;

    const existing = dbState.marks.filter(
      (m) => m.subject_id === selectedMarkSubId && m.exam_type === examType
    );

    const initialMarks: Record<string, number> = {};
    let initialMax = 100;

    myDeptStudents.forEach((student) => {
      const match = existing.find((e) => e.student_id === student.id);
      initialMarks[student.id] = match ? match.marks_obtained : 0;
      if (match) initialMax = match.max_marks;
    });

    setMarksValues(initialMarks);
    setMaxMarks(initialMax);
  };

  useEffect(() => {
    handleLoadMarksList();
  }, [selectedMarkSubId, examType, dbState.marks]);

  const handleMarkChange = (studentId: string, val: string) => {
    const num = Math.min(Math.max(parseFloat(val) || 0, 0), maxMarks);
    setMarksValues((prev) => ({
      ...prev,
      [studentId]: num,
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedMarkSubId) {
      showToast('Select a subject first.', 'warning');
      return;
    }

    const records: Omit<MarkRecord, 'id'>[] = Object.entries(marksValues).map(
      ([studentId, marks_obtained]) => ({
        subject_id: selectedMarkSubId,
        student_id: studentId,
        exam_type: examType,
        marks_obtained,
        max_marks: maxMarks,
      })
    );

    try {
      await db.saveMarksBatch(records);
      showToast('Grade book saved successfully.', 'success');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save marks.', 'error');
    }
  };

  // Timetable Class Slot Actions
  const handleAddTimetableSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotAssignId) return;

    try {
      await db.createTimetableSlot({
        subject_assignment_id: newSlotAssignId,
        day_of_week: newSlotDay,
        start_time: newSlotStart,
        end_time: newSlotEnd,
        room: newSlotRoom,
      });

      showToast('Timetable class slot scheduled.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule slot.', 'error');
    }
  };

  const handleDeleteTimetableSlot = async (id: string) => {
    if (window.confirm('Cancel this scheduled class slot?')) {
      try {
        await db.deleteTimetableSlot(id);
        showToast('Class slot removed from schedule.', 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete slot.', 'error');
      }
    }
  };

  const myLeaves = dbState.leave_requests.filter((lr) => lr.user_id === currentUser?.id);

  return (
    <div className="space-y-6">
      
      {/* 1. OVERVIEW / PROFILE TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="p-5 glass border border-primary-500/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-[10px] uppercase font-extrabold tracking-widest text-primary-500 bg-primary-500/5 px-2.5 py-1 rounded-full self-start">
                FACULTY DOSSIER
              </p>
              <h2 className="text-xl font-black text-navy-950 dark:text-white mt-2 uppercase">
                {currentUser?.full_name}
              </h2>
              <p className="text-xs text-navy-450 dark:text-navy-400 mt-1">
                Department of {myDept?.name || 'N/A'} • Joined: {facultyProfile.joining_date}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Edit qualifications / profile */}
            <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
              <h3 className="font-bold text-navy-950 dark:text-white text-base mb-4 pb-2.5 border-b border-slate-100 dark:border-navy-850">
                Update Professional Details
              </h3>
              
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-500 uppercase">Designation</label>
                  <input
                    type="text"
                    required
                    value={facDesg}
                    onChange={(e) => setFacDesg(e.target.value)}
                    placeholder="Lecturer / Assistant Professor"
                    className="mt-1.5 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-500 uppercase">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={facPhone}
                    onChange={(e) => setFacPhone(e.target.value)}
                    placeholder="Phone"
                    className="mt-1.5 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-500 uppercase">Academic Qualifications</label>
                  <input
                    type="text"
                    required
                    value={facQual}
                    onChange={(e) => setFacQual(e.target.value)}
                    placeholder="M.Pharm, Ph.D"
                    className="mt-1.5 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md mt-2"
                >
                  <Save size={14} /> Update Contact Info
                </button>
              </form>
            </div>

            {/* My Salary Display */}
            <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col justify-between mt-6 lg:mt-0 lg:col-span-1">
              <div>
                <h4 className="font-bold text-navy-900 dark:text-white text-base mb-4 flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-navy-850">
                  <Banknote className="text-primary-500" size={18} /> My Compensation
                </h4>
                <div className="bg-slate-50 dark:bg-navy-950/60 p-4 rounded-xl border border-slate-200 dark:border-navy-800 flex flex-col gap-3">
                  <div className="flex justify-between text-sm font-semibold text-navy-600 dark:text-navy-400">
                    <span>Base Salary:</span>
                    <span className="font-mono">₹{(facultyProfile.base_salary || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-red-500">
                    <span>Leave Deductions:</span>
                    <span className="font-mono">-₹{(facultyProfile.deductions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-emerald-600 dark:text-emerald-400 mt-2 pt-3 border-t border-slate-200 dark:border-navy-800">
                    <span>Net Pay:</span>
                    <span className="font-mono">₹{((facultyProfile.base_salary || 0) - (facultyProfile.deductions || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Allocated teaching subjects */}
            <div className="lg:col-span-2 glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-navy-950 dark:text-white text-base mb-4 pb-2.5 border-b border-slate-100 dark:border-navy-850">
                  Assigned Pharmacy Subjects
                </h3>

                {myAssignedSubjects.length === 0 ? (
                  <div className="py-12 text-center text-sm text-navy-450">
                    No course subjects assigned. Contact your department HOD to map subjects.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myAssignedSubjects.map((sub) => {
                      const assign = myAssignments.find((sa) => sa.subject_id === sub.id)!;
                      return (
                        <div key={sub.id} className="p-4 bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-850 rounded-xl">
                          <p className="font-bold text-sm text-navy-950 dark:text-white">{sub.name}</p>
                          <p className="text-[10px] text-primary-500 font-bold mt-1 uppercase font-mono">{sub.code}</p>
                          <p className="text-[10px] text-navy-450 mt-1">Credits: {sub.credits} • Term: {assign.semester}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TIMETABLE TAB */}
      {activeTab === 'timetable' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">Class Lecture Timetable</h3>
              <p className="text-xs text-navy-400">View and schedule classes for assigned pharmacy courses</p>
            </div>
            
            {myAssignedSubjects.length > 0 && (
              <button
                onClick={() => setActiveModal('add_slot')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
              >
                <Plus size={16} /> Schedule Class
              </button>
            )}
          </div>

          {myTimetable.length === 0 ? (
            <div className="py-16 text-center text-navy-455">
              <CalendarDays className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700 animate-pulse-subtle" />
              <p className="font-medium text-sm">No classes scheduled.</p>
              <p className="text-xs mt-1">Schedule timetable slots to display class lecture hours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                const daySlots = myTimetable.filter((t) => t.day_of_week === day);
                if (daySlots.length === 0) return null;
                
                return (
                  <div key={day} className="p-4 bg-slate-50 dark:bg-navy-950/60 rounded-2xl border border-slate-100 dark:border-navy-850 space-y-3">
                    <h4 className="font-bold text-sm text-primary-600 tracking-wide border-b border-slate-100 dark:border-navy-800 pb-1.5">{day}</h4>
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="p-3 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl text-xs flex justify-between items-start shadow-sm">
                          <div>
                            <p className="font-bold text-navy-900 dark:text-white leading-tight">{slot.subjectName}</p>
                            <p className="text-[10px] text-navy-400 mt-1">{slot.start_time} - {slot.end_time} • Room: {slot.room}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteTimetableSlot(slot.id)}
                            className="p-1 text-navy-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2.5. STUDENTS MANAGEMENT */}
      {activeTab === 'students' && (
        <StudentManagementTab searchFilter={searchFilter || ''} />
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-navy-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-800 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-navy-900 dark:text-white">Student Attendance</h2>
              <p className="text-sm text-navy-500 mt-1">Manage daily attendance for your classes</p>
            </div>
          </div>
          <AttendanceManager canEditSubmitted={false} />
        </div>
      )}

      {/* 4. MARKS ENTRY TAB */}
      {activeTab === 'marks' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-navy-900 dark:text-white font-bold text-lg">Upload Examination Marks</h3>
            <p className="text-xs text-navy-400">Record Internal, Mid-term, and End-term scores for students</p>
          </div>

          {myAssignedSubjects.length === 0 ? (
            <div className="py-16 text-center text-navy-450 bg-slate-50 dark:bg-navy-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-navy-800">
              <AlertCircle className="mx-auto w-10 h-10 text-navy-300 dark:text-navy-700 mb-2" />
              <p className="font-bold text-sm">No Subjects Allocated</p>
              <p className="text-xs mt-1 text-navy-400">Subjects must be allocated before grades can be uploaded.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-850 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-navy-500 uppercase">Subject</label>
                  <select
                    value={selectedMarkSubId}
                    onChange={(e) => setSelectedMarkSubId(e.target.value)}
                    className="mt-1 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-xs font-semibold text-navy-900 dark:text-white"
                  >
                    <option value="">-- Choose Subject --</option>
                    {myAssignedSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-500 uppercase">Examination Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as any)}
                    className="mt-1 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-xs font-semibold text-navy-900 dark:text-white"
                  >
                    <option value="Internal">Internal Assessment</option>
                    <option value="Mid-term">Mid-Term Exam</option>
                    <option value="End-term">End-Term Semestral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-500 uppercase">Max Score Cap</label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-xs font-semibold text-navy-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Marks inputs */}
              {!selectedMarkSubId ? (
                <div className="py-12 text-center text-xs text-navy-455 bg-slate-50/50 dark:bg-navy-950/20 rounded-2xl">
                  Choose a subject and exam type to enter student scores.
                </div>
              ) : myDeptStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-navy-450">
                  No students registered in your department.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                          <th className="pb-3 pl-2">Student Name</th>
                          <th className="pb-3">Roll Number</th>
                          <th className="pb-3 pr-2 text-right">Marks Obtained / Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                        {myDeptStudents.map((student) => {
                          const val = marksValues[student.id] || 0;
                          return (
                            <tr key={student.id} className="text-navy-950 dark:text-navy-200">
                              <td className="py-3 pl-2 font-bold">{student.name}</td>
                              <td className="py-3 text-xs font-mono font-bold text-primary-500">{student.roll_number}</td>
                              <td className="py-3 pr-2 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={maxMarks}
                                    value={val}
                                    onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                    className="w-20 p-1.5 border border-slate-200 dark:border-navy-800 rounded-lg text-center bg-slate-50 dark:bg-navy-950 text-xs text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                  <span className="text-xs text-navy-400 font-bold">/ {maxMarks}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-navy-800">
                    <button
                      onClick={handleSaveMarks}
                      className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20"
                    >
                      Upload Marks Ledger
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. APPLY LEAVE TAB */}
      {activeTab === 'leaves' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">Leave Request Registry</h3>
              <p className="text-xs text-navy-400">File leave applications and track approval statuses</p>
            </div>
            <button
              onClick={() => setActiveModal('apply_leave')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
            >
              <Plus size={16} /> File Leave
            </button>
          </div>

          {myLeaves.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <FileCheck className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-medium text-sm">No leave applications filed.</p>
              <p className="text-xs mt-1 font-normal">Applications you submit will show up in this log.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2">Type</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3">Dates Duration</th>
                    <th className="pb-3">Filed on</th>
                    <th className="pb-3 pr-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                  {myLeaves.map((lr) => (
                    <tr key={lr.id} className="text-navy-900 dark:text-navy-200">
                      <td className="py-3.5 pl-2 font-bold">{lr.type}</td>
                      <td className="py-3.5 text-xs text-navy-500 max-w-xs truncate">{lr.reason}</td>
                      <td className="py-3.5 text-xs font-bold text-navy-900 dark:text-white">
                        {lr.start_date} <span className="text-navy-400 font-normal">to</span> {lr.end_date}
                      </td>
                      <td className="py-3.5 text-xs text-navy-450">{new Date(lr.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 pr-2 text-right">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          lr.status === 'Approved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                            : lr.status === 'Rejected'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                            : 'bg-amber-100 text-amber-705 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {lr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =======================================================
          MODAL INTERFACES (FACULTY OVERLAYS)
          ======================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-navy-800">
              <h4 className="font-extrabold text-navy-950 dark:text-white text-base">
                {activeModal === 'apply_leave' && 'Submit Leave Application'}
                {activeModal === 'add_slot' && 'Schedule Timetable Class'}
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded bg-slate-50 dark:bg-navy-950 text-navy-450 hover:text-navy-950"
              >
                <X size={20} />
              </button>
            </div>

            {/* A. Apply Leave Form */}
            {activeModal === 'apply_leave' && (
              <form onSubmit={handleApplyLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Leave Category</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="Sick">Sick Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Earned">Earned Leave</option>
                    <option value="Maternity">Maternity Leave</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveStart}
                      onChange={(e) => setLeaveStart(e.target.value)}
                      className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      required
                      value={leaveEnd}
                      onChange={(e) => setLeaveEnd(e.target.value)}
                      className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Reason for Leave</label>
                  <textarea
                    required
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Provide details about your leave application..."
                    className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    rows={4}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  File Application
                </button>
              </form>
            )}

            {/* B. Add Timetable Slot Form */}
            {activeModal === 'add_slot' && (
              <form onSubmit={handleAddTimetableSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Assigned Subject</label>
                  <select
                    required
                    value={newSlotAssignId}
                    onChange={(e) => setNewSlotAssignId(e.target.value)}
                    className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="">-- Select Subject --</option>
                    {myAssignments.map((sa) => {
                      const s = dbState.subjects.find((sub) => sub.id === sa.subject_id);
                      return (
                        <option key={sa.id} value={sa.id}>
                          {s?.name} ({s?.code})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Weekday</label>
                    <select
                      value={newSlotDay}
                      onChange={(e) => setNewSlotDay(e.target.value)}
                      className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Classroom / Laboratory</label>
                    <input
                      type="text"
                      required
                      value={newSlotRoom}
                      onChange={(e) => setNewSlotRoom(e.target.value)}
                      placeholder="e.g. Room 102"
                      className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Start Time</label>
                    <input
                      type="text"
                      required
                      value={newSlotStart}
                      onChange={(e) => setNewSlotStart(e.target.value)}
                      placeholder="e.g. 09:00"
                      className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">End Time</label>
                    <input
                      type="text"
                      required
                      value={newSlotEnd}
                      onChange={(e) => setNewSlotEnd(e.target.value)}
                      placeholder="e.g. 10:00"
                      className="mt-1.5 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Schedule Class Lecture
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
