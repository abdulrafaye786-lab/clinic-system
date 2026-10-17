// ==========================================================================
// SETTINGS & USER ROLES COMPONENT
// ==========================================================================

const settingsComponent = {
  activeTab: 'clinic', // 'clinic', 'users'

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-sm ${this.activeTab === 'clinic' ? 'btn-primary' : 'btn-outline'}" onclick="settingsComponent.switchTab('clinic')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-hospital"></i> Clinic Profile & Setup
          </button>
          <button class="btn btn-sm ${this.activeTab === 'users' ? 'btn-primary' : 'btn-outline'}" onclick="settingsComponent.switchTab('users')" style="padding: 0.25rem 0.7rem; font-size: 0.78rem;">
            <i class="fa-solid fa-users-gear"></i> Staff Users & Permissions
          </button>
        </div>

        <div id="settings-header-action">
          <!-- Context action -->
        </div>
      </div>

      <div id="settings-content-area">
        <!-- Loaded dynamically -->
      </div>
    `;

    this.switchTab(this.activeTab);
  },

  switchTab(tab) {
    this.activeTab = tab;
    const actionEl = document.getElementById('settings-header-action');
    const contentEl = document.getElementById('settings-content-area');
    if (!contentEl) return;

    if (tab === 'clinic') {
      if (actionEl) actionEl.innerHTML = '';
      this.renderClinicSettings(contentEl);
    } else if (tab === 'users') {
      if (actionEl) {
        actionEl.innerHTML = `
          <button onclick="settingsComponent.openAddUserModal()" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;">
            <i class="fa-solid fa-user-plus"></i> Add Staff Account
          </button>
        `;
      }
      this.renderUsers(contentEl);
    }
  },

  // 1. CLINIC PROFILE FORM
  async renderClinicSettings(container) {
    const res = await app.api('/settings');
    const s = res.data || {};

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="padding: 0.55rem 0.85rem;">
          <div class="card-title" style="margin-bottom: 0; font-size: 0.95rem;">
            <i class="fa-solid fa-sliders" style="color: var(--primary);"></i> Clinic Profile & Receipt Header Configuration
          </div>
        </div>

        <div class="card-body" style="padding: 0.75rem 1rem;">
          <form id="clinic-settings-form" onsubmit="settingsComponent.saveSettings(event)">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label"><span class="required">*</span> Clinic Name</label>
                <input type="text" id="set-name" class="form-control" value="${s.clinic_name || 'Dream Garden PolyClinic'}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Tagline / Subtitle</label>
                <input type="text" id="set-tagline" class="form-control" value="${s.tagline || 'Comprehensive Multi-Specialty Healthcare & Diagnostic Center'}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label"><span class="required">*</span> Contact Phone Numbers</label>
                <input type="text" id="set-phone" class="form-control" value="${s.phone || '+92 42 35890123 / +92 300 8472910'}" required>
              </div>
              <div class="form-group">
                <label class="form-label">24/7 Emergency Helpline</label>
                <input type="text" id="set-emergency" class="form-control" value="${s.emergency_contact || '+92 300 1122334 (24/7)'}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Official Email</label>
                <input type="email" id="set-email" class="form-control" value="${s.email || 'info@dreamgardenclinic.com'}">
              </div>
              <div class="form-group">
                <label class="form-label">Website URL</label>
                <input type="text" id="set-web" class="form-control" value="${s.website || 'www.dreamgardenclinic.com'}">
              </div>
              <div class="form-group">
                <label class="form-label">Currency Symbol</label>
                <input type="text" id="set-currency" class="form-control" value="${s.currency_symbol || 'Rs.'}" style="width: 120px;" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><span class="required">*</span> Clinic Physical Address</label>
              <input type="text" id="set-address" class="form-control" value="${s.address || 'Plot # 14-B, Medical Avenue, Main Boulevard, Garden Town'}" required>
            </div>

            <div class="form-group">
              <label class="form-label">Thermal Slip & Receipt Footer Note</label>
              <textarea id="set-footer" class="form-control" rows="2">${s.receipt_footer_note || 'Thank you for trusting Dream Garden PolyClinic. We wish you good health!'}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
              <button type="submit" class="btn btn-primary btn-lg">
                <i class="fa-solid fa-save"></i> Save Clinic Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async saveSettings(e) {
    e.preventDefault();
    const clinic_name = document.getElementById('set-name').value.trim();
    const tagline = document.getElementById('set-tagline').value.trim();
    const phone = document.getElementById('set-phone').value.trim();
    const emergency_contact = document.getElementById('set-emergency').value.trim();
    const email = document.getElementById('set-email').value.trim();
    const website = document.getElementById('set-web').value.trim();
    const currency_symbol = document.getElementById('set-currency').value.trim();
    const address = document.getElementById('set-address').value.trim();
    const receipt_footer_note = document.getElementById('set-footer').value.trim();

    const res = await app.api('/settings', {
      method: 'PUT',
      body: JSON.stringify({
        clinic_name,
        tagline,
        phone,
        emergency_contact,
        email,
        website,
        currency_symbol,
        address,
        receipt_footer_note
      })
    });

    if (res.success) {
      app.clinic.name = clinic_name;
      app.clinic.currency = currency_symbol;
      app.clinic.phone = phone;
      app.clinic.address = address;
      app.toast('Clinic settings updated successfully!', 'success');
    } else {
      app.toast(res.message || 'Failed to update settings', 'error');
    }
  },

  // 2. STAFF USERS TABLE
  async renderUsers(container) {
    const res = await app.api('/auth/users');
    const users = res.data || [];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i class="fa-solid fa-users-gear" style="color: #00c853;"></i> System Users & Staff Accounts
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-dense" style="min-width: 950px;">
            <thead>
              <tr>
                <th style="width: 130px;">Username</th>
                <th style="min-width: 200px;">Full Name</th>
                <th style="width: 140px;">Role</th>
                <th style="width: 130px;">Phone</th>
                <th style="width: 180px;">Email</th>
                <th style="width: 110px;">Status</th>
                <th style="width: 120px;">Created At</th>
                <th style="text-align: right; min-width: 120px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                let roleBadge = 'badge-gray';
                if (u.role === 'admin') roleBadge = 'badge-rose';
                else if (u.role === 'doctor') roleBadge = 'badge-teal';
                else if (u.role === 'pharmacist') roleBadge = 'badge-amber';
                else if (u.role === 'receptionist') roleBadge = 'badge-blue';

                return `
                  <tr>
                    <td class="cell-nowrap"><strong style="font-family: monospace; color: #0f172a; white-space: nowrap;">${u.username}</strong></td>
                    <td class="cell-nowrap"><strong style="white-space: nowrap;">${u.full_name}</strong></td>
                    <td class="cell-nowrap"><span class="badge ${roleBadge}">${u.role.replace('_', ' ')}</span></td>
                    <td class="cell-nowrap">${u.phone || '-'}</td>
                    <td class="cell-nowrap">${u.email || '-'}</td>
                    <td class="cell-nowrap"><span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-gray'}">${u.status}</span></td>
                    <td class="cell-nowrap">${new Date(u.created_at).toLocaleDateString()}</td>
                    <td class="cell-nowrap" style="text-align: right; white-space: nowrap;">
                      <button onclick="settingsComponent.openEditUserModal(${u.id})" class="btn-edit-action" title="Re-edit Staff User Account">
                        <i class="fa-solid fa-pen-to-square"></i> Re-edit
                      </button>
                      <button onclick="settingsComponent.deleteUser(${u.id}, '${u.username}')" class="btn btn-outline btn-sm" title="Delete User" style="color: #ef4444; border-color: #fca5a5;">
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

  openAddUserModal() {
    const bodyHtml = `
      <form id="add-user-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Username</label>
            <input type="text" id="nu-user" class="form-control" placeholder="e.g. reception2" required>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Password</label>
            <input type="password" id="nu-pass" class="form-control" placeholder="••••••••" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label"><span class="required">*</span> Full Name</label>
          <input type="text" id="nu-name" class="form-control" placeholder="e.g. Bilal Asghar" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Assigned Role</label>
            <select id="nu-role" class="form-control" required>
              <option value="receptionist">Receptionist / Front Desk</option>
              <option value="admin">Administrator / Clinic Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="nu-phone" class="form-control" placeholder="0300-1234567">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="nu-email" class="form-control" placeholder="staff@dreamgardenclinic.com">
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="settingsComponent.submitAddUser()"><i class="fa-solid fa-save"></i> Create Staff User</button>
    `;

    app.openModal('<i class="fa-solid fa-user-plus"></i> Add Staff Account', bodyHtml, footerHtml);
  },

  async submitAddUser() {
    const username = document.getElementById('nu-user').value.trim();
    const password = document.getElementById('nu-pass').value;
    const full_name = document.getElementById('nu-name').value.trim();
    const role = document.getElementById('nu-role').value;
    const phone = document.getElementById('nu-phone').value.trim();
    const email = document.getElementById('nu-email').value.trim();

    if (!username || !password || !full_name) {
      app.toast('Please fill all required fields.', 'error');
      return;
    }

    const res = await app.api('/auth/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, full_name, role, phone, email })
    });

    if (res.success) {
      app.toast('Staff account created successfully in database!', 'success');
      app.closeModal();
      this.renderUsers(document.getElementById('settings-content-area'));
    } else {
      app.toast(res.message || 'Failed to create user', 'error');
    }
  },

  async openEditUserModal(userId) {
    const res = await app.api('/auth/users');
    if (!res.success) return;
    const u = res.data.find(user => user.id === userId);
    if (!u) return;

    const bodyHtml = `
      <form id="edit-user-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Username (Read-only)</label>
            <input type="text" class="form-control" value="${u.username}" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">New Password (Leave blank to keep current)</label>
            <input type="password" id="eu-pass" class="form-control" placeholder="••••••••">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label"><span class="required">*</span> Full Name</label>
          <input type="text" id="eu-name" class="form-control" value="${u.full_name}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Assigned Role</label>
            <select id="eu-role" class="form-control" required>
              <option value="receptionist" ${u.role === 'receptionist' ? 'selected' : ''}>Receptionist / Front Desk</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator / Clinic Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Account Status</label>
            <select id="eu-status" class="form-control">
              <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${u.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="eu-phone" class="form-control" value="${u.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="eu-email" class="form-control" value="${u.email || ''}">
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="settingsComponent.submitEditUser(${u.id})"><i class="fa-solid fa-save"></i> Save Changes</button>
    `;

    app.openModal(`<i class="fa-solid fa-user-pen"></i> Edit Staff Account: ${u.username}`, bodyHtml, footerHtml);
  },

  async submitEditUser(userId) {
    const full_name = document.getElementById('eu-name').value.trim();
    const password = document.getElementById('eu-pass').value;
    const role = document.getElementById('eu-role').value;
    const status = document.getElementById('eu-status').value;
    const phone = document.getElementById('eu-phone').value.trim();
    const email = document.getElementById('eu-email').value.trim();

    if (!full_name) {
      app.toast('Full name is required.', 'error');
      return;
    }

    const payload = { full_name, role, status, phone, email };
    if (password && password.trim().length > 0) {
      payload.password = password;
    }

    const res = await app.api(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (res.success) {
      app.toast('Staff account updated successfully in database!', 'success');
      app.closeModal();
      this.renderUsers(document.getElementById('settings-content-area'));
    } else {
      app.toast(res.message || 'Failed to update user', 'error');
    }
  },

  async deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to permanently delete user "${username}" from the database?`)) return;
    const res = await app.api(`/auth/users/${userId}`, { method: 'DELETE' });
    if (res.success) {
      app.toast(`User "${username}" deleted from database.`, 'success');
      this.renderUsers(document.getElementById('settings-content-area'));
    } else {
      app.toast(res.message || 'Failed to delete user', 'error');
    }
  }
};
