import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit } from 'lucide-react';
import { db } from '../../services/db';
import type { Student } from '../../services/db';

export const AdmissionsList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // In a real app we might fetch from Supabase. Here we rely on the mocked/synced db state.
    // For admission cell, we are generally interested in ALL students, especially those 
    // newly added or missing roll numbers.
    const loadData = () => {
      setStudents(db.getStudents());
    };
    
    // Initial load
    loadData();
    
    // Quick polling to reflect new additions (simple workaround for local state)
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
      s.course.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-lg text-navy-900 dark:text-white">All Admissions</h3>
          <p className="text-xs text-navy-500">View and manage all student admission records.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by Name, Roll, Course..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800 rounded-xl text-sm"
            />
          </div>
          <button className="p-2 border border-slate-200 dark:border-navy-800 rounded-xl hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors">
            <Filter size={18} className="text-navy-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-navy-800 rounded-xl">
        <table className="w-full text-left text-sm text-navy-900 dark:text-white">
          <thead className="bg-slate-50 dark:bg-navy-900/50 text-xs uppercase font-bold text-navy-500 dark:text-navy-400">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Course Info</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Roll No</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-navy-800">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-navy-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold">{student.name}</div>
                    <div className="text-[10px] text-navy-500">DOB: {student.dob || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{student.phone}</div>
                    <div className="text-[10px] text-navy-500">{student.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{student.course}</div>
                    <div className="text-[10px] text-navy-500">{student.admission_quota}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                      ${student.status === 'Roll Number Assigned' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        student.status === 'Documents Uploaded' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}
                    `}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {student.roll_number ? (
                      <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-navy-800 px-2 py-1 rounded">
                        {student.roll_number}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold italic">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-navy-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors" title="View Details">
                        <Eye size={16} />
                      </button>
                      <button className="p-1.5 text-navy-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors" title="Edit Record">
                        <Edit size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-navy-500">
                  No admission records found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
