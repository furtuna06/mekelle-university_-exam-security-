import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  UserPlus, 
  Scan, 
  BarChart3, 
  Info, 
  LayoutDashboard,
  LogOut,
  Bell,
  Settings,
  Search,
  CalendarDays,
  UserCircle,
  ShieldAlert,
  BrainCircuit,
  ClipboardCheck,
  History,
  Monitor
} from 'lucide-react';
import { loadModels } from './lib/faceApi';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { getStudents, getAttendanceLogs, getPendingRegistrations } from './services/apiService';
import Registration from './components/Registration';
import Recognition from './components/Recognition';
import AlgorithmInfo from './components/AlgorithmInfo';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import ExamManagement from './components/ExamManagement';
import SelfRegistration from './components/SelfRegistration';
import PendingApprovals from './components/PendingApprovals';
import StudentList from './components/StudentList';
import Attendance from './components/Attendance';
import StaffLogs from './components/StaffLogs';
import AuditLogs from './components/AuditLogs';
import NotificationCenter from './components/NotificationCenter';
import EntryStation from './components/EntryStation';

import SystemAnalytics from './components/SystemAnalytics';

import Logo from './components/Logo';

type Role = 'admin' | 'student' | null;
type View = 'dashboard' | 'register' | 'verify' | 'analytics' | 'info' | 'schedule' | 'self-register' | 'approvals' | 'students' | 'attendance' | 'staff-logs' | 'audit' | 'entry-station';

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await loadModels();
      } catch (err) {
        console.error("Failed to load models:", err);
        setModelError(err instanceof Error ? err.message : String(err));
      }
    }
    init();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setRole(null);
      } else {
        const storedRole = sessionStorage.getItem('loginRole');
        if (!role && (storedRole === 'admin' || storedRole === 'student')) {
          setRole(storedRole);
          sessionStorage.removeItem('loginRole');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
    setCurrentView('dashboard');
  };

  const toggleRole = () => {
    setRole((prev: Role) => prev === 'admin' ? 'student' : 'admin');
    setCurrentView('dashboard');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-gray-50 flex flex-col items-center justify-center space-y-4">
        {modelError ? (
          <div className="max-w-md p-8 bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-50 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">System Error</h2>
            <p className="text-gray-500 text-sm">
              Failed to initialize biometric models. This may be due to a network issue or CDN failure.
            </p>
            <div className="p-3 bg-red-50 rounded-xl text-left">
              <code className="text-[10px] text-red-700 font-mono break-all">{modelError}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
            >
              Retry Initialization
            </button>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Mekelle University System</h2>
              <p className="text-gray-500 text-sm">Initializing Biometric Models...</p>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!user || !role) {
    return <Login onLogin={setRole} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        <div className="p-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md border border-gray-100 overflow-hidden p-1">
              <Logo alt="MU Logo" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-gray-900">Mekelle University</h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                {role === 'admin' ? 'Admin Portal' : 'Student Portal'}
              </p>
            </div>
          </div>
          <div className="px-1 py-0.5 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Mekelle University</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
            icon={<LayoutDashboard />}
            label="Dashboard"
          />
          
          {role === 'student' && (
            <NavItem 
              active={currentView === 'self-register'} 
              onClick={() => setCurrentView('self-register')}
              icon={<UserPlus />}
              label="Self Registration"
            />
          )}
          
          {role === 'admin' ? (
            <>
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operations</div>
              <NavItem 
                active={currentView === 'register'} 
                onClick={() => setCurrentView('register')}
                icon={<UserPlus />}
                label="Registration"
              />
              <NavItem 
                active={currentView === 'students'} 
                onClick={() => setCurrentView('students')}
                icon={<UserCircle />}
                label="Registered Users"
              />
              <NavItem 
                active={currentView === 'verify'} 
                onClick={() => setCurrentView('verify')}
                icon={<Scan />}
                label="Exam Entry Control"
              />
              <NavItem 
                active={currentView === 'attendance'} 
                onClick={() => setCurrentView('attendance')}
                icon={<ClipboardCheck />}
                label="Attendance Logs"
              />
              <NavItem 
                active={currentView === 'staff-logs'} 
                onClick={() => setCurrentView('staff-logs')}
                icon={<ShieldCheck />}
                label="Staff Entry Logs"
              />
              <NavItem 
                active={currentView === 'audit'} 
                onClick={() => setCurrentView('audit')}
                icon={<History />}
                label="Audit Logs"
              />
              <NavItem 
                active={currentView === 'schedule'} 
                onClick={() => setCurrentView('schedule')}
                icon={<CalendarDays />}
                label="Exam Management"
              />
              <NavItem 
                active={currentView === 'approvals'} 
                onClick={() => setCurrentView('approvals')}
                icon={<ShieldCheck />}
                label="Pending Approvals"
              />
              <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analysis</div>
              <NavItem 
                active={currentView === 'analytics'} 
                onClick={() => setCurrentView('analytics')}
                icon={<BarChart3 />}
                label="Performance Metrics"
              />
            </>
          ) : null}

        </nav>

        <div className="p-6 border-t border-gray-100 space-y-4">
          <div className="bg-blue-50 p-4 rounded-2xl">
            <p className="text-xs font-medium text-blue-700 leading-relaxed">
              Logged in as <strong className="capitalize">{role}</strong>
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            <span className="font-semibold text-sm">Sign Out</span>
          </button>

          
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-24 bg-white/80 backdrop-blur-md border-bottom border-gray-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students, logs, or metrics..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <Settings size={22} />
            </button>
            <div className="h-10 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold">{user?.displayName || (role === 'admin' ? 'Instr. Teages' : 'Student User')}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {role === 'admin' ? 'Super Admin' : 'Registered Student'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white ${
                role === 'admin' ? 'bg-linear-to-br from-blue-500 to-purple-500' : 'bg-linear-to-br from-emerald-500 to-teal-500'
              }`}>
                {role === 'admin' ? <ShieldCheck size={20} /> : <UserCircle size={20} />}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (role || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && (
                role === 'admin' ? <AdminDashboard onNavigate={setCurrentView} onSwitchRole={toggleRole} /> : <StudentDashboard onNavigate={setCurrentView} onSwitchRole={toggleRole} />
              )}
              {currentView === 'register' && role === 'admin' && <Registration onComplete={() => setCurrentView('verify')} />}
              {currentView === 'verify' && role === 'admin' && <Recognition />}
              {currentView === 'analytics' && role === 'admin' && <SystemAnalytics />}
              {currentView === 'schedule' && role === 'admin' && <ExamManagement />}
              {currentView === 'approvals' && role === 'admin' && <PendingApprovals />}
              {currentView === 'students' && role === 'admin' && <StudentList />}
              {currentView === 'attendance' && role === 'admin' && <Attendance />}
              {currentView === 'staff-logs' && role === 'admin' && <StaffLogs />}
              {currentView === 'audit' && role === 'admin' && <AuditLogs />}
              {currentView === 'entry-station' && <EntryStation onBack={() => setCurrentView('dashboard')} />}
              {currentView === 'self-register' && role === 'student' && <SelfRegistration />}
              {currentView === 'info' && <AlgorithmInfo />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactElement, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'} transition-colors`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      </span>
      <span className="font-semibold text-sm">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
        />
      )}
    </button>
  );
}

function AdminDashboard({ onNavigate, onSwitchRole }: { onNavigate: (v: View) => void, onSwitchRole: () => void }) {
  const [stats, setStats] = useState({ students: 0, logs: 0, attendance: 0, pending: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, attendance, pending] = await Promise.all([
          getStudents(),
          getAttendanceLogs(),
          getPendingRegistrations()
        ]) as [any[], any[], any[]];
        setStats({
          students: students.length,
          logs: 0, // Placeholder
          attendance: attendance.length,
          pending: pending.length
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-500">System management and real-time security overview.</p>
        </div>
        <button 
          onClick={() => onNavigate('verify')}
          className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
        >
          <Scan size={20} />
          Start Exam Session
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div onClick={() => onNavigate('approvals')} className="cursor-pointer">
          <DashboardCard 
            title="Pending Requests" 
            value={stats.pending} 
            subtitle="Awaiting approval"
            icon={<ShieldCheck />}
            color="amber"
          />
        </div>
        <div onClick={() => onNavigate('students')} className="cursor-pointer">
          <DashboardCard 
            title="Registered Users" 
            value={stats.students} 
            subtitle="Verified biometric profiles"
            icon={<UserPlus />}
            color="blue"
          />
        </div>
        <div onClick={() => onNavigate('attendance')} className="cursor-pointer">
          <DashboardCard 
            title="Student Attendance" 
            value={stats.attendance} 
            subtitle="Automated student logs"
            icon={<ClipboardCheck />}
            color="emerald"
          />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Management Console</h3>
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Student-Led Registration</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <QuickAction 
            onClick={() => onNavigate('approvals')}
            icon={<ShieldCheck />}
            label="Approve Requests"
            desc={`${stats.pending} pending approvals`}
            highlight={stats.pending > 0}
          />
          <QuickAction 
            onClick={() => onNavigate('schedule')}
            icon={<CalendarDays />}
            label="Manage Schedule"
            desc="Set exam times"
          />
          <QuickAction 
            onClick={() => onNavigate('verify')}
            icon={<Scan />}
            label="Security Monitor"
            desc="Real-time verification"
          />
          <QuickAction 
            onClick={() => onNavigate('entry-station')}
            icon={<Monitor />}
            label="Launch Kiosk"
            desc="Public entry station"
          />
          <QuickAction 
            onClick={() => onNavigate('attendance')}
            icon={<ClipboardCheck />}
            label="Attendance"
            desc="View student logs"
          />
          <QuickAction 
            onClick={() => onNavigate('staff-logs')}
            icon={<ShieldCheck />}
            label="Staff Logs"
            desc="View staff entry"
          />
          <QuickAction 
            onClick={() => onNavigate('audit')}
            icon={<History />}
            label="Audit Logs"
            desc="System activity history"
          />
          <QuickAction 
            onClick={() => onNavigate('register')}
            icon={<UserPlus />}
            label="Manual Register"
            desc="Admin-only entry"
          />
          <QuickAction 
            onClick={() => onNavigate('analytics')}
            icon={<BarChart3 />}
            label="Performance Metrics"
            desc="Accuracy & Confusion Matrix"
          />
          
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, subtitle, icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-4 hover:shadow-lg hover:shadow-gray-100 transition-all cursor-default group shadow-sm">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${colors[color]}`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
        <h4 className="text-gray-500 text-sm font-medium">{title}</h4>
        <div className="text-3xl font-bold mt-1">{value}</div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickAction({ onClick, icon, label, desc, highlight }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-2xl border text-left transition-all group relative overflow-hidden ${
        highlight ? 'border-amber-500 bg-amber-50/30' : 'border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm transition-colors ${
        highlight ? 'bg-amber-500 text-white' : 'bg-white text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
      }`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      <div className="font-bold text-sm">{label}</div>
      <div className="text-[10px] opacity-60 mt-1">{desc}</div>
      {highlight && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
      )}
    </button>
  );
}
