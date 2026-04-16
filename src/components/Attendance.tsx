import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ClipboardCheck, Search, Download, User, Clock, Calendar, Filter, Trash2 } from 'lucide-react';

import { getAttendanceLogs, deleteAttendanceLog, deleteAllAttendanceLogs } from '../services/apiService';

export default function Attendance() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getAttendanceLogs();
        // Strictly filter for students only
        const studentData = Array.isArray(data) ? data.filter(d => d.role !== 'admin') : [];
        setAttendance(studentData);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
        setAttendance([]);
      }
    };
    fetchLogs();
  }, []);

  const filteredData = attendance.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (entryId: number) => {
    const confirmed = window.confirm('Remove this attendance record? This does not delete the student profile.');
    if (!confirmed) return;

    try {
      setIsDeletingId(entryId);
      await deleteAttendanceLog(entryId);
      setAttendance(prev => prev.filter(entry => entry.id !== entryId));
    } catch (err) {
      console.error('Failed to remove attendance entry:', err);
      window.alert('Unable to remove attendance entry. Please try again.');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm('Remove all attendance records permanently? This will not delete any student profiles.');
    if (!confirmed) return;

    try {
      setIsDeletingAll(true);
      await deleteAllAttendanceLogs();
      setAttendance([]);
    } catch (err) {
      console.error('Failed to remove all attendance records:', err);
      window.alert('Unable to remove all attendance records. Please try again.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const exportCSV = () => {
    if (attendance.length === 0) return;
    const headers = ['Date', 'Time', 'Name', 'ID', 'Department', 'Confidence'];
    const rows = filteredData.map(a => [
      new Date(a.timestamp).toLocaleDateString(),
      new Date(a.timestamp).toLocaleTimeString(),
      a.name,
      a.id,
      a.department || 'N/A',
      `${a.confidence}%`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Attendance Records</h2>
          <p className="text-gray-500 text-sm">Automated biometric attendance tracking for students.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button 
            onClick={handleDeleteAll}
            disabled={isDeletingAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-700 hover:bg-red-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            {isDeletingAll ? 'Removing All...' : 'Remove All'}
          </button>
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold">
            {attendance.length} Students Present
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search students by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID / Dept</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confidence</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    No student attendance records found.
                  </td>
                </tr>
              ) : (
                filteredData.map((entry, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={entry.timestamp + idx}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{new Date(entry.timestamp).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {entry.name.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-900">{entry.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-gray-500">{entry.id}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{entry.department || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${entry.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-500">{entry.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                        <ClipboardCheck size={14} />
                        Present
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        disabled={isDeletingId === entry.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                        {isDeletingId === entry.id ? 'Removing' : 'Remove'}
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
