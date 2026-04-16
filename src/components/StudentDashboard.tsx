import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, User, ShieldCheck, AlertCircle, MapPin, UserPlus, Bell } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { checkUserRole } from '../services/apiService';
import { auth } from '../firebase';

export default function StudentDashboard({ onNavigate, onSwitchRole }: { onNavigate?: (v: any) => void, onSwitchRole?: () => void }) {
  const [examSchedule, setExamSchedule] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const schedule = JSON.parse(localStorage.getItem('exam_schedule') || 'null');
    setExamSchedule(schedule);

    const checkStatus = async () => {
      if (auth.currentUser?.email) {
        try {
          const res = await checkUserRole(auth.currentUser.email);
          setIsRegistered(res.exists);
        } catch (err) {
          console.error("Failed to check registration status:", err);
        }
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Student Portal</h2>
          <p className="text-gray-500">View your exam schedule and registration status.</p>
        </div>
        <div className="flex items-center gap-3">
          {onNavigate && (
            <div className="flex gap-2">
              <button 
                onClick={() => onNavigate('self-register')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center gap-2"
              >
                <UserPlus size={16} />
                Self Register
              </button>
            </div>
          )}
          <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${
            isRegistered ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
          }`}>
            {isRegistered ? 'Biometrics Registered' : 'Registration Required'}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Exam Schedule Card */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Calendar size={24} />
                </div>
                <h3 className="text-xl font-bold">Upcoming Exam</h3>
              </div>

              {examSchedule ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Subject</span>
                      <span className="text-sm font-bold">{examSchedule.subject || 'Computer Science 101'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Date</span>
                      <span className="text-sm font-bold">{examSchedule.examDate || new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Location</span>
                      <div className="flex items-center gap-1 text-sm font-bold">
                        <MapPin size={14} className="text-blue-500" />
                        {examSchedule.location || 'Block A, Hall 4'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-100 rounded-2xl space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Time</div>
                      <div className="text-lg font-bold flex items-center gap-2">
                        <Clock size={16} className="text-emerald-500" />
                        {examSchedule.startTime}
                      </div>
                    </div>
                    <div className="p-4 border border-gray-100 rounded-2xl space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End Time</div>
                      <div className="text-lg font-bold flex items-center gap-2">
                        <Clock size={16} className="text-red-500" />
                        {examSchedule.endTime}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-600 text-white rounded-2xl flex items-center gap-3">
                    <ShieldCheck size={20} />
                    <p className="text-xs font-medium leading-relaxed">
                      Biometric verification will be active at the entrance. Please arrive 15 minutes early.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3 opacity-50">
                  <AlertCircle size={48} className="mx-auto" />
                  <p className="text-sm">No exam schedule published yet.</p>
                </div>
              )}
            </div>

            {/* Requirements Card */}
            <div className="space-y-6">
              <div className="bg-gray-900 text-white p-8 rounded-3xl space-y-6">
                <h3 className="text-xl font-bold">Entry Requirements</h3>
                <ul className="space-y-4">
                  <RequirementItem 
                    checked={isRegistered} 
                    label="Biometric Registration" 
                    desc="Must have 4-angle facial scan on file." 
                  />
                  <RequirementItem 
                    checked={true} 
                    label="Physical Student ID" 
                    desc="Carry your university ID card for backup." 
                  />
                  <RequirementItem 
                    checked={true} 
                    label="Timely Arrival" 
                    desc="Entry closes exactly at exam start time." 
                  />
                </ul>
              </div>

              <a 
                href="mailto:hagezomfurtuna@gmail.com"
                className="p-6 bg-white border border-gray-200 rounded-3xl flex items-center gap-4 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-50 transition-all group"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <User size={24} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Support</div>
                  <div className="text-sm font-bold">Contact Registrar Office</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Notifications Sidebar */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm h-fit">
          <NotificationCenter />
        </div>
      </div>
    </div>
  );
}

function RequirementItem({ checked, label, desc }: { checked: boolean, label: string, desc: string }) {
  return (
    <li className="flex gap-4">
      <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
        checked ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/30'
      }`}>
        <ShieldCheck size={14} />
      </div>
      <div>
        <div className={`text-sm font-bold ${checked ? 'text-white' : 'text-white/50'}`}>{label}</div>
        <div className="text-xs text-white/40 mt-0.5">{desc}</div>
      </div>
    </li>
  );
}
