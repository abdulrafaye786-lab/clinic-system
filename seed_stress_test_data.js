const { query } = require('./src/config/db');

async function runStressTestSeeding() {
  console.log('🚀 [STRESS-TEST SEED] Generating high-volume realistic clinic data...');
  console.log(' Target: 80+ Patients, 95+ Appointments, 70+ Consultations, Vitals, Labs, Invoices & Pharmacy Sales\n');

  const startTime = Date.now();

  // 1. Fetch available Doctors & Lab Catalog & Medicines Inventory
  const [doctors] = await query('SELECT id, name, specialty, consultation_fee FROM doctors WHERE status = "active"');
  if (doctors.length === 0) {
    throw new Error('No active doctors found in database.');
  }

  const [labTests] = await query('SELECT id, test_code, test_name, price, normal_range, units FROM lab_test_catalog WHERE status = "active"');
  const [medicines] = await query('SELECT id, item_code, brand_name, generic_name, dosage_form, strength, selling_price, stock_quantity, batch_no FROM medicines_inventory');

  // Sample data pools for realistic generation
  const firstNames = [
    'Muhammad', 'Ali', 'Ahmed', 'Tariq', 'Usman', 'Hamza', 'Bilal', 'Zubair', 'Omer', 'Hassan',
    'Fatima', 'Ayesha', 'Sana', 'Zainab', 'Mariam', 'Khadija', 'Hira', 'Nida', 'Bushra', 'Saima',
    'Shahid', 'Imran', 'Kamran', 'Farhan', 'Rashid', 'Waqas', 'Asad', 'Haris', 'Faisal', 'Noman',
    'Amna', 'Sadia', 'Rabia', 'Farah', 'Mehwish', 'Tahira', 'Sumaira', 'Nazia', 'Shagufta', 'Samina'
  ];
  const lastNames = [
    'Khan', 'Malik', 'Chaudhry', 'Sheikh', 'Bhatti', 'Raza', 'Qureshi', 'Abbasi', 'Siddiqui', 'Mughal',
    'Shah', 'Mirza', 'Jutt', 'Ghar', 'Hashmi', 'Nawaz', 'Iqbal', 'Mahmood', 'Akram', 'Zafar'
  ];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  const cities = ['Garden Town', 'Gulberg', 'Model Town', 'DHA Phase 5', 'Johar Town', 'Faisal Town', 'Iqbal Town', 'Cavendish Square'];

  const complaintsList = [
    'Persistent high grade fever, body aches and chills for 3 days',
    'Epigastric burning sensation after meals and nighttime acid reflux',
    'Productive cough, chest tightness and shortness of breath on exertion',
    'Severe lower back pain radiating down the left leg, worse on bending',
    'Hypertension follow up, occasional headaches and dizziness in morning',
    'Generalized fatigue, loss of appetite, pale conjunctiva and weakness',
    'Skin rash with intense itching on forearms and neck region',
    'Pediatric runny nose, mild fever and refusal of feeds',
    'Bilateral knee joint pain, stiffness in morning lasting > 30 mins',
    'Throat pain, difficulty swallowing and low grade fever for 2 days'
  ];

  const diagnosisList = [
    { dx: 'Acute Upper Respiratory Tract Infection (URTI)', icd: 'J06.9' },
    { dx: 'Essential (Primary) Hypertension', icd: 'I10' },
    { dx: 'Type 2 Diabetes Mellitus without complications', icd: 'E11.9' },
    { dx: 'Acute Gastritis with Epigastric Distress', icd: 'K29.7' },
    { dx: 'Lumbar Spondylosis with Sciatica', icd: 'M47.816' },
    { dx: 'Iron Deficiency Anemia', icd: 'D50.9' },
    { dx: 'Allergic Contact Dermatitis', icd: 'L23.9' },
    { dx: 'Acute Tonsillopharyngitis', icd: 'J02.9' },
    { dx: 'Osteoarthritis of Knee Joints', icd: 'M17.9' },
    { dx: 'Acute Viral Bronchitis', icd: 'J20.9' }
  ];

  // 2. Generate 80 Patients
  console.log('👤 [1/7] Seeding 80 Patients...');
  const patientIds = [];

  for (let i = 1; i <= 80; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${fn} ${ln}`;
    const gender = ['Fatima', 'Ayesha', 'Sana', 'Zainab', 'Mariam', 'Khadija', 'Hira', 'Nida', 'Bushra', 'Saima', 'Amna', 'Sadia', 'Rabia', 'Farah', 'Mehwish', 'Tahira', 'Sumaira', 'Nazia', 'Shagufta', 'Samina'].includes(fn) ? 'Female' : 'Male';
    const age = Math.floor(Math.random() * 65) + 5; // 5 to 70 yrs
    const mrn = `${i}`;
    const phone = `03${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const cnic = `35201-${Math.floor(Math.random() * 9000000 + 1000000)}-${Math.floor(Math.random() * 9 + 1)}`;
    const bloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
    const maritalStatus = age > 22 ? maritalStatuses[Math.floor(Math.random() * maritalStatuses.length)] : 'Single';
    const address = `House #${Math.floor(Math.random() * 150 + 1)}, Street ${Math.floor(Math.random() * 20 + 1)}, ${cities[Math.floor(Math.random() * cities.length)]}, Lahore`;

    const allergies = (i % 7 === 0) ? 'Penicillin Allergy' : (i % 11 === 0 ? 'Dust & Pollen Allergy' : 'None Reported');
    const chronic = (age > 45 && i % 3 === 0) ? 'Hypertension, Type-2 Diabetes' : (age > 50 ? 'Osteoarthritis' : 'None');

    const [res] = await query(`
      INSERT INTO patients (mrn, full_name, gender, age, phone, cnic, email, blood_group, marital_status, address, allergies, chronic_conditions, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [mrn, fullName, gender, age, phone, cnic, `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`, bloodGroup, maritalStatus, address, allergies, chronic, 'High volume test patient profile']);
    
    patientIds.push({ id: res.insertId, fullName, gender, age, phone, mrn });
  }
  console.log(`   ✓ 80 Patients created (MRN-2026-01001 to MRN-2026-01080)`);

  // 3. Generate 95 Appointments across today, yesterday & tomorrow
  console.log('\n📅 [2/7] Seeding 95 Appointments...');
  const appointmentIds = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const dates = [];
  // 5 days window
  for (let d = -2; d <= 2; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    dates.push(dt.toISOString().slice(0, 10));
  }

  const times = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'];
  const apptTypes = ['walk_in', 'scheduled', 'follow_up', 'emergency'];
  const apptStatuses = ['completed', 'completed', 'completed', 'waiting', 'in_consultation', 'scheduled'];

  for (let i = 1; i <= 95; i++) {
    const patient = patientIds[(i - 1) % patientIds.length];
    const doctor = doctors[i % doctors.length];
    const apptDate = dates[i % dates.length];
    const apptTime = times[i % times.length];
    const apptType = apptTypes[i % apptTypes.length];
    const status = (apptDate < todayStr) ? 'completed' : (apptDate > todayStr ? 'scheduled' : apptStatuses[i % apptStatuses.length]);
    const apptCode = `APT-2026-${String(2000 + i).padStart(5, '0')}`;
    const complaint = complaintsList[i % complaintsList.length];

    const [res] = await query(`
      INSERT INTO appointments (appointment_code, token_number, token_display, patient_id, doctor_id, appointment_date, appointment_time, appointment_type, priority, status, chief_complaint)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?)
    `, [apptCode, i, `T-${String(i).padStart(3, '0')}`, patient.id, doctor.id, apptDate, apptTime, apptType, status, complaint]);

    appointmentIds.push({
      id: res.insertId,
      code: apptCode,
      patientId: patient.id,
      doctorId: doctor.id,
      docFee: doctor.consultation_fee,
      status: status,
      date: apptDate,
      complaint: complaint
    });
  }
  console.log(`   ✓ 95 Appointments booked across ${doctors.length} doctors`);

  // 4. Generate Patient Vitals for 70 Appointments
  console.log('\n🫀 [3/7] Seeding 70 Patient Vitals Records...');
  let vitalsCount = 0;
  for (let i = 0; i < appointmentIds.length; i++) {
    const appt = appointmentIds[i];
    if (appt.status === 'completed' || appt.status === 'waiting' || appt.status === 'in_consultation') {
      const sys = Math.floor(Math.random() * 40) + 105; // 105-145
      const dia = Math.floor(Math.random() * 25) + 70;  // 70-95
      const pulse = Math.floor(Math.random() * 30) + 68; // 68-98
      const temp = (Math.random() * 2.5 + 98.0).toFixed(1); // 98.0 - 100.5 F
      const spo2 = Math.floor(Math.random() * 4) + 96; // 96-99%
      const wt = (Math.random() * 30 + 55).toFixed(1); // 55-85 kg
      const ht = 168.0;
      const bmi = (wt / Math.pow(ht / 100, 2)).toFixed(1);
      const sugarR = Math.floor(Math.random() * 80) + 110; // 110-190 mg/dL

      await query(`
        INSERT INTO patient_vitals (patient_id, appointment_id, recorded_by, systolic_bp, diastolic_bp, pulse_rate, temperature_f, respiratory_rate, spo2, weight_kg, height_cm, bmi, blood_sugar_random, notes)
        VALUES (?, ?, 'Staff Nurse Ayesha', ?, ?, ?, ?, 18, ?, ?, ?, ?, ?, 'Routine triage vitals recorded at OPD counter')
      `, [appt.patientId, appt.id, sys, dia, pulse, temp, spo2, wt, ht, bmi, sugarR]);

      vitalsCount++;
      if (vitalsCount >= 70) break;
    }
  }
  console.log(`   ✓ ${vitalsCount} Vitals entries recorded`);

  // 5. Generate Consultations & Prescriptions for Completed Appointments
  console.log('\n🩺 [4/7] Seeding Consultations & Prescriptions...');
  const consultationIds = [];
  let consultCount = 0;

  for (let i = 0; i < appointmentIds.length; i++) {
    const appt = appointmentIds[i];
    if (appt.status === 'completed') {
      const dxObj = diagnosisList[consultCount % diagnosisList.length];
      
      const [cRes] = await query(`
        INSERT INTO consultations (appointment_id, patient_id, doctor_id, chief_complaint, history_present_illness, examination_findings, diagnosis, icd_code, clinical_notes, follow_up_date, follow_up_instructions, status)
        VALUES (?, ?, ?, ?, 'Symptoms duration 3-5 days, no past hospital admissions', 'Chest clear, abdomen soft non-tender, throat mildly congested', ?, ?, 'Patient counseled regarding diet and hydration', DATE_ADD(NOW(), INTERVAL 7 DAY), 'Review with lab reports after 1 week', 'completed')
      `, [appt.id, appt.patientId, appt.doctorId, appt.complaint, dxObj.dx, dxObj.icd]);

      const consultId = cRes.insertId;
      consultationIds.push({ id: consultId, patientId: appt.patientId, doctorId: appt.doctorId, apptId: appt.id });

      // Create Rx
      const [rxRes] = await query(`
        INSERT INTO prescriptions (consultation_id, patient_id, doctor_id, advice, dietary_restrictions)
        VALUES (?, ?, ?, 'Take rest, drink plenty of water. Complete full course of medication.', 'Avoid spicy & deep fried foods. Low salt diet.')
      `, [consultId, appt.patientId, appt.doctorId]);

      const rxId = rxRes.insertId;

      // Add 2-3 prescription items
      const selectedMeds = [
        medicines[consultCount % medicines.length],
        medicines[(consultCount + 3) % medicines.length],
        medicines[(consultCount + 5) % medicines.length]
      ];

      for (const med of selectedMeds) {
        if (med) {
          await query(`
            INSERT INTO prescription_items (prescription_id, medicine_name, generic_name, dosage_form, strength, dosage, frequency, duration, instruction)
            VALUES (?, ?, ?, ?, ?, '1 tablet', '1-0-1', '5 Days', 'After Meal')
          `, [rxId, med.brand_name, med.generic_name, med.dosage_form, med.strength]);
        }
      }

      consultCount++;
      if (consultCount >= 70) break;
    }
  }
  console.log(`   ✓ ${consultCount} Consultations & Prescriptions populated with Rx items`);

  // 6. Generate Lab Orders & Results (50 Lab Orders)
  console.log('\n🔬 [5/7] Seeding Lab Orders & Results...');
  let labCount = 0;
  for (let i = 0; i < consultationIds.length; i++) {
    if (i % 2 === 0) { // Every 2nd consultation gets lab orders
      const c = consultationIds[i];
      const test1 = labTests[labCount % labTests.length];
      const test2 = labTests[(labCount + 2) % labTests.length];

      const totalAmt = (test1 ? parseFloat(test1.price) : 500) + (test2 ? parseFloat(test2.price) : 600);
      const orderCode = `LAB-2026-${String(3000 + labCount + 1).padStart(5, '0')}`;
      const status = (labCount % 4 === 0) ? 'pending' : 'completed';
      const payStatus = 'paid';

      const [lRes] = await query(`
        INSERT INTO lab_orders (order_code, consultation_id, patient_id, doctor_id, total_amount, status, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [orderCode, c.id, c.patientId, c.doctorId, totalAmt, status, payStatus]);

      const orderId = lRes.insertId;

      if (test1) {
        await query(`
          INSERT INTO lab_order_items (lab_order_id, test_id, test_name, price, result_value, normal_range, unit, flag, remarks, tested_by, status, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Result verified by Pathologist', 'Hamza Farooq', ?, NOW())
        `, [orderId, test1.id, test1.test_name, test1.price, status === 'completed' ? 'Within Normal Reference Range' : null, test1.normal_range || 'Normal', test1.units || '', status === 'completed' ? 'Normal' : 'Pending', status === 'completed' ? 'completed' : 'pending']);
      }

      if (test2) {
        await query(`
          INSERT INTO lab_order_items (lab_order_id, test_id, test_name, price, result_value, normal_range, unit, flag, remarks, tested_by, status, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Sample processed on automated analyzer', 'Hamza Farooq', ?, NOW())
        `, [orderId, test2.id, test2.test_name, test2.price, status === 'completed' ? 'Slightly Elevated' : null, test2.normal_range || 'Normal', test2.units || '', status === 'completed' ? 'High' : 'Pending', status === 'completed' ? 'completed' : 'pending']);
      }

      labCount++;
      if (labCount >= 50) break;
    }
  }
  console.log(`   ✓ ${labCount} Lab Orders generated with itemized diagnostic findings`);

  // 7. Generate Invoices & Payments (75 Invoices)
  console.log('\n💳 [6/7] Seeding Invoices & Payments...');
  let invCount = 0;

  for (let i = 0; i < appointmentIds.length; i++) {
    const appt = appointmentIds[i];
    if (invCount < 75) {
      const invNum = `INV-2026-${String(5000 + invCount + 1).padStart(5, '0')}`;
      const docFee = parseFloat(appt.docFee || 1500.00);
      const discAmt = (invCount % 5 === 0) ? 200.00 : 0.00;
      const totalAmt = docFee - discAmt;
      const payStatus = (invCount % 8 === 0) ? 'unpaid' : ((invCount % 6 === 0) ? 'partial' : 'paid');
      const paidAmt = (payStatus === 'paid') ? totalAmt : ((payStatus === 'partial') ? totalAmt - 500 : 0);
      const balance = totalAmt - paidAmt;

      const [invRes] = await query(`
        INSERT INTO invoices (invoice_number, patient_id, appointment_id, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_due, payment_status, payment_method, cashier_name, notes)
        VALUES (?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, 'cash', 'Ayesha Khan (Front Desk)', 'OPD Consultation Billing')
      `, [invNum, appt.patientId, appt.id, docFee, discAmt, totalAmt, paidAmt, balance, payStatus]);

      const invId = invRes.insertId;

      await query(`
        INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, quantity, unit_price, total_price)
        VALUES (?, 'consultation', ?, 'OPD Specialist Consultation Fee', 1, ?, ?)
      `, [invId, appt.id, docFee, docFee]);

      if (paidAmt > 0) {
        const payNum = `PAY-2026-${String(7000 + invCount + 1).padStart(5, '0')}`;
        await query(`
          INSERT INTO payments (invoice_id, patient_id, payment_number, amount, payment_method, notes, collected_by)
          VALUES (?, ?, ?, ?, 'cash', 'Counter cash payment received', 'Ayesha Khan')
        `, [invId, appt.patientId, payNum, paidAmt]);
      }

      invCount++;
    }
  }
  console.log(`   ✓ ${invCount} Invoices generated with matching Payment records`);

  // 8. Generate Pharmacy Sales (40 Sales)
  console.log('\n💊 [7/7] Seeding Pharmacy Sales & Stock Transactions...');
  let saleCount = 0;

  for (let i = 1; i <= 40; i++) {
    const patient = patientIds[i % patientIds.length];
    const saleCode = `RX-SALE-2026-${String(8000 + i).padStart(5, '0')}`;
    const med1 = medicines[i % medicines.length];
    const med2 = medicines[(i + 4) % medicines.length];

    const price1 = parseFloat(med1.selling_price || 150);
    const price2 = parseFloat(med2.selling_price || 200);
    const subtotal = price1 * 2 + price2 * 1;
    const discount = (i % 4 === 0) ? 50.00 : 0.00;
    const total = subtotal - discount;

    const [sRes] = await query(`
      INSERT INTO pharmacy_sales (sale_code, patient_id, customer_name, customer_phone, subtotal, discount, total_amount, payment_method, dispensed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', 'Zainab Ali (Chief Pharmacist)')
    `, [saleCode, patient.id, patient.fullName, patient.phone, subtotal, discount, total]);

    const saleId = sRes.insertId;

    await query(`
      INSERT INTO pharmacy_sale_items (pharmacy_sale_id, medicine_id, medicine_name, batch_no, unit_price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, 2, ?), (?, ?, ?, ?, ?, 1, ?)
    `, [
      saleId, med1.id, med1.brand_name, med1.batch_no || 'BATCH-01', price1, price1 * 2,
      saleId, med2.id, med2.brand_name, med2.batch_no || 'BATCH-02', price2, price2 * 1
    ]);

    saleCount++;
  }
  console.log(`   ✓ ${saleCount} Pharmacy POS Sales executed`);

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n================================================================`);
  console.log(`🎉 HIGH-VOLUME CLINIC SEEDING COMPLETE IN ${elapsedSec}s!`);
  console.log(`================================================================`);

  // Print Summary Count Verification
  const [pCount] = await query('SELECT COUNT(*) as c FROM patients');
  const [aCount] = await query('SELECT COUNT(*) as c FROM appointments');
  const [vCount] = await query('SELECT COUNT(*) as c FROM patient_vitals');
  const [cCount] = await query('SELECT COUNT(*) as c FROM consultations');
  const [lCount] = await query('SELECT COUNT(*) as c FROM lab_orders');
  const [iCount] = await query('SELECT COUNT(*) as c FROM invoices');
  const [psCount] = await query('SELECT COUNT(*) as c FROM pharmacy_sales');

  console.log(`📊 DB STATUS SNAPSHOT:`);
  console.log(`   - Patients:             ${pCount[0].c}`);
  console.log(`   - Appointments:         ${aCount[0].c}`);
  console.log(`   - Patient Vitals:       ${vCount[0].c}`);
  console.log(`   - Consultations:        ${cCount[0].c}`);
  console.log(`   - Lab Orders:           ${lCount[0].c}`);
  console.log(`   - Invoices & Payments:  ${iCount[0].c}`);
  console.log(`   - Pharmacy Sales:       ${psCount[0].c}`);
  console.log(`================================================================\n`);

  process.exit(0);
}

runStressTestSeeding().catch(err => {
  console.error('❌ STRESS TEST SEEDING ERROR:', err);
  process.exit(1);
});
