export interface DatabaseState {
  users: User[];
  departments: Department[];
  principals: Principal[];
  hods: HOD[];
  faculty: Faculty[];
  students: Student[];
  admission_documents: any[];
  subjects: Subject[];
  subject_assignments: SubjectAssignment[];
  timetable: TimetableSlot[];
  attendance: AttendanceRecord[];
  marks: MarkRecord[];
  leave_requests: LeaveRequest[];
  notices: Notice[];
  audit_logs: AuditLog[];
}
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
import { supabase, createAuthClient } from './supabase';

// Helper
export function generateUUID(): string {
  return crypto.randomUUID();
}

export const db = {
  // Add a dummy syncWithSupabase and getRawState to temporarily avoid crashing the app
  // before we refactor the components.
  syncWithSupabase: async () => {},
  getRawState: (): DatabaseState => ({
    users: [], departments: [], principals: [], hods: [], faculty: [], students: [],
    admission_documents: [], subjects: [], subject_assignments: [], timetable: [],
    attendance: [], marks: [], leave_requests: [], notices: [], audit_logs: []
  }),
  resetDatabase: async () => {},
  restoreDatabase: async (data: string) => false,
  getAdmissionDocuments: async () => (await supabase.from('admission_documents').select('*')).data || [],
  updateAdmissionDocumentStatus: async (id: string, status: string, notes?: string) => { await supabase.from('admission_documents').update({ status, notes }).eq('id', id); },
  updateStudentStatus: async (id: string, status: string) => { await supabase.from('students').update({ status }).eq('id', id); },
  getNoticesForRole: async (role: string) => {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    return (data || []).filter((n: any) => n.target_roles.includes('all') || n.target_roles.includes(role));
  },
  getTimetableForFaculty: async (facultyId: string) => {
    const assignments = (await supabase.from('subject_assignments').select('*').eq('faculty_id', facultyId)).data || [];
    const assignmentIds = assignments.map((a: any) => a.id);
    if (!assignmentIds.length) return [];
    return (await supabase.from('timetable').select('*').in('subject_assignment_id', assignmentIds)).data || [];
  },
  getLeaveRequestsByDepartment: async (deptId: string) => {
    // Basic implementation that fetches all, you could refine this via joins later
    return (await supabase.from('leave_requests').select('*')).data || [];
  },
  generateSQLSchema: () => "-- Schema is in supabase",
  fetchAllData: async (): Promise<DatabaseState> => {
    const [
      users, departments, principals, hods, faculty, students,
      admission_documents, subjects, subject_assignments, timetable,
      attendance, marks, leave_requests, notices, audit_logs
    ] = await Promise.all([
      db.getUsers(), db.getDepartments(), db.getPrincipals(), db.getHods(), db.getFaculty(), db.getStudents(),
      Promise.resolve([]), db.getSubjects(), db.getSubjectAssignments(), db.getTimetableSlots(),
      Promise.resolve([]), db.getMarks(), db.getLeaveRequests(), db.getNotices(), db.getAuditLogs()
    ]);
    return {
      users, departments, principals, hods, faculty, students,
      admission_documents, subjects, subject_assignments, timetable,
      attendance, marks, leave_requests, notices, audit_logs
    };
  },

  // --- Audit Logs ---
  logAction: async (userId: string, email: string, role: string, action: string, details: string) => {
    const log = { id: generateUUID(), user_id: userId, user_email: email, user_role: role, action, details, timestamp: new Date().toISOString() };
    await supabase.from('audit_logs').insert([log]);
    return log;
  },

  getAuditLogs: async () => {
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    return data || [];
  },

  // --- Users CRUD ---
  getUsers: async () => {
    const { data } = await supabase.from('users').select('*');
    return data || [];
  },
  
  getUserById: async (id: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data || undefined;
  },

  grantAdditionalRole: async (userId: string, role: string) => {
    const user = await db.getUserById(userId);
    if (!user) throw new Error(`User not found`);
    const roles = user.additional_roles || [];
    if (!roles.includes(role)) roles.push(role);
    const { data } = await supabase.from('users').update({ additional_roles: roles }).eq('id', userId).select().single();
    return data;
  },

  createUser: async (user: any) => {
    const authClient = createAuthClient();
    const password = user.password || 'DefaultPassword123!';
    const { data: authData, error: authError } = await authClient.auth.signUp({ email: user.email, password });
    
    let newUserId = authData?.user?.id;
    if (authError) {
      if (authError.message.includes('already registered')) {
        const { data: signInData } = await authClient.auth.signInWithPassword({ email: user.email, password });
        if (signInData?.user) newUserId = signInData.user.id;
        else throw new Error('User exists but password does not match.');
      } else {
        throw authError;
      }
    }
    const { password: _password, ...userWithoutPassword } = user;
    const newUser = { ...userWithoutPassword, id: newUserId, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from('users').upsert([newUser]).select().single();
    if (error) throw error;
    return data;
  },

  updateUser: async (id: string, updates: any) => {
    const { data } = await supabase.from('users').update(updates).eq('id', id).select().single();
    return data;
  },

  setUserActive: async (id: string, isActive: boolean) => {
    await supabase.from('users').update({ is_active: isActive }).eq('id', id);
    return true;
  },

  deleteUser: async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
    return true;
  },

  deleteUsers: async (ids: string[]) => {
    if (ids.length) await supabase.from('users').delete().in('id', ids);
    return true;
  },

  updateUserEmail: async (id: string, newEmail: string) => {
    const { data } = await supabase.from('users').update({ email: newEmail }).eq('id', id).select().single();
    return data;
  },

  // --- Profiles ---
  getPrincipals: async () => (await supabase.from('principals').select('*')).data || [],
  getHods: async () => (await supabase.from('hods').select('*')).data || [],
  getFaculty: async () => (await supabase.from('faculty').select('*')).data || [],
  getPrincipalByUserId: async (userId: string) => (await supabase.from('principals').select('*').eq('user_id', userId).single()).data || undefined,
  getHODByUserId: async (userId: string) => (await supabase.from('hods').select('*').eq('user_id', userId).single()).data || undefined,
  getFacultyByUserId: async (userId: string) => (await supabase.from('faculty').select('*').eq('user_id', userId).single()).data || undefined,

  createPrincipalProfile: async (profile: any) => (await supabase.from('principals').insert([{ ...profile, id: generateUUID() }]).select().single()).data,
  updatePrincipalProfile: async (userId: string, updates: any) => (await supabase.from('principals').update(updates).eq('user_id', userId).select().single()).data,
  createHODProfile: async (profile: any) => (await supabase.from('hods').insert([{ ...profile, id: generateUUID() }]).select().single()).data,
  updateHODProfile: async (userId: string, updates: any) => (await supabase.from('hods').update(updates).eq('user_id', userId).select().single()).data,
  createFacultyProfile: async (profile: any) => (await supabase.from('faculty').insert([{ ...profile, id: generateUUID() }]).select().single()).data,
  updateFacultyProfile: async (userId: string, updates: any) => (await supabase.from('faculty').update(updates).eq('user_id', userId).select().single()).data,

  // --- Departments ---
  getDepartments: async () => (await supabase.from('departments').select('*')).data || [],
  createDepartment: async (dept: any) => {
    const newDept = { ...dept, id: generateUUID(), created_at: new Date().toISOString() };
    return (await supabase.from('departments').insert([newDept]).select().single()).data;
  },
  updateDepartment: async (id: string, updates: any) => (await supabase.from('departments').update(updates).eq('id', id).select().single()).data,
  deleteDepartment: async (id: string) => { await supabase.from('departments').delete().eq('id', id); return true; },

  // --- Students ---
  getStudents: async () => (await supabase.from('students').select('*')).data || [],
  getStudentById: async (id: string) => (await supabase.from('students').select('*').eq('id', id).single()).data || undefined,
  getStudentByUserId: async (userId: string) => (await supabase.from('students').select('*').eq('user_id', userId).single()).data || undefined,
  getStudentsByDepartment: async (deptId: string) => (await supabase.from('students').select('*').eq('department_id', deptId)).data || [],
  getStudentByRollNumber: async (roll: string) => {
    const { data } = await supabase.from('students').select('*').ilike('roll_number', roll).single();
    return data || undefined;
  },
  selfRegisterStudent: async (rollNumber: string, email: string, password: string) => {
    const student = await db.getStudentByRollNumber(rollNumber);
    if (!student) throw new Error('Student not found');
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: student.name, role: 'student' } }
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error("Auth creation failed");
    
    await supabase.from('users').insert({
      id: authData.user.id, email, role: 'student', full_name: student.name, is_active: true
    });

    await supabase.from('students').update({
      user_id: authData.user.id, status: 'ERP Account Active', email
    }).eq('id', student.id);
    
    return true;
  },
  
  createStudent: async (student: any) => {
    const newStudent = { ...student, id: generateUUID(), enrollment_date: new Date().toISOString() };
    const { data, error } = await supabase.from('students').insert([newStudent]).select().single();
    if (error) throw error;
    return data;
  },
  updateStudent: async (id: string, updates: any) => (await supabase.from('students').update(updates).eq('id', id).select().single()).data,
  deleteStudent: async (id: string) => { await supabase.from('students').delete().eq('id', id); return true; },
  deleteStudents: async (ids: string[]) => { if (ids.length) await supabase.from('students').delete().in('id', ids); return true; },

  registerStudentToERP: async (studentId: string, customPassword?: string) => {
    const student = await db.getStudentById(studentId);
    if (!student) throw new Error('Student not found');
    if (!student.roll_number) throw new Error('Student must have a Roll Number');
    if (student.status === 'ERP Account Active') throw new Error('Already registered');
    
    const tempEmail = `${student.roll_number.toLowerCase()}@student.amreddy.edu`;
    const tempPassword = customPassword || 'Student@123';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tempEmail,
      password: tempPassword,
      options: { data: { full_name: student.name, role: 'student' } }
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error("Auth creation failed");
    
    await supabase.from('users').insert({
      id: authData.user.id, email: tempEmail, role: 'student', full_name: student.name, is_active: true
    });

    await supabase.from('students').update({
      user_id: authData.user.id, status: 'ERP Account Active', email: tempEmail
    }).eq('id', student.id);
    
    return true;
  },

  bulkPromoteStudents: async (course: string, fromYear: string, toYear: string) => {
    const { data } = await supabase.from('students').update({ year: toYear }).eq('course', course).eq('year', fromYear).select('id');
    return data ? data.length : 0;
  },

  // --- Attendance ---
  getStudentsByFilters: async (filters: any) => {
    let query = supabase.from('students').select('*').eq('course', filters.course).eq('year', filters.year).eq('section', filters.section);
    if (filters.course === 'M.PHARM' && filters.branch) query = query.eq('branch', filters.branch);
    if (filters.course !== 'PHARM.D' && filters.semester) query = query.eq('semester', filters.semester);
    return (await query).data || [];
  },

  saveAttendanceBatch: async (records: any[]) => {
    const newRecords = records.map(r => ({ ...r, id: generateUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    await supabase.from('attendance').insert(newRecords);
  },

  getAttendanceByFilters: async (date: string, subjectId: string, period: string) => {
    return (await supabase.from('attendance').select('*').eq('date', date).eq('subject_id', subjectId).eq('period', period)).data || [];
  },

  updateAttendanceRecord: async (id: string, updates: any, modifierId: string, reason: string) => {
    await supabase.from('attendance').update({ status: updates.status, updated_at: new Date().toISOString(), last_modified_by: modifierId, modify_reason: reason }).eq('id', id);
  },

  // --- Subjects ---
  getSubjects: async () => (await supabase.from('subjects').select('*')).data || [],
  saveSubjectsBatch: async (subjects: any[]) => {
    await supabase.from('subjects').insert(subjects.map(s => ({ ...s, id: generateUUID() })));
  },
  getSubjectById: async (id: string) => (await supabase.from('subjects').select('*').eq('id', id).single()).data || undefined,
  createSubject: async (subject: any) => (await supabase.from('subjects').insert([{ ...subject, id: generateUUID() }]).select().single()).data,
  updateSubject: async (id: string, updates: any) => (await supabase.from('subjects').update(updates).eq('id', id).select().single()).data,
  deleteSubject: async (id: string) => { await supabase.from('subjects').delete().eq('id', id); return true; },

  // --- Subject Assignments ---
  getSubjectAssignments: async () => (await supabase.from('subject_assignments').select('*')).data || [],
  getAssignmentsByFaculty: async (facultyId: string) => (await supabase.from('subject_assignments').select('*').eq('faculty_id', facultyId)).data || [],
  assignSubject: async (assignment: any) => {
    const existing = (await supabase.from('subject_assignments').select('*').eq('faculty_id', assignment.faculty_id).eq('subject_id', assignment.subject_id).single()).data;
    if (existing) return existing;
    return (await supabase.from('subject_assignments').insert([{ ...assignment, id: generateUUID() }]).select().single()).data;
  },
  deleteAssignment: async (id: string) => { await supabase.from('subject_assignments').delete().eq('id', id); return true; },

  // --- Timetable ---
  getTimetableSlots: async () => (await supabase.from('timetable').select('*')).data || [],
  createTimetableSlot: async (slot: any) => (await supabase.from('timetable').insert([{ ...slot, id: generateUUID() }]).select().single()).data,
  deleteTimetableSlot: async (id: string) => { await supabase.from('timetable').delete().eq('id', id); return true; },

  // --- Marks ---
  getMarks: async () => (await supabase.from('marks').select('*')).data || [],
  saveInternalMarksBatch: async (records: any[]) => { await supabase.from('marks').upsert(records, { onConflict: 'subject_id,student_id' }); },
  saveSemesterMarksBatch: async (records: any[]) => { await supabase.from('marks').upsert(records, { onConflict: 'subject_id,student_id' }); },
  updateInternalStatus: async (subjectId: string, newStatus: string) => { await supabase.from('marks').update({ internal_status: newStatus }).eq('subject_id', subjectId); },
  updateSemesterStatus: async (subjectId: string, newStatus: string) => { await supabase.from('marks').update({ semester_status: newStatus }).eq('subject_id', subjectId); },

  // --- Leave Requests ---
  getLeaveRequests: async () => (await supabase.from('leave_requests').select('*')).data || [],
  createLeaveRequest: async (request: any) => (await supabase.from('leave_requests').insert([{ ...request, id: generateUUID(), status: 'Pending', created_at: new Date().toISOString() }]).select().single()).data,
  updateLeaveStatus: async (id: string, status: string, approverUserId: string) => { await supabase.from('leave_requests').update({ status, approved_by: approverUserId }).eq('id', id); return true; },

  // --- Notices ---
  getNotices: async () => (await supabase.from('notices').select('*').order('created_at', { ascending: false })).data || [],
  createNotice: async (notice: any) => (await supabase.from('notices').insert([{ ...notice, id: generateUUID(), created_at: new Date().toISOString() }]).select().single()).data,
  deleteNotice: async (id: string) => { await supabase.from('notices').delete().eq('id', id); return true; },
};

// Export an instance compatible with the previous 'export const db = new Database()' usage.
// Since we used 'export const db = { ... }' directly, we are already compliant.





