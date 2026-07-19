import React, { useState } from 'react';
import { db } from '../services/db';
import type { TimetableSlot, Subject, SubjectAssignment, Faculty, User } from '../services/db';
import { useToast } from './Toast';
import { Plus, Trash2, CalendarDays, XCircle, Clock, MapPin } from 'lucide-react';

export const TimetableManagementTab: React.FC = () => {
  const { showToast } = useToast();
  const [dbState, setDbState] = useState(db.getRawState());
  
  // Cohort Filters
  const [filterCourse, setFilterCourse] = useState('B.PHARM');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterYear, setFilterYear] = useState('I Year');
  const [filterSemester, setFilterSemester] = useState('I Semester');
  const [filterSection, setFilterSection] = useState('A');

  React.useEffect(() => {
    setFilterBranch('');
    setFilterYear('');
    setFilterSemester('');
    setFilterSection('A');
  }, [filterCourse]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slotDay, setSlotDay] = useState('Monday');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [slotAssignmentId, setSlotAssignmentId] = useState('');
  const [slotRoom, setSlotRoom] = useState('');

  // 1. Identify all Subject Assignments that match the currently selected Cohort
  // A subject matches if its course, year, and semester match the filters.
  const matchingSubjects = dbState.subjects.filter(s => {
    if (s.course !== filterCourse) return false;
    if (filterCourse === 'M.PHARM' && s.branch !== filterBranch) return false;
    if (s.year !== filterYear) return false;
    if ((filterCourse === 'B.PHARM' || filterCourse === 'M.PHARM') && s.semester !== filterSemester) return false;
    return true;
  });
  
  const matchingSubjectIds = matchingSubjects.map(s => s.id);

  // SubjectAssignments that point to those subjects
  const availableAssignments = dbState.subject_assignments.filter(
    sa => matchingSubjectIds.includes(sa.subject_id)
  );

  // 2. Identify all Timetable Slots for this Cohort
  const assignmentIds = availableAssignments.map(sa => sa.id);
  const cohortTimetable = dbState.timetable.filter(
    t => assignmentIds.includes(t.subject_assignment_id) && (t.section === filterSection || (!t.section && filterSection === 'A'))
  );

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotAssignmentId) {
      showToast('Please select a subject allocation.', 'error');
      return;
    }

    try {
      await db.createTimetableSlot({
        subject_assignment_id: slotAssignmentId,
        day_of_week: slotDay,
        start_time: slotStart,
        end_time: slotEnd,
        room: slotRoom || 'TBA',
        section: filterSection
      });
      showToast('Timetable slot added successfully!', 'success');
      setIsModalOpen(false);
      setSlotStart('');
      setSlotEnd('');
      setSlotRoom('');
      db.fetchAllData().then(setDbState);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Delete this timetable slot?')) return;
    try {
      await db.deleteTimetableSlot(id);
      showToast('Timetable slot removed');
      db.fetchAllData().then(setDbState);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Filters */}
      <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="text-primary-500" />
            Timetable Management
          </h2>
          <p className="text-sm text-navy-500 mt-1">Schedule classes and view timetables by academic cohort.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="p-2 border border-slate-200 dark:border-navy-700 rounded-xl bg-slate-50 dark:bg-navy-900 text-sm font-semibold text-navy-900 dark:text-white"
          >
            <option value="B.PHARM">B.PHARM</option>
            <option value="M.PHARM">M.PHARM</option>
            <option value="PHARM.D">PHARM.D</option>
          </select>

          {filterCourse === 'M.PHARM' && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="p-2 border border-slate-200 dark:border-navy-700 rounded-xl bg-slate-50 dark:bg-navy-900 text-sm font-semibold text-navy-900 dark:text-white"
            >
              <option value="" disabled>Select Branch</option>
              <option value="Regulatory Affairs">Regulatory Affairs</option>
              <option value="Pharmaceutical Analysis">Pharmaceutical Analysis</option>
              <option value="Pharmacology">Pharmacology</option>
              <option value="Pharmaceutics">Pharmaceutics</option>
            </select>
          )}

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="p-2 border border-slate-200 dark:border-navy-700 rounded-xl bg-slate-50 dark:bg-navy-900 text-sm font-semibold text-navy-900 dark:text-white"
          >
            <option value="" disabled>Select Year</option>
            <option value="I Year">I Year</option>
            <option value="II Year">II Year</option>
            {(filterCourse === 'B.PHARM' || filterCourse === 'PHARM.D') && (
              <>
                <option value="III Year">III Year</option>
                <option value="IV Year">IV Year</option>
              </>
            )}
            {filterCourse === 'PHARM.D' && (
              <>
                <option value="V Year">V Year</option>
                <option value="VI Year">VI Year</option>
              </>
            )}
          </select>

          {(filterCourse === 'B.PHARM' || filterCourse === 'M.PHARM') && (
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="p-2 border border-slate-200 dark:border-navy-700 rounded-xl bg-slate-50 dark:bg-navy-900 text-sm font-semibold text-navy-900 dark:text-white"
            >
              <option value="" disabled>Select Semester</option>
              <option value="I Semester">I Semester</option>
              <option value="II Semester">II Semester</option>
              <option value="III Semester">III Semester</option>
              <option value="IV Semester">IV Semester</option>
              {filterCourse === 'B.PHARM' && (
                <>
                  <option value="V Semester">V Semester</option>
                  <option value="VI Semester">VI Semester</option>
                  <option value="VII Semester">VII Semester</option>
                  <option value="VIII Semester">VIII Semester</option>
                </>
              )}
            </select>
          )}

          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="p-2 border border-slate-200 dark:border-navy-700 rounded-xl bg-slate-50 dark:bg-navy-900 text-sm font-semibold text-navy-900 dark:text-white"
          >
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
          >
            <Plus size={16} /> Add Class Slot
          </button>
        </div>
      </div>

      {/* Warning if no subjects mapped */}
      {availableAssignments.length === 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3">
          <XCircle className="shrink-0 mt-0.5" size={16} />
          <p>
            No active teaching allocations found for <strong>{filterCourse} • {filterYear} • {filterSemester}</strong>. 
            You must assign subjects to faculty (via the <em>Subjects & Loads</em> tab) before you can build a timetable.
          </p>
        </div>
      )}

      {/* Timetable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {daysOfWeek.map(day => {
          const daySlots = cohortTimetable
            .filter(t => t.day_of_week === day)
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
                    const sa = availableAssignments.find(a => a.id === slot.subject_assignment_id);
                    const subject = matchingSubjects.find(s => s.id === sa?.subject_id);
                    const faculty = dbState.faculty.find(f => f.id === sa?.faculty_id);
                    const user = dbState.users.find(u => u.id === faculty?.user_id);

                    return (
                      <div key={slot.id} className="relative group p-3.5 bg-slate-50 dark:bg-navy-950/60 rounded-xl border border-slate-100 dark:border-navy-850">
                        <button 
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="absolute top-2 right-2 p-1 text-navy-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove Slot"
                        >
                          <Trash2 size={14} />
                        </button>
                        
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-navy-800">
              <h4 className="font-extrabold text-navy-950 dark:text-white text-base">
                Schedule Class Slot
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded bg-slate-50 dark:bg-navy-950 text-navy-450 hover:text-navy-950"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Day</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    placeholder="e.g. Room 402"
                    className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Subject & Faculty</label>
                <select
                  required
                  value={slotAssignmentId}
                  onChange={(e) => setSlotAssignmentId(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                >
                  <option value="">-- Choose Subject Allocation --</option>
                  {availableAssignments.map(sa => {
                    const sub = matchingSubjects.find(s => s.id === sa.subject_id);
                    const fac = dbState.faculty.find(f => f.id === sa.faculty_id);
                    const usr = dbState.users.find(u => u.id === fac?.user_id);
                    return (
                      <option key={sa.id} value={sa.id}>
                        {sub?.name} ({sub?.code}) - {usr?.full_name}
                      </option>
                    )
                  })}
                </select>
                {availableAssignments.length === 0 && (
                  <div className="mt-2 text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30 leading-relaxed">
                    <p className="font-bold mb-1">No subjects found for this cohort.</p>
                    <p>Why? To appear here, a subject must:</p>
                    <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                      <li>Be mapped to a faculty in <strong>Subjects & Loads</strong></li>
                      <li>Have exactly matching properties: <strong>{filterCourse}</strong>, <strong>{filterYear}</strong>, and <strong>{filterSemester}</strong></li>
                    </ul>
                    <p className="mt-1 text-navy-500 dark:text-navy-400">If you created a subject without setting its Course, Year, or Semester, delete and re-create it with those fields filled out.</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm mt-2"
              >
                Save Schedule Slot
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
