CREATE DATABASE IF NOT EXISTS faceguard;
USE faceguard;

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    department VARCHAR(100),
    role ENUM('student', 'admin') DEFAULT 'student',
    descriptors LONGTEXT NOT NULL,
    images LONGTEXT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_registrations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    department VARCHAR(100),
    role ENUM('student', 'admin') DEFAULT 'student',
    descriptors LONGTEXT NOT NULL,
    images LONGTEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    name VARCHAR(100),
    role VARCHAR(50),
    department VARCHAR(100),
    confidence FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL
);

-- Add soft delete columns to existing attendance_logs table if they don't exist
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS staff_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    name VARCHAR(100),
    role VARCHAR(50),
    department VARCHAR(100),
    confidence FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    target_id VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recognition_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50), -- NULL if no match
    confidence FLOAT,
    status ENUM('match', 'no-match') NOT NULL,
    distance FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- የክፍሎች ዝርዝር
CREATE TABLE IF NOT EXISTS exam_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(50) NOT NULL, -- ለምሳሌ: Room 101
    capacity INT DEFAULT 24,       -- የክፍሉ አቅም
    current_students INT DEFAULT 0, -- አሁን ያሉ ተማሪዎች ብዛት
    current_staff INT DEFAULT 0     -- አሁን ያሉ መምህራን ብዛት
);

-- ተማሪዎችን ከክፍል ጋር የሚያገናኝ
ALTER TABLE students ADD COLUMN IF NOT EXISTS room_id INT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';

-- መምህራንን ከክፍል ጋር የሚያገናኝ
CREATE TABLE IF NOT EXISTS staff_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL,
    room_id INT,
    FOREIGN KEY (room_id) REFERENCES exam_rooms(id)
);