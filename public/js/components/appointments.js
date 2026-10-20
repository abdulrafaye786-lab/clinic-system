// ==========================================================================
// APPOINTMENTS & OPD QUEUE COMPONENT (COMPACT & STEP-BY-STEP WORKFLOW)
// ==========================================================================

const appointmentsComponent = {
  selectedDate: (typeof app !== 'undefined' && app.globalSelectedDate) ? app.globalSelectedDate : (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })(),
  selectedDoctor: '',
  selectedStatus: '',

  async render(container) {
    if (typeof app !== 'undefined' && app.globalSelectedDate) {
      this.selectedDate = app.globalSelectedDate;
    }
    const docRes = await app.api('/doctors');
    const doctors = docRes.data || [];

    const todayStr = this.getLocalISODate(new Date());
    const dTomorrow = new Date(); dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomStr = this.getLocalISODate(dTomorrow);
    const dYest = new Date(); dYest.setDate(dYest.getDate() - 1);
    const yestStr = this.getLocalISODate(dYest);

    container.innerHTML = `
      <div class="card u-morphism-card">
        <div class="card-header" style="padding: 0.55rem 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
            <div class="card-title" style="margin-bottom: 0; font-size: 0.95rem;">
              <i class="fa-solid fa-calendar-check" style="color: var(--primary);"></i> OPD Appointments & Patient Queue
            </div>
            <span class="badge badge-teal" id="stat-total-appts-pill" style="font-weight: 800; font-size: 0.72rem; padding: 0.15rem 0.45rem;">0 Bookings</span>

            <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
              <!-- Interactive Date Picker & Navigation Buttons (Task 5: Strict Date Isolation) -->
              <div style="display: flex; align-items: center; gap: 0.25rem; background: var(--bg-card); padding: 0.12rem 0.4rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-body); margin: 0; display: flex; align-items: center; gap: 3px;">
                  <i class="fa-regular fa-calendar" style="color: var(--primary);"></i> Date:
                </label>
                <input type="date" id="appt-date-picker-input" class="form-control" style="width: auto; padding: 0.08rem 0.35rem; font-weight: 700; font-size: 0.74rem; height: 26px;" value="${this.selectedDate}" onchange="appointmentsComponent.handleDateChange(this.value)">
              </div>

              <div class="btn-group" style="display: flex; gap: 2px;">
                <button type="button" id="appt-btn-yesterday" class="btn btn-sm ${this.selectedDate === yestStr ? 'btn-primary' : 'btn-outline'}" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 700; height: 26px;" onclick="appointmentsComponent.setDatePreset('yesterday')">Yesterday</button>
                <button type="button" id="appt-btn-today" class="btn btn-sm ${this.selectedDate === todayStr ? 'btn-primary' : 'btn-outline'}" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 700; height: 26px;" onclick="appointmentsComponent.setDatePreset('today')">Today</button>
                <button type="button" id="appt-btn-tomorrow" class="btn btn-sm ${this.selectedDate === tomStr ? 'btn-primary' : 'btn-outline'}" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; font-weight: 700; height: 26px;" onclick="appointmentsComponent.setDatePreset('tomorrow')">Tomorrow</button>
              </div>

              <span class="badge badge-gray" style="font-size: 0.74rem; padding: 0.25rem 0.5rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
                <span id="appt-date-display-label">${new Date((this.selectedDate || this.getLocalISODate()) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </span>
              
              <select id="appt-doc-filter" class="form-control" style="width: auto; padding: 0.2rem 0.5rem; font-weight: 600; font-size: 0.76rem; height: 28px;" onchange="appointmentsComponent.handleDocChange(this.value)">
                <option value="">-- All Doctors --</option>
                ${doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialty})</option>`).join('')}
              </select>

              <select id="appt-status-filter" class="form-control" style="width: auto; padding: 0.2rem 0.5rem; font-weight: 600; font-size: 0.76rem; height: 28px;" onchange="appointmentsComponent.handleStatusChange(this.value)">
                <option value="">-- All Statuses --</option>
                <option value="scheduled">Scheduled (Unpaid)</option>
                <option value="waiting">Checked In / Waiting</option>
                <option value="in_consultation">In Consultation</option>
                <option value="completed">Completed & Billed</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 0.4rem;">
            <button onclick="app.openBookAppointmentModal(null, null, appointmentsComponent.selectedDate)" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;">
              <i class="fa-solid fa-calendar-plus"></i> + Book Appointment
            </button>
          </div>
        </div>

        <div class="table-responsive table-viewport">
          <table class="table table-dense" style="width: 100%;">
            <thead style="position: sticky; top: 0; z-index: 5;">
              <tr style="background: var(--bg-card); border-bottom: 2px solid var(--border-color);">
                <th style="width: 85px;">MRN #</th>
                <th>Patient Details</th>
                <th>Consultant Doctor</th>
                <th>Recorded Vitals</th>
                <th>Queue Status</th>
                <th>Billing Status</th>
                <th style="text-align: right;">Workflow Action</th>
              </tr>
            </thead>
            <tbody id="appointments-table-body">
              <tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: #94a3b8;">Loading appointments...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.load();
  },

  getLocalISODate(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  setDatePreset(preset) {
    const d = new Date();
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const newDate = this.getLocalISODate(d);
    this.handleDateChange(newDate);
  },

  handleDateChange(date) {
    this.selectedDate = date;
    if (typeof app !== 'undefined') {
      app.globalSelectedDate = date;
    }
    const input = document.getElementById('appt-date-picker-input');
    if (input) input.value = date;

    const todayStr = this.getLocalISODate(new Date());
    const dTomorrow = new Date(); dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomStr = this.getLocalISODate(dTomorrow);
    const dYest = new Date(); dYest.setDate(dYest.getDate() - 1);
    const yestStr = this.getLocalISODate(dYest);

    const btnYest = document.getElementById('appt-btn-yesterday');
    const btnToday = document.getElementById('appt-btn-today');
    const btnTom = document.getElementById('appt-btn-tomorrow');
    if (btnYest) { btnYest.className = date === yestStr ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline'; }
    if (btnToday) { btnToday.className = date === todayStr ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline'; }
    if (btnTom) { btnTom.className = date === tomStr ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline'; }

    this.load();
  },

  handleDocChange(docId) {
    this.selectedDoctor = docId;
    this.load();
  },

  handleStatusChange(status) {
    this.selectedStatus = status;
    this.load();
  },

  async load() {
    const labelEl = document.getElementById('appt-date-display-label');
    if (labelEl) {
      labelEl.textContent = new Date((this.selectedDate || new Date().toISOString().slice(0,10)) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    const input = document.getElementById('appt-date-picker-input');
    if (input && input.value !== this.selectedDate) {
      input.value = this.selectedDate;
    }

    let url = `/appointments?date=${this.selectedDate}`;
    if (this.selectedDoctor) url += `&doctor_id=${this.selectedDoctor}`;
    if (this.selectedStatus) url += `&status=${this.selectedStatus}`;

    const renderAppointments = (data) => {
      const tbody = document.getElementById('appointments-table-body');
      if (!tbody) return;

      const appointments = data || [];

      // Calculate metrics
      const total = appointments.length;
      const waiting = appointments.filter(a => a.status === 'waiting').length;
      const consulting = appointments.filter(a => a.status === 'in_consultation').length;
      const completed = appointments.filter(a => a.status === 'completed').length;

      const elTotal = document.getElementById('stat-total-appts');
      const elWaiting = document.getElementById('stat-waiting-appts');
      const elConsulting = document.getElementById('stat-consulting-appts');
      const elCompleted = document.getElementById('stat-completed-appts');

      if (elTotal) elTotal.textContent = total;
      if (elWaiting) elWaiting.textContent = waiting;
      if (elConsulting) elConsulting.textContent = consulting;
      if (elCompleted) elCompleted.textContent = completed;

      const pill = document.getElementById('stat-total-appts-pill');
      if (pill) pill.textContent = `${total} Booking${total === 1 ? '' : 's'}`;

      if (appointments.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 3rem; color: #94a3b8;">
              <i class="fa-regular fa-calendar-xmark" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; color: #cbd5e1;"></i>
              No appointments found for selected date and filters.
            </td>
          </tr>
        `;
        return;
      }

      const avatarColors = ['avatar-teal', 'avatar-blue', 'avatar-purple', 'avatar-indigo', 'avatar-rose', 'avatar-amber', 'avatar-emerald'];

      tbody.innerHTML = appointments.map((a, idx) => {
        const avatarColor = avatarColors[idx % avatarColors.length];
        const initials = (a.patient_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

        let badgeClass = 'badge-gray';
        let beaconDot = '';
        let statusLabel = a.status.replace('_', ' ');

        if (a.status === 'in_consultation') {
          badgeClass = 'badge-blue';
          beaconDot = '<span class="pulse-dot blue"></span> ';
          statusLabel = 'With Doctor';
        } else if (a.status === 'waiting') {
          badgeClass = 'badge-amber';
          beaconDot = '<span class="pulse-dot amber"></span> ';
          statusLabel = 'Checked In / Waiting';
        } else if (a.status === 'completed') {
          badgeClass = 'badge-green';
          beaconDot = '<span class="pulse-dot green"></span> ';
          statusLabel = 'Completed';
        } else if (a.status === 'scheduled') {
          badgeClass = 'badge-purple';
          statusLabel = 'Scheduled';
        } else if (a.status === 'cancelled') {
          badgeClass = 'badge-rose';
          statusLabel = 'Cancelled';
        }

        const hasVitals = Boolean(a.systolic_bp || a.diastolic_bp || a.temperature_f || a.pulse_rate || a.spo2 || a.blood_sugar_random || a.weight_kg);

        // Vitals summary badge
        let vitalsHtml = `<span style="font-size: 0.76rem; color: #94a3b8; font-style: italic;"><i class="fa-solid fa-heart-circle-exclamation" style="color: #cbd5e1;"></i> Pending</span>`;
        if (hasVitals) {
          let bpChipClass = 'vital-chip-bp';
          if (a.systolic_bp >= 140 || a.diastolic_bp >= 90) {
            bpChipClass = 'vital-chip-bp-alert';
          } else if (a.systolic_bp >= 120 || a.diastolic_bp >= 80) {
            bpChipClass = 'vital-chip-bp-warn';
          }

          vitalsHtml = `
            <div class="vitals-summary-box">
              ${a.systolic_bp && a.diastolic_bp ? `
                <span class="vital-chip ${bpChipClass}" title="Blood Pressure">
                  <i class="fa-solid fa-heart-pulse"></i> ${a.systolic_bp}/${a.diastolic_bp}
                </span>
              ` : ''}
              ${a.pulse_rate ? `
                <span class="vital-chip vital-chip-pulse" title="Pulse Rate">
                  <i class="fa-solid fa-wave-square"></i> ${a.pulse_rate}
                </span>
              ` : ''}
              ${a.temperature_f ? `
                <span class="vital-chip vital-chip-temp" title="Temperature">
                  <i class="fa-solid fa-temperature-half"></i> ${a.temperature_f}°F
                </span>
              ` : ''}
              ${a.spo2 ? `
                <span class="vital-chip vital-chip-spo2" title="Blood Oxygen SpO2">
                  <i class="fa-solid fa-lungs"></i> ${a.spo2}%
                </span>
              ` : ''}
              ${a.weight_kg && !a.systolic_bp && !a.pulse_rate ? `
                <span class="vital-chip vital-chip-weight" title="Weight">
                  <i class="fa-solid fa-weight-scale"></i> ${a.weight_kg}kg
                </span>
              ` : ''}
            </div>
          `;
        }

        // Billing status badge
        let billingBadge = `<span class="badge badge-gray"><i class="fa-regular fa-clock"></i> Unbilled</span>`;
        if (a.invoice_id) {
          if (a.invoice_payment_status === 'paid') {
            billingBadge = `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Paid (${app.clinic.currency} ${parseFloat(a.invoice_total || 0).toLocaleString()})</span>`;
          } else {
            billingBadge = `<span class="badge badge-amber"><i class="fa-solid fa-triangle-exclamation"></i> Unpaid Bill</span>`;
          }
        }

        const vitalsObj = JSON.stringify({
          systolic_bp: a.systolic_bp,
          diastolic_bp: a.diastolic_bp,
          pulse_rate: a.pulse_rate,
          temperature_f: a.temperature_f,
          spo2: a.spo2,
          weight_kg: a.weight_kg,
          height_cm: a.height_cm,
          bmi: a.bmi,
          blood_sugar_random: a.blood_sugar_random
        }).replace(/"/g, '&quot;');

        let nextStepActionHtml = '';
        const isPaidOrCompleted = a.status === 'completed' || a.invoice_payment_status === 'paid';

        if (isPaidOrCompleted) {
          nextStepActionHtml = '';
        } else if (a.status === 'scheduled') {
          nextStepActionHtml = `
            <button onclick="appointmentsComponent.directCheckIn(${a.id})" class="btn btn-primary btn-sm" title="Check In Patient" style="box-shadow: 0 2px 8px rgba(0, 200, 83, 0.3);">
              <i class="fa-solid fa-user-check"></i> Check In
            </button>
          `;
        } else if (a.status === 'waiting') {
          if (!hasVitals) {
            nextStepActionHtml = `
              <button onclick="app.openCheckInVitalsModal(${a.id}, ${a.patient_id}, '${(a.doctor_name || '').replace(/'/g, "\\'")}', '${(a.patient_name || '').replace(/'/g, "\\'")}', '', ${vitalsObj}, ${a.doctor_id}, ${a.consultation_fee})" class="btn btn-primary btn-sm" title="Record Patient Vitals" style="box-shadow: 0 2px 8px rgba(0, 200, 83, 0.3);">
                <i class="fa-solid fa-heart-pulse"></i> Record Vitals
              </button>
              <button onclick="appointmentsComponent.directCheckOut(${a.id})" class="btn btn-outline-warning btn-sm" title="Patient Checked Out / Left Clinic">
                <i class="fa-solid fa-person-walking-arrow-right"></i> Check Out
              </button>
            `;
          } else {
            nextStepActionHtml = `
              <button onclick="app.sendToDoctor(${a.id})" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #0284c7, #0369a1); border-color: #0284c7; font-weight: 700; box-shadow: 0 3px 10px rgba(2, 132, 199, 0.35);" title="Send Patient to Doctor Consultation Queue">
                <i class="fa-solid fa-user-doctor"></i> Send to Doctor
              </button>
              <button onclick="app.openCheckInVitalsModal(${a.id}, ${a.patient_id}, '${(a.doctor_name || '').replace(/'/g, "\\'")}', '${(a.patient_name || '').replace(/'/g, "\\'")}', '', ${vitalsObj}, ${a.doctor_id}, ${a.consultation_fee})" class="btn btn-outline btn-sm" title="Re-edit Patient Vitals">
                <i class="fa-solid fa-pen-to-square"></i> Re-edit Vitals
              </button>
            `;
          }
        } else if (a.status === 'in_consultation') {
          nextStepActionHtml = `
            <button onclick="app.openMakeBillModal(${a.id}, ${a.patient_id}, ${a.doctor_id}, ${a.consultation_fee}, '${(a.doctor_name || '').replace(/'/g, "\\'")}', '${(a.patient_name || '').replace(/'/g, "\\'")}', '')" class="btn btn-success btn-sm" title="Proceed for the bill and payment of the patient" style="background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 3px 10px rgba(16, 185, 129, 0.35); font-weight: 700;">
              <i class="fa-solid fa-file-invoice-dollar"></i> Proceed for Bill
            </button>
          `;
        } else if (a.status === 'checked_out') {
          nextStepActionHtml = `
            <span class="badge badge-amber"><i class="fa-solid fa-person-walking-arrow-right"></i> Checked Out</span>
          `;
        } else {
          nextStepActionHtml = `<span class="badge badge-gray">Cancelled</span>`;
        }

        const rawMrn = (a.mrn || '').toString().replace(/MRN-?/gi, '');
        const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${a.patient_id}`;

        return `
          <tr>
            <td class="cell-nowrap">
              <span class="mrn-tag" style="font-size: 0.76rem; font-weight: 800; padding: 0.18rem 0.45rem; display: inline-block;">${formattedMrn}</span>
            </td>
            <td class="patient-details-cell">
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <div class="avatar-bubble ${avatarColor}" style="cursor: pointer; flex-shrink: 0; width: 28px; height: 28px; font-size: 0.7rem;" onclick="app.openAppointmentDetailsModal(${a.id})" title="View Full Booking Details">${initials}</div>
                <div style="min-width: 0; overflow: hidden;">
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.82rem; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" onclick="app.openAppointmentDetailsModal(${a.id})" title="View Full Details">${a.patient_name}</div>
                  <div style="font-size: 0.68rem; color: var(--text-muted); white-space: nowrap;">${a.patient_phone || (a.gender ? `${a.gender}${a.age ? ', ' + a.age + 'y' : ''}` : 'Patient')}</div>
                </div>
              </div>
            </td>
            <td class="doctor-details-cell">
              <div style="font-weight: 700; color: var(--text-main); font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.doctor_name}</div>
              <div style="font-size: 0.68rem; color: var(--text-muted); white-space: nowrap;">${a.doctor_specialty || 'OPD'}</div>
            </td>
            <td class="cell-nowrap">${vitalsHtml}</td>
            <td class="cell-nowrap"><span class="badge ${badgeClass}">${beaconDot}${statusLabel}</span></td>
            <td class="cell-nowrap">${billingBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <div style="display: inline-flex; align-items: center; gap: 0.3rem;">
                ${nextStepActionHtml}
                <button onclick="app.openAppointmentDetailsModal(${a.id})" class="btn btn-outline btn-sm" title="View Full Patient & Booking Details" style="padding: 0.22rem 0.45rem; font-size: 0.72rem;">
                  <i class="fa-solid fa-circle-info" style="color: #00c853;"></i> Details
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    };

    // Use SWR for instant 0ms UI load + background refresh
    const res = await app.swrApi(url, (fresh) => {
      if (fresh && fresh.success) {
        renderAppointments(fresh.data);
      }
    }, 15000);

    if (res && res.success) {
      renderAppointments(res.data);
    }
  },

  async setStatus(appointmentId, status) {
    const res = await app.api(`/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (res && res.success) {
      app.toast(`Status updated to ${status.replace('_', ' ')}.`, 'info');
      this.load();
      if (typeof dashboardComponent !== 'undefined' && dashboardComponent.load) dashboardComponent.load();
    } else {
      app.toast(res && res.message ? res.message : 'Failed to update appointment status.', 'error');
    }
  },

  async directCheckIn(appointmentId) {
    const res = await app.api(`/appointments/${appointmentId}/checkin`, {
      method: 'POST'
    });
    if (res && res.success) {
      app.toast('Patient checked in successfully.', 'success');
      this.load();
      if (typeof dashboardComponent !== 'undefined' && dashboardComponent.load) dashboardComponent.load();
    } else {
      app.toast(res && res.message ? res.message : 'Failed to check in patient.', 'error');
    }
  },

  async directCheckOut(appointmentId) {
    const res = await app.api(`/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'checked_out' })
    });
    if (res && res.success) {
      app.toast('Patient checked out successfully.', 'info');
      this.load();
      if (typeof dashboardComponent !== 'undefined' && dashboardComponent.load) dashboardComponent.load();
    } else {
      app.toast(res && res.message ? res.message : 'Failed to check out patient.', 'error');
    }
  },

  async cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    const res = await app.api(`/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' })
    });
    if (res && res.success) {
      app.toast('Appointment cancelled.', 'info');
      this.load();
      if (typeof dashboardComponent !== 'undefined' && dashboardComponent.load) dashboardComponent.load();
    } else {
      app.toast(res && res.message ? res.message : 'Failed to cancel appointment.', 'error');
    }
  }
};
