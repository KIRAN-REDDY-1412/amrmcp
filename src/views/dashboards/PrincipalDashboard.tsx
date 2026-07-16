import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { User, HOD } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DonutChart, BarChart } from '../../components/Charts';
import {
  Building,
  Users,
  Bell,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Lock,
  ChevronLeft,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

interface DashboardProps {
  activeTab: string;
  searchFilter: string;
  onTabChange: (tabId: string) => void;
}

export const PrincipalDashboard: React.FC<DashboardProps> = ({ activeTab, searchFilter, onTabChange }) => {
  const { currentUser, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [dbState, setDbState] = useState(db.getRawState());
  const [activeModal, setActiveModal] = useState<'create_hod' | 'edit_hod' | 'reset_password' | 'create_notice' | 'edit_salary' | null>(null);

  // Selection states
  const [selectedHODUserId, setSelectedHODUserId] = useState<string | null>(null);
  const [selectedHODProfileId, setSelectedHODProfileId] = useState<string | null>(null);

  // Form Fields - HOD
  const [hodName, setHodName] = useState('');
  const [hodEmail, setHodEmail] = useState('');
  const [hodPassword, setHodPassword] = useState('');
  const [hodDeptId, setHodDeptId] = useState('');
  const [hodPhone, setHodPhone] = useState('');
  const [hodQual, setHodQual] = useState('');

  // Form Fields - Notice
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeTarget, setNoticeTarget] = useState<'All' | 'Principal' | 'HOD' | 'Faculty'>('All');

  // Form Fields - Password Reset
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Form Fields - Salary
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<string | null>(null);
  const [selectedStaffRole, setSelectedStaffRole] = useState<'hod' | 'faculty' | null>(null);
  const [salaryBase, setSalaryBase] = useState('');
  const [salaryDeductions, setSalaryDeductions] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setDbState(db.getRawState());
  }, [activeModal]);

  const triggerStateRefresh = () => {
    setDbState({ ...db.getRawState() });
  };

  // Create HOD
  const handleCreateHOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hodName || !hodEmail || !hodPassword || !hodDeptId) return;

    // Check email uniqueness
    const emailExists = db.getUsers().some((u) => u.email.toLowerCase() === hodEmail.toLowerCase());
    if (emailExists) {
      showToast('Email is already registered.', 'error');
      return;
    }

    // Check if Department already has an HOD
    const deptHasHOD = dbState.hods.some((h) => h.department_id === hodDeptId);
    if (deptHasHOD) {
      showToast('This department already has a Head of Department.', 'error');
      return;
    }

    try {
      // Create User & HOD profile
      const newUser = await db.createUser({
        email: hodEmail,
        password: hodPassword,
        role: 'hod',
        full_name: hodName,
        is_active: true,
      });

      await db.createHODProfile({
        user_id: newUser.id,
        department_id: hodDeptId,
        phone: hodPhone,
        qualifications: hodQual,
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Create HOD Account',
        `Principal registered HOD account: ${hodName} for department: ${hodDeptId}`
      );
      showToast(`HOD account created for ${hodName}.`, 'success');
      setActiveModal(null);
      triggerStateRefresh();

      // Clear
      setHodName('');
      setHodEmail('');
      setHodPassword('');
      setHodDeptId('');
      setHodPhone('');
      setHodQual('');
    } catch (err: any) {
      showToast(err.message || 'Failed to register HOD.', 'error');
    }
  };

  const handleEditHODOpen = (u: User, h: HOD) => {
    setSelectedHODUserId(u.id);
    setSelectedHODProfileId(h.id);
    setHodName(u.full_name);
    setHodEmail(u.email);
    setHodDeptId(h.department_id);
    setHodPhone(h.phone);
    setHodQual(h.qualifications);
    setActiveModal('edit_hod');
  };

  const handleUpdateHOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHODUserId || !selectedHODProfileId || !hodName || !hodDeptId) return;

    try {
      // Update base user
      await db.updateUser(selectedHODUserId, { full_name: hodName });
      // Update HOD profile
      await db.updateHODProfile(selectedHODUserId, {
        department_id: hodDeptId,
        phone: hodPhone,
        qualifications: hodQual,
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Update HOD Profile',
        `Principal updated HOD profile details: ${hodName}`
      );
      showToast('HOD details updated successfully.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update HOD.', 'error');
    }
  };

  const handleDeleteHOD = async (userId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete HOD ${name}?`)) {
      try {
        await db.deleteUser(userId);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'Delete HOD Account',
          `Principal deleted HOD account for ${name}`
        );
        showToast(`HOD account deleted.`, 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete HOD.', 'error');
      }
    }
  };

  const handleResetPasswordOpen = (userId: string) => {
    setSelectedHODUserId(userId);
    setNewPasswordVal('');
    setActiveModal('reset_password');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHODUserId || !newPasswordVal) return;

    try {
      await resetPassword(selectedHODUserId, newPasswordVal);
      showToast('HOD password reset link sent to email.', 'success');
      setActiveModal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to override HOD password.', 'error');
    }
  };

  const handleEditSalaryOpen = (userId: string, role: 'hod' | 'faculty', base: number = 0, deductions: number = 0) => {
    setSelectedStaffUserId(userId);
    setSelectedStaffRole(role);
    setSalaryBase(base.toString());
    setSalaryDeductions(deductions.toString());
    setActiveModal('edit_salary');
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUserId || !selectedStaffRole) return;
    try {
      if (selectedStaffRole === 'hod') {
        await db.updateHODProfile(selectedStaffUserId, { base_salary: Number(salaryBase), deductions: Number(salaryDeductions) });
      } else {
        await db.updateFacultyProfile(selectedStaffUserId, { base_salary: Number(salaryBase), deductions: Number(salaryDeductions) });
      }
      showToast('Salary details updated.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update salary.', 'error');
    }
  };

  // Create Notice
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeContent) return;

    try {
      await db.createNotice({
        title: noticeTitle,
        content: noticeContent,
        target_role: noticeTarget,
        created_by: currentUser!.id,
      });

      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Post Announcement',
        `Posted notice: "${noticeTitle}" to target: ${noticeTarget}`
      );
      showToast('Notice published successfully.', 'success');
      setActiveModal(null);
      triggerStateRefresh();

      // Clear
      setNoticeTitle('');
      setNoticeContent('');
      setNoticeTarget('All');
    } catch (err: any) {
      showToast(err.message || 'Failed to publish notice.', 'error');
    }
  };

  const handleDeleteNotice = async (id: string, title: string) => {
    if (window.confirm(`Delete notice: "${title}"?`)) {
      try {
        await db.deleteNotice(id);
        showToast('Notice removed.', 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to remove notice.', 'error');
      }
    }
  };

  // Approvals
  const handleApproveLeave = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await db.updateLeaveStatus(id, status, currentUser!.id);
      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        status === 'Approved' ? 'Approve Leave' : 'Reject Leave',
        `Principal set leave request status: ${status} for ID: ${id}`
      );
      showToast(`Leave request ${status.toLowerCase()} successfully.`, 'success');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update leave request.', 'error');
    }
  };

  // Filter listings
  const filteredHODs = dbState.users.filter(
    (u) =>
      u.role === 'hod' &&
      (u.full_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const getDeptName = (id: string) => {
    return dbState.departments.find((d) => d.id === id)?.name || 'N/A';
  };

  const paginateList = (list: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return list.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = (list: any[]) => Math.ceil(list.length / itemsPerPage);

  // Retrieve pending leave applications from HOD users only
  const pendingHODLeaves = dbState.leave_requests.filter((lr) => {
    const user = dbState.users.find((u) => u.id === lr.user_id);
    return lr.status === 'Pending' && user?.role === 'hod';
  });

  return (
    <div className="space-y-6">
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* principal summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Building size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Total Departments</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">{dbState.departments.length}</p>
              </div>
            </div>

            <div className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Active HODs</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">
                  {dbState.users.filter((u) => u.role === 'hod' && u.is_active).length}
                </p>
              </div>
            </div>

            <div className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Teaching Faculty</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">
                  {dbState.users.filter((u) => u.role === 'faculty').length}
                </p>
              </div>
            </div>

            <div className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <GraduationCap size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Students Count</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">{dbState.students.length}</p>
              </div>
            </div>
          </div>

          {/* charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DonutChart
              title="Faculty Count by Department"
              data={dbState.departments.map((dept, index) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                return {
                  label: dept.code,
                  value: dbState.faculty.filter((f) => f.department_id === dept.id).length,
                  color: colors[index % colors.length],
                };
              })}
              emptyMessage="No departments configured or teaching faculty registered. Configure the system to display reports."
            />

            <BarChart
              title="Students Registered"
              data={dbState.departments.map((dept, index) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                return {
                  label: dept.code,
                  value: dbState.students.filter((s) => s.department_id === dept.id).length,
                  color: colors[index % colors.length],
                };
              })}
              emptyMessage="No students registered yet. Populate student lists to view headcount graphs."
            />
          </div>

          {/* Recent notices board */}
          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-navy-900 dark:text-white font-bold text-base">Active Notice Board</h3>
              <button
                onClick={() => onTabChange('notices')}
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                Post New Notice
              </button>
            </div>

            {dbState.notices.length === 0 ? (
              <div className="py-8 text-center text-sm text-navy-450">
                No active announcements on the bulletin.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {dbState.notices.slice(0, 3).map((notice) => (
                  <div key={notice.id} className="p-4 bg-slate-50 dark:bg-navy-950/60 rounded-xl border border-slate-100 dark:border-navy-800 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-navy-950 dark:text-white truncate">{notice.title}</h4>
                      <p className="text-xs text-navy-500 dark:text-navy-400 mt-2 line-clamp-3 leading-relaxed">{notice.content}</p>
                    </div>
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-navy-900/60 flex justify-between items-center text-[10px] text-navy-400">
                      <span className="font-bold uppercase bg-slate-100 dark:bg-navy-900 px-2 py-0.5 rounded text-[8px]">
                        Target: {notice.target_role}
                      </span>
                      <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. HOD DIRECTORY */}
      {activeTab === 'hods' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">Departmental Heads (HODs)</h3>
              <p className="text-xs text-navy-400">Manage account credentials for Head of Departments</p>
            </div>
            
            {dbState.departments.length === 0 ? (
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                * Create departments first under Admin to assign HODs.
              </div>
            ) : (
              <button
                onClick={() => setActiveModal('create_hod')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
              >
                <Plus size={16} /> Add HOD Account
              </button>
            )}
          </div>

          {filteredHODs.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <Users className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-medium text-sm">No HOD accounts registered.</p>
              <p className="text-xs mt-1">Register department heads to grant HOD permissions.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Qualifications</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                  {paginateList(filteredHODs).map((u) => {
                    const h = dbState.hods.find((hod) => hod.user_id === u.id);
                    return (
                      <tr key={u.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                        <td className="py-3.5 pl-2 font-bold">{u.full_name}</td>
                        <td className="py-3.5 text-xs font-mono">{u.email}</td>
                        <td className="py-3.5 text-xs text-primary-500 font-bold">
                          {h ? getDeptName(h.department_id) : 'N/A'}
                        </td>
                        <td className="py-3.5 text-xs text-navy-450">{h?.phone || 'N/A'}</td>
                        <td className="py-3.5 text-xs text-navy-500">{h?.qualifications || 'N/A'}</td>
                        <td className="py-3.5 pr-2 text-right space-x-2">
                          <button
                            onClick={() => handleResetPasswordOpen(u.id)}
                            className="p-1.5 text-navy-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                            title="Reset HOD Password"
                          >
                            <Lock size={15} />
                          </button>
                          {h && (
                            <button
                              onClick={() => handleEditHODOpen(u, h)}
                              className="p-1.5 text-navy-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                              title="Modify Profile"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteHOD(u.id, u.full_name)}
                            className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                            title="Delete HOD"
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
            
            {/* Pagination controls */}
            {totalPages(filteredHODs) > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-navy-850">
                <span className="text-xs text-navy-450">
                  Page {currentPage} of {totalPages(filteredHODs)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-800 disabled:opacity-50 text-navy-600 dark:text-navy-300"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages(filteredHODs)))}
                    disabled={currentPage === totalPages(filteredHODs)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-800 disabled:opacity-50 text-navy-600 dark:text-navy-300"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* 3. NOTICES MANAGEMENT */}
      {activeTab === 'notices' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">College Announcements</h3>
              <p className="text-xs text-navy-400">Post notifications targeting HODs, faculty, or all roles</p>
            </div>
            <button
              onClick={() => setActiveModal('create_notice')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
            >
              <Plus size={16} /> Publish Notice
            </button>
          </div>

          {dbState.notices.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <Bell className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700 animate-pulse-subtle" />
              <p className="font-medium text-sm">No notices published.</p>
              <p className="text-xs mt-1">Announcements created by the Principal will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dbState.notices.map((n) => (
                <div key={n.id} className="p-5 bg-slate-50/60 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-100 text-primary-700 dark:bg-primary-950/80 dark:text-primary-400">
                        Target: {n.target_role}
                      </span>
                      <button
                        onClick={() => handleDeleteNotice(n.id, n.title)}
                        className="text-navy-400 hover:text-red-500 p-1 hover:bg-slate-100 dark:hover:bg-navy-900 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-navy-950 dark:text-white leading-snug">{n.title}</h4>
                    <p className="text-xs text-navy-500 dark:text-navy-450 mt-2 leading-relaxed">{n.content}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-navy-900/60 text-right text-[10px] text-navy-400 font-medium">
                    Posted on {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-navy-900 dark:text-white font-bold text-lg">Leave & Activity Approvals</h3>
            <p className="text-xs text-navy-400">Review and authorize HOD leave requests</p>
          </div>

          {pendingHODLeaves.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <CheckCircle className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-medium text-sm">Inbox completely clear.</p>
              <p className="text-xs mt-1">All leave applications from departmental heads are processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingHODLeaves.map((lr) => {
                const user = dbState.users.find((u) => u.id === lr.user_id);
                const h = dbState.hods.find((hod) => hod.user_id === lr.user_id);
                return (
                  <div key={lr.id} className="p-5 bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-navy-800 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-navy-950 dark:text-white">{user?.full_name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {h ? getDeptName(h.department_id) : 'HOD'}
                        </span>
                      </div>
                      <p className="text-xs text-navy-500">
                        Type: <span className="font-bold text-navy-700 dark:text-navy-300">{lr.type} Leave</span>
                      </p>
                      <p className="text-xs text-navy-450 max-w-lg leading-relaxed">{lr.reason}</p>
                      <p className="text-[10px] text-navy-400 mt-2">
                        Duration: <strong className="text-primary-500">{lr.start_date}</strong> to <strong className="text-primary-500">{lr.end_date}</strong>
                      </p>
                    </div>

                    <div className="flex gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleApproveLeave(lr.id, 'Approved')}
                        className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-colors"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleApproveLeave(lr.id, 'Rejected')}
                        className="flex items-center gap-1 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 transition-colors"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SALARIES MANAGEMENT */}
      {activeTab === 'salaries' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-navy-900 dark:text-white font-bold text-lg">Salary Management</h3>
            <p className="text-xs text-navy-400">Manage base salaries and leave-based deductions for HODs and Faculty</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-3 pl-2">Staff Member</th>
                  <th className="pb-3">Role & Dept</th>
                  <th className="pb-3 text-right">Base Salary</th>
                  <th className="pb-3 text-right">Deductions</th>
                  <th className="pb-3 text-right">Net Salary</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                {dbState.users.filter(u => u.role === 'hod' || u.role === 'faculty').map(u => {
                  let profile: any = null;
                  if (u.role === 'hod') profile = dbState.hods.find(h => h.user_id === u.id);
                  else if (u.role === 'faculty') profile = dbState.faculty.find(f => f.user_id === u.id);
                  
                  if (!profile) return null;
                  
                  const base = profile.base_salary || 0;
                  const ded = profile.deductions || 0;
                  const net = base - ded;
                  
                  return (
                    <tr key={u.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                      <td className="py-3.5 pl-2">
                        <p className="font-bold">{u.full_name}</p>
                        <p className="text-[10px] text-navy-400">{u.email}</p>
                      </td>
                      <td className="py-3.5 text-xs">
                        <span className="font-bold uppercase text-primary-600 dark:text-primary-400">{u.role}</span>
                        <br />
                        <span className="text-navy-500">{getDeptName(profile.department_id)}</span>
                      </td>
                      <td className="py-3.5 text-right font-mono text-xs">₹{base.toLocaleString()}</td>
                      <td className="py-3.5 text-right font-mono text-xs text-red-500">-₹{ded.toLocaleString()}</td>
                      <td className="py-3.5 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">₹{net.toLocaleString()}</td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => handleEditSalaryOpen(u.id, u.role as any, base, ded)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-navy-800 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-50 dark:hover:bg-navy-700 transition-colors"
                        >
                          Edit Salary
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL INTERFACES (PRINCIPAL OVERLAYS)
          ======================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-navy-800">
              <h4 className="font-extrabold text-navy-950 dark:text-white text-base">
                {activeModal === 'create_hod' && 'Register Departmental HOD'}
                {activeModal === 'edit_hod' && 'Modify HOD Profile'}
                {activeModal === 'reset_password' && 'Override HOD Password'}
                {activeModal === 'create_notice' && 'Create Bulletin announcement'}
                {activeModal === 'edit_salary' && 'Edit Salary Details'}
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-navy-950 dark:hover:text-white"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Forms */}

            {/* A. Create HOD */}
            {activeModal === 'create_hod' && (
              <form onSubmit={handleCreateHOD} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Department Assignment</label>
                  <select
                    required
                    value={hodDeptId}
                    onChange={(e) => setHodDeptId(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="">-- Assign Department --</option>
                    {dbState.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={hodName}
                    onChange={(e) => setHodName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={hodEmail}
                    onChange={(e) => setHodEmail(e.target.value)}
                    placeholder="hod@amreddy.edu"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      required
                      value={hodPassword}
                      onChange={(e) => setHodPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Qualifications</label>
                    <input
                      type="text"
                      value={hodQual}
                      onChange={(e) => setHodQual(e.target.value)}
                      placeholder="M.Pharm, Ph.D"
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={hodPhone}
                    onChange={(e) => setHodPhone(e.target.value)}
                    placeholder="9876543210"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Create HOD Account
                </button>
              </form>
            )}

            {/* B. Edit HOD */}
            {activeModal === 'edit_hod' && (
              <form onSubmit={handleUpdateHOD} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Department Assignment</label>
                  <select
                    required
                    value={hodDeptId}
                    onChange={(e) => setHodDeptId(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    {dbState.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={hodName}
                    onChange={(e) => setHodName(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Qualifications</label>
                    <input
                      type="text"
                      value={hodQual}
                      onChange={(e) => setHodQual(e.target.value)}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Contact Phone</label>
                    <input
                      type="text"
                      value={hodPhone}
                      onChange={(e) => setHodPhone(e.target.value)}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Save HOD Profile
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
                  Confirm Password Override
                </button>
              </form>
            )}

            {/* D. Create Notice */}
            {activeModal === 'create_notice' && (
              <form onSubmit={handleCreateNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    placeholder="e.g. Semestral Exam Schedule"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Target Audience</label>
                  <select
                    value={noticeTarget}
                    onChange={(e) => setNoticeTarget(e.target.value as any)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  >
                    <option value="All">All Roles</option>
                    <option value="HOD">Heads of Department Only</option>
                    <option value="Faculty">Teaching Faculty Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Announcement Content</label>
                  <textarea
                    required
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    placeholder="Provide full description of the notice..."
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    rows={4}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Publish Notice
                </button>
              </form>
            )}

            {/* E. Edit Salary */}
            {activeModal === 'edit_salary' && (
              <form onSubmit={handleUpdateSalary} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Base Salary (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={salaryBase}
                    onChange={(e) => setSalaryBase(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Leave Deductions (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={salaryDeductions}
                    onChange={(e) => setSalaryDeductions(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    * Adjust deductions manually based on the staff member's leave records.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-navy-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-navy-700 dark:text-navy-300">Net Salary:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">₹{(Number(salaryBase || 0) - Number(salaryDeductions || 0)).toLocaleString()}</span>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm mt-4"
                >
                  Save Salary
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
