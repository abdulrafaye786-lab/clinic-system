// ==========================================================================
// REPORTS & CLINICAL ANALYTICS COMPONENT
// ==========================================================================

const reportsComponent = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  chartTrend: null,

  async render(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="padding: 0.55rem 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <div class="card-title" style="margin-bottom: 0; font-size: 0.95rem;">
              <i class="fa-solid fa-chart-line" style="color: var(--primary);"></i> Clinic Financial & Operational Analytics
            </div>

            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">From:</span>
              <input type="date" id="rep-start-date" class="form-control" style="width: auto; padding: 0.2rem 0.45rem; height: 28px; font-size: 0.76rem;" value="${this.startDate}">
              <span style="font-size: 0.75rem; color: var(--text-muted);">To:</span>
              <input type="date" id="rep-end-date" class="form-control" style="width: auto; padding: 0.2rem 0.45rem; height: 28px; font-size: 0.76rem;" value="${this.endDate}">
              <button onclick="reportsComponent.filterReports()" class="btn btn-primary btn-sm" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">
                <i class="fa-solid fa-filter"></i> Apply
              </button>
            </div>
          </div>

          <button onclick="reportsComponent.printFinancialSummary()" class="btn btn-outline-primary btn-sm" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">
            <i class="fa-solid fa-print"></i> Print Report
          </button>
        </div>

        <div class="card-body" style="padding: 0.75rem;">
          <!-- Summary Cards -->
          <div class="stats-grid" style="margin-bottom: 0.65rem; gap: 0.5rem;">
            <div class="stat-card teal">
              <div class="stat-info">
                <div class="stat-label">Total Revenue Collected</div>
                <div class="stat-value" id="rep-total-collected">-</div>
                <div class="stat-desc">In selected period</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-teal"><i class="fa-solid fa-money-bill-wave"></i></div>
            </div>

            <div class="stat-card blue">
              <div class="stat-info">
                <div class="stat-label">Total Gross Billed</div>
                <div class="stat-value" id="rep-total-billed">-</div>
                <div class="stat-desc" id="rep-invoices-count">-</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-blue"><i class="fa-solid fa-file-invoice"></i></div>
            </div>

            <div class="stat-card amber">
              <div class="stat-info">
                <div class="stat-label">Total Discounts Given</div>
                <div class="stat-value" id="rep-total-discount">-</div>
                <div class="stat-desc">Patient concessions</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-amber"><i class="fa-solid fa-tags"></i></div>
            </div>

            <div class="stat-card rose">
              <div class="stat-info">
                <div class="stat-label">Outstanding Receivables</div>
                <div class="stat-value" id="rep-total-receivable">-</div>
                <div class="stat-desc">Pending balances</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-rose"><i class="fa-solid fa-clock"></i></div>
            </div>
          </div>

          <!-- Doctor Productivity Table -->
          <div style="margin-bottom: 0.65rem;">
            <h3 style="font-size: 0.92rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.45rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-user-doctor" style="color: var(--primary);"></i> Doctor Consultation & Revenue Breakdown
            </h3>
            <div class="table-responsive" style="border: 1px solid var(--border-color); border-radius: 8px; max-height: 180px; overflow-y: auto;">
              <table class="table table-dense">
                <thead style="background: var(--bg-card); position: sticky; top: 0; z-index: 5;">
                  <tr>
                    <th>Doctor Name</th>
                    <th>Specialty</th>
                    <th>Fee Rate</th>
                    <th>Appointments</th>
                    <th>Consultations Completed</th>
                    <th style="text-align: right;">Total Fee Generated</th>
                  </tr>
                </thead>
                <tbody id="rep-doctors-tbody">
                  <!-- Loaded dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- OPD Demographics Breakdown -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
            <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem; background: var(--bg-card);">
              <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.45rem;">
                <i class="fa-solid fa-viruses" style="color: #6366f1;"></i> Top Clinical Diagnoses
              </h4>
              <div id="rep-top-diagnoses" style="display: flex; flex-direction: column; gap: 0.35rem;">
                <!-- Diagnoses list -->
              </div>
            </div>

            <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem; background: var(--bg-card);">
              <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.45rem;">
                <i class="fa-solid fa-credit-card" style="color: var(--primary);"></i> Revenue by Payment Method
              </h4>
              <div id="rep-payment-methods" style="display: flex; flex-direction: column; gap: 0.35rem;">
                <!-- Payment methods -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.load();
  },

  filterReports() {
    const s = document.getElementById('rep-start-date').value;
    const e = document.getElementById('rep-end-date').value;
    if (s) this.startDate = s;
    if (e) this.endDate = e;
    this.load();
  },

  async load() {
    const [finRes, docRes, opdRes] = await Promise.all([
      app.api(`/reports/financial?start_date=${this.startDate}&end_date=${this.endDate}`),
      app.api(`/reports/doctors?start_date=${this.startDate}&end_date=${this.endDate}`),
      app.api('/reports/opd')
    ]);

    if (finRes.success) {
      const totals = finRes.data.totals || {};
      document.getElementById('rep-total-collected').textContent = `${app.clinic.currency} ${parseFloat(totals.total_collected || 0).toLocaleString()}`;
      document.getElementById('rep-total-billed').textContent = `${app.clinic.currency} ${parseFloat(totals.total_billed || 0).toLocaleString()}`;
      document.getElementById('rep-invoices-count').textContent = `${totals.total_invoices_count || 0} invoices issued`;
      document.getElementById('rep-total-discount').textContent = `${app.clinic.currency} ${parseFloat(totals.total_discount || 0).toLocaleString()}`;
      document.getElementById('rep-total-receivable').textContent = `${app.clinic.currency} ${parseFloat(totals.total_receivable || 0).toLocaleString()}`;

      const payMethods = finRes.data.byPaymentMethod || [];
      const payEl = document.getElementById('rep-payment-methods');
      if (payEl) {
        payEl.innerHTML = payMethods.map(p => `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0.6rem; background: #f8fafc; border-radius: 6px;">
            <span style="text-transform: uppercase; font-weight: 600; color: #475569;">${p.payment_method} (${p.count} txns)</span>
            <strong style="color: #00c853;">${app.clinic.currency} ${parseFloat(p.total).toLocaleString()}</strong>
          </div>
        `).join('');
      }
    }

    if (docRes.success) {
      const docTbody = document.getElementById('rep-doctors-tbody');
      const docs = docRes.data || [];
      if (docTbody) {
        docTbody.innerHTML = docs.map(d => `
          <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.specialty}</td>
            <td>${app.clinic.currency} ${parseFloat(d.consultation_fee).toLocaleString()}</td>
            <td>${d.total_appointments}</td>
            <td><strong style="color: #00c853;">${d.total_consultations}</strong></td>
            <td style="text-align: right;"><strong style="color: #10b981;">${app.clinic.currency} ${parseFloat(d.total_revenue).toLocaleString()}</strong></td>
          </tr>
        `).join('');
      }
    }

    if (opdRes.success) {
      const topDiag = opdRes.data.topDiagnoses || [];
      const diagEl = document.getElementById('rep-top-diagnoses');
      if (diagEl) {
        diagEl.innerHTML = topDiag.map(td => `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0.6rem; background: #e8fbf0; border-radius: 6px; border: 1px solid #bbf7d0;">
            <span style="font-weight: 600; color: #007a33;">${td.diagnosis}</span>
            <span class="badge badge-teal">${td.count} Cases</span>
          </div>
        `).join('');
      }
    }
  },

  async printFinancialSummary() {
    const finRes = await app.api(`/reports/financial?start_date=${this.startDate}&end_date=${this.endDate}`);
    const docRes = await app.api(`/reports/doctors?start_date=${this.startDate}&end_date=${this.endDate}`);
    if (!finRes.success) return;

    const totals = finRes.data.totals || {};
    const doctors = docRes.data || [];

    const printHtml = `
      <div class="prescription-layout">
        <div class="rx-header">
          <div>
            <div class="rx-clinic-title">${app.clinic.name}</div>
            <div class="rx-clinic-sub">${app.clinic.address} • Tel: ${app.clinic.phone}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.2rem; font-weight: 800; color: #00c853;">EXECUTIVE FINANCIAL SUMMARY</div>
            <div style="font-size: 0.85rem; color: #64748b;">Period: ${this.startDate} to ${this.endDate}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; background: #f8fafc; padding: 1rem; border-radius: 8px;">
          <div><span>Total Billed:</span><br><strong>${app.clinic.currency} ${parseFloat(totals.total_billed || 0).toLocaleString()}</strong></div>
          <div><span>Total Collected:</span><br><strong style="color: #10b981;">${app.clinic.currency} ${parseFloat(totals.total_collected || 0).toLocaleString()}</strong></div>
          <div><span>Total Discounts:</span><br><strong style="color: #d97706;">${app.clinic.currency} ${parseFloat(totals.total_discount || 0).toLocaleString()}</strong></div>
          <div><span>Receivables:</span><br><strong style="color: #ef4444;">${app.clinic.currency} ${parseFloat(totals.total_receivable || 0).toLocaleString()}</strong></div>
        </div>

        <h3 style="font-size: 1.05rem; margin-bottom: 0.75rem;">Doctor Performance & Payouts</h3>
        <table class="table" style="font-size: 0.85rem; border: 1px solid #e2e8f0; margin-bottom: 2rem;">
          <thead>
            <tr><th>Doctor</th><th>Specialty</th><th>Consultations</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            ${doctors.map(d => `
              <tr>
                <td><strong>${d.name}</strong></td>
                <td>${d.specialty}</td>
                <td>${d.total_consultations}</td>
                <td><strong>${app.clinic.currency} ${parseFloat(d.total_revenue).toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 4rem; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 0.75rem; color: #94a3b8;">
            <div>* Generated from Dream Garden PolyClinic ERP *</div>
            <div style="margin-top: 4px; font-weight: 700; color: #475569;">Made by AR Works.</div>
          </div>
          <div style="text-align: center; border-top: 1.5px solid #0f172a; width: 200px; padding-top: 6px;">
            <div style="font-weight: 700;">Director of Finance</div>
          </div>
        </div>
      </div>
    `;

    app.printDocument(printHtml);
  }
};
