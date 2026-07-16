import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { navigation } from '../services/navigation';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import type { Notice } from '../services/db';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { PrincipalDashboard } from './dashboards/PrincipalDashboard';
import { HODDashboard } from './dashboards/HODDashboard';
import { FacultyDashboard } from './dashboards/FacultyDashboard';
import { CollegeLogo } from '../components/Icons';
import {
  LayoutDashboard,
  LogOut,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  UserCheck,
  Building,
  GraduationCap,
  Users,
  Search,
  BookOpen,
  CalendarDays,
  FileCheck2,
  ShieldCheck,
  Banknote
} from 'lucide-react';

export const DashboardContainer: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
           localStorage.getItem('theme') === 'dark';
  });

  // Edit Profile States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(currentUser?.full_name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdatingProfile(true);
    try {
      const updates: any = { data: { full_name: editName } };
      if (editEmail !== currentUser.email) updates.email = editEmail;
      if (editPassword) updates.password = editPassword;

      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      const { error: dbError } = await supabase.from('users').update({
        full_name: editName,
        email: editEmail
      }).eq('id', currentUser.id);

      if (dbError) throw dbError;
      
      alert('Profile updated successfully!');
      setShowProfileModal(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Security Gate
  useEffect(() => {
    if (!currentUser) {
      navigation.navigate('landing');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setNotices(db.getNoticesForRole(currentUser.role));
    }
  }, [currentUser]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  if (!currentUser) return null;

  // Sidebar navigation options by role
  const getNavLinks = () => {
    const common = [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (currentUser.role === 'admin') {
      return [
        ...common,
        { id: 'departments', label: 'Departments', icon: Building },
        { id: 'users', label: 'Users Management', icon: UserCheck },
        { id: 'database', label: 'Database & Sync', icon: ShieldCheck },
      ];
    } else if (currentUser.role === 'principal') {
      return [
        ...common,
        { id: 'hods', label: 'HOD Directory', icon: Users },
        { id: 'salaries', label: 'Salary Management', icon: Banknote },
        { id: 'notices', label: 'Notices', icon: Bell },
        { id: 'approvals', label: 'Approvals', icon: FileCheck2 },
      ];
    } else if (currentUser.role === 'hod') {
      return [
        ...common,
        { id: 'faculty', label: 'Faculty Management', icon: UserCheck },
        { id: 'students', label: 'Student Management', icon: GraduationCap },
        { id: 'subjects', label: 'Subjects & Loads', icon: BookOpen },
        { id: 'leaves', label: 'Leave Requests', icon: FileCheck2 },
      ];
    } else if (currentUser.role === 'faculty') {
      return [
        ...common,
        { id: 'timetable', label: 'My Timetable', icon: CalendarDays },
        { id: 'attendance', label: 'Student Attendance', icon: FileCheck2 },
        { id: 'marks', label: 'Marks Entry', icon: BookOpen },
        { id: 'leaves', label: 'Apply Leave', icon: CalendarDays },
      ];
    }
    return common;
  };

  const navLinks = getNavLinks();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // Render correct dashboard component
  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'admin':
        return <AdminDashboard activeTab={activeTab} searchFilter={searchQuery} onTabChange={setActiveTab} />;
      case 'principal':
        return <PrincipalDashboard activeTab={activeTab} searchFilter={searchQuery} onTabChange={setActiveTab} />;
      case 'hod':
        return <HODDashboard activeTab={activeTab} searchFilter={searchQuery} onTabChange={setActiveTab} />;
      case 'faculty':
        return <FacultyDashboard activeTab={activeTab} searchFilter={searchQuery} onTabChange={setActiveTab} />;
      default:
        return <div>Dashboard component not found.</div>;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-navy-950 transition-colors duration-300">
      
      {/* Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-800 shrink-0">
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-navy-800 flex items-center gap-3">
          <CollegeLogo size={36} className="animate-none" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-primary-500 tracking-wider">A.M. Reddy Pharmacy</span>
            <span className="text-xs font-bold text-navy-800 dark:text-white truncate max-w-[150px]">
              {currentUser.role.toUpperCase()} ERP
            </span>
          </div>
        </div>

        {/* Navigation Link Lists */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleTabChange(link.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                    : 'text-navy-500 dark:text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-navy-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Profiles */}
        <div className="p-4 border-t border-slate-200 dark:border-navy-800 flex flex-col gap-2">
          {/* User Display Info */}
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-navy-950 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-navy-900 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold shadow-sm">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-navy-800 dark:text-white truncate">{currentUser.full_name}</p>
              <p className="text-[10px] text-navy-400 truncate">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile Layout */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <aside
          className={`fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-navy-900 flex flex-col transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-16 px-6 border-b border-slate-200 dark:border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CollegeLogo size={32} className="animate-none" />
              <span className="text-sm font-bold text-navy-800 dark:text-white">A.M. Reddy ERP</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-navy-500 dark:text-navy-400">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleTabChange(link.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-navy-500 dark:text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-navy-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-navy-800 flex flex-col gap-2">
            <div 
              onClick={() => { setMobileMenuOpen(false); setShowProfileModal(true); }}
              className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-navy-950 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-navy-900 transition-colors"
            >
              <div className="w-8 h-8 rounded bg-primary-500 text-white flex items-center justify-center font-bold text-sm">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-navy-800 dark:text-white truncate">{currentUser.full_name}</p>
                <p className="text-[9px] text-navy-400 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Main Panel Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-navy-800 text-navy-600 dark:text-navy-300"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-navy-950 dark:text-white font-extrabold text-base sm:text-lg leading-tight uppercase tracking-wide">
              {navLinks.find((l) => l.id === activeTab)?.label || 'Overview'}
            </h2>
          </div>

          {/* Search and Quick Options */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Input Box */}
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search database records..."
                className="w-60 pl-9 pr-4 py-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-850 rounded-xl text-xs text-navy-800 dark:text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>

            {/* Dark Mode Switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-navy-500 dark:text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-850 transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-navy-500 dark:text-navy-400 hover:bg-slate-100 dark:hover:bg-navy-850 transition-colors relative"
              >
                <Bell size={18} />
                {notices.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white dark:ring-navy-900"></span>
                )}
              </button>

              {/* Notification Overlay Popover */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl shadow-xl z-50 p-4 max-h-[360px] overflow-y-auto">
                    <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100 dark:border-navy-800">
                      <h4 className="font-bold text-sm text-navy-950 dark:text-white">Active Notices</h4>
                      <span className="text-[10px] bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400 font-semibold px-2 py-0.5 rounded-full">
                        {notices.length} Total
                      </span>
                    </div>

                    {notices.length === 0 ? (
                      <div className="py-8 text-center text-xs text-navy-400 dark:text-navy-500">
                        No announcements posted at this time.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notices.map((notice) => (
                          <div key={notice.id} className="p-3 bg-slate-50 dark:bg-navy-950 rounded-xl">
                            <h5 className="font-bold text-xs text-navy-900 dark:text-white">{notice.title}</h5>
                            <p className="text-[10px] text-navy-500 dark:text-navy-400 mt-1 leading-relaxed">{notice.content}</p>
                            <span className="text-[8px] text-navy-400 dark:text-navy-500 block mt-2 text-right">
                              {new Date(notice.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-750 flex items-center justify-center font-bold text-navy-700 dark:text-navy-300 text-xs shadow-sm">
                {currentUser.full_name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Dynamic Area */}
        <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
          {renderDashboard()}
        </main>
      </div>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-navy-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-navy-800 animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-navy-800 flex justify-between items-center bg-slate-50 dark:bg-navy-950/50">
              <h3 className="font-bold text-navy-900 dark:text-white">Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-700 dark:text-navy-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-lg text-sm text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-700 dark:text-navy-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-lg text-sm text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-700 dark:text-navy-300 mb-1">New Password (optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-lg text-sm text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
