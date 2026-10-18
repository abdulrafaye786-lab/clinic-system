// ==========================================================================
// DOCTORS & SPECIALTIES COMPONENT (Clean Layout & Income Ratio Support)
// Palette: Cyber Green, Wine Red, Light Gray, White, Caramel, and Cream
// ==========================================================================

const doctorsComponent = {
  searchQuery: '',
  viewMode: 'grid', // 'grid' | 'list'
  doctorsData: [],

  async render(container) {
    container.innerHTML = `
      <div class="card u-morphism-card">
        <div class="card-header" style="padding: 0.55rem 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
            <div class="card-title" style="margin-bottom: 0; font-size: 0.95rem;">
              <i class="fa-solid fa-user-doctor" style="color: var(--primary);"></i> Doctors & Rosters Directory
            </div>
            <div class="search-box">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="doc-search-input" placeholder="Search consultant by name, specialty..." oninput="doctorsComponent.handleSearch(this.value)" style="height: 28px; font-size: 0.76rem;">
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <!-- Grid / List View Mode Toggle -->
            <div class="view-mode-toggle">
              <button class="view-mode-btn ${this.viewMode === 'grid' ? 'active' : ''}" onclick="doctorsComponent.setViewMode('grid')" title="Grid Card View" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">
                <i class="fa-solid fa-table-cells-large"></i> Grid
              </button>
              <button class="view-mode-btn ${this.viewMode === 'list' ? 'active' : ''}" onclick="doctorsComponent.setViewMode('list')" title="List Table View" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">
                <i class="fa-solid fa-list-ul"></i> List
              </button>
            </div>

            <!-- Export / Download Doctor Rosters -->
            <button onclick="doctorsComponent.downloadRoster()" class="btn btn-outline btn-sm" title="Download All Doctors & Weekly Rosters (CSV)" style="padding: 0.2rem 0.5rem; font-size: 0.74rem;">
              <i class="fa-solid fa-download" style="color: var(--primary);"></i> Download Roster
            </button>

            <!-- Add Roster Shift Action -->
            <button onclick="doctorsComponent.openAddRosterModal()" class="btn btn-outline-primary btn-sm admin-only-btn" style="padding: 0.2rem 0.6rem; font-size: 0.76rem;" title="Add Another Duty Shift / Roster Slot">
              <i class="fa-regular fa-clock"></i> + Add Roster Shift
            </button>

            <button onclick="doctorsComponent.openAddDoctorModal()" class="btn btn-primary btn-sm admin-only-btn" style="padding: 0.2rem 0.6rem; font-size: 0.76rem;">
              <i class="fa-solid fa-user-plus"></i> Add New Consultant
            </button>
          </div>
        </div>

        <div class="card-body" style="padding: 0.65rem; max-height: calc(100vh - 165px); overflow-y: auto;" id="doctors-main-container">
          <div id="doctors-display-outlet">
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">Loading consultant directory...</div>
          </div>
        </div>
      </div>
    `;

    this.load();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    const btns = document.querySelectorAll('.view-mode-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (mode === 'grid' && btns[0]) btns[0].classList.add('active');
    if (mode === 'list' && btns[1]) btns[1].classList.add('active');
    this.load();
  },

  handleSearch(val) {
    this.searchQuery = (val || '').toLowerCase().trim();
    this.load();
  },

  async load() {
    const renderDoctors = (res) => {
      if (!res || !res.success) return;
      const outlet = document.getElementById('doctors-display-outlet');
      if (!outlet) return;

      let doctors = res.data || [];
      this.doctorsData = doctors;

    if (this.searchQuery) {
      doctors = doctors.filter(d => 
        (d.name && d.name.toLowerCase().includes(this.searchQuery)) ||
        (d.specialty && d.specialty.toLowerCase().includes(this.searchQuery)) ||
        (d.department_name && d.department_name.toLowerCase().includes(this.searchQuery))
      );
    }

    if (doctors.length === 0) {
      outlet.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <i class="fa-solid fa-user-doctor" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block; color: var(--light-gray-dark);"></i>
          No doctor profiles match your query "${this.searchQuery}".
        </div>
      `;
      return;
    }

    const avatarGradients = [
      'var(--cyber-green-gradient)',
      'var(--wine-red-gradient)',
      'var(--caramel-gradient)',
      'linear-gradient(135deg, #047857, #10b981)',
      'linear-gradient(135deg, #92400e, #d97706)'
    ];

    const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    if (this.viewMode === 'grid') {
      // GRID VIEW
      outlet.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 1.25rem;">
          ${doctors.map((d, idx) => {
            const grad = avatarGradients[idx % avatarGradients.length];
            const initials = (d.name || 'Dr').replace('Dr.', '').trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            const schedules = d.schedules || [];
            
            const isToday = schedules.some(s => s.day_of_week === currentDayName || s.day_of_week === 'All Days') ||
                            (d.available_days || '').toLowerCase().includes(currentDayName.slice(0,3).toLowerCase());

            const fee = parseFloat(d.consultation_fee || 1500);
            const docShare = parseFloat(d.doctor_share_percent !== undefined ? d.doctor_share_percent : 60);
            const clinicShare = 100 - docShare;
            const docAmount = (fee * docShare) / 100;
            const clinicAmount = (fee * clinicShare) / 100;

            return `
              <div class="doc-profile-card">
                <div class="doc-card-top-accent"></div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
                    <div style="display: flex; gap: 0.85rem; align-items: center;">
                      <div class="avatar-bubble" style="width: 48px; height: 48px; border-radius: 14px; font-size: 1.1rem; font-weight: 800; background: ${grad}; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
                        ${initials || '<i class="fa-solid fa-user-doctor"></i>'}
                      </div>
                      <div>
                        <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.4rem;">
                          ${d.name}
                        </h3>
                        <span class="specialty-pill" style="font-size: 0.72rem;">${d.specialty}</span>
                      </div>
                    </div>
                    ${this.renderDoctorDutyBadge(d)}
                  </div>

                  <!-- Qualification & Department -->
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.85rem; line-height: 1.4; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="background: var(--light-gray); padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 600; color: var(--text-body);">
                      <i class="fa-solid fa-building-user" style="color: var(--cyber-green);"></i> ${d.department_name || 'General OPD'}
                    </span>
                    <span>•</span>
                    <span style="color: var(--text-muted);"><i class="fa-solid fa-graduation-cap" style="color: var(--caramel);"></i> ${d.qualification}</span>
                  </div>

                  <!-- Income Share Ratio Badge -->
                  <div style="margin-top: 0.65rem; background: rgba(5, 181, 85, 0.08); border: 1px solid rgba(5, 181, 85, 0.25); border-radius: 8px; padding: 0.45rem 0.65rem; font-size: 0.76rem; color: var(--text-body);">
                    <div style="display: flex; justify-content: space-between; font-weight: 800; color: var(--cyber-green-dark); margin-bottom: 2px;">
                      <span><i class="fa-solid fa-chart-pie"></i> Income Ratio</span>
                      <span>Doc ${docShare}% / Clinic ${clinicShare}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
                      <span>Doctor: <strong>${app.clinic.currency} ${docAmount.toLocaleString()}</strong></span>
                      <span>Clinic: <strong>${app.clinic.currency} ${clinicAmount.toLocaleString()}</strong></span>
                    </div>
                  </div>

                  <!-- Today's Duty Status Indicator -->
                  <div style="margin-top: 0.65rem; padding: 0.4rem 0.65rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between; ${isToday ? 'background: var(--cyber-green-light); color: var(--cyber-green-dark); border: 1px solid rgba(5, 181, 85, 0.2);' : 'background: var(--light-gray); color: var(--text-muted); border: 1px solid var(--border-color);'}">
                    <span>
                      <i class="fa-solid ${isToday ? 'fa-circle-dot' : 'fa-calendar-day'}" style="${isToday ? 'color: var(--cyber-green);' : ''}"></i> 
                      ${isToday ? 'On Duty Today (' + currentDayName + ')' : 'Available: ' + (d.available_days || 'Check Roster')}
                    </span>
                    ${isToday ? '<span class="badge badge-teal" style="font-size: 0.65rem; padding: 1px 5px;">Available</span>' : ''}
                  </div>

                  <!-- Compact Duty Roster Summary -->
                  <div style="margin-top: 0.5rem; background: var(--bg-canvas); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.45rem 0.65rem; font-size: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: var(--text-muted); font-weight: 600;"><i class="fa-regular fa-calendar-days" style="color: var(--caramel);"></i> Duty Days:</span>
                      <strong style="color: var(--text-main); text-align: right; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${schedules.length > 0 ? Array.from(new Set(schedules.map(s => s.day_of_week))).join(', ') : (d.available_days || 'Mon - Sat')}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 3px;">
                      <span style="color: var(--text-muted); font-weight: 600;"><i class="fa-regular fa-clock" style="color: var(--cyber-green);"></i> Shift Hours:</span>
                      <strong style="color: var(--cyber-green-dark); font-family: monospace;">${schedules.length > 0 ? `${schedules[0].start_time} - ${schedules[0].end_time}` : `${d.start_time || '10:00 AM'} - ${d.end_time || '03:00 PM'}`}</strong>
                    </div>
                  </div>
                </div>

                <!-- Footer with Consultation Fee & Booking CTA -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
                  <div>
                    <span style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em;">Fee</span>
                    <div style="font-size: 1.2rem; font-weight: 900; color: var(--caramel); font-family: monospace;">
                      ${app.clinic.currency} ${fee.toLocaleString()}
                    </div>
                  </div>
                  <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                    <button onclick="app.openBookAppointmentModal(null, ${d.id})" class="btn btn-primary btn-sm" title="Book Appointment with Doctor" style="box-shadow: var(--green-glow); padding: 0.2rem 0.5rem; font-size: 0.74rem;">
                      <i class="fa-solid fa-calendar-plus"></i> Book
                    </button>
                    <button onclick="doctorsComponent.openAddRosterModal(${d.id})" class="btn btn-outline btn-sm admin-only-btn" title="Add Another Roster Slot" style="color: var(--secondary); border-color: rgba(13, 148, 136, 0.4); padding: 0.2rem 0.45rem; font-size: 0.74rem;">
                      <i class="fa-regular fa-clock"></i> + Roster
                    </button>
                    <button onclick="doctorsComponent.openEditDoctorModal(${d.id})" class="btn btn-outline btn-sm admin-only-btn" title="Re-edit Doctor Profile" style="padding: 0.2rem 0.45rem; font-size: 0.74rem;">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button onclick="doctorsComponent.deleteDoctor(${d.id}, '${d.name.replace(/'/g, "\\'")}')" class="btn btn-outline btn-sm admin-only-btn" title="Delete Doctor from Database" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.3); padding: 0.2rem 0.45rem; font-size: 0.74rem;">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // LIST VIEW TABLE
      outlet.innerHTML = `
        <div class="table-responsive table-viewport">
          <table class="table table-dense" style="min-width: 1000px;">
            <thead>
              <tr>
                <th style="min-width: 200px;">Consultant Doctor</th>
                <th style="min-width: 170px;">Department & Specialty</th>
                <th style="width: 130px;">Consultation Fee</th>
                <th style="width: 170px;">Income Share Ratio</th>
                <th style="min-width: 220px;">Assigned Rosters & Shifts</th>
                <th style="width: 100px;">Status</th>
                <th style="text-align: right; min-width: 160px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${doctors.map((d, idx) => {
                const grad = avatarGradients[idx % avatarGradients.length];
                const initials = (d.name || 'Dr').replace('Dr.', '').trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                const schedules = d.schedules || [];
                const fee = parseFloat(d.consultation_fee || 1500);
                const docShare = parseFloat(d.doctor_share_percent !== undefined ? d.doctor_share_percent : 60);
                const clinicShare = 100 - docShare;

                return `
                  <tr>
                    <td class="doctor-details-cell">
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="avatar-bubble" style="width: 38px; height: 38px; font-size: 0.9rem; font-weight: 800; background: ${grad}; color: white; display: flex; align-items: center; justify-content: center; border-radius: 10px; flex-shrink: 0;">${initials}</div>
                        <div>
                          <div style="font-weight: 800; color: var(--text-main); font-size: 0.94rem; white-space: nowrap;">${d.name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; margin-top: 1px;">${d.qualification}</div>
                        </div>
                      </div>
                    </td>
                    <td class="cell-nowrap">
                      <span class="specialty-pill" style="font-size: 0.72rem; white-space: nowrap;">${d.specialty}</span>
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; white-space: nowrap;">${d.department_name || 'General OPD'}</div>
                    </td>
                    <td class="cell-nowrap">
                      <strong style="color: var(--caramel); font-size: 0.95rem; font-family: monospace; white-space: nowrap;">${app.clinic.currency} ${fee.toLocaleString()}</strong>
                    </td>
                    <td class="cell-nowrap">
                      <div style="font-size: 0.78rem; font-weight: 800; color: var(--cyber-green-dark); white-space: nowrap;">
                        <i class="fa-solid fa-chart-pie" style="color: var(--cyber-green);"></i> ${docShare}% / ${clinicShare}%
                      </div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap;">
                        Doc: ${app.clinic.currency} ${((fee * docShare)/100).toLocaleString()} • Clinic: ${app.clinic.currency} ${((fee * clinicShare)/100).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column; gap: 3px; max-width: 260px;">
                        ${schedules.length > 0 ? schedules.map(s => `
                          <span style="font-size: 0.74rem; background: var(--light-gray); padding: 2px 6px; border-radius: 6px; color: var(--text-body); border: 1px solid var(--border-color); white-space: nowrap;">
                            <strong style="color: var(--wine-red);">${s.day_of_week}:</strong> <span style="color: var(--cyber-green); font-family: monospace;">${s.start_time} - ${s.end_time}</span>
                          </span>
                        `).join('') : `
                          <span style="font-size: 0.74rem; color: var(--text-muted); white-space: nowrap;">${d.available_days}: ${d.start_time} - ${d.end_time}</span>
                        `}
                      </div>
                    </td>
                    <td class="cell-nowrap">
                      ${this.renderDoctorDutyBadge(d)}
                    </td>
                    <td class="cell-nowrap" style="text-align: right; white-space: nowrap;">
                      <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                        <button onclick="app.openBookAppointmentModal(null, ${d.id})" class="btn btn-primary btn-sm" title="Book Appointment" style="white-space: nowrap; padding: 0.2rem 0.45rem; font-size: 0.74rem;">
                          <i class="fa-solid fa-calendar-plus"></i> Book
                        </button>
                        <button onclick="doctorsComponent.openAddRosterModal(${d.id})" class="btn btn-outline btn-sm admin-only-btn" title="Add Another Roster Slot" style="color: var(--secondary); border-color: rgba(13, 148, 136, 0.4); white-space: nowrap; padding: 0.2rem 0.45rem; font-size: 0.74rem;">
                          <i class="fa-regular fa-clock"></i> + Roster
                        </button>
                        <button onclick="doctorsComponent.openEditDoctorModal(${d.id})" class="btn-edit-action admin-only-btn" title="Re-edit Doctor Profile" style="white-space: nowrap; padding: 0.2rem 0.45rem; font-size: 0.74rem;">
                          <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button onclick="doctorsComponent.deleteDoctor(${d.id}, '${d.name.replace(/'/g, "\\'")}')" class="btn btn-outline btn-sm admin-only-btn" title="Delete Doctor from Database" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.3); padding: 0.2rem 0.45rem; font-size: 0.74rem;">
                          <i class="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (window.app && typeof window.app.applyRolePermissions === 'function') {
      window.app.applyRolePermissions();
    }
  };

  const res = await app.swrApi('/doctors', (fresh) => {
    renderDoctors(fresh);
  }, 25000);

  if (res && res.success) {
    renderDoctors(res);
  }
},

  // Download Doctor Rosters as CSV Export
  downloadRoster() {
    if (!this.doctorsData || this.doctorsData.length === 0) {
      app.toast('No doctors data available to export.', 'warning');
      return;
    }

    const headers = ['Doctor Name', 'Department', 'Specialty', 'Qualifications', 'Consultation Fee (Rs.)', 'Doctor Share (%)', 'Clinic Share (%)', 'Duty Days', 'Roster Timings'];
    const rows = this.doctorsData.map(d => {
      const fee = parseFloat(d.consultation_fee || 1500);
      const docShare = parseFloat(d.doctor_share_percent !== undefined ? d.doctor_share_percent : 60);
      const clinicShare = 100 - docShare;
      const schedules = d.schedules || [];
      const rosterStr = schedules.length > 0 
        ? schedules.map(s => `${s.day_of_week}: ${s.start_time}-${s.end_time}`).join(' | ') 
        : `${d.available_days || 'Mon-Sat'}: ${d.start_time || '09:00 AM'}-${d.end_time || '03:00 PM'}`;

      return [
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.department_name || 'General OPD').replace(/"/g, '""')}"`,
        `"${(d.specialty || '').replace(/"/g, '""')}"`,
        `"${(d.qualification || '').replace(/"/g, '""')}"`,
        fee,
        docShare,
        clinicShare,
        `"${(d.available_days || 'Mon-Sat').replace(/"/g, '""')}"`,
        `"${rosterStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Doctors_Rosters_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    app.toast('Doctors & Rosters CSV file downloaded successfully!', 'success');
  },

  addScheduleSlotRowHtml(day = 'Monday', start = '09:00 AM', end = '01:00 PM', room = 'OPD') {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'All Days'];
    const rowId = `slot-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return `
      <div class="slot-row-item" id="${rowId}">
        <select class="form-control slot-day" style="flex: 1.2; font-size: 0.8rem; padding: 0.35rem 0.5rem;">
          ${days.map(d => `<option value="${d}" ${d === day ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
        <input type="text" class="form-control slot-start" placeholder="09:00 AM" value="${start}" style="flex: 1; font-size: 0.8rem; padding: 0.35rem 0.5rem;">
        <span style="font-size: 0.75rem; color: var(--text-muted);">to</span>
        <input type="text" class="form-control slot-end" placeholder="01:00 PM" value="${end}" style="flex: 1; font-size: 0.8rem; padding: 0.35rem 0.5rem;">
        <input type="text" class="form-control slot-room" placeholder="Room/OPD" value="${room}" style="flex: 0.8; font-size: 0.8rem; padding: 0.35rem 0.5rem;">
        <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('${rowId}').remove()" style="color: var(--wine-red); border-color: var(--wine-red-light); padding: 0.25rem 0.45rem;" title="Remove this slot">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  },

  appendScheduleSlot(containerId, day = 'Monday', start = '05:00 PM', end = '09:00 PM', room = 'OPD') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.addScheduleSlotRowHtml(day, start, end, room);
    container.appendChild(tempDiv.firstElementChild);
  },

  // Helper for live calculation of income ratio share
  updateIncomeRatioPreview(prefix) {
    const feeInput = document.getElementById(`${prefix}-fee`);
    const shareInput = document.getElementById(`${prefix}-share`);
    const previewEl = document.getElementById(`${prefix}-share-preview`);
    if (!feeInput || !shareInput || !previewEl) return;

    const fee = parseFloat(feeInput.value) || 0;
    const docPercent = Math.min(100, Math.max(0, parseFloat(shareInput.value) || 60));
    const clinicPercent = 100 - docPercent;

    const docAmount = (fee * docPercent) / 100;
    const clinicAmount = (fee * clinicPercent) / 100;

    previewEl.innerHTML = `
      <div style="font-weight: 800; color: var(--cyber-green-dark); display: flex; justify-content: space-between; align-items: center;">
        <span><i class="fa-solid fa-calculator"></i> Income Share Split:</span>
        <span>Doctor ${docPercent}% (${app.clinic.currency} ${docAmount.toLocaleString()}) • Clinic ${clinicPercent}% (${app.clinic.currency} ${clinicAmount.toLocaleString()})</span>
      </div>
    `;
  },

  renderDoctorDutyBadge(d) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const roster = app.getDoctorRosterInfo ? app.getDoctorRosterInfo(d, todayStr) : { isOnDuty: false, isCurrentlyLiveShift: false, shiftTiming: '' };

    if (roster.isCurrentlyLiveShift) {
      return `<span class="badge badge-teal" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; font-weight: 800;"><span class="pulse-dot green"></span> On Duty Now</span>`;
    } else if (roster.isOnDuty) {
      return `<span class="badge badge-blue" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; font-weight: 700;"><i class="fa-regular fa-clock"></i> Today: ${roster.shiftTiming || 'Rostered'}</span>`;
    } else {
      return `<span class="badge badge-gray" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; font-weight: 600; color: var(--text-muted);"><i class="fa-solid fa-moon"></i> Off Duty Today</span>`;
    }
  },

  handleDepartmentSelectChange(prefix, selectEl) {
    const customContainer = document.getElementById(`${prefix}-custom-dept-container`);
    const customInput = document.getElementById(`${prefix}-custom-dept`);
    if (!customContainer) return;

    if (selectEl.value === 'new') {
      customContainer.style.display = 'block';
      if (customInput) {
        customInput.required = true;
        customInput.focus();
      }
    } else {
      customContainer.style.display = 'none';
      if (customInput) {
        customInput.required = false;
        customInput.value = '';
        app.clearFieldHighlight(customInput);
      }
    }
  },

  cancelCustomDepartment(prefix) {
    const selectEl = document.getElementById(`${prefix}-dept`);
    const customContainer = document.getElementById(`${prefix}-custom-dept-container`);
    const customInput = document.getElementById(`${prefix}-custom-dept`);
    if (customContainer) customContainer.style.display = 'none';
    if (customInput) {
      customInput.required = false;
      customInput.value = '';
      app.clearFieldHighlight(customInput);
    }
    if (selectEl && selectEl.options.length > 0) {
      selectEl.selectedIndex = 0;
    }
  },

  // Unified Shared Doctor Form Builder (Guarantees Add and Edit forms are 100% Identical)
  getDoctorFormHtml(prefix, d = {}, departments = []) {
    const fee = d.consultation_fee !== undefined ? d.consultation_fee : 1500;
    const docShare = d.doctor_share_percent !== undefined ? d.doctor_share_percent : 60;
    const schedules = d.schedules || [];

    return `
      <form id="${prefix}-doc-form" style="display: grid; grid-template-columns: 1fr 1.05fr; gap: 0.85rem; align-items: start;">
        
        <!-- Left Column: Doctor Profile & Contact -->
        <div style="display: flex; flex-direction: column; gap: 0.45rem;">
          <div class="form-row" style="margin-bottom: 0.35rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.74rem;"><span class="required">*</span> Doctor Full Name</label>
              <input type="text" id="${prefix}-name" class="form-control" placeholder="e.g. Dr. Salman Ali" value="${d.name || ''}" style="height: 30px; font-size: 0.82rem;" required data-error-msg="Doctor full name is required">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label" style="font-size: 0.74rem; margin-bottom: 2px;"><span class="required">*</span> Department</label>
              </div>
              <select id="${prefix}-dept" class="form-control" style="height: 30px; font-size: 0.82rem; padding: 0.2rem 0.5rem;" required data-error-msg="Please select a clinical department" onchange="doctorsComponent.handleDepartmentSelectChange('${prefix}', this)">
                ${departments.map(dept => `<option value="${dept.id}" ${d.department_id == dept.id ? 'selected' : ''}>${dept.name}</option>`).join('')}
                <option value="new" style="font-weight: 800; color: var(--primary);">➕ + Add New Department...</option>
              </select>
            </div>
          </div>

          <!-- Dynamic Custom Department Name Input (Hidden unless "+ Add New Department" selected) -->
          <div id="${prefix}-custom-dept-container" style="display: none; background: rgba(37, 99, 235, 0.05); border: 1.5px dashed var(--primary); border-radius: 8px; padding: 0.45rem 0.65rem; margin-bottom: 0.35rem; animation: field-shake 0.25s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
              <label class="form-label" style="font-size: 0.72rem; color: var(--primary); font-weight: 800; margin: 0;">
                <i class="fa-solid fa-hospital-user"></i> Type New Department Name:
              </label>
              <button type="button" onclick="doctorsComponent.cancelCustomDepartment('${prefix}')" class="btn btn-outline btn-xs" style="font-size: 0.68rem; padding: 0 0.35rem; height: 20px;">Cancel</button>
            </div>
            <input type="text" id="${prefix}-custom-dept" class="form-control" placeholder="e.g. Nephrology & Renal Care" style="height: 28px; font-size: 0.8rem;" data-error-msg="Please type the department name">
          </div>

          <div class="form-row" style="margin-bottom: 0.35rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.74rem;"><span class="required">*</span> Specialty Title</label>
              <input type="text" id="${prefix}-spec" class="form-control" placeholder="e.g. Consultant Physician" value="${d.specialty || ''}" style="height: 30px; font-size: 0.82rem;" required data-error-msg="Specialty title is required">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.74rem;"><span class="required">*</span> Qualifications</label>
              <input type="text" id="${prefix}-qual" class="form-control" placeholder="e.g. MBBS, FCPS" value="${d.qualification || ''}" style="height: 30px; font-size: 0.82rem;" required data-error-msg="Qualifications are required">
            </div>
          </div>

          <div class="form-row" style="margin-bottom: 0.35rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.74rem;">Contact Phone</label>
              <input type="tel" id="${prefix}-phone" class="form-control" placeholder="0300-1234567" value="${d.phone || ''}" style="height: 30px; font-size: 0.82rem;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.74rem;">Email Address</label>
              <input type="email" id="${prefix}-email" class="form-control" placeholder="doctor@gclinic.com" value="${d.email || ''}" style="height: 30px; font-size: 0.82rem;">
            </div>
          </div>

          <div style="background: var(--bg-canvas); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.45rem 0.65rem; font-size: 0.73rem; color: var(--text-muted);">
            <i class="fa-solid fa-circle-info" style="color: var(--primary);"></i> <strong>Dynamic Duty Status:</strong> Doctor availability is automatically driven by duty shifts configured in the Weekly Roster.
          </div>
        </div>

        <!-- Right Column: Financial Share & Duty Shifts Roster -->
        <div style="display: flex; flex-direction: column; gap: 0.45rem;">
          <div class="form-row" style="margin-bottom: 0.25rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.74rem;"><span class="required">*</span> Fee (${app.clinic.currency})</label>
              <input type="number" id="${prefix}-fee" class="form-control" value="${fee}" style="height: 30px; font-size: 0.82rem;" required data-error-msg="Consultation fee is required" oninput="doctorsComponent.updateIncomeRatioPreview('${prefix}')">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.74rem;"><span class="required">*</span> Doctor Share (%)</label>
              <input type="number" id="${prefix}-share" class="form-control" value="${docShare}" min="0" max="100" step="1" style="height: 30px; font-size: 0.82rem;" required data-error-msg="Doctor share percent is required" oninput="doctorsComponent.updateIncomeRatioPreview('${prefix}')">
            </div>
          </div>

          <!-- Live Income Ratio Preview Bar -->
          <div id="${prefix}-share-preview" style="background: var(--cyber-green-light); border: 1.5px solid rgba(5, 181, 85, 0.3); border-radius: 8px; padding: 0.4rem 0.65rem; font-size: 0.76rem;">
            <div style="font-weight: 800; color: var(--cyber-green-dark); display: flex; justify-content: space-between; align-items: center;">
              <span><i class="fa-solid fa-calculator"></i> Income Share:</span>
              <span>Doc ${docShare}% (${app.clinic.currency} ${((fee * docShare)/100).toLocaleString()}) • Clinic ${100 - docShare}% (${app.clinic.currency} ${((fee * (100 - docShare))/100).toLocaleString()})</span>
            </div>
          </div>

          <!-- Multi-Slot Schedules Per Day Builder -->
          <div style="background: var(--bg-canvas); border: 1.5px solid var(--border-color); border-radius: 10px; padding: 0.55rem 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <div style="font-weight: 800; font-size: 0.82rem; color: var(--cyber-green);">
                <i class="fa-regular fa-clock"></i> Weekly Duty Shifts & Roster Time Slots
              </div>
              <button type="button" onclick="doctorsComponent.appendScheduleSlot('${prefix}-slots-container')" class="btn btn-outline-primary btn-sm" style="padding: 0.15rem 0.45rem; font-size: 0.7rem; height: 24px;">
                <i class="fa-solid fa-plus"></i> + Shift
              </button>
            </div>

            <div id="${prefix}-slots-container" style="max-height: 110px; overflow-y: auto; padding: 2px;">
              ${schedules.length > 0 ? schedules.map(s => this.addScheduleSlotRowHtml(s.day_of_week, s.start_time, s.end_time, s.room_no || 'OPD')).join('') : `
                ${this.addScheduleSlotRowHtml('Monday', '09:00 AM', '01:00 PM', 'OPD-1')}
                ${this.addScheduleSlotRowHtml('Wednesday', '10:00 AM', '02:00 PM', 'OPD-1')}
                ${this.addScheduleSlotRowHtml('Friday', '02:00 PM', '06:00 PM', 'OPD-1')}
              `}
            </div>
          </div>
        </div>

      </form>
    `;
  },

  async openAddDoctorModal() {
    const deptRes = await app.api('/departments');
    const departments = deptRes.data || [];

    const bodyHtml = this.getDoctorFormHtml('nd', {}, departments);

    const footerHtml = `
      <button class="btn btn-outline btn-sm" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="doctorsComponent.submitAddDoctor()"><i class="fa-solid fa-save"></i> Save Doctor Profile</button>
    `;

    app.openModal('<i class="fa-solid fa-user-doctor"></i> Add Doctor Profile & Roster', bodyHtml, footerHtml, 'modal-xl');
  },

  async submitAddDoctor() {
    // Validate form required fields and highlight mistakes
    if (!app.validateForm('nd-doc-form')) {
      app.toast('Please fill all highlighted required fields.', 'error');
      return;
    }

    const name = document.getElementById('nd-name').value.trim();
    const departmentSelect = document.getElementById('nd-dept');
    let department_id = departmentSelect ? departmentSelect.value : null;
    let custom_department_name = '';

    if (department_id === 'new') {
      const customInput = document.getElementById('nd-custom-dept');
      custom_department_name = customInput ? customInput.value.trim() : '';
      if (!custom_department_name) {
        app.highlightField('nd-custom-dept', 'Please enter a name for the new department');
        app.toast('Please provide a name for the new department.', 'error');
        return;
      }
    }

    const specialty = document.getElementById('nd-spec').value.trim();
    const qualification = document.getElementById('nd-qual').value.trim();
    const consultation_fee = document.getElementById('nd-fee').value;
    const doctor_share_percent = document.getElementById('nd-share').value;
    const phone = document.getElementById('nd-phone').value.trim();
    const email = document.getElementById('nd-email').value.trim();

    // Collect all schedule slot rows
    const slotRows = document.querySelectorAll('#nd-slots-container .slot-row-item');
    const schedules = [];
    slotRows.forEach(row => {
      const day = row.querySelector('.slot-day').value;
      const start = row.querySelector('.slot-start').value.trim();
      const end = row.querySelector('.slot-end').value.trim();
      const room = row.querySelector('.slot-room').value.trim() || 'OPD';
      if (day && start && end) {
        schedules.push({ day_of_week: day, start_time: start, end_time: end, room_no: room });
      }
    });

    const firstSlot = schedules.length > 0 ? schedules[0] : { start_time: '10:00 AM', end_time: '03:00 PM' };
    const uniqueDays = [...new Set(schedules.map(s => s.day_of_week))].join(',');

    const res = await app.api('/doctors', {
      method: 'POST',
      body: JSON.stringify({
        name,
        department_id: department_id === 'new' ? null : department_id,
        custom_department_name,
        specialty,
        qualification,
        consultation_fee: parseFloat(consultation_fee),
        doctor_share_percent: parseFloat(doctor_share_percent || 60),
        room_no: 'OPD',
        start_time: firstSlot.start_time,
        end_time: firstSlot.end_time,
        available_days: uniqueDays || 'Mon,Tue,Wed,Thu,Fri,Sat',
        schedules: schedules,
        phone,
        email,
        status: 'active'
      })
    });

    if (res.success) {
      app.toast('Doctor profile and roster created successfully in database!', 'success');
      app.closeModal();
      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to add doctor', 'error');
    }
  },

  async openEditDoctorModal(doctorId) {
    const [docRes, deptRes] = await Promise.all([
      app.api(`/doctors/${doctorId}`),
      app.api('/departments')
    ]);

    if (!docRes.success) return;
    const d = docRes.data;
    const departments = deptRes.data || [];

    const bodyHtml = this.getDoctorFormHtml('ed', d, departments);

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" class="btn btn-outline btn-sm" style="color: var(--wine-red); border-color: var(--wine-red);" onclick="doctorsComponent.deleteDoctor(${d.id}, '${d.name.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-trash-can"></i> Delete Doctor
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline btn-sm" onclick="app.closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="doctorsComponent.submitEditDoctor(${d.id})"><i class="fa-solid fa-save"></i> Save Changes</button>
        </div>
      </div>
    `;

    app.openModal(`<i class="fa-solid fa-user-pen"></i> Edit Doctor & Roster: ${d.name}`, bodyHtml, footerHtml, 'modal-xl');
  },

  async submitEditDoctor(doctorId) {
    if (!app.validateForm('ed-doc-form')) {
      app.toast('Please fill all highlighted required fields.', 'error');
      return;
    }

    const name = document.getElementById('ed-name').value.trim();
    const departmentSelect = document.getElementById('ed-dept');
    let department_id = departmentSelect ? departmentSelect.value : null;
    let custom_department_name = '';

    if (department_id === 'new') {
      const customInput = document.getElementById('ed-custom-dept');
      custom_department_name = customInput ? customInput.value.trim() : '';
      if (!custom_department_name) {
        app.highlightField('ed-custom-dept', 'Please enter a name for the new department');
        app.toast('Please provide a name for the new department.', 'error');
        return;
      }
    }

    const specialty = document.getElementById('ed-spec').value.trim();
    const qualification = document.getElementById('ed-qual').value.trim();
    const consultation_fee = document.getElementById('ed-fee').value;
    const doctor_share_percent = document.getElementById('ed-share').value;
    const phone = document.getElementById('ed-phone').value.trim();
    const email = document.getElementById('ed-email').value.trim();

    // Collect all schedule slot rows
    const slotRows = document.querySelectorAll('#ed-slots-container .slot-row-item');
    const schedules = [];
    slotRows.forEach(row => {
      const day = row.querySelector('.slot-day').value;
      const start = row.querySelector('.slot-start').value.trim();
      const end = row.querySelector('.slot-end').value.trim();
      const room = row.querySelector('.slot-room').value.trim() || 'OPD';
      if (day && start && end) {
        schedules.push({ day_of_week: day, start_time: start, end_time: end, room_no: room });
      }
    });

    const firstSlot = schedules.length > 0 ? schedules[0] : { start_time: '10:00 AM', end_time: '03:00 PM' };
    const uniqueDays = [...new Set(schedules.map(s => s.day_of_week))].join(',');

    const res = await app.api(`/doctors/${doctorId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        department_id: department_id === 'new' ? null : department_id,
        custom_department_name,
        specialty,
        qualification,
        consultation_fee: parseFloat(consultation_fee),
        doctor_share_percent: parseFloat(doctor_share_percent || 60),
        room_no: 'OPD',
        start_time: firstSlot.start_time,
        end_time: firstSlot.end_time,
        available_days: uniqueDays || 'Mon - Sat',
        schedules: schedules,
        phone,
        email,
        status: 'active'
      })
    });

    if (res.success) {
      app.toast('Doctor profile and roster updated successfully in database!', 'success');
      app.closeModal();
      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to update doctor', 'error');
    }
  },

  async deleteDoctor(doctorId, doctorName) {
    if (!confirm(`Are you sure you want to delete ${doctorName}? This will permanently remove the doctor profile and consultation schedules from the database.`)) {
      return;
    }
    const res = await app.api(`/doctors/${doctorId}`, { method: 'DELETE' });
    if (res.success) {
      app.toast(`${doctorName} was deleted successfully from the database!`, 'success');
      app.closeModal();
      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to delete doctor', 'error');
    }
  },

  async openAddRosterModal(doctorId = null) {
    const docRes = await app.api('/doctors');
    const doctors = docRes.data || [];

    const bodyHtml = `
      <form id="quick-roster-form" style="display: flex; flex-direction: column; gap: 0.65rem;">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-size: 0.76rem;"><span class="required">*</span> Select Consultant Doctor</label>
          <select id="qr-doctor-id" class="form-control" style="height: 32px; font-size: 0.82rem;" required>
            ${doctors.map(d => `<option value="${d.id}" ${doctorId == d.id ? 'selected' : ''}>${d.name} (${d.specialty} • ${d.department_name || 'General OPD'})</option>`).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0.55rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.76rem;"><span class="required">*</span> Duty Day</label>
            <select id="qr-day" class="form-control" style="height: 32px; font-size: 0.82rem;" required>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.76rem;"><span class="required">*</span> Start Time</label>
            <input type="text" id="qr-start-time" class="form-control" placeholder="09:00 AM" value="09:00 AM" style="height: 32px; font-size: 0.82rem;" required>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.76rem;"><span class="required">*</span> End Time</label>
            <input type="text" id="qr-end-time" class="form-control" placeholder="02:00 PM" value="02:00 PM" style="height: 32px; font-size: 0.82rem;" required>
          </div>
        </div>

        <!-- Quick Shift Presets Chips -->
        <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Quick Presets:</span>
          <button type="button" class="btn btn-sm btn-outline" style="padding: 0.12rem 0.45rem; font-size: 0.7rem;" onclick="doctorsComponent.setRosterTimePreset('09:00 AM', '01:00 PM')">Morning (9am - 1pm)</button>
          <button type="button" class="btn btn-sm btn-outline" style="padding: 0.12rem 0.45rem; font-size: 0.7rem;" onclick="doctorsComponent.setRosterTimePreset('02:00 PM', '06:00 PM')">Evening (2pm - 6pm)</button>
          <button type="button" class="btn btn-sm btn-outline" style="padding: 0.12rem 0.45rem; font-size: 0.7rem;" onclick="doctorsComponent.setRosterTimePreset('06:00 PM', '10:00 PM')">Night (6pm - 10pm)</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.76rem;">Room / Cabin No</label>
            <input type="text" id="qr-room" class="form-control" placeholder="OPD-1" value="OPD-1" style="height: 32px; font-size: 0.82rem;">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.76rem;">Max Patient Appointments</label>
            <input type="number" id="qr-slots" class="form-control" value="25" min="5" max="100" style="height: 32px; font-size: 0.82rem;">
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline btn-sm" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="doctorsComponent.submitAddRoster()"><i class="fa-solid fa-save"></i> Save Roster Shift</button>
    `;

    app.openModal('<i class="fa-regular fa-clock"></i> Add Doctor Duty Roster Shift', bodyHtml, footerHtml, 'modal-md');
  },

  setRosterTimePreset(start, end) {
    const sEl = document.getElementById('qr-start-time');
    const eEl = document.getElementById('qr-end-time');
    if (sEl) sEl.value = start;
    if (eEl) eEl.value = end;
  },

  async submitAddRoster() {
    const docId = document.getElementById('qr-doctor-id').value;
    const day = document.getElementById('qr-day').value;
    const start_time = document.getElementById('qr-start-time').value.trim();
    const end_time = document.getElementById('qr-end-time').value.trim();
    const room_no = document.getElementById('qr-room').value.trim() || 'OPD-1';
    const max_slots = parseInt(document.getElementById('qr-slots').value) || 25;

    if (!docId || !day || !start_time || !end_time) {
      app.toast('Please select doctor, day, and time slots.', 'error');
      return;
    }

    const res = await app.api(`/doctors/${docId}/schedules`, {
      method: 'POST',
      body: JSON.stringify({ day_of_week: day, start_time, end_time, room_no, max_slots })
    });

    if (res.success) {
      app.toast(res.message || '🎉 Roster shift added successfully!', 'success');
      app.closeModal();
      this.load();
      app.refreshActiveView();
    } else {
      app.toast(res.message || 'Failed to add roster shift', 'error');
    }
  }
};
