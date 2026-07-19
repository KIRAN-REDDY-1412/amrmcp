import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Student, Department } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { Plus, Edit2, Trash2, GraduationCap, X, Upload, Download, Loader2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentManagementTabProps {
  searchFilter: string;
}

export const StudentManagementTab: React.FC<StudentManagementTabProps> = ({ searchFilter }) => {
  const { currentUser, hodProfile, facultyProfile } = useAuth();
  const { showToast } = useToast();

  const [dbState, setDbState] = useState(db.getRawState());
  const [activeModal, setActiveModal] = useState<'create_student' | 'edit_student' | 'bulk_promote' | 'bulk_upload' | null>(null);

  // Form Fields - Student
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studName, setStudName] = useState('');
  const [studRoll, setStudRoll] = useState('');
  const [studPassword, setStudPassword] = useState('');
  const [studDob, setStudDob] = useState('');
  const [studCourse, setStudCourse] = useState('');
  const [studBranch, setStudBranch] = useState('');
  const [studYear, setStudYear] = useState('');
  const [studSemester, setStudSemester] = useState('');
  const [studSection, setStudSection] = useState('');
  const [studAcademicYear, setStudAcademicYear] = useState('');
  const [studBatch, setStudBatch] = useState('');
  const [studDeptId, setStudDeptId] = useState('');
  const [studPhone, setStudPhone] = useState('');
  const [studEmail, setStudEmail] = useState('');
  const [studGuardian, setStudGuardian] = useState('');
  const [studGender, setStudGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [studParentPhone, setStudParentPhone] = useState('');

  // Form Fields - Bulk Promote
  const [promoteCourse, setPromoteCourse] = useState('');
  const [promoteYear, setPromoteYear] = useState('');

  // Form Fields - Bulk Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDeptId, setUploadDeptId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setDbState(db.getRawState());
  }, [activeModal]);

  const triggerStateRefresh = () => {
    setDbState({ ...db.getRawState() });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await db.syncWithSupabase();
      showToast('Successfully synced with Supabase!', 'success');
      triggerStateRefresh();
    } catch (err: any) {
      showToast(`Failed to sync: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentUser) return null;

  // Determine allowed department scope
  const isGlobal = currentUser.role === 'admin' || currentUser.role === 'principal';
  let myDeptId = '';
  if (currentUser.role === 'hod' && hodProfile) {
    myDeptId = hodProfile.department_id;
  } else if (currentUser.role === 'faculty' && facultyProfile) {
    myDeptId = facultyProfile.department_id;
  }

  // Set default department ID for forms if locked to a department
  useEffect(() => {
    if (activeModal === 'create_student') {
      if (!isGlobal && myDeptId) {
        setStudDeptId(myDeptId);
      } else if (dbState.departments.length > 0) {
        setStudDeptId(dbState.departments[0].id);
      }
    }
  }, [activeModal, isGlobal, myDeptId, dbState.departments]);

  const handleSaveNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studName || !studRoll || !studCourse) {
      showToast('Please enter at least Name, Roll Number, and Course.', 'warning');
      return;
    }

    try {
      await db.createStudent({
        name: studName,
        roll_number: studRoll,
        dob: studDob || undefined,
        course: studCourse,
        branch: studCourse === 'M.PHARM' ? studBranch : undefined,
        year: studYear || undefined,
        semester: (studCourse === 'B.PHARM' || studCourse === 'M.PHARM') ? studSemester : undefined,
        section: studSection || undefined,
        academic_year: studAcademicYear || undefined,
        batch: studBatch || undefined,
        department_id: studDeptId || undefined,
        phone: studPhone || '',
        guardian_name: studGuardian || '',
        status: 'Draft',
        admission_quota: 'Convenor',
        gender: 'Male'
      });
      await db.logAction(
        currentUser.id,
        currentUser.email,
        currentUser.role,
        'Create Student',
        `Manually created student: ${studName}`
      );
      showToast(`Student ${studName} created successfully.`, 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      console.error("Student Creation Error:", err);
      showToast(`Creation failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const handleEditStudentOpen = (s: Student) => {
    setSelectedStudentId(s.id);
    setStudName(s.name);
    setStudRoll(s.roll_number || '');
    setStudDob(s.dob || '');
    setStudCourse(s.course || '');
    setStudBranch(s.branch || '');
    setStudYear(s.year || '');
    setStudSemester(s.semester || '');
    setStudSection(s.section || '');
    setStudAcademicYear(s.academic_year || '');
    setStudBatch(s.batch || '');
    setStudDeptId(s.department_id || '');
    setStudPhone(s.phone);
    
    // Find the user to get their email
    const studentUser = dbState.users.find(u => u.id === s.user_id);
    setStudEmail(studentUser?.email || '');
    
    setStudGuardian(s.guardian_name || '');
    setStudGender(s.gender || 'Male');
    setStudParentPhone(s.parent_phone || '');
    setActiveModal('edit_student');
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    try {
      if (studPassword) {
        showToast('Note: Password changes require backend admin API. This is visually mocked for the prototype.', 'info');
      }

      await db.updateStudent(selectedStudentId, {
        name: studName,
        dob: studDob,
        gender: studGender,
        course: studCourse,
        branch: studCourse === 'M.PHARM' ? studBranch : undefined,
        year: studYear,
        semester: (studCourse === 'B.PHARM' || studCourse === 'M.PHARM') ? studSemester : undefined,
        section: studSection,
        academic_year: studAcademicYear,
        batch: studBatch,
        phone: studPhone,
        parent_phone: studParentPhone,
        guardian_name: studGuardian,
      });

      // Update user email if it exists
      const currentStudent = dbState.students.find(s => s.id === selectedStudentId);
      if (currentStudent && currentStudent.user_id && studEmail) {
        await db.updateUserEmail(currentStudent.user_id, studEmail);
      }

      showToast('Student details saved.', 'success');
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      console.error("Student Update Error:", err);
      showToast(`Update failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await db.deleteStudent(id);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'Delete Student',
          `Deleted student: ${name}`
        );
        showToast(`Student ${name} deleted.`, 'success');
        setSelectedStudentIds(selectedStudentIds.filter(sid => sid !== id));
        triggerStateRefresh();
      } catch (err: any) {
        showToast(`Deletion failed: ${err.message}`, 'error');
      }
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedStudentIds.length} students? This action is irreversible.`)) {
      try {
        await db.deleteStudents(selectedStudentIds);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'Bulk Delete Students',
          `Deleted ${selectedStudentIds.length} students`
        );
        showToast(`${selectedStudentIds.length} students deleted.`, 'success');
        setSelectedStudentIds([]);
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete students.', 'error');
      }
    }
  };

  const handleRegisterERP = async (id: string) => {
    if (window.confirm("Are you sure you want to register this student to the ERP? This will create their login credentials.")) {
      try {
        await db.registerStudentToERP(id);
        await db.logAction(
          currentUser!.id,
          currentUser!.email,
          currentUser!.role,
          'ERP Registration',
          `Registered student ${id} to ERP`
        );
        showToast('Student successfully registered to ERP.', 'success');
        triggerStateRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to register student to ERP.', 'error');
      }
    }
  };

  const getNextYear = (course: string, year: string) => {
    if (!course || !year) return '';
    const years = ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year', 'VI Year'];
    const currentIndex = years.indexOf(year);
    if (currentIndex === -1) return '';
    
    let maxYears = 4; // default B.PHARM
    if (course === 'M.PHARM') maxYears = 2;
    if (course === 'PHARM.D') maxYears = 6;
    
    if (currentIndex + 1 >= maxYears) return 'Graduated';
    return years[currentIndex + 1];
  };

  const handleBulkPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteCourse || !promoteYear) return;
    
    const nextYear = getNextYear(promoteCourse, promoteYear);
    if (!nextYear) return;
    
    if (window.confirm(`Are you sure you want to promote all ${promoteYear} students in ${promoteCourse} to ${nextYear}?`)) {
      try {
        const count = await db.bulkPromoteStudents(promoteCourse, promoteYear, nextYear);
        showToast(`Successfully promoted ${count} student(s) to ${nextYear}.`, 'success');
        setActiveModal(null);
        triggerStateRefresh();
      } catch (err: any) {
        showToast(`Failed to promote students: ${err.message}`, 'error');
      }
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Name: "John Doe",
        "Roll Number": "Y26PH001",
        Password: "Student@123",
        "Date of Birth": "2000-01-01",
        Course: "B.PHARM",
        Branch: "",
        Year: "I Year",
        Semester: "I Semester",
        Section: "A",
        "Academic Year": "2024-2025",
        Batch: "Y24",
        Email: "alice@example.com",
        Phone: "9876543210",
        "Guardian Name": "Jane Doe"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "Student_Bulk_Registration_Template.xlsx");
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const data = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet);

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let lastErrorMsg = "";

      for (const row of rows) {
        try {
          const name = row.Name;
          const roll = row["Roll Number"];
          const password = row.Password || "Student@123";
          const course = row.Course;

          let finalDeptId = isGlobal ? '' : myDeptId;
          
          if (isGlobal && db.getRawState().departments.length > 0) {
            finalDeptId = db.getRawState().departments[0].id;
          }

          if (!name || !roll || !course) {
            errorCount++;
            lastErrorMsg = "Missing required fields (Name, Roll Number, Course)";
            continue;
          }

          const rollExists = db.getRawState().students.some(
            (s) => s.roll_number && s.roll_number.toLowerCase() === String(roll).toLowerCase()
          );
          
          if (rollExists) {
            skippedCount++;
            continue;
          }

          await db.createStudent({
            name: String(name),
            roll_number: String(roll),
            dob: row["Date of Birth"] ? String(row["Date of Birth"]) : undefined,
            course: String(course),
            branch: row.Branch ? String(row.Branch) : undefined,
            year: row.Year ? String(row.Year) : undefined,
            semester: row.Semester ? String(row.Semester) : undefined,
            section: row.Section ? String(row.Section) : undefined,
            academic_year: row["Academic Year"] ? String(row["Academic Year"]) : undefined,
            batch: row.Batch ? String(row.Batch) : undefined,
            phone: row.Phone ? String(row.Phone) : "",
            guardian_name: row["Guardian Name"] ? String(row["Guardian Name"]) : "",
            user_id: undefined,
            status: 'Draft',
            admission_quota: 'Convenor',
            gender: 'Male'
          });

          successCount++;
        } catch (err: any) {
          console.error("Bulk upload row error:", err);
          errorCount++;
          lastErrorMsg = err.message || JSON.stringify(err);
        }
      }

      let toastMsg = `Registered ${successCount} students.`;
      if (skippedCount > 0) toastMsg += ` Skipped ${skippedCount} duplicates.`;
      if (errorCount > 0) toastMsg += ` Failed ${errorCount}. Last error: ${lastErrorMsg}`;

      showToast(toastMsg, successCount > 0 ? 'success' : 'error');
      
      if (successCount > 0) {
        await db.logAction(
          currentUser.id,
          currentUser.email,
          currentUser.role,
          'Bulk Register Students',
          `Bulk registered ${successCount} students via Excel`
        );
      }
      
      setActiveModal(null);
      triggerStateRefresh();
    } catch (err: any) {
      console.error("Bulk upload error:", err);
      showToast(`File processing failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadFile(null);
    }
  };

  const visibleStudents = dbState.students.filter(
    (s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchFilter.toLowerCase()) || (s.roll_number && s.roll_number.toLowerCase().includes(searchFilter.toLowerCase()));
      // If admin/principal, show students who have at least been assigned a roll number
      if (isGlobal) {
        return matchesSearch && ['Roll Number Assigned', 'ERP Registration Pending', 'ERP Account Active'].includes(s.status);
      }
      return matchesSearch;
    }
  );

  const getDeptName = (id: string) => {
    return dbState.departments.find((d) => d.id === id)?.name || 'Unknown';
  };

  return (
    <>
      <div className="glass p-6 rounded-2xl border border-navy-100 dark:border-navy-800 space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-navy-900 dark:text-white font-bold text-lg">Enrolled Students</h3>
            <p className="text-xs text-navy-400">View and manage enrolled student directories</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> Sync
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-navy-600 dark:text-navy-300 rounded-xl text-sm font-bold transition-colors"
            >
              <Download size={16} /> Template
            </button>
            <button
              onClick={() => {
                // Clear form
                setStudName(''); setStudRoll(''); setStudDob(''); setStudCourse('');
                setStudBranch(''); setStudYear(''); setStudSemester(''); setStudSection('');
                setActiveModal('create_student');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-navy-800 text-primary-600 hover:bg-slate-50 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-700 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus size={16} /> Add Student
            </button>
            <button
              onClick={() => {
                setUploadFile(null);
                setUploadDeptId(isGlobal ? '' : myDeptId);
                setActiveModal('bulk_upload');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-secondary-600 hover:bg-secondary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-secondary-500/20"
            >
              <Upload size={16} /> Bulk Upload
            </button>
            <button
              onClick={() => {
                setPromoteCourse('');
                setPromoteYear('');
                setActiveModal('bulk_promote');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
            >
              <GraduationCap size={16} /> Bulk Promote
            </button>
            {selectedStudentIds.length > 0 && (
              <button
                onClick={handleBulkDeleteStudents}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition-colors"
              >
                <Trash2 size={16} /> Delete Selected ({selectedStudentIds.length})
              </button>
            )}
          </div>
        </div>

        {visibleStudents.length === 0 ? (
          <div className="py-16 text-center text-navy-450">
            <GraduationCap className="mx-auto w-10 h-10 mb-3 text-navy-300 dark:text-navy-700" />
            <p className="font-medium text-sm">
              {isGlobal ? 'No students registered in the system.' : 'No students registered in this department.'}
            </p>
            <p className="text-xs mt-1">Populate student directories to open class registers.</p>
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
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(visibleStudents.map(s => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                      checked={visibleStudents.length > 0 && visibleStudents.every(s => selectedStudentIds.includes(s.id))}
                    />
                  </th>
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Roll Number</th>
                  <th className="pb-3">Program Details</th>
                  <th className="pb-3">Batch Info</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Contact & Credentials</th>
                  <th className="pb-3">Guardian</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-850 font-medium">
                {visibleStudents.map((s) => (
                  <tr key={s.id} className="text-navy-900 dark:text-navy-200 hover:bg-slate-50/50 dark:hover:bg-navy-900/30">
                    <td className="py-3.5 pl-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds([...selectedStudentIds, s.id]);
                          } else {
                            setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                          }
                        }}
                      />
                    </td>
                    <td className="py-3.5 pl-2 font-bold">{s.name}</td>
                    <td className="py-3.5 text-xs font-mono font-bold text-primary-500">{s.roll_number}</td>
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-navy-900 dark:text-white">{s.course || 'N/A'} {s.branch ? `- ${s.branch}` : ''}</span>
                        {(s.year || s.semester || s.section) && (
                          <span className="text-[10px] text-navy-500">
                            {s.year} {s.semester ? `• ${s.semester}` : ''} {s.section ? `• Sec ${s.section}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-navy-900 dark:text-white">{s.batch || 'N/A'}</span>
                        <span className="text-[10px] text-navy-500">{s.academic_year || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.status === 'ERP Account Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-navy-900 dark:text-navy-200" title="Phone">📞 {s.phone || 'N/A'}</span>
                        <span className="text-[10px] text-navy-500" title="Email">✉️ {dbState.users.find(u => u.id === s.user_id)?.email || 'N/A'}</span>
                        {s.status === 'ERP Account Active' && <span className="text-[10px] text-navy-500 font-mono" title="Password">🔑 ••••••••</span>}
                      </div>
                    </td>
                    <td className="py-3.5 text-xs text-navy-500">{s.guardian_name || s.father_name || 'N/A'}</td>
                    <td className="py-3.5 pr-2 text-right space-x-2">
                      {isGlobal && s.status !== 'ERP Account Active' && (
                        <button
                          onClick={() => handleRegisterERP(s.id)}
                          className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-[10px] font-bold mr-2"
                        >
                          Register to ERP
                        </button>
                      )}
                      <button
                        onClick={() => handleEditStudentOpen(s)}
                        className="p-1.5 text-navy-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-navy-850 rounded-lg transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(s.id, s.name)}
                        className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-navy-850 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {(activeModal === 'create_student' || activeModal === 'edit_student') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-navy-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-navy-800 animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-navy-800 flex justify-between items-center bg-slate-50 dark:bg-navy-950/50">
              <h3 className="font-bold text-navy-900 dark:text-white">
                {activeModal === 'create_student' ? 'Register New Student' : 'Edit Student Details'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 text-navy-400 hover:text-navy-600 dark:hover:text-white hover:bg-white dark:hover:bg-navy-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={activeModal === 'create_student' ? handleSaveNewStudent : handleUpdateStudent} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Full Name *</label>
                    <input type="text" required value={studName} onChange={(e) => setStudName(e.target.value)} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Date of Birth</label>
                    <input type="date" value={studDob} onChange={(e) => setStudDob(e.target.value)} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Course *</label>
                    <select required value={studCourse} onChange={(e) => setStudCourse(e.target.value)} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                      <option value="">-- Select --</option>
                      <option value="B.PHARM">B.Pharm</option>
                      <option value="M.PHARM">M.Pharm</option>
                      <option value="PHARM.D">Pharm.D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Roll Number *</label>
                    <input type="text" required value={studRoll} onChange={(e) => setStudRoll(e.target.value.toUpperCase())} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
                  </div>
                  {studCourse === 'M.PHARM' && (
                    <div>
                      <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Branch *</label>
                      <select required value={studBranch} onChange={(e) => setStudBranch(e.target.value)} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                        <option value="">-- Select --</option>
                        <option value="Pharmaceutics">Pharmaceutics</option>
                        <option value="Pharmacology">Pharmacology</option>
                        <option value="Pharmaceutical Analysis">Pharmaceutical Analysis</option>
                        <option value="Industrial Pharmacy">Industrial Pharmacy</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Gender</label>
                    <select value={studGender} onChange={(e) => setStudGender(e.target.value as any)} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Year</label>
                    <select value={studYear} onChange={(e) => setStudYear(e.target.value)} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                      <option value="">-- Select --</option>
                      <option value="I Year">I Year</option>
                      <option value="II Year">II Year</option>
                      <option value="III Year">III Year</option>
                      <option value="IV Year">IV Year</option>
                      <option value="V Year">V Year</option>
                      <option value="VI Year">VI Year</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Semester</label>
                    <select value={studSemester} onChange={(e) => setStudSemester(e.target.value)} className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white">
                      <option value="">-- Select --</option>
                      <option value="I Semester">I Semester</option>
                      <option value="II Semester">II Semester</option>
                      <option value="III Semester">III Semester</option>
                      <option value="IV Semester">IV Semester</option>
                      <option value="V Semester">V Semester</option>
                      <option value="VI Semester">VI Semester</option>
                      <option value="VII Semester">VII Semester</option>
                      <option value="VIII Semester">VIII Semester</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Section</label>
                    <input type="text" value={studSection} onChange={(e) => setStudSection(e.target.value)} placeholder="e.g. A" className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Mail ID (Personal)</label>
                    <input type="email" value={studEmail} onChange={(e) => setStudEmail(e.target.value)} placeholder="student@example.com" className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Mobile Number</label>
                    <input type="tel" value={studPhone} onChange={(e) => setStudPhone(e.target.value)} placeholder="e.g. 9876543210" className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider">Parent Mobile Number</label>
                    <input type="tel" value={studParentPhone} onChange={(e) => setStudParentPhone(e.target.value)} placeholder="e.g. 9876543210" className="mt-1 block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-navy-800 mt-6">
                  <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm font-bold text-navy-600 dark:text-navy-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md shadow-primary-500/20 transition-all active:scale-95">
                    Save Changes
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {activeModal === 'bulk_promote' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-navy-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-navy-800 animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-navy-800 flex justify-between items-center bg-slate-50 dark:bg-navy-950/50">
              <h3 className="font-bold text-navy-900 dark:text-white">
                Bulk Promote Students
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBulkPromote} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Course</label>
                <select
                  required
                  value={promoteCourse}
                  onChange={(e) => setPromoteCourse(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                >
                  <option value="" disabled>Select a course</option>
                  <option value="B.PHARM">B.PHARM</option>
                  <option value="M.PHARM">M.PHARM</option>
                  <option value="PHARM.D">PHARM.D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Current Year</label>
                <select
                  required
                  value={promoteYear}
                  onChange={(e) => setPromoteYear(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 dark:border-navy-800 rounded-xl bg-slate-50 dark:bg-navy-950 text-sm text-navy-900 dark:text-white"
                >
                  <option value="" disabled>Select Current Year</option>
                  <option value="I Year">I Year</option>
                  <option value="II Year">II Year</option>
                  <option value="III Year">III Year</option>
                  <option value="IV Year">IV Year</option>
                  <option value="V Year">V Year</option>
                  <option value="VI Year">VI Year</option>
                </select>
              </div>
              
              {promoteCourse && promoteYear && (
                <div className="p-3 bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 dark:border-secondary-800 rounded-xl flex items-start gap-3">
                  <div className="mt-0.5"><GraduationCap className="text-secondary-600" size={18} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-secondary-800 dark:text-secondary-300">Promotion Preview</h4>
                    <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-0.5">
                      All <b>{promoteCourse}</b> students in <b>{promoteYear}</b> will be promoted to <span className="font-bold underline">{getNextYear(promoteCourse, promoteYear)}</span>.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!promoteCourse || !promoteYear}
                  className="w-full py-2.5 bg-secondary-600 hover:bg-secondary-700 disabled:bg-secondary-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Confirm Bulk Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'bulk_upload' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-navy-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-navy-800 animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-navy-800 flex justify-between items-center bg-slate-50 dark:bg-navy-950/50">
              <h3 className="font-bold text-navy-900 dark:text-white">
                Bulk Registration via Excel
              </h3>
              <button
                onClick={() => !isUploading && setActiveModal(null)}
                disabled={isUploading}
                className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBulkUpload} className="p-5 space-y-4">

              <div>
                <label className="block text-xs font-bold text-navy-600 dark:text-navy-300 uppercase tracking-wider mb-1">Upload .xlsx File</label>
                <input
                  type="file"
                  accept=".xlsx"
                  required
                  disabled={isUploading}
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-navy-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-navy-800 dark:file:text-primary-400 dark:hover:file:bg-navy-700"
                />
              </div>

              <div className="p-3 bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 dark:border-secondary-800 rounded-xl flex items-start gap-3">
                <div className="mt-0.5"><Upload className="text-secondary-600" size={18} /></div>
                <div>
                  <h4 className="text-sm font-bold text-secondary-800 dark:text-secondary-300">Instructions</h4>
                  <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-0.5">
                    Ensure your Excel file matches the template exactly. Existing roll numbers will be skipped.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-400 disabled:dark:bg-navy-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors"
                >
                  {isUploading ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  ) : (
                    'Upload and Register'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
