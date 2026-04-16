import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Search, Download, Trash2, Calendar, ShieldCheck, Filter, ChevronRight } from 'lucide-react';
import Modal from './ui/Modal';
import { getStudents, logAudit, deleteStudent } from '../services/apiService';
import { Mail } from 'lucide-react';

export default function StudentList() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin'>('all');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await getStudents();
        setStudents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch students:", err);
        setStudents([]);
      }
    };
    fetchStudents();
  }, []);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const studentToDelete = students.find(s => s.id === deleteId);
    // Note: deleteStudent API should be added if needed, for now we'll just log it
    // and update local state. In a real app, we'd have a DELETE /api/students/:id
    
    if (studentToDelete) {
      try {
        await deleteStudent(deleteId);
        await logAudit('Delete Student', `Removed student: ${studentToDelete.name} (${studentToDelete.id})`);
        setStudents(prev => prev.filter(s => s.id !== deleteId));
      } catch (err) {
        console.error("Failed to delete student:", err);
      }
    }

    if (selectedStudent?.id === deleteId) setSelectedStudent(null);
    setDeleteId(null);
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    
    const headers = ['ID', 'Name', 'Role', 'Department', 'Registered At'];
    const rows = students.map(s => [s.id, s.name, s.role || 'student', s.department || 'N/A', s.registeredAt]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registered_students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || (s.role || 'student') === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">User Directory</h2>
          <p className="text-gray-500">Manage biometric profiles for students and staff members.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
          <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 text-sm font-bold">
            {students.length} Total Users
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* List Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                value={roleFilter}
                onChange={(e: any) => setRoleFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all shadow-sm font-medium"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="admin">Staff / Teachers</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-bottom border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID / Dept</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registered</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr 
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-blue-50/50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                              (student.role || 'student') === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {student.name.charAt(0)}
                            </div>
                            <div className="font-bold text-gray-900">{student.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-sm text-gray-500">{student.id}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{student.department || 'No Dept'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            (student.role || 'student') === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {student.role || 'student'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] font-medium text-gray-500">
                            {student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(student.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Section */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div 
                key={selectedStudent.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white border border-gray-200 rounded-3xl p-8 space-y-8 shadow-lg sticky top-6"
              >
                <div className="text-center space-y-4">
                  <div className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl bg-gradient-to-br ${
                    (selectedStudent.role || 'student') === 'admin' ? 'from-purple-500 to-pink-600' : 'from-blue-500 to-purple-600'
                  }`}>
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h3>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm font-mono text-gray-400 uppercase tracking-widest">{selectedStudent.id}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        (selectedStudent.role || 'student') === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedStudent.role || 'student'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                      <ShieldCheck size={14} />
                      Verified
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                    <div className="flex items-center gap-2 text-gray-700 font-medium text-sm truncate">
                      <Mail size={14} className="text-gray-400" />
                      {selectedStudent.email || 'N/A'}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {selectedStudent.role === 'admin' ? 'Assigned Dept' : 'Department'}
                    </p>
                    <p className="text-sm font-bold text-gray-900">{selectedStudent.department || 'N/A'}</p>
                  </div>
                </div>

                {selectedStudent.images && Object.keys(selectedStudent.images).length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Facial Profiles</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedStudent.images).map(([key, src]: [string, any]) => (
                        <div key={key} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                          <img 
                            src={src} 
                            alt={key} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] text-white font-bold uppercase tracking-widest">{key}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center space-y-2">
                    <ShieldCheck size={24} className="mx-auto text-gray-300" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Visual Profile</p>
                    <p className="text-[10px] text-gray-500">Only mathematical descriptors are stored for this user.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-gray-500 text-sm">
                    <Calendar size={16} />
                    <span>Registered on {new Date(selectedStudent.registeredAt).toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center space-y-4 opacity-50">
                <User size={48} className="mx-auto text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Select a student to view their full biometric profile and details.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Student Profile?"
        message="This will permanently remove the student's biometric data and registration record. This action cannot be undone."
        type="danger"
        confirmLabel="Delete Permanently"
      />
    </div>
  );
}
