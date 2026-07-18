import React, { useEffect, useState } from 'react';
import { CollegeLogo } from '../components/Icons';
import { navigation } from '../services/navigation';
import { db } from '../services/db';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  Sun, 
  Moon,
  Info,
  User,
  Building,
  ClipboardList,
  Library,
  UserPlus
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
           localStorage.getItem('theme') === 'dark';
  });

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

  const loginRoles = [
    {
      id: 'admin',
      title: 'Admin Login',
      description: 'Super Admin settings, account creations, database management, and audit logs.',
      icon: ShieldCheck,
      color: 'from-navy-700 to-blue-900',
      lightBg: 'bg-slate-50/60 hover:bg-slate-50',
      darkBg: 'dark:bg-navy-900/40 dark:hover:bg-navy-900/60',
      borderColor: 'border-slate-200 dark:border-navy-800',
      iconColor: 'text-navy-700 dark:text-navy-300',
    },
    {
      id: 'admission_cell',
      title: 'Admission Cell',
      description: 'Manage new student admissions, inquiries, and application processing.',
      icon: UserPlus,
      color: 'from-orange-600 to-amber-700',
      lightBg: 'bg-orange-50/50 hover:bg-orange-50',
      darkBg: 'dark:bg-orange-950/20 dark:hover:bg-orange-950/30',
      borderColor: 'border-orange-200 dark:border-orange-900/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      id: 'principal',
      title: 'Principal Login',
      description: 'Access academic approvals, notices, and institutional reports.',
      icon: GraduationCap,
      color: 'from-blue-600 to-indigo-700',
      lightBg: 'bg-blue-50/50 hover:bg-blue-50',
      darkBg: 'dark:bg-blue-950/20 dark:hover:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'hod',
      title: 'HOD Login',
      description: 'Manage departmental faculty, subject assignments, and class lists.',
      icon: Users,
      color: 'from-sky-600 to-blue-700',
      lightBg: 'bg-sky-50/50 hover:bg-sky-50',
      darkBg: 'dark:bg-sky-950/20 dark:hover:bg-sky-950/30',
      borderColor: 'border-sky-200 dark:border-sky-900/40',
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      id: 'faculty',
      title: 'Faculty Login',
      description: 'Record student attendance, upload midterm/final marks, and apply for leaves.',
      icon: BookOpen,
      color: 'from-indigo-600 to-violet-700',
      lightBg: 'bg-indigo-50/50 hover:bg-indigo-50',
      darkBg: 'dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30',
      borderColor: 'border-indigo-200 dark:border-indigo-900/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'student',
      title: 'Student Login',
      description: 'Access attendance, academic records, assignments, and exam results.',
      icon: User,
      color: 'from-emerald-600 to-teal-700',
      lightBg: 'bg-emerald-50/50 hover:bg-emerald-50',
      darkBg: 'dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
      borderColor: 'border-emerald-200 dark:border-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'exam_cell',
      title: 'Exam Cell Login',
      description: 'Manage exam schedules, seating arrangements, and result publishing.',
      icon: ClipboardList,
      color: 'from-purple-600 to-fuchsia-700',
      lightBg: 'bg-purple-50/50 hover:bg-purple-50',
      darkBg: 'dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
      borderColor: 'border-purple-200 dark:border-purple-900/40',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'library',
      title: 'Library Login',
      description: 'Manage books, digital resources, and student book issuances.',
      icon: Library,
      color: 'from-rose-600 to-pink-700',
      lightBg: 'bg-rose-50/50 hover:bg-rose-50',
      darkBg: 'dark:bg-rose-950/20 dark:hover:bg-rose-950/30',
      borderColor: 'border-rose-200 dark:border-rose-900/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
    }
  ];

  const handleRoleSelect = (roleId: string) => {
    navigation.navigate('login', { role: roleId });
  };

  const usersCount = db.getUsers().length;

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden relative bg-slate-50 dark:bg-navy-950 transition-colors duration-300">
      
      {/* Background Graphic Accents */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-primary-300/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
            ERP PORTAL
          </span>
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors shadow-sm"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Hero Header Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-7xl mx-auto w-full z-10">
        
        {/* College Logo */}
        <div className="mb-6 flex justify-center">
          <CollegeLogo size={96} />
        </div>

        {/* Institution Title */}
        <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-navy-950 dark:text-white max-w-4xl leading-tight">
          A.M. REDDY MEMORIAL COLLEGE OF PHARMACY
        </h1>
        
        {/* System Subtitle */}
        <p className="mt-3 text-center text-lg sm:text-xl font-medium text-primary-600 dark:text-primary-400 tracking-wide uppercase">
          College Management System
        </p>

        {usersCount === 0 && (
          <div className="mt-6 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs sm:text-sm text-center max-w-lg">
            <Info size={16} className="flex-shrink-0 animate-pulse" />
            <span>
              <strong>System Uninitialized:</strong> Click <strong>Admin Login</strong> to setup the Super Admin account.
            </span>
          </div>
        )}

        {/* Role Selection Cards */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 w-full max-w-7xl">
          {loginRoles.map((role) => {
            const IconComp = role.icon;
            return (
              <div
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`group cursor-pointer rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-navy-900/60 ${role.borderColor} hover:border-primary-500/40 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(20%-20px)]`}
              >
                <div>
                  {/* Icon Block with subtle gradient background */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${role.lightBg} ${role.darkBg} border border-slate-100 dark:border-navy-800 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComp size={22} className={role.iconColor} />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-navy-950 dark:text-white font-bold text-lg leading-snug group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
                    {role.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="mt-2 text-xs text-navy-500 dark:text-navy-400 leading-relaxed">
                    {role.description}
                  </p>
                </div>

                {/* Arrow indicator */}
                <div className="mt-6 flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:translate-x-1.5 transition-transform duration-300">
                  <span>Sign In</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full py-6 text-center border-t border-slate-200 dark:border-navy-900 bg-white/40 dark:bg-navy-950/40 z-10 text-xs text-navy-400 dark:text-navy-500">
        <p>© {new Date().getFullYear()} A.M. Reddy Memorial College of Pharmacy. All Rights Reserved.</p>
        <p className="mt-1">Designed for secure role-based access control and Supabase syncing.</p>
      </footer>
    </div>
  );
};
