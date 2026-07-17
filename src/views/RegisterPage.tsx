import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { navigation } from '../services/navigation';
import { GraduationCap, ArrowLeft, Mail, Phone, Lock, User, Hash } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { showToast } = useToast();
  
  // Registration Form State
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // Course Dynamics
  const [course, setCourse] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');

  const [dbState, setDbState] = useState(db.getRawState());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When course changes, reset dependent fields
  useEffect(() => {
    setBranch('');
    setYear('');
    setSemester('');
    setSection('');
  }, [course]);

  // Set default department on load
  useEffect(() => {
    if (dbState.departments.length > 0 && !departmentId) {
      setDepartmentId(dbState.departments[0].id);
    }
  }, [dbState, departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rollNumber || !email || !password || !course || !year || !section) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    
    // Additional validation for specific courses
    if ((course === 'B.PHARM' || course === 'M.PHARM') && !semester) {
      showToast('Please select a semester.', 'error');
      return;
    }
    if (course === 'M.PHARM' && !branch) {
      showToast('Please select a branch.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create User Auth Record
      const newUser = await db.createUser({
        email: email.toLowerCase(),
        password,
        role: 'student',
        full_name: name,
        is_active: true, // Auto-activate for this demo flow
      });

      // 2. Create Student Profile Record
      await db.createStudent({
        name,
        roll_number: rollNumber,
        course,
        branch: course === 'M.PHARM' ? branch : undefined,
        year,
        semester: (course === 'B.PHARM' || course === 'M.PHARM') ? semester : undefined,
        section,
        department_id: departmentId || (dbState.departments[0]?.id),
        phone,
        guardian_name: guardianName,
        user_id: newUser.id,
      });

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
          Student Registration
        </h2>
        <p className="mt-2 text-center text-sm text-navy-600 dark:text-navy-400">
          Create your portal account and configure your academic profile.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md md:max-w-2xl">
        <div className="bg-white dark:bg-navy-900 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-slate-100 dark:border-navy-800 animate-scale-up">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            <div className="border-b border-slate-100 dark:border-navy-800 pb-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-navy-400 mb-4">Account Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-navy-400" size={16} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-navy-400" size={16} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="johndoe@student.edu"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Password</label>
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

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Roll Number</label>
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
                </div>
              </div>
            </div>

            <div className="border-b border-slate-100 dark:border-navy-800 pb-4 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-navy-400 mb-4">Academic Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Course Selection</label>
                  <select
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  >
                    <option value="" disabled>Select Course</option>
                    <option value="B.PHARM">B.Pharm</option>
                    <option value="M.PHARM">M.Pharm</option>
                    <option value="PHARM.D">Pharm.D</option>
                  </select>
                </div>

                {/* Dynamic Fields */}
                {course && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in transition-all duration-500 origin-top">
                    
                    {/* Branch - M.PHARM only */}
                    {course === 'M.PHARM' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Branch</label>
                        <select
                          required
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        >
                          <option value="" disabled>Select Branch</option>
                          <option value="Regulatory Affairs">Regulatory Affairs</option>
                          <option value="Pharmaceutical Analysis">Pharmaceutical Analysis</option>
                          <option value="Pharmacology">Pharmacology</option>
                          <option value="Pharmaceutics">Pharmaceutics</option>
                        </select>
                      </div>
                    )}

                    {/* Year Dropdown */}
                    <div className={(course === 'B.PHARM' || course === 'M.PHARM') ? "col-span-1" : "sm:col-span-2"}>
                      <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Year</label>
                      <select
                        required
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      >
                        <option value="" disabled>Select Year</option>
                        <option value="I Year">I Year</option>
                        <option value="II Year">II Year</option>
                        {(course === 'B.PHARM' || course === 'PHARM.D') && (
                          <>
                            <option value="III Year">III Year</option>
                            <option value="IV Year">IV Year</option>
                          </>
                        )}
                        {course === 'PHARM.D' && (
                          <>
                            <option value="V Year">V Year</option>
                            <option value="VI Year">VI Year</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Semester Dropdown - Only for B.PHARM and M.PHARM */}
                    {(course === 'B.PHARM' || course === 'M.PHARM') && (
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Semester</label>
                        <select
                          required
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        >
                          <option value="" disabled>Select Semester</option>
                          <option value="I Semester">I Semester</option>
                          <option value="II Semester">II Semester</option>
                          <option value="III Semester">III Semester</option>
                          <option value="IV Semester">IV Semester</option>
                          {course === 'B.PHARM' && (
                            <>
                              <option value="V Semester">V Semester</option>
                              <option value="VI Semester">VI Semester</option>
                              <option value="VII Semester">VII Semester</option>
                              <option value="VIII Semester">VIII Semester</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Section Dropdown */}
                    <div className={(course === 'B.PHARM' || course === 'M.PHARM') ? "col-span-1" : "sm:col-span-2"}>
                      <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Section</label>
                      <select
                        required
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      >
                        <option value="" disabled>Select Section</option>
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-navy-400 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-navy-400" size={16} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Guardian Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-navy-400" size={16} />
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="pl-10 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/30 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-all hover:-translate-y-0.5"
              >
                {isSubmitting ? 'Registering...' : 'Complete Registration'}
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
