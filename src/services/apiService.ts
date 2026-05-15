const apiBase = '/api';

async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const body = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new Error(body?.message || response.statusText || 'API request failed');
  }
  return body;
}

type OfflineLogEntry = {
  endpoint: string;
  data: any;
};

type OfflineSyncLog = OfflineLogEntry & {
  type: 'attendance' | 'recognition' | 'audit';
};

function normalizeObject<T extends Record<string, any>>(obj: T): T {
  if (obj == null || typeof obj !== 'object') return obj;
  const normalized = { ...obj } as any;
  if ('target_id' in normalized) {
    normalized.targetId = normalized.target_id;
    delete normalized.target_id;
  }
  if ('registered_at' in normalized) {
    normalized.registeredAt = normalized.registered_at;
    delete normalized.registered_at;
  }
  if ('submitted_at' in normalized) {
    normalized.submittedAt = normalized.submitted_at;
    delete normalized.submitted_at;
  }
  if ('is_read' in normalized) {
    normalized.read = Boolean(normalized.is_read);
    delete normalized.is_read;
  }
  if ('student_id' in normalized) {
    normalized.studentId = normalized.student_id;
    delete normalized.student_id;
  }
  return normalized;
}

export const getStudents = async () => {
  try {
    // 1. መጀመሪያ ከዳታቤዝ ለማምጣት ይሞክራል
    const result = await fetch(`${apiBase}/students`);
    const data = await handleResponse(result);
    
    // 2. መረጃው ከመጣ በኋላ ለ Offline ስራ እንዲረዳ በኮምፒውተሩ ውስጥ (Cache) ያስቀምጠዋል
    localStorage.setItem('cached_students', JSON.stringify(data));
    
    return data;
  } catch (error) {
    // 3. ኢንተርኔት ከሌለ እዚህ ጋር በኮምፒውተሩ ውስጥ ያለውን መረጃ ይፈልጋል
    console.warn("Failed to fetch students, checking cache...", error);
    const cached = localStorage.getItem('cached_students');
    
    if (cached) {
      // በኮምፒውተሩ ውስጥ መረጃ ካለ እሱን ይመልሳል
      return JSON.parse(cached);
    }
    
    // ምንም መረጃ ከሌለ ስህተቱን ያሳያል
    throw error;
  }
};

export const saveStudent = async (student: any) => {
  const payload = {
    ...student,
    descriptors: Array.isArray(student.descriptors) ? student.descriptors : JSON.parse(student.descriptors || '[]'),
    images: student.images,
    registeredAt: student.registeredAt || new Date().toISOString(),
  };
  const response = await fetch(`${apiBase}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const deleteStudent = async (id: string) => {
  const response = await fetch(`${apiBase}/students/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getPendingRegistrations = async () => {
  const response = await fetch(`${apiBase}/pending-registrations`);
  return handleResponse(response);
};

export const submitPendingRegistration = async (registration: any) => {
  const payload = {
    ...registration,
    descriptors: Array.isArray(registration.descriptors) ? registration.descriptors : JSON.parse(registration.descriptors || '[]'),
    images: registration.images,
    submittedAt: registration.submittedAt || new Date().toISOString(),
  };
  const response = await fetch(`${apiBase}/pending-registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const deletePendingRegistration = async (id: string) => {
  const response = await fetch(`${apiBase}/pending-registrations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const logAttendance = async (log: any) => {
  if (log.role === 'admin') {
    return logStaffEntry(log);
  }
  
  const payload = {
    student_id: log.studentId || log.student_id,
    name: log.name,
    role: log.role,
    department: log.department,
    confidence: log.confidence,
    timestamp: log.timestamp || new Date().toISOString(),
  };

  // ኢንተርኔት ከሌለ እዚህ ጋር ይይዘዋል
  if (!navigator.onLine) {
    const offlineLogs = JSON.parse(localStorage.getItem('offline_attendance') || '[]');
    offlineLogs.push({ endpoint: 'attendance-logs', data: payload });
    localStorage.setItem('offline_attendance', JSON.stringify(offlineLogs));
    return { status: 'offline_saved' };
  }

  const response = await fetch(`${apiBase}/attendance-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};
export const logStaffEntry = async (log: any) => {
  const payload = {
    student_id: log.studentId || log.student_id,
    name: log.name,
    role: log.role,
    department: log.department,
    confidence: log.confidence,
    timestamp: log.timestamp || new Date().toISOString(),
  };

  // ኢንተርኔት ከሌለ እዚህ ጋር ይይዘዋል
  if (!navigator.onLine) {
    const offlineLogs = JSON.parse(localStorage.getItem('offline_attendance') || '[]');
    offlineLogs.push({ endpoint: 'staff-logs', data: payload });
    localStorage.setItem('offline_attendance', JSON.stringify(offlineLogs));
    return { status: 'offline_saved' };
  }

  const response = await fetch(`${apiBase}/staff-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};
export const getStaffLogs = async () => {
  const response = await fetch(`${apiBase}/staff-logs`);
  return handleResponse(response);
};

export const getAttendanceLogs = async () => {
  const response = await fetch(`${apiBase}/attendance-logs`);
  return handleResponse(response);
};

export const deleteAttendanceLog = async (id: number | string) => {
  const response = await fetch(`${apiBase}/attendance-logs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const deleteAllAttendanceLogs = async () => {
  const response = await fetch(`${apiBase}/attendance-logs`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const logAudit = async (action: string, details: string) => {
  const payload = { action, details, timestamp: new Date().toISOString() };

  // ኢንተርኔት ከሌለ እዚህ ጋር ይይዘዋል
  if (!navigator.onLine) {
    const offlineLogs = JSON.parse(localStorage.getItem('offline_audit_logs') || '[]');
    offlineLogs.push({ endpoint: 'audit-logs', data: payload });
    localStorage.setItem('offline_audit_logs', JSON.stringify(offlineLogs));
    return { status: 'offline_saved' };
  }

  const response = await fetch(`${apiBase}/audit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const getAuditLogs = async () => {
  const response = await fetch(`${apiBase}/audit-logs`);
  return handleResponse(response);
};

export const getNotifications = async (targetId?: string) => {
  const url = targetId ? `${apiBase}/notifications?targetId=${encodeURIComponent(targetId)}` : `${apiBase}/notifications`;
  const response = await fetch(url);
  return handleResponse(response);
};

export const addNotification = async (notif: any) => {
  const response = await fetch(`${apiBase}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: notif.title,
      message: notif.message,
      type: notif.type,
      targetId: notif.targetId || 'all',
      read: notif.read || false,
      timestamp: notif.timestamp || new Date().toISOString(),
    }),
  });
  return handleResponse(response);
};

export const deleteNotification = async (id: string) => {
  const response = await fetch(`${apiBase}/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const sendCheatAlert = async (message: string, targetId: string = 'all') => {
  await addNotification({
    title: 'Cheating Alert',
    message,
    type: 'warning',
    targetId,
    read: false,
    timestamp: new Date().toISOString(),
  });
  await logAudit('Cheating Alert', message);
};

export const logRecognitionAttempt = async (attempt: any) => {
  const payload = {
    student_id: attempt.studentId || attempt.student_id,
    confidence: attempt.confidence,
    status: attempt.status,
    distance: attempt.distance,
    timestamp: attempt.timestamp || new Date().toISOString(),
  };

  // ኢንተርኔት ከሌለ እዚህ ጋር ይይዘዋል
  if (!navigator.onLine) {
    const offlineLogs = JSON.parse(localStorage.getItem('offline_recognition_attempts') || '[]');
    offlineLogs.push({ endpoint: 'recognition-attempts', data: payload });
    localStorage.setItem('offline_recognition_attempts', JSON.stringify(offlineLogs));
    return { status: 'offline_saved' };
  }

  const response = await fetch(`${apiBase}/recognition-attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const getRecognitionAttempts = async () => {
  const response = await fetch(`${apiBase}/recognition-attempts`);
  return handleResponse(response);
};

export const checkUserRole = async (email: string) => {
  const response = await fetch(`${apiBase}/user-role?email=${encodeURIComponent(email)}`);
  return handleResponse(response);
};
// ኢንተርኔት ሲመለስ መረጃውን የሚልክ ተግባር
export const syncOfflineLogs = async () => {
  if (!navigator.onLine) return;

  const offlineAttendance: OfflineLogEntry[] = JSON.parse(localStorage.getItem('offline_attendance') || '[]');
  const offlineRecognition: OfflineLogEntry[] = JSON.parse(localStorage.getItem('offline_recognition_attempts') || '[]');
  const offlineAudit: OfflineLogEntry[] = JSON.parse(localStorage.getItem('offline_audit_logs') || '[]');

  const allLogs: OfflineSyncLog[] = [
    ...offlineAttendance.map((log: OfflineLogEntry) => ({ ...log, type: 'attendance' as const })),
    ...offlineRecognition.map((log: OfflineLogEntry) => ({ ...log, type: 'recognition' as const })),
    ...offlineAudit.map((log: OfflineLogEntry) => ({ ...log, type: 'audit' as const })),
  ];

  if (allLogs.length === 0) return;

  console.log(`Syncing ${allLogs.length} offline logs...`);
  
  const remainingLogs = [];
  for (const log of allLogs) {
    try {
      await fetch(`${apiBase}/${log.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log.data)
      });
    } catch (err) {
      remainingLogs.push(log);
    }
  }

  // Separate back into their storages
  const remainingAttendance = remainingLogs.filter(log => log.type === 'attendance').map(log => ({ endpoint: log.endpoint, data: log.data }));
  const remainingRecognition = remainingLogs.filter(log => log.type === 'recognition').map(log => ({ endpoint: log.endpoint, data: log.data }));
  const remainingAudit = remainingLogs.filter(log => log.type === 'audit').map(log => ({ endpoint: log.endpoint, data: log.data }));

  localStorage.setItem('offline_attendance', JSON.stringify(remainingAttendance));
  localStorage.setItem('offline_recognition_attempts', JSON.stringify(remainingRecognition));
  localStorage.setItem('offline_audit_logs', JSON.stringify(remainingAudit));
};

// ኢንተርኔት መመለሱን በራሱ እንዲያውቅ
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineLogs);
}