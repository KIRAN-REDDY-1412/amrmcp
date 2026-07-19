import React, { useState } from 'react';
import { db } from '../services/db';
import { useToast } from '../components/Toast';
import { navigation } from '../services/navigation';
import { GraduationCap, ArrowLeft, Mail, Lock, Hash, Calendar } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'new_student' | 'existing_student'>('new_student');
  
  const [rollNumber, setRollNumber] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber || !email || !password) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    
    if (activeTab === 'existing_student' && !dob) {
      showToast('Please enter your Date of Birth for verification.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify student exists by Roll Number
      const student = db.getStudentByRollNumber(rollNumber);
      if (!student) {
        if (activeTab === 'new_student') {
          throw new Error('Roll number not found. Please ensure the Admission Cell has added your details.');
        } else {
          throw new Error('Roll number not found.');
        }
      }

      // 2. Additional verification for Existing Students
      if (activeTab === 'existing_student') {
        if (student.dob && student.dob !== dob) {
          throw new Error('Verification failed. Date of Birth does not match our records.');
        }
      }

      // 3. Register the student (Create auth user and link)
      const generatedEmail = `${rollNumber.toLowerCase()}@student.amreddy.edu`;
      await db.selfRegisterStudent(rollNumber, generatedEmail, password);

      showToast('Registration successful! You can now log in.', 'success');
      navigation.navigate('login', { role: 'student' });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <button 
          onClick={() => navigation.navigate('landing')}
          className="flex items-center gap-2 text-sm font-bold text-navy-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md md:max-w-xl">
        <div className="flex justify-center">
          <div className="p-3 bg-primary-100 dark:bg-navy-800 rounded-2xl">
            <GraduationCap className="w-10 h-10 text-primary-600 dark:text-primary-500" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-navy-950 dark:text-white">
          Student Portal Setup
        </h2>
        <p className="mt-2 text-center text-sm text-navy-600 dark:text-navy-400">
          Activate your account to access the ERP.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md md:max-w-lg">
        <div className="bg-white dark:bg-navy-900 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-slate-100 dark:border-navy-800 animate-scale-up">
          
          {/* Tabs */}
          <div className="flex mb-8 bg-slate-100 dark:bg-navy-950 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab('new_student')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'new_student' 
                  ? 'bg-white dark:bg-navy-800 text-primary-600 shadow-sm' 
                  : 'text-navy-500 hover:text-navy-700 dark:hover:text-navy-300'
              }`}
            >
              New Admission
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('existing_student')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'existing_student' 
                  ? 'bg-white dark:bg-navy-800 text-primary-600 shadow-sm' 
                  : 'text-navy-500 hover:text-navy-700 dark:hover:text-navy-300'
              }`}
            >
              Existing Student
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            <div>
              <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">
                Roll Number *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 text-navy-400" size={16} />
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  className="pl-10 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Y26PH001"
                />
              </div>
              {activeTab === 'new_student' && (
                <p className="mt-1 text-[10px] text-navy-500">
                  Must be provided by the Admission Cell.
                </p>
              )}
            </div>

            {activeTab === 'existing_student' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">
                  Date of Birth (For Verification) *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-navy-400" size={16} />
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="pl-10 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-navy-800">
              <h4 className="text-xs font-bold text-navy-400 uppercase mb-3 mt-4">Create Your Login</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">
                    User ID (Roll Number)
                  </label>
                  <p className="text-xs text-navy-500 mb-2">
                    Your Roll Number will be used as your Login ID.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-navy-400" size={16} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/30 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-all hover:-translate-y-0.5"
              >
                {isSubmitting ? 'Processing...' : 'Complete Activation'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-navy-600 dark:text-navy-400">
              Already have an account?{' '}
              <button
                onClick={() => navigation.navigate('login', { role: 'student' })}
                className="font-bold text-primary-600 hover:text-primary-500 transition-colors"
              >
                Log in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
