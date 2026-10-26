const { query } = require('../config/db');

async function getInvoices(req, res) {
  try {
    const { status, date, search, patient_id } = req.query;
    let sql = `
      SELECT inv.*, 
        p.mrn, p.full_name as patient_name, p.phone as patient_phone, p.gender, p.age,
        d.name as doctor_name, d.specialty as doctor_specialty,
        COALESCE(d.doctor_share_percent, 60) as doctor_share_percent,
        COALESCE(a.token_display, a.appointment_code, CONCAT('R-', inv.id)) as reg_no,
        a.chief_complaint,
        v.weight_kg, v.notes as vitals_notes,
        (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id AND id <= a.id) as visit_number
      FROM invoices inv
      JOIN patients p ON inv.patient_id = p.id
      LEFT JOIN appointments a ON inv.appointment_id = a.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN patient_vitals v ON v.appointment_id = a.id
    `;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('inv.payment_status = ?');
      params.push(status);
    }
    if (date) {
      conditions.push('DATE(inv.created_at) = ?');
      params.push(date);
    }
    if (patient_id) {
      conditions.push('inv.patient_id = ?');
      params.push(patient_id);
    }
    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      conditions.push('(inv.invoice_number LIKE ? OR p.full_name LIKE ? OR p.mrn LIKE ? OR p.phone LIKE ?)');
      params.push(s, s, s, s);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY inv.id DESC LIMIT 50';

    const [invoices] = await query(sql, params);
    return res.json({ success: true, data: invoices });
  } catch (err) {
    console.error('getInvoices error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoices.' });
  }
}

async function getInvoiceById(req, res) {
  try {
    const { id } = req.params;

    const [invoices] = await query(`
      SELECT inv.*, 
        p.mrn, p.full_name as patient_name, p.phone as patient_phone, p.gender, p.age, p.address as patient_address
      FROM invoices inv
      JOIN patients p ON inv.patient_id = p.id
      WHERE inv.id = ?
    `, [id]);

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const inv = invoices[0];
    const [items] = await query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    inv.items = items;

    const [payments] = await query('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC', [id]);
    inv.payments = payments;

    const [clinic] = await query('SELECT * FROM clinic_settings LIMIT 1');
    inv.clinic = clinic[0] || {};

    return res.json({ success: true, data: inv });
  } catch (err) {
    console.error('getInvoiceById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoice details.' });
  }
}

async function createInvoice(req, res) {
  try {
    const {
      patient_id, appointment_id, consultation_id,
      items, discount_type = 'fixed', discount_value = 0,
      tax_percentage = 0, payment_method = 'cash', initial_payment = null, notes
    } = req.body;

    if (!patient_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Patient and at least one bill item are required.' });
    }

    // 1. Calculate subtotal
    let subtotal = 0;
    for (let it of items) {
      const q = parseInt(it.quantity) || 1;
      const u = parseFloat(it.unit_price) || 0;
      subtotal += (q * u);
    }

    // 2. Calculate discount
    let discountAmount = 0;
    const discVal = parseFloat(discount_value) || 0;
    if (discount_type === 'percentage') {
      discountAmount = (subtotal * discVal) / 100;
    } else {
      discountAmount = discVal;
    }
    discountAmount = Math.min(discountAmount, subtotal);

    // 3. Calculate tax
    const taxableAmount = subtotal - discountAmount;
    const taxPercent = parseFloat(tax_percentage) || 0;
    const taxAmount = (taxableAmount * taxPercent) / 100;

    const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));

    // 4. Initial payment handling
    let paidAmount = initial_payment !== null && initial_payment !== undefined ? parseFloat(initial_payment) : totalAmount;
    if (isNaN(paidAmount) || paidAmount < 0) paidAmount = 0;
    paidAmount = Math.min(paidAmount, totalAmount);

    const balanceDue = parseFloat((totalAmount - paidAmount).toFixed(2));
    let paymentStatus = 'unpaid';
    if (balanceDue === 0 && paidAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && balanceDue > 0) {
      paymentStatus = 'partial';
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const cashierName = req.user ? req.user.full_name : 'Accounts Cashier';

    // 5. Insert Invoice
    const [invRes] = await query(`
      INSERT INTO invoices (
        invoice_number, patient_id, appointment_id, consultation_id,
        subtotal, discount_type, discount_value, discount_amount, tax_amount,
        total_amount, paid_amount, balance_due, payment_status, payment_method,
        cashier_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceNumber, patient_id, appointment_id || null, consultation_id || null,
      subtotal, discount_type, discVal, discountAmount, taxAmount,
      totalAmount, paidAmount, balanceDue, paymentStatus, payment_method,
      cashierName, notes || null
    ]);

    const invoiceId = invRes.insertId;

    // 6. Insert Line Items
    for (let it of items) {
      const q = parseInt(it.quantity) || 1;
      const u = parseFloat(it.unit_price) || 0;
      const tot = q * u;
      await query(`
        INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [invoiceId, it.item_type || 'procedure', it.reference_id || null, it.description, q, u, tot]);
    }

    // 7. Insert Payment record if paid
    if (paidAmount > 0) {
      const payNum = `PAY-${Date.now().toString().slice(-6)}`;
      await query(`
        INSERT INTO payments (invoice_id, patient_id, payment_number, amount, payment_method, notes, collected_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [invoiceId, patient_id, payNum, paidAmount, payment_method, 'Payment processed at billing desk', cashierName]);
    }

    // 8. If fully paid and linked to an appointment, complete the patient visit process!
    if (paymentStatus === 'paid' && appointment_id) {
      await query('UPDATE appointments SET status = "completed", completed_at = NOW() WHERE id = ?', [appointment_id]);
    }

    return res.status(201).json({
      success: true,
      message: paymentStatus === 'paid' ? 'Invoice created and patient process completed!' : 'Invoice created successfully!',
      invoiceId,
      invoiceNumber,
      totalAmount,
      paidAmount,
      balanceDue,
      paymentStatus
    });
  } catch (err) {
    console.error('createInvoice error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
  }
}

async function recordPayment(req, res) {
  try {
    const { id } = req.params;
    const { amount, payment_method = 'cash', transaction_ref, notes } = req.body;

    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A valid payment amount is required.' });
    }

    const [invoices] = await query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const inv = invoices[0];
    const currentPaid = parseFloat(inv.paid_amount);
    const total = parseFloat(inv.total_amount);
    const newPaid = Math.min(total, currentPaid + payAmount);
    const newBalance = Math.max(0, parseFloat((total - newPaid).toFixed(2)));
    const newStatus = newBalance === 0 ? 'paid' : 'partial';

    await query(`
      UPDATE invoices SET 
        paid_amount = ?,
        balance_due = ?,
        payment_status = ?,
        payment_method = ?
      WHERE id = ?
    `, [newPaid, newBalance, newStatus, payment_method, id]);

    const payNum = `PAY-${Date.now().toString().slice(-6)}`;
    await query(`
      INSERT INTO payments (invoice_id, patient_id, payment_number, amount, payment_method, transaction_ref, notes, collected_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, inv.patient_id, payNum, payAmount, payment_method, transaction_ref || null, notes || null, req.user ? req.user.full_name : 'Cashier']);

    // Complete appointment if fully paid
    if (newStatus === 'paid' && inv.appointment_id) {
      await query('UPDATE appointments SET status = "completed", completed_at = NOW() WHERE id = ?', [inv.appointment_id]);
    }

    return res.json({
      success: true,
      message: newStatus === 'paid' ? 'Full payment received and patient process completed!' : 'Payment recorded successfully!',
      paidAmount: newPaid,
      balanceDue: newBalance,
      paymentStatus: newStatus
    });
  } catch (err) {
    console.error('recordPayment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
}

async function updateInvoice(req, res) {
  try {
    const { id } = req.params;
    const {
      items, discount_type = 'fixed', discount_value = 0,
      tax_percentage = 0, payment_method = 'cash', notes
    } = req.body;

    const [invoices] = await query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const existingInv = invoices[0];

    // Recalculate subtotal
    let subtotal = 0;
    if (Array.isArray(items) && items.length > 0) {
      for (let it of items) {
        const q = parseInt(it.quantity) || 1;
        const u = parseFloat(it.unit_price) || 0;
        subtotal += (q * u);
      }
    } else {
      subtotal = parseFloat(existingInv.subtotal);
    }

    let discountAmount = 0;
    const discVal = parseFloat(discount_value) || 0;
    if (discount_type === 'percentage') {
      discountAmount = (subtotal * discVal) / 100;
    } else {
      discountAmount = discVal;
    }
    discountAmount = Math.min(discountAmount, subtotal);

    const taxableAmount = subtotal - discountAmount;
    const taxPercent = parseFloat(tax_percentage) || 0;
    const taxAmount = (taxableAmount * taxPercent) / 100;

    const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));
    const paidAmount = parseFloat(existingInv.paid_amount);
    const balanceDue = Math.max(0, parseFloat((totalAmount - paidAmount).toFixed(2)));

    let paymentStatus = 'unpaid';
    if (balanceDue === 0 && paidAmount > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && balanceDue > 0) {
      paymentStatus = 'partial';
    }

    await query(`
      UPDATE invoices SET
        subtotal = ?,
        discount_type = ?,
        discount_value = ?,
        discount_amount = ?,
        tax_amount = ?,
        total_amount = ?,
        balance_due = ?,
        payment_status = ?,
        payment_method = ?,
        notes = ?
      WHERE id = ?
    `, [
      subtotal, discount_type, discVal, discountAmount, taxAmount,
      totalAmount, balanceDue, paymentStatus, payment_method, notes || null, id
    ]);

    // Update line items if provided
    if (Array.isArray(items) && items.length > 0) {
      await query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
      for (let it of items) {
        const q = parseInt(it.quantity) || 1;
        const u = parseFloat(it.unit_price) || 0;
        const tot = q * u;
        await query(`
          INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, it.item_type || 'procedure', it.reference_id || null, it.description, q, u, tot]);
      }
    }

    return res.json({ success: true, message: 'Invoice updated successfully.' });
  } catch (err) {
    console.error('updateInvoice error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update invoice.' });
  }
}

async function deleteInvoice(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM payments WHERE invoice_id = ?', [id]);
    await query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    await query('DELETE FROM invoices WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Invoice and payment records deleted successfully from database.' });
  } catch (err) {
    console.error('deleteInvoice error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete invoice.' });
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  recordPayment,
  deleteInvoice
};

