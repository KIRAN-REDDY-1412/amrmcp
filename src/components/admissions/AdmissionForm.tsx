import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import { UploadCloud, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface AdmissionFormProps {
  onComplete: () => void;
}

export const AdmissionForm: React.FC<AdmissionFormProps> = ({ onComplete }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Section 1: Course Info
  const [course, setCourse] = useState('B.Pharm');
  const [admissionQuota, setAdmissionQuota] = useState('Convenor');

  // Section 2: Student Info
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [religion, setReligion] = useState('');
  const [caste, setCaste] = useState('');
  const [subCaste, setSubCaste] = useState('');
  const [mole1, setMole1] = useState('');
  const [mole2, setMole2] = useState('');
  const [address, setAddress] = useState('');

  // Section 3: Parent Info
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [fatherAadhaar, setFatherAadhaar] = useState('');
  const [motherAadhaar, setMotherAadhaar] = useState('');

  // Section 4: Documents (simplified base64 handling for now)
  const [documents, setDocuments] = useState<{ [key: string]: string }>({});

  const handleFileUpload = (type: string, file: File) => {
    if (file.size > 1024 * 1024) {
      showToast('File size exceeds 1 MB limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDocuments((prev) => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert Student Record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          status: 'Documents Uploaded',
          course,
          admission_quota: admissionQuota,
          name,
          gender,
          dob: dob || null,
          phone,
          email,
          aadhaar_number: aadhaar,
          nationality,
          religion,
          caste,
          sub_caste: subCaste,
          mole_1: mole1,
          mole_2: mole2,
          address,
          father_name: fatherName,
          mother_name: motherName,
          parent_phone: parentPhone,
          parent_email: parentEmail,
          father_occupation: fatherOccupation,
          father_aadhaar: fatherAadhaar,
          mother_aadhaar: motherAadhaar
        })
        .select('id')
        .single();

      if (studentError) throw studentError;

      // 2. Insert Documents
      const docInserts = Object.entries(documents).map(([type, data]) => ({
        student_id: student.id,
        document_type: type,
        file_data: data,
        status: 'Pending'
      }));

      if (docInserts.length > 0) {
        const { error: docError } = await supabase
          .from('admission_documents')
          .insert(docInserts);
        
        if (docError) throw docError;
      }

      showToast('Admission submitted successfully!', 'success');
      onComplete();
    } catch (err: any) {
      showToast(err.message || 'Error submitting admission', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8">
      {['Course', 'Student', 'Parent', 'Documents'].map((label, idx) => (
        <div key={label} className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step > idx + 1 ? 'bg-green-500 text-white' : step === idx + 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            {step > idx + 1 ? <CheckCircle size={16} /> : idx + 1}
          </div>
          <span className="text-xs mt-1 text-slate-500 font-semibold">{label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6">
      {renderStepIndicator()}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-navy-900 dark:text-white">Course Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Course *</label>
                <select value={course} onChange={e => setCourse(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" required>
                  <option>B.Pharm</option>
                  <option>M.Pharm</option>
                  <option>Pharm.D</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Admission Quota *</label>
                <select value={admissionQuota} onChange={e => setAdmissionQuota(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" required>
                  <option>Convenor</option>
                  <option>Management</option>
                  <option>Spot</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-navy-900 dark:text-white">Student Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Student Name *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Gender *</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date of Birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mobile Number *</label>
                <input required pattern="[0-9]{10}" title="10 digit mobile number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Aadhaar Number *</label>
                <input required pattern="[0-9]{12}" title="12 digit Aadhaar number" value={aadhaar} onChange={e => setAadhaar(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1">Residential Address</label>
                <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-navy-900 dark:text-white">Parent Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Father Name</label>
                <input type="text" value={fatherName} onChange={e => setFatherName(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mother Name</label>
                <input type="text" value={motherName} onChange={e => setMotherName(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Parent Mobile</label>
                <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Father Occupation</label>
                <input value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-navy-900" />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-navy-900 dark:text-white">Document Uploads</h3>
            <p className="text-xs text-slate-500 mb-4">Max 1MB per document (PDF, JPG, PNG)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['Allotment Order', 'SSC Long Memo', 'Intermediate Memo', 'Caste Certificate'].map((docType) => (
                <div key={docType} className="border border-dashed p-4 rounded-xl text-center">
                  <label className="cursor-pointer flex flex-col items-center">
                    <UploadCloud className="text-navy-400 mb-2" />
                    <span className="text-sm font-semibold">{docType}</span>
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(docType, e.target.files[0]);
                    }} />
                    {documents[docType] && <span className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle size={12}/> Uploaded</span>}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t mt-6">
          {step > 1 ? (
            <button type="button" onClick={handleBack} className="px-4 py-2 border rounded-lg flex items-center gap-2">
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div></div>}
          
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-primary-700">
            {step < 4 ? <>Next <ChevronRight size={16} /></> : isSubmitting ? 'Submitting...' : 'Submit Admission'}
          </button>
        </div>
      </form>
    </div>
  );
};
