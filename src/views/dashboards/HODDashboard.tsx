import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { User, Faculty, Student } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DonutChart, BarChart } from '../../components/Charts';
import {
  Building,
  Users,
  Plus,
  Trash2,
  Edit2,
  Lock,
  CheckCircle,
  XCircle,
  FileCheck,
  GraduationCap,
  Save,
  Contact,
  Banknote
} from 'lucide-react';

interface DashboardProps {
  activeTab: string;
  searchFilter: string;
  onTabChange?: (tabId: string) => void;
}

export const HODDashboard: React.FC<DashboardProps> = ({ activeTab, searchFilter }) => {
  const { currentUser, hodProfile, updateProfileDetails, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [dbState, setDbState] = useState(db.getRawState());
  const [activeModal, setActiveModal] = useState<'create_faculty' | 'edit_faculty' | 'reset_password' | 'create_student' | 'edit_student' | 'create_subject' | 'assign_subject' | null>(null);

  // Profile Edit fields
  const [hodPhone, setHodPhone] = useState(hodProfile?.phone || '');
  const [hodQual, setHodQual] = useState(hodProfile?.qualifications || '');

  // Selection states
  const [selectedFacultyUserId, setSelectedFacultyUserId] = useState<string | null>(null);
  const [selectedFacultyProfileId, setSelectedFacultyProfileId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Form Fields - Faculty
  const [facName, setFacName] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facPassword, setFacPassword] = useState('');
  const [facDesg, setFacDesg] = useState('Assistant Professor');
  const [facPhone, setFacPhone] = useState('');
  const [facQual, setFacQual] = useState('');

  // Form Fields - Student
  const [studName, setStudName] = useState('');
  const [studRoll, setStudRoll] = useState('');
  const [studPhone, setStudPhone] = useState('');
  const [studGuardian, setStudGuardian] = useState('');

  // Form Fields - Subject
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCredits, setSubCredits] = useState(3);

  // Form Fields - Assignment
  const [assignFacId, setAssignFacId] = useState('');
  const [assignSubId, setAssignSubId] = useState('');
  const [assignSem, setAssignSem] = useState('Semester I');
  const [assignYear, setAssignYear] = useState('2026-27');

  // Form Fields - Password Override
  const [newPasswordVal, setNewPasswordVal] = useState('');

  useEffect(() => {
    setDbState(db.getRawState());
  }, [activeModal]);

  const triggerStateRefresh = () => {
    setDbState({ ...db.getRawState() });
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileDetails({ phone: hodPhone, qualifications: hodQual });
      showToast('HOD profile updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    }
  };

  if (!hodProfile) {
    return (
      <div className="glass p-8 rounded-2xl border border-red-200 text-center animate-fade-in">
        <Building className="mx-auto w-12 h-12 text-red-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-navy-950 dark:text-white">Profile Config Error</h3>
        <p className="text-sm text-navy-450 mt-1">
          No HOD profile details are associated with this user. The Principal must assign your department first.
        </p>
      </div>
    );
  }

  const myDeptId = hodProfile.department_id;
  const myDept = dbState.departments.find((d) => d.id === myDeptId);

  // Create Faculty Account
  const handleCreateFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facName || !facEmail || !facPassword) return;

    // Check unique email
    const emailExists = db.getUsers().some((u) => u.email.toLowerCase() === facEmail.toLowerCase());
    if (emailExists) {
      showToast('Email is already registered.', 'error');
      return;
    }

    try {
      // Create Base User
      const newUser = await db.createUser({
        email: facEmail,
        password: facPassword,
        role: 'faculty',
        full_name: facName,
        is_active: true,
      });

      // Create Faculty Profile
      await db.createFacultyProfile({
        user_id: newUser.id,
        department_id: myDeptId,
        designation: facDesg,
        phone: facPhone,
        qualifications: facQual,
        joining_date: new Date().toISOString().split('T')[0],
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Create Faculty Account',
        `HOD created faculty account: ${facName} in department: ${myDept?.name}`
      );
      showToast(`Faculty account created for ${facName}.`, 'success');
      setActiveModal(null);
      triggerStateRefresh();

      // Clear
      setFacName('');
      setFacEmail('');
      setFacPassword('');
      setFacPhone('');
      setFacQual('');
      setFacDesg('Assistant Professor');
    } catch (err: any) {
      showToast(err.message || 'Failed to register faculty.', 'error');
    }
  };

  const handleEditFacultyOpen = (u: User, f: Faculty) => {
    setSelectedFacultyUserId(u.id);
    setSelectedFacultyProfileId(f.id);
    setFacName(u.full_name);
    setFacEmail(u.email);
    setFacPhone(f.phone);
    setFacQual(f.qualifications);
    setFacDesg(f.designation);
    setActiveModal('edit_faculty');
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyUserId || !selectedFacultyProfileId || !facName) return;

    try {
      await db.updateUser(selectedFacultyUserId, { full_name: facName });
      await db.updateFacultyProfile(selectedFacultyUserId, {
        phone: facPhone,
        qualifications: facQual,
        designation: facDesg,
      });

      showToast('Faculty profile updated successfully.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update faculty.', 'error');
    }
  };

  const handleDeleteFaculty = async (userId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove Faculty ${name}?`)) {
      try {
        await db.deleteUser(userId);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'Delete Faculty',
          `HOD deleted faculty profile for ${name}`
        );
        showToast('Faculty account removed.', 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete faculty.', 'error');
      }
    }
  };

  const handleResetPasswordOpen = (userId: string) => {
    setSelectedFacultyUserId(userId);
    setNewPasswordVal('');
    setActiveModal('reset_password');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyUserId || !newPasswordVal) return;
    try {
      await resetPassword(selectedFacultyUserId, newPasswordVal);
      showToast('Faculty password reset link sent to email.', 'success');
      setActiveModal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    }
  };

  // Student Actions
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studName || !studRoll) return;

    const rollExists = dbState.students.some((s) => s.roll_number.toLowerCase() === studRoll.toLowerCase());
    if (rollExists) {
      showToast('Roll number already exists.', 'error');
      return;
    }

    try {
      await db.createStudent({
        name: studName,
        roll_number: studRoll,
        department_id: myDeptId,
        phone: studPhone,
        guardian_name: studGuardian,
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Create Student',
        `HOD registered student: ${studName} (Roll: ${studRoll}) in dept: ${myDept?.name}`
      );
      showToast(`Student ${studName} registered.`, 'success');
      setActiveModal(null);
      triggerStateRefresh();

      // Clear
      setStudName('');
      setStudRoll('');
      setStudPhone('');
      setStudGuardian('');
    } catch (err: any) {
      showToast(err.message || 'Failed to enroll student.', 'error');
    }
  };

  const handleEditStudentOpen = (s: Student) => {
    setSelectedStudentId(s.id);
    setStudName(s.name);
    setStudRoll(s.roll_number);
    setStudPhone(s.phone);
    setStudGuardian(s.guardian_name);
    setActiveModal('edit_student');
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !studName) return;

    try {
      await db.updateStudent(selectedStudentId, {
        name: studName,
        phone: studPhone,
        guardian_name: studGuardian,
      });

      showToast('Student details saved.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update student.', 'error');
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete Student ${name}?`)) {
      try {
        await db.deleteStudent(id);
        showToast(`Student deleted.`, 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete student.', 'error');
      }
    }
  };

  // Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subCode) return;

    const codeExists = dbState.subjects.some((s) => s.code.toLowerCase() === subCode.toLowerCase());
    if (codeExists) {
      showToast('Subject code already exists.', 'error');
      return;
    }

    try {
      await db.createSubject({
        name: subName,
        code: subCode,
        department_id: myDeptId,
        credits: subCredits,
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Create Subject',
        `HOD added subject: ${subName} (${subCode})`
      );
      showToast(`Subject ${subName} created.`, 'success');
      setActiveModal(null);
      triggerStateRefresh();

      // Clear
      setSubName('');
      setSubCode('');
      setSubCredits(3);
    } catch (err: any) {
      showToast(err.message || 'Failed to create subject.', 'error');
    }
  };

  const handleDeleteSubject = async (id: string, code: string) => {
    if (window.confirm(`Delete subject ${code} and its mappings?`)) {
      try {
        await db.deleteSubject(id);
        showToast('Subject deleted.', 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete subject.', 'error');
      }
    }
  };

  // Assign Subject
  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFacId || !assignSubId) return;

    try {
      await db.assignSubject({
        faculty_id: assignFacId,
        subject_id: assignSubId,
        semester: assignSem,
        academic_year: assignYear,
      });

      const facUser = dbState.users.find((u) => {
        const f = dbState.faculty.find((fac) => fac.id === assignFacId);
        return f?.user_id === u.id;
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Assign Subject',
        `HOD mapped subject to Faculty ID: ${facUser?.full_name || assignFacId}`
      );
      showToast('Subject assigned to Faculty.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign subject.', 'error');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (window.confirm(`Remove this subject assignment?`)) {
      try {
        await db.deleteAssignment(id);
        showToast('Assignment removed.', 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to remove assignment.', 'error');
      }
    }
  };

  // Approve Leaves
  const handleLeaveAction = async (id: string, action: 'Approved' | 'Rejected') => {
    try {
      await db.updateLeaveStatus(id, action, currentUser!.id);
      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        action === 'Approved' ? 'Approve Leave' : 'Reject Leave',
        `HOD processed leave request ID: ${id} as ${action}`
      );
      showToast(`Faculty leave request ${action.toLowerCase()}.`, 'success');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update leave status.', 'error');
    }
  };

  // Filter lists inside Department ONLY
  const myFacultyProfiles = dbState.faculty.filter((f) => f.department_id === myDeptId);
  const myFacultyUserIds = myFacultyProfiles.map((f) => f.user_id);
  const myFacultyUsers = dbState.users.filter(
    (u) =>
      myFacultyUserIds.includes(u.id) &&
      (u.full_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const myStudents = dbState.students.filter(
    (s) =>
      s.department_id === myDeptId &&
      (s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const mySubjects = dbState.subjects.filter(
    (s) =>
      s.department_id === myDeptId &&
      (s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.code.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const myAssignments = dbState.subject_assignments.filter((sa) => {
    const sub = dbState.subjects.find((s) => s.id === sa.subject_id);
    return sub && sub.department_id === myDeptId;
  });

  const myLeaveRequests = db.getLeaveRequestsByDepartment(myDeptId);
  const pendingLeaves = myLeaveRequests.filter((lr) => lr.status === 'Pending');

  return (
    <div className="space-y-6">
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Stats bar */}
          <div className="p-5 glass border border-primary-500/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-[10px] uppercase font-extrabold tracking-widest text-primary-500 bg-primary-500/5 px-2.5 py-1 rounded-full self-start">
                DEPARTMENT OVERVIEW
              </p>
              <h2 className="text-xl font-black text-navy-950 dark:text-white mt-2 leading-none uppercase">
                {myDept?.name || 'My Department'} ({myDept?.code || 'N/A'})
              </h2>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] font-bold text-navy-400 uppercase">Faculty</p>
                <p className="text-lg font-black text-navy-800 dark:text-white">{myFacultyProfiles.length}</p>
              </div>
              <div className="border-l border-slate-200 dark:border-navy-800 pl-4">
                <p className="text-[10px] font-bold text-navy-400 uppercase">Students</p>
                <p className="text-lg font-black text-navy-800 dark:text-white">{myStudents.length}</p>
              </div>
              <div className="border-l border-slate-200 dark:border-navy-800 pl-4">
                <p className="text-[10px] font-bold text-navy-400 uppercase">Subjects</p>
                <p className="text-lg font-black text-navy-800 dark:text-white">{mySubjects.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile editor */}
            <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3.5 mb-5 pb-3 border-b border-slate-100 dark:border-navy-850">
                  <Contact className="text-primary-500" size={20} />
                  <h3 className="font-bold text-navy-950 dark:text-white text-base">My HOD Profile</h3>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser?.full_name || ''}
                      className="mt-1 block w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 dark:border-navy-800 dark:bg-navy-900/60 text-sm text-navy-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-500 uppercase">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={hodPhone}
                      onChange={(e) => setHodPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="mt-1 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-500 uppercase">Academic Qualifications</label>
                    <input
                      type="text"
                      required
                      value={hodQual}
                      onChange={(e) => setHodQual(e.target.value)}
                      placeholder="e.g. M.Pharm, Ph.D"
                      className="mt-1 block w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors mt-2"
                  >
                    <Save size={14} /> Update Contact Profile
                  </button>
                </form>
              </div>

              {/* My Salary Display */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-navy-850">
                <h4 className="font-bold text-navy-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                  <Banknote className="text-primary-500" size={16} /> My Compensation
                </h4>
                <div className="bg-slate-50 dark:bg-navy-950/60 p-4 rounded-xl border border-slate-200 dark:border-navy-800 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold text-navy-600 dark:text-navy-400">
                    <span>Base Salary:</span>
                    <span className="font-mono">₹{(hodProfile.base_salary || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-red-500">
                    <span>Leave Deductions:</span>
                    <span className="font-mono">-₹{(hodProfile.deductions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2 pt-2 border-t border-slate-200 dark:border-navy-800">
                    <span>Net Pay:</span>
                    <span className="font-mono">₹{((hodProfile.base_salary || 0) - (hodProfile.deductions || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Department headcount and metrics */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DonutChart
                  title="Subject Credits Distribution"
                  data={mySubjects.map((sub, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                    return {
                      label: sub.code,
                      value: sub.credits,
                      color: colors[index % colors.length],
                    };
                  })}
                  emptyMessage="No subjects configured. Create academic subjects under Subjects to view credit structures."
                />
                
                <BarChart
                  title="Students Headcount"
                  data={[
                    { label: 'Registered Students', value: myStudents.length, color: '#3b82f6' },
                    { label: 'Assigned Teaching Staff', value: myFacultyProfiles.length, color: '#10b981' }
                  ]}
                  emptyMessage="Add records to view count summaries."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FACULTY MANAGEMENT */}
      {activeTab === 'faculty' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">Departmental Faculty</h3>
              <p className="text-xs text-navy-400">Manage teaching faculty credentials and assignments in your department</p>
            </div>
            <button
              onClick={() => setActiveModal('create_faculty')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
            >
              <Plus size={16} /> Register Faculty
            </button>
          </div>

          {myFacultyUsers.length === 0 ? (
            <div className="py-16 text-center text-navy-455">
              <Users className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-medium text-sm">No faculty registered.</p>
              <p className="text-xs mt-1">Register faculty accounts to start subject allocations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Designation</th>
                    <th className="pb-3">Contact</th>
                    <th className="pb-3 text-right">Base Salary</th>
                    <th className="pb-3 text-right">Deductions</th>
                    <th className="pb-3 text-right">Net Salary</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                  {myFacultyUsers.map((u) => {
                    const f = myFacultyProfiles.find((fac) => fac.user_id === u.id);
                    return (
                      <tr key={u.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                        <td className="py-3.5 pl-2 font-bold">{u.full_name}</td>
                        <td className="py-3.5 text-xs font-mono">{u.email}</td>
                        <td className="py-3.5 text-xs text-primary-500 font-bold">{f?.designation || 'Lecturer'}</td>
                        <td className="py-3.5 text-xs text-navy-450">{f?.phone || 'N/A'}</td>
                        <td className="py-3.5 text-xs font-mono text-right text-navy-500">₹{(f?.base_salary || 0).toLocaleString()}</td>
                        <td className="py-3.5 text-xs font-mono text-right text-red-500">-₹{(f?.deductions || 0).toLocaleString()}</td>
                        <td className="py-3.5 text-xs font-mono text-right font-bold text-emerald-600 dark:text-emerald-400">₹{((f?.base_salary || 0) - (f?.deductions || 0)).toLocaleString()}</td>
                        <td className="py-3.5 pr-2 text-right space-x-2">
                          <button
                            onClick={() => handleResetPasswordOpen(u.id)}
                            className="p-1.5 text-navy-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-navy-850 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <Lock size={15} />
                          </button>
                          {f && (
                            <button
                              onClick={() => handleEditFacultyOpen(u, f)}
                              className="p-1.5 text-navy-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-navy-850 rounded-lg transition-colors"
                              title="Edit Profile"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFaculty(u.id, u.full_name)}
                            className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-navy-850 rounded-lg transition-colors"
                            title="Remove Faculty"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* 3. STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">Enrolled Students</h3>
              <p className="text-xs text-navy-400">Enroll new student profiles to configure roll call lists</p>
            </div>
            <button
              onClick={() => setActiveModal('create_student')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
            >
              <Plus size={16} /> Register Student
            </button>
          </div>

          {myStudents.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <GraduationCap className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-medium text-sm">No students registered in this department.</p>
              <p className="text-xs mt-1">Populate student directories to open class registers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Roll Number</th>
                    <th className="pb-3">Contact</th>
                    <th className="pb-3">Guardian</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                  {myStudents.map((s) => (
                    <tr key={s.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                      <td className="py-3.5 pl-2 font-bold">{s.name}</td>
                      <td className="py-3.5 text-xs font-mono font-bold text-primary-500">{s.roll_number}</td>
                      <td className="py-3.5 text-xs text-navy-450">{s.phone || 'N/A'}</td>
                      <td className="py-3.5 text-xs text-navy-500">{s.guardian_name || 'N/A'}</td>
                      <td className="py-3.5 pr-2 text-right space-x-2">
                        <button
                          onClick={() => handleEditStudentOpen(s)}
                          className="p-1.5 text-navy-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-navy-850 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id, s.name)}
                          className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-navy-850 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. SUBJECTS & ALLOCATIONS */}
      {activeTab === 'subjects' && (
        <div className="space-y-6 animate-fade-in">
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
                  No subjects configured. Add course subjects to assign to teachers.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mySubjects.map((sub) => (
                    <div key={sub.id} className="p-3.5 bg-slate-50 dark:bg-navy-950/60 rounded-xl border border-slate-100 dark:border-navy-850 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <p className="text-navy-950 dark:text-white font-bold">{sub.name}</p>
                        <p className="text-[10px] text-navy-400 mt-0.5">{sub.code} • {sub.credits} Credits</p>
                      </div>
                      <button
                        onClick={() => handleDeleteSubject(sub.id, sub.code)}
                        className="p-1 text-navy-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
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
                <div className="space-y-2.5">
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
        </div>
      )}

      {/* 5. LEAVE REQUESTS */}
      {activeTab === 'leaves' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-navy-900 dark:text-white font-bold text-lg">Faculty Leaves</h3>
            <p className="text-xs text-navy-400">Review and authorize leave applications filed by departmental faculty</p>
          </div>

          {pendingLeaves.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <FileCheck className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-705" />
              <p className="font-medium text-sm">No leaves awaiting approval.</p>
              <p className="text-xs mt-1">Leaves submitted by your faculty will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((lr) => (
                <div key={lr.id} className="p-5 bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-navy-800 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-navy-950 dark:text-white">{lr.userName}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400">
                        Faculty
                      </span>
                    </div>
                    <p className="text-xs text-navy-500">
                      Reason: <span className="font-bold text-navy-700 dark:text-navy-300">{lr.type} Leave</span>
                    </p>
                    <p className="text-xs text-navy-450 max-w-lg leading-relaxed">{lr.reason}</p>
                    <p className="text-[10px] text-navy-450 mt-1">
                      Duration: <strong className="text-primary-500">{lr.start_date}</strong> to <strong className="text-primary-500">{lr.end_date}</strong>
                    </p>
                  </div>

                  <div className="flex gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleLeaveAction(lr.id, 'Approved')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleLeaveAction(lr.id, 'Rejected')}
                      className="flex items-center gap-1 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =======================================================
          MODALS OVERLAYS
          ======================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-navy-800">
              <h4 className="font-extrabold text-navy-950 dark:text-white text-base">
                {activeModal === 'create_faculty' && 'Register Departmental Faculty'}
                {activeModal === 'edit_faculty' && 'Modify Faculty Profile'}
                {activeModal === 'reset_password' && 'Override Credentials'}
                {activeModal === 'create_student' && 'Register Student Profile'}
                {activeModal === 'edit_student' && 'Modify Student Profile'}
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

            {/* Forms */}

            {/* A. Create Faculty */}
            {activeModal === 'create_faculty' && (
              <form onSubmit={handleCreateFacultySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Designation</label>
                  <select
                    value={facDesg}
                    onChange={(e) => setFacDesg(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Faculty Full Name</label>
                  <input
                    type="text"
                    required
                    value={facName}
                    onChange={(e) => setFacName(e.target.value)}
                    placeholder="Dr. Mary Jones"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={facEmail}
                    onChange={(e) => setFacEmail(e.target.value)}
                    placeholder="name@amreddy.edu"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      required
                      value={facPassword}
                      onChange={(e) => setFacPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Qualifications</label>
                    <input
                      type="text"
                      value={facQual}
                      onChange={(e) => setFacQual(e.target.value)}
                      placeholder="e.g. M.Pharm"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={facPhone}
                    onChange={(e) => setFacPhone(e.target.value)}
                    placeholder="9876543210"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm mt-2"
                >
                  Create Faculty Account
                </button>
              </form>
            )}

            {/* B. Edit Faculty */}
            {activeModal === 'edit_faculty' && (
              <form onSubmit={handleUpdateFaculty} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Designation</label>
                  <select
                    value={facDesg}
                    onChange={(e) => setFacDesg(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={facName}
                    onChange={(e) => setFacName(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Qualifications</label>
                    <input
                      type="text"
                      value={facQual}
                      onChange={(e) => setFacQual(e.target.value)}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Contact Phone</label>
                    <input
                      type="text"
                      value={facPhone}
                      onChange={(e) => setFacPhone(e.target.value)}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Save Profile Details
                </button>
              </form>
            )}

            {/* C. Reset Password */}
            {activeModal === 'reset_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Apply Override
                </button>
              </form>
            )}

            {/* D. Register Student */}
            {activeModal === 'create_student' && (
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Student Name</label>
                    <input
                      type="text"
                      required
                      value={studName}
                      onChange={(e) => setStudName(e.target.value)}
                      placeholder="e.g. Alice Doe"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Roll Number</label>
                    <input
                      type="text"
                      required
                      value={studRoll}
                      onChange={(e) => setStudRoll(e.target.value)}
                      placeholder="Y26PH001"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={studPhone}
                    onChange={(e) => setStudPhone(e.target.value)}
                    placeholder="9876543210"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Guardian Name</label>
                  <input
                    type="text"
                    value={studGuardian}
                    onChange={(e) => setStudGuardian(e.target.value)}
                    placeholder="Father's Name"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Register Profile
                </button>
              </form>
            )}

            {/* E. Edit Student */}
            {activeModal === 'edit_student' && (
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Student Name</label>
                  <input
                    type="text"
                    required
                    value={studName}
                    onChange={(e) => setStudName(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Roll Number</label>
                  <input
                    type="text"
                    disabled
                    value={studRoll}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-100 dark:bg-navy-900 text-sm text-navy-450 font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={studPhone}
                    onChange={(e) => setStudPhone(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Guardian Name</label>
                  <input
                    type="text"
                    value={studGuardian}
                    onChange={(e) => setStudGuardian(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Save Changes
                </button>
              </form>
            )}

            {/* F. Create Subject */}
            {activeModal === 'create_subject' && (
              <form onSubmit={handleCreateSubject} className="space-y-4">
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
                    <option value="">-- Choose Subject --</option>
                    {mySubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Select Faculty Teacher</label>
                  <select
                    required
                    value={assignFacId}
                    onChange={(e) => setAssignFacId(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="">-- Choose Faculty --</option>
                    {myFacultyProfiles.map((f) => {
                      const usr = dbState.users.find((u) => u.id === f.user_id);
                      return (
                        <option key={f.id} value={f.id}>
                          {usr?.full_name} ({f.designation})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Term Semester</label>
                    <select
                      value={assignSem}
                      onChange={(e) => setAssignSem(e.target.value)}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    >
                      <option value="Semester I">Semester I</option>
                      <option value="Semester II">Semester II</option>
                      <option value="Semester III">Semester III</option>
                      <option value="Semester IV">Semester IV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Academic Year</label>
                    <input
                      type="text"
                      required
                      value={assignYear}
                      onChange={(e) => setAssignYear(e.target.value)}
                      placeholder="e.g. 2026-27"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Apply Teaching Allocation
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
