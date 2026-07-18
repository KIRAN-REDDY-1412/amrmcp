-- =======================================================
-- A.M. REDMY MEMORIAL COLLEGE OF PHARMACY ERP SCHEMA
-- TARGET PLATFORM: SUPABASE (POSTGRESQL)
-- Includes Tables, Foreign Keys, UUID Primary Keys, and Row Level Security (RLS)
-- =======================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing tables (if any)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS marks CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS subject_assignments CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS hods CASCADE;
DROP TABLE IF EXISTS principals CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 1. DEPARTMENTS TABLE
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS TABLE (Links to auth.users in Supabase)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'principal', 'hod', 'faculty', 'student', 'exam_cell', 'library')),
    additional_roles TEXT[] DEFAULT '{}',
    full_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PRINCIPALS PROFILE
CREATE TABLE principals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    phone TEXT NOT NULL,
    qualifications TEXT NOT NULL,
    bio TEXT
);

-- 4. HODS PROFILE
CREATE TABLE hods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    qualifications TEXT NOT NULL
);

-- 5. FACULTY PROFILE
CREATE TABLE faculty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    designation TEXT NOT NULL,
    phone TEXT NOT NULL,
    qualifications TEXT NOT NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 6. STUDENTS TABLE
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL UNIQUE,
    course TEXT,
    branch TEXT,
    year TEXT,
    semester TEXT,
    section TEXT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    academic_year TEXT,
    batch TEXT,
    enrollment_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SUBJECTS TABLE
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    credits INT NOT NULL CHECK (credits > 0),
    course TEXT,
    year TEXT,
    semester TEXT
);

-- 8. SUBJECT ASSIGNMENTS
CREATE TABLE subject_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    UNIQUE (faculty_id, subject_id)
);

-- 9. TIMETABLE TABLE
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_assignment_id UUID NOT NULL REFERENCES subject_assignments(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT NOT NULL
);

-- 10. ATTENDANCE TABLE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
    UNIQUE (subject_id, student_id, date)
);

-- 11. MARKS TABLE
CREATE TABLE marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    mid1_marks NUMERIC,
    mid2_marks NUMERIC,
    mid3_marks NUMERIC,
    cmm_marks NUMERIC,
    internal_status TEXT NOT NULL DEFAULT 'Draft' CHECK (internal_status IN ('Draft', 'Pending Exam Cell', 'Approved', 'Rejected')),
    
    semester_marks NUMERIC,
    semester_status TEXT NOT NULL DEFAULT 'Draft' CHECK (semester_status IN ('Draft', 'Pending Principal', 'Approved', 'Rejected')),
    
    UNIQUE (subject_id, student_id)
);

-- 12. LEAVE REQUESTS TABLE
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. NOTICES TABLE
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_role TEXT NOT NULL CHECK (target_role IN ('All', 'Principal', 'HOD', 'Faculty')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =======================================================
-- HELPER FUNCTIONS FOR SECURITY (RLS)
-- Avoids recursion by using SECURITY DEFINER
-- =======================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_dept()
RETURNS uuid AS $$
    SELECT department_id FROM public.hods WHERE user_id = auth.uid()
    UNION
    SELECT department_id FROM public.faculty WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- =======================================================
-- ROW LEVEL SECURITY (RLS) ACTIVATION
-- =======================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hods ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- =======================================================
-- ROW LEVEL SECURITY POLICIES
-- =======================================================

CREATE POLICY select_users ON users FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_manage_users ON users FOR ALL TO authenticated
    USING (public.get_my_role() = 'admin');

CREATE POLICY principal_manage_roles ON users FOR ALL TO authenticated
    USING (public.get_my_role() = 'principal' AND role IN ('hod', 'faculty', 'student'));

CREATE POLICY hod_manage_roles ON users FOR ALL TO authenticated
    USING (public.get_my_role() = 'hod' AND role IN ('faculty', 'student'));

CREATE POLICY faculty_manage_roles ON users FOR ALL TO authenticated
    USING (public.get_my_role() = 'faculty' AND role = 'student');


-- -- 2. DEPARTMENTS POLICIES --
CREATE POLICY select_departments ON departments FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_manage_departments ON departments FOR ALL TO authenticated
    USING (public.get_my_role() = 'admin');


-- -- 3. PRINCIPALS POLICIES --
CREATE POLICY select_principals ON principals FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_manage_principals ON principals FOR ALL TO authenticated
    USING (public.get_my_role() = 'admin');


-- -- 4. HODS POLICIES --
CREATE POLICY select_hods ON hods FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_hods ON hods FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));


CREATE POLICY select_faculty ON faculty FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_faculty ON faculty FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY hod_manage_dept_faculty ON faculty FOR ALL TO authenticated
    USING (public.get_my_role() = 'hod' AND department_id = public.get_my_dept());

CREATE POLICY faculty_update_own_profile ON faculty FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


CREATE POLICY select_students ON students FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_students ON students FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY hod_manage_dept_students ON students FOR ALL TO authenticated
    USING (public.get_my_role() = 'hod' AND department_id = public.get_my_dept());

CREATE POLICY faculty_manage_dept_students ON students FOR ALL TO authenticated
    USING (public.get_my_role() = 'faculty' AND department_id = public.get_my_dept());


-- -- 7. SUBJECTS POLICIES --
CREATE POLICY select_subjects ON subjects FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_subjects ON subjects FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY hod_manage_dept_subjects ON subjects FOR ALL TO authenticated
    USING (public.get_my_role() = 'hod' AND department_id = public.get_my_dept());


-- -- 8. SUBJECT ASSIGNMENTS POLICIES --
CREATE POLICY select_assignments ON subject_assignments FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_assignments ON subject_assignments FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY hod_manage_dept_assignments ON subject_assignments FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'hod' AND 
        (SELECT department_id FROM public.subjects WHERE id = subject_id) = public.get_my_dept()
    );


-- -- 9. TIMETABLE POLICIES --
CREATE POLICY select_timetable ON timetable FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_timetable ON timetable FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY hod_manage_dept_timetable ON timetable FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'hod' AND 
        (SELECT department_id FROM public.subjects WHERE id = (
            SELECT subject_id FROM public.subject_assignments WHERE id = subject_assignment_id
        )) = public.get_my_dept()
    );


-- -- 10. ATTENDANCE POLICIES --
CREATE POLICY select_attendance ON attendance FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_attendance ON attendance FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY hod_manage_dept_attendance ON attendance FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'hod' AND 
        (SELECT department_id FROM public.subjects WHERE id = subject_id) = public.get_my_dept()
    );

CREATE POLICY faculty_manage_assigned_attendance ON attendance FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'faculty' AND 
        EXISTS (
            SELECT 1 FROM public.subject_assignments 
            WHERE faculty_id = (SELECT id FROM public.faculty WHERE user_id = auth.uid()) 
              AND subject_id = attendance.subject_id
        )
    );


-- -- 11. MARKS POLICIES --
CREATE POLICY select_marks ON marks FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_marks ON marks FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY hod_manage_dept_marks ON marks FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'hod' AND 
        (SELECT department_id FROM public.subjects WHERE id = subject_id) = public.get_my_dept()
    );

CREATE POLICY faculty_manage_assigned_marks ON marks FOR ALL TO authenticated
    USING (
        public.get_my_role() = 'faculty' AND 
        EXISTS (
            SELECT 1 FROM public.subject_assignments 
            WHERE faculty_id = (SELECT id FROM public.faculty WHERE user_id = auth.uid()) 
              AND subject_id = marks.subject_id
        )
    );


-- -- 12. LEAVE REQUESTS POLICIES --
CREATE POLICY faculty_view_own_leaves ON leave_requests FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR 
        (public.get_my_role() = 'hod' AND (
            SELECT department_id FROM public.faculty WHERE user_id = leave_requests.user_id
        ) = public.get_my_dept()) OR
        public.get_my_role() IN ('admin', 'principal')
    );

CREATE POLICY users_create_own_leaves ON leave_requests FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY users_update_own_leaves ON leave_requests FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY hod_approve_dept_leaves ON leave_requests FOR UPDATE TO authenticated
    USING (
        public.get_my_role() = 'hod' AND 
        (SELECT department_id FROM public.faculty WHERE user_id = leave_requests.user_id) = public.get_my_dept()
    )
    WITH CHECK (
        public.get_my_role() = 'hod' AND 
        (SELECT department_id FROM public.faculty WHERE user_id = leave_requests.user_id) = public.get_my_dept()
    );

CREATE POLICY admin_principal_approve_all_leaves ON leave_requests FOR UPDATE TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));


-- -- 13. NOTICES POLICIES --
CREATE POLICY select_notices ON notices FOR SELECT TO authenticated
    USING (true);

CREATE POLICY admin_principal_manage_notices ON notices FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));


-- -- 14. AUDIT LOGS POLICIES --
CREATE POLICY admin_principal_select_audit_logs ON audit_logs FOR SELECT TO authenticated
    USING (public.get_my_role() IN ('admin', 'principal'));

CREATE POLICY insert_audit_logs ON audit_logs FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
