import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db';
import type { User, Principal, HOD, Faculty, Student } from '../services/db';
import { navigation } from '../services/navigation';
import { supabase } from '../services/supabase';

interface AuthContextType {
  currentUser: User | null;
  principalProfile: Principal | null;
  hodProfile: HOD | null;
  facultyProfile: Faculty | null;
  studentProfile: Student | null;
  loading: boolean;
  login: (email: string, password: string, role: User['role']) => Promise<void>;
  logout: () => void;
  registerSuperAdmin: (name: string, email: string, password: string) => Promise<void>;
  updateProfileDetails: (updates: { phone?: string; qualifications?: string; bio?: string; designation?: string }) => Promise<void>;
  resetPassword: (userId: string, newPassword: string) => Promise<void>;
  refreshUserSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [principalProfile, setPrincipalProfile] = useState<Principal | null>(null);
  const [hodProfile, setHODProfile] = useState<HOD | null>(null);
  const [facultyProfile, setFacultyProfile] = useState<Faculty | null>(null);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const clearProfiles = () => {
    setPrincipalProfile(null);
    setHODProfile(null);
    setFacultyProfile(null);
    setStudentProfile(null);
  };

  const loadProfile = async (user: User) => {
    clearProfiles();
    if (user.role === 'principal') {
      const p = await db.getPrincipalByUserId(user.id);
      setPrincipalProfile(p || null);
    } else if (user.role === 'hod') {
      const h = await db.getHODByUserId(user.id);
      setHODProfile(h || null);
    } else if (user.role === 'faculty') {
      const f = await db.getFacultyByUserId(user.id);
      setFacultyProfile(f || null);
    } else if (user.role === 'student') {
      let s = await db.getStudentByUserId(user.id);
      if (!s) {
        // Try recovering by email if auth user is created but student record isn't linked
        const { data: byEmail } = await supabase.from('students').select('*').eq('email', user.email).single();
        if (byEmail) {
          await supabase.from('students').update({ user_id: user.id }).eq('id', byEmail.id);
          s = byEmail;
          console.warn('Student profile recovered and auto-linked.');
        }
      }
      setStudentProfile(s || null);
    }
  };

  const refreshUserSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        const user = await db.getUserById(session.user.id);
        if (user) {
          if (user.is_active) {
            setCurrentUser(user);
            await loadProfile(user);
          } else {
            await logout();
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUserSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = await db.getUserById(session.user.id);
        if (user && user.is_active) {
          setCurrentUser(user);
          await loadProfile(user);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        clearProfiles();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, role: User['role']) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned from authentication.');

      let user = await db.getUserById(authData.user.id);
      
      if (!user) {
        if (role === 'admin') {
          const { data: existingAdmins } = await supabase.from('users').select('id, email').eq('role', 'admin');
          if (!existingAdmins || existingAdmins.length === 0) {
            await supabase.from('users').insert([{
              id: authData.user.id, email, role: 'admin', full_name: 'System Admin', is_active: true
            }]);
            user = await db.getUserById(authData.user.id);
          } else {
            await supabase.auth.signOut();
            throw new Error(`The registered admin is ${existingAdmins[0]?.email}.`);
          }
        } else if (authData.user.user_metadata && authData.user.user_metadata.role) {
            const newUserData = {
              id: authData.user.id,
              email: authData.user.email || '',
              role: authData.user.user_metadata.role,
              full_name: authData.user.user_metadata.full_name || 'Student User',
              is_active: true,
            };
            await supabase.from('users').insert([newUserData]);
            user = newUserData as User;
        }

        if (!user) {
          await supabase.auth.signOut();
          throw new Error('User record not found in Supabase.');
        }
      }

      if (user.role !== role && (!user.additional_roles || !user.additional_roles.includes(role))) {
        await supabase.auth.signOut();
        throw new Error(`Account found, but not registered under ${role.toUpperCase()} role.`);
      }

      if (!user.is_active) {
        await supabase.auth.signOut();
        throw new Error('Your account is deactivated. Contact system administrator.');
      }

      setCurrentUser(user);
      await loadProfile(user);
      await db.logAction(user.id, user.email, user.role, 'Login', 'User successfully logged in via Supabase.');
      navigation.navigate('dashboard');
    } catch (err: any) {
      setLoading(false);
      throw new Error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        await db.logAction(currentUser.id, currentUser.email, currentUser.role, 'Logout', 'User successfully logged out.');
      } catch (e) {
        console.warn('Failed to log logout action:', e);
      }
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
    clearProfiles();
    navigation.navigate('landing');
  };

  const registerSuperAdmin = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { data: existingUsers } = await supabase.from('users').select('id').limit(1);
      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Admin registration is closed. Database is already initialized.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Sign-up failed: no user data.');

      const newUserId = authData.user.id;
      const { error: insertError } = await supabase.from('users').insert([{
        id: newUserId, email, role: 'admin', full_name: name, is_active: true,
      }]);

      if (insertError) throw insertError;

      const admin = await db.getUserById(newUserId);
      if (admin) {
        setCurrentUser(admin);
        await db.logAction(admin.id, admin.email, admin.role, 'Database Setup', 'Initialized system and created Super Admin account.');
      }

      navigation.navigate('dashboard');
    } catch (err: any) {
      throw new Error(err.message || 'Super Admin registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfileDetails = async (updates: { phone?: string; qualifications?: string; bio?: string; designation?: string }) => {
    if (!currentUser) return;

    if (currentUser.role === 'principal' && principalProfile) {
      const updated = await db.updatePrincipalProfile(currentUser.id, {
        phone: updates.phone ?? principalProfile.phone,
        qualifications: updates.qualifications ?? principalProfile.qualifications,
        bio: updates.bio ?? principalProfile.bio,
      });
      setPrincipalProfile(updated);
      await db.logAction(currentUser.id, currentUser.email, currentUser.role, 'Update Profile', 'Principal updated bio/contact information.');
    } else if (currentUser.role === 'hod' && hodProfile) {
      const updated = await db.updateHODProfile(currentUser.id, {
        phone: updates.phone ?? hodProfile.phone,
        qualifications: updates.qualifications ?? hodProfile.qualifications,
      });
      setHODProfile(updated);
      await db.logAction(currentUser.id, currentUser.email, currentUser.role, 'Update Profile', 'HOD updated qualifications/contact information.');
    } else if (currentUser.role === 'faculty' && facultyProfile) {
      const updated = await db.updateFacultyProfile(currentUser.id, {
        phone: updates.phone ?? facultyProfile.phone,
        qualifications: updates.qualifications ?? facultyProfile.qualifications,
        designation: updates.designation ?? facultyProfile.designation,
      });
      setFacultyProfile(updated);
      await db.logAction(currentUser.id, currentUser.email, currentUser.role, 'Update Profile', 'Faculty updated qualifications/contact details.');
    }
  };

  const resetPassword = async (userId: string, _newPassword: string) => {
    const user = await db.getUserById(userId);
    if (!user) return;
    
    await db.logAction(
      currentUser?.id || userId,
      currentUser?.email || user.email,
      currentUser?.role || user.role,
      'Password Reset Request',
      `Requested password reset link for user: ${user.email}`
    );

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        principalProfile,
        hodProfile,
        facultyProfile,
        studentProfile,
        loading,
        login,
        logout,
        registerSuperAdmin,
        updateProfileDetails,
        resetPassword,
        refreshUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
