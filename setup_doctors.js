const { pool, query } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function setupDoctors() {
  console.log('🩺 [DOCTORS SETUP] Initializing exact clinic doctor roster and schedules...');
  
  // 1. Ensure Physiotherapy department exists
  await query(`
    INSERT INTO departments (id, name, description, head_of_dept, icon)
    VALUES (11, 'Physiotherapy & Rehabilitation', 'Physical therapy, rehabilitation, posture and musculoskeletal pain management', 'Dr. Zaheer Abbas', 'Activity')
    ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
  `);

  // 2. Clear all schedules and doctors
  await query('SET FOREIGN_KEY_CHECKS = 0');
  await query('TRUNCATE TABLE doctor_schedules');
  await query('TRUNCATE TABLE doctors');
  await query('SET FOREIGN_KEY_CHECKS = 1');

  // 3. Insert the 7 exact doctors
  await query(`
    INSERT INTO doctors (id, department_id, name, specialty, qualification, experience_years, consultation_fee, follow_up_fee, room_no, phone, email, available_days, start_time, end_time, avg_consultation_time, max_daily_patients, status)
    VALUES
    (1, 1, 'Dr. Hudebia', 'General Physician', 'MBBS-RMP', 8, 1500.00, 1000.00, 'Cabin 1', '0300-1112233', 'hudebia@dreamgardenclinic.com', 'Mon,Tue,Wed,Thu,Fri,Sat', '05:00 PM', '09:00 PM', 15, 30, 'active'),
    (2, 3, 'Dr. Tahir Javaid', 'Child Specialist', 'MBBS-DCH', 12, 1800.00, 1000.00, 'Cabin 2', '0300-2223344', 'tahir.javaid@dreamgardenclinic.com', 'Tue,Thu,Sat', '11:00 AM', '01:00 PM', 15, 25, 'active'),
    (3, 1, 'Dr. Imran Razak', 'Consultant Physician', 'MBBS-FCPS', 14, 2000.00, 1200.00, 'Cabin 3', '0300-3334455', 'imran.razak@dreamgardenclinic.com', 'Sat', '09:00 PM', '10:00 PM', 15, 15, 'active'),
    (4, 1, 'Dr. Atta Ullah Faheem', 'Family Physician and Surgeon', 'MBBS-FRSH', 16, 1800.00, 1000.00, 'Cabin 4', '0300-4445566', 'attaullah@dreamgardenclinic.com', 'Sun,Mon,Wed,Fri', '12:00 PM', '09:00 PM', 15, 30, 'active'),
    (5, 3, 'Dr. Mehk Javaid', 'Child Specialist', 'MBBS-FCPS', 9, 1800.00, 1000.00, 'Cabin 2', '0300-5556677', 'mehk.javaid@dreamgardenclinic.com', 'Sun', '01:00 PM', '02:00 PM', 15, 20, 'active'),
    (6, 11, 'Dr. Zaheer Abbas', 'Physiotherapist', 'Physiotherapist', 7, 1500.00, 1000.00, 'Physio Care 1', '0300-6667788', 'zaheer.abbas@dreamgardenclinic.com', 'Mon,Tue,Wed,Thu,Fri,Sat', '05:00 PM', '08:00 PM', 20, 20, 'active'),
    (7, 11, 'Dr. Moeeza Arshad', 'Physiotherapist', 'Physiotherapist', 6, 1500.00, 1000.00, 'Physio Care 2', '0300-7778899', 'moeeza.arshad@dreamgardenclinic.com', 'Mon,Tue,Wed,Thu,Fri,Sat', '02:00 PM', '05:00 PM', 20, 20, 'active')
  `);

  // 4. Insert doctor schedules
  // 1) Dr. Hudebia: Mon to Sat 05:00 PM - 09:00 PM (17:00:00 to 21:00:00)
  // 2) Dr. Tahir Javaid: Tue, Thu, Sat 11:00 AM - 01:00 PM (11:00:00 to 13:00:00)
  // 3) Dr. Imran Razak: Sat 09:00 PM - 10:00 PM (21:00:00 to 22:00:00)
  // 4) Dr. Atta Ullah Faheem: Sun 06:00 PM - 09:00 PM (18:00:00 to 21:00:00) & Mon, Wed, Fri 12:00 PM - 03:00 PM (12:00:00 to 15:00:00)
  // 5) Dr. Mehk Javaid: Sun 01:00 PM - 02:00 PM (13:00:00 to 14:00:00)
  // 6) Dr. Zaheer Abbas: Mon to Sat 05:00 PM - 08:00 PM (17:00:00 to 20:00:00)
  // 7) Dr. Moeeza Arshad: Mon to Sat 02:00 PM - 05:00 PM (14:00:00 to 17:00:00)

  const schedValues = [
    // Dr. Hudebia (ID 1)
    `(1, 'Monday', '17:00:00', '21:00:00', 30, 1)`,
    `(1, 'Tuesday', '17:00:00', '21:00:00', 30, 1)`,
    `(1, 'Wednesday', '17:00:00', '21:00:00', 30, 1)`,
    `(1, 'Thursday', '17:00:00', '21:00:00', 30, 1)`,
    `(1, 'Friday', '17:00:00', '21:00:00', 30, 1)`,
    `(1, 'Saturday', '17:00:00', '21:00:00', 30, 1)`,
    
    // Dr. Tahir Javaid (ID 2)
    `(2, 'Tuesday', '11:00:00', '13:00:00', 25, 1)`,
    `(2, 'Thursday', '11:00:00', '13:00:00', 25, 1)`,
    `(2, 'Saturday', '11:00:00', '13:00:00', 25, 1)`,

    // Dr. Imran Razak (ID 3)
    `(3, 'Saturday', '21:00:00', '22:00:00', 15, 1)`,

    // Dr. Atta Ullah Faheem (ID 4)
    `(4, 'Sunday', '18:00:00', '21:00:00', 25, 1)`,
    `(4, 'Monday', '12:00:00', '15:00:00', 25, 1)`,
    `(4, 'Wednesday', '12:00:00', '15:00:00', 25, 1)`,
    `(4, 'Friday', '12:00:00', '15:00:00', 25, 1)`,

    // Dr. Mehk Javaid (ID 5)
    `(5, 'Sunday', '13:00:00', '14:00:00', 20, 1)`,

    // Dr. Zaheer Abbas (ID 6)
    `(6, 'Monday', '17:00:00', '20:00:00', 20, 1)`,
    `(6, 'Tuesday', '17:00:00', '20:00:00', 20, 1)`,
    `(6, 'Wednesday', '17:00:00', '20:00:00', 20, 1)`,
    `(6, 'Thursday', '17:00:00', '20:00:00', 20, 1)`,
    `(6, 'Friday', '17:00:00', '20:00:00', 20, 1)`,
    `(6, 'Saturday', '17:00:00', '20:00:00', 20, 1)`,

    // Dr. Moeeza Arshad (ID 7)
    `(7, 'Monday', '14:00:00', '17:00:00', 20, 1)`,
    `(7, 'Tuesday', '14:00:00', '17:00:00', 20, 1)`,
    `(7, 'Wednesday', '14:00:00', '17:00:00', 20, 1)`,
    `(7, 'Thursday', '14:00:00', '17:00:00', 20, 1)`,
    `(7, 'Friday', '14:00:00', '17:00:00', 20, 1)`,
    `(7, 'Saturday', '14:00:00', '17:00:00', 20, 1)`
  ];

  await query(`
    INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_slots, is_active)
    VALUES ${schedValues.join(',\n    ')}
  `);



  // Verification output
  const [docs] = await query('SELECT id, name, specialty, qualification, available_days, start_time, end_time FROM doctors ORDER BY id');
  console.log('\n✅ Doctors successfully configured:');
  console.table(docs);

  const [scheds] = await query('SELECT s.id, d.name, s.day_of_week, s.start_time, s.end_time FROM doctor_schedules s JOIN doctors d ON s.doctor_id = d.id ORDER BY d.id, s.id');
  console.log(`\n✅ Doctor schedules configured: ${scheds.length} schedule slots.`);
  console.table(scheds);

  console.log('\n🌟 Setup complete!');
  process.exit(0);
}

setupDoctors().catch(err => {
  console.error('setupDoctors error:', err);
  process.exit(1);
});
