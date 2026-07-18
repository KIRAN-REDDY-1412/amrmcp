import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { supabase } from '../../services/supabase';
import { AdmissionForm } from '../../components/admissions/AdmissionForm';
import { RollNumberAssigner } from '../../components/admissions/RollNumberAssigner';
import { AdmissionsList } from '../../components/admissions/AdmissionsList';
import { DocumentVerification } from '../../components/admissions/DocumentVerification';
import { Plus, List, FileCheck2, UserCheck, Search, Filter } from 'lucide-react';
import { useToast } from '../../components/Toast';

export const AdmissionsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'new' | 'documents' | 'roll_numbers' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // We fetch students using dbState or direct DB calls. For now, rely on db state or local filter.
  // In a real app we would subscribe to the DB or fetch on mount.
  // We'll assume the overarching DashboardContainer already loads dbState.

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-navy-900/60 p-6 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">Admission Cell Dashboard</h2>
          <p className="text-sm text-navy-500 dark:text-navy-400 mt-1">Manage new student admissions, verify documents, and assign roll numbers.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-navy-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'all' 
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/50 dark:bg-primary-900/20' 
              : 'text-navy-600 dark:text-navy-400 hover:bg-slate-50 dark:hover:bg-navy-800/50'
          }`}
        >
          <List size={16} /> All Admissions
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'new' 
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/50 dark:bg-primary-900/20' 
              : 'text-navy-600 dark:text-navy-400 hover:bg-slate-50 dark:hover:bg-navy-800/50'
          }`}
        >
          <Plus size={16} /> New Admission
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'documents' 
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/50 dark:bg-primary-900/20' 
              : 'text-navy-600 dark:text-navy-400 hover:bg-slate-50 dark:hover:bg-navy-800/50'
          }`}
        >
          <FileCheck2 size={16} /> Document Verification
        </button>
        <button
          onClick={() => setActiveTab('roll_numbers')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'roll_numbers' 
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-primary-50/50 dark:bg-primary-900/20' 
              : 'text-navy-600 dark:text-navy-400 hover:bg-slate-50 dark:hover:bg-navy-800/50'
          }`}
        >
          <UserCheck size={16} /> Assign Roll Numbers
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-navy-900/60 border border-slate-200 dark:border-navy-800 rounded-2xl shadow-sm overflow-hidden">
        {activeTab === 'new' && (
          <AdmissionForm onComplete={() => setActiveTab('all')} />
        )}
        
        {activeTab === 'roll_numbers' && (
          <RollNumberAssigner />
        )}

        {/* Integrated Components */}
        {activeTab === 'documents' && (
          <DocumentVerification />
        )}

        {activeTab === 'all' && (
          <AdmissionsList />
        )}
      </div>
    </div>
  );
};
