// Shared attendance tracking utility
// Prevents duplicate attendance logging across the application

const ATTENDANCE_STORAGE_KEY = 'mu_attendance_logs';
const DEFAULT_TIME_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

interface AttendanceRecord {
  studentId: string;
  timestamp: number;
  source: 'entry_station' | 'security_monitor';
}

export class AttendanceTracker {
  private static getStoredRecords(): AttendanceRecord[] {
    try {
      const stored = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load attendance records:', error);
      return [];
    }
  }

  private static saveRecords(records: AttendanceRecord[]): void {
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save attendance records:', error);
    }
  }

  private static cleanupOldRecords(): void {
    const records = this.getStoredRecords();
    const now = Date.now();
    const validRecords = records.filter(record =>
      now - record.timestamp < DEFAULT_TIME_WINDOW
    );
    this.saveRecords(validRecords);
  }

  /**
   * Check if a student has been logged recently within the time window
   * @param studentId - The student's ID
   * @param timeWindowMs - Time window in milliseconds (default: 1 hour)
   * @returns true if the student was logged recently
   */
  static hasRecentAttendance(studentId: string, timeWindowMs: number = DEFAULT_TIME_WINDOW): boolean {
    this.cleanupOldRecords();
    const records = this.getStoredRecords();
    const now = Date.now();

    return records.some(record =>
      record.studentId === studentId &&
      now - record.timestamp < timeWindowMs
    );
  }

  /**
   * Log attendance for a student
   * @param studentId - The student's ID
   * @param source - Where the attendance was logged from
   * @returns true if attendance was logged, false if it was already recent
   */
  static logAttendance(studentId: string, source: 'entry_station' | 'security_monitor'): boolean {
    if (this.hasRecentAttendance(studentId)) {
      console.log(`Student ${studentId} already logged attendance recently from ${source}, skipping duplicate log`);
      return false;
    }

    const records = this.getStoredRecords();
    const newRecord: AttendanceRecord = {
      studentId,
      timestamp: Date.now(),
      source
    };

    records.push(newRecord);
    this.saveRecords(records);

    console.log(`Logged attendance for student ${studentId} from ${source}`);
    return true;
  }

  /**
   * Get all recent attendance records
   * @param timeWindowMs - Time window in milliseconds (default: 1 hour)
   */
  static getRecentRecords(timeWindowMs: number = DEFAULT_TIME_WINDOW): AttendanceRecord[] {
    this.cleanupOldRecords();
    const records = this.getStoredRecords();
    const now = Date.now();

    return records.filter(record =>
      now - record.timestamp < timeWindowMs
    );
  }

  /**
   * Clear all attendance records (useful for testing or admin functions)
   */
  static clearAllRecords(): void {
    localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
  }
}