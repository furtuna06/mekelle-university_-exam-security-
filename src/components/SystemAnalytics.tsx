import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { Brain, ShieldCheck, Target, Activity, Info, AlertCircle, Table as TableIcon, TrendingUp, Users, Building2 } from 'lucide-react';
import { getRecognitionAttempts, getStudents, getAttendanceLogs } from '../services/apiService';

export default function SystemAnalytics() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attemptsData, studentsData, attendanceData] = await Promise.all([
          getRecognitionAttempts(),
          getStudents(),
          getAttendanceLogs()
        ]);
        setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
        setAttempts([]);
        setStudents([]);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate Metrics
  const totalAttempts = attempts.length;
  
  // Ground truth estimation
  const tp = attempts.filter(a => a.status === 'match' && a.distance < 0.4).length;
  const fp = attempts.filter(a => a.status === 'match' && a.distance >= 0.4).length;
  const fn = attempts.filter(a => a.status === 'no-match' && a.distance < 0.5).length;
  const tn = attempts.filter(a => a.status === 'no-match' && a.distance >= 0.5).length;

  const accuracy = totalAttempts > 0 ? ((tp + tn) / totalAttempts) * 100 : 0;
  const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
  const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const correctMatches = attempts.filter(a => a.status === 'match');
  const mse = correctMatches.length > 0 
    ? correctMatches.reduce((acc, curr) => acc + Math.pow(curr.distance, 2), 0) / correctMatches.length
    : 0;

  // Department Distribution Data
  const deptData = useMemo(() => {
    const depts: Record<string, number> = {};
    students.forEach((s: any) => {
      const d = s.department || 'Unknown';
      depts[d] = (depts[d] || 0) + 1;
    });
    return Object.entries(depts).map(([name, value]) => ({ name, value }));
  }, [students]);

  // Attendance Trend (Last 7 days)
  const attendanceTrend = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString()] = 0;
    }
    attendance.forEach((a: any) => {
      const date = new Date(a.timestamp).toLocaleDateString();
      if (days[date] !== undefined) days[date]++;
    });
    return Object.entries(days).map(([name, count]) => ({ name, count }));
  }, [attendance]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const chartData = [
    { name: 'Accuracy', value: parseFloat(accuracy.toFixed(1)), color: '#3b82f6' },
    { name: 'Precision', value: parseFloat(precision.toFixed(1)), color: '#10b981' },
    { name: 'Recall', value: parseFloat(recall.toFixed(1)), color: '#f59e0b' },
    { name: 'F1 Score', value: parseFloat(f1.toFixed(1)), color: '#8b5cf6' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">System Analytics & Evaluation</h2>
          <p className="text-gray-500">Performance metrics and accuracy reports.</p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold">
          System: Optimized
        </div>
      </div>

      {/* Performance Metrics */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Target className="text-blue-600" />
          <h3 className="text-xl font-bold">Performance Evaluation</h3>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { label: 'Total Scans', value: totalAttempts, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Accuracy', value: `${accuracy.toFixed(1)}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Precision', value: `${precision.toFixed(1)}%`, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'MSE (Error)', value: mse.toFixed(4), icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Attendance Trend */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-emerald-600" />
                Attendance Trend
              </h3>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last 7 Days</span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Distribution */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 space-y-6 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="text-blue-600" />
              Departments
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {deptData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="font-medium text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Metrics Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-[400px]">
            <h4 className="text-sm font-bold text-gray-900 mb-6">Performance Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confusion Matrix */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TableIcon size={18} className="text-blue-600" />
              Confusion Matrix
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1"></div>
              <div className="text-center text-[10px] font-bold text-gray-400 uppercase">Predicted Match</div>
              <div className="text-center text-[10px] font-bold text-gray-400 uppercase">Predicted No-Match</div>
              
              <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase">Actual Match</div>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center">
                <div className="text-2xl font-bold text-emerald-700">{tp}</div>
                <div className="text-[8px] text-emerald-600 font-bold uppercase">True Positive</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-center">
                <div className="text-2xl font-bold text-red-700">{fn}</div>
                <div className="text-[8px] text-red-600 font-bold uppercase">False Negative</div>
              </div>

              <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase">Actual No-Match</div>
              <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl text-center">
                <div className="text-2xl font-bold text-amber-700">{fp}</div>
                <div className="text-[8px] text-amber-600 font-bold uppercase">False Positive</div>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-center">
                <div className="text-2xl font-bold text-gray-700">{tn}</div>
                <div className="text-[8px] text-gray-600 font-bold uppercase">True Negative</div>
              </div>
            </div>
            <p className="mt-6 text-[10px] text-gray-400 italic">
              * Metrics are estimated based on Euclidean distance thresholds (Match: &lt;0.45, High Certainty: &lt;0.4).
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
