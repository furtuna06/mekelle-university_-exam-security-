import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, XCircle, Clock, Info, Trash2, Calendar, ShieldAlert } from 'lucide-react';

import { getNotifications, addNotification as apiAddNotification, deleteNotification } from '../services/apiService';

export default function NotificationCenter({ studentId }: { studentId?: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications(studentId);
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          console.error("Notifications data is not an array:", data);
          setNotifications([]);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        setNotifications([]);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [studentId]);

  const clearNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
      case 'error': return <XCircle className="text-red-500" size={18} />;
      case 'warning': return <ShieldAlert className="text-amber-500" size={18} />;
      case 'info': return <Info className="text-blue-500" size={18} />;
      case 'exam': return <Calendar className="text-purple-500" size={18} />;
      default: return <Bell className="text-gray-500" size={18} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Bell className="text-blue-600" />
          Notifications
        </h3>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {notifications.length} New
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200"
            >
              <Bell size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No new notifications at this time.</p>
            </motion.div>
          ) : (
            notifications.map((notif) => (
              <motion.div 
                key={notif.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-2xl border flex gap-4 group transition-all ${
                  notif.read ? 'bg-white border-gray-100' : 'bg-blue-50/30 border-blue-100 shadow-sm'
                }`}
              >
                <div className="mt-1">{getIcon(notif.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-gray-900">{notif.title}</p>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                </div>
                <button 
                  onClick={() => clearNotification(notif.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all self-start"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function addNotification(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' | 'exam', targetId: string = 'all') {
  apiAddNotification({ title, message, type, targetId });
}
