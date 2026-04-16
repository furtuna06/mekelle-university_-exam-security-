import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, CheckCircle2, UserPlus, Smartphone, ScanFace, Send, RotateCcw, ShieldCheck } from 'lucide-react';
import { getFaceDescriptor } from '../lib/faceApi';
import Modal from './ui/Modal';
import { logAudit, submitPendingRegistration } from '../services/apiService';
import { auth } from '../firebase';

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

export default function SelfRegistration() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [scans, setScans] = useState<Record<string, Float32Array>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [isSent, setIsSent] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSendToAdmin = async () => {
    if (!studentName || !studentId) {
      setErrorModal({
        title: "Missing Information",
        message: "Please enter your full name and student ID number before submitting."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const pendingRegistration = {
        id: studentId,
        name: studentName,
        email: auth.currentUser?.email || '',
        department: department,
        role: role,
        descriptors: Object.values(scans).map((d: Float32Array) => Array.from(d)),
        images: images,
        status: 'pending'
      };

      await submitPendingRegistration(pendingRegistration);
      await logAudit('Self Registration', `User submitted registration: ${studentName} (${studentId})`);
      
      setIsSent(true);
    } catch (err) {
      setErrorModal({
        title: "Submission Failed",
        message: "There was an error sending your registration to the admin. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-3xl border border-gray-100 shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <Send size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sent to Admin</h2>
          <p className="text-gray-500 text-sm">
            Your biometric data has been submitted. Please wait for the admin to approve your registration.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <Smartphone size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Self Registration</h2>
          <p className="text-gray-500 text-sm">Register your biometrics from your dorm.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
              <input 
                type="text" 
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Student ID / Staff ID</label>
              <input 
                type="text" 
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="Enter your ID number"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {role === 'student' ? 'Department' : 'Assigned Department (Invigilating)'}
            </label>
            <input 
              type="text" 
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder={role === 'student' ? "e.g. Computer Science" : "e.g. Engineering"}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Role</label>
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
            <div className="flex justify-between items-center text-sm font-bold">
              <span>Progress</span>
              <span className="text-blue-600">{currentStep + 1} / {SCAN_STEPS.length}</span>
            </div>
            <div className="flex gap-2">
              {SCAN_STEPS.map((step, idx) => (
                <div 
                  key={step.id}
                  className={`h-2 flex-1 rounded-full ${
                    idx < currentStep ? 'bg-emerald-500' : 
                    idx === currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{SCAN_STEPS[currentStep].label}</p>
            <p className="text-sm font-medium text-gray-700">{SCAN_STEPS[currentStep].instruction}</p>
          </div>

          {isReady ? (
            <button 
              onClick={handleSendToAdmin}
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={20} />
                  Submit to Admin
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={handleCapture}
              disabled={isCapturing}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              {isCapturing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={20} />}
              Capture Photo
            </button>
          )}
        </div>

        <div className="relative bg-black rounded-3xl overflow-hidden aspect-square shadow-2xl">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-80"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 border-2 border-white/10 rounded-3xl pointer-events-none"></div>
          <AnimatePresence>
            {isCapturing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <ScanFace size={64} className="text-white animate-pulse" />
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
