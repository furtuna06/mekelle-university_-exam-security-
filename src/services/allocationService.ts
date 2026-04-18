// የፋይሉን መጨረሻ (እንደ .js ወይም .ts) አትጻፍ! እንዲህ ብቻ ተጠቀመው፡
import pool from '../db';

// --- ለተማሪዎች ምደባ (24 ተማሪ ሲሞላ ወደ ሌላ ክፍል) ---
export const allocateRoomForStudent = async (studentId: string | number) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. ቦታ ያለው ክፍል ፈልግ (ከ 24 በታች የሆነ)
    const [rooms]: any = await connection.execute(
      'SELECT id FROM exam_rooms WHERE current_students < capacity ORDER BY id ASC LIMIT 1'
    );

    let roomId;
    if (rooms.length > 0) {
      roomId = rooms[0].id;
    } else {
      // ሁሉም ክፍሎች ከሞሉ አዲስ ክፍል ፍጠር
      const [newRoom]: any = await connection.execute(
        'INSERT INTO exam_rooms (room_name, capacity) VALUES (?, 24)',
        [`Room ${Math.floor(Math.random() * 1000)}`] 
      );
      roomId = newRoom.insertId;
    }

    // 2. ተማሪውን መመደብ
    await connection.execute(
      'UPDATE students SET room_id = ?, status = "approved" WHERE id = ?',
      [roomId, studentId]
    );

    // 3. የክፍሉን የተማሪ ብዛት መጨመር
    await connection.execute(
      'UPDATE exam_rooms SET current_students = current_students + 1 WHERE id = ?',
      [roomId]
    );

    await connection.commit();
    return { success: true, roomId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// --- ለመምህራን ምደባ (በአንድ ክፍል 2 መምህር) ---
export const allocateRoomForStaff = async (staffId: string | number) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. መምህር የጎደለው ክፍል ፈልግ (ከ 2 በታች የሆነ)
    const [rooms]: any = await connection.execute(
      'SELECT id FROM exam_rooms WHERE current_staff < 2 ORDER BY id ASC LIMIT 1'
    );

    if (rooms.length === 0) {
        throw new Error("ምንም ክፍት ክፍል አልተገኘም! መጀመሪያ ክፍሎችን ፍጠር።");
    }

    const roomId = rooms[0].id;

    // 2. መምህሩን መመደብ
    await connection.execute(
      'UPDATE staff SET room_id = ? WHERE id = ?',
      [roomId, staffId]
    );

    // 3. የክፍሉን የመምህር ብዛት መጨመር
    await connection.execute(
      'UPDATE exam_rooms SET current_staff = current_staff + 1 WHERE id = ?',
      [roomId]
    );

    await connection.commit();
    return { success: true, roomId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};