const { query } = require('../config/db');

async function getInventory(req, res) {
  try {
    const { search, category, status } = req.query;
    let sql = 'SELECT * FROM medicines_inventory';
    const conditions = [];
    const params = [];

    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      conditions.push('(brand_name LIKE ? OR generic_name LIKE ? OR item_code LIKE ? OR batch_no LIKE ?)');
      params.push(s, s, s, s);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (status === 'low_stock') {
      conditions.push('stock_quantity <= min_stock_alert AND stock_quantity > 0');
    } else if (status === 'out_of_stock') {
      conditions.push('stock_quantity <= 0');
    } else if (status === 'expired') {
      conditions.push('expiry_date <= CURDATE()');
    } else if (status === 'expiring_soon') {
      conditions.push('expiry_date > CURDATE() AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY brand_name ASC';

    const [items] = await query(sql, params);
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getInventory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve pharmacy inventory.' });
  }
}

async function addMedicine(req, res) {
  try {
    const {
      brand_name, generic_name, category, dosage_form, strength,
      manufacturer, batch_no, expiry_date, cost_price, selling_price,
      stock_quantity, min_stock_alert, rack_location
    } = req.body;

    if (!brand_name || !generic_name || !batch_no || !expiry_date || selling_price === undefined) {
      return res.status(400).json({ success: false, message: 'Brand name, generic name, batch, expiry and selling price are required.' });
    }

    // Generate unique item code
    const [lastItem] = await query('SELECT id FROM medicines_inventory ORDER BY id DESC LIMIT 1');
    const nextNum = (lastItem.length > 0 ? lastItem[0].id + 1 : 1);
    const item_code = `MED-${String(nextNum).padStart(3, '0')}`;

    const [result] = await query(`
      INSERT INTO medicines_inventory (
        item_code, brand_name, generic_name, category, dosage_form, strength,
        manufacturer, batch_no, expiry_date, cost_price, selling_price,
        stock_quantity, min_stock_alert, rack_location, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
    `, [
      item_code, brand_name.trim(), generic_name.trim(), category || 'General',
      dosage_form || 'Tablet', strength || '500mg', manufacturer || 'Pharma Corp',
      batch_no.trim(), expiry_date, cost_price || 0.00, selling_price,
      stock_quantity || 0, min_stock_alert || 20, rack_location || 'Shelf A-1'
    ]);

    return res.status(201).json({ success: true, message: 'Medicine added to inventory.', medicineId: result.insertId });
  } catch (err) {
    console.error('addMedicine error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add medicine to inventory.' });
  }
}

async function updateMedicine(req, res) {
  try {
    const { id } = req.params;
    const {
      brand_name, generic_name, category, dosage_form, strength,
      manufacturer, batch_no, expiry_date, cost_price, selling_price,
      stock_quantity, min_stock_alert, rack_location, status
    } = req.body;

    let computedStatus = status || 'available';
    if (stock_quantity <= 0) {
      computedStatus = 'out_of_stock';
    } else if (stock_quantity <= (min_stock_alert || 20)) {
      computedStatus = 'low_stock';
    }

    await query(`
      UPDATE medicines_inventory SET
        brand_name = ?, generic_name = ?, category = ?, dosage_form = ?,
        strength = ?, manufacturer = ?, batch_no = ?, expiry_date = ?,
        cost_price = ?, selling_price = ?, stock_quantity = ?,
        min_stock_alert = ?, rack_location = ?, status = ?
      WHERE id = ?
    `, [
      brand_name, generic_name, category || 'General', dosage_form || 'Tablet',
      strength, manufacturer, batch_no, expiry_date, cost_price || 0,
      selling_price, stock_quantity, min_stock_alert || 20,
      rack_location || 'Shelf A-1', computedStatus, id
    ]);

    return res.json({ success: true, message: 'Medicine updated successfully.' });
  } catch (err) {
    console.error('updateMedicine error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update medicine.' });
  }
}

async function getStockAlerts(req, res) {
  try {
    const [lowStock] = await query(`
      SELECT * FROM medicines_inventory 
      WHERE stock_quantity <= min_stock_alert 
      ORDER BY stock_quantity ASC
    `);

    const [expiring] = await query(`
      SELECT * FROM medicines_inventory 
      WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY expiry_date ASC
    `);

    return res.json({
      success: true,
      data: {
        lowStock,
        expiring
      }
    });
  } catch (err) {
    console.error('getStockAlerts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stock alerts.' });
  }
}

async function dispenseMedicines(req, res) {
  try {
    const {
      patient_id, prescription_id, customer_name, customer_phone,
      items, discount = 0, payment_method = 'cash'
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one medicine item is required for dispensing.' });
    }

    // 1. Check stock availability for all items
    for (let item of items) {
      const [meds] = await query('SELECT brand_name, stock_quantity FROM medicines_inventory WHERE id = ?', [item.medicine_id]);
      if (meds.length === 0) {
        return res.status(400).json({ success: false, message: `Medicine ID ${item.medicine_id} not found.` });
      }
      if (meds[0].stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${meds[0].brand_name}. Available: ${meds[0].stock_quantity}, Requested: ${item.quantity}`
        });
      }
    }

    // 2. Compute totals
    let subtotal = 0;
    for (let item of items) {
      subtotal += parseFloat(item.unit_price) * parseInt(item.quantity);
    }
    const discountVal = parseFloat(discount) || 0;
    const totalAmount = Math.max(0, subtotal - discountVal);
    const saleCode = `RX-SALE-${Date.now().toString().slice(-6)}`;

    // 3. Create pharmacy sale record
    const [saleRes] = await query(`
      INSERT INTO pharmacy_sales (
        sale_code, patient_id, prescription_id, customer_name, customer_phone,
        subtotal, discount, total_amount, payment_method, dispensed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      saleCode, patient_id || null, prescription_id || null,
      customer_name || 'Walk-in Customer', customer_phone || null,
      subtotal, discountVal, totalAmount, payment_method,
      req.user ? req.user.full_name : 'Chief Pharmacist'
    ]);

    const saleId = saleRes.insertId;

    // 4. Insert items and deduct inventory
    for (let item of items) {
      const itemSubtotal = parseFloat(item.unit_price) * parseInt(item.quantity);
      await query(`
        INSERT INTO pharmacy_sale_items (pharmacy_sale_id, medicine_id, medicine_name, batch_no, unit_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [saleId, item.medicine_id, item.medicine_name, item.batch_no || 'N/A', item.unit_price, item.quantity, itemSubtotal]);

      // Deduct stock
      await query(`
        UPDATE medicines_inventory 
        SET stock_quantity = stock_quantity - ?,
            status = CASE 
              WHEN stock_quantity - ? <= 0 THEN 'out_of_stock'
              WHEN stock_quantity - ? <= min_stock_alert THEN 'low_stock'
              ELSE 'available'
            END
        WHERE id = ?
      `, [item.quantity, item.quantity, item.quantity, item.medicine_id]);
    }

    return res.status(201).json({
      success: true,
      message: 'Medicines dispensed and inventory updated successfully!',
      saleId,
      saleCode,
      totalAmount
    });
  } catch (err) {
    console.error('dispenseMedicines error:', err);
    return res.status(500).json({ success: false, message: 'Failed to dispense medicines.' });
  }
}

async function getSalesHistory(req, res) {
  try {
    const [sales] = await query(`
      SELECT ps.*, p.mrn, p.full_name as patient_name
      FROM pharmacy_sales ps
      LEFT JOIN patients p ON ps.patient_id = p.id
      ORDER BY ps.created_at DESC
      LIMIT 50
    `);

    for (let sale of sales) {
      const [items] = await query('SELECT * FROM pharmacy_sale_items WHERE pharmacy_sale_id = ?', [sale.id]);
      sale.items = items;
    }

    return res.json({ success: true, data: sales });
  } catch (err) {
    console.error('getSalesHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve sales history.' });
  }
}

async function deleteMedicine(req, res) {
  try {
    const { id } = req.params;
    await query('UPDATE pharmacy_sale_items SET medicine_id = NULL WHERE medicine_id = ?', [id]);
    await query('UPDATE prescription_items SET medicine_name = medicine_name WHERE medicine_name IS NOT NULL');
    await query('DELETE FROM medicines_inventory WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Medicine deleted successfully from inventory.' });
  } catch (err) {
    console.error('deleteMedicine error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete medicine.' });
  }
}

module.exports = {
  getInventory,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  getStockAlerts,
  dispenseMedicines,
  getSalesHistory
};
