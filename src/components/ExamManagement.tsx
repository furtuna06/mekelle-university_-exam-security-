import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Save, Download, Trash2, Plus, AlertCircle } from 'lucide-react';
import Modal from './ui/Modal';
import { logAudit, getStudents } from '../services/apiService';

export default function ExamManagement() {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [modal, setModal] = useState<{ isOpen: boolean, title: string, message: string, type: 'danger' | 'warning' | 'info', onConfirm?: () => void } | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const students = await getStudents();
        setStudentCount(students.length);
        
        // For exam schedule, we could add an API, but for now we'll keep it in localStorage
        // or just use a placeholder.
        const saved = JSON.parse(localStorage.getItem('exam_schedule') || 'null');
        if (saved) {
          setStartTime(saved.startTime);
          setEndTime(saved.endTime);
          setExamDate(saved.examDate || new Date().toISOString().split('T')[0]);
          setSubject(saved.subject || '');
          setLocation(saved.location || '');
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleSave = async () => {
    const schedule = { startTime, endTime, examDate, subject, location, updatedAt: new Date().toISOString() };
    localStorage.setItem('exam_schedule', JSON.stringify(schedule));
    setIsSaved(true);
    
    await logAudit('Schedule Exam', `Set exam for ${subject} on ${examDate} at ${startTime} in ${location}`);
    // addNotification should also use API if possible
    
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportCSV = async () => {
    try {
      const students = await getStudents();
      if (students.length === 0) {
        setModal({
          isOpen: true,
          title: "No Data",
          message: "There are no registered students to export. Please register students first.",
          type: "info"
        });
        return;
      }

      // Prepare CSV content
      const headers = ['ID', 'Name', 'RegisteredAt'];
      const rows = students.map((s: any) => [
        s.id,
        s.name,
        s.registeredAt
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r: any) => r.join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `registered_students_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Exam Management</h2>
          <p className="text-gray-500 text-sm">Schedule exam sessions and export registered student data.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
        >
          <Download size={20} className="text-blue-600" />
          Export Students (CSV)
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-8 space-y-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Calendar size={24} />
            </div>
            <h3 className="text-xl font-bold">Schedule Exam Session</h3>
          </div>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Exam Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="date" 
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Exam Location / Room</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Block A, Hall 4"
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Exam Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. CS 101"
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Start Time</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">End Time</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              {studentCount > 24 && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700">
                  <AlertCircle size={20} />
                  <p className="text-xs font-bold">
                    Warning: Current registered students ({studentCount}) exceeds room capacity (24).
                  </p>
                </div>
              )}
              <button 
                onClick={handleSave}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isSaved ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                }`}
              >
                {isSaved ? <Save size={20} /> : <Plus size={20} />}
                {isSaved ? 'Schedule Updated' : 'Publish Exam Schedule'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 text-white p-8 rounded-3xl space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="text-amber-400" />
              System Policy
            </h3>
            <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
              <p>
                Once the <strong>Start Time</strong> is reached, the entry system will automatically block any late arrivals.
              </p>
              <p>
                The <strong>End Time</strong> determines when the session logs are finalized and archived.
              </p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Room Capacity Rule</div>
                <div className="text-amber-400 font-bold">24 Students + 2 Invigilators</div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Current Status</div>
                <div className="text-emerald-400 font-bold">Entry System Active</div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white border border-gray-200 rounded-3xl space-y-4">
            <h4 className="font-bold text-gray-900">Data Management</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Exporting student data as CSV allows for offline processing and integration with university grading systems.
            </p>
            <button 
              onClick={() => {
                setModal({
                  isOpen: true,
                  title: "Clear Database?",
                  message: "Are you sure you want to clear all student biometrics? This action is permanent and cannot be undone.",
                  type: "danger",
                  onConfirm: async () => {
                    localStorage.removeItem('students');
                    localStorage.removeItem('recognition_logs');
                    localStorage.removeItem('attendance_logs');
                    localStorage.removeItem('pending_registrations');
                    localStorage.removeItem('cheat_alerts');
                    localStorage.removeItem('audit_logs');
                    localStorage.removeItem('notifications');
                    
                    await logAudit('Clear Database', 'Admin cleared all system records and logs.');
                    
                    window.location.reload();
                  }
                });
              }}
              className="w-full py-3 text-red-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={16} />
              Clear Biometric Database
            </button>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={!!modal?.isOpen}
        onClose={() => setModal(null)}
        onConfirm={modal?.onConfirm}
        title={modal?.title || ''}
        message={modal?.message || ''}
        type={modal?.type || 'info'}
      />
    </div>
  );
}
