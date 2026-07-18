import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import { Check, X, RefreshCw } from 'lucide-react';
import type { Student } from '../../services/db';

export const RollNumberAssigner: React.FC = () => {
  const { showToast } = useToast();
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .in('status', ['Verified', 'Admission Approved', 'Roll Number Pending'])
        .is('roll_number', null);
      
      if (error) throw error;
      setPendingStudents(data as Student[]);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const assignRollNumber = async (id: string, course: string) => {
    // Basic prefix logic for demonstration
    const prefix = course === 'B.Pharm' ? 'Y26BP' : course === 'Pharm.D' ? 'Y26PD' : 'Y26MP';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // Should be sequential in a real production system
    const newRoll = `${prefix}${randomSuffix}`;

    try {
      const { error } = await supabase
        .from('students')
        .update({
          roll_number: newRoll,
          status: 'Roll Number Assigned'
        })
        .eq('id', id);

      if (error) throw error;
      showToast(`Assigned Roll Number: ${newRoll}`, 'success');
      setPendingStudents(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading pending roll numbers...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-navy-900 dark:text-white">Assign Roll Numbers</h3>
        <button onClick={loadPending} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg"><RefreshCw size={16} /></button>
      </div>

      {pendingStudents.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 dark:bg-navy-800 rounded-xl text-slate-500">
          No students waiting for roll number assignment.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Course</th>
                <th className="p-3">Quota</th>
                <th className="p-3">Aadhaar</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {pendingStudents.map(student => (
                <tr key={student.id}>
                  <td className="p-3 font-semibold">{student.name}</td>
                  <td className="p-3">{student.course}</td>
                  <td className="p-3">{student.admission_quota}</td>
                  <td className="p-3">{student.aadhaar_number}</td>
                  <td className="p-3">
                    <button 
                      onClick={() => assignRollNumber(student.id, student.course)}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-bold"
                    >
                      Assign Roll
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
