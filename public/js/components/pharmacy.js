// ==========================================================================
// PHARMACY & INVENTORY POS COMPONENT
// ==========================================================================

const pharmacyComponent = {
  activeTab: 'pos', // 'pos', 'inventory', 'sales'
  cart: [],
  inventoryItems: [],

  async render(container) {
    container.innerHTML = `
      <!-- Pharmacy Sub Navigation -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-sm ${this.activeTab === 'pos' ? 'btn-primary' : 'btn-outline'}" onclick="pharmacyComponent.switchTab('pos')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-cash-register"></i> Dispense & Counter POS
          </button>
          <button class="btn btn-sm ${this.activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'}" onclick="pharmacyComponent.switchTab('inventory')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-boxes-stacked"></i> Medicine Inventory & Stock
          </button>
          <button class="btn btn-sm ${this.activeTab === 'sales' ? 'btn-primary' : 'btn-outline'}" onclick="pharmacyComponent.switchTab('sales')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-clock-rotate-left"></i> Dispensing Sales Log
          </button>
        </div>

        <div id="pharma-header-actions">
          <!-- Context buttons -->
        </div>
      </div>

      <div id="pharmacy-content-area">
        <!-- Tab Content -->
      </div>
    `;

    this.switchTab(this.activeTab);
  },

  switchTab(tab) {
    this.activeTab = tab;
    const actionsEl = document.getElementById('pharma-header-actions');
    const contentEl = document.getElementById('pharmacy-content-area');
    if (!contentEl) return;

    if (tab === 'pos') {
      if (actionsEl) actionsEl.innerHTML = '';
      this.renderPos(contentEl);
    } else if (tab === 'inventory') {
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button onclick="pharmacyComponent.openAddMedicineModal()" class="btn btn-primary">
            <i class="fa-solid fa-plus"></i> Add New Medicine
          </button>
        `;
      }
      this.renderInventory(contentEl);
    } else if (tab === 'sales') {
      if (actionsEl) actionsEl.innerHTML = '';
      this.renderSales(contentEl);
    }
  },

  // 1. DISPENSING POS SCREEN
  async renderPos(container) {
    const [invRes, patRes] = await Promise.all([
      app.api('/pharmacy/inventory'),
      app.api('/patients?limit=100')
    ]);

    this.inventoryItems = invRes.data || [];
    const patients = patRes.data || [];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 400px; gap: 1.5rem; align-items: flex-start;">
        
        <!-- Left: Medicine Item Selection Grid & Fast Search -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <div class="card-title">
              <i class="fa-solid fa-pills" style="color: #00c853;"></i> Available Medicine Catalog
            </div>
            <div class="search-box">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="pos-med-search" placeholder="Search drug name, generic, strength..." oninput="pharmacyComponent.filterPosMeds(this.value)">
            </div>
          </div>
          <div class="card-body" style="padding: 1rem; max-height: 540px; overflow-y: auto;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.85rem;" id="pos-med-grid">
              <!-- Loaded dynamically -->
            </div>
          </div>
        </div>

        <!-- Right: Dispensing Cart & Checkout Counter -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header" style="background: #f8fafc;">
            <div class="card-title">
              <i class="fa-solid fa-cart-shopping" style="color: #0284c7;"></i> Dispensing Cart
            </div>
            <button onclick="pharmacyComponent.clearCart()" class="btn btn-outline btn-sm" title="Clear Cart">Clear</button>
          </div>

          <div class="card-body" style="padding: 1.25rem;">
            <!-- Customer / Patient Selector -->
            <div class="form-group" style="margin-bottom: 0.85rem;">
              <label class="form-label">Customer / Registered Patient</label>
              <select id="pos-patient-select" class="form-control" onchange="pharmacyComponent.handlePatientSelect(this.value)">
                <option value="">-- Walk-in Direct Customer --</option>
                ${patients.map(p => `<option value="${p.id}" data-name="${p.full_name}" data-phone="${p.phone}">${p.mrn} - ${p.full_name}</option>`).join('')}
              </select>
            </div>

            <div class="form-row" style="margin-bottom: 0.85rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <input type="text" id="pos-cust-name" class="form-control" placeholder="Customer Name" value="Walk-in Customer">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <input type="tel" id="pos-cust-phone" class="form-control" placeholder="Phone (Optional)">
              </div>
            </div>

            <!-- Cart Table -->
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; max-height: 220px; overflow-y: auto; margin-bottom: 1rem;">
              <table class="table" style="font-size: 0.8rem;">
                <thead style="background: #f8fafc;">
                  <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr>
                </thead>
                <tbody id="pos-cart-tbody">
                  <tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 1.5rem;">Cart is empty. Click medicines on the left to add.</td></tr>
                </tbody>
              </table>
            </div>

            <!-- Totals & Payment -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.85rem;">
                <span style="color: #64748b;">Subtotal:</span>
                <strong id="pos-subtotal">${app.clinic.currency} 0.00</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.85rem;">
                <span style="color: var(--text-muted);">Discount (${app.clinic.currency}):</span>
                <input type="number" id="pos-discount" class="form-control" style="width: 90px; padding: 0.2rem 0.5rem; text-align: right;" value="0" min="0" oninput="pharmacyComponent.recalcCartTotals()">
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 0.5rem; font-size: 1.15rem; color: var(--text-main);">
                <span style="font-weight: 800;">Net Payable:</span>
                <strong style="color: #00c853;" id="pos-net-total">${app.clinic.currency} 0.00</strong>
              </div>
            </div>

            <div class="form-group" style="margin-top: 1rem; margin-bottom: 1.25rem;">
              <label class="form-label">Payment Mode</label>
              <select id="pos-pay-method" class="form-control">
                <option value="cash">Cash Settlement</option>
                <option value="card">Credit / Debit Card</option>
                <option value="online">Online / Bank Transfer</option>
              </select>
            </div>

            <button onclick="pharmacyComponent.checkoutAndPrint()" class="btn btn-primary btn-lg" style="width: 100%;">
              <i class="fa-solid fa-print"></i> Dispense & Print Thermal Slip
            </button>
          </div>
        </div>
      </div>
    `;

    this.cart = [];
    this.filterPosMeds('');
  },

  filterPosMeds(query) {
    const grid = document.getElementById('pos-med-grid');
    if (!grid) return;

    const q = query.toLowerCase().trim();
    const filtered = this.inventoryItems.filter(m => 
      m.brand_name.toLowerCase().includes(q) || 
      m.generic_name.toLowerCase().includes(q) || 
      m.strength.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 2rem;">No medicines found matching "${query}".</div>`;
      return;
    }

    grid.innerHTML = filtered.map(m => {
      const isOut = m.stock_quantity <= 0;
      const isLow = m.stock_quantity <= m.min_stock_alert;

      return `
        <div style="background: var(--bg-card); border: 1px solid ${isOut ? '#fca5a5' : 'var(--border-color)'}; border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s;" class="pos-med-card">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <strong style="color: var(--text-main); font-size: 0.95rem;">${m.brand_name}</strong>
              <span class="badge ${isOut ? 'badge-rose' : (isLow ? 'badge-amber' : 'badge-teal')}" style="font-size: 0.68rem;">
                ${m.stock_quantity} in stock
              </span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${m.generic_name}</div>
            <div style="font-size: 0.72rem; color: #0284c7; margin-top: 0.15rem;">${m.dosage_form} • ${m.strength}</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; border-top: 1px dashed #f1f5f9; padding-top: 0.5rem;">
            <span style="font-weight: 800; font-size: 0.95rem; color: #00c853;">${app.clinic.currency} ${parseFloat(m.selling_price).toLocaleString()}</span>
            <button type="button" ${isOut ? 'disabled' : ''} onclick="pharmacyComponent.addToCart(${m.id})" class="btn btn-outline-primary btn-sm">
              <i class="fa-solid fa-cart-plus"></i> Add
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  addToCart(medId) {
    const med = this.inventoryItems.find(m => m.id === medId);
    if (!med) return;

    if (med.stock_quantity <= 0) {
      app.toast(`${med.brand_name} is currently out of stock!`, 'error');
      return;
    }

    const existing = this.cart.find(c => c.medicine_id === medId);
    if (existing) {
      if (existing.quantity >= med.stock_quantity) {
        app.toast(`Cannot exceed available stock of ${med.stock_quantity}.`, 'warning');
        return;
      }
      existing.quantity += 1;
    } else {
      this.cart.push({
        medicine_id: med.id,
        medicine_name: `${med.brand_name} ${med.strength}`,
        batch_no: med.batch_no,
        unit_price: parseFloat(med.selling_price),
        max_stock: med.stock_quantity,
        quantity: 1
      });
    }

    this.renderCartTable();
  },

  updateCartQty(medId, delta) {
    const item = this.cart.find(c => c.medicine_id === medId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(c => c.medicine_id !== medId);
    } else if (item.quantity > item.max_stock) {
      item.quantity = item.max_stock;
      app.toast(`Max available stock is ${item.max_stock}.`, 'warning');
    }

    this.renderCartTable();
  },

  removeFromCart(medId) {
    this.cart = this.cart.filter(c => c.medicine_id !== medId);
    this.renderCartTable();
  },

  clearCart() {
    this.cart = [];
    this.renderCartTable();
  },

  renderCartTable() {
    const tbody = document.getElementById('pos-cart-tbody');
    if (!tbody) return;

    if (this.cart.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 1.5rem;">Cart is empty. Click medicines to add.</td></tr>`;
      this.recalcCartTotals();
      return;
    }

    tbody.innerHTML = this.cart.map(c => `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${c.medicine_name}</div>
          <small style="color: var(--text-muted);">Batch: ${c.batch_no}</small>
        </td>
        <td style="white-space: nowrap;">
          <button onclick="pharmacyComponent.updateCartQty(${c.medicine_id}, -1)" class="btn btn-outline btn-sm" style="padding: 0.1rem 0.4rem;">-</button>
          <span style="font-weight: 700; margin: 0 0.35rem;">${c.quantity}</span>
          <button onclick="pharmacyComponent.updateCartQty(${c.medicine_id}, 1)" class="btn btn-outline btn-sm" style="padding: 0.1rem 0.4rem;">+</button>
        </td>
        <td>${app.clinic.currency} ${c.unit_price}</td>
        <td><strong>${app.clinic.currency} ${(c.quantity * c.unit_price).toFixed(2)}</strong></td>
        <td>
          <button onclick="pharmacyComponent.removeFromCart(${c.medicine_id})" style="background: none; border: none; color: #ef4444; cursor: pointer;">
            <i class="fa-solid fa-times"></i>
          </button>
        </td>
      </tr>
    `).join('');

    this.recalcCartTotals();
  },

  recalcCartTotals() {
    let subtotal = 0;
    this.cart.forEach(c => subtotal += (c.quantity * c.unit_price));

    const discInput = document.getElementById('pos-discount');
    const discount = discInput ? parseFloat(discInput.value) || 0 : 0;
    const net = Math.max(0, subtotal - discount);

    const subEl = document.getElementById('pos-subtotal');
    const netEl = document.getElementById('pos-net-total');

    if (subEl) subEl.textContent = `${app.clinic.currency} ${subtotal.toFixed(2)}`;
    if (netEl) netEl.textContent = `${app.clinic.currency} ${net.toFixed(2)}`;
  },

  handlePatientSelect(patientId) {
    const sel = document.getElementById('pos-patient-select');
    const opt = sel.options[sel.selectedIndex];
    if (patientId && opt) {
      document.getElementById('pos-cust-name').value = opt.getAttribute('data-name');
      document.getElementById('pos-cust-phone').value = opt.getAttribute('data-phone');
    } else {
      document.getElementById('pos-cust-name').value = 'Walk-in Customer';
      document.getElementById('pos-cust-phone').value = '';
    }
  },

  async checkoutAndPrint() {
    if (this.cart.length === 0) {
      app.toast('Your cart is empty. Please add medicines first.', 'warning');
      return;
    }

    const patient_id = document.getElementById('pos-patient-select').value || null;
    const customer_name = document.getElementById('pos-cust-name').value.trim() || 'Walk-in Customer';
    const customer_phone = document.getElementById('pos-cust-phone').value.trim() || null;
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
    const payment_method = document.getElementById('pos-pay-method').value;

    const res = await app.api('/pharmacy/dispense', {
      method: 'POST',
      body: JSON.stringify({
        patient_id,
        customer_name,
        customer_phone,
        discount,
        payment_method,
        items: this.cart
      })
    });

    if (res.success) {
      app.toast(`Sale #${res.saleCode} completed! Stock deducted.`, 'success');

      // Print POS Thermal Slip
      this.printPharmacyReceipt(res.saleCode, customer_name, customer_phone, this.cart, discount, res.totalAmount, payment_method);

      // Reset cart and reload inventory
      this.cart = [];
      this.renderPos(document.getElementById('pharmacy-content-area'));
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Dispensing failed', 'error');
    }
  },

  printPharmacyReceipt(saleCode, customerName, phone, items, discount, totalAmount, payMethod) {
    let subtotal = 0;
    items.forEach(i => subtotal += (i.quantity * i.unit_price));

    const receiptHtml = `
      <div class="thermal-receipt">
        <div class="center bold title">${app.clinic.name}</div>
        <div class="center" style="font-size: 11px;">PHARMACY & DISPENSARY RECEIPT</div>
        <div class="center" style="font-size: 10px;">${app.clinic.address} • ${app.clinic.phone}</div>
        <div class="divider"></div>
        <div class="row-flex"><span>Receipt #:</span><span class="bold">${saleCode}</span></div>
        <div class="row-flex"><span>Customer:</span><span class="bold">${customerName}</span></div>
        ${phone ? `<div class="row-flex"><span>Phone:</span><span>${phone}</span></div>` : ''}
        <div class="row-flex"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
        <div class="divider"></div>
        <div class="bold" style="margin-bottom: 4px;">DISPENSED MEDICINES:</div>
        ${items.map(it => `
          <div style="margin-bottom: 3px;">
            <div><strong>${it.medicine_name}</strong></div>
            <div class="row-flex" style="font-size: 11px; color: #333;">
              <span>${it.quantity} x ${app.clinic.currency} ${it.unit_price.toFixed(2)}</span>
              <span>${app.clinic.currency} ${(it.quantity * it.unit_price).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="row-flex"><span>Subtotal:</span><span>${app.clinic.currency} ${subtotal.toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="row-flex"><span>Discount:</span><span>-${app.clinic.currency} ${discount.toFixed(2)}</span></div>` : ''}
        <div class="row-flex bold" style="font-size: 14px; margin-top: 4px;">
          <span>NET TOTAL:</span><span>${app.clinic.currency} ${parseFloat(totalAmount).toFixed(2)}</span>
        </div>
        <div class="row-flex"><span>Payment Method:</span><span style="text-transform: uppercase;">${payMethod}</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px;">* Medicines once sold cannot be returned if unsealed *</div>
        <div class="center" style="font-size: 10px; margin-top: 4px;">Thank you! Wishing you good health.</div>
        <div class="center" style="font-size: 10px; margin-top: 6px; font-weight: 700; color: #475569; letter-spacing: 0.5px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">Made by AR Works.</div>
      </div>
    `;

    app.printDocument(receiptHtml);
  },

  // 2. INVENTORY MANAGEMENT SCREEN
  async renderInventory(container) {
    const res = await app.api('/pharmacy/inventory');
    const items = res.data || [];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div class="card-title">
              <i class="fa-solid fa-boxes-stacked" style="color: #00c853;"></i> Drug Inventory & Stock Management
            </div>
            <div class="search-box">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search stock by brand, generic, batch..." oninput="pharmacyComponent.filterInventoryTable(this.value)">
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button onclick="pharmacyComponent.loadStockAlertsModal()" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-bell"></i> Stock Alerts
            </button>
          </div>
        </div>

        <div class="table-responsive table-viewport">
          <table class="table table-dense" style="min-width: 1050px;">
            <thead>
              <tr>
                <th style="width: 120px;">Item Code</th>
                <th style="min-width: 220px;">Brand & Generic Name</th>
                <th style="width: 130px;">Category</th>
                <th style="width: 140px;">Dosage / Strength</th>
                <th style="width: 120px;">Batch #</th>
                <th style="width: 120px;">Expiry Date</th>
                <th style="width: 110px;">Retail Price</th>
                <th style="width: 100px;">Stock Qty</th>
                <th style="width: 110px;">Status</th>
                <th style="text-align: right; min-width: 160px;">Action</th>
              </tr>
            </thead>
            <tbody id="inventory-table-tbody">
              ${items.map(m => {
                const isOut = m.stock_quantity <= 0;
                const isLow = m.stock_quantity <= m.min_stock_alert;

                return `
                  <tr>
                    <td class="cell-nowrap"><span style="font-family: monospace; font-weight: 700; color: #00c853; white-space: nowrap;">${m.item_code}</span></td>
                    <td class="patient-details-cell">
                      <div style="font-weight: 700; color: var(--text-main); white-space: nowrap;">${m.brand_name}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; margin-top: 1px;">${m.generic_name} • ${m.manufacturer}</div>
                    </td>
                    <td class="cell-nowrap"><span class="badge badge-gray">${m.category}</span></td>
                    <td class="cell-nowrap">${m.dosage_form} ${m.strength}</td>
                    <td class="cell-nowrap"><span style="font-family: monospace; font-size: 0.8rem; white-space: nowrap;">${m.batch_no}</span></td>
                    <td class="cell-nowrap"><strong>${new Date(m.expiry_date).toLocaleDateString()}</strong></td>
                    <td class="cell-nowrap"><strong style="color: #00c853; white-space: nowrap;">${app.clinic.currency} ${parseFloat(m.selling_price).toLocaleString()}</strong></td>
                    <td class="cell-nowrap">
                      <span style="font-weight: 800; font-size: 1.05rem; color: ${isOut ? '#ef4444' : (isLow ? '#d97706' : '#10b981')};">
                        ${m.stock_quantity}
                      </span>
                    </td>
                    <td class="cell-nowrap">
                      <span class="badge ${isOut ? 'badge-rose' : (isLow ? 'badge-amber' : 'badge-green')}">
                        ${m.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td class="cell-nowrap" style="text-align: right; white-space: nowrap;">
                      <button onclick="pharmacyComponent.openEditMedicineModal(${m.id})" class="btn btn-outline-primary btn-sm">
                        <i class="fa-solid fa-pen"></i> Edit
                      </button>
                      <button onclick="pharmacyComponent.deleteMedicine(${m.id}, '${(m.brand_name || '').replace(/'/g, "\\'")}')" class="btn btn-outline-danger btn-sm" style="color: #ef4444; border-color: #fca5a5;" title="Delete Medicine">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openAddMedicineModal() {
    const bodyHtml = `
      <form id="add-med-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Brand Name</label>
            <input type="text" id="nm-brand" class="form-control" placeholder="e.g. Concor" required>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Generic Name</label>
            <input type="text" id="nm-generic" class="form-control" placeholder="e.g. Bisoprolol Fumarate" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="nm-category" class="form-control">
              <option value="Cardiovascular">Cardiovascular</option>
              <option value="Antibiotic">Antibiotic</option>
              <option value="Analgesic">Analgesic / Painkiller</option>
              <option value="Anti-Diabetic">Anti-Diabetic</option>
              <option value="Anti-Ulcer">Anti-Ulcer / PPI</option>
              <option value="Respiratory">Respiratory</option>
              <option value="Dermatology">Dermatology</option>
              <option value="General">General</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Dosage Form</label>
            <select id="nm-form" class="form-control">
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
              <option value="Inhaler">Inhaler</option>
              <option value="Ointment">Ointment / Cream</option>
              <option value="Drops">Drops</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Strength</label>
            <input type="text" id="nm-strength" class="form-control" placeholder="e.g. 5mg, 500mg, 120ml" value="500mg">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Batch Number</label>
            <input type="text" id="nm-batch" class="form-control" placeholder="e.g. BTH-2026A" required>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Expiry Date</label>
            <input type="date" id="nm-expiry" class="form-control" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cost Price (${app.clinic.currency})</label>
            <input type="number" step="0.1" id="nm-cost" class="form-control" placeholder="100.00">
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Selling / Retail Price (${app.clinic.currency})</label>
            <input type="number" step="0.1" id="nm-selling" class="form-control" placeholder="140.00" required>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Initial Stock Qty</label>
            <input type="number" id="nm-stock" class="form-control" placeholder="100" required>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="pharmacyComponent.submitAddMedicine()"><i class="fa-solid fa-save"></i> Save Medicine</button>
    `;

    app.openModal('<i class="fa-solid fa-plus-circle"></i> Add New Medicine to Inventory', bodyHtml, footerHtml, 'modal-lg');
  },

  async submitAddMedicine() {
    const brand_name = document.getElementById('nm-brand').value.trim();
    const generic_name = document.getElementById('nm-generic').value.trim();
    const category = document.getElementById('nm-category').value;
    const dosage_form = document.getElementById('nm-form').value;
    const strength = document.getElementById('nm-strength').value.trim();
    const batch_no = document.getElementById('nm-batch').value.trim();
    const expiry_date = document.getElementById('nm-expiry').value;
    const cost_price = document.getElementById('nm-cost').value;
    const selling_price = document.getElementById('nm-selling').value;
    const stock_quantity = document.getElementById('nm-stock').value;

    if (!brand_name || !generic_name || !batch_no || !expiry_date || !selling_price) {
      app.toast('Please fill all required fields.', 'error');
      return;
    }

    const res = await app.api('/pharmacy/inventory', {
      method: 'POST',
      body: JSON.stringify({
        brand_name,
        generic_name,
        category,
        dosage_form,
        strength,
        batch_no,
        expiry_date,
        cost_price,
        selling_price,
        stock_quantity: parseInt(stock_quantity) || 0
      })
    });

    if (res.success) {
      app.toast('Medicine added successfully!', 'success');
      app.closeModal();
      this.renderInventory(document.getElementById('pharmacy-content-area'));
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to add medicine', 'error');
    }
  },

  async openEditMedicineModal(id) {
    const res = await app.api('/pharmacy/inventory');
    if (!res.success) return;
    const m = res.data.find(item => item.id === id);
    if (!m) return;

    const bodyHtml = `
      <form id="edit-med-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Brand Name</label>
            <input type="text" id="em-brand" class="form-control" value="${m.brand_name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Generic Name</label>
            <input type="text" id="em-generic" class="form-control" value="${m.generic_name}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Selling Price (${app.clinic.currency})</label>
            <input type="number" step="0.1" id="em-price" class="form-control" value="${m.selling_price}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Stock Quantity Available</label>
            <input type="number" id="em-stock" class="form-control" value="${m.stock_quantity}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Min Stock Alert Level</label>
            <input type="number" id="em-alert" class="form-control" value="${m.min_stock_alert}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Batch #</label>
            <input type="text" id="em-batch" class="form-control" value="${m.batch_no}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Expiry Date</label>
            <input type="date" id="em-expiry" class="form-control" value="${m.expiry_date.slice(0, 10)}" required>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <button class="btn btn-outline-danger" onclick="pharmacyComponent.deleteMedicine(${m.id}, '${m.brand_name.replace(/'/g, "\\'")}')" style="color: #ef4444; border-color: #fca5a5;"><i class="fa-solid fa-trash-can"></i> Delete</button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="pharmacyComponent.submitEditMedicine(${m.id})"><i class="fa-solid fa-save"></i> Save Changes</button>
        </div>
      </div>
    `;

    app.openModal(`<i class="fa-solid fa-pen-to-square"></i> Update Stock: ${m.brand_name}`, bodyHtml, footerHtml);
  },

  async deleteMedicine(id, name) {
    if (!confirm(`Are you sure you want to permanently delete "${name}" from inventory? This action cannot be undone.`)) {
      return;
    }
    const res = await app.api(`/pharmacy/inventory/${id}`, {
      method: 'DELETE'
    });
    if (res.success) {
      app.toast(`Medicine "${name}" deleted from database.`, 'success');
      app.closeModal();
      this.renderInventory(document.getElementById('pharmacy-content-area'));
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to delete medicine', 'error');
    }
  },

  async submitEditMedicine(id) {
    const brand_name = document.getElementById('em-brand').value.trim();
    const generic_name = document.getElementById('em-generic').value.trim();
    const selling_price = document.getElementById('em-price').value;
    const stock_quantity = parseInt(document.getElementById('em-stock').value) || 0;
    const min_stock_alert = parseInt(document.getElementById('em-alert').value) || 20;
    const batch_no = document.getElementById('em-batch').value.trim();
    const expiry_date = document.getElementById('em-expiry').value;

    const res = await app.api(`/pharmacy/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        brand_name,
        generic_name,
        selling_price,
        stock_quantity,
        min_stock_alert,
        batch_no,
        expiry_date
      })
    });

    if (res.success) {
      app.toast('Medicine inventory updated successfully!', 'success');
      app.closeModal();
      this.renderInventory(document.getElementById('pharmacy-content-area'));
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to update medicine', 'error');
    }
  },

  // 3. SALES LOG SCREEN
  async renderSales(container) {
    const res = await app.api('/pharmacy/sales');
    const sales = res.data || [];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i class="fa-solid fa-clock-rotate-left" style="color: #00c853;"></i> Dispensing Transactions History
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Receipt / Sale #</th>
                <th>Customer / Patient</th>
                <th>Dispensed Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Total Paid</th>
                <th>Dispensed By</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              ${sales.length === 0 ? '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #94a3b8;">No dispensing history recorded yet.</td></tr>' : `
                ${sales.map(s => `
                  <tr>
                    <td><strong style="font-family: monospace; color: #00c853;">${s.sale_code}</strong></td>
                    <td>
                      <div style="font-weight: 700;">${s.customer_name}</div>
                      ${s.customer_phone ? `<small style="color: #64748b;">${s.customer_phone}</small>` : ''}
                    </td>
                    <td>
                      ${(s.items || []).map(it => `<div>${it.medicine_name} (${it.quantity}x)</div>`).join('')}
                    </td>
                    <td>${app.clinic.currency} ${parseFloat(s.subtotal).toLocaleString()}</td>
                    <td>${app.clinic.currency} ${parseFloat(s.discount).toLocaleString()}</td>
                    <td><strong style="color: #10b981;">${app.clinic.currency} ${parseFloat(s.total_amount).toLocaleString()}</strong></td>
                    <td><small style="color: #64748b;">${s.dispensed_by}</small></td>
                    <td>${new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                `).join('')}
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
