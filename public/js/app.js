// ==========================================================================
// DREAM GARDEN POLYCLINIC - CORE CLIENT APPLICATION & ROUTER
// ==========================================================================

const app = {
  user: null,
  token: null,
  clinic: {
    name: 'Dream Garden PolyClinic',
    currency: 'Rs.',
    phone: '+92 42 35890123 / +92 300 8472910',
    address: 'Plot # 14-B, Medical Avenue, Main Boulevard, Garden Town'
  },
  currentView: 'dashboard',
  globalSelectedDate: null,

  getLocalISODate(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getSelectedDate() {
    const today = this.getLocalISODate();
    // Check if this is an explicit in-session page reload (F5)
    let isPageReload = false;
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        isPageReload = navEntries[0].type === 'reload';
      } else if (performance.navigation) {
        isPageReload = performance.navigation.type === 1; // TYPE_RELOAD
      }
    } catch (e) {
      isPageReload = false;
    }

    if (isPageReload) {
      const saved = localStorage.getItem('gclinic_selected_date');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    }

    // On fresh application open / new day, always default to today's date
    localStorage.setItem('gclinic_selected_date', today);
    return today;
  },

  setSelectedDate(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    this.globalSelectedDate = dateStr;
    localStorage.setItem('gclinic_selected_date', dateStr);
    if (typeof appointmentsComponent !== 'undefined') {
      appointmentsComponent.selectedDate = dateStr;
    }
    if (typeof dashboardComponent !== 'undefined') {
      dashboardComponent.selectedDate = dateStr;
    }
  },

  init() {
    this.token = localStorage.getItem('dgp_token');
    const userJson = localStorage.getItem('dgp_user');
    if (userJson) {
      try { this.user = JSON.parse(userJson); } catch (e) { this.user = null; }
    }

    // Initialize Global Selected Date from LocalStorage
    this.globalSelectedDate = this.getSelectedDate();

    // Initialize Theme (Light Mode Default)
    this.initTheme();

    // Initialize Compact Density Mode
    if (typeof this.initCompactMode === 'function') {
      this.initCompactMode();
    }

    // Restore sidebar collapse state
    if (localStorage.getItem('gclinic_sidebar_collapsed') === 'true') {
      const appEl = document.getElementById('app-container');
      if (appEl) appEl.classList.add('sidebar-collapsed');
    }

    this.startLiveClock();

    if (this.token && this.user) {
      this.showPortal();
    } else {
      this.showLogin();
    }
  },

  // --------------------------------------------------------------------------
  // THEME MANAGEMENT (Light Mode Default & Dark Mode Toggle)
  // --------------------------------------------------------------------------
  initTheme() {
    const savedTheme = localStorage.getItem('gclinic_theme') || 'light';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gclinic_theme', theme);

    const btnIcon = document.getElementById('theme-toggle-icon');
    const btnText = document.getElementById('theme-toggle-text');

    if (theme === 'dark') {
      if (btnIcon) btnIcon.className = 'fa-solid fa-sun';
      if (btnText) btnText.textContent = 'Light Mode';
    } else {
      if (btnIcon) btnIcon.className = 'fa-solid fa-moon';
      if (btnText) btnText.textContent = 'Dark Mode';
    }

    // Refresh charts if on dashboard
    if (this.currentView === 'dashboard' && typeof dashboardComponent !== 'undefined' && dashboardComponent.load) {
      dashboardComponent.load();
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    this.toast(`Switched to ${next === 'dark' ? 'Dark Midnight Slate' : 'Light Arctic Medical'} Mode`, 'success');
  },

  // --------------------------------------------------------------------------
  // COMPACT DENSITY MODE MANAGEMENT
  // --------------------------------------------------------------------------
  initCompactMode() {
    const savedCompact = localStorage.getItem('gclinic_compact') === 'true';
    if (savedCompact) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  },

  toggleCompactMode() {
    const isCompact = document.body.classList.toggle('compact-mode');
    localStorage.setItem('gclinic_compact', isCompact ? 'true' : 'false');
    this.toast(`Switched to ${isCompact ? 'Compact Density' : 'Comfortable Density'} Mode`, 'info');
  },

  // --------------------------------------------------------------------------
  // ROLE-BASED ACCESS CONTROL (Admin Full Control vs Receptionist Control)
  // --------------------------------------------------------------------------
  applyRolePermissions() {
    const role = (this.user && this.user.role) ? this.user.role.toLowerCase() : 'admin';
    const isReceptionist = role === 'receptionist';

    // Toggle Admin-Only Sidebar Items
    document.querySelectorAll('.admin-only-item').forEach(el => {
      el.style.display = isReceptionist ? 'none' : '';
    });

    // Update Sidebar User Role Display
    const roleEl = document.getElementById('sidebar-user-role');
    if (roleEl) {
      roleEl.textContent = isReceptionist ? 'Front Desk Reception' : (role === 'admin' ? 'Super Administrator' : (this.user.role || 'Staff'));
      roleEl.style.color = isReceptionist ? 'var(--caramel)' : 'var(--cyber-green-neon)';
    }
  },

  toggleSidebar() {
    const appEl = document.getElementById('app-container');
    if (appEl) {
      appEl.classList.toggle('sidebar-collapsed');
      const isCollapsed = appEl.classList.contains('sidebar-collapsed');
      localStorage.setItem('gclinic_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
  },

  startLiveClock() {
    const clockEl = document.getElementById('header-live-clock');
    const updateClock = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    };
    updateClock();
    setInterval(updateClock, 1000);
  },

  // Calculate age automatically from Date of Birth
  calcAgeFromDob(dobInputId, displayId) {
    const dobInput = document.getElementById(dobInputId);
    const displayEl = document.getElementById(displayId);
    if (!dobInput || !dobInput.value) {
      if (displayEl) displayEl.innerHTML = '<span style="color: #94a3b8; font-weight: 500; font-size: 0.78rem;">Select Date of Birth</span>';
      return null;
    }
    const birth = new Date(dobInput.value);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    if (isNaN(years) || years < 0) years = 0;
    if (displayEl) {
      displayEl.innerHTML = `<span class="badge badge-teal" style="font-size: 0.78rem; font-weight: 800;"><i class="fa-solid fa-cake-candles"></i> ${years} Years Old</span>`;
    }
    return years;
  },

  // API Fetch Wrapper
  async api(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        if (!endpoint.includes('/auth/login') && !endpoint.includes('/public/')) {
          this.toast('Session expired or unauthenticated. Please sign in again.', 'warning');
          this.logout();
          return { success: false, message: 'Unauthorized' };
        }
      } else if (response.status === 403) {
        const data = await response.json().catch(() => ({ message: 'Access Restricted' }));
        this.toast(`🔒 ${data.message || 'Access Restricted: You do not have permission for this action.'}`, 'warning');
        return { success: false, message: data.message || 'Permission Denied' };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.warn(`Non-JSON response from ${endpoint}:`, text.slice(0, 150));
        return {
          success: false,
          message: response.ok
            ? 'Unexpected server response format.'
            : `Server returned status ${response.status}. Please check backend logs.`
        };
      }

      const data = await response.json();
      
      const method = (options.method || 'GET').toUpperCase();

      // On mutation requests (POST, PUT, DELETE, PATCH), invalidate related client cache so UI updates instantly
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && data && data.success) {
        if (this._apiCache) {
          // Identify root resource (e.g. '/patients', '/appointments', '/doctors', '/consultations', '/vitals')
          const baseResource = endpoint.split('?')[0].split('/')[1] ? `/${endpoint.split('?')[0].split('/')[1]}` : '';
          if (baseResource) {
            this.clearClientCache(baseResource);
          }
          // Mutations also affect overall dashboard KPIs, revenue, and queue counters
          this.clearClientCache('/dashboard');
          this.clearClientCache('/appointments');
        }
      }

      // Cache successful GET requests for instant repeat views
      if (method === 'GET' && data && data.success) {
        if (!this._apiCache) this._apiCache = new Map();
        this._apiCache.set(endpoint, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      this.toast(err.message || 'Network error or server unreachable', 'error');
      return { success: false, message: err.message };
    }
  },

  // Stale-While-Revalidate API helper for 0ms instantaneous UI rendering
  async swrApi(endpoint, onFreshData = null, ttlMs = 45000) {
    if (!this._apiCache) this._apiCache = new Map();
    const cached = this._apiCache.get(endpoint);
    const viewAtRequest = this.currentView;

    // If fresh cache exists, return immediately (0ms)
    if (cached && (Date.now() - cached.timestamp < ttlMs)) {
      // Trigger background revalidation quietly without blocking
      setTimeout(() => {
        this.api(endpoint).then(fresh => {
          // Guard: Only execute onFreshData callback if the user is STILL on the view that requested it
          if (fresh && fresh.success && onFreshData && this.currentView === viewAtRequest) {
            onFreshData(fresh);
          }
        }).catch(() => {});
      }, 50);
      return cached.data;
    }

    // Otherwise fetch directly
    const res = await this.api(endpoint);
    return res;
  },

  clearClientCache(endpointPrefix = null) {
    if (!this._apiCache) return;
    if (!endpointPrefix) {
      this._apiCache.clear();
      return;
    }
    for (const key of this._apiCache.keys()) {
      if (key.includes(endpointPrefix)) {
        this._apiCache.delete(key);
      }
    }
  },

  // Authentication
  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

    const res = await this.api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Portal';

    if (res.success) {
      this.token = res.token;
      this.user = res.user;
      if (res.clinic) this.clinic = { ...this.clinic, ...res.clinic };

      localStorage.setItem('dgp_token', this.token);
      localStorage.setItem('dgp_user', JSON.stringify(this.user));

      this.setSelectedDate(this.getLocalISODate());
      this.toast(`Welcome, ${this.user.full_name}!`, 'success');
      this.showPortal();
    } else {
      this.toast(res.message || 'Login failed', 'error');
    }
  },

  async quickLogin(username, password) {
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
    const form = document.getElementById('login-form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
      input.type = 'password';
      if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
  },

  logout() {
    localStorage.removeItem('dgp_token');
    localStorage.removeItem('dgp_user');
    localStorage.removeItem('gclinic_selected_date');
    sessionStorage.removeItem('gclinic_current_view');
    window.location.hash = '';
    this.token = null;
    this.user = null;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.showLogin();
  },

  showLogin() {
    const loginEl = document.getElementById('login-screen');
    const appEl = document.getElementById('app-container');
    if (loginEl) loginEl.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
  },

  async showPortal() {
    const loginEl = document.getElementById('login-screen');
    const appEl = document.getElementById('app-container');
    if (loginEl) loginEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';

    // Update sidebar user details
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl && this.user) nameEl.textContent = this.user.full_name;
    if (roleEl && this.user) roleEl.textContent = this.user.role.toUpperCase();
    if (avatarEl && this.user) {
      const initials = this.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'DG';
    }

    // Load initial doctor cache
    const docRes = await this.api('/doctors');
    if (docRes.success) {
      this.doctors = docRes.data;
    }

    // Apply role-based UI permissions
    this.applyRolePermissions();

    // Valid navigation views in the application
    const validViews = ['dashboard', 'doctors', 'patients', 'appointments', 'vitals-bills', 'patient-history', 'billing', 'settings'];
    
    // Check navigation type to detect browser page reload vs fresh link navigation
    let isPageReload = false;
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        isPageReload = navEntries[0].type === 'reload';
      } else if (performance.navigation) {
        isPageReload = performance.navigation.type === 1; // TYPE_RELOAD
      }
    } catch (e) {
      isPageReload = false;
    }

    const hash = window.location.hash.replace('#', '');
    const sessionView = sessionStorage.getItem('gclinic_current_view');

    let targetView = 'dashboard';

    if (isPageReload) {
      // User refreshed the page (F5 or reload button): preserve their active tab
      if (hash && validViews.includes(hash)) {
        targetView = hash;
      } else if (sessionView && validViews.includes(sessionView)) {
        targetView = sessionView;
      }
    } else {
      // Fresh navigation via link: always land on dashboard by default
      // If the link explicitly had a hash (e.g. clinic.com/#appointments), only then honor it
      if (hash && validViews.includes(hash) && hash !== 'dashboard') {
        targetView = hash;
      } else {
        targetView = 'dashboard';
        window.location.hash = 'dashboard';
        sessionStorage.setItem('gclinic_current_view', 'dashboard');
      }
    }

    this.navigate(targetView);

    // Start auto polling for OPD updates
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.refreshActiveBadge();
    }, 15000);
    this.refreshActiveBadge();
  },

  async refreshActiveBadge() {
    const res = await this.api('/appointments/queue/count');
    if (res && res.success) {
      const badge = document.getElementById('sidebar-queue-badge');
      if (badge) badge.textContent = res.count ?? 0;
    }
  },

  async refreshActiveView() {
    try {
      this.refreshActiveBadge();

      // Silently refresh global doctor roster cache in background so all modals/pickers are instantly fresh
      this.api('/doctors').then(res => {
        if (res && res.success && res.data) {
          this.doctors = res.data;
        }
      }).catch(() => {});

      // Instant refresh of the currently active view
      if (this.currentView === 'dashboard' && typeof dashboardComponent !== 'undefined' && dashboardComponent.load) {
        dashboardComponent.load();
      } else if (this.currentView === 'appointments' && typeof appointmentsComponent !== 'undefined' && appointmentsComponent.load) {
        appointmentsComponent.load();
      } else if (this.currentView === 'patients' && typeof patientsComponent !== 'undefined' && patientsComponent.load) {
        patientsComponent.load();
      } else if (this.currentView === 'patient-history' && typeof patientHistoryComponent !== 'undefined') {
        if (patientHistoryComponent.loadPatientsList) patientHistoryComponent.loadPatientsList();
        if (patientHistoryComponent.selectedPatientId && patientHistoryComponent.loadPatientFull360) {
          patientHistoryComponent.loadPatientFull360(patientHistoryComponent.selectedPatientId);
        }
      } else if (this.currentView === 'doctors' && typeof doctorsComponent !== 'undefined' && doctorsComponent.load) {
        doctorsComponent.load();
      } else if (this.currentView === 'vitals-bills' && typeof vitalsBillsComponent !== 'undefined' && vitalsBillsComponent.refreshCurrentTab) {
        vitalsBillsComponent.refreshCurrentTab();
      } else if (this.currentView === 'billing' && typeof billingComponent !== 'undefined' && billingComponent.load) {
        billingComponent.load();
      } else if (this.currentView === 'pharmacy' && typeof pharmacyComponent !== 'undefined' && pharmacyComponent.load) {
        pharmacyComponent.load();
      } else if (this.currentView === 'consultation' && typeof consultationComponent !== 'undefined' && consultationComponent.load) {
        consultationComponent.load();
      } else if (this.currentView === 'settings' && typeof settingsComponent !== 'undefined' && settingsComponent.load) {
        settingsComponent.load();
      }
    } catch (e) {
      console.warn('refreshActiveView encountered error:', e);
    }
  },

  // Alias for backward compatibility
  refreshCurrentView() {
    return this.refreshActiveView();
  },

  async deleteAppointment(appointmentId, patientName = '') {
    if (!confirm(`Are you sure you want to delete this appointment${patientName ? ' for ' + patientName : ''}? This will remove it from the clinic schedule and OPD queue.`)) {
      return;
    }
    const res = await this.api(`/appointments/${appointmentId}`, { method: 'DELETE' });
    if (res.success) {
      this.toast('Appointment was deleted successfully from the database!', 'success');
      this.closeModal();
      this.refreshActiveView();
    } else {
      this.toast(res.message || 'Failed to delete appointment', 'error');
    }
  },

  // Navigation Router
  navigate(viewName) {
    // Role Permission Guard: Block Receptionist from Admin settings
    if (this.user && this.user.role === 'receptionist' && viewName === 'settings') {
      this.toast('🔒 Access Restricted: Settings are only accessible by Administrators.', 'warning');
      viewName = 'dashboard';
    }

    this.currentView = viewName;
    window.location.hash = viewName;
    sessionStorage.setItem('gclinic_current_view', viewName);

    // Update sidebar active link
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      }
    });

    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const mainView = document.getElementById('main-view');

    // Clean teardown: reset container style, class, and clear content to avoid view spillover
    if (mainView) {
      mainView.className = 'page-content';
      mainView.removeAttribute('style');
      mainView.innerHTML = '';
    }

    // Render corresponding component
    switch (viewName) {
      case 'dashboard':
        pageTitle.textContent = 'Dashboard & Clinic Overview';
        pageSubtitle.textContent = 'Real-time patient appointments, live queue, vitals & revenue metrics';
        dashboardComponent.render(mainView);
        break;
      case 'doctors':
        pageTitle.textContent = 'Doctors & Consultants Directory';
        pageSubtitle.textContent = 'Register consultants, consultation fees, specialties & duty schedules';
        doctorsComponent.render(mainView);
        break;
      case 'patients':
        pageTitle.textContent = 'Patients Directory & Health Records';
        pageSubtitle.textContent = 'Register patients, manage medical records, vitals history & past visits';
        patientsComponent.render(mainView);
        break;
      case 'appointments':
        pageTitle.textContent = 'Appointments & OPD Queue';
        pageSubtitle.textContent = 'Book appointments, check-in, vitals recording, and live queue';
        appointmentsComponent.render(mainView);
        break;
      case 'vitals-bills':
        pageTitle.textContent = 'All Vitals & Patient Invoices';
        pageSubtitle.textContent = 'Consolidated history of all recorded patient vitals, warning alerts, invoices & receipts';
        vitalsBillsComponent.render(mainView);
        break;
      case 'patient-history':
        pageTitle.textContent = 'Patient Records';
        pageSubtitle.textContent = 'Patient directory, medical history, past vitals, appointments, invoices & quick registration';
        patientHistoryComponent.render(mainView);
        break;
      case 'billing':
        pageTitle.textContent = 'Billing Counter & Checkout';
        pageSubtitle.textContent = 'Generate patient bills, collect fees & complete the patient visit process';
        billingComponent.render(mainView);
        break;
      case 'settings':
        pageTitle.textContent = 'Clinic Settings & User Roles';
        pageSubtitle.textContent = 'Manage clinic profile and Admin / Receptionist staff accounts';
        settingsComponent.render(mainView);
        break;
      default:
        dashboardComponent.render(mainView);
    }
  },

  openPatientHistoryTab(patientId) {
    this.navigate('patient-history');
    if (typeof patientHistoryComponent !== 'undefined') {
      patientHistoryComponent.selectPatient(patientId);
    }
  },

  // Modal Management (Strict: Outside Click Does NOT Close the Form)
  openModal(title, bodyHtml, footerHtml, sizeClass = '') {
    const modal = document.getElementById('global-modal');
    const dialog = document.getElementById('global-modal-dialog');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    dialog.className = `modal-dialog ${sizeClass}`;
    titleEl.innerHTML = title;
    bodyEl.innerHTML = bodyHtml;
    footerEl.innerHTML = footerHtml;

    modal.classList.add('active');

    // Ensure clicking outside the dialog never dismisses the modal
    if (!this._modalBackdropConfigured) {
      modal.addEventListener('click', (e) => {
        // Only if user clicked directly on the overlay backdrop outside the dialog
        if (e.target === modal) {
          e.stopPropagation();
          e.preventDefault();
          // Optional subtle feedback shake so user knows form must be explicitly cancelled/closed
          if (dialog) {
            dialog.classList.remove('modal-shake-feedback');
            void dialog.offsetWidth; // trigger reflow
            dialog.classList.add('modal-shake-feedback');
          }
        }
      });
      this._modalBackdropConfigured = true;
    }
  },

  closeModal() {
    const modal = document.getElementById('global-modal');
    modal.classList.remove('active');
  },

  // Toast Notification
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}" style="font-size: 1.15rem;"></i>
      <div style="flex: 1; font-size: 0.85rem; font-weight: 500;">${message}</div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #94a3b8; cursor: pointer;">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  },

  // Live Clock
  startLiveClock() {
    const update = () => {
      const el = document.getElementById('header-live-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
    };
    setInterval(update, 1000);
    update();
  },

  // Audio Chime & Speech Synthesizer for Calling Token
  playCallAudio(token, doctorName, roomNo) {
    try {
      // Gentle web audio chime tone
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);

      // Speech synthesis
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const text = `Token Number ${token}. Please proceed to ${doctorName}, in ${roomNo}.`;
          const msg = new SpeechSynthesisUtterance(text);
          msg.rate = 0.9;
          msg.pitch = 1.0;
          window.speechSynthesis.speak(msg);
        }, 500);
      }
    } catch (e) {
      console.log('Audio announcement:', e);
    }
  },

  // Instant Print Engine
  printDocument(contentHtml) {
    const container = document.getElementById('printable-container');
    container.innerHTML = contentHtml;
    window.print();
  },

  // Guided 4-Step Patient Journey Wizard State
  wizardState: {
    step: 1,
    patient: null,
    doctor: null,
    date: new Date().toISOString().slice(0, 10),
    vitals: {},
    appointmentId: null,
    appointmentCode: '',
    items: [],
    discount: 0,
    paid: 0,
    payMethod: 'cash'
  },



  // ==========================================================================
  // GLOBAL FORM VALIDATION & FIELD HIGHLIGHTING (USER REQUIREMENT)
  // ==========================================================================
  highlightField(target, message = 'This field is required or invalid') {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;

    el.classList.add('is-invalid');
    
    // Remove existing error message if any
    const parent = el.parentElement;
    if (parent) {
      const existingMsg = parent.querySelector('.field-error-msg');
      if (existingMsg) existingMsg.remove();
      
      if (message) {
        const msgEl = document.createElement('div');
        msgEl.className = 'field-error-msg';
        msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
        parent.appendChild(msgEl);
      }
    }

    // Auto-clear invalid state once user starts typing/correcting
    const cleanListener = () => {
      this.clearFieldHighlight(el);
      el.removeEventListener('input', cleanListener);
      el.removeEventListener('change', cleanListener);
    };
    el.addEventListener('input', cleanListener);
    el.addEventListener('change', cleanListener);
    
    if (typeof el.focus === 'function') {
      try { el.focus(); } catch (e) {}
    }
  },

  clearFieldHighlight(target) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    el.classList.remove('is-invalid');
    const parent = el.parentElement;
    if (parent) {
      const existingMsg = parent.querySelector('.field-error-msg');
      if (existingMsg) existingMsg.remove();
    }
  },

  clearAllHighlights(container) {
    const root = container || document;
    root.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    root.querySelectorAll('.field-error-msg').forEach(el => el.remove());
  },

  // UNIVERSAL FORM VALIDATOR (USER REQUIREMENT)
  validateForm(formElementOrId) {
    const root = typeof formElementOrId === 'string' ? document.getElementById(formElementOrId) : formElementOrId;
    if (!root) return true;

    this.clearAllHighlights(root);

    const requiredFields = root.querySelectorAll('input[required], select[required], textarea[required], [data-required="true"]');
    let firstInvalid = null;
    let isValid = true;

    requiredFields.forEach(field => {
      // Ignore hidden fields or fields inside display:none containers
      if (field.offsetParent === null && field.type !== 'hidden') return;

      let hasVal = false;
      const val = field.value !== undefined ? String(field.value).trim() : '';

      if (field.type === 'checkbox' || field.type === 'radio') {
        hasVal = field.checked;
      } else if (field.tagName === 'SELECT') {
        hasVal = val !== '' && val !== 'placeholder';
      } else if (field.type === 'number') {
        hasVal = val !== '' && !isNaN(val) && Number(val) >= 0;
      } else {
        hasVal = val.length > 0;
      }

      if (!hasVal) {
        isValid = false;
        const customMsg = field.getAttribute('data-error-msg') || 'This field is required';
        this.highlightField(field, customMsg);
        if (!firstInvalid) firstInvalid = field;
      }
    });

    if (!isValid && firstInvalid) {
      try {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      } catch (e) {}
    }

    return isValid;
  },

  // ==========================================================================
  // DOCTOR TIME SLOTS & ROSTER DAY/DATE ACCURATE MATCHING
  // ==========================================================================
  getDoctorRosterInfo(doctor, dateStr) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Parse target date and day of week
    const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
    const dayName = daysOfWeek[d.getDay()];
    const shortDayName = shortDays[d.getDay()];

    const schedules = doctor.schedules || [];
    let scheduleRows = [];
    let isOnDuty = false;
    let shiftTiming = '';
    let isCurrentlyLiveShift = false;

    // Helper to test if now is within shift hours
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTimeToMins = (tStr) => {
      if (!tStr) return 0;
      let s = tStr.trim();
      let isPm = s.toLowerCase().includes('pm');
      let isAm = s.toLowerCase().includes('am');
      s = s.replace(/am|pm/gi, '').trim();
      const parts = s.split(':');
      let h = parseInt(parts[0], 10) || 0;
      let m = parseInt(parts[1], 10) || 0;
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;
      return h * 60 + m;
    };

    const isToday = !dateStr || (new Date().toISOString().slice(0, 10) === dateStr);

    if (schedules.length > 0) {
      const grouped = {};
      schedules.forEach(s => {
        if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
        grouped[s.day_of_week].push(`${s.start_time} - ${s.end_time}`);
      });
      scheduleRows = Object.keys(grouped).map(day => ({
        days: day,
        time: grouped[day].join(', ')
      }));

      const todayShifts = schedules.filter(s => 
        s.day_of_week === dayName || 
        s.day_of_week === shortDayName || 
        s.day_of_week === 'All Days' ||
        (s.day_of_week && s.day_of_week.toLowerCase().includes(shortDayName.toLowerCase()))
      );

      if (todayShifts.length > 0) {
        isOnDuty = true;
        shiftTiming = todayShifts.map(s => `${s.start_time} - ${s.end_time}`).join(' & ');

        if (isToday) {
          for (let shift of todayShifts) {
            const startM = parseTimeToMins(shift.start_time);
            const endM = parseTimeToMins(shift.end_time);
            if (nowMinutes >= startM && nowMinutes <= endM) {
              isCurrentlyLiveShift = true;
              break;
            }
          }
        }
      }
    } else {
      const availDays = doctor.available_days || 'Mon,Tue,Wed,Thu,Fri,Sat';
      scheduleRows.push({
        days: availDays,
        time: `${doctor.start_time || '10:00 AM'} - ${doctor.end_time || '03:00 PM'}`
      });

      if (availDays.toLowerCase().includes(shortDayName.toLowerCase()) || availDays.toLowerCase().includes(dayName.toLowerCase()) || availDays === 'All Days') {
        isOnDuty = true;
        shiftTiming = `${doctor.start_time || '10:00 AM'} - ${doctor.end_time || '03:00 PM'}`;
        if (isToday) {
          const startM = parseTimeToMins(doctor.start_time || '10:00 AM');
          const endM = parseTimeToMins(doctor.end_time || '03:00 PM');
          if (nowMinutes >= startM && nowMinutes <= endM) {
            isCurrentlyLiveShift = true;
          }
        }
      }
    }

    return {
      dayName,
      shortDayName,
      isOnDuty,
      isCurrentlyLiveShift,
      shiftTiming: shiftTiming || (isOnDuty ? `${doctor.start_time} - ${doctor.end_time}` : 'Off Duty'),
      scheduleRows: scheduleRows.length > 0 ? scheduleRows : [{ days: 'Mon - Sat', time: '10:00 AM - 03:00 PM' }]
    };
  },

  getDoctorTimeSlots(doctor, dateStr, existingAppointments = []) {
    const parseTime = (tStr) => {
      if (!tStr) return null;
      let s = tStr.trim();
      let isPm = s.toLowerCase().includes('pm');
      let isAm = s.toLowerCase().includes('am');
      s = s.replace(/am|pm/gi, '').trim();
      const parts = s.split(':');
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) || 0;
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;
      return { h, m };
    };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
    const dayName = daysOfWeek[d.getDay()];
    const shortDayName = shortDays[d.getDay()];

    const roster = this.getDoctorRosterInfo(doctor, dateStr);
    if (!roster.isOnDuty) {
      return [];
    }

    const schedules = doctor.schedules || [];
    let activeShifts = [];

    if (schedules.length > 0) {
      activeShifts = schedules.filter(s => 
        s.day_of_week === dayName || 
        s.day_of_week === shortDayName || 
        s.day_of_week === 'All Days' ||
        (s.day_of_week && s.day_of_week.toLowerCase().includes(shortDayName.toLowerCase()))
      );
    } else {
      activeShifts.push({
        start_time: doctor.start_time || '10:00 AM',
        end_time: doctor.end_time || '02:00 PM'
      });
    }

    if (activeShifts.length === 0) {
      return [];
    }

    const slots = [];
    const seenTimes = new Set();

    activeShifts.forEach(shift => {
      const s = parseTime(shift.start_time) || { h: 10, m: 0 };
      const e = parseTime(shift.end_time) || { h: 14, m: 0 };
      let currTotalMin = s.h * 60 + s.m;
      let endTotalMin = e.h * 60 + e.m;
      if (endTotalMin <= currTotalMin) endTotalMin += (12 * 60);

      while (currTotalMin < endTotalMin) {
        let h = Math.floor(currTotalMin / 60) % 24;
        let m = currTotalMin % 60;
        let ampm = h >= 12 ? 'PM' : 'AM';
        let dispH = h % 12;
        if (dispH === 0) dispH = 12;
        let dispM = m < 10 ? '0' + m : m;
        let timeString = `${dispH < 10 ? '0' + dispH : dispH}:${dispM} ${ampm}`;

        if (!seenTimes.has(timeString)) {
          seenTimes.add(timeString);
          let bookedCount = existingAppointments.filter(a => {
            return a.doctor_id == doctor.id && a.appointment_date === dateStr && (a.appointment_time === timeString || a.appointment_time?.startsWith(timeString.slice(0, 5))) && a.status !== 'cancelled';
          }).length;

          slots.push({
            time: timeString,
            bookedCount: bookedCount
          });
        }
        currTotalMin += 20;
      }
    });

    return slots;
  },

  // ==========================================================================
  // ==========================================================================
  // UNIFIED SINGLE-FORM APPOINTMENT BOOKING (1 Single Form, No Multi-Step Wizard)
  // ==========================================================================
  async openBookAppointmentModal(preselectedPatientId = null, preselectedDoctorId = null, preselectedDate = null) {
    this.bookState = {
      patient: null,
      doctor: null,
      date: preselectedDate || this.globalSelectedDate || new Date().toISOString().slice(0, 10),
      time: '',
      type: 'scheduled',
      priority: 'normal',
      complaint: ''
    };

    const [patRes, docRes, apptRes] = await Promise.all([
      this.api('/patients?limit=150'),
      this.api('/doctors'),
      this.api(`/appointments?date=${this.bookState.date}`)
    ]);

    this.bookPatients = patRes.data || [];
    this.bookDoctors = docRes.data || [];
    this.bookDayAppointments = apptRes.data || [];

    if (preselectedPatientId) {
      this.bookState.patient = this.bookPatients.find(p => p.id == preselectedPatientId) || null;
    }
    if (preselectedDoctorId) {
      this.bookState.doctor = this.bookDoctors.find(d => d.id == preselectedDoctorId) || null;
    } else if (this.bookDoctors.length > 0) {
      // Find first doctor who is ON DUTY for this date, or fallback to first doctor
      const onDutyDoc = this.bookDoctors.find(d => this.getDoctorRosterInfo(d, this.bookState.date).isOnDuty);
      this.bookState.doctor = onDutyDoc || this.bookDoctors[0];
    }

    const { patient, doctor, date } = this.bookState;

    const bodyHtml = `
      <div id="single-book-appointment-form" style="display: flex; flex-direction: column; gap: 1rem;">
        
        <!-- Step 1: Patient Selection Card -->
        <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 0.85rem 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <div style="font-size: 0.88rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: #00c853; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800;">1</span>
              <span>Patient Details</span>
              <span class="required">*</span>
            </div>
            <button type="button" onclick="app.toggleBookInlineRegister()" class="btn btn-outline-primary btn-sm" id="btn-toggle-new-pat" style="padding: 0.2rem 0.55rem; font-size: 0.75rem; height: 28px; border-radius: 6px;">
              <i class="fa-solid fa-user-plus"></i> + New Patient
            </button>
          </div>

          <!-- Existing Patient Search & Selected Badge -->
          <div id="book-existing-pat-box">
            <div style="position: relative; display: flex; align-items: center;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; color: var(--primary); font-size: 0.85rem; pointer-events: none; z-index: 2;"></i>
              <input type="text" id="book-pat-filter-input" name="gclinic_patient_search_input_${Date.now()}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="form-control" style="padding-left: 2.4rem !important; font-size: 0.84rem; height: 38px !important; font-weight: 600; border-radius: 8px; width: 100%;" placeholder="Search patient by name, MRN, or phone number..." value="${patient ? `${patient.mrn} - ${patient.full_name}` : ''}" onfocus="app.renderBookPatientList(this.value)" onclick="app.renderBookPatientList(this.value)" oninput="app.filterBookPatientsList(this.value)">
              ${patient ? `<button type="button" onclick="app.clearBookPatientSelection()" style="position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; line-height: 1;" title="Clear patient">&times;</button>` : ''}
            </div>
            
            <!-- Patient Search Dropdown List (Overlay style, clean) -->
            <div id="book-patient-search-list" class="patient-search-results-box" style="margin-top: 0.35rem; max-height: 140px; display: none; border-radius: 8px; border: 1.5px solid var(--primary); box-shadow: 0 6px 18px rgba(0,0,0,0.08);">
              ${this.renderBookPatientRowsHtml(this.bookPatients)}
            </div>

            <div id="book-pat-preview" style="background: rgba(5, 181, 85, 0.08); border: 1.5px solid rgba(5, 181, 85, 0.35); padding: 0.4rem 0.65rem; border-radius: 8px; display: ${patient ? 'flex' : 'none'}; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
              ${patient ? `
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="font-weight: 800; font-size: 0.85rem; color: #007a33; display: flex; align-items: center; gap: 0.3rem;">
                    <i class="fa-solid fa-circle-check" style="color: #00c853;"></i> ${patient.full_name}
                  </span>
                  <span style="font-family: monospace; font-weight: 700; font-size: 0.72rem; color: var(--primary); background: var(--bg-card); padding: 0.1rem 0.35rem; border-radius: 4px; border: 1px solid var(--border-color);">MRN: #${patient.mrn}</span>
                  <span class="badge ${patient.gender === 'Female' ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.68rem; padding: 0.1rem 0.35rem;">${patient.gender || '-'}, ${patient.age || '-'}Y</span>
                  <span style="font-size: 0.74rem; color: var(--text-muted);"><i class="fa-solid fa-phone" style="font-size: 0.68rem; margin-right: 2px;"></i>${patient.phone || '-'}</span>
                </div>
                <button type="button" onclick="app.clearBookPatientSelection()" class="btn btn-outline btn-xs" style="padding: 0.1rem 0.35rem; font-size: 0.68rem; height: 22px;" title="Change / Clear Patient">Change</button>
              ` : ''}
            </div>
          </div>

          <!-- Inline Quick Registration Form -->
          <div id="book-new-pat-box" style="display: none; background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 0.75rem; border-radius: 8px; margin-top: 0.25rem;">
            <div style="font-weight: 800; font-size: 0.84rem; color: #007a33; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-user-plus"></i> Quick Patient Registration
            </div>
            <div class="form-row" style="margin-bottom: 0.45rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.75rem;"><span class="required">*</span> Full Name</label>
                <input type="text" id="book-np-name" class="form-control" placeholder="e.g. Muhammad Ali" style="height: 32px; font-size: 0.82rem;">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.75rem;"><span class="required">*</span> Mobile Number</label>
                <input type="tel" id="book-np-phone" class="form-control" placeholder="0300-1234567" style="height: 32px; font-size: 0.82rem;">
              </div>
            </div>
            <div class="form-row" style="margin-bottom: 0.55rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.75rem;"><span class="required">*</span> Gender</label>
                <select id="book-np-gender" class="form-control" style="height: 32px; font-size: 0.82rem; padding: 0.2rem 0.45rem;">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.75rem;"><span class="required">*</span> Date of Birth</label>
                <input type="date" id="book-np-dob" class="form-control" style="height: 32px; font-size: 0.82rem; padding: 0.2rem 0.45rem;" onchange="app.calcAgeFromDob('book-np-dob', 'book-np-age-display')">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.75rem;">Blood Group</label>
                <select id="book-np-blood" class="form-control" style="height: 32px; font-size: 0.82rem; padding: 0.2rem 0.45rem;">
                  <option value="Unknown">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="O+">O+</option>
                  <option value="AB+">AB+</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="O-">O-</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" onclick="app.toggleBookInlineRegister()" class="btn btn-outline btn-sm" style="height: 30px; font-size: 0.78rem;">Cancel</button>
              <button type="button" onclick="app.submitBookQuickPatient()" class="btn btn-primary btn-sm" style="flex: 1; height: 30px; font-size: 0.78rem; box-shadow: 0 4px 12px rgba(0, 200, 83, 0.3);">
                <i class="fa-solid fa-save"></i> Save & Select Patient
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Doctor, Date & Time Selection (Simple & Clean Grid) -->
        <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 0.85rem 1rem;">
          <div style="font-size: 0.88rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.45rem;">
            <span style="width: 22px; height: 22px; border-radius: 50%; background: #00c853; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800;">2</span>
            <span>Doctor & Appointment Time</span>
            <span class="required">*</span>
          </div>

          <!-- Doctor & Date Selection Row -->
          <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 0.85rem; align-items: start;">
            
            <!-- Doctor Picker Dropdown (Only On-Duty Doctors for Selected Date) -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.76rem; font-weight: 700; color: var(--text-body);">Consultant Doctor <span class="required">*</span></label>
              <select id="book-appt-doctor-select" class="form-control" style="height: 38px; font-size: 0.85rem; font-weight: 700;" onchange="app.onBookDoctorDropdownChange(this.value)">
                ${this.renderBookDoctorOptionsHtml(date, doctor ? doctor.id : null)}
              </select>
              <div id="book-doc-meta-info" style="margin-top: 0.4rem; font-size: 0.74rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                ${this.renderDoctorMetaBadgeHtml(doctor, date)}
              </div>
            </div>

            <!-- Date Picker with Quick Tabs -->
            <div class="form-group" style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <label class="form-label" style="font-size: 0.76rem; font-weight: 700; color: var(--text-body); margin-bottom: 0;">Appointment Date <span class="required">*</span></label>
                <div style="display: flex; gap: 0.25rem;">
                  <button type="button" class="btn btn-sm btn-outline" style="padding: 0.1rem 0.35rem; font-size: 0.68rem; height: 22px;" onclick="app.setBookDatePreset('today')">Today</button>
                  <button type="button" class="btn btn-sm btn-outline" style="padding: 0.1rem 0.35rem; font-size: 0.68rem; height: 22px;" onclick="app.setBookDatePreset('tomorrow')">Tomorrow</button>
                </div>
              </div>
              <input type="date" id="book-appt-date" class="form-control" style="height: 38px; font-size: 0.85rem; font-weight: 700; padding: 0.3rem 0.6rem;" value="${date}" onchange="app.handleBookDateChange(this.value)">
            </div>
          </div>

          <!-- Time Slots Container -->
          <div style="margin-top: 0.85rem;">
            <div id="book-time-slots-section" style="background: var(--bg-canvas); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.65rem 0.85rem;">
              ${doctor ? this.renderDoctorTimeSlotsHtml(doctor, date) : '<div style="color: #94a3b8; font-size: 0.8rem; text-align: center;">Please select a doctor to load time slots</div>'}
            </div>
          </div>
        </div>

        <!-- Step 3: Visit Reason & Classification (Optional / Compact) -->
        <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 0.75rem 1rem;">
          <div style="font-size: 0.84rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.45rem;">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: #64748b; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800;">3</span>
              <span>Visit Details & Reason (Optional)</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 0.65rem; align-items: center;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.72rem; margin-bottom: 2px;">Type</label>
              <select id="book-appt-type" class="form-control" style="height: 32px; font-size: 0.8rem;">
                <option value="scheduled" selected>Scheduled</option>
                <option value="walk_in">Walk-in OPD</option>
                <option value="follow_up">Follow-up</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.72rem; margin-bottom: 2px;">Priority</label>
              <select id="book-appt-priority" class="form-control" style="height: 32px; font-size: 0.8rem;">
                <option value="normal" selected>Normal</option>
                <option value="urgent">Urgent</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.72rem; margin-bottom: 2px;">Reason / Chief Complaint</label>
              <input type="text" id="book-appt-complaint" class="form-control" placeholder="e.g. Routine checkup, fever, headache" style="height: 32px; font-size: 0.8rem;">
            </div>
          </div>
        </div>

      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" onclick="app.closeModal()" class="btn btn-outline" style="font-weight: 600;">Cancel</button>
        <button type="button" onclick="app.confirmBookAppointment()" class="btn btn-primary" id="btn-confirm-book" style="box-shadow: 0 4px 14px rgba(0, 200, 83, 0.4); font-weight: 800; padding: 0.5rem 1.4rem; font-size: 0.88rem; border-radius: 8px;">
          <i class="fa-solid fa-calendar-check"></i> Confirm & Book Appointment
        </button>
      </div>
    `;

    this.openModal(
      '<i class="fa-solid fa-calendar-plus" style="color: #00c853;"></i> Book Patient Appointment',
      bodyHtml,
      footerHtml,
      'modal-md'
    );
  },

  renderBookDoctorOptionsHtml(dateStr, selectedDoctorId) {
    // Only display doctors who are ON DUTY on this date
    const onDutyDoctors = this.bookDoctors.filter(d => this.getDoctorRosterInfo(d, dateStr).isOnDuty);

    if (onDutyDoctors.length === 0) {
      return `<option value="">⚠️ No doctors on duty on selected date</option>`;
    }

    return onDutyDoctors.map(d => {
      const isSel = (selectedDoctorId && selectedDoctorId == d.id) ? 'selected' : '';
      return `<option value="${d.id}" ${isSel}>${d.name} — ${d.specialty}</option>`;
    }).join('');
  },

  clearBookPatientSelection() {
    this.bookState.patient = null;
    const input = document.getElementById('book-pat-filter-input');
    if (input) input.value = '';
    const preview = document.getElementById('book-pat-preview');
    if (preview) {
      preview.style.display = 'none';
      preview.innerHTML = '';
    }
    const listEl = document.getElementById('book-patient-search-list');
    if (listEl) listEl.style.display = 'none';
  },

  renderDoctorMetaBadgeHtml(doctor, dateStr) {
    if (!doctor) return '';
    const roster = this.getDoctorRosterInfo(doctor, dateStr);
    const fee = `${this.clinic.currency} ${parseFloat(doctor.consultation_fee || 0).toLocaleString()}`;
    const dutyBadge = roster.isOnDuty
      ? `<span class="badge badge-green" style="font-size: 0.72rem; padding: 0.2rem 0.55rem;"><i class="fa-solid fa-circle-check"></i> On Duty: ${roster.shiftTiming}</span>`
      : `<span class="badge badge-rose" style="font-size: 0.72rem; padding: 0.2rem 0.55rem;"><i class="fa-solid fa-calendar-xmark"></i> Off Duty (${roster.dayName})</span>`;

    return `
      <span style="font-weight: 700; color: #007a33; background: #e8fbf0; padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid #bbf7d0;">Fee: ${fee}</span>
      <span style="color: #64748b; font-weight: 600;">• Room: ${doctor.room_no || 'OPD-1'}</span>
      <span style="margin-left: auto;">${dutyBadge}</span>
    `;
  },

  onBookDoctorDropdownChange(docId) {
    const doc = this.bookDoctors.find(d => d.id == docId);
    if (!doc) return;
    this.bookState.doctor = doc;
    this.clearFieldHighlight('book-appt-doctor-select');

    // Update meta badge
    const metaContainer = document.getElementById('book-doc-meta-info');
    if (metaContainer) {
      metaContainer.innerHTML = this.renderDoctorMetaBadgeHtml(doc, this.bookState.date);
    }

    // Refresh time slots
    const slotSection = document.getElementById('book-time-slots-section');
    if (slotSection) {
      slotSection.innerHTML = this.renderDoctorTimeSlotsHtml(doc, this.bookState.date);
    }
  },

  renderDoctorTimeSlotsHtml(doctor, dateStr) {
    const roster = this.getDoctorRosterInfo(doctor, dateStr);
    const slots = this.getDoctorTimeSlots(doctor, dateStr, this.bookDayAppointments || []);

    if (!roster.isOnDuty || slots.length === 0) {
      this.bookState.time = null;
      const dutyDays = roster.scheduleRows.map(r => r.days).join(', ') || doctor.available_days || 'N/A';
      return `
        <div style="padding: 0.85rem; border-radius: 8px; background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; text-align: center;">
          <div style="font-size: 0.88rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
            <i class="fa-solid fa-calendar-xmark" style="color: #e11d48;"></i> Doctor ${doctor.name} is not on duty on ${roster.dayName}
          </div>
          <div style="font-size: 0.78rem; font-weight: 500; margin-top: 0.3rem; color: #9f1239;">
            Available duty schedule: <strong>${dutyDays}</strong>
          </div>
        </div>
      `;
    }

    const selectedTime = (this.bookState.time && slots.some(s => s.time === this.bookState.time)) ? this.bookState.time : slots[0].time;
    this.bookState.time = selectedTime;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem;">
        <span style="font-weight: 700; font-size: 0.8rem; color: var(--text-body); display: flex; align-items: center; gap: 0.35rem;">
          <i class="fa-regular fa-clock" style="color: #00c853;"></i> Select Available Time Slot:
        </span>
        <span class="badge badge-teal" style="font-size: 0.68rem; font-weight: 700;">${roster.dayName} (${roster.shiftTiming})</span>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 120px; overflow-y: auto; padding: 2px;" id="book-time-slots-container">
        ${slots.map(s => {
          const isSelected = selectedTime === s.time;
          return `
            <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}" onclick="app.selectBookTimeSlot('${s.time}')" id="slot-pill-${s.time.replace(/[^a-zA-Z0-9]/g, '')}" style="font-size: 0.76rem; font-weight: 700; padding: 0.25rem 0.55rem; border-radius: 6px; ${isSelected ? 'box-shadow: 0 2px 8px rgba(0, 200, 83, 0.35);' : ''}">
              ${s.time} ${s.bookedCount > 0 ? `<span style="opacity: 0.7; font-size: 0.65rem;">(${s.bookedCount})</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;
  },

  selectBookTimeSlot(timeStr) {
    this.bookState.time = timeStr;
    this.clearFieldHighlight('book-time-slots-container');

    const container = document.getElementById('book-time-slots-container');
    if (container) {
      container.querySelectorAll('button').forEach(btn => {
        btn.className = 'btn btn-sm btn-outline';
        btn.style.boxShadow = '';
      });
      const safeId = `slot-pill-${timeStr.replace(/[^a-zA-Z0-9]/g, '')}`;
      const activeBtn = document.getElementById(safeId);
      if (activeBtn) {
        activeBtn.className = 'btn btn-sm btn-primary';
        activeBtn.style.boxShadow = '0 2px 8px rgba(0, 200, 83, 0.35)';
      }
    }
  },

  selectBookDoctor(docId) {
    this.onBookDoctorDropdownChange(docId);
    const select = document.getElementById('book-appt-doctor-select');
    if (select) select.value = docId;
  },

  async handleBookDateChange(newDate) {
    this.bookState.date = newDate;
    this.setSelectedDate(newDate);

    // Fetch appointments on this new date to compute slot booking counts
    const apptRes = await this.api(`/appointments?date=${newDate}`);
    if (apptRes.success) {
      this.bookDayAppointments = apptRes.data || [];
    }

    // Refresh Doctor dropdown options to only include ON-DUTY doctors on this date
    const onDutyDoctors = this.bookDoctors.filter(d => this.getDoctorRosterInfo(d, newDate).isOnDuty);
    
    // Auto-select doctor: retain current doctor if still on duty, otherwise pick first on-duty doctor
    if (this.bookState.doctor && onDutyDoctors.some(d => d.id == this.bookState.doctor.id)) {
      // keep current doctor
    } else {
      this.bookState.doctor = onDutyDoctors.length > 0 ? onDutyDoctors[0] : null;
    }

    const currentDocId = this.bookState.doctor ? this.bookState.doctor.id : null;
    const docSelect = document.getElementById('book-appt-doctor-select');
    if (docSelect) {
      docSelect.innerHTML = this.renderBookDoctorOptionsHtml(newDate, currentDocId);
      if (currentDocId) docSelect.value = currentDocId;
    }

    const metaContainer = document.getElementById('book-doc-meta-info');
    if (metaContainer) {
      metaContainer.innerHTML = this.renderDoctorMetaBadgeHtml(this.bookState.doctor, newDate);
    }

    const slotSection = document.getElementById('book-time-slots-section');
    if (slotSection) {
      if (this.bookState.doctor) {
        slotSection.innerHTML = this.renderDoctorTimeSlotsHtml(this.bookState.doctor, newDate);
      } else {
        slotSection.innerHTML = '<div style="padding: 0.85rem; border-radius: 8px; background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; text-align: center; font-size: 0.85rem; font-weight: 700;"><i class="fa-solid fa-calendar-xmark" style="color: #e11d48; margin-right: 4px;"></i> No doctors are on duty on this date. Please pick another date.</div>';
      }
    }
  },

  setBookDatePreset(preset) {
    let d = new Date();
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    }
    const dateStr = d.toISOString().slice(0, 10);
    const dateInput = document.getElementById('book-appt-date');
    if (dateInput) {
      dateInput.value = dateStr;
      this.handleBookDateChange(dateStr);
    }
  },

  renderBookPatientRowsHtml(patientsList) {
    if (!patientsList || patientsList.length === 0) {
      return `
        <div style="padding: 1.25rem; text-align: center; color: #94a3b8; font-size: 0.84rem;">
          <i class="fa-regular fa-user-xmark" style="font-size: 1.5rem; display: block; margin-bottom: 0.4rem; color: #cbd5e1;"></i>
          No matching patients found. Click "<strong>+ New Patient</strong>" above to register.
        </div>
      `;
    }
    const selectedPatId = this.bookState && this.bookState.patient ? this.bookState.patient.id : null;
    return patientsList.map(p => {
      const isSelected = selectedPatId == p.id;
      const initials = (p.full_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      return `
        <div class="patient-search-row ${isSelected ? 'selected' : ''}" onclick="app.selectBookPatient(${p.id})" id="book-pat-row-${p.id}">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="patient-search-avatar">${initials}</div>
            <div>
              <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">
                ${p.full_name} 
                <span class="badge ${p.gender === 'Female' ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.68rem; padding: 0.1rem 0.4rem; margin-left: 4px;">${p.gender}, ${p.age} Yrs</span>
              </div>
              <div style="font-size: 0.74rem; color: #64748b; margin-top: 2px;">
                MRN: <strong style="color: #00c853; font-family: monospace;">${p.mrn}</strong> • Phone: <strong>${p.phone}</strong> • Blood: <strong>${p.blood_group || 'Unknown'}</strong>
              </div>
            </div>
          </div>
          <div>
            ${isSelected ? '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Selected</span>' : '<span style="font-size: 0.75rem; color: #00c853; font-weight: 700;">Select <i class="fa-solid fa-chevron-right"></i></span>'}
          </div>
        </div>
      `;
    }).join('');
  },

  renderBookPatientList(term = '') {
    const listEl = document.getElementById('book-patient-search-list');
    if (!listEl) return;
    listEl.style.display = 'block';
    this.filterBookPatientsList(term);
  },

  filterBookPatientsList(q) {
    const listEl = document.getElementById('book-patient-search-list');
    if (!listEl) return;
    const term = (q || '').toLowerCase().trim();
    
    let filtered = this.bookPatients;
    if (term) {
      filtered = this.bookPatients.filter(p => 
        (p.full_name && p.full_name.toLowerCase().includes(term)) ||
        (p.mrn && p.mrn.toLowerCase().includes(term)) ||
        (p.phone && p.phone.includes(term))
      );
    }

    listEl.innerHTML = this.renderBookPatientRowsHtml(filtered);
  },

  selectBookPatient(patId) {
    const pat = this.bookPatients.find(p => p.id == patId);
    if (!pat) return;
    this.bookState.patient = pat;
    this.clearFieldHighlight('book-patient-search-list');
    this.clearFieldHighlight('book-pat-filter-input');

    const input = document.getElementById('book-pat-filter-input');
    if (input) input.value = `${pat.mrn} - ${pat.full_name}`;

    document.querySelectorAll('.patient-search-row').forEach(r => r.classList.remove('selected'));
    const row = document.getElementById(`book-pat-row-${patId}`);
    if (row) row.classList.add('selected');

    const listEl = document.getElementById('book-patient-search-list');
    if (listEl) listEl.style.display = 'none';

    const preview = document.getElementById('book-pat-preview');
    if (preview) {
      preview.style.display = 'flex';
      preview.style.justifyContent = 'space-between';
      preview.style.alignItems = 'center';
      preview.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span style="font-weight: 800; font-size: 0.85rem; color: #007a33; display: flex; align-items: center; gap: 0.3rem;">
            <i class="fa-solid fa-circle-check" style="color: #00c853;"></i> ${pat.full_name}
          </span>
          <span style="font-family: monospace; font-weight: 700; font-size: 0.72rem; color: var(--primary); background: var(--bg-card); padding: 0.1rem 0.35rem; border-radius: 4px; border: 1px solid var(--border-color);">MRN: #${pat.mrn}</span>
          <span class="badge ${pat.gender === 'Female' ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.68rem; padding: 0.1rem 0.35rem;">${pat.gender || '-'}, ${pat.age || '-'}Y</span>
          <span style="font-size: 0.74rem; color: var(--text-muted);"><i class="fa-solid fa-phone" style="font-size: 0.68rem; margin-right: 2px;"></i>${pat.phone || '-'}</span>
        </div>
        <button type="button" onclick="app.clearBookPatientSelection()" class="btn btn-outline btn-xs" style="padding: 0.1rem 0.35rem; font-size: 0.68rem; height: 22px;" title="Change / Clear Patient">Change</button>
      `;
    }
  },

  async sendToDoctor(appointmentId) {
    const res = await this.api(`/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'in_consultation' })
    });
    if (res.success) {
      this.toast('🩺 Patient sent to Doctor consultation queue!', 'success');
      if (this.currentView === 'appointments') appointmentsComponent.load();
      if (this.currentView === 'dashboard') dashboardComponent.load();
      if (this.currentView === 'consultation') consultationComponent.load();
      this.refreshActiveBadge();
    } else {
      this.toast(res.message || 'Failed to send to doctor', 'error');
    }
  },

  toggleBookInlineRegister() {
    this.clearAllHighlights(document.getElementById('book-step-1'));
    const box = document.getElementById('book-new-pat-box');
    const existing = document.getElementById('book-existing-pat-box');
    const btn = document.getElementById('btn-toggle-new-pat');
    if (box.style.display === 'none') {
      box.style.display = 'block';
      existing.style.display = 'none';
      btn.innerHTML = '<i class="fa-solid fa-list"></i> Select Existing Patient';
    } else {
      box.style.display = 'none';
      existing.style.display = 'block';
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> + New Patient';
    }
  },

  async submitBookQuickPatient() {
    this.clearAllHighlights(document.getElementById('book-new-pat-box'));
    const full_name = document.getElementById('book-np-name').value.trim();
    const phone = document.getElementById('book-np-phone').value.trim();
    const gender = document.getElementById('book-np-gender').value;
    let dob = document.getElementById('book-np-dob').value;
    let age = this.calcAgeFromDob('book-np-dob', 'book-np-age-display') || 0;
    if (!dob) {
      dob = '1995-01-01';
      age = 30;
    }
    const blood_group = document.getElementById('book-np-blood').value;

    let hasError = false;

    if (!full_name) {
      this.highlightField('book-np-name', 'Patient full name is required');
      hasError = true;
    }

    if (!phone || phone.length < 10) {
      this.highlightField('book-np-phone', 'Please enter a valid phone number (at least 10 digits)');
      hasError = true;
    }

    if (hasError) {
      this.toast('Please correct the highlighted fields.', 'error');
      return;
    }

    const res = await this.api('/patients', {
      method: 'POST',
      body: JSON.stringify({ full_name, phone, gender, dob, age, blood_group })
    });

    if (res.success) {
      this.toast('Patient registered successfully!', 'success');
      const newPatient = { id: res.patientId, mrn: res.mrn, full_name, phone, gender, dob, age, blood_group };
      this.bookPatients.unshift(newPatient);
      this.bookState.patient = newPatient;
      this.toggleBookInlineRegister();
      this.filterBookPatientsList('');
      this.selectBookPatient(res.patientId);
    } else {
      this.toast(res.message || 'Registration failed', 'error');
    }
  },

  renderBookFooterHtml() {
    return `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" onclick="app.closeModal()" class="btn btn-outline">Cancel</button>
        <button type="button" onclick="app.confirmBookAppointment()" class="btn btn-primary btn-lg" id="btn-confirm-book" style="box-shadow: 0 4px 14px rgba(0, 200, 83, 0.4); font-weight: 800;">
          <i class="fa-solid fa-calendar-check"></i> Confirm & Book Appointment
        </button>
      </div>
    `;
  },

  async confirmBookAppointment() {
    this.clearAllHighlights();

    if (!this.bookState.patient) {
      this.highlightField('book-pat-filter-input', 'Please search and select a patient from the list or create a new one');
      this.highlightField('book-patient-search-list', 'Click on a patient to select');
      this.toast('Please select or register a patient first.', 'warning');
      return;
    }

    if (!this.bookState.doctor) {
      this.highlightField('book-appt-doctor-select', 'Please select a consultant doctor');
      this.toast('Please select a doctor to book the appointment.', 'warning');
      return;
    }

    const dateVal = document.getElementById('book-appt-date') ? document.getElementById('book-appt-date').value : this.bookState.date;
    const roster = this.getDoctorRosterInfo(this.bookState.doctor, dateVal);
    const slots = this.getDoctorTimeSlots(this.bookState.doctor, dateVal, this.bookDayAppointments);

    if (!roster.isOnDuty || slots.length === 0) {
      this.toast(`Doctor ${this.bookState.doctor.name} is not available on ${roster.dayName}. Appointment cannot be booked on off-duty days.`, 'error');
      return;
    }

    if (!this.bookState.time) {
      if (slots.length > 0) {
        this.bookState.time = slots[0].time;
      } else {
        this.toast('Please select an available time slot for the appointment.', 'warning');
        return;
      }
    }
    const typeVal = document.getElementById('book-appt-type') ? document.getElementById('book-appt-type').value : 'scheduled';
    const prioVal = document.getElementById('book-appt-priority') ? document.getElementById('book-appt-priority').value : 'normal';
    const compVal = document.getElementById('book-appt-complaint') ? document.getElementById('book-appt-complaint').value.trim() : '';

    const btn = document.getElementById('btn-confirm-book');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Booking Appointment...';
    }

    const res = await this.api('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: this.bookState.patient.id,
        doctor_id: this.bookState.doctor.id,
        appointment_date: dateVal,
        appointment_time: this.bookState.time,
        appointment_type: typeVal,
        priority: prioVal,
        status: 'scheduled',
        chief_complaint: compVal || 'General Consultation',
        create_invoice: false
      })
    });

    if (res.success) {
      this.toast(`🎉 Appointment booked for ${this.bookState.patient.full_name} with ${this.bookState.doctor.name} at ${this.bookState.time}!`, 'success');
      this.closeModal();

      this.setSelectedDate(dateVal);

      this.refreshActiveView();
    } else {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Confirm & Book Appointment';
      }
      this.toast(res.message || 'Failed to book appointment', 'error');
    }
  },

  // Backward compatibility alias for any callers of wizard
  openGuidedAppointmentWizard(patientId = null, doctorId = null) {
    return this.openBookAppointmentModal(patientId, doctorId);
  },

  openNewAppointmentModal(doctorId = null, patientId = null) {
    return this.openBookAppointmentModal(patientId, doctorId);
  },

  openAddDoctorModal() {
    if (typeof doctorsComponent !== 'undefined' && doctorsComponent.openAddDoctorModal) {
      doctorsComponent.openAddDoctorModal();
    }
  },

  openAddRosterModal(doctorId = null) {
    if (typeof doctorsComponent !== 'undefined' && doctorsComponent.openAddRosterModal) {
      doctorsComponent.openAddRosterModal(doctorId);
    }
  },

  // Edit Booked Appointment Modal
  async openEditAppointmentModal(appointmentId) {
    const res = await this.api(`/appointments/${appointmentId}`);
    if (!res.success || !res.data) {
      this.toast('Failed to load appointment details for editing', 'error');
      return;
    }
    const appt = res.data;
    const docRes = await this.api('/doctors');
    const doctors = docRes.data || [];

    const bodyHtml = `
      <form id="edit-appointment-form">
        <div style="background: #e8fbf0; border: 1.5px solid #bbf7d0; padding: 0.85rem 1rem; border-radius: 10px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 800; color: #007a33; font-size: 1rem;"><i class="fa-solid fa-user"></i> ${appt.patient_name}</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
              MRN: <strong style="color: #00c853; font-family: monospace;">${appt.mrn}</strong> • Token: <strong>${appt.token_display || '#' + appt.id}</strong> • Phone: ${appt.patient_phone}
            </div>
          </div>
          <button type="button" onclick="patientsComponent.openEditPatientModal(${appt.patient_id})" class="btn btn-outline-primary btn-sm" title="Edit Patient Profile">
            <i class="fa-solid fa-user-pen"></i> Edit Patient Info
          </button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Consultant Doctor</label>
            <select id="ea-doctor" class="form-control" required>
              ${doctors.map(d => `<option value="${d.id}" ${d.id == appt.doctor_id ? 'selected' : ''}>${d.name} (${d.specialty})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Appointment Date</label>
            <input type="date" id="ea-date" class="form-control" value="${appt.appointment_date ? new Date(appt.appointment_date).toISOString().slice(0,10) : ''}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Visit Type</label>
            <select id="ea-type" class="form-control">
              <option value="walk_in" ${appt.appointment_type === 'walk_in' ? 'selected' : ''}>Walk-in OPD</option>
              <option value="scheduled" ${appt.appointment_type === 'scheduled' ? 'selected' : ''}>Scheduled</option>
              <option value="follow_up" ${appt.appointment_type === 'follow_up' ? 'selected' : ''}>Follow-up</option>
              <option value="emergency" ${appt.appointment_type === 'emergency' ? 'selected' : ''}>Emergency</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="ea-priority" class="form-control">
              <option value="normal" ${appt.priority === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="urgent" ${appt.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              <option value="vip" ${appt.priority === 'vip' ? 'selected' : ''}>VIP</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Chief Complaint / Reason for Visit</label>
          <input type="text" id="ea-complaint" class="form-control" value="${appt.chief_complaint || ''}" placeholder="e.g. Fever, Cough, Blood pressure check">
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" class="btn btn-outline" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.3);" onclick="app.deleteAppointment(${appt.id}, '${(appt.patient_name || '').replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-trash-can"></i> Delete Appointment
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="app.submitEditAppointment(${appointmentId})"><i class="fa-solid fa-save"></i> Save Changes</button>
        </div>
      </div>
    `;

    this.openModal(`<i class="fa-solid fa-pen-to-square"></i> Re-edit Booked Appointment Details (#${appt.id})`, bodyHtml, footerHtml, 'modal-lg');
  },

  async submitEditAppointment(appointmentId) {
    const doctor_id = document.getElementById('ea-doctor').value;
    const appointment_date = document.getElementById('ea-date').value;
    const appointment_type = document.getElementById('ea-type').value;
    const priority = document.getElementById('ea-priority').value;
    const chief_complaint = document.getElementById('ea-complaint').value.trim();

    const res = await this.api(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        doctor_id,
        appointment_date,
        appointment_time: 'OPD Queue',
        appointment_type,
        priority,
        chief_complaint
      })
    });

    if (res.success) {
      this.toast('Appointment details updated successfully!', 'success');
      this.closeModal();
      this.refreshActiveView();
    } else {
      this.toast(res.message || 'Failed to update appointment details', 'error');
    }
  },

  // ==========================================================================
  // RE-EDIT CONSULTATION & E-PRESCRIPTION MODAL
  // ==========================================================================
  async openEditConsultationModal(consultationId) {
    const res = await this.api(`/consultations/${consultationId}`);
    if (!res.success || !res.data) {
      this.toast('Failed to load consultation record for editing', 'error');
      return;
    }
    const c = res.data;
    const medicines = c.medicines || [];

    const bodyHtml = `
      <form id="edit-consultation-form">
        <div style="background: #e8fbf0; border: 1.5px solid #bbf7d0; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <div style="font-weight: 800; color: #007a33; font-size: 0.95rem;">
            <i class="fa-solid fa-stethoscope"></i> Patient: ${c.patient_name} (${c.mrn}) • Doctor: ${c.doctor_name}
          </div>
          <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
            Consultation Date: ${new Date(c.consultation_date).toLocaleString()}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Chief Complaint</label>
            <input type="text" id="ec-complaint" class="form-control" value="${(c.chief_complaint || '').replace(/"/g, '&quot;')}" required>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Diagnosis</label>
            <input type="text" id="ec-diagnosis" class="form-control" value="${(c.diagnosis || '').replace(/"/g, '&quot;')}" required>
          </div>
          <div class="form-group">
            <label class="form-label">ICD Code</label>
            <input type="text" id="ec-icd" class="form-control" value="${c.icd_code || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">History of Present Illness</label>
            <textarea id="ec-history" class="form-control" rows="2">${c.history_present_illness || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Examination Findings</label>
            <textarea id="ec-findings" class="form-control" rows="2">${c.examination_findings || ''}</textarea>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Clinical Notes & Remarks</label>
          <textarea id="ec-notes" class="form-control" rows="2">${c.clinical_notes || ''}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Follow-up Date</label>
            <input type="date" id="ec-follow-date" class="form-control" value="${c.follow_up_date ? new Date(c.follow_up_date).toISOString().slice(0,10) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Follow-up Instructions</label>
            <input type="text" id="ec-follow-instructions" class="form-control" value="${(c.follow_up_instructions || '').replace(/"/g, '&quot;')}">
          </div>
        </div>

        <!-- Prescribed Medicines Section -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 0.85rem; margin-top: 0.85rem;">
          <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-main); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-solid fa-pills" style="color: var(--cyber-green);"></i> Prescribed Medicines</span>
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="app.addEditMedRow()"><i class="fa-solid fa-plus"></i> Add Medicine</button>
          </div>

          <div class="form-row" style="margin-bottom: 0.5rem;">
            <div class="form-group">
              <label class="form-label">General Advice</label>
              <input type="text" id="ec-rx-advice" class="form-control" value="${(c.advice || '').replace(/"/g, '&quot;')}" placeholder="e.g. Drink plenty of water & take rest">
            </div>
            <div class="form-group">
              <label class="form-label">Dietary Restrictions</label>
              <input type="text" id="ec-rx-diet" class="form-control" value="${(c.dietary_restrictions || '').replace(/"/g, '&quot;')}" placeholder="e.g. Low salt & low sugar diet">
            </div>
          </div>

          <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px;">
            <table class="table" style="font-size: 0.78rem; margin-bottom: 0;">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage / Strength</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Instruction</th>
                  <th style="width: 40px;"></th>
                </tr>
              </thead>
              <tbody id="ec-meds-tbody">
                ${medicines.length === 0 ? `
                  <tr class="no-med-row">
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 1rem;">No medicines prescribed yet. Click "+ Add Medicine" to add.</td>
                  </tr>
                ` : medicines.map((m) => `
                  <tr>
                    <td><input type="text" class="form-control ec-med-name" value="${(m.medicine_name || '').replace(/"/g, '&quot;')}" placeholder="Medicine Name"></td>
                    <td><input type="text" class="form-control ec-med-strength" value="${(m.strength || '500mg').replace(/"/g, '&quot;')}" placeholder="Strength"></td>
                    <td><input type="text" class="form-control ec-med-freq" value="${(m.frequency || '1-0-1').replace(/"/g, '&quot;')}" placeholder="1-0-1"></td>
                    <td><input type="text" class="form-control ec-med-dur" value="${(m.duration || '5 Days').replace(/"/g, '&quot;')}" placeholder="5 Days"></td>
                    <td><input type="text" class="form-control ec-med-inst" value="${(m.instruction || 'After Meal').replace(/"/g, '&quot;')}" placeholder="After Meal"></td>
                    <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()">&times;</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" class="btn btn-outline" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.3);" onclick="app.deleteConsultation(${c.id})">
          <i class="fa-solid fa-trash-can"></i> Delete Record
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="app.submitEditConsultation(${consultationId})"><i class="fa-solid fa-save"></i> Save Re-edited Consultation</button>
        </div>
      </div>
    `;

    this.openModal(`<i class="fa-solid fa-pen-to-square"></i> Re-edit Medical Consultation Record (#${consultationId})`, bodyHtml, footerHtml, 'modal-lg');
  },

  addEditMedRow() {
    const tbody = document.getElementById('ec-meds-tbody');
    if (!tbody) return;
    const noRow = tbody.querySelector('.no-med-row');
    if (noRow) noRow.remove();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="form-control ec-med-name" placeholder="Medicine Name"></td>
      <td><input type="text" class="form-control ec-med-strength" value="500mg" placeholder="Strength"></td>
      <td><input type="text" class="form-control ec-med-freq" value="1-0-1" placeholder="1-0-1"></td>
      <td><input type="text" class="form-control ec-med-dur" value="5 Days" placeholder="5 Days"></td>
      <td><input type="text" class="form-control ec-med-inst" value="After Meal" placeholder="After Meal"></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()">&times;</button></td>
    `;
    tbody.appendChild(tr);
  },

  async submitEditConsultation(consultationId) {
    const chief_complaint = document.getElementById('ec-complaint').value.trim();
    const diagnosis = document.getElementById('ec-diagnosis').value.trim();
    const icd_code = document.getElementById('ec-icd').value.trim();
    const history_present_illness = document.getElementById('ec-history').value.trim();
    const examination_findings = document.getElementById('ec-findings').value.trim();
    const clinical_notes = document.getElementById('ec-notes').value.trim();
    const follow_up_date = document.getElementById('ec-follow-date').value;
    const follow_up_instructions = document.getElementById('ec-follow-instructions').value.trim();
    const advice = document.getElementById('ec-rx-advice').value.trim();
    const dietary_restrictions = document.getElementById('ec-rx-diet').value.trim();

    if (!chief_complaint || !diagnosis) {
      this.toast('Chief Complaint and Diagnosis are required fields.', 'warning');
      return;
    }

    const medRows = document.querySelectorAll('#ec-meds-tbody tr');
    const medicines = [];
    medRows.forEach(tr => {
      const nameInput = tr.querySelector('.ec-med-name');
      if (nameInput && nameInput.value.trim()) {
        medicines.push({
          medicine_name: nameInput.value.trim(),
          strength: tr.querySelector('.ec-med-strength')?.value.trim() || '500mg',
          frequency: tr.querySelector('.ec-med-freq')?.value.trim() || '1-0-1',
          duration: tr.querySelector('.ec-med-dur')?.value.trim() || '5 Days',
          instruction: tr.querySelector('.ec-med-inst')?.value.trim() || 'After Meal'
        });
      }
    });

    const res = await this.api(`/consultations/${consultationId}`, {
      method: 'PUT',
      body: JSON.stringify({
        chief_complaint,
        diagnosis,
        icd_code,
        history_present_illness,
        examination_findings,
        clinical_notes,
        follow_up_date,
        follow_up_instructions,
        prescription: {
          advice,
          dietary_restrictions,
          medicines
        }
      })
    });

    if (res.success) {
      this.toast('✅ Consultation record re-edited and updated successfully!', 'success');
      this.closeModal();
      this.refreshCurrentView();
    } else {
      this.toast(res.message || 'Failed to update consultation record.', 'error');
    }
  },

  async deleteConsultation(consultationId) {
    if (!confirm('Are you sure you want to delete this consultation record?')) return;
    const res = await this.api(`/consultations/${consultationId}`, { method: 'DELETE' });
    if (res.success) {
      this.toast('Consultation record deleted successfully.', 'success');
      this.closeModal();
      this.refreshCurrentView();
    } else {
      this.toast(res.message || 'Failed to delete consultation record.', 'error');
    }
  },

  // ==========================================================================
  // RE-EDIT VITALS MODAL
  // ==========================================================================
  async openEditVitalsModal(vitalsId) {
    const res = await this.api('/vitals/all');
    const all = res.data || [];
    const v = all.find(item => item.id == vitalsId);
    if (!v) {
      this.toast('Vitals record not found.', 'error');
      return;
    }

    const bodyHtml = `
      <form id="edit-vitals-form">
        <div style="background: #e8fbf0; border: 1.5px solid #bbf7d0; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <div style="font-weight: 800; color: #007a33; font-size: 0.95rem;">
            <i class="fa-solid fa-heart-pulse"></i> Patient: ${v.patient_name} (${v.mrn})
          </div>
          <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
            Recorded on: ${new Date(v.recorded_at).toLocaleString()}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Systolic BP (mmHg)</label>
            <input type="number" id="ev-sys" class="form-control" value="${v.systolic_bp || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Diastolic BP (mmHg)</label>
            <input type="number" id="ev-dia" class="form-control" value="${v.diastolic_bp || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Pulse Rate (bpm)</label>
            <input type="number" id="ev-pulse" class="form-control" value="${v.pulse_rate || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Temperature (°F)</label>
            <input type="number" step="0.1" id="ev-temp" class="form-control" value="${v.temperature_f || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">SpO2 (%)</label>
            <input type="number" id="ev-spo2" class="form-control" value="${v.spo2 || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Blood Sugar (mg/dL)</label>
            <input type="number" step="0.1" id="ev-sugar" class="form-control" value="${v.blood_sugar_random || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Weight (kg)</label>
            <input type="number" step="0.1" id="ev-weight" class="form-control" value="${v.weight_kg || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Height (cm)</label>
            <input type="number" step="0.1" id="ev-height" class="form-control" value="${v.height_cm || ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nurse Remarks / Triage Notes</label>
          <input type="text" id="ev-notes" class="form-control" value="${(v.notes || '').replace(/"/g, '&quot;')}">
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; width: 100%;">
        <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="app.submitEditVitals(${vitalsId})"><i class="fa-solid fa-save"></i> Save Updated Vitals</button>
      </div>
    `;

    this.openModal(`<i class="fa-solid fa-pen-to-square"></i> Re-edit Recorded Patient Vitals (#${vitalsId})`, bodyHtml, footerHtml, 'modal-md');
  },

  async submitEditVitals(vitalsId) {
    const systolic_bp = document.getElementById('ev-sys').value;
    const diastolic_bp = document.getElementById('ev-dia').value;
    const pulse_rate = document.getElementById('ev-pulse').value;
    const temperature_f = document.getElementById('ev-temp').value;
    const spo2 = document.getElementById('ev-spo2').value;
    const blood_sugar_random = document.getElementById('ev-sugar').value;
    const weight_kg = document.getElementById('ev-weight').value;
    const height_cm = document.getElementById('ev-height').value;
    const notes = document.getElementById('ev-notes').value.trim();

    const res = await this.api(`/vitals/${vitalsId}`, {
      method: 'PUT',
      body: JSON.stringify({
        systolic_bp, diastolic_bp, pulse_rate, temperature_f, spo2, blood_sugar_random, weight_kg, height_cm, notes
      })
    });

    if (res.success) {
      this.toast('✅ Patient vitals re-edited and updated successfully!', 'success');
      this.closeModal();
      this.refreshCurrentView();
    } else {
      this.toast(res.message || 'Failed to update vitals.', 'error');
    }
  },

  // ==========================================================================
  // RE-EDIT INVOICE MODAL
  // ==========================================================================
  async openEditInvoiceModal(invoiceId) {
    const res = await this.api(`/billing/invoices/${invoiceId}`);
    if (!res.success || !res.data) {
      this.toast('Failed to load invoice details for editing', 'error');
      return;
    }
    const inv = res.data;

    const bodyHtml = `
      <form id="edit-invoice-form">
        <div style="background: #e8fbf0; border: 1.5px solid #bbf7d0; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 800; color: #007a33; font-size: 1rem;"><i class="fa-solid fa-receipt"></i> Invoice #${inv.invoice_number}</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
              Patient: <strong>${inv.patient_name}</strong> (${inv.mrn}) • Status: <span class="badge ${inv.payment_status === 'paid' ? 'badge-green' : 'badge-amber'}">${inv.payment_status}</span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Discount Type</label>
            <select id="ei-disc-type" class="form-control">
              <option value="fixed" ${inv.discount_type === 'fixed' ? 'selected' : ''}>Fixed Amount (Rs.)</option>
              <option value="percentage" ${inv.discount_type === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Discount Value</label>
            <input type="number" step="0.01" id="ei-disc-val" class="form-control" value="${inv.discount_value || 0}">
          </div>
          <div class="form-group">
            <label class="form-label">Tax Percentage (%)</label>
            <input type="number" step="0.01" id="ei-tax" class="form-control" value="${inv.tax_percentage || 0}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select id="ei-pay-method" class="form-control">
              <option value="cash" ${inv.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
              <option value="card" ${inv.payment_method === 'card' ? 'selected' : ''}>Debit / Credit Card</option>
              <option value="online" ${inv.payment_method === 'online' ? 'selected' : ''}>Online Transfer</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Billing Notes</label>
            <input type="text" id="ei-notes" class="form-control" value="${(inv.notes || '').replace(/"/g, '&quot;')}">
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" class="btn btn-outline" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.3);" onclick="app.deleteInvoice(${inv.id})">
          <i class="fa-solid fa-trash-can"></i> Delete Invoice
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="app.submitEditInvoice(${invoiceId})"><i class="fa-solid fa-save"></i> Save Re-edited Invoice</button>
        </div>
      </div>
    `;

    this.openModal(`<i class="fa-solid fa-pen-to-square"></i> Re-edit Invoice Details (#${inv.invoice_number})`, bodyHtml, footerHtml, 'modal-md');
  },

  async submitEditInvoice(invoiceId) {
    const discount_type = document.getElementById('ei-disc-type').value;
    const discount_value = document.getElementById('ei-disc-val').value;
    const tax_percentage = document.getElementById('ei-tax').value;
    const payment_method = document.getElementById('ei-pay-method').value;
    const notes = document.getElementById('ei-notes').value.trim();

    const res = await this.api(`/billing/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({
        discount_type,
        discount_value,
        tax_percentage,
        payment_method,
        notes
      })
    });

    if (res.success) {
      this.toast('✅ Invoice re-edited and recalculated successfully!', 'success');
      this.closeModal();
      this.refreshCurrentView();
    } else {
      this.toast(res.message || 'Failed to update invoice.', 'error');
    }
  },

  async deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    const res = await this.api(`/billing/invoices/${invoiceId}`, { method: 'DELETE' });
    if (res.success) {
      this.toast('Invoice deleted successfully.', 'success');
      this.closeModal();
      this.refreshCurrentView();
    } else {
      this.toast(res.message || 'Failed to delete invoice.', 'error');
    }
  },

  // ==========================================================================
  // RE-EDIT LAB TEST CATALOG MODAL
  // ==========================================================================
  async openEditLabTestModal(testId) {
    const res = await this.api('/lab/catalog');
    const tests = res.data || [];
    const t = tests.find(item => item.id == testId);
    if (!t) {
      this.toast('Lab test catalog item not found', 'error');
      return;
    }

    const bodyHtml = `
      <form id="edit-lab-test-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Test Code</label>
            <input type="text" id="elt-code" class="form-control" value="${t.test_code || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Test Name</label>
            <input type="text" id="elt-name" class="form-control" value="${(t.test_name || '').replace(/"/g, '&quot;')}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Category</label>
            <select id="elt-category" class="form-control" required>
              <option value="Haematology" ${t.category === 'Haematology' ? 'selected' : ''}>Haematology</option>
              <option value="Biochemistry" ${t.category === 'Biochemistry' ? 'selected' : ''}>Biochemistry</option>
              <option value="Serology & Immunology" ${t.category === 'Serology & Immunology' ? 'selected' : ''}>Serology & Immunology</option>
              <option value="Microbiology" ${t.category === 'Microbiology' ? 'selected' : ''}>Microbiology</option>
              <option value="Radiology & Ultrasound" ${t.category === 'Radiology & Ultrasound' ? 'selected' : ''}>Radiology & Ultrasound</option>
              <option value="Clinical Pathology" ${t.category === 'Clinical Pathology' ? 'selected' : ''}>Clinical Pathology</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label"><span class="required">*</span> Price (Rs.)</label>
            <input type="number" id="elt-price" class="form-control" value="${t.price}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Sample Type</label>
            <input type="text" id="elt-sample" class="form-control" value="${t.sample_type || 'Blood'}">
          </div>
          <div class="form-group">
            <label class="form-label">Turnaround Time</label>
            <input type="text" id="elt-tat" class="form-control" value="${t.turnaround_time || '24 Hours'}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Normal Range / Reference Values</label>
            <input type="text" id="elt-range" class="form-control" value="${(t.normal_range || '').replace(/"/g, '&quot;')}">
          </div>
          <div class="form-group">
            <label class="form-label">Units</label>
            <input type="text" id="elt-units" class="form-control" value="${(t.units || '').replace(/"/g, '&quot;')}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description / Test Details</label>
          <input type="text" id="elt-desc" class="form-control" value="${(t.description || '').replace(/"/g, '&quot;')}">
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button type="button" class="btn btn-outline" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.3);" onclick="app.deleteLabTestCatalog(${t.id})">
          <i class="fa-solid fa-trash-can"></i> Delete Test
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="app.submitEditLabTest(${testId})"><i class="fa-solid fa-save"></i> Save Test Changes</button>
        </div>
      </div>
    `;

    this.openModal(`<i class="fa-solid fa-pen-to-square"></i> Re-edit Lab Test Catalog Details`, bodyHtml, footerHtml, 'modal-md');
  },

  async submitEditLabTest(testId) {
    const test_code = document.getElementById('elt-code').value.trim();
    const test_name = document.getElementById('elt-name').value.trim();
    const category = document.getElementById('elt-category').value;
    const price = document.getElementById('elt-price').value;
    const sample_type = document.getElementById('elt-sample').value.trim();
    const turnaround_time = document.getElementById('elt-tat').value.trim();
    const normal_range = document.getElementById('elt-range').value.trim();
    const units = document.getElementById('elt-units').value.trim();
    const description = document.getElementById('elt-desc').value.trim();

    if (!test_name || !price) {
      this.toast('Test name and price are required.', 'warning');
      return;
    }

    const res = await this.api(`/lab/catalog/${testId}`, {
      method: 'PUT',
      body: JSON.stringify({
        test_code, test_name, category, price, sample_type, turnaround_time, normal_range, units, description
      })
    });

    if (res.success) {
      this.toast('✅ Lab test catalog entry updated successfully!', 'success');
      this.closeModal();
      this.refreshCurrentView();
    } else {
      this.toast(res.message || 'Failed to update lab test.', 'error');
    }
  },

  async deleteLabTestCatalog(testId) {
    if (!confirm('Are you sure you want to delete this lab test from catalog?')) return;
    const res = await this.api(`/lab/catalog/${testId}`, { method: 'DELETE' });
    if (res.success) {
      this.toast('Lab test deleted from catalog.', 'success');
      this.closeModal();
      this.refreshCurrentView();
    } else {
      this.toast(res.message || 'Failed to delete lab test.', 'error');
    }
  },

  refreshCurrentView() {
    if (this.currentView) {
      this.navigate(this.currentView);
    }
  },

  async printTokenSlip(appointmentId) {
    return this.printAppointmentSlip(appointmentId);
  },

  async printAppointmentSlip(appointmentId) {
    const res = await this.api(`/appointments/${appointmentId}`);
    if (!res.success || !res.data) {
      this.toast('Failed to load appointment details for printing slip', 'error');
      return;
    }

    const appt = res.data;

    const slipHtml = `
      <div class="thermal-receipt">
        <div class="center bold title">${this.clinic.name}</div>
        <div class="center" style="font-size: 11px;">OPD CONSULTATION SLIP</div>
        <div class="center" style="font-size: 10px;">${this.clinic.phone}</div>
        <div class="divider"></div>
        <div class="center">
          <div style="font-size: 11px; text-transform: uppercase;">APPOINTMENT CODE</div>
          <div class="token-big" style="font-size: 20px; color: #00c853;">${appt.appointment_code}</div>
        </div>
        <div class="divider"></div>
        <div class="row-flex"><span>Patient MRN:</span><span class="bold">${appt.mrn}</span></div>
        <div class="row-flex"><span>Patient Name:</span><span class="bold">${appt.patient_name}</span></div>
        <div class="row-flex"><span>Gender / Age:</span><span>${appt.gender} / ${appt.age} Yrs</span></div>
        <div class="divider"></div>
        <div class="row-flex"><span>Consultant:</span><span class="bold">${appt.doctor_name}</span></div>
        <div class="row-flex"><span>Specialty:</span><span>${appt.doctor_specialty}</span></div>
        <div class="row-flex"><span>Fee Amount:</span><span class="bold">${this.clinic.currency} ${parseFloat(appt.consultation_fee).toLocaleString()}</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px;">Date & Time: ${new Date().toLocaleString()}</div>
        <div class="center" style="font-size: 10px; margin-top: 4px;">* Thank you for choosing Dream Garden PolyClinic *</div>
      </div>
    `;

    this.printDocument(slipHtml);
  },

  async printVitalsSlip(appointmentId) {
    const res = await this.api(`/appointments/${appointmentId}`);
    if (!res.success || !res.data) {
      this.toast('Failed to load vitals details for printing slip', 'error');
      return;
    }

    const appt = res.data;
    const sys = appt.systolic_bp;
    const dia = appt.diastolic_bp;
    const pulse = appt.pulse_rate;
    const temp = appt.temperature_f;
    const spo2 = appt.spo2;
    const sugar = appt.blood_sugar_random;
    const weight = appt.weight_kg;
    const height = appt.height_cm;
    const bmi = appt.bmi;

    const slipHtml = `
      <div class="thermal-receipt">
        <div class="center bold title">${this.clinic.name}</div>
        <div class="center" style="font-size: 11px; font-weight: bold;">PATIENT TRIAGE & VITALS SLIP</div>
        <div class="center" style="font-size: 10px;">${this.clinic.phone}</div>
        <div class="divider"></div>
        <div class="center">
          <div style="font-size: 10px; text-transform: uppercase;">APPOINTMENT REF</div>
          <div class="token-big" style="font-size: 18px; color: #00c853;">${appt.appointment_code || `#${appt.id}`}</div>
        </div>
        <div class="divider"></div>
        <div class="row-flex"><span>Patient MRN:</span><span class="bold">${appt.mrn}</span></div>
        <div class="row-flex"><span>Patient Name:</span><span class="bold">${appt.patient_name}</span></div>
        <div class="row-flex"><span>Gender / Age:</span><span>${appt.gender} / ${appt.age} Yrs</span></div>
        <div class="row-flex"><span>Doctor:</span><span class="bold">${appt.doctor_name}</span></div>
        <div class="divider"></div>
        <div class="center bold" style="font-size: 11px; margin-bottom: 4px;">RECORDED VITALS SUMMARY</div>
        ${sys && dia ? `<div class="row-flex"><span>Blood Pressure:</span><span class="bold">${sys}/${dia} mmHg</span></div>` : ''}
        ${pulse ? `<div class="row-flex"><span>Pulse Rate:</span><span class="bold">${pulse} bpm</span></div>` : ''}
        ${temp ? `<div class="row-flex"><span>Temperature:</span><span class="bold">${temp} °F</span></div>` : ''}
        ${spo2 ? `<div class="row-flex"><span>SpO2 Oxygen:</span><span class="bold">${spo2} %</span></div>` : ''}
        ${sugar ? `<div class="row-flex"><span>Blood Sugar (Random):</span><span class="bold">${sugar} mg/dL</span></div>` : ''}
        ${weight ? `<div class="row-flex"><span>Weight:</span><span class="bold">${weight} kg</span></div>` : ''}
        ${height ? `<div class="row-flex"><span>Height:</span><span>${height} cm</span></div>` : ''}
        ${bmi ? `<div class="row-flex"><span>BMI Index:</span><span class="bold">${bmi} kg/m²</span></div>` : ''}
        <div class="divider"></div>
        <div class="center" style="font-size: 10px;">Recorded Date: ${new Date().toLocaleString()}</div>
        <div class="center" style="font-size: 10px; margin-top: 4px;">* Triage & Vitals Receipt *</div>
      </div>
    `;

    this.printDocument(slipHtml);
  },


  calcAgeFromDob(dobInputId, displayId = null) {
    const el = document.getElementById(dobInputId);
    if (!el || !el.value) return 0;
    const dob = new Date(el.value);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    age = Math.max(0, age);
    if (displayId) {
      const disp = document.getElementById(displayId);
      if (disp) {
        disp.innerHTML = `<span class="badge badge-teal" style="font-size: 0.68rem; padding: 1px 6px;">Age: ${age} Yrs</span>`;
      }
    }
    return age;
  },

  handleDobChange(dobId, ageId, displayId) {
    const age = this.calcAgeFromDob(dobId, displayId);
    const ageEl = document.getElementById(ageId);
    if (ageEl && age >= 0) ageEl.value = age;
  },

  handleAgeChange(ageId, dobId, displayId) {
    const ageEl = document.getElementById(ageId);
    const dobEl = document.getElementById(dobId);
    if (!ageEl) return;
    const val = parseInt(ageEl.value, 10);
    if (!isNaN(val) && val >= 0) {
      const year = new Date().getFullYear() - val;
      if (dobEl) dobEl.value = `${year}-01-01`;
      if (displayId) {
        const disp = document.getElementById(displayId);
        if (disp) disp.innerHTML = `<span class="badge badge-teal" style="font-size: 0.68rem; padding: 1px 6px;">Age: ${val} Yrs</span>`;
      }
    }
  },

  // Quick Action Modal: Register New Patient (Compact, High-Density Zero-Scroll Form)
  openNewPatientModal(returnToToken = false) {
    const bodyHtml = `
      <form id="new-patient-form" onsubmit="event.preventDefault(); app.submitNewPatient(${returnToToken});">
        <style>
          .np-form-card {
            background: var(--bg-card);
            border-radius: 12px;
            padding: 0.85rem;
            margin-bottom: 0.75rem;
            border: 1.5px solid var(--border-color);
            box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          }
          .np-section-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.82rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--primary);
            margin-bottom: 0.65rem;
            padding-bottom: 0.35rem;
            border-bottom: 1px dashed var(--border-color);
          }
          .np-field-label {
            font-size: 0.76rem;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.3rem;
          }
          .np-input {
            height: 34px;
            font-size: 0.82rem;
            border-radius: 8px;
            border: 1.5px solid var(--border-color);
            padding: 0.35rem 0.65rem;
            background: var(--bg-card);
            color: var(--text-main);
            transition: all 0.2s ease;
          }
          .np-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          }
        </style>

        <!-- Section 1: Primary Identity & Demographics -->
        <div class="np-form-card">
          <div class="np-section-header">
            <i class="fa-solid fa-user-tag"></i> 1. Basic Demographics & Contact
          </div>
          
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.65rem; margin-bottom: 0.6rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-user" style="color: var(--primary);"></i> Full Name <span class="required" style="color: var(--danger);">*</span></label>
              <input type="text" id="np-name" class="form-control np-input" placeholder="e.g. Asim Khan" required autofocus>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-venus-mars" style="color: #8b5cf6;"></i> Gender <span class="required" style="color: var(--danger);">*</span></label>
              <select id="np-gender" class="form-control np-input" required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-droplet" style="color: #ef4444;"></i> Blood Group</label>
              <select id="np-blood" class="form-control np-input">
                <option value="Unknown">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1.2fr 1.2fr 0.8fr 1.2fr; gap: 0.65rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-phone" style="color: #10b981;"></i> Phone Number <span class="required" style="color: var(--danger);">*</span></label>
              <input type="tel" id="np-phone" class="form-control np-input" placeholder="03xx-xxxxxxx" required>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <label class="np-field-label" style="margin-bottom: 0;"><i class="fa-solid fa-cake-candles" style="color: #f59e0b;"></i> Date of Birth</label>
                <div id="np-age-display"></div>
              </div>
              <input type="date" id="np-dob" class="form-control np-input" onchange="app.handleDobChange('np-dob', 'np-age-input', 'np-age-display')" oninput="app.handleDobChange('np-dob', 'np-age-input', 'np-age-display')">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-hashtag" style="color: var(--primary);"></i> Age (Yrs)</label>
              <input type="number" id="np-age-input" class="form-control np-input" placeholder="e.g. 28" min="0" max="130" oninput="app.handleAgeChange('np-age-input', 'np-dob', 'np-age-display')">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-id-card" style="color: #6366f1;"></i> CNIC / Identity</label>
              <input type="text" id="np-cnic" class="form-control np-input" placeholder="35202-xxxxxxx-x">
            </div>
          </div>
        </div>

        <!-- Section 2: Address & Socio-demographics -->
        <div class="np-form-card">
          <div class="np-section-header">
            <i class="fa-solid fa-location-dot"></i> 2. Address & Family Information
          </div>
          <div style="display: grid; grid-template-columns: 2.2fr 1fr; gap: 0.65rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-house" style="color: #0284c7;"></i> Residential Address</label>
              <input type="text" id="np-address" class="form-control np-input" placeholder="House #, Street, Block, Area / City">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-ring" style="color: #ec4899;"></i> Marital Status</label>
              <select id="np-marital" class="form-control np-input">
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 3: Clinical Alerts & Medical Notes -->
        <div class="np-form-card" style="margin-bottom: 0;">
          <div class="np-section-header">
            <i class="fa-solid fa-shield-virus"></i> 3. Clinical Alerts & Pre-existing Conditions
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i> Known Allergies</label>
              <input type="text" id="np-allergies" class="form-control np-input" placeholder="e.g. Penicillin, NSAIDs, Dust, Pollen (or None)">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="np-field-label"><i class="fa-solid fa-heart-pulse" style="color: #0d9488;"></i> Chronic Illnesses</label>
              <input type="text" id="np-chronic" class="form-control np-input" placeholder="e.g. Hypertension, Diabetes, Asthma">
            </div>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <button type="button" class="btn btn-outline" onclick="${returnToToken ? 'app.openNewAppointmentModal()' : 'app.closeModal()'}">Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-submit-new-patient" onclick="app.submitNewPatient(${returnToToken})" style="padding: 0.45rem 1.35rem; font-weight: 700;">
          <i class="fa-solid fa-user-plus"></i> Register Patient
        </button>
      </div>
    `;

    this.openModal('<i class="fa-solid fa-id-card" style="color: var(--primary);"></i> Register New Patient', bodyHtml, footerHtml, 'modal-lg');
  },

  async submitNewPatient(returnToToken = false) {
    if (this._isSubmittingPatient) {
      console.warn('Patient registration is already in progress, ignoring duplicate submit call.');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-new-patient');
    const full_name = (document.getElementById('np-name')?.value || '').trim();
    const gender = document.getElementById('np-gender')?.value || 'Male';
    const phone = (document.getElementById('np-phone')?.value || '').trim();
    const dob = document.getElementById('np-dob')?.value || null;
    const ageInput = parseInt(document.getElementById('np-age-input')?.value || '', 10);
    const calculatedAge = this.calcAgeFromDob('np-dob', 'np-age-display');
    const age = !isNaN(ageInput) && ageInput >= 0 ? ageInput : (calculatedAge || 0);

    const blood_group = document.getElementById('np-blood')?.value || 'Unknown';
    const cnic = (document.getElementById('np-cnic')?.value || '').trim();
    const marital_status = document.getElementById('np-marital')?.value || 'Single';
    const address = (document.getElementById('np-address')?.value || '').trim();
    const allergies = (document.getElementById('np-allergies')?.value || '').trim();
    const chronic_conditions = (document.getElementById('np-chronic')?.value || '').trim();

    this.clearAllHighlights(document.getElementById('new-patient-form'));

    let hasError = false;
    if (!full_name) {
      this.highlightField('np-name', 'Full name is required');
      hasError = true;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      this.highlightField('np-phone', 'Please enter a valid phone number (min 10 digits)');
      hasError = true;
    }

    if (hasError) {
      this.toast('Please fill all required patient details correctly.', 'error');
      return;
    }

    // Set lock flag and button loading state to completely eliminate duplicate double-clicks
    this._isSubmittingPatient = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
    }

    try {
      const res = await this.api('/patients', {
        method: 'POST',
        body: JSON.stringify({
          full_name,
          gender,
          phone,
          dob,
          age,
          blood_group,
          cnic,
          marital_status,
          address,
          allergies,
          chronic_conditions
        })
      });

      if (res.success) {
        this.toast(`Patient registered successfully! MRN: #${res.mrn}`, 'success');
        if (returnToToken) {
          this.openNewAppointmentModal();
        } else {
          this.closeModal();
          this.refreshActiveView();
          if (typeof patientHistoryComponent !== 'undefined' && patientHistoryComponent.loadPatientsList) {
            patientHistoryComponent.loadPatientsList();
          }
        }
      } else {
        this.toast(res.message || 'Failed to register patient', 'error');
      }
    } catch (err) {
      this.toast(err.message || 'Error occurred while registering patient', 'error');
    } finally {
      this._isSubmittingPatient = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register Patient';
      }
    }
  },

  async openAppointmentDetailsModal(appointmentId) {
    const res = await this.api(`/appointments/${appointmentId}`);
    if (!res.success || !res.data) {
      this.toast('Failed to load appointment details', 'error');
      return;
    }

    const a = res.data;
    const rawMrn = (a.mrn || '').toString().replace(/MRN-?/gi, '');
    const formattedMrn = rawMrn ? `MRN: #${rawMrn}` : `MRN: #${a.patient_id}`;

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #00c853, #059669); color: white; padding: 1rem 1.25rem; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 1.2rem; font-weight: 900; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-user-circle"></i> ${a.patient_name}
              <span style="background: rgba(255,255,255,0.25); font-family: monospace; padding: 0.15rem 0.55rem; border-radius: 6px; font-size: 0.8rem; font-weight: 800;">${formattedMrn}</span>
            </div>
            <div style="font-size: 0.82rem; opacity: 0.95; margin-top: 4px;">
              ${a.gender || ''}, ${a.age || ''} Yrs • Phone: <strong>${a.patient_phone || 'N/A'}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; opacity: 0.9;">Appointment Status</div>
            <span class="badge badge-white" style="font-weight: 800; font-size: 0.82rem; color: #00c853; text-transform: capitalize;">
              ${(a.status || 'scheduled').replace('_', ' ')}
            </span>
          </div>
        </div>

        <!-- Detail Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
          <!-- Left Column: Appointment Info -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem;">
            <div style="font-weight: 800; color: #007a33; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-calendar-check"></i> Booking & Doctor Details
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.4rem; color: #334155;">
              <div><strong>Consultant:</strong> ${a.doctor_name} (${a.doctor_specialty || 'General'})</div>
              <div><strong>Appointment Date:</strong> ${a.appointment_date}</div>
              <div><strong>Appointment Type:</strong> <span style="text-transform: capitalize;">${a.appointment_type || 'Scheduled'}</span></div>
              <div><strong>Priority:</strong> <span style="text-transform: capitalize;">${a.priority || 'Normal'}</span></div>
              <div><strong>Chief Complaint:</strong> <em>${a.chief_complaint || 'General Consultation'}</em></div>
            </div>
          </div>

          <!-- Right Column: Medical Vitals & Billing -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem;">
            <div style="font-weight: 800; color: #007a33; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-heart-pulse"></i> Vitals & Invoice Status
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.4rem; color: #334155;">
              <div><strong>Blood Pressure:</strong> ${a.systolic_bp && a.diastolic_bp ? `${a.systolic_bp}/${a.diastolic_bp} mmHg` : 'Not recorded yet'}</div>
              <div><strong>Pulse Rate:</strong> ${a.pulse_rate ? `${a.pulse_rate} bpm` : 'N/A'}</div>
              <div><strong>Temperature:</strong> ${a.temperature_f ? `${a.temperature_f} °F` : 'N/A'}</div>
              <div><strong>Blood Oxygen:</strong> ${a.spo2 ? `${a.spo2} %` : 'N/A'}</div>
              <div><strong>Invoice Status:</strong> ${a.invoice_payment_status === 'paid' ? '<span style="color:#059669; font-weight:800;">Paid</span>' : '<span style="color:#d97706; font-weight:700;">Unpaid / Pending</span>'}</div>
            </div>
          </div>
        </div>

        <!-- Comprehensive Actions Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="app.closeModal(); app.openPatientHistoryModal(${a.patient_id});" class="btn btn-outline-primary btn-sm">
              <i class="fa-solid fa-folder-open"></i> Open Patient 360 EHR
            </button>
            <button onclick="app.closeModal(); app.openEditAppointmentModal(${a.id});" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-pen-to-square"></i> Re-edit Booking
            </button>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            ${a.status !== 'completed' && a.status !== 'cancelled' ? `
              <button onclick="app.closeModal(); appointmentsComponent.cancelAppointment(${a.id});" class="btn btn-outline-warning btn-sm">
                <i class="fa-solid fa-ban"></i> Cancel Appt
              </button>
            ` : ''}
            <button onclick="app.closeModal(); app.deleteAppointment(${a.id}, '${a.patient_name.replace(/'/g, "\\'")}');" class="btn btn-outline-danger btn-sm">
              <i class="fa-solid fa-trash-can"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;

    this.openModal(`<i class="fa-solid fa-clipboard-list" style="color:#00c853;"></i> Appointment #${a.id} — Full Details`, bodyHtml, '', 'modal-lg');
  },

  // ==========================================================================
  // PATIENT CHECK-IN & RECORD VITALS MODAL (With Past Vitals History & Direct Billing)
  // ==========================================================================
  async openCheckInVitalsModal(appointmentId, patientId, doctorName = '', patientName = '', tokenDisplay = '', currentVitals = {}, doctorId = null, doctorFee = 1500) {
    // Fetch patient data to show previous vitals history
    const patRes = await this.api(`/patients/${patientId}`);
    const pat = (patRes.data && patRes.data.patient) ? patRes.data.patient : { full_name: patientName, mrn: '' };
    const pastVitals = (patRes.data && patRes.data.vitals) ? patRes.data.vitals : [];
    const formattedMrn = pat.mrn ? (pat.mrn.startsWith('MRN') ? pat.mrn : `MRN-#${pat.mrn}`) : `MRN-#${patientId}`;

    const bodyHtml = `
      <form id="checkin-vitals-form" onsubmit="event.preventDefault(); app.submitCheckInVitals(${appointmentId}, ${patientId}, false, ${doctorId || 'null'}, ${doctorFee || 1500}, '${(doctorName || '').replace(/'/g, "\\'")}', '${(pat.full_name || patientName || '').replace(/'/g, "\\'")}');">
        <!-- Patient & Doctor Header -->
        <div style="background: #e8fbf0; border: 1.5px solid #bbf7d0; padding: 0.85rem 1.15rem; border-radius: 10px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 800; color: #007a33; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-user-check"></i> ${pat.full_name || patientName}
              <span style="font-family: monospace; background: #00c853; color: white; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.78rem; font-weight: 800;">${formattedMrn}</span>
              <span class="badge ${pat.gender === 'Female' ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">${pat.gender || 'Patient'}</span>
            </div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
              MRN: <strong>${formattedMrn}</strong> • ${pat.age ? pat.age + ' Yrs' : ''} • Phone: <strong>${pat.phone || '-'}</strong> • Blood: <strong>${pat.blood_group || 'Unknown'}</strong>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="text-align: right;">
              <span style="font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Assigned Consultant</span>
              <div style="font-weight: 800; color: #00c853; font-size: 0.95rem;">${doctorName || 'Doctor'}</div>
            </div>
            <button type="button" onclick="app.openPatientHistoryModal(${patientId})" class="btn btn-outline-primary btn-sm" title="View Complete Medical & Financial Dossier">
              <i class="fa-solid fa-folder-open"></i> Full History
            </button>
          </div>
        </div>

        <!-- Section 1: Previous Vitals History (Past Readings) -->
        <div style="margin-bottom: 1.15rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <div style="font-size: 0.85rem; font-weight: 800; color: #334155;">
              <i class="fa-solid fa-clock-rotate-left" style="color: #00c853;"></i> Previous Recorded Vitals for this Patient:
            </div>
            <span style="font-size: 0.74rem; color: #64748b;">${pastVitals.length} recorded entry(ies)</span>
          </div>

          ${pastVitals.length === 0 ? `
            <div style="padding: 0.65rem 1rem; color: #64748b; font-size: 0.8rem; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <i class="fa-solid fa-info-circle" style="color: #00c853;"></i> First visit — No previous vitals recorded for this patient yet.
            </div>
          ` : `
            <div style="max-height: 120px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
              <table class="table" style="font-size: 0.76rem; margin-bottom: 0;">
                <thead style="background: #f8fafc;">
                  <tr>
                    <th>Date & Time</th>
                    <th>BP (mmHg)</th>
                    <th>Pulse</th>
                    <th>Temp</th>
                    <th>SpO2</th>
                    <th>Weight/BMI</th>
                    <th>Sugar</th>
                    <th>Nurse Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${pastVitals.map(v => `
                    <tr>
                      <td><strong style="color: #007a33;">${v.recorded_at ? new Date(v.recorded_at).toLocaleDateString() : '-'}</strong></td>
                      <td><strong style="color: #00c853;">${v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '-'}</strong></td>
                      <td>${v.pulse_rate ? `${v.pulse_rate} bpm` : '-'}</td>
                      <td>${v.temperature_f ? `${v.temperature_f} °F` : '-'}</td>
                      <td>${v.spo2 ? `${v.spo2}%` : '-'}</td>
                      <td>${v.weight_kg ? `${v.weight_kg}kg (${v.bmi || '-'})` : '-'}</td>
                      <td>${v.blood_sugar_random ? `${v.blood_sugar_random}` : '-'}</td>
                      <td><small style="color: #64748b;">${v.notes || '-'}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Section 2: Today's Vitals Input Form -->
        <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 10px; padding: 1rem; margin-bottom: 0.5rem;">
          <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-main); margin-bottom: 0.75rem;">
            <i class="fa-solid fa-heart-pulse" style="color: #f43f5e;"></i> Today's Vitals & Triage Metrics:
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-heart-pulse" style="color: #ef4444;"></i> Systolic BP (mmHg)</label>
              <input type="number" id="cv-sys" class="form-control" placeholder="120" value="${currentVitals.systolic_bp !== undefined && currentVitals.systolic_bp !== null && currentVitals.systolic_bp !== '' ? currentVitals.systolic_bp : '120'}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-heart-pulse" style="color: #ef4444;"></i> Diastolic BP (mmHg)</label>
              <input type="number" id="cv-dia" class="form-control" placeholder="80" value="${currentVitals.diastolic_bp !== undefined && currentVitals.diastolic_bp !== null && currentVitals.diastolic_bp !== '' ? currentVitals.diastolic_bp : '80'}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-wave-square" style="color: #0284c7;"></i> Pulse Rate (bpm)</label>
              <input type="number" id="cv-pulse" class="form-control" placeholder="75" value="${currentVitals.pulse_rate !== undefined && currentVitals.pulse_rate !== null && currentVitals.pulse_rate !== '' ? currentVitals.pulse_rate : '75'}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-temperature-half" style="color: #f59e0b;"></i> Temperature (°F)</label>
              <input type="number" step="0.1" id="cv-temp" class="form-control" placeholder="98.6" value="${currentVitals.temperature_f !== undefined && currentVitals.temperature_f !== null && currentVitals.temperature_f !== '' ? currentVitals.temperature_f : '98.6'}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-lungs" style="color: #00c853;"></i> SpO2 (%)</label>
              <input type="number" id="cv-spo2" class="form-control" placeholder="98" min="70" max="100" value="${currentVitals.spo2 !== undefined && currentVitals.spo2 !== null && currentVitals.spo2 !== '' ? currentVitals.spo2 : '98'}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-droplet" style="color: #8b5cf6;"></i> Blood Sugar (mg/dL)</label>
              <input type="number" step="0.1" id="cv-sugar" class="form-control" placeholder="110" value="${currentVitals.blood_sugar_random !== undefined && currentVitals.blood_sugar_random !== null && currentVitals.blood_sugar_random !== '' ? currentVitals.blood_sugar_random : '110'}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-weight-scale" style="color: #0284c7;"></i> Weight (kg)</label>
              <input type="number" step="0.1" id="cv-weight" class="form-control" placeholder="70" value="${currentVitals.weight_kg !== undefined && currentVitals.weight_kg !== null && currentVitals.weight_kg !== '' ? currentVitals.weight_kg : '70'}" oninput="app.calculateBmi()">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-ruler-vertical" style="color: #0284c7;"></i> Height (cm)</label>
              <input type="number" step="0.1" id="cv-height" class="form-control" placeholder="170" value="${currentVitals.height_cm !== undefined && currentVitals.height_cm !== null && currentVitals.height_cm !== '' ? currentVitals.height_cm : '170'}" oninput="app.calculateBmi()">
            </div>
            <div class="form-group">
              <label class="form-label">Calculated BMI</label>
              <div id="cv-bmi-display" style="padding: 0.55rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-weight: 700; color: #007a33;">
                ${currentVitals.bmi ? currentVitals.bmi + ' kg/m²' : '24.2 kg/m² (Normal)'}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Check-In Nurse Remarks / Triage Notes</label>
            <input type="text" id="cv-notes" class="form-control" placeholder="e.g. Patient complains of headache & fever since 2 days" value="${currentVitals.notes || ''}">
          </div>
        </div>
      </form>
    `;

    const isEditing = Boolean(currentVitals && (currentVitals.systolic_bp || currentVitals.diastolic_bp || currentVitals.temperature_f || currentVitals.pulse_rate || currentVitals.spo2 || currentVitals.blood_sugar_random || currentVitals.weight_kg));

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <button type="button" class="btn btn-outline btn-sm" onclick="app.closeModal()">Cancel</button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-primary btn-sm" onclick="app.submitCheckInVitals(${appointmentId}, ${patientId}, false, ${doctorId || 'null'}, ${doctorFee || 1500}, '${(doctorName || '').replace(/'/g, "\\'")}', '${(pat.full_name || patientName || '').replace(/'/g, "\\'")}', false)" style="background: linear-gradient(135deg, #00c853, #009624); border-color: #00c853; font-weight: 700; box-shadow: 0 2px 8px rgba(0, 200, 83, 0.3);">
            <i class="fa-solid fa-check"></i> Save Vitals
          </button>
        </div>
      </div>
    `;

    const modalTitle = isEditing 
      ? '<i class="fa-solid fa-pen-to-square" style="color: #00c853;"></i> Re-edit Patient Vitals' 
      : '<i class="fa-solid fa-heart-pulse" style="color: #f43f5e;"></i> Patient Check-In & Record Vitals';

    this.openModal(modalTitle, bodyHtml, footerHtml, 'modal-lg');
  },

  calculateBmi() {
    const w = parseFloat(document.getElementById('cv-weight').value);
    const h = parseFloat(document.getElementById('cv-height').value);
    const el = document.getElementById('cv-bmi-display');
    if (w > 0 && h > 0) {
      const hM = h / 100;
      const bmi = (w / (hM * hM)).toFixed(1);
      let cat = 'Normal';
      let color = '#10b981';
      if (bmi < 18.5) { cat = 'Underweight'; color = '#f59e0b'; }
      else if (bmi >= 25 && bmi < 30) { cat = 'Overweight'; color = '#f59e0b'; }
      else if (bmi >= 30) { cat = 'Obese'; color = '#ef4444'; }
      el.innerHTML = `<span style="color: ${color};">${bmi} kg/m² (${cat})</span>`;
    } else {
      el.textContent = '-- kg/m²';
    }
  },

  async submitCheckInVitals(appointmentId, patientId, andThenProceedToBill = false, doctorId = null, doctorFee = 1500, doctorName = '', patientName = '', andThenSendToDoctor = false) {
    const systolic_bp = document.getElementById('cv-sys') ? document.getElementById('cv-sys').value : '';
    const diastolic_bp = document.getElementById('cv-dia') ? document.getElementById('cv-dia').value : '';
    const pulse_rate = document.getElementById('cv-pulse') ? document.getElementById('cv-pulse').value : '';
    const temperature_f = document.getElementById('cv-temp') ? document.getElementById('cv-temp').value : '';
    const spo2 = document.getElementById('cv-spo2') ? document.getElementById('cv-spo2').value : '';
    const blood_sugar_random = document.getElementById('cv-sugar') ? document.getElementById('cv-sugar').value : '';
    const weight_kg = document.getElementById('cv-weight') ? document.getElementById('cv-weight').value : '';
    const height_cm = document.getElementById('cv-height') ? document.getElementById('cv-height').value : '';
    const notes = document.getElementById('cv-notes') ? document.getElementById('cv-notes').value : '';

    const res = await this.api(`/appointments/${appointmentId}/checkin`, {
      method: 'POST',
      body: JSON.stringify({
        systolic_bp,
        diastolic_bp,
        pulse_rate,
        temperature_f,
        spo2,
        blood_sugar_random,
        weight_kg,
        height_cm,
        notes
      })
    });

    if (res.success) {
      this.closeModal();
      if (andThenSendToDoctor) {
        await this.sendToDoctor(appointmentId);
      } else if (andThenProceedToBill) {
        this.toast('🩺 Vitals recorded! Opening billing...', 'success');
        this.openMakeBillModal(appointmentId, patientId, doctorId, doctorFee, doctorName, patientName, '');
      } else {
        this.toast('🩺 Patient vitals recorded! Click "Send to Doctor" to proceed.', 'success');
      }
      if (typeof appointmentsComponent !== 'undefined' && appointmentsComponent.load) {
        appointmentsComponent.load();
      }
      if (typeof dashboardComponent !== 'undefined' && dashboardComponent.load) {
        dashboardComponent.load();
      }
      this.refreshActiveView();
    } else {
      this.toast(res.message || 'Failed to record vitals', 'error');
    }
  },

  // ==========================================================================
  // PATIENT CHECKOUT & BILLING MODAL (With Past Bills History & Remarks)
  // ==========================================================================
  async openMakeBillModal(appointmentId, patientId, doctorId, doctorFee = 1500, doctorName = '', patientName = '', tokenDisplay = '') {
    const patRes = await this.api(`/patients/${patientId}`);
    const pat = (patRes.data && patRes.data.patient) ? patRes.data.patient : { full_name: patientName, mrn: '' };
    const pastInvoices = (patRes.data && patRes.data.invoices) ? patRes.data.invoices : [];

    const bodyHtml = `
      <form id="checkout-bill-form">
        <!-- Patient Header Banner -->
        <div style="background: #e8fbf0; border: 1.5px solid #bbf7d0; padding: 0.85rem 1.15rem; border-radius: 10px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 800; color: #007a33; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-user-check"></i> ${pat.full_name || patientName}
              <span class="badge ${pat.gender === 'Female' ? 'badge-rose' : 'badge-blue'}" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">${pat.gender || 'Patient'}</span>
            </div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
              MRN: <strong>${pat.mrn || '-'}</strong> • Phone: <strong>${pat.phone || '-'}</strong> • ${doctorName ? 'Doctor: <strong>' + doctorName + '</strong>' : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button type="button" onclick="app.openPatientHistoryModal(${patientId})" class="btn btn-outline-primary btn-sm" title="View Patient 360 History">
              <i class="fa-solid fa-folder-open"></i> Full History
            </button>
          </div>
        </div>

        <!-- Section 1: Previous Invoices & Payment History -->
        <div style="margin-bottom: 1.15rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <div style="font-size: 0.85rem; font-weight: 800; color: #334155;">
              <i class="fa-solid fa-file-invoice-dollar" style="color: #00c853;"></i> Previous Bills & Invoices for this Patient:
            </div>
            <span style="font-size: 0.74rem; color: #64748b;">${pastInvoices.length} past invoice(s)</span>
          </div>

          ${pastInvoices.length === 0 ? `
            <div style="padding: 0.65rem 1rem; color: #64748b; font-size: 0.8rem; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <i class="fa-solid fa-info-circle" style="color: #00c853;"></i> First billing — No previous bills recorded for this patient.
            </div>
          ` : `
            <div style="max-height: 110px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
              <table class="table" style="font-size: 0.76rem; margin-bottom: 0;">
                <thead style="background: #f8fafc;">
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Total (${this.clinic.currency})</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th style="text-align: right;">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  ${pastInvoices.map(inv => `
                    <tr>
                      <td><strong style="font-family: monospace; color: #007a33;">${inv.invoice_number}</strong></td>
                      <td>${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</td>
                      <td><strong>${parseFloat(inv.total_amount).toLocaleString()}</strong></td>
                      <td>${parseFloat(inv.paid_amount).toLocaleString()}</td>
                      <td>${parseFloat(inv.balance_due) > 0 ? `<span style="color: #ef4444; font-weight: 700;">${parseFloat(inv.balance_due).toLocaleString()}</span>` : '0.00'}</td>
                      <td>
                        <span class="badge ${inv.payment_status === 'paid' ? 'badge-green' : 'badge-amber'}">${inv.payment_status}</span>
                      </td>
                      <td style="text-align: right;">
                        <button type="button" onclick="billingComponent.printInvoice(${inv.id}, 'pos')" class="btn btn-outline btn-sm" style="padding: 0.15rem 0.45rem; font-size: 0.72rem;">
                          <i class="fa-solid fa-print"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Section 2: Today's Bill Items & Settlement -->
        <div style="border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; margin-bottom: 1rem;">
          <div style="padding: 0.6rem 0.85rem; background: var(--bg-card); border-bottom: 1px solid var(--border-color); font-weight: 800; font-size: 0.88rem; color: var(--text-main);">
            <i class="fa-solid fa-receipt" style="color: #00c853;"></i> Today's Bill Items:
          </div>
          <table class="table" style="font-size: 0.84rem; margin-bottom: 0;">
            <thead style="background: #f1f5f9;">
              <tr>
                <th style="width: 50%;">Service Description</th>
                <th style="width: 15%;">Qty</th>
                <th style="width: 20%;">Price (${this.clinic.currency})</th>
                <th style="width: 15%;">Total</th>
                <th style="width: 5%;"></th>
              </tr>
            </thead>
            <tbody id="quick-bill-items-tbody">
              <tr class="qb-row" data-type="consultation">
                <td>
                  <input type="text" class="form-control qb-desc" value="Consultation Fee - ${doctorName || 'Consultant Doctor'}" required>
                </td>
                <td>
                  <input type="number" class="form-control qb-qty" value="1" min="1" oninput="app.recalculateQuickBill()">
                </td>
                <td>
                  <input type="number" step="0.1" class="form-control qb-price" value="${doctorFee || 1500}" min="0" oninput="app.recalculateQuickBill()">
                </td>
                <td>
                  <strong class="qb-linetotal">${this.clinic.currency} ${parseFloat(doctorFee || 1500).toFixed(2)}</strong>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div style="padding: 0.5rem 0.85rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <button type="button" onclick="app.addQuickBillRow('12-Lead Diagnostic ECG', 800, 'procedure')" class="btn btn-outline-primary btn-sm">+ ECG (800)</button>
            <button type="button" onclick="app.addQuickBillRow('Blood Sugar Random (BSR)', 150, 'procedure')" class="btn btn-outline-primary btn-sm">+ Sugar (150)</button>
            <button type="button" onclick="app.addQuickBillRow('Wound Dressing / Minor Procedure', 500, 'procedure')" class="btn btn-outline-primary btn-sm">+ Dressing (500)</button>
            <button type="button" onclick="app.addQuickBillRow('Emergency Nursing & Care', 600, 'nursing')" class="btn btn-outline-primary btn-sm">+ Nursing (600)</button>
            <button type="button" onclick="app.addQuickBillRow('', 0, 'other')" class="btn btn-outline btn-sm"><i class="fa-solid fa-plus"></i> Custom Item</button>
          </div>
        </div>

        <!-- Section 3: Payment & Remarks -->
        <div class="form-row" style="margin-bottom: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Payment Mode</label>
            <select id="qb-pay-method" class="form-control">
              <option value="cash" selected>Cash Settlement</option>
              <option value="card">Debit / Credit Card</option>
              <option value="online">Online / Bank Transfer</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Discount Amount (${this.clinic.currency})</label>
            <input type="number" id="qb-discount" class="form-control" value="0" min="0" oninput="app.recalculateQuickBill()">
          </div>
          <div class="form-group">
            <label class="form-label">Amount Collected (${this.clinic.currency})</label>
            <input type="number" id="qb-paid" class="form-control" value="${doctorFee || 1500}" min="0">
          </div>
        </div>

        <!-- Patient Remarks / Departure Notes Field -->
        <div class="form-group" style="margin-bottom: 0.85rem;">
          <label class="form-label"><i class="fa-solid fa-pen-to-square" style="color: #00c853;"></i> Patient Departure Remarks / Doctor Follow-up Notes</label>
          <textarea id="qb-notes" class="form-control" rows="2" placeholder="e.g. Prescription and lab report slips handed over. Advised to return in 5 days for follow-up review."></textarea>
        </div>

        <div style="background: #e8fbf0; border: 1.5px solid #bbf7d0; padding: 0.85rem 1.25rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.8rem; color: #64748b;">Subtotal: <span id="qb-subtotal-display">${this.clinic.currency} ${(doctorFee || 1500).toFixed(2)}</span></div>
            <div style="font-size: 0.8rem; color: #64748b;">Discount: <span id="qb-discount-display">${this.clinic.currency} 0.00</span></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.78rem; text-transform: uppercase; color: #007a33; font-weight: 800;">Total Payable & Settled</div>
            <div style="font-size: 1.4rem; font-weight: 900; color: #00c853;" id="qb-total-display">${this.clinic.currency} ${(doctorFee || 1500).toFixed(2)}</div>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary btn-lg" onclick="app.submitMakeBill(${appointmentId}, ${patientId})" style="background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
          <i class="fa-solid fa-circle-check"></i> Checkout Patient & Generate Bill Slip
        </button>
      </div>
    `;

    this.openModal('<i class="fa-solid fa-file-invoice-dollar" style="color: #00c853;"></i> Patient Checkout & Billing', bodyHtml, footerHtml, 'modal-lg');
  },

  addQuickBillRow(desc = '', price = 0, type = 'procedure') {
    const tbody = document.getElementById('quick-bill-items-tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = 'qb-row';
    tr.setAttribute('data-type', type);
    tr.innerHTML = `
      <td><input type="text" class="form-control qb-desc" value="${desc}" placeholder="Description" required></td>
      <td><input type="number" class="form-control qb-qty" value="1" min="1" oninput="app.recalculateQuickBill()"></td>
      <td><input type="number" step="0.1" class="form-control qb-price" value="${price}" min="0" oninput="app.recalculateQuickBill()"></td>
      <td><strong class="qb-linetotal">${this.clinic.currency} ${parseFloat(price).toFixed(2)}</strong></td>
      <td style="text-align: center;">
        <button type="button" onclick="this.closest('tr').remove(); app.recalculateQuickBill();" style="background: none; border: none; color: #ef4444; cursor: pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
    this.recalculateQuickBill();
  },

  recalculateQuickBill() {
    let subtotal = 0;
    document.querySelectorAll('.qb-row').forEach(tr => {
      const q = parseInt(tr.querySelector('.qb-qty').value) || 1;
      const p = parseFloat(tr.querySelector('.qb-price').value) || 0;
      const tot = q * p;
      tr.querySelector('.qb-linetotal').textContent = `${this.clinic.currency} ${tot.toFixed(2)}`;
      subtotal += tot;
    });

    const disc = parseFloat(document.getElementById('qb-discount').value) || 0;
    const net = Math.max(0, subtotal - disc);

    document.getElementById('qb-subtotal-display').textContent = `${this.clinic.currency} ${subtotal.toFixed(2)}`;
    document.getElementById('qb-discount-display').textContent = `${this.clinic.currency} ${disc.toFixed(2)}`;
    document.getElementById('qb-total-display').textContent = `${this.clinic.currency} ${net.toFixed(2)}`;

    const paidInput = document.getElementById('qb-paid');
    if (paidInput) paidInput.value = net.toFixed(2);
  },

  async submitMakeBill(appointmentId, patientId) {
    const payment_method = document.getElementById('qb-pay-method').value;
    const discount_value = parseFloat(document.getElementById('qb-discount').value) || 0;
    const initial_payment = parseFloat(document.getElementById('qb-paid').value) || 0;
    const notes = document.getElementById('qb-notes') ? document.getElementById('qb-notes').value.trim() : '';

    this.clearAllHighlights(document.getElementById('checkout-bill-form'));

    const items = [];
    let hasItemError = false;
    document.querySelectorAll('.qb-row').forEach(tr => {
      const descInput = tr.querySelector('.qb-desc');
      const priceInput = tr.querySelector('.qb-price');
      const desc = descInput ? descInput.value.trim() : '';
      const qty = parseInt(tr.querySelector('.qb-qty').value) || 1;
      const unit_price = parseFloat(priceInput ? priceInput.value : 0) || 0;
      const item_type = tr.getAttribute('data-type') || 'procedure';

      if (!desc) {
        this.highlightField(descInput, 'Description cannot be empty');
        hasItemError = true;
      }
      if (unit_price < 0) {
        this.highlightField(priceInput, 'Price cannot be negative');
        hasItemError = true;
      }

      if (desc) {
        items.push({ item_type, description: desc, quantity: qty, unit_price });
      }
    });

    if (hasItemError || items.length === 0) {
      this.toast('Please check all bill item descriptions and amounts.', 'error');
      return;
    }

    if (isNaN(initial_payment) || initial_payment < 0) {
      this.highlightField('qb-paid', 'Please enter a valid amount collected');
      this.toast('Amount collected cannot be negative.', 'error');
      return;
    }

    const res = await this.api('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        appointment_id: appointmentId,
        items,
        discount_value,
        payment_method,
        initial_payment,
        notes
      })
    });

    if (res.success) {
      this.toast('🎉 Patient bill settled & checkout completed successfully!', 'success');
      this.closeModal();

      // Print Thermal POS receipt slip
      billingComponent.printInvoice(res.invoiceId, 'pos');

      this.refreshActiveView();
    } else {
      this.toast(res.message || 'Failed to generate bill', 'error');
    }
  },

  // ==========================================================================
  // PATIENT 360° COMPLETE MEDICAL & FINANCIAL HISTORY DOSSIER
  // ==========================================================================
  async openPatientHistoryModal(patientId) {
    let cachedP = null;
    if (typeof patientHistoryComponent !== 'undefined' && patientHistoryComponent.patientsList) {
      cachedP = patientHistoryComponent.patientsList.find(item => item.id == patientId);
    }
    if (!cachedP && typeof patientsComponent !== 'undefined' && patientsComponent.patientsList) {
      cachedP = patientsComponent.patientsList.find(item => item.id == patientId);
    }

    const renderHistoryModal = (p, vitals = [], appointments = [], consultations = [], labOrders = [], invoices = [], isLoading = false) => {
      let totalBilled = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      invoices.forEach(inv => {
        totalBilled += parseFloat(inv.total_amount || 0);
        totalPaid += parseFloat(inv.paid_amount || 0);
        totalBalance += parseFloat(inv.balance_due || 0);
      });

      const bodyHtml = `
        <!-- Patient Dossier Top Banner -->
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.15rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="avatar-bubble ${p.gender === 'Female' ? 'avatar-rose' : 'avatar-teal'}" style="width: 52px; height: 52px; font-size: 1.2rem; font-weight: 800;">
                ${(p.full_name || 'PT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-main);">${p.full_name}</h3>
                  <span class="badge ${p.gender === 'Female' ? 'badge-rose' : 'badge-blue'}">${p.gender}, ${p.age || '-'} Yrs</span>
                  <span class="badge badge-teal" style="font-weight: 700;">MRN: ${p.mrn}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                  <i class="fa-solid fa-phone" style="color: #00c853;"></i> <strong>${p.phone}</strong> • Blood: <strong>${p.blood_group || 'Unknown'}</strong> • CNIC: <strong>${p.cnic || 'N/A'}</strong>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.4rem 0.75rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.68rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Visits</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #00c853;">${isLoading ? (p.appointment_count || '<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.85rem;"></i>') : appointments.length}</div>
              </div>
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.4rem 0.75rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.68rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Billed</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">${isLoading ? '<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.85rem;"></i>' : `${this.clinic.currency} ${totalBilled.toLocaleString()}`}</div>
              </div>
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.4rem 0.75rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.68rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Balance Due</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: ${totalBalance > 0 ? '#ef4444' : '#10b981'};">
                  ${isLoading ? '<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.85rem;"></i>' : `${this.clinic.currency} ${totalBalance.toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Buttons -->
        <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.15rem; gap: 0.5rem; overflow-x: auto;">
          <button type="button" class="btn btn-sm btn-primary pat-hist-tab-btn active" id="pht-btn-vitals" onclick="app.switchPatientHistoryTab('vitals')">
            <i class="fa-solid fa-heart-pulse"></i> Vitals History (${isLoading ? '...' : vitals.length})
          </button>
          <button type="button" class="btn btn-sm btn-outline pat-hist-tab-btn" id="pht-btn-invoices" onclick="app.switchPatientHistoryTab('invoices')">
            <i class="fa-solid fa-file-invoice-dollar"></i> Bills & Invoices (${isLoading ? '...' : invoices.length})
          </button>
          <button type="button" class="btn btn-sm btn-outline pat-hist-tab-btn" id="pht-btn-visits" onclick="app.switchPatientHistoryTab('visits')">
            <i class="fa-solid fa-calendar-check"></i> Visits & Appointments (${isLoading ? '...' : appointments.length})
          </button>
          <button type="button" class="btn btn-sm btn-outline pat-hist-tab-btn" id="pht-btn-consults" onclick="app.switchPatientHistoryTab('consults')">
            <i class="fa-solid fa-stethoscope"></i> Consultations & Prescriptions (${isLoading ? '...' : consultations.length})
          </button>
        </div>

        <!-- TAB 1: VITALS HISTORY -->
        <div id="pht-pane-vitals" class="pht-pane" style="display: block;">
          ${isLoading ? `
            <div style="text-align: center; padding: 2.5rem; color: #00c853;">
              <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
              <p>Loading clinical vitals history...</p>
            </div>
          ` : (vitals.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem; color: #94a3b8;">
              <i class="fa-solid fa-heart-pulse" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
              <p>No vitals records recorded for this patient yet.</p>
            </div>
          ` : `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table class="table" style="font-size: 0.82rem; margin-bottom: 0;">
                <thead style="background: #f8fafc;">
                  <tr>
                    <th>Date & Time</th>
                    <th>BP (mmHg)</th>
                    <th>Pulse</th>
                    <th>Temp (°F)</th>
                    <th>SpO2</th>
                    <th>Weight / BMI</th>
                    <th>Blood Sugar</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  ${vitals.map(v => `
                    <tr>
                      <td><strong>${v.recorded_at ? new Date(v.recorded_at).toLocaleDateString() : '-'}</strong></td>
                      <td><span style="font-weight: 700; color: #007a33;">${v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '-'}</span></td>
                      <td>${v.pulse_rate ? `${v.pulse_rate} bpm` : '-'}</td>
                      <td>${v.temperature_f ? `${v.temperature_f} °F` : '-'}</td>
                      <td>${v.spo2 ? `<span class="badge ${v.spo2 < 95 ? 'badge-rose' : 'badge-teal'}">${v.spo2}%</span>` : '-'}</td>
                      <td>${v.weight_kg ? `${v.weight_kg} kg (BMI: ${v.bmi || '-'})` : '-'}</td>
                      <td>${v.blood_sugar_random ? `R: ${v.blood_sugar_random}` : (v.blood_sugar_fasting ? `F: ${v.blood_sugar_fasting}` : '-')}</td>
                      <td><small style="color: #64748b;">${v.recorded_by || 'Staff'}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `)}
        </div>

        <!-- TAB 2: INVOICES & BILLS HISTORY -->
        <div id="pht-pane-invoices" class="pht-pane" style="display: none;">
          ${isLoading ? `
            <div style="text-align: center; padding: 2.5rem; color: #00c853;">
              <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
              <p>Loading invoice records...</p>
            </div>
          ` : (invoices.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem; color: #94a3b8;">
              <i class="fa-solid fa-receipt" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
              <p>No billing invoices generated for this patient yet.</p>
            </div>
          ` : `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table class="table" style="font-size: 0.82rem; margin-bottom: 0;">
                <thead style="background: #f8fafc;">
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                    <th>Discount</th>
                    <th>Paid Amount</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th>Remarks / Notes</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoices.map(inv => `
                    <tr>
                      <td><strong style="font-family: monospace; color: #00c853;">${inv.invoice_number}</strong></td>
                      <td>${inv.created_at ? new Date(inv.created_at).toLocaleString() : '-'}</td>
                      <td><strong>${this.clinic.currency} ${parseFloat(inv.total_amount).toLocaleString()}</strong></td>
                      <td>${parseFloat(inv.discount_amount) > 0 ? `${this.clinic.currency} ${parseFloat(inv.discount_amount).toLocaleString()}` : '-'}</td>
                      <td><strong style="color: #059669;">${this.clinic.currency} ${parseFloat(inv.paid_amount).toLocaleString()}</strong></td>
                      <td>
                        ${parseFloat(inv.balance_due) > 0 ? `<span style="color: #ef4444; font-weight: 800;">${this.clinic.currency} ${parseFloat(inv.balance_due).toLocaleString()}</span>` : '<span style="color: #10b981;">Settled</span>'}
                      </td>
                      <td>
                        <span class="badge ${inv.payment_status === 'paid' ? 'badge-green' : (inv.payment_status === 'partial' ? 'badge-amber' : 'badge-rose')}">${inv.payment_status}</span>
                      </td>
                      <td><small style="color: #64748b;">${inv.notes || '-'}</small></td>
                      <td style="text-align: right;">
                        <button type="button" onclick="billingComponent.printInvoice(${inv.id}, 'pos')" class="btn btn-outline btn-sm" title="Print POS Receipt">
                          <i class="fa-solid fa-print"></i> POS Receipt
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `)}
        </div>

        <!-- TAB 3: VISITS & APPOINTMENTS -->
        <div id="pht-pane-visits" class="pht-pane" style="display: none;">
          ${isLoading ? `
            <div style="text-align: center; padding: 2.5rem; color: #00c853;">
              <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
              <p>Loading visit records...</p>
            </div>
          ` : (appointments.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem; color: #94a3b8;">
              <i class="fa-solid fa-calendar-xmark" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
              <p>No appointment records found for this patient.</p>
            </div>
          ` : `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table class="table" style="font-size: 0.82rem; margin-bottom: 0;">
                <thead style="background: #f8fafc;">
                  <tr>
                    <th>Token</th>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Chief Complaint</th>
                  </tr>
                </thead>
                <tbody>
                  ${appointments.map(a => `
                    <tr>
                      <td><strong style="color: #00c853;">${a.token_display || '#' + a.id}</strong></td>
                      <td>${a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : '-'}</td>
                      <td><strong>${a.doctor_name}</strong> <small style="color: #64748b;">(${a.doctor_specialty})</small></td>
                      <td><span class="badge badge-outline">${a.appointment_type}</span></td>
                      <td><span class="badge ${a.priority === 'urgent' ? 'badge-rose' : 'badge-blue'}">${a.priority}</span></td>
                      <td><span class="badge badge-teal">${a.status}</span></td>
                      <td><small>${a.chief_complaint || '-'}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `)}
        </div>

        <!-- TAB 4: CONSULTATIONS & PRESCRIPTIONS -->
        <div id="pht-pane-consults" class="pht-pane" style="display: none;">
          ${isLoading ? `
            <div style="text-align: center; padding: 2.5rem; color: #00c853;">
              <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
              <p>Loading clinical prescriptions...</p>
            </div>
          ` : (consultations.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem; color: #94a3b8;">
              <i class="fa-solid fa-stethoscope" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
              <p>No clinical consultations or prescriptions documented yet.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${consultations.map(c => `
                <div style="border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 1.15rem; background: white;">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.65rem; margin-bottom: 0.75rem;">
                    <div>
                      <strong style="color: #00c853; font-size: 0.95rem;"><i class="fa-solid fa-user-doctor"></i> ${c.doctor_name}</strong>
                      <span style="font-size: 0.8rem; color: #64748b;">(${c.doctor_specialty})</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <span style="font-size: 0.8rem; color: #64748b;"><i class="fa-regular fa-clock"></i> ${new Date(c.consultation_date).toLocaleString()}</span>
                      <button type="button" onclick="consultationComponent.printPrescription(${c.id})" class="btn btn-outline-primary btn-sm">
                        <i class="fa-solid fa-print"></i> Print Rx
                      </button>
                    </div>
                  </div>
                  <div style="font-size: 0.82rem; margin-bottom: 0.5rem;">
                    <strong>Diagnosis:</strong> <span style="color: #0f172a; font-weight: 600;">${c.diagnosis || 'General Clinical Review'}</span>
                  </div>
                  ${c.clinical_notes ? `<div style="font-size: 0.8rem; color: #475569; margin-bottom: 0.6rem; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 6px;"><strong>Clinical Notes:</strong> ${c.clinical_notes}</div>` : ''}
                  ${c.medicines && c.medicines.length > 0 ? `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem;">
                      <div style="font-weight: 700; font-size: 0.82rem; color: #007a33; margin-bottom: 0.4rem;"><i class="fa-solid fa-pills"></i> Prescribed Medicines:</div>
                      <table class="table" style="font-size: 0.78rem; background: white; margin-bottom: 0;">
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Strength</th>
                            <th>Dosage</th>
                            <th>Duration</th>
                            <th>Instruction</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${c.medicines.map(m => `
                            <tr>
                              <td><strong>${m.medicine_name}</strong></td>
                              <td>${m.dosage_form} ${m.strength}</td>
                              <td><span class="badge badge-blue">${m.frequency}</span> (${m.dosage})</td>
                              <td>${m.duration}</td>
                              <td>${m.instruction}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `)}
        </div>
      `;

      const footerHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <button class="btn btn-outline" onclick="app.closeModal()">Close Dossier</button>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-outline" style="color: var(--wine-red); border-color: rgba(136, 19, 55, 0.4);" onclick="app.deletePatientFromModal(${patientId}, '${(p.full_name || 'Patient').replace(/'/g, "\\'")}')" title="Delete Patient Record">
              <i class="fa-solid fa-trash-can"></i> Delete Patient Record
            </button>
            <button class="btn btn-primary" onclick="app.openBookAppointmentModal(${patientId})">
              <i class="fa-solid fa-calendar-plus"></i> Book New Appointment
            </button>
          </div>
        </div>
      `;

      this.openModal(`<i class="fa-solid fa-id-card-clip" style="color: #00c853;"></i> Patient 360° Complete Medical & Financial History`, bodyHtml, footerHtml, 'modal-xl');
    };

    // Instant open with cached data if available
    if (cachedP) {
      renderHistoryModal(cachedP, [], [], [], [], [], true);
    }

    const res = await this.api(`/patients/${patientId}`);
    if (!res.success) {
      if (!cachedP) this.toast(res.message || 'Failed to load patient history', 'error');
      return;
    }

    const { patient: p, vitals = [], appointments = [], consultations = [], labOrders = [], invoices = [] } = res.data;
    renderHistoryModal(p, vitals, appointments, consultations, labOrders, invoices, false);
    return;
  },

  switchPatientHistoryTab(tabName) {
    document.querySelectorAll('.pat-hist-tab-btn').forEach(btn => {
      btn.classList.remove('btn-primary', 'active');
      btn.classList.add('btn-outline');
    });

    const activeBtn = document.getElementById(`pht-btn-${tabName}`);
    if (activeBtn) {
      activeBtn.classList.remove('btn-outline');
      activeBtn.classList.add('btn-primary', 'active');
    }

    document.querySelectorAll('.pht-pane').forEach(p => p.style.display = 'none');
    const activePane = document.getElementById(`pht-pane-${tabName}`);
    if (activePane) activePane.style.display = 'block';
  },

  async deleteAppointment(appointmentId, tokenDisplay = '') {
    if (!confirm(`Are you sure you want to delete appointment ${tokenDisplay || `#${appointmentId}`}? This will remove the appointment from the database.`)) {
      return;
    }
    const res = await this.api(`/appointments/${appointmentId}`, { method: 'DELETE' });
    if (res.success) {
      this.toast(`Appointment ${tokenDisplay || `#${appointmentId}`} deleted successfully from database!`, 'success');
      if (this.currentView === 'dashboard' && typeof dashboardComponent !== 'undefined' && dashboardComponent.load) {
        dashboardComponent.load();
      }
      if (this.currentView === 'appointments' && typeof appointmentsComponent !== 'undefined' && appointmentsComponent.load) {
        appointmentsComponent.load();
      }
    } else {
      this.toast(res.message || 'Failed to delete appointment', 'error');
    }
  },

  async deleteInvoice(invoiceId, invoiceNum = '') {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNum || `#${invoiceId}`}? This will remove the invoice and payment records from the database.`)) {
      return;
    }
    const res = await this.api(`/billing/invoices/${invoiceId}`, { method: 'DELETE' });
    if (res.success) {
      this.refreshActiveView();
    } else {
      this.toast(res.message || 'Failed to delete invoice', 'error');
    }
  },

  async deleteConsultation(consultationId, info = '') {
    if (!confirm(`Are you sure you want to delete consultation ${info || `#${consultationId}`}? This will remove the prescription and diagnosis records from the database.`)) {
      return;
    }
    const res = await this.api(`/consultations/${consultationId}`, { method: 'DELETE' });
    if (res.success) {
      this.toast(`Consultation ${info || `#${consultationId}`} deleted successfully from database!`, 'success');
      this.refreshActiveView();
    } else {
      this.toast(res.message || 'Failed to delete consultation', 'error');
    }
  },

  async deletePatientFromModal(patientId, patientName) {
    if (!confirm(`Are you sure you want to permanently delete patient "${patientName}" and all associated medical, billing, and appointment records from the database?`)) {
      return;
    }
    const res = await this.api(`/patients/${patientId}`, { method: 'DELETE' });
    if (res.success) {
      this.toast(`Patient "${patientName}" deleted successfully!`, 'success');
      this.closeModal();
      if (typeof patientsComponent !== 'undefined' && patientsComponent.load) {
        patientsComponent.load();
      }
      if (typeof patientHistoryComponent !== 'undefined' && patientHistoryComponent.loadPatientsList) {
        patientHistoryComponent.loadPatientsList();
      }
      this.refreshActiveView();
    } else {
      this.toast(res.message || 'Failed to delete patient', 'error');
    }
  }
};

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// React to browser back/forward or URL hash changes
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  const validViews = ['dashboard', 'doctors', 'patients', 'appointments', 'vitals-bills', 'patient-history', 'billing', 'settings'];
  if (hash && validViews.includes(hash) && app.currentView !== hash) {
    app.navigate(hash);
  }
});
