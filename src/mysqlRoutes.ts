import { Router } from "express";
import { getDb } from "./mysql.js";

const router = Router();

function parseJson(value: any) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseDate(value: any) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeRow(row: any) {
  const normalized: any = { ...row };

  if ('descriptors' in normalized) normalized.descriptors = parseJson(normalized.descriptors);
  if ('images' in normalized) normalized.images = parseJson(normalized.images);
  if ('registered_at' in normalized) {
    normalized.registeredAt = parseDate(normalized.registered_at);
    delete normalized.registered_at;
  }
  if ('submitted_at' in normalized) {
    normalized.submittedAt = parseDate(normalized.submitted_at);
    delete normalized.submitted_at;
  }
  if ('target_id' in normalized) {
    normalized.targetId = normalized.target_id;
    delete normalized.target_id;
  }
  if ('timestamp' in normalized) normalized.timestamp = parseDate(normalized.timestamp);

  return normalized;
}

function cleanParams(params: any[]): any[] {
  return params.map(p => p === undefined ? null : p);
}

async function executeQuery(sql: string, params: any[] = []) {
  const [rows] = await getDb().execute(sql, cleanParams(params)) as any;
  return Array.isArray(rows) ? rows : [];
}

async function queryOne(sql: string, params: any[] = []) {
  const rows = await executeQuery(sql, params) as any[];
  return rows[0] ?? null;
}

router.get('/students', async (req, res) => {
  const rows = await executeQuery('SELECT * FROM students ORDER BY name');
  res.json(rows.map(normalizeRow));
});

router.post('/students', async (req, res) => {
  try {
    const { id, name, email, department, role, descriptors, images, registeredAt } = req.body;
    await getDb().execute(
      `INSERT INTO students (id, name, email, department, role, descriptors, images, registered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         email = VALUES(email),
         department = VALUES(department),
         role = VALUES(role),
         descriptors = VALUES(descriptors),
         images = VALUES(images)`,
      cleanParams([
        id,
        name,
        email,
        department,
        role,
        descriptors ? JSON.stringify(descriptors) : JSON.stringify([]),
        images ? JSON.stringify(images) : JSON.stringify([]),
        registeredAt ? new Date(registeredAt) : new Date()
      ])
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving student:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Database error' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await getDb().execute('DELETE FROM students WHERE id = ?', cleanParams([req.params.id]));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Database error' });
  }
});

router.get('/pending-registrations', async (req, res) => {
  const rows = await executeQuery('SELECT * FROM pending_registrations ORDER BY name');
  res.json(rows.map(normalizeRow));
});

router.post('/pending-registrations', async (req, res) => {
  try {
    const { id, name, email, department, role, descriptors, images, submittedAt } = req.body;
    await getDb().execute(
      `INSERT INTO pending_registrations (id, name, email, department, role, descriptors, images, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         email = VALUES(email),
         department = VALUES(department),
         role = VALUES(role),
         descriptors = VALUES(descriptors),
         images = VALUES(images),
         submitted_at = VALUES(submitted_at)`,
      cleanParams([
        id,
        name,
        email,
        department,
        role,
        descriptors ? JSON.stringify(descriptors) : JSON.stringify([]),
        images ? JSON.stringify(images) : JSON.stringify([]),
        submittedAt ? new Date(submittedAt) : new Date()
      ])
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving pending registration:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Database error' });
  }
});

router.delete('/pending-registrations/:id', async (req, res) => {
  try {
    await getDb().execute('DELETE FROM pending_registrations WHERE id = ?', cleanParams([req.params.id]));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pending registration:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Database error' });
  }
});

router.get('/attendance-logs', async (req, res) => {
  const rows = await executeQuery('SELECT * FROM attendance_logs WHERE deleted = FALSE ORDER BY timestamp DESC');
  res.json(rows.map(normalizeRow));
});

router.post('/attendance-logs', async (req, res) => {
  const { student_id, name, role, department, confidence, timestamp } = req.body;
  await getDb().execute(
    `INSERT INTO attendance_logs (student_id, name, role, department, confidence, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    cleanParams([student_id, name, role, department, confidence, timestamp ? new Date(timestamp) : new Date()])
  );
  res.json({ success: true });
});

router.delete('/attendance-logs', async (req, res) => {
  try {
    await getDb().execute('UPDATE attendance_logs SET deleted = TRUE, deleted_at = ? WHERE deleted = FALSE', cleanParams([new Date()]));
    await getDb().execute(
      `INSERT INTO audit_logs (action, details, timestamp)
       VALUES (?, ?, ?)`,
      cleanParams([
        'Attendance Logs Marked Deleted',
        'All attendance records were soft deleted by an administrator.',
        new Date()
      ])
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error soft deleting all attendance logs:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Database error' });
  }
});

router.delete('/attendance-logs/:id', async (req, res) => {
  const attendanceId = req.params.id;
  try {
    await getDb().execute('UPDATE attendance_logs SET deleted = TRUE, deleted_at = ? WHERE id = ?', cleanParams([new Date(), attendanceId]));
    await getDb().execute(
      `INSERT INTO audit_logs (action, details, timestamp)
       VALUES (?, ?, ?)`,
      cleanParams([
        'Attendance Entry Soft Deleted',
        `Attendance log ${attendanceId} was soft deleted by an administrator.`,
        new Date()
      ])
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error soft deleting attendance log:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Database error' });
  }
});

router.get('/staff-logs', async (req, res) => {
  const rows = await executeQuery('SELECT * FROM staff_logs ORDER BY timestamp DESC');
  res.json(rows.map(normalizeRow));
});

router.post('/staff-logs', async (req, res) => {
  const { student_id, name, role, department, confidence, timestamp } = req.body;
  await getDb().execute(
    `INSERT INTO staff_logs (student_id, name, role, department, confidence, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    cleanParams([student_id, name, role, department, confidence, timestamp ? new Date(timestamp) : new Date()])
  );
  res.json({ success: true });
});

router.get('/audit-logs', async (req, res) => {
  const rows = await executeQuery('SELECT * FROM audit_logs ORDER BY timestamp DESC');
  res.json(rows.map(normalizeRow));
});

router.post('/audit-logs', async (req, res) => {
  const { action, details, timestamp } = req.body;
  await getDb().execute(
    `INSERT INTO audit_logs (action, details, timestamp)
     VALUES (?, ?, ?)`,
    cleanParams([action, details, timestamp ? new Date(timestamp) : new Date()])
  );
  res.json({ success: true });
});

router.get('/notifications', async (req, res) => {
  const targetId = req.query.targetId as string | undefined;
  if (targetId) {
    const rows = await executeQuery(
      'SELECT * FROM notifications WHERE target_id IN (?, ?) ORDER BY timestamp DESC',
      [targetId, 'all']
    );
    res.json(rows.map(normalizeRow));
    return;
  }
  const rows = await executeQuery('SELECT * FROM notifications ORDER BY timestamp DESC');
  res.json(rows.map(normalizeRow));
});

router.post('/notifications', async (req, res) => {
  const { title, message, type, targetId, read, timestamp } = req.body;
  await getDb().execute(
    `INSERT INTO notifications (title, message, type, target_id, is_read, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    cleanParams([title, message, type, targetId || 'all', read ? 1 : 0, timestamp ? new Date(timestamp) : new Date()])
  );
  res.json({ success: true });
});

router.delete('/notifications/:id', async (req, res) => {
  await getDb().execute('DELETE FROM notifications WHERE id = ?', cleanParams([req.params.id]));
  res.json({ success: true });
});

router.get('/recognition-attempts', async (req, res) => {
  const rows = await executeQuery('SELECT * FROM recognition_attempts ORDER BY timestamp DESC LIMIT 1000');
  res.json(rows.map(normalizeRow));
});

router.post('/recognition-attempts', async (req, res) => {
  const { student_id, confidence, status, distance, timestamp } = req.body;
  await getDb().execute(
    `INSERT INTO recognition_attempts (student_id, confidence, status, distance, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    cleanParams([student_id, confidence, status, distance, timestamp ? new Date(timestamp) : new Date()])
  );
  res.json({ success: true });
});

router.get('/user-role', async (req, res) => {
  const email = req.query.email as string | undefined;
  if (!email) {
    res.status(400).json({ message: 'Missing email address' });
    return;
  }
  const row = await queryOne('SELECT role FROM students WHERE email = ? LIMIT 1', [email]);
  if (row) {
    res.json({ exists: true, role: row.role });
    return;
  }
  res.json({ exists: false });
});

export default router;
