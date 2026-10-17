const { query } = require('../config/db');

async function getSettings(req, res) {
  try {
    const [settings] = await query('SELECT * FROM clinic_settings LIMIT 1');
    if (settings.length === 0) {
      return res.json({
        success: true,
        data: {
          clinic_name: 'Dream Garden PolyClinic',
          tagline: 'Comprehensive Healthcare & Diagnostic Center',
          currency_symbol: 'Rs.',
          tax_percentage: 0.00
        }
      });
    }
    return res.json({ success: true, data: settings[0] });
  } catch (err) {
    console.error('getSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve clinic settings.' });
  }
}

async function updateSettings(req, res) {
  try {
    const {
      clinic_name, tagline, address, phone, email, website,
      currency_symbol, tax_percentage, receipt_footer_note, emergency_contact
    } = req.body;

    const [existing] = await query('SELECT id FROM clinic_settings LIMIT 1');

    if (existing.length === 0) {
      await query(`
        INSERT INTO clinic_settings (
          clinic_name, tagline, address, phone, email, website,
          currency_symbol, tax_percentage, receipt_footer_note, emergency_contact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        clinic_name || 'Dream Garden PolyClinic', tagline || '',
        address || '', phone || '', email || '', website || '',
        currency_symbol || 'Rs.', tax_percentage || 0.00,
        receipt_footer_note || '', emergency_contact || ''
      ]);
    } else {
      await query(`
        UPDATE clinic_settings SET
          clinic_name = ?, tagline = ?, address = ?, phone = ?, email = ?,
          website = ?, currency_symbol = ?, tax_percentage = ?,
          receipt_footer_note = ?, emergency_contact = ?
        WHERE id = ?
      `, [
        clinic_name, tagline, address, phone, email, website,
        currency_symbol, tax_percentage, receipt_footer_note,
        emergency_contact, existing[0].id
      ]);
    }

    return res.json({ success: true, message: 'Clinic settings updated successfully.' });
  } catch (err) {
    console.error('updateSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update clinic settings.' });
  }
}

module.exports = {
  getSettings,
  updateSettings
};
