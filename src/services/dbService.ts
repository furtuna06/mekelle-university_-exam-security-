import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Students
export const getStudents = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'students'));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }
};

export const saveStudent = async (student: any) => {
  try {
    await setDoc(doc(db, 'students', student.id), {
      ...student,
      registeredAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${student.id}`);
  }
};

// Attendance
export const logAttendance = async (log: any) => {
  try {
    await addDoc(collection(db, 'attendance_logs'), {
      ...log,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'attendance_logs');
  }
};

export const subscribeToAttendance = (callback: (logs: any[]) => void) => {
  const q = query(collection(db, 'attendance_logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'attendance_logs');
  });
};

// Audit Logs
export const logAudit = async (action: string, details: string) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'audit_logs');
  }
};

// Notifications
export const addNotification = async (title: string, message: string, type: string, targetId: string = 'all') => {
  try {
    await addDoc(collection(db, 'notifications'), {
      title,
      message,
      type,
      targetId,
      timestamp: serverTimestamp(),
      read: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
  }
};

// Exam Schedule
export const saveSchedule = async (schedule: any) => {
  try {
    await setDoc(doc(db, 'config', 'exam_schedule'), {
      ...schedule,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'config/exam_schedule');
  }
};

export const getSchedule = async () => {
  try {
    const docRef = doc(db, 'config', 'exam_schedule');
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'config/exam_schedule');
  }
};
