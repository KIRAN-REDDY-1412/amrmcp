import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Phone, UserCheck, Building, Clock, MapPin } from 'lucide-react';
import { db } from '../../services/db';

interface Props {
  activeTab: string;
}

export const StudentDashboard: React.FC<Props> = ({ activeTab }) => {
  const { currentUser, studentProfile } = useAuth();
  const dbState = db.getRawState();

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

    </div>
  );
};
