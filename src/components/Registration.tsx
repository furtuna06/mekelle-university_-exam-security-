import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, CheckCircle2, UserPlus, ArrowRight, ScanFace, RotateCcw, ShieldCheck } from 'lucide-react';
import { getFaceDescriptor } from '../lib/faceApi';
import Modal from './ui/Modal';
import { saveStudent, logAudit } from '../services/apiService';

interface ScanStep {
  id: string;
  label: string;
  instruction: string;
}

const SCAN_STEPS: ScanStep[] = [
  { id: 'front', label: 'Front View', instruction: 'Look directly at the camera' },
  { id: 'left', label: 'Left Profile', instruction: 'Turn your head slightly to the left' },
  { id: 'right', label: 'Right Profile', instruction: 'Turn your head slightly to the right' },
  { id: 'up', label: 'Upper View', instruction: 'Tilt your head slightly upwards' },
];

export default function Registration({ onComplete }: { onComplete: (student: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [scans, setScans] = useState<Record<string, Float32Array>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string, message: string } | null>(null);

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
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;
    
    setIsCapturing(true);

    // Capture Image
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        const stepId = SCAN_STEPS[currentStep].id;
        setImages(prev => ({ ...prev, [stepId]: imageData }));
      }
    }

    const descriptor = await getFaceDescriptor(videoRef.current);
    
    if (descriptor) {
      const stepId = SCAN_STEPS[currentStep].id;
      setScans(prev => ({ ...prev, [stepId]: descriptor }));
      
      if (currentStep < SCAN_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsReady(true);
      }
    } else {
      setErrorModal({
        title: "Face Not Detected",
        message: "We couldn't clearly see your face. Please ensure you are in a well-lit area and looking directly at the camera."
      });
    }
    setIsCapturing(false);
  };

  const handleSave = async () => {
    if (!studentName || !studentId) {
      setErrorModal({
        title: "Missing Information",
        message: "Please enter both the student's full name and ID number before finalizing registration."
      });
      return;
    }

    setIsSaving(true);
    try {
      const newStudent = {
        id: studentId,
        name: studentName,
        email: email,
        department: department,
        role: role,
        descriptors: Object.values(scans).map(d => Array.from(d as Float32Array)),
        images: images,
      };

      await saveStudent(newStudent);
      await logAudit('Register User', `Admin registered ${role}: ${studentName} (${studentId}) in ${department}`);
      
      onComplete(newStudent);
      reset();
    } catch (err) {
      setErrorModal({
        title: "Save Failed",
        message: "There was an error saving the biometric data to the cloud. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setScans({});
    setCurrentStep(0);
    setIsReady(false);
    setStudentName('');
    setStudentId('');
    setEmail('');
    setDepartment('');
    setRole('student');
  };

  return (
    <div className="max-w-5xl mx-auto p-6 grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="text-blue-600" />
            Registration
          </h2>
          <p className="text-gray-500 text-sm">
            Collect real facial data from 4 different angles to build a robust biometric profile.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
              <input 
                type="text" 
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">ID Number</label>
              <input 
                type="text" 
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="e.g. CS-2024-001"
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              {role === 'student' ? 'Department' : 'Assigned Department (Invigilating)'}
            </label>
            <input 
              type="text" 
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder={role === 'student' ? "e.g. Computer Science" : "e.g. Engineering"}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Registration Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setRole('student')}
                className={`py-2 px-4 rounded-xl border font-bold text-sm transition-all ${
                  role === 'student' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Student
              </button>
              <button 
                onClick={() => setRole('admin')}
                className={`py-2 px-4 rounded-xl border font-bold text-sm transition-all ${
                  role === 'admin' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Staff / Teacher
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Scanning Progress</span>
              <span className="text-xs font-mono text-blue-600">{currentStep + 1} / {SCAN_STEPS.length}</span>
            </div>
            <div className="flex gap-2">
              {SCAN_STEPS.map((step, idx) => (
                <div 
                  key={step.id}
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    idx < currentStep ? 'bg-emerald-500' : 
                    idx === currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {SCAN_STEPS.map((step, idx) => (
              <div 
                key={step.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  idx === currentStep ? 'border-blue-500 bg-blue-50/50' : 
                  idx < currentStep ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    idx <= currentStep ? 'bg-white shadow-sm' : 'bg-gray-100'
                  }`}>
                    {idx < currentStep ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{step.label}</div>
                    {idx === currentStep && <div className="text-xs text-blue-600 animate-pulse">{step.instruction}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isReady ? (
            <div className="flex gap-3 pt-4">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheckIcon size={20} />
                    Finalize Registration
                  </>
                )}
              </button>
              <button 
                onClick={reset}
                className="px-4 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleCapture}
              disabled={isCapturing}
              className="w-full mt-4 bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
            >
              {isCapturing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Camera size={20} />
                  Capture {SCAN_STEPS[currentStep].label}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-black rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl border border-gray-800">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-80"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-dashed border-white/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-500/50 rounded-full"></div>
            
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-mono text-white uppercase tracking-widest">Live Feed</span>
            </div>
          </div>

          <AnimatePresence>
            {isCapturing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white flex items-center justify-center z-10"
              >
                <div className="text-center space-y-2">
                  <ScanFace size={48} className="mx-auto text-blue-600 animate-bounce" />
                  <p className="text-sm font-bold text-gray-900">Processing Biometrics...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal 
        isOpen={!!errorModal}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title || ''}
        message={errorModal?.message || ''}
        type="warning"
        confirmLabel="Try Again"
      />
    </div>
  );
}

function ShieldCheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
