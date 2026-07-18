import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { User, Department, Student } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { DonutChart, BarChart } from '../../components/Charts';
import { StudentManagementTab } from '../../components/StudentManagementTab';
import { AttendanceManager } from '../../components/AttendanceManager';
import {
  Building,
  Users,
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Power,
  PowerOff,
  Database,
  FileCode,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Download,
  Upload
} from 'lucide-react';

interface DashboardProps {
  activeTab: string;
  searchFilter: string;
  onTabChange: (tabId: string) => void;
}

export const AdminDashboard: React.FC<DashboardProps> = ({ activeTab, searchFilter, onTabChange }) => {
  const { currentUser, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [dbState, setDbState] = useState(db.getRawState());
  const [copiedSQL, setCopiedSQL] = useState(false);

  // Forms Modals Toggle
  const [activeModal, setActiveModal] = useState<'create_dept' | 'edit_dept' | 'create_user' | 'edit_user' | 'create_student' | 'edit_student' | 'reset_password' | 'view_users' | null>(null);
  const [viewRole, setViewRole] = useState<'principal' | 'hod' | 'faculty' | null>(null);

  // Pagination & Search States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selection states for editing/resets
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Form Fields - Department
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Form Fields - Users
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'principal' | 'hod' | 'faculty' | 'exam_cell' | 'library'>('principal');
  const [isAssignExisting, setIsAssignExisting] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [userDeptId, setUserDeptId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userQual, setUserQual] = useState('');
  const [userDesg, setUserDesg] = useState('');

  // Form Fields - Password Reset
  const [newPasswordVal, setNewPasswordVal] = useState('');

  useEffect(() => {
    // Sync state
    setDbState(db.getRawState());
  }, [activeModal]);

  const triggerStateRefresh = () => {
    setDbState({ ...db.getRawState() });
  };

  // SQL Copy to Clipboard
  const handleCopySQL = () => {
    navigator.clipboard.writeText(db.generateSQLSchema());
    setCopiedSQL(true);
    showToast('Supabase SQL Schema copied to clipboard!', 'success');
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  // Backup JSON Export
  const handleExportBackup = () => {
    const dataStr = JSON.stringify(db.getRawState(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `am_reddy_pharmacy_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('Database backup file exported successfully.', 'success');
  };

  // Restore JSON Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        if (event.target && event.target.result) {
          const success = db.restoreDatabase(event.target.result as string);
          if (success) {
            triggerStateRefresh();
            showToast('Database restored successfully!', 'success');
          } else {
            showToast('Failed to restore. Invalid backup JSON structure.', 'error');
          }
        }
      };
    }
  };

  const handleClearDatabase = () => {
    if (window.confirm('WARNING: This will permanently delete all records (departments, users, students, notices). You will need to re-initialize your admin account. Proceed?')) {
      db.resetDatabase();
      showToast('Database completely cleared. Logging out...', 'warning');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Department Actions
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;
    
    // Check uniqueness
    const codeExists = dbState.departments.some((d) => d.code.toLowerCase() === deptCode.toLowerCase());
    if (codeExists) {
      showToast('Department code already exists.', 'error');
      return;
    }

    try {
      const dept = await db.createDepartment({ name: deptName, code: deptCode, description: deptDesc });
      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Create Department',
        `Created department: ${dept.name} (${dept.code})`
      );
      showToast(`Department ${dept.name} created.`, 'success');
      setActiveModal(null);
      triggerStateRefresh();
      // Clear
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
    } catch (err: any) {
      showToast(err.message || 'Failed to create department.', 'error');
    }
  };

  const handleEditDeptOpen = (d: Department) => {
    setSelectedDeptId(d.id);
    setDeptName(d.name);
    setDeptCode(d.code);
    setDeptDesc(d.description);
    setActiveModal('edit_dept');
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !deptName) return;

    try {
      await db.updateDepartment(selectedDeptId, { name: deptName, code: deptCode, description: deptDesc });
      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Update Department',
        `Updated department parameters: ${deptName}`
      );
      showToast('Department updated successfully.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update department.', 'error');
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This will cascade and delete associated faculty, HODs, and student records.`)) {
      try {
        await db.deleteDepartment(id);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'Delete Department',
          `Deleted department: ${name}`
        );
        showToast(`Department ${name} and related records deleted.`, 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete department.', 'error');
      }
    }
  };

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAssignExisting) {
      if (!assignUserId || !userRole) {
        showToast('Please select a user and role to assign.', 'warning');
        return;
      }
      try {
        await db.grantAdditionalRole(assignUserId, userRole);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'Assign Role',
          `Granted ${userRole.toUpperCase()} role to existing user ID: ${assignUserId}`
        );
        showToast(`Successfully assigned ${userRole} to existing staff member.`, 'success');
        setActiveModal(null);
        triggerStateRefresh();
        setAssignUserId('');
      } catch (err: any) {
        showToast(err.message || 'Failed to assign role.', 'error');
      }
      return;
    }

    if (!userEmail || !userFullName || !userPassword) return;

    // Check email uniqueness
    const emailExists = db.getUsers().some((u) => u.email.toLowerCase() === userEmail.toLowerCase());
    if (emailExists) {
      showToast('Email is already registered.', 'error');
      return;
    }

    // Role specific validation
    if ((userRole === 'hod' || userRole === 'faculty') && !userDeptId) {
      showToast('Please assign a department.', 'warning');
      return;
    }

    try {
      // Create Base User
      const newUser = await db.createUser({
        email: userEmail,
        password: userPassword,
        role: userRole,
        full_name: userFullName,
        is_active: true,
      });

      // Create Profile details
      if (userRole === 'principal') {
        await db.createPrincipalProfile({
          user_id: newUser.id,
          phone: userPhone,
          qualifications: userQual,
          bio: '',
        });
      } else if (userRole === 'hod') {
        await db.createHODProfile({
          user_id: newUser.id,
          department_id: userDeptId,
          phone: userPhone,
          qualifications: userQual,
        });
      } else if (userRole === 'faculty') {
        await db.createFacultyProfile({
          user_id: newUser.id,
          department_id: userDeptId,
          designation: userDesg || 'Lecturer',
          phone: userPhone,
          qualifications: userQual,
          joining_date: new Date().toISOString().split('T')[0],
        });
      }
      // Note: Exam Cell and Library do not currently require separate profile tables.


      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        'Create User',
        `Registered user: ${userFullName} (${userRole.toUpperCase()})`
      );
      showToast(`User account created for ${userFullName}.`, 'success');
      setActiveModal(null);
      triggerStateRefresh();
      
      // Clear Fields
      setUserEmail('');
      setUserFullName('');
      setUserPassword('');
      setUserRole('principal');
      setUserDeptId('');
      setUserPhone('');
      setUserQual('');
      setUserDesg('');
    } catch (err: any) {
      showToast(err.message || 'Failed to register user.', 'error');
    }
  };

  const handleToggleUserActive = async (u: User) => {
    const nextState = !u.is_active;
    try {
      await db.setUserActive(u.id, nextState);
      await db.logAction(
        currentUser!.id,
        currentUser!.email,
        currentUser!.role,
        nextState ? 'Activate User' : 'Deactivate User',
        `Set status for user ${u.email} to ${nextState ? 'ACTIVE' : 'INACTIVE'}`
      );
      showToast(`User ${u.full_name} is now ${nextState ? 'Active' : 'Inactive'}.`, 'info');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  const handleResetPasswordOpen = (userId: string) => {
    setSelectedUserId(userId);
    setNewPasswordVal('');
    setActiveModal('reset_password');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newPasswordVal) return;

    try {
      await resetPassword(selectedUserId, newPasswordVal);
      showToast('Password reset link sent to user email.', 'success');
      setActiveModal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to request password reset.', 'error');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (window.confirm(`Are you sure you want to delete ${u.full_name}? This action is irreversible.`)) {
      try {
        await db.deleteUser(u.id);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'Delete User',
          `Deleted account for ${u.full_name}`
        );
        showToast(`User account deleted.`, 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete user.', 'error');
      }
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedUserIds.length} users? This action is irreversible.`)) {
      try {
        for (const id of selectedUserIds) {
          const u = dbState.users.find(user => user.id === id);
          if (u) {
            await db.deleteUser(id);
            await db.logAction(
              currentUser!.id,
              currentUser!.email,
              currentUser!.role,
              'Delete User',
              `Deleted account for ${u.full_name}`
            );
          }
        }
        showToast(`${selectedUserIds.length} user accounts deleted.`, 'success');
        setSelectedUserIds([]);
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to bulk delete users.', 'error');
      }
    }
  };

  const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentPageIds = paginateList(filteredUsers).map(u => u.id);
    if (e.target.checked) {
      setSelectedUserIds([...new Set([...selectedUserIds, ...currentPageIds])]);
    } else {
      setSelectedUserIds(selectedUserIds.filter(id => !currentPageIds.includes(id)));
    }
  };

  // Helpers
  const getDeptName = (id: string) => {
    return dbState.departments.find((d) => d.id === id)?.name || 'N/A';
  };

  // --- Filtering Records ---
  const filteredDepts = dbState.departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.code.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredUsers = dbState.users.filter(
    (u) =>
      (u.full_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(searchFilter.toLowerCase())) &&
      u.role !== 'admin' && // Exclude admin themselves from standard listings
      (activeTab === 'users' || 
       (activeTab === 'principals' && u.role === 'principal') ||
       (activeTab === 'hods' && u.role === 'hod') ||
       (activeTab === 'faculty' && u.role === 'faculty') ||
       (activeTab === 'library' && (u.role === 'library' || u.additional_roles?.includes('library'))) ||
       (activeTab === 'exam_cell' && (u.role === 'exam_cell' || u.additional_roles?.includes('exam_cell'))))
  );

  const filteredStudents = dbState.students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Pagination variables
  const paginateList = (list: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return list.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = (list: any[]) => Math.ceil(list.length / itemsPerPage);

  return (
    <div className="space-y-6">
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Building size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Departments</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">{dbState.departments.length}</p>
              </div>
            </div>

            <div 
              className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors"
              onClick={() => { setViewRole('principal'); setActiveModal('view_users'); }}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Principals</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">
                  {dbState.users.filter((u) => u.role === 'principal').length}
                </p>
              </div>
            </div>

            <div 
              className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors"
              onClick={() => { setViewRole('hod'); setActiveModal('view_users'); }}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">HODs</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">
                  {dbState.users.filter((u) => u.role === 'hod').length}
                </p>
              </div>
            </div>

            <div 
              className="glass p-5 rounded-2xl border border-navy-100 dark:border-navy-800 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors"
              onClick={() => { setViewRole('faculty'); setActiveModal('view_users'); }}
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Faculty</p>
                <p className="text-2xl font-black text-navy-950 dark:text-white mt-1">
                  {dbState.users.filter((u) => u.role === 'faculty').length}
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6">
            <DonutChart
              title="System Roles Distribution"
              data={[
                {
                  label: 'Principal',
                  value: dbState.users.filter((u) => u.role === 'principal').length,
                  color: '#3b82f6',
                },
                {
                  label: 'HODs',
                  value: dbState.users.filter((u) => u.role === 'hod').length,
                  color: '#10b981',
                },
                {
                  label: 'Faculty',
                  value: dbState.users.filter((u) => u.role === 'faculty').length,
                  color: '#8b5cf6',
                },
              ]}
              emptyMessage="No users registered under Principal, HOD, or Faculty roles. Create accounts under User Management to view distribution statistics."
            />
          </div>

          {/* Recent Audit Logs Timeline */}
          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-navy-900 dark:text-white font-bold text-base">Recent Audit Logs</h3>
              <button
                onClick={() => onTabChange('database')}
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                View Database Logs
              </button>
            </div>

            {dbState.audit_logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-navy-400">
                No logs recorded yet. Perform actions in the system to populate audit logs.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {dbState.audit_logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex gap-4 p-3 bg-slate-50 dark:bg-navy-950/60 rounded-xl text-xs border border-slate-100 dark:border-navy-900">
                    <span className="font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400 self-start">
                      {log.user_role.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-navy-900 dark:text-white font-bold">{log.action}</p>
                      <p className="text-navy-500 dark:text-navy-450 mt-0.5">{log.details}</p>
                    </div>
                    <div className="text-right text-navy-400">
                      <p className="font-medium">{log.user_email}</p>
                      <p className="text-[10px] mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1.5. STUDENTS TAB */}
      {activeTab === 'students' && (
        <StudentManagementTab searchFilter={searchFilter} />
      )}

      {/* 2. DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">Department Settings</h3>
              <p className="text-xs text-navy-400">Establish and delete college structural departments</p>
            </div>
            <button
              onClick={() => setActiveModal('create_dept')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
            >
              <Plus size={16} /> Add Department
            </button>
          </div>

          {filteredDepts.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <Building className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-medium text-sm">No departments found.</p>
              <p className="text-xs mt-1">Configure academic departments to start building the system structure.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                  {paginateList(filteredDepts).map((d) => (
                    <tr key={d.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                      <td className="py-3.5 pl-2 font-bold">{d.name}</td>
                      <td className="py-3.5 text-primary-500 font-semibold">{d.code}</td>
                      <td className="py-3.5 text-xs text-navy-500 max-w-xs truncate">{d.description || 'No description'}</td>
                      <td className="py-3.5 text-xs text-navy-400">{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 pr-2 text-right space-x-2">
                        <button
                          onClick={() => handleEditDeptOpen(d)}
                          className="p-1.5 text-navy-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(d.id, d.name)}
                          className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination controls */}
              {totalPages(filteredDepts) > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-navy-850">
                  <span className="text-xs text-navy-450">
                    Page {currentPage} of {totalPages(filteredDepts)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-800 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages(filteredDepts)))}
                      disabled={currentPage === totalPages(filteredDepts)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-800 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. USERS MANAGEMENT TAB */}
      {(activeTab === 'users' || activeTab === 'principals' || activeTab === 'hods' || activeTab === 'faculty' || activeTab === 'library' || activeTab === 'exam_cell') && (
        <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-navy-900 dark:text-white font-bold text-lg">
                {activeTab === 'principals' ? 'Principal Management' : 
                 activeTab === 'hods' ? 'HOD Management' : 
                 activeTab === 'faculty' ? 'Faculty Management' : 
                 activeTab === 'library' ? 'Library Management' : 
                 activeTab === 'exam_cell' ? 'Exam Cell Management' : 
                 'Staff & Faculty Directory'}
              </h3>
              <p className="text-xs text-navy-400">Manage login credentials and system-wide roles</p>
            </div>
            <div className="flex gap-2">
              {(activeTab === 'principals' || activeTab === 'hods' || activeTab === 'faculty') && (
                <>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-navy-800 dark:hover:bg-navy-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors">
                    <Download size={16} /> Template
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-navy-800 dark:hover:bg-navy-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors">
                    <Upload size={16} /> Bulk Upload
                  </button>
                </>
              )}
              {selectedUserIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteUsers}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition-colors"
                >
                  <Trash2 size={16} /> Delete Selected ({selectedUserIds.length})
                </button>
              )}
              <button
                onClick={() => {
                  let defaultRole = 'principal';
                  if (activeTab === 'hods') defaultRole = 'hod';
                  if (activeTab === 'faculty') defaultRole = 'faculty';
                  if (activeTab === 'library') defaultRole = 'library';
                  if (activeTab === 'exam_cell') defaultRole = 'exam_cell';
                  setUserRole(defaultRole as any);
                  setActiveModal('create_user');
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20 transition-colors"
              >
                <Plus size={16} /> Register Staff
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-navy-450">
              <Users className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
              <p className="font-medium text-sm">No user accounts found.</p>
              <p className="text-xs mt-1 font-normal">Created staff profiles will be listed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-800 text-navy-400 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        onChange={handleSelectAllUsers}
                        checked={paginateList(filteredUsers).length > 0 && paginateList(filteredUsers).every(u => selectedUserIds.includes(u.id))}
                      />
                    </th>
                    <th className="pb-3 pl-2">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                  {paginateList(filteredUsers).map((u) => {
                    // Fetch department name if applicable
                    let deptNameVal = 'N/A';
                    if (u.role === 'hod') {
                      const h = dbState.hods.find((hod) => hod.user_id === u.id);
                      if (h) deptNameVal = getDeptName(h.department_id);
                    } else if (u.role === 'faculty') {
                      const f = dbState.faculty.find((fac) => fac.user_id === u.id);
                      if (f) deptNameVal = getDeptName(f.department_id);
                    }

                    return (
                      <tr key={u.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                        <td className="py-3.5 pl-2">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, u.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                              }
                            }}
                          />
                        </td>
                        <td className="py-3.5 pl-2 font-bold">{u.full_name}</td>
                        <td className="py-3.5 text-xs font-mono">{u.email}</td>
                        <td className="py-3.5">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            u.role === 'principal'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : u.role === 'hod'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 text-xs text-navy-500">{deptNameVal}</td>
                        <td className="py-3.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            u.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                          }`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right space-x-2">
                          <button
                            onClick={() => handleToggleUserActive(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_active ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'
                            }`}
                            title={u.is_active ? 'Suspend User' : 'Activate User'}
                          >
                            {u.is_active ? <Power size={15} /> : <PowerOff size={15} />}
                          </button>
                          <button
                            onClick={() => handleResetPasswordOpen(u.id)}
                            className="p-1.5 text-navy-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <Lock size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages(filteredUsers) > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-navy-850">
                  <span className="text-xs text-navy-450">
                    Page {currentPage} of {totalPages(filteredUsers)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-800 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages(filteredUsers)))}
                      disabled={currentPage === totalPages(filteredUsers)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-navy-800 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-navy-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-navy-800 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-navy-900 dark:text-white">Student Attendance (Admin View)</h2>
              <p className="text-sm text-navy-500 mt-1">View and edit attendance records across the entire college.</p>
            </div>
          </div>
          <AttendanceManager canEditSubmitted={true} isReadOnly={false} />
        </div>
      )}

      {/* 5. DATABASE & SYNC TAB */}
      {activeTab === 'database' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Backup Operations */}
            <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Database size={24} />
                </div>
                <h4 className="text-navy-950 dark:text-white font-bold text-base">ERP Backups</h4>
                <p className="text-xs text-navy-400 mt-2 leading-relaxed">
                  Export the active state of your ERP system. Restoring will overwrite current local storage records.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-navy-800 dark:bg-navy-700 hover:bg-navy-950 dark:hover:bg-navy-600 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Export Local Backup
                </button>
                <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-navy-300 dark:border-navy-700 hover:bg-slate-50 dark:hover:bg-navy-800 text-navy-700 dark:text-navy-300 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  <span>Import Restore file</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Supabase copy paste instructions */}
            <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 flex flex-col justify-between lg:col-span-2">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <FileCode size={24} />
                </div>
                <h4 className="text-navy-950 dark:text-white font-bold text-base">Supabase Integration Setup</h4>
                <p className="text-xs text-navy-400 mt-2 leading-relaxed">
                  The relational DB scheme uses UUID primary keys and standard PostgreSQL foreign keys. Simply run the DDL schema migration script in your Supabase SQL Editor.
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopySQL}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/20"
                >
                  {copiedSQL ? <Check size={14} /> : <Copy size={14} />}
                  <span>Copy SQL Migration Script</span>
                </button>
                <button
                  onClick={handleClearDatabase}
                  className="flex-shrink-0 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Reset ERP
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Audit Log History */}
          <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800">
            <h3 className="text-navy-900 dark:text-white font-bold text-base mb-4">Complete Audit Log History</h3>
            
            {dbState.audit_logs.length === 0 ? (
              <div className="py-12 text-center text-sm text-navy-450">
                No logs recorded yet.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto">
                {dbState.audit_logs.map((log) => (
                  <div key={log.id} className="flex gap-4 p-3 bg-slate-50 dark:bg-navy-950/60 rounded-xl text-xs border border-slate-100 dark:border-navy-900 hover:shadow-sm transition-all">
                    <span className="font-semibold px-2 py-0.5 rounded bg-primary-50 text-primary-700 dark:bg-navy-900 dark:text-primary-400 self-start">
                      {log.user_role.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-navy-900 dark:text-white font-bold">{log.action}</p>
                      <p className="text-navy-500 dark:text-navy-400 mt-0.5">{log.details}</p>
                    </div>
                    <div className="text-right text-navy-400">
                      <p className="font-semibold">{log.user_email}</p>
                      <p className="text-[9px] mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL INTERFACES (MODAL OVERLAYS)
          ======================================================= */}
      
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-800 p-6 animate-scale-up overflow-y-auto max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-navy-800">
              <h4 className="font-extrabold text-navy-950 dark:text-white text-base">
                {activeModal === 'create_dept' && 'Add Department'}
                {activeModal === 'edit_dept' && 'Modify Department'}
                {activeModal === 'create_user' && 'Register Staff User'}
                {activeModal === 'reset_password' && 'Perform Password Override'}
                {activeModal === 'create_student' && 'Register Student Profile'}
                {activeModal === 'edit_student' && 'Modify Student Record'}
                {activeModal === 'view_users' && (viewRole === 'principal' ? 'Principals' : viewRole === 'hod' ? 'Head of Departments' : 'Faculty')}
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-navy-950 dark:hover:text-white"
              >
                <ChevronLeft size={20} className="rotate-180" />
              </button>
            </div>

            {/* Modal Body Forms */}

            {/* A. Create Department */}
            {activeModal === 'create_dept' && (
              <form onSubmit={handleCreateDept} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Department Name</label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Doctor of Pharmacy"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Unique Department Code</label>
                  <input
                    type="text"
                    required
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    placeholder="e.g. PHARM-D"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Description</label>
                  <textarea
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Course objectives or details"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                >
                  Create Department
                </button>
              </form>
            )}

            {/* B. Edit Department */}
            {activeModal === 'edit_dept' && (
              <form onSubmit={handleUpdateDept} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Department Name</label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Department Code</label>
                  <input
                    type="text"
                    required
                    disabled
                    value={deptCode}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-100 dark:bg-navy-900 text-sm text-navy-400 font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Description</label>
                  <textarea
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    rows={3}
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

            {/* C. Create User */}
            {activeModal === 'create_user' && (
              <form onSubmit={handleCreateUser} className="space-y-4">
                {(activeTab === 'exam_cell' || activeTab === 'library') && (
                  <div className="flex justify-center bg-slate-100 dark:bg-navy-950 p-1 rounded-xl border border-slate-200 dark:border-navy-800 mb-4">
                    <button
                      type="button"
                      onClick={() => setIsAssignExisting(false)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        !isAssignExisting ? 'bg-white dark:bg-navy-800 text-primary-600 shadow-sm' : 'text-navy-500'
                      }`}
                    >
                      New Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAssignExisting(true)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        isAssignExisting ? 'bg-white dark:bg-navy-800 text-primary-600 shadow-sm' : 'text-navy-500'
                      }`}
                    >
                      Existing Staff
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Role</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as any)}
                      className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                    >
                      {(activeTab === 'users' || activeTab === 'principals' || activeTab === 'hods' || activeTab === 'faculty') && (
                        <>
                          <option value="principal">Principal</option>
                          <option value="hod">HOD</option>
                          <option value="faculty">Faculty</option>
                        </>
                      )}
                      {activeTab === 'library' && <option value="library">Library</option>}
                      {activeTab === 'exam_cell' && <option value="exam_cell">Exam Cell</option>}
                    </select>
                  </div>
                  {/* Department Field (Conditional for HOD & Faculty) */}
                  {(userRole === 'hod' || userRole === 'faculty') && (
                    <div>
                      <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Department</label>
                      <select
                        required
                        value={userDeptId}
                        onChange={(e) => setUserDeptId(e.target.value)}
                        className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                      >
                        <option value="">-- Select --</option>
                        {dbState.departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userFullName}
                    onChange={(e) => setUserFullName(e.target.value)}
                    placeholder="Dr. John Doe"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="email@amreddy.edu"
                    className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                  />
                </div>

                {!isAssignExisting && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Password</label>
                        <input
                          type="password"
                          required
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="••••••••"
                          className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Qualifications</label>
                        <input
                          type="text"
                          value={userQual}
                          onChange={(e) => setUserQual(e.target.value)}
                          placeholder="M.Pharm, Ph.D"
                          className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Phone</label>
                        <input
                          type="text"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          placeholder="9876543210"
                          className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                        />
                      </div>
                      {userRole === 'faculty' && (
                        <div>
                          <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Designation</label>
                          <input
                            type="text"
                            value={userDesg}
                            onChange={(e) => setUserDesg(e.target.value)}
                            placeholder="e.g. Associate Professor"
                            className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm mt-2"
                    >
                      Create Account
                    </button>
                  </>
                )}

                {isAssignExisting && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Select Existing Staff</label>
                      <select
                        required
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                      >
                        <option value="">-- Select Faculty / HOD --</option>
                        {dbState.users
                          .filter(u => u.role === 'faculty' || u.role === 'hod')
                          .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.role.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm"
                    >
                      Assign Role to Staff
                    </button>
                  </>
                )}
              </form>
            )}

            {/* D. Password Reset Modal */}
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
                  Apply Password Overwrite
                </button>
              </form>
            )}


            {/* G. View Users List */}
            {activeModal === 'view_users' && viewRole && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 mt-4">
                {dbState.users.filter(u => u.role === viewRole).length === 0 ? (
                  <p className="text-center py-8 text-sm text-navy-500">No users found for this role.</p>
                ) : (
                  dbState.users
                    .filter(u => u.role === viewRole)
                    .map(u => {
                      let deptNameVal = 'N/A';
                      if (u.role === 'hod') {
                        const h = dbState.hods.find(hod => hod.user_id === u.id);
                        if (h) deptNameVal = getDeptName(h.department_id);
                      } else if (u.role === 'faculty') {
                        const f = dbState.faculty.find(fac => fac.user_id === u.id);
                        if (f) deptNameVal = getDeptName(f.department_id);
                      }
                      
                      return (
                        <div key={u.id} className="p-3 bg-slate-50 dark:bg-navy-950 rounded-xl border border-slate-100 dark:border-navy-900 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-navy-900 dark:text-white text-sm">{u.full_name}</p>
                            <p className="text-xs text-navy-500 font-mono mt-0.5">{u.email}</p>
                          </div>
                          {deptNameVal !== 'N/A' && (
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-navy-900 px-2 py-1 rounded-lg">
                              {deptNameVal}
                            </span>
                          )}
                        </div>
                      )
                    })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
