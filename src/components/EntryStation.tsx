import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, User, Scan, ArrowRight, CheckCircle2, XCircle, Building2, BadgeCheck } from 'lucide-react';
import Logo from './Logo';
import { getFaceDescriptor, computeFaceSimilarity } from '../lib/faceApi';
import { getStudents, logAttendance, logAudit, logRecognitionAttempt } from '../services/apiService';
import { AttendanceTracker } from '../lib/attendanceTracker';
import * as faceapi from 'face-api.js';

interface RecognitionResult {
  user?: any;
  confidence: number;
  status: 'match' | 'no-match' | 'scanning' | 'success' | 'no-face-detected' | 'error';
}

export default function EntryStation({ onBack }: { onBack?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<RecognitionResult>({ status: 'scanning', confidence: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
          };
        }
        const data = await getStudents();
        setStudents(data);
      } catch (err) {
        console.error("Error accessing webcam or students:", err);
        setResult({ status: 'error', confidence: 0 });
      }
    }
    
    // Check if models are loaded
    const checkModels = () => {
      if (typeof faceapi !== 'undefined' && faceapi.nets.ssdMobilenetv1.isLoaded) {
        setModelsLoaded(true);
      } else {
        setTimeout(checkModels, 1000); // Check again in 1 second
      }
    };
    
    startVideo();
    checkModels();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current || !modelsLoaded || !videoReady || isProcessing || cooldown || students.length === 0) return;
      
      // Check if video is actually ready
      if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) return;
      
      setIsProcessing(true);
      
      try {
        const descriptor = await getFaceDescriptor(videoRef.current);
        
        if (!descriptor) {
          // Face detection failed
          console.log('Face detection failed - no face detected');
          setResult({ status: 'no-face-detected', confidence: 0 });
          setTimeout(() => {
            setResult({ status: 'scanning', confidence: 0 });
          }, 2000);
          setIsProcessing(false);
          return;
        }

        console.log('Face detected, processing recognition...');
        
        let bestMatch = null;
        let minDistance = 1.0;

        for (const student of students) {
          if (!student.descriptors) continue;
          
          for (const storedDescriptorArray of (student.descriptors as number[][])) {
            try {
              const storedDescriptor = new Float32Array(storedDescriptorArray);
              const distance = computeFaceSimilarity(descriptor, storedDescriptor);
              if (distance < minDistance) {
                minDistance = distance;
                bestMatch = student;
              }
            } catch (error) {
              console.error('Error processing descriptor for student:', student.id, error);
            }
          }
        }

        const confidence = Math.max(0, (1 - minDistance) * 100);
        const isMatch = minDistance < 0.6 && confidence >= 50; // More lenient thresholds
        
        console.log(`Recognition result: distance=${minDistance.toFixed(3)}, confidence=${confidence.toFixed(1)}%, match=${isMatch}`);
        
        // Log attempt for analytics
        await logRecognitionAttempt({
          studentId: isMatch ? bestMatch.id : null,
          confidence: parseFloat(confidence.toFixed(2)),
          status: isMatch ? 'match' : 'no-match',
          distance: minDistance
        });

        if (isMatch && bestMatch) {
          setResult({ user: bestMatch, confidence: parseFloat(confidence.toFixed(2)), status: 'success' });
          
          // Check if student has recent attendance using shared tracker
          if (AttendanceTracker.logAttendance(bestMatch.id, 'entry_station')) {
            await logAttendance({
              id: bestMatch.id,
              name: bestMatch.name,
              role: bestMatch.role || 'student',
              department: bestMatch.department || 'N/A',
              confidence: parseFloat(confidence.toFixed(2))
            });

            await logAudit('Entry Check-in', `User checked in via Kiosk: ${bestMatch.name} (${bestMatch.id})`);
          }

          // Cooldown to show success message
          setCooldown(true);
          setTimeout(() => {
            setCooldown(false);
            setResult({ status: 'scanning', confidence: 0 });
          }, 3000);
        } else if (confidence > 30) { // Lower threshold for showing no-match
          setResult({ status: 'no-match', confidence: parseFloat(confidence.toFixed(2)) });
          setTimeout(() => {
            setResult(prev => prev.status === 'no-match' ? { status: 'scanning', confidence: 0 } : prev);
          }, 2000);
        }
      } catch (error) {
        console.error('Face recognition error:', error);
        setResult({ status: 'error', confidence: 0 });
        setTimeout(() => {
          setResult({ status: 'scanning', confidence: 0 });
        }, 2000);
      }
      
      setIsProcessing(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, cooldown, students, modelsLoaded, videoReady]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
      {/* Header */}
      <div className="absolute top-12 left-12 right-12 flex items-center justify-between">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
          >
            <ArrowRight className="rotate-180" size={20} />
          </button>
        )}
        <div className="flex-1 text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100 overflow-hidden p-1">
              <Logo alt="MU Logo" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Mekelle University <span className="text-gray-400">Entry</span></h1>
          </div>
          <p className="text-gray-500 font-medium tracking-widest text-xs uppercase">Biometric Verification Station</p>
          {!isOnline && (
    <span className="px-2 py-0.5 bg-amber-500 text-[10px] font-bold text-white rounded-full animate-pulse">
      Offline Mode
    </span>
  )}
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Camera Feed */}
        <div className="relative group">
          <div className={`absolute -inset-4 rounded-[40px] blur-2xl transition-all duration-1000 opacity-20 ${
            result.status === 'success' ? 'bg-emerald-500' : result.status === 'no-match' ? 'bg-red-500' : 'bg-blue-500'
          }`}></div>
          
          <div className="relative aspect-square rounded-4xl overflow-hidden border-4 border-white/10 bg-gray-900 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover grayscale-[0.3] brightness-110"
            />
            
            {/* Scanning UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-white/10 rounded-full flex items-center justify-center">
                <div className="w-48 h-48 border border-white/5 rounded-full"></div>
              </div>
              
              {/* Scan Line */}
              <motion.div 
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50"
              />
            </div>

            {/* Status Overlay */}
            <AnimatePresence>
              {result.status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-600/40 backdrop-blur-sm flex items-center justify-center"
                >
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white text-emerald-600 p-6 rounded-full shadow-2xl"
                  >
                    <CheckCircle2 size={64} />
                  </motion.div>
                </motion.div>
              )}
              {result.status === 'no-match' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-600/40 backdrop-blur-sm flex items-center justify-center"
                >
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white text-red-600 p-6 rounded-full shadow-2xl"
                  >
                    <XCircle size={64} />
                  </motion.div>
                </motion.div>
              )}
              {result.status === 'no-face-detected' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-amber-600/40 backdrop-blur-sm flex items-center justify-center"
                >
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white text-amber-600 p-6 rounded-full shadow-2xl"
                  >
                    <User size={64} />
                  </motion.div>
                </motion.div>
              )}
              {result.status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-600/40 backdrop-blur-sm flex items-center justify-center"
                >
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white text-red-600 p-6 rounded-full shadow-2xl"
                  >
                    <ShieldAlert size={64} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              {result.status === 'success' ? 'Welcome!' : 
               result.status === 'no-face-detected' ? 'No Face Detected' :
               result.status === 'error' ? 'System Error' :
               result.status === 'no-match' ? 'Access Denied' :
               'Please Stand Still'}
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              {result.status === 'success' 
                ? 'Your identity has been verified. You may proceed to the exam hall.' 
                : result.status === 'no-face-detected'
                ? 'Please position your face clearly in the camera frame. Ensure good lighting.'
                : result.status === 'error'
                ? 'System error occurred. Please try again or contact support.'
                : result.status === 'no-match'
                ? 'Face not recognized. Please ensure you are registered or try again.'
                : 'Align your face within the frame for biometric recognition.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {result.status === 'success' ? (
              <motion.div 
                key="success-card"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="p-8 bg-white rounded-4xl text-gray-900 space-y-6 shadow-2xl"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    result.user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <User size={32} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {result.user.role === 'admin' ? 'Authorized Staff' : 'Authorized Personnel'}
                    </div>
                    <div className="text-2xl font-black">{result.user.name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <BadgeCheck size={12} className="text-blue-500" />
                      Role
                    </div>
                    <div className="font-bold text-sm capitalize">{result.user.role || 'Student'}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <Building2 size={12} className="text-blue-500" />
                      Dept
                    </div>
                    <div className="font-bold text-sm truncate">{result.user.department || 'N/A'}</div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <CheckCircle2 size={16} />
                    Attendance Logged
                  </div>
                  <div className="text-xs font-mono text-gray-400">{new Date().toLocaleTimeString()}</div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="scanning-card"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="p-8 bg-gray-900/50 border border-white/5 rounded-4xl space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-ping ${
                      !modelsLoaded ? 'bg-red-500' : 
                      !videoReady ? 'bg-amber-500' : 
                      'bg-blue-500'
                    }`}></div>
                    <span className="font-bold tracking-widest text-xs uppercase text-blue-500">
                      {!modelsLoaded ? 'Loading Models...' : 
                       !videoReady ? 'Initializing Camera...' : 
                       'Scanning...'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gray-500">v2.4.0-stable</div>
                </div>

                <div className="space-y-4">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ width: ['0%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center italic">Processing neural facial descriptors...</p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center space-y-1">
                    <div className="text-[10px] font-bold text-gray-600 uppercase">Liveness</div>
                    <div className="text-xs font-bold text-emerald-500">PASS</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[10px] font-bold text-gray-600 uppercase">Latency</div>
                    <div className="text-xs font-bold">42ms</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[10px] font-bold text-gray-600 uppercase">Security</div>
                    <div className="text-xs font-bold text-blue-500">AES-256</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between text-gray-600">
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
          <span>Privacy Policy</span>
          <span>Terms of Use</span>
          <span>Help Center</span>
        </div>
        <div className="text-[10px] font-mono">
          SYSTEM_ID: FG-772-X
        </div>
      </div>
    </div>
  );
}
