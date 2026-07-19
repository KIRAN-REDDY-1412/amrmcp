// Database schema and CRUD engine for A.M. Reddy Memorial College of Pharmacy ERP
// Integrated with Supabase live database

import { supabase, createAuthClient } from './supabase';

// Interfaces
export interface User {
  id: string;
  email: string;
  password?: string; // Kept for interface compatibility
  role: 'admin' | 'principal' | 'hod' | 'faculty' | 'student' | 'exam_cell' | 'library' | 'admission_cell';
  additional_roles?: string[];
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
}

export interface Principal {
  id: string;
  user_id: string;
  phone: string;
  qualifications: string;
  bio: string;
}

export interface HOD {
  id: string;
  user_id: string;
  department_id: string;
  phone: string;
  qualifications: string;
  base_salary?: number;
  deductions?: number;
}

export interface Faculty {
  id: string;
  user_id: string;
  department_id: string;
  designation: string;
  phone: string;
  qualifications: string;
  joining_date: string;
  base_salary?: number;
  deductions?: number;
}

export interface Student {
  id: string;
  user_id?: string;
  status: 'Draft' | 'Documents Pending' | 'Documents Uploaded' | 'Verified' | 'Admission Approved' | 'Roll Number Pending' | 'Roll Number Assigned' | 'ERP Registration Pending' | 'ERP Account Active';
  
  // Admission Info
  course: string;
  admission_quota: 'Convenor' | 'Management' | 'Spot';
  roll_number?: string;
  
  // Personal Info
  name: string;
  photo_url?: string;
  gender: 'Male' | 'Female' | 'Other';
  dob?: string;
  phone: string;
  email?: string;
  aadhaar_number?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  sub_caste?: string;
  mole_1?: string;
  mole_2?: string;
  address?: string;
  
  // Parent Info
  father_name?: string;
  mother_name?: string;
  parent_phone?: string;
  parent_email?: string;
  father_occupation?: string;
  father_aadhaar?: string;
  mother_aadhaar?: string;
  guardian_name?: string;

  // Academic Info
  department_id?: string;
  branch?: string;
  year?: string;
  semester?: string;
  section?: string;
  academic_year?: string;
  batch?: string;
  mentor_id?: string;
  
  enrollment_date: string;
}

export interface AdmissionDocument {
  id: string;
  student_id: string;
  document_type: string;
  file_data: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  uploaded_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department_id: string;
  credits: number;
  year?: string;
  semester?: string;
  course?: string;
  branch?: string;
}

export interface SubjectAssignment {
  id: string;
  faculty_id: string;
  subject_id: string;
  semester: string;
  academic_year: string;
}

export interface TimetableSlot {
  id: string;
  subject_assignment_id: string;
  day_of_week: string; // 'Monday', 'Tuesday', etc.
  start_time: string;  // e.g. "09:00"
  end_time: string;    // e.g. "10:00"
  room: string;
  section?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  roll_number: string;
  faculty_id: string;
  subject_id: string;
  course: string;
  branch?: string;
  year: string;
  semester?: string;
  section: string;
  date: string;
  period: string; // e.g., "Period 1"
  status: 'Present' | 'Absent' | 'Late';
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
  modify_reason?: string;
}

export interface MarkRecord {
  id: string;
  subject_id: string;
  student_id: string;
  mid1_marks?: number;
  mid2_marks?: number;
  mid3_marks?: number;
  cmm_marks?: number;
  internal_status: 'Draft' | 'Pending Exam Cell' | 'Approved' | 'Rejected';
  semester_marks?: number;
  semester_status: 'Draft' | 'Pending Principal' | 'Approved' | 'Rejected';
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: string; // 'Sick', 'Casual', 'Earned', etc.
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string; // user_id of approver
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  target_role: 'All' | 'Principal' | 'HOD' | 'Faculty';
  created_by: string; // user_id
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  details: string;
  timestamp: string;
}

// Helpers
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEY = 'am_reddy_erp_database';

export interface DatabaseState {
  users: User[];
  departments: Department[];
  principals: Principal[];
  hods: HOD[];
  faculty: Faculty[];
  students: Student[];
  admission_documents: AdmissionDocument[];
  subjects: Subject[];
  subject_assignments: SubjectAssignment[];
  timetable: TimetableSlot[];
  attendance: AttendanceRecord[];
  marks: MarkRecord[];
  leave_requests: LeaveRequest[];
  notices: Notice[];
  audit_logs: AuditLog[];
}

const EMPTY_STATE: DatabaseState = {
  users: [],
  departments: [],
  principals: [],
  hods: [],
  faculty: [],
  students: [],
  admission_documents: [],
  subjects: [],
  subject_assignments: [],
  timetable: [],
  attendance: [],
  marks: [],
  leave_requests: [],
  notices: [],
  audit_logs: [],
};

export class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load database from localStorage', e);
    }
    return { ...EMPTY_STATE };
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save database to localStorage', e);
    }
  }

  public async resetDatabase() {
    // Clear public tables in Supabase
    const tables = [
      'audit_logs', 'notices', 'leave_requests', 'marks', 'attendance', 
      'timetable', 'subject_assignments', 'subjects', 'students', 
      'faculty', 'hods', 'principals', 'users', 'departments'
    ];

    for (const table of tables) {
      try {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (err) {
        console.error(`Failed to clear table ${table} in Supabase:`, err);
      }
    }

    this.state = JSON.parse(JSON.stringify(EMPTY_STATE));
    this.save();
  }

  public restoreDatabase(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        parsed &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.departments) &&
        Array.isArray(parsed.audit_logs)
      ) {
        this.state = parsed;
        this.save();
        
        // Restore to Supabase asynchronously
        this.syncStateToSupabase(parsed);
        return true;
      }
    } catch (e) {
      console.error('Failed to restore database', e);
    }
    return false;
  }

  private async syncStateToSupabase(parsed: DatabaseState) {
    try {
      // Direct restoration/insertion
      if (parsed.departments.length > 0) await supabase.from('departments').upsert(parsed.departments);
      if (parsed.users.length > 0) await supabase.from('users').upsert(parsed.users);
      if (parsed.principals.length > 0) await supabase.from('principals').upsert(parsed.principals);
      if (parsed.hods.length > 0) await supabase.from('hods').upsert(parsed.hods);
      if (parsed.faculty.length > 0) await supabase.from('faculty').upsert(parsed.faculty);
      if (parsed.students.length > 0) await supabase.from('students').upsert(parsed.students);
      if (parsed.subjects.length > 0) await supabase.from('subjects').upsert(parsed.subjects);
      if (parsed.subject_assignments.length > 0) await supabase.from('subject_assignments').upsert(parsed.subject_assignments);
      if (parsed.timetable.length > 0) await supabase.from('timetable').upsert(parsed.timetable);
      if (parsed.attendance.length > 0) await supabase.from('attendance').upsert(parsed.attendance);
      if (parsed.marks.length > 0) await supabase.from('marks').upsert(parsed.marks);
      if (parsed.leave_requests.length > 0) await supabase.from('leave_requests').upsert(parsed.leave_requests);
      if (parsed.notices.length > 0) await supabase.from('notices').upsert(parsed.notices);
      if (parsed.audit_logs.length > 0) await supabase.from('audit_logs').upsert(parsed.audit_logs);
    } catch (e) {
      console.error('Failed to restore database into Supabase:', e);
    }
  }

  public async syncWithSupabase(): Promise<void> {
    const fetchTable = async (tableName: string) => {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.warn(`Failed to fetch table ${tableName} from Supabase:`, error);
        return null;
      }
      return data || [];
    };

    const mergeArrays = (local: any[], remote: any[] | null) => {
      if (!remote) return local; // keep local only if fetch completely failed (e.g., no internet)
      return remote; // remote is the absolute source of truth
    };

    try {
      const [
        users,
        departments,
        principals,
        hods,
        faculty,
        students,
        subjects,
        subject_assignments,
        timetable,
        attendance,
        marks,
        leave_requests,
        notices,
        audit_logs
      ] = await Promise.all([
        fetchTable('users'),
        fetchTable('departments'),
        fetchTable('principals'),
        fetchTable('hods'),
        fetchTable('faculty'),
        fetchTable('students'),
        fetchTable('subjects'),
        fetchTable('subject_assignments'),
        fetchTable('timetable'),
        fetchTable('attendance'),
        fetchTable('marks'),
        fetchTable('leave_requests'),
        fetchTable('notices'),
        fetchTable('audit_logs')
      ]);

      this.state = {
        users: mergeArrays(this.state.users, users),
        departments: mergeArrays(this.state.departments, departments),
        principals: mergeArrays(this.state.principals, principals),
        hods: mergeArrays(this.state.hods, hods),
        faculty: mergeArrays(this.state.faculty, faculty),
        students: mergeArrays(this.state.students, students),
        admission_documents: mergeArrays(this.state.admission_documents, []), // or fetch them if added to fetchTable
        subjects: mergeArrays(this.state.subjects, subjects),
        subject_assignments: mergeArrays(this.state.subject_assignments, subject_assignments),
        timetable: mergeArrays(this.state.timetable, timetable),
        attendance: mergeArrays(this.state.attendance, attendance),
        marks: mergeArrays(this.state.marks, marks),
        leave_requests: mergeArrays(this.state.leave_requests, leave_requests),
        notices: mergeArrays(this.state.notices, notices),
        audit_logs: mergeArrays(this.state.audit_logs, audit_logs),
      };
      this.save();
    } catch (e) {
      console.error('Failed to sync state with Supabase:', e);
    }
  }

  public getRawState(): DatabaseState {
    return this.state;
  }

  // --- Audit Logs ---
  public async logAction(userId: string, email: string, role: string, action: string, details: string): Promise<AuditLog> {
    const log: AuditLog = {
      id: generateUUID(),
      user_id: userId,
      user_email: email,
      user_role: role,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    
    const { error } = await supabase.from('audit_logs').insert([log]);
    if (error) console.error('Error saving audit log in Supabase:', error);

    this.state.audit_logs.unshift(log);
    this.save();
    return log;
  }

  public getAuditLogs(): AuditLog[] {
    return this.state.audit_logs;
  }

  // --- Users CRUD ---
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public async grantAdditionalRole(userId: string, role: string): Promise<User> {
    const userIndex = this.state.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const user = this.state.users[userIndex];
    const roles = user.additional_roles || [];
    if (!roles.includes(role)) {
      roles.push(role);
    }

    const { error } = await supabase
      .from('users')
      .update({ additional_roles: roles })
      .eq('id', userId);

    if (error) {
      console.error('Error updating additional roles in Supabase:', error);
      throw error;
    }

    user.additional_roles = roles;
    this.state.users[userIndex] = user;
    this.save();
    return user;
  }

  public async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const authClient = createAuthClient();
    const password = (user as any).password || 'DefaultPassword123!';

    // 1. Sign up in Supabase Auth
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email: user.email,
      password,
    });

    let newUserId = authData?.user?.id;

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exist')) {
        // The user is in Auth. Try to sign in to get their UUID!
        const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
          email: user.email,
          password
        });
        
        if (signInData?.user) {
          newUserId = signInData.user.id;
        } else {
          // If we can't sign in (wrong password for existing test account)
          throw new Error(`Roll Number already exists in the system with a different password. Please use a unique Roll Number.`);
        }
      } else if (authError.message.toLowerCase().includes('rate limit')) {
        console.warn("Supabase auth rate limit hit. Generating mock user for prototype functionality.");
        newUserId = generateUUID();
      } else {
        throw authError;
      }
    }

    if (!newUserId) throw new Error('Failed to register auth user in Supabase.');

    const newUser: User = {
      ...user,
      id: newUserId,
      created_at: new Date().toISOString(),
    };

    // 2. Insert into public.users. Use upsert to handle if they somehow already exist there
    const { error: dbError } = await supabase.from('users').upsert([{
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      full_name: newUser.full_name,
      is_active: newUser.is_active,
      created_at: newUser.created_at
    }]);
    if (dbError) {
      throw new Error(`Failed to create user in database: ${dbError.message}`);
    }

    // Ensure it's in local state
    if (!this.state.users.find(u => u.id === newUser.id)) {
      this.state.users.push(newUser);
      this.save();
    }
    
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at' | 'email' | 'role'>>): Promise<User | null> {
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) throw error;

    const userIndex = this.state.users.findIndex((u) => u.id === id);
    if (userIndex === -1) return null;
    
    this.state.users[userIndex] = {
      ...this.state.users[userIndex],
      ...updates,
    };
    this.save();
    return this.state.users[userIndex];
  }

  public async setUserActive(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase.from('users').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;

    const user = this.getUserById(id);
    if (!user) return false;
    user.is_active = isActive;
    this.save();
    return true;
  }

  public async deleteUser(id: string): Promise<boolean> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;

    // Cascade deletions in cache
    this.state.principals = this.state.principals.filter((p) => p.user_id !== id);
    this.state.hods = this.state.hods.filter((h) => h.user_id !== id);
    
    const fac = this.state.faculty.find((f) => f.user_id === id);
    if (fac) {
      this.state.subject_assignments = this.state.subject_assignments.filter((sa) => sa.faculty_id !== fac.id);
      this.state.faculty = this.state.faculty.filter((f) => f.user_id !== id);
    }
    
    this.state.leave_requests = this.state.leave_requests.filter((lr) => lr.user_id !== id);
    this.state.notices = this.state.notices.filter((n) => n.created_by !== id);
    this.state.users = this.state.users.filter((u) => u.id !== id);
    this.save();
    return true;
  }

  public async deleteUsers(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const { error } = await supabase.from('users').delete().in('id', ids);
    if (error) throw error;

    this.state.principals = this.state.principals.filter((p) => !ids.includes(p.user_id));
    this.state.hods = this.state.hods.filter((h) => !ids.includes(h.user_id));
    
    const facIds = this.state.faculty.filter((f) => ids.includes(f.user_id)).map(f => f.id);
    if (facIds.length > 0) {
      this.state.subject_assignments = this.state.subject_assignments.filter((sa) => !facIds.includes(sa.faculty_id));
      this.state.faculty = this.state.faculty.filter((f) => !ids.includes(f.user_id));
    }
    
    this.state.leave_requests = this.state.leave_requests.filter((lr) => !ids.includes(lr.user_id));
    this.state.notices = this.state.notices.filter((n) => !ids.includes(n.created_by));
    this.state.users = this.state.users.filter((u) => !ids.includes(u.id));
    this.save();
    return true;
  }

  public async updateUserEmail(id: string, newEmail: string): Promise<User> {
    try {
      const user = this.state.users.find((u) => u.id === id);
      if (!user) throw new Error('User not found');
      
      const { error } = await supabase.from('users').update({ email: newEmail }).eq('id', id);
      if (error) console.warn('Supabase DB not synced, relying on memory');
      
      const updatedUser = { ...user, email: newEmail };
      this.state.users = this.state.users.map((u) => (u.id === id ? updatedUser : u));
      this.save();
      return updatedUser;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // --- Profile Roles ---
  public getPrincipalByUserId(userId: string): Principal | undefined {
    return this.state.principals.find((p) => p.user_id === userId);
  }

  public getHODByUserId(userId: string): HOD | undefined {
    return this.state.hods.find((h) => h.user_id === userId);
  }

  public getFacultyByUserId(userId: string): Faculty | undefined {
    return this.state.faculty.find((f) => f.user_id === userId);
  }

  public async createPrincipalProfile(profile: Omit<Principal, 'id'>): Promise<Principal> {
    const newProfile = { ...profile, id: generateUUID() };
    const { error } = await supabase.from('principals').insert([newProfile]);
    if (error) throw error;

    this.state.principals.push(newProfile);
    this.save();
    return newProfile;
  }

  public async updatePrincipalProfile(userId: string, updates: Partial<Omit<Principal, 'id' | 'user_id'>>): Promise<Principal | null> {
    const { error } = await supabase.from('principals').update(updates).eq('user_id', userId);
    if (error) throw error;

    const index = this.state.principals.findIndex((p) => p.user_id === userId);
    if (index === -1) return null;
    this.state.principals[index] = { ...this.state.principals[index], ...updates };
    this.save();
    return this.state.principals[index];
  }

  public async createHODProfile(profile: Omit<HOD, 'id'>): Promise<HOD> {
    const newProfile = { ...profile, id: generateUUID() };
    const { error } = await supabase.from('hods').insert([newProfile]);
    if (error) throw error;

    this.state.hods.push(newProfile);
    this.save();
    return newProfile;
  }

  public async updateHODProfile(userId: string, updates: Partial<Omit<HOD, 'id' | 'user_id'>>): Promise<HOD | null> {
    const { error } = await supabase.from('hods').update(updates).eq('user_id', userId);
    if (error) throw error;

    const index = this.state.hods.findIndex((h) => h.user_id === userId);
    if (index === -1) return null;
    this.state.hods[index] = { ...this.state.hods[index], ...updates };
    this.save();
    return this.state.hods[index];
  }

  public async createFacultyProfile(profile: Omit<Faculty, 'id'>): Promise<Faculty> {
    const newProfile = { ...profile, id: generateUUID() };
    const { error } = await supabase.from('faculty').insert([newProfile]);
    if (error) throw error;

    this.state.faculty.push(newProfile);
    this.save();
    return newProfile;
  }

  public async updateFacultyProfile(userId: string, updates: Partial<Omit<Faculty, 'id' | 'user_id'>>): Promise<Faculty | null> {
    const { error } = await supabase.from('faculty').update(updates).eq('user_id', userId);
    if (error) throw error;

    const index = this.state.faculty.findIndex((f) => f.user_id === userId);
    if (index === -1) return null;
    this.state.faculty[index] = { ...this.state.faculty[index], ...updates };
    this.save();
    return this.state.faculty[index];
  }

  // --- Departments ---
  public getDepartments() {
    return this.state.departments;
  }

  public getAdmissionDocuments(studentId?: string) {
    if (studentId) {
      return this.state.admission_documents.filter(d => d.student_id === studentId);
    }
    return this.state.admission_documents;
  }

  public async updateAdmissionDocumentStatus(docId: string, status: 'Verified' | 'Rejected') {
    const docIndex = this.state.admission_documents.findIndex(d => d.id === docId);
    if (docIndex === -1) return;

    // Update in Supabase
    const { error } = await supabase
      .from('admission_documents')
      .update({ status })
      .eq('id', docId);

    if (error) {
      console.error("Error updating document status in Supabase", error);
      throw error;
    }

    // Update locally
    this.state.admission_documents[docIndex].status = status;
    this.save();
  }

  public async updateStudentStatus(studentId: string, status: string) {
    const sIndex = this.state.students.findIndex(s => s.id === studentId);
    if (sIndex === -1) return;

    const { error } = await supabase
      .from('students')
      .update({ status })
      .eq('id', studentId);

    if (error) {
      console.error("Error updating student status in Supabase", error);
      throw error;
    }

    this.state.students[sIndex].status = status as any;
    this.save();
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.state.departments.find((d) => d.id === id);
  }

  public async createDepartment(dept: Omit<Department, 'id' | 'created_at'>): Promise<Department> {
    const newDept: Department = {
      ...dept,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('departments').insert([newDept]);
    if (error) throw error;

    this.state.departments.push(newDept);
    this.save();
    return newDept;
  }

  public async updateDepartment(id: string, updates: Partial<Omit<Department, 'id' | 'created_at'>>): Promise<Department | null> {
    const { error } = await supabase.from('departments').update(updates).eq('id', id);
    if (error) throw error;

    const index = this.state.departments.findIndex((d) => d.id === id);
    if (index === -1) return null;
    this.state.departments[index] = { ...this.state.departments[index], ...updates };
    this.save();
    return this.state.departments[index];
  }

  public async deleteDepartment(id: string): Promise<boolean> {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;

    // Cache cascades
    this.state.hods = this.state.hods.filter((h) => h.department_id !== id);
    this.state.faculty = this.state.faculty.filter((f) => f.department_id !== id);
    this.state.students = this.state.students.filter((s) => s.department_id !== id);
    
    const subIds = this.state.subjects.filter((s) => s.department_id === id).map((s) => s.id);
    this.state.subjects = this.state.subjects.filter((s) => s.department_id !== id);
    this.state.subject_assignments = this.state.subject_assignments.filter((sa) => !subIds.includes(sa.subject_id));

    this.state.departments = this.state.departments.filter((d) => d.id !== id);
    this.save();
    return true;
  }

  // --- Students ---
  public getStudents(): Student[] {
    return this.state.students;
  }

  public getStudentById(id: string): Student | undefined {
    return this.state.students.find((s) => s.id === id);
  }

  public getStudentByUserId(userId: string): Student | undefined {
    return this.state.students.find((s) => s.user_id === userId);
  }

  public getStudentByRollNumber(rollNumber: string): Student | undefined {
    return this.state.students.find((s) => s.roll_number?.toLowerCase() === rollNumber.toLowerCase());
  }

  public getStudentsByDepartment(deptId: string): Student[] {
    return this.state.students.filter((s) => s.department_id === deptId);
  }

  public async createStudent(student: Omit<Student, 'id' | 'enrollment_date'>): Promise<Student> {
    const newStudent: Student = {
      ...student,
      id: generateUUID(),
      enrollment_date: new Date().toISOString(),
    };

    // Ensure we only insert columns that exist in the Supabase schema
    const defaultDept = this.state.departments.length > 0 ? this.state.departments[0].id : null;
    const dbStudent = {
      id: newStudent.id,
      name: newStudent.name,
      roll_number: newStudent.roll_number,
      department_id: newStudent.department_id || defaultDept,
      phone: newStudent.phone || '',
      guardian_name: newStudent.guardian_name || '',
      enrollment_date: newStudent.enrollment_date
    };

    if (dbStudent.department_id) {
        const { error } = await supabase.from('students').insert([dbStudent]);
        if (error) {
          throw new Error(`Failed to create student in database: ${error.message}`);
        }
    } else {
        console.warn("Skipping Supabase insert for student because no department_id is available.");
    }

    this.state.students.push(newStudent);
    this.save();
    return newStudent;
  }

  public async updateStudent(id: string, updates: Partial<Omit<Student, 'id' | 'enrollment_date'>>): Promise<Student | null> {
    const validDbKeys = ['name', 'roll_number', 'department_id', 'phone', 'guardian_name'];
    const dbUpdates: any = {};
    for (const key of validDbKeys) {
      if (key in updates) {
        dbUpdates[key] = (updates as any)[key];
      }
    }
    
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('students').update(dbUpdates).eq('id', id);
      if (error) throw error;
    }

    const index = this.state.students.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.state.students[index] = { ...this.state.students[index], ...updates };
    this.save();
    return this.state.students[index];
  }

  public async deleteStudent(id: string): Promise<boolean> {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;

    this.state.attendance = this.state.attendance.filter((a) => a.student_id !== id);
    this.state.marks = this.state.marks.filter((m) => m.student_id !== id);
    this.state.students = this.state.students.filter((s) => s.id !== id);
    this.save();
    return true;
  }

  public async deleteStudents(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const { error } = await supabase.from('students').delete().in('id', ids);
    if (error) throw error;

    this.state.attendance = this.state.attendance.filter((a) => !ids.includes(a.student_id));
    this.state.marks = this.state.marks.filter((m) => !ids.includes(m.student_id));
    this.state.students = this.state.students.filter((s) => !ids.includes(s.id));
    this.save();
    return true;
  }

  public async registerStudentToERP(studentId: string, customPassword?: string): Promise<boolean> {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');
    if (!student.roll_number) throw new Error('Student must have a Roll Number before ERP registration');
    if (student.status === 'ERP Account Active') throw new Error('Student is already registered');
    
    const tempEmail = `${student.roll_number.toLowerCase()}@student.amreddy.edu`;
    const tempPassword = customPassword || 'Student@123';

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tempEmail,
      password: tempPassword,
      options: { data: { full_name: student.name, role: 'student' } }
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error("Auth user creation failed");
    
    // 2. Add to public.users
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: tempEmail,
      role: 'student',
      full_name: student.name,
      is_active: true
    });
    if (userError) throw userError;

    // 3. Link to student and change status (Only in local state since DB lacks these columns)
    // Removed supabase update since user_id, status, email are not in the Supabase students table.
    
    // Instead, just update local state directly so it persists in localStorage
    const localStudent = this.state.students.find(s => s.id === student.id);
    if (localStudent) {
      localStudent.user_id = authData.user.id;
      localStudent.status = 'ERP Account Active';
      localStudent.email = tempEmail;
      this.save();
    }
    
    await this.syncWithSupabase();
    return true;
  }

  public async selfRegisterStudent(rollNumber: string, email: string, password: string): Promise<boolean> {
    const student = this.getStudentByRollNumber(rollNumber);
    if (!student) throw new Error('Student roll number not found in the system.');
    if (student.status === 'ERP Account Active' || student.user_id) {
      throw new Error('This student is already registered in the ERP.');
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: { data: { full_name: student.name, role: 'student' } }
    });
    
    if (authError) {
      // Handle "already registered" error gracefully for mock scenarios
      if (authError.message.includes('already registered') || authError.message.includes('already exist')) {
        throw new Error('Email is already registered. Please use a different email or login.');
      }
      throw authError;
    }
    
    // In mock setup without email confirmation, user might not be returned immediately if confirmation is required.
    // Assuming auto-confirm is on or we mock it:
    let newUserId = authData?.user?.id;
    if (!newUserId) {
       newUserId = generateUUID(); // fallback for prototype
    }

    // 2. Add to public.users
    const { error: userError } = await supabase.from('users').upsert({
      id: newUserId,
      email: email.toLowerCase(),
      role: 'student',
      full_name: student.name,
      is_active: true
    });
    
    if (userError) throw userError;

    // 3. Link to student and change status (Local State Only)
    // Removed supabase update since user_id, status, email are not in the Supabase students table.
    
    // Instead, update local state
    const localStudent = this.state.students.find(s => s.id === student.id);
    if (localStudent) {
      localStudent.user_id = newUserId || '';
      localStudent.status = 'ERP Account Active';
      localStudent.email = email.toLowerCase();
      this.save();
    }
    
    await this.syncWithSupabase();
    return true;
  }

  public async bulkPromoteStudents(course: string, fromYear: string, toYear: string): Promise<number> {
    let updatedCount = 0;

    this.state.students = this.state.students.map(student => {
      if (student.course === course && student.year === fromYear) {
        updatedCount++;
        return { ...student, year: toYear };
      }
      return student;
    });

    if (updatedCount > 0) {
      this.save();
      // Attempt to sync to Supabase (if the year column exists in remote DB)
      const { error } = await supabase
        .from('students')
        .update({ year: toYear })
        .eq('course', course)
        .eq('year', fromYear);
        
      if (error) {
        console.error("Supabase bulk promote error (may not have column 'year' yet):", error);
      }
    }

    return updatedCount;
  }

  // --- Attendance Management ---
  public getStudentsByFilters(filters: {
    course: string;
    branch?: string;
    year: string;
    semester?: string;
    section: string;
  }): Student[] {
    return this.state.students.filter(s => {
      if (s.course !== filters.course) return false;
      if (s.year !== filters.year) return false;
      if (s.section !== filters.section) return false;
      if (filters.course === 'M.PHARM' && s.branch !== filters.branch) return false;
      if (filters.course !== 'PHARM.D' && s.semester !== filters.semester) return false;
      return true;
    });
  }

  public async saveAttendanceBatch(records: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    // Duplicate Check
    for (const record of records) {
      const exists = this.state.attendance.some(
        a => a.student_id === record.student_id && a.date === record.date && a.subject_id === record.subject_id && a.period === record.period
      );
      if (exists) {
        throw new Error(`Attendance has already been submitted for this class and period.`);
      }
    }

    const newRecords: AttendanceRecord[] = records.map(r => ({
      ...r,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const supabasePayload = newRecords.map(r => ({
      id: r.id,
      subject_id: r.subject_id,
      student_id: r.student_id,
      date: r.date,
      status: r.status
    }));

    const { error } = await supabase.from('attendance').insert(supabasePayload);
    if (error) {
      throw new Error(`Failed to save attendance to database: ${error.message}`);
    }

    this.state.attendance.push(...newRecords);
    this.save();
  }

  public getAttendanceByFilters(date: string, subjectId: string, period: string): AttendanceRecord[] {
    return this.state.attendance.filter(a => a.date === date && a.subject_id === subjectId && a.period === period);
  }

  public async updateAttendanceRecord(
    id: string, 
    updates: Partial<Pick<AttendanceRecord, 'status'>>, 
    modifierId: string, 
    reason: string
  ): Promise<void> {
    const recordIndex = this.state.attendance.findIndex(a => a.id === id);
    if (recordIndex === -1) throw new Error("Attendance record not found.");

    const updatedRecord = {
      ...this.state.attendance[recordIndex],
      ...updates,
      updated_at: new Date().toISOString(),
      last_modified_by: modifierId,
      modify_reason: reason
    };

    const { error } = await supabase.from('attendance').update({ status: updatedRecord.status }).eq('id', id);
    if (error) {
      throw new Error(`Failed to update attendance in database: ${error.message}`);
    }

    this.state.attendance[recordIndex] = updatedRecord;
    this.save();
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    return this.state.subjects;
  }

  public async saveSubjectsBatch(subjects: Omit<Subject, 'id'>[]): Promise<void> {
    const newSubjects: Subject[] = subjects.map(s => ({
      ...s,
      id: generateUUID()
    }));

    const { error } = await supabase.from('subjects').insert(newSubjects);
    if (error) {
      console.error("Supabase insert error for subjects:", error);
      throw error;
    }
    
    this.state.subjects.push(...newSubjects);
    this.save();
  }

  public getSubjectById(id: string): Subject | undefined {
    return this.state.subjects.find((s) => s.id === id);
  }

  public getSubjectsByDepartment(deptId: string): Subject[] {
    return this.state.subjects.filter((s) => s.department_id === deptId);
  }

  public async createSubject(subject: Omit<Subject, 'id'>): Promise<Subject> {
    const newSub = { ...subject, id: generateUUID() };
    const { error } = await supabase.from('subjects').insert([newSub]);
    if (error) throw error;

    this.state.subjects.push(newSub);
    this.save();
    return newSub;
  }

  public async updateSubject(id: string, updates: Partial<Omit<Subject, 'id'>>): Promise<Subject | null> {
    const { error } = await supabase.from('subjects').update(updates).eq('id', id);
    if (error) throw error;

    const index = this.state.subjects.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.state.subjects[index] = { ...this.state.subjects[index], ...updates };
    this.save();
    return this.state.subjects[index];
  }

  public async deleteSubject(id: string): Promise<boolean> {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;

    this.state.subject_assignments = this.state.subject_assignments.filter((sa) => sa.subject_id !== id);
    this.state.attendance = this.state.attendance.filter((a) => a.subject_id !== id);
    this.state.marks = this.state.marks.filter((m) => m.subject_id !== id);
    this.state.subjects = this.state.subjects.filter((s) => s.id !== id);
    this.save();
    return true;
  }

  // --- Subject Assignments ---
  public getSubjectAssignments(): SubjectAssignment[] {
    return this.state.subject_assignments;
  }

  public getSubjectAssignmentById(id: string): SubjectAssignment | undefined {
    return this.state.subject_assignments.find((sa) => sa.id === id);
  }

  public getAssignmentsByFaculty(facultyId: string): SubjectAssignment[] {
    return this.state.subject_assignments.filter((sa) => sa.faculty_id === facultyId);
  }

  public async assignSubject(assignment: Omit<SubjectAssignment, 'id'>): Promise<SubjectAssignment> {
    const existing = this.state.subject_assignments.find(
      (sa) => sa.faculty_id === assignment.faculty_id && sa.subject_id === assignment.subject_id
    );
    if (existing) return existing;
    
    const newAssign = { ...assignment, id: generateUUID() };
    const { error } = await supabase.from('subject_assignments').insert([newAssign]);
    if (error) throw error;

    this.state.subject_assignments.push(newAssign);
    this.save();
    return newAssign;
  }

  public async deleteAssignment(id: string): Promise<boolean> {
    const { error } = await supabase.from('subject_assignments').delete().eq('id', id);
    if (error) throw error;

    this.state.timetable = this.state.timetable.filter((t) => t.subject_assignment_id !== id);
    this.state.subject_assignments = this.state.subject_assignments.filter((sa) => sa.id !== id);
    this.save();
    return true;
  }

  // --- Timetable ---
  public getTimetableSlots(): TimetableSlot[] {
    return this.state.timetable;
  }

  public getTimetableForFaculty(facultyId: string): (TimetableSlot & { subjectName: string; subjectCode: string })[] {
    const assignments = this.getAssignmentsByFaculty(facultyId);
    const assignmentIds = assignments.map((a) => a.id);
    const slots = this.state.timetable.filter((t) => assignmentIds.includes(t.subject_assignment_id));
    
    return slots.map((slot) => {
      const assignment = assignments.find((a) => a.id === slot.subject_assignment_id)!;
      const subject = this.getSubjectById(assignment.subject_id)!;
      return {
        ...slot,
        subjectName: subject?.name || 'Unknown',
        subjectCode: subject?.code || '',
      };
    });
  }

  public async createTimetableSlot(slot: Omit<TimetableSlot, 'id'>): Promise<TimetableSlot> {
    const newSlot = { ...slot, id: generateUUID() };
    const { error } = await supabase.from('timetable').insert([newSlot]);
    if (error) throw error;

    this.state.timetable.push(newSlot);
    this.save();
    return newSlot;
  }

  public async deleteTimetableSlot(id: string): Promise<boolean> {
    const { error } = await supabase.from('timetable').delete().eq('id', id);
    if (error) throw error;

    this.state.timetable = this.state.timetable.filter((t) => t.id !== id);
    this.save();
    return true;
  }

  // --- Attendance ---
  public getAttendance(): AttendanceRecord[] {
    return this.state.attendance;
  }

  public getAttendanceForSubject(subjectId: string): AttendanceRecord[] {
    return this.state.attendance.filter((a) => a.subject_id === subjectId);
  }



  // --- Marks ---
  public getMarks(): MarkRecord[] {
    return this.state.marks;
  }

  public getMarksForSubject(subjectId: string): MarkRecord[] {
    return this.state.marks.filter((m) => m.subject_id === subjectId);
  }

  public async saveInternalMarksBatch(records: Pick<MarkRecord, 'subject_id' | 'student_id' | 'mid1_marks' | 'mid2_marks' | 'mid3_marks' | 'cmm_marks' | 'internal_status'>[]): Promise<void> {
    const upsertRecords = records.map((record) => {
      const existing = this.state.marks.find(
        (m) => m.subject_id === record.subject_id && m.student_id === record.student_id
      );
      return {
        id: existing ? existing.id : generateUUID(),
        subject_id: record.subject_id,
        student_id: record.student_id,
        mid1_marks: record.mid1_marks,
        mid2_marks: record.mid2_marks,
        mid3_marks: record.mid3_marks,
        cmm_marks: record.cmm_marks,
        internal_status: record.internal_status,
        semester_marks: existing?.semester_marks,
        semester_status: existing?.semester_status || 'Draft',
      };
    });

    const { error } = await supabase.from('marks').upsert(upsertRecords);
    if (error) throw error;

    upsertRecords.forEach((record) => {
      const idx = this.state.marks.findIndex((m) => m.id === record.id);
      if (idx > -1) {
        this.state.marks[idx] = record as MarkRecord;
      } else {
        this.state.marks.push(record as MarkRecord);
      }
    });
    this.save();
  }

  public async saveSemesterMarksBatch(records: Pick<MarkRecord, 'subject_id' | 'student_id' | 'semester_marks' | 'semester_status'>[]): Promise<void> {
    const upsertRecords = records.map((record) => {
      const existing = this.state.marks.find(
        (m) => m.subject_id === record.subject_id && m.student_id === record.student_id
      );
      if (!existing) throw new Error("Cannot add semester marks without existing record");
      
      return {
        ...existing,
        semester_marks: record.semester_marks,
        semester_status: record.semester_status,
      };
    });

    const { error } = await supabase.from('marks').upsert(upsertRecords);
    if (error) throw error;

    upsertRecords.forEach((record) => {
      const idx = this.state.marks.findIndex((m) => m.id === record.id);
      if (idx > -1) {
        this.state.marks[idx] = record;
      }
    });
    this.save();
  }

  public async updateInternalStatus(subjectId: string, newStatus: 'Pending Exam Cell' | 'Approved' | 'Rejected' | 'Draft'): Promise<void> {
    const { error } = await supabase
      .from('marks')
      .update({ internal_status: newStatus })
      .eq('subject_id', subjectId);
    
    if (error) {
      throw new Error(`Failed to update internal status in database: ${error.message}`);
    }

    this.state.marks.forEach(m => {
      if (m.subject_id === subjectId) {
        m.internal_status = newStatus;
      }
    });
    this.save();
  }

  public async updateSemesterStatus(subjectId: string, newStatus: 'Pending Principal' | 'Approved' | 'Rejected' | 'Draft'): Promise<void> {
    const { error } = await supabase
      .from('marks')
      .update({ semester_status: newStatus })
      .eq('subject_id', subjectId);
    
    if (error) {
      throw new Error(`Failed to update semester status in database: ${error.message}`);
    }

    this.state.marks.forEach(m => {
      if (m.subject_id === subjectId) {
        m.semester_status = newStatus;
      }
    });
    this.save();
  }

  // --- Leave Requests ---
  public getLeaveRequests(): LeaveRequest[] {
    return this.state.leave_requests;
  }

  public getLeaveRequestsByUser(userId: string): LeaveRequest[] {
    return this.state.leave_requests.filter((lr) => lr.user_id === userId);
  }

  public getLeaveRequestsByDepartment(deptId: string): (LeaveRequest & { userName: string; userEmail: string })[] {
    const deptFaculty = this.state.faculty.filter((f) => f.department_id === deptId);
    const facultyUserIds = deptFaculty.map((f) => f.user_id);
    const requests = this.state.leave_requests.filter((lr) => facultyUserIds.includes(lr.user_id));
    
    return requests.map((lr) => {
      const user = this.getUserById(lr.user_id)!;
      return {
        ...lr,
        userName: user?.full_name || 'Unknown',
        userEmail: user?.email || '',
      };
    });
  }

  public async createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status' | 'created_at'>): Promise<LeaveRequest> {
    const newReq: LeaveRequest = {
      ...request,
      id: generateUUID(),
      status: 'Pending',
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('leave_requests').insert([newReq]);
    if (error) throw error;

    this.state.leave_requests.push(newReq);
    this.save();
    return newReq;
  }

  public async updateLeaveStatus(id: string, status: 'Approved' | 'Rejected', approverUserId: string): Promise<boolean> {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: status, approved_by: approverUserId })
      .eq('id', id);
    if (error) throw error;

    const request = this.state.leave_requests.find((lr) => lr.id === id);
    if (!request) return false;
    request.status = status;
    request.approved_by = approverUserId;
    this.save();
    return true;
  }

  // --- Notices ---
  public getNotices(): Notice[] {
    return this.state.notices;
  }

  public getNoticesForRole(role: User['role']): Notice[] {
    return this.state.notices.filter(
      (n) => n.target_role === 'All' || n.target_role.toLowerCase() === role.toLowerCase()
    );
  }

  public async createNotice(notice: Omit<Notice, 'id' | 'created_at'>): Promise<Notice> {
    const newNotice: Notice = {
      ...notice,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('notices').insert([newNotice]);
    if (error) throw error;

    this.state.notices.push(newNotice);
    this.save();
    return newNotice;
  }

  public async deleteNotice(id: string): Promise<boolean> {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) throw error;

    this.state.notices = this.state.notices.filter((n) => n.id !== id);
    this.save();
    return true;
  }

  // SQL Schema Output Generator (Kept for UI compatibility)
  public generateSQLSchema(): string {
    return `-- =======================================================
-- A.M. REDDY MEMORIAL COLLEGE OF PHARMACY ERP SCHEMA
-- TARGET PLATFORM: SUPABASE (POSTGRESQL)
-- =======================================================
-- Placed in supabase/migrations/20260715000000_init.sql`;
  }
}

// Instantiate global db connection
export const db = new Database();
