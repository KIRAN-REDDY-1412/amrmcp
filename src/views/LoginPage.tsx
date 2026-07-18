import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { navigation, useRoute } from '../services/navigation';
import { db } from '../services/db';
import { CollegeLogo, LoadingOverlay } from '../components/Icons';
import { 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  KeyRound, 
  ShieldAlert 
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const route = useRoute();
  const { login, registerSuperAdmin } = useAuth();
  const { showToast } = useToast();
  
  const selectedRole = (route.params.role || 'faculty') as 'admin' | 'principal' | 'hod' | 'faculty' | 'student' | 'admission_cell';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Setup Admin Fields
  const [adminName, setAdminName] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Is this the first run with an empty DB?
  const [isEmptyDB, setIsEmptyDB] = useState(false);

  useEffect(() => {
    // We removed the automatic empty DB check because Supabase RLS
    // prevents unauthenticated users from seeing the user count,
    // which incorrectly triggered the initialization screen.
  }, []);

  const handleBack = () => {
    navigation.navigate('landing');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all fields.', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      let loginId = email;
      if (selectedRole === 'student' && !email.includes('@')) {
        loginId = `${email.toLowerCase()}@student.amreddy.edu`;
      }
      await login(loginId, password, selectedRole);
      showToast('Logged in successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Authentication failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !email || !password || !adminConfirmPassword) {
      showToast('All fields are required.', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (password !== adminConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      await registerSuperAdmin(adminName, email, password);
      showToast('Super Admin initialized! Database created.', 'success');
      setIsEmptyDB(false);
    } catch (err: any) {
      showToast(err.message || 'Setup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render Setup Admin Screen
  if (selectedRole === 'admin' && isEmptyDB) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-300">
        {loading && <LoadingOverlay message="Initializing database..." />}
        
        {/* Background Gradients */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
          <CollegeLogo size={70} className="mb-4" />
          <h2 className="text-center text-2xl font-extrabold text-navy-950 dark:text-white">
            System Initialization
          </h2>
          <p className="mt-1 text-center text-sm text-primary-600 dark:text-primary-400 font-medium">
            Setup Super Admin (First Time Only)
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="glass py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200 dark:border-navy-800">
            
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>Zero-Data State Detected:</strong> No accounts are registered. Configure the Super Admin account below to set up your departments, principal, HODs, and faculty.
              </div>
            </div>

            <form onSubmit={handleSetupAdminSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-navy-700 dark:text-navy-300">
                  Full Name
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. A.M. Reddy"
                    className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-navy-900 dark:text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-navy-700 dark:text-navy-300">
                  Super Admin Email
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@amreddy.edu"
                    className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-navy-900 dark:text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-navy-700 dark:text-navy-300">
                  Password
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-navy-900 dark:text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-navy-400 hover:text-navy-600 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-navy-700 dark:text-navy-300">
                  Confirm Password
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy-400">
                    <KeyRound size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-navy-900 dark:text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-lg shadow-primary-500/20"
              >
                Initialize ERP Database
              </button>
              
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsEmptyDB(false)}
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  Already initialized? Sign In instead.
                </button>
              </div>
            </form>

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-navy-500 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Back to Landing Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Regular Login Screen
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-300">
      {loading && <LoadingOverlay message="Verifying credentials..." />}

      <div className="absolute top-10 left-10 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <CollegeLogo size={70} className="mb-4" />
        <h2 className="text-center text-2xl font-extrabold text-navy-950 dark:text-white">
          A.M. REDDY MEMORIAL COLLEGE
        </h2>
        <p className="mt-1 text-center text-sm text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider">
          {selectedRole === 'admission_cell' ? 'Admission Cell' : selectedRole} Login Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 animate-slide-in-bottom">
        <div className="glass py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200 dark:border-navy-800">
          
          {selectedRole !== 'admin' && isEmptyDB && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 animate-bounce" />
              <div>
                <strong>No Accounts Found:</strong> The database is empty. Go back and select <strong>Admin Login</strong> to initialize the Super Admin account first.
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-navy-700 dark:text-navy-300">
                {selectedRole === 'student' ? 'Roll Number' : 'Username or Email'}
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy-400">
                  <Mail size={18} />
                </div>
                <input
                  type={selectedRole === 'student' ? "text" : "email"}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'student' ? "e.g. Y26PH001" : "e.g. name@amreddy.edu"}
                  className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-navy-900 dark:text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-navy-700 dark:text-navy-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    showToast('Contact your immediate supervisor (Admin, Principal, or HOD) to reset or retrieve credentials.', 'info');
                  }}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-navy-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-navy-900 dark:text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-navy-400 hover:text-navy-600 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isEmptyDB && selectedRole !== 'admin'}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white transition-all shadow-lg ${
                isEmptyDB && selectedRole !== 'admin'
                  ? 'bg-navy-300 dark:bg-navy-800 cursor-not-allowed text-navy-400'
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-primary-500/20'
              }`}
            >
              Sign In
            </button>
          </form>

          {selectedRole === 'student' && (
            <div className="mt-4 text-center">
              <p className="text-sm text-navy-600 dark:text-navy-400">
                Are you a new student?{' '}
                <button
                  type="button"
                  onClick={() => navigation.navigate('register')}
                  className="font-bold text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Register here
                </button>
              </p>
            </div>
          )}

          {/* Test Hint Panel */}
          {selectedRole === 'admin' && !isEmptyDB && (
            <div className="mt-6 p-3 rounded-lg bg-navy-50 dark:bg-navy-900 text-navy-500 dark:text-navy-400 text-[10px] text-center border border-slate-100 dark:border-navy-800">
              To test Admin settings: Enter the email & password you configured during initialization.
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs text-navy-500 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Back to Landing Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
