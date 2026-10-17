const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const { loginLimiter, sanitizeInputs } = require('../middleware/security');
const authCtrl = require('../controllers/authController');
const dashCtrl = require('../controllers/dashboardController');
const patientCtrl = require('../controllers/patientController');
const doctorCtrl = require('../controllers/doctorController');
const apptCtrl = require('../controllers/appointmentController');
const consultCtrl = require('../controllers/consultationController');
const pharmaCtrl = require('../controllers/pharmacyController');
const billCtrl = require('../controllers/billingController');
const repCtrl = require('../controllers/reportsController');
const setCtrl = require('../controllers/settingsController');

// Apply global input sanitization across all API endpoints
router.use(sanitizeInputs);

// --- 1. AUTHENTICATION & USERS ---
router.post('/auth/login', loginLimiter, authCtrl.login);
router.get('/auth/me', authenticateToken, authCtrl.getMe);
router.get('/auth/users', authenticateToken, requireRole('admin'), authCtrl.getUsers);
router.post('/auth/users', authenticateToken, requireRole('admin'), authCtrl.createUser);
router.put('/auth/users/:id', authenticateToken, requireRole('admin'), authCtrl.updateUser);
router.delete('/auth/users/:id', authenticateToken, requireRole('admin'), authCtrl.deleteUser);

// --- 2. DASHBOARD ---
router.get('/dashboard/summary', authenticateToken, dashCtrl.getDashboardSummary);

// --- 3. PATIENTS & VITALS ---
router.get('/patients', authenticateToken, patientCtrl.getPatients);
router.get('/patients/:id', authenticateToken, patientCtrl.getPatientById);
router.post('/patients', authenticateToken, patientCtrl.createPatient);
router.put('/patients/:id', authenticateToken, patientCtrl.updatePatient);
router.delete('/patients/:id', authenticateToken, patientCtrl.deletePatient);
router.post('/patients/:id/vitals', authenticateToken, patientCtrl.addVitals);
router.put('/vitals/:id', authenticateToken, patientCtrl.updateVitals);
router.get('/vitals/all', authenticateToken, patientCtrl.getAllVitals);

// --- 4. DOCTORS & DEPARTMENTS ---
router.get('/doctors', authenticateToken, doctorCtrl.getDoctors);
router.get('/doctors/:id', authenticateToken, doctorCtrl.getDoctorById);
router.post('/doctors', authenticateToken, requireRole('admin'), doctorCtrl.createDoctor);
router.put('/doctors/:id', authenticateToken, requireRole('admin'), doctorCtrl.updateDoctor);
router.delete('/doctors/:id', authenticateToken, requireRole('admin'), doctorCtrl.deleteDoctor);
router.post('/doctors/:id/schedules', authenticateToken, requireRole('admin'), doctorCtrl.addDoctorSchedule);
router.delete('/doctors/schedules/:scheduleId', authenticateToken, requireRole('admin'), doctorCtrl.deleteDoctorSchedule);
router.get('/departments', authenticateToken, doctorCtrl.getDepartments);

// --- 5. APPOINTMENTS & OPD QUEUE ---
router.get('/appointments', authenticateToken, apptCtrl.getAppointments);
router.get('/appointments/queue/today', authenticateToken, apptCtrl.getTodayQueue);
router.get('/appointments/queue/count', authenticateToken, apptCtrl.getTodayQueueCount);
router.get('/appointments/:id', authenticateToken, apptCtrl.getAppointmentById);
router.post('/appointments', authenticateToken, apptCtrl.createAppointment);
router.put('/appointments/:id', authenticateToken, apptCtrl.updateAppointment);
router.put('/appointments/:id/status', authenticateToken, apptCtrl.updateStatus);
router.delete('/appointments/:id', authenticateToken, apptCtrl.deleteAppointment);
router.post('/appointments/:id/checkin', authenticateToken, apptCtrl.checkInPatient);
router.post('/appointments/:id/call', authenticateToken, apptCtrl.callPatient);

// --- 6. CONSULTATIONS & E-PRESCRIPTIONS ---
router.get('/consultations', authenticateToken, consultCtrl.getConsultations);
router.get('/consultations/:id', authenticateToken, consultCtrl.getConsultationById);
router.post('/consultations', authenticateToken, consultCtrl.createConsultation);
router.put('/consultations/:id', authenticateToken, consultCtrl.updateConsultation);
router.delete('/consultations/:id', authenticateToken, consultCtrl.deleteConsultation);

// --- 7. PHARMACY & INVENTORY ---
router.get('/pharmacy/inventory', authenticateToken, pharmaCtrl.getInventory);
router.post('/pharmacy/inventory', authenticateToken, requireRole('admin', 'pharmacist'), pharmaCtrl.addMedicine);
router.put('/pharmacy/inventory/:id', authenticateToken, requireRole('admin', 'pharmacist'), pharmaCtrl.updateMedicine);
router.delete('/pharmacy/inventory/:id', authenticateToken, requireRole('admin', 'pharmacist'), pharmaCtrl.deleteMedicine);
router.get('/pharmacy/alerts', authenticateToken, pharmaCtrl.getStockAlerts);
router.post('/pharmacy/dispense', authenticateToken, pharmaCtrl.dispenseMedicines);
router.get('/pharmacy/sales', authenticateToken, pharmaCtrl.getSalesHistory);

// --- 9. BILLING & INVOICING ---
router.get('/billing/invoices', authenticateToken, billCtrl.getInvoices);
router.get('/billing/invoices/:id', authenticateToken, billCtrl.getInvoiceById);
router.post('/billing/invoices', authenticateToken, billCtrl.createInvoice);
router.put('/billing/invoices/:id', authenticateToken, billCtrl.updateInvoice);
router.post('/billing/invoices/:id/payment', authenticateToken, billCtrl.recordPayment);
router.delete('/billing/invoices/:id', authenticateToken, requireRole('admin'), billCtrl.deleteInvoice);

// --- 10. REPORTS & ANALYTICS ---
router.get('/reports/financial', authenticateToken, requireRole('admin', 'cashier'), repCtrl.getFinancialReport);
router.get('/reports/doctors', authenticateToken, requireRole('admin'), repCtrl.getDoctorReport);
router.get('/reports/opd', authenticateToken, repCtrl.getOpdDemographics);

// --- 11. CLINIC SETTINGS ---
router.get('/settings', authenticateToken, setCtrl.getSettings);
router.get('/public/settings', setCtrl.getSettings);
router.put('/settings', authenticateToken, requireRole('admin'), setCtrl.updateSettings);

module.exports = router;
