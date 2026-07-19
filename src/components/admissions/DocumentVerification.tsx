import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { Student, AdmissionDocument } from '../../services/db';
import { CheckCircle, XCircle, Eye, FileText, ChevronLeft } from 'lucide-react';
import { useToast } from '../Toast';

export const DocumentVerification: React.FC = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [documents, setDocuments] = useState<AdmissionDocument[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const students = await db.getStudents();
      setStudents(students.filter((s: any) => s.status === 'Documents Uploaded' || s.status === 'Documents Pending'));
      setDocuments(await db.getAdmissionDocuments());
    };
    
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (docId: string) => {
    try {
      await db.updateAdmissionDocumentStatus(docId, 'Verified');
      showToast('Document verified successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error verifying document.', 'error');
    }
  };

  const handleReject = async (docId: string) => {
    try {
      await db.updateAdmissionDocumentStatus(docId, 'Rejected');
      showToast('Document rejected.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error rejecting document.', 'error');
    }
  };

  const handleApproveAll = async () => {
    if (!selectedStudent) return;
    try {
      const studentDocs = documents.filter(d => d.student_id === selectedStudent.id && d.status === 'Pending');
      for (const doc of studentDocs) {
        await db.updateAdmissionDocumentStatus(doc.id, 'Verified');
      }
      await db.updateStudentStatus(selectedStudent.id, 'Verified');
      showToast('All documents verified and student status updated!', 'success');
      setSelectedStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Error processing approval.', 'error');
    }
  };

  if (selectedStudent) {
    const studentDocs = documents.filter(d => d.student_id === selectedStudent.id);
    const allVerified = studentDocs.length > 0 && studentDocs.every(d => d.status === 'Verified');

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 dark:border-navy-800 pb-4">
          <button 
            onClick={() => setSelectedStudent(null)}
            className="p-2 border border-slate-200 dark:border-navy-800 rounded-xl hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors"
          >
            <ChevronLeft size={20} className="text-navy-500" />
          </button>
          <div>
            <h3 className="font-bold text-lg text-navy-900 dark:text-white">Verify Documents: {selectedStudent.name}</h3>
            <p className="text-xs text-navy-500">{selectedStudent.course} | {selectedStudent.phone}</p>
          </div>
          <div className="ml-auto">
            <button 
              onClick={handleApproveAll}
              disabled={studentDocs.length === 0}
              className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2
                ${allVerified 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
            >
              <CheckCircle size={18} /> {allVerified ? 'Verified' : 'Approve All & Verify Student'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studentDocs.length > 0 ? (
            studentDocs.map(doc => (
              <div key={doc.id} className="border border-slate-200 dark:border-navy-800 rounded-xl p-4 bg-slate-50 dark:bg-navy-950">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="text-primary-500" size={24} />
                    <div>
                      <h4 className="font-bold text-sm text-navy-900 dark:text-white">{doc.document_type}</h4>
                      <p className="text-xs text-navy-500">
                        Status: <span className={`font-bold ${
                          doc.status === 'Verified' ? 'text-green-600' : doc.status === 'Rejected' ? 'text-red-600' : 'text-amber-500'
                        }`}>{doc.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status === 'Pending' && (
                      <>
                        <button onClick={() => handleVerify(doc.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="Verify">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleReject(doc.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200" title="Reject">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Document Preview (simplified) */}
                <div className="mt-4 bg-slate-200 dark:bg-navy-900 h-64 rounded-lg flex items-center justify-center overflow-hidden border border-slate-300 dark:border-navy-700">
                  {doc.file_data && doc.file_data.startsWith('data:image') ? (
                    <img src={doc.file_data} alt={doc.document_type} className="object-contain w-full h-full" />
                  ) : doc.file_data && doc.file_data.startsWith('data:application/pdf') ? (
                    <embed src={doc.file_data} type="application/pdf" className="w-full h-full" />
                  ) : (
                    <div className="text-center text-navy-400">
                      <FileText size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Preview unavailable</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-8 text-center border border-dashed border-slate-300 dark:border-navy-700 rounded-xl">
              <p className="text-navy-500">No documents found for this student.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-lg text-navy-900 dark:text-white">Document Verification Queue</h3>
          <p className="text-xs text-navy-500">Review and verify uploaded documents for new admissions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.length > 0 ? (
          students.map(student => {
            const studentDocs = documents.filter(d => d.student_id === student.id);
            const pendingCount = studentDocs.filter(d => d.status === 'Pending').length;
            const verifiedCount = studentDocs.filter(d => d.status === 'Verified').length;
            const totalCount = studentDocs.length;

            return (
              <div key={student.id} className="border border-slate-200 dark:border-navy-800 rounded-xl p-5 bg-white dark:bg-navy-900 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-navy-900 dark:text-white">{student.name}</h4>
                    <p className="text-xs text-navy-500">{student.course} | {student.admission_quota}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Review Needed
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-semibold mb-4 border-t border-slate-100 dark:border-navy-800 pt-3 mt-3">
                  <div className="flex flex-col">
                    <span className="text-slate-400">Total</span>
                    <span className="text-navy-900 dark:text-white">{totalCount} Docs</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400">Verified</span>
                    <span className="text-green-600">{verifiedCount} Docs</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400">Pending</span>
                    <span className="text-amber-500">{pendingCount} Docs</span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedStudent(student)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-navy-950 dark:hover:bg-navy-800 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-navy-800"
                >
                  <Eye size={16} /> Review Documents
                </button>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 p-12 text-center border border-dashed border-slate-300 dark:border-navy-700 rounded-xl bg-slate-50 dark:bg-navy-900/30">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-500 opacity-50" />
            <h4 className="font-bold text-navy-900 dark:text-white mb-2">All caught up!</h4>
            <p className="text-sm text-navy-500">There are no pending documents to verify at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};
