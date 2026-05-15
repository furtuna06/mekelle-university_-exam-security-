import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldAlert, ShieldCheck, User, Clock, AlertCircle, History } from 'lucide-react';
import { getFaceDescriptor, computeFaceSimilarity } from '../lib/faceApi';
import { detectSuspiciousObjects, loadObjectDetector, summarizeSuspiciousObject } from '../lib/objectDetector';
import { logAttendance, logAudit, getStudents, logRecognitionAttempt, sendCheatAlert } from '../services/apiService';
import { AttendanceTracker } from '../lib/attendanceTracker';
interface RecognitionResult {
  student?: any;
  confidence: number;
  status: 'match' | 'no-match' | 'scanning';
  warning?: string;
  timestamp: string;
}



export default function Recognition() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<RecognitionResult>({ status: 'scanning', confidence: 0, timestamp: '' });
  const [logs, setLogs] = useState<RecognitionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [lastUnknownTime, setLastUnknownTime] = useState<number>(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [detectorReady, setDetectorReady] = useState(false);
  const alertCooldownRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function startVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }
    startVideo();

    loadObjectDetector()
      .then(() => setDetectorReady(true))
      .catch((err) => console.error("Failed to initialize object detector:", err));

   // Load students from Firestore
    getStudents()
      .then(data => setStudents(data || []))
      .catch(err => console.error("Failed to load students:", err));
  }, []);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current || isProcessing) return;
      
      setIsProcessing(true);
      
      // Always run object detection independently - don't wait for face detection
      let suspiciousPrediction: any[] = [];
      if (detectorReady) {
        try {
          console.log('[Detection] Running object detection...');
          suspiciousPrediction = await detectSuspiciousObjects(videoRef.current);
          console.log('[Detection] Found', suspiciousPrediction.length, 'suspicious objects:', suspiciousPrediction.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
          
          // Send alert immediately if suspicious objects are detected
          if (suspiciousPrediction.length > 0 && !alertCooldownRef.current) {
            const suspiciousLabel = summarizeSuspiciousObject(suspiciousPrediction[0]);
            const warningText = `ALERT: ${suspiciousLabel} detected in exam area.`;
            console.log('[Detection] Sending alert:', warningText);
            
            alertCooldownRef.current = true;
            setTimeout(() => { alertCooldownRef.current = false; }, 30000); // 30 second cooldown
            
            await sendCheatAlert(warningText).catch(err => console.error('Failed to send cheat alert:', err));
            
            setResult({
              student: null,
              confidence: 0,
              status: 'no-match',
              warning: warningText,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        } catch (err) {
          console.error('[Detection] Object detection error:', err);
        }
      } else {
        console.log('[Detection] Detector not ready yet');
      }
      
      const descriptor = await getFaceDescriptor(videoRef.current);
      const suspiciousLabel = suspiciousPrediction.length ? summarizeSuspiciousObject(suspiciousPrediction[0]) : null;
      const warningText = suspiciousLabel ? `Face detected with ${suspiciousLabel} present.` : undefined;

      if (!descriptor) {
        setResult({
          student: null,
          confidence: 0,
          status: warningText ? 'no-match' : 'scanning',
          warning: warningText,
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsProcessing(false);
        return;
      }

      let bestMatch = null;
      let minDistance = 1.0;

      for (const student of students) {
        for (const storedDescriptorArray of (student.descriptors as number[][])) {
          const storedDescriptor = new Float32Array(storedDescriptorArray);
          const distance = computeFaceSimilarity(descriptor, storedDescriptor);
          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = student;
          }
        }
      }

      const confidence = Math.max(0, (1 - minDistance) * 100);
      const isMatch = minDistance < 0.45 && confidence >= 60;
      
      // Log attempt for analytics
      await logRecognitionAttempt({
        studentId: isMatch ? bestMatch.id : null,
        confidence: parseFloat(confidence.toFixed(2)),
        status: isMatch ? 'match' : 'no-match',
        distance: minDistance
      });

      const newResult: RecognitionResult = {
        student: isMatch ? bestMatch : null,
        confidence: parseFloat(confidence.toFixed(2)),
        status: isMatch ? 'match' : (confidence > 40 ? 'no-match' : 'scanning'),
        warning: warningText,
        timestamp: new Date().toLocaleTimeString(),
      };

      setResult(newResult);

      if (isMatch || confidence > 50) {
        const nowTime = Date.now();

        if (isMatch) {
          // Check if this student should be logged using shared tracker
          if (AttendanceTracker.logAttendance(bestMatch.id, 'security_monitor')) {
            setLogs(prev => [newResult, ...prev].slice(0, 10));
            
            const newAttendance = {
              id: bestMatch.id,
              name: bestMatch.name,
              role: bestMatch.role || 'student',
              department: bestMatch.department || 'N/A',
              confidence: parseFloat(confidence.toFixed(2))
            };
            
            await logAttendance(newAttendance);
            await logAudit('Security Recognition', `User recognized via Monitor: ${bestMatch.name} (${bestMatch.id})`);
          }
        } else {
          // Unknown person - 30 second cooldown for logging
          if (nowTime - lastUnknownTime > 30000) {
            setLogs(prev => [newResult, ...prev].slice(0, 10));
            await logAudit('Security Alert', 'Unknown individual detected at entry');
            setLastUnknownTime(nowTime);
          }
        }
      }
      setIsProcessing(false);
    }, 1500);

    return () => clearInterval(interval);
  }, [students, detectorReady]);

  return (
    <div className="max-w-6xl mx-auto p-6 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className="text-sm font-bold text-gray-700">
              {isOnline ? 'System Online' : 'Offline Mode - Sync Pending'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
            Threshold: 60% Required
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden bg-black aspect-video shadow-2xl border border-gray-800">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-90"
          />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-white/20 rounded-2xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>

          {/* Result Banner */}
          <AnimatePresence mode="wait">
            {result.status !== 'scanning' && (
              <motion.div 
                key={result.status + (result.student?.id || 'none')}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className={`absolute bottom-6 left-6 right-6 p-4 rounded-2xl backdrop-blur-xl border flex items-center justify-between ${
                  result.status === 'match' 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-50' 
                    : 'bg-red-500/20 border-red-500/50 text-red-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    result.status === 'match' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                    {result.status === 'match' ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest font-bold opacity-70">
                      {result.status === 'match' 
                        ? (result.student.role === 'admin' ? 'Staff Verified' : 'Identity Verified') 
                        : 'Unauthorized Access'}
                    </div>
                    <div className="text-lg font-bold">
                      {result.status === 'match' ? result.student.name : 'Unknown Individual'}
                    </div>
                    {result.warning && (
                      <p className="mt-2 text-sm opacity-90">
                        {result.warning}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest font-bold opacity-70">Confidence</div>
                  <div className="text-2xl font-mono font-bold">{result.confidence}%</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-white border border-gray-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
              <Clock size={16} />
              System Time
            </div>
            <div className="text-2xl font-bold">{new Date().toLocaleTimeString()}</div>
          </div>
          <div className="p-6 bg-white border border-gray-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
              <Shield size={16} />
              Security Status
            </div>
            <div className={`text-2xl font-bold ${result.status === 'no-match' ? 'text-red-600' : 'text-emerald-600'}`}>
              {result.status === 'no-match' ? 'Alert Active' : 'Secure'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-900 text-white p-6 rounded-3xl space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <History size={20} className="text-blue-400" />
              Access Logs
            </h3>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded uppercase tracking-wider">Live</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                <AlertCircle size={48} />
                <p className="text-sm">No activity detected yet</p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <motion.div 
                  key={log.timestamp + idx}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`p-3 rounded-xl border ${
                    log.status === 'match' 
                      ? 'bg-emerald-500/10 border-emerald-500/20' 
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'match' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs font-bold truncate max-w-32">
                        {log.status === 'match' ? log.student.name : 'Unknown'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono opacity-50">{log.timestamp}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                    <span className="opacity-50">Score: {log.confidence}%</span>
                    <span className={log.status === 'match' ? 'text-emerald-400' : 'text-red-400'}>
                      {log.status === 'match' ? 'AUTHORIZED' : 'INTRUDER'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <User size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400">Active Supervisor</div>
                <div className="text-sm font-bold">Instr. Teages Kalayu</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
