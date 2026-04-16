import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, ArrowRight, UserCircle } from 'lucide-react';
import Logo from './Logo';
import { signInWithGoogle } from '../firebase';
import { checkUserRole } from '../services/apiService';

interface LoginProps {
  onLogin: (role: 'admin' | 'student') => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async (role: 'admin' | 'student') => {
    setError('');
    setIsLoading(true);
    try {
      const user = await signInWithGoogle(role);
      if (!user) {
  throw new Error('No user returned from Google sign in');
}
      
      // 1. Check if it's the super admin
      if (user.email === 'hagezomfurtuna@gmail.com') {
        onLogin(role);
        return;
      }

      // 2. Check database for existing role
      const dbUser = await checkUserRole(user.email || '');
      
      if (dbUser.exists && dbUser.role) {
        // If they are in the DB, they MUST use their assigned role
        if (role !== dbUser.role) {
          setError(`Unauthorized: Your account is registered as a ${dbUser.role}. Please use the correct portal.`);
          setIsLoading(false);
          return;
        }
        onLogin(dbUser.role);
      } else {
        // If not in DB, they are likely a new student or staff trying to register
        // We allow them to enter the portal they selected to initiate registration
        if (role === 'admin') {
          setError('Unauthorized: New staff accounts must be approved by the system administrator before accessing the portal.');
          setIsLoading(false);
          return;
        }
        onLogin('student');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('Login popup was blocked by your browser. Please allow popups for this site or try opening the app in a new tab.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('The login request was cancelled. This can happen if you close the window or click login multiple times. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please check your internet connection or disable any ad-blockers/VPNs that might be blocking Google services.');
      } else if (err.code === 'auth/internal-error') {
        setError('Internal Firebase Error: This often happens if third-party cookies are blocked in your browser. Please try enabling them or open the app in a new tab.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center mb-6">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-gray-200 border border-gray-100 p-3 overflow-hidden">
              <Logo alt="Mekelle University Logo" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Mekelle University</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Biometric Authentication</p>
          </div>
          <p className="text-gray-500 text-sm">Secure Exam Access Control System</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100">
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
                {error}
              </div>
            )}
            
            <button 
              onClick={() => handleGoogleLogin('admin')}
              disabled={isLoading}
              className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-white/20 group-hover:text-white">
                  <Lock size={20} />
                </div>
                <div className="text-left">
                  <div className="font-bold">Admin Portal</div>
                  <div className="text-xs opacity-60">System management & analytics</div>
                </div>
              </div>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => handleGoogleLogin('student')}
              disabled={isLoading}
              className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-white/20 group-hover:text-white">
                  <UserCircle size={20} />
                </div>
                <div className="text-left">
                  <div className="font-bold">Student Portal</div>
                  <div className="text-xs opacity-60">View schedule & registration</div>
                </div>
              </div>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Mekelle University ICT Directorate &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
