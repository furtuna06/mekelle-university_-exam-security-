import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, User, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import Modal from './ui/Modal';
import { logAudit, addNotification, getPendingRegistrations, saveStudent, deletePendingRegistration } from '../services/apiService';

export default function PendingApprovals() {
  const [pending, setPending] = useState<any[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const data = await getPendingRegistrations();
        setPending(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch pending:", err);
        setPending([]);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (student: any) => {
    setIsProcessing(student.id);
    try {
      // Add to main students list
      await saveStudent({
        ...student,
        email: student.email || '',
        status: 'approved'
      });

      // Remove from pending
      await deletePendingRegistration(student.id);

      await logAudit('Approve Registration', `Approved ${student.name} (${student.id})`);
      
      // Send notification to the student
      await addNotification({
        title: 'Registration Approved',
        message: `Welcome ${student.name}! Your biometric registration has been successfully verified. You can now use the system.`,
        type: 'success',
        targetId: student.id
      });
    } catch (err) {
      console.error("Approval failed:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    const studentToReject = pending.find(p => p.id === rejectId);
    
    try {
      await deletePendingRegistration(studentToReject.id);
      
      if (studentToReject) {
        await logAudit('Reject Registration', `Rejected ${studentToReject.name} (${studentToReject.id})`);
        
        // Send notification to the student
        await addNotification({
          title: 'Registration Rejected',
          message: `Hello ${studentToReject.name}, your registration was not approved. Please ensure your photos are clear and try registering again.`,
          type: 'error',
          targetId: studentToReject.id
        });
      }
    } catch (err) {
      console.error("Rejection failed:", err);
    }

    setRejectId(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pending Approvals</h2>
          <p className="text-gray-500">Review and approve student self-registrations from dorms.</p>
        </div>
        <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-sm font-bold">
          {pending.length} Requests Pending
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center space-y-4 opacity-50">
          <ShieldCheck size={64} className="mx-auto text-gray-300" />
          <p className="text-lg font-medium">No pending registration requests.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <AnimatePresence>
            {pending.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white border border-gray-200 rounded-3xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <User size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{item.name}</div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{item.id}</div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            (item.role || 'student') === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.role || 'student'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium italic">
                          {item.department || 'No Department'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submitted</div>
                    <div className="text-xs font-medium flex items-center gap-1 text-gray-600">
                      <Clock size={12} />
                      {new Date(item.submittedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Captured Images Grid */}
                {item.images && (
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(item.images).map(([key, src]: [string, any]) => (
                      <div key={key} className="space-y-1">
                        <div className="aspect-square rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                          <img 
                            src={src} 
                            alt={key} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="text-[8px] text-center font-bold text-gray-400 uppercase tracking-tighter">{key}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-blue-500" />
                    <span className="text-xs font-bold text-gray-600">4 Biometric Samples Collected</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">VERIFIED</span>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setRejectId(item.id)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <X size={18} />
                    Reject
                  </button>
                  <button 
                    onClick={() => handleApprove(item)}
                    disabled={isProcessing === item.id}
                    className="flex-2 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isProcessing === item.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={18} />
                        Approve Registration
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal 
        isOpen={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={confirmReject}
        title="Reject Registration?"
        message="Are you sure you want to reject this student's registration? They will need to submit their biometrics again."
        type="warning"
        confirmLabel="Yes, Reject"
      />
    </div>
  );
}
