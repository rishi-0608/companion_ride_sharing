/* ═══════════════════════════════════════════
   COMPANION — MAIN SCRIPT
   Ride-Sharing App for Amrita Students
═══════════════════════════════════════════ */

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let currentUser = null;      // logged-in user object
let currentRideId = null;    // ride being viewed in detail page

// ─────────────────────────────────────────
// LOCAL STORAGE HELPERS
// ─────────────────────────────────────────
const LS = {
  getUsers: () => JSON.parse(localStorage.getItem('companion_users') || '[]'),
  saveUsers: (users) => localStorage.setItem('companion_users', JSON.stringify(users)),
  getRides: () => JSON.parse(localStorage.getItem('companion_rides') || '[]'),
  saveRides: (rides) => localStorage.setItem('companion_rides', JSON.stringify(rides)),
  getCurrentUser: () => JSON.parse(localStorage.getItem('companion_current_user') || 'null'),
  saveCurrentUser: (user) => localStorage.setItem('companion_current_user', JSON.stringify(user)),
  clearCurrentUser: () => localStorage.removeItem('companion_current_user'),
};

// ─────────────────────────────────────────
// APP INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  // Restore session
  const saved = LS.getCurrentUser();
  if (saved) {
    currentUser = saved;
    updateUserAvatars();
    showPage('page-dashboard');
    populateDashboard();
  } else {
    showPage('page-landing');
    populateLandingPreview();
  }

  seedSampleRides();
  populateLandingPreview();

  // Set today as default date in find page
  const today = new Date().toISOString().split('T')[0];
  const findDate = document.getElementById('find-date');
  if (findDate) findDate.value = today;

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.user-dropdown.open').forEach(d => {
      if (!d.parentElement.contains(e.target)) d.classList.remove('open');
    });
  });
});

// ─────────────────────────────────────────
// PAGE NAVIGATION
// ─────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }

  // Re-render icons after page switch
  setTimeout(() => lucide.createIcons(), 50);

  // Page-specific actions
  if (pageId === 'page-dashboard') { populateDashboard(); updateSidebarActive('sl-dashboard'); }
  if (pageId === 'page-find') { searchRides(); }
  if (pageId === 'page-find-public') { renderPublicRides(); }
  if (pageId === 'page-myrides') { renderMyRides(); }
  if (pageId === 'page-settings') { populateSettings(); }
}

// Require auth before accessing protected pages
function requireAuth(page) {
  if (currentUser) {
    showPage(page);
  } else {
    showPage('page-login');
    showToast('Please log in to continue.', 'info');
  }
}

function updateSidebarActive(id) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function showSection(name) {
  showToast(`${name.charAt(0).toUpperCase() + name.slice(1)} feature coming soon!`, 'info');
}

// ─────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────
function showModal(icon, title, body, primaryLabel = 'OK', onPrimary = null, showSecondary = false, secondaryLabel = 'Cancel', onSecondary = null) {
  document.getElementById('modal-icon').textContent = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = body;

  const primaryBtn = document.getElementById('modal-primary-btn');
  primaryBtn.textContent = primaryLabel;
  primaryBtn.onclick = () => { closeModal(); if (onPrimary) onPrimary(); };

  const secondaryBtn = document.getElementById('modal-secondary-btn');
  secondaryBtn.style.display = showSecondary ? 'inline-flex' : 'none';
  secondaryBtn.textContent = secondaryLabel;
  secondaryBtn.onclick = () => { closeModal(); if (onSecondary) onSecondary(); };

  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ─────────────────────────────────────────
// PASSWORD TOGGLE
// ─────────────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<i data-lucide="eye-off"></i>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<i data-lucide="eye"></i>';
  }
  lucide.createIcons();
}

// ─────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────
function handleSignup(e) {
  e.preventDefault();
  clearErrors();

  const name     = document.getElementById('signup-name').value.trim();
  const phone    = document.getElementById('signup-phone').value.trim();
  const email    = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;

  let valid = true;

  if (!name) { setError('err-name', 'Full name is required.'); valid = false; }
  if (!/^\d{10}$/.test(phone)) { setError('err-phone', 'Enter a valid 10-digit phone number.'); valid = false; }
  if (!email.endsWith('@cb.students.amrita.edu')) {
    setError('err-email', 'Email must end with @cb.students.amrita.edu');
    valid = false;
  }
  if (password.length < 6) { setError('err-password', 'Password must be at least 6 characters.'); valid = false; }

  if (!valid) return;

  const users = LS.getUsers();
  if (users.find(u => u.email === email)) {
    setError('err-email', 'This email is already registered.');
    return;
  }

  const newUser = {
    id: generateId(),
    name, phone, email, password,
    joinedAt: new Date().toISOString(),
    ridesPosted: [],
    ridesJoined: []
  };

  users.push(newUser);
  LS.saveUsers(users);

  currentUser = newUser;
  LS.saveCurrentUser(newUser);
  updateUserAvatars();

  showToast(`Welcome to Companion, ${name}! 🎉`, 'success');
  document.getElementById('signup-form').reset();
  showPage('page-dashboard');
  populateDashboard();
}

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const identifier = document.getElementById('login-email').value.trim();
  const password   = document.getElementById('login-password').value;

  if (!identifier) { setError('err-login-email', 'Please enter your email or name.'); return; }
  if (!password)   { setError('err-login-password', 'Please enter your password.'); return; }

  const users = LS.getUsers();
  const user  = users.find(u =>
    (u.email === identifier.toLowerCase() || u.name.toLowerCase() === identifier.toLowerCase())
    && u.password === password
  );

  if (!user) {
    setError('err-login-password', 'Invalid credentials. Please try again.');
    return;
  }

  currentUser = user;
  LS.saveCurrentUser(user);
  updateUserAvatars();

  showToast(`Welcome back, ${user.name}! 👋`, 'success');
  document.getElementById('login-form').reset();
  showPage('page-dashboard');
  populateDashboard();
}

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
function handleLogout() {
  showModal('👋', 'Logging Out', 'Are you sure you want to log out?', 'Logout', () => {
    currentUser = null;
    LS.clearCurrentUser();
    showToast('Logged out successfully.', 'info');
    showPage('page-landing');
    populateLandingPreview();
  }, true, 'Stay');
}

// ─────────────────────────────────────────
// USER AVATAR UPDATES
// ─────────────────────────────────────────
function updateUserAvatars() {
  if (!currentUser) return;
  const initial = currentUser.name.charAt(0).toUpperCase();
  const avatarIds = ['user-avatar-nav', 'find-user-avatar', 'post-user-avatar', 'myrides-user-avatar', 'detail-user-avatar', 'settings-user-avatar'];
  avatarIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initial;
  });
  const nameEl = document.getElementById('dropdown-name');
  const emailEl = document.getElementById('dropdown-email');
  if (nameEl) nameEl.textContent = currentUser.name;
  if (emailEl) emailEl.textContent = currentUser.email;
}

function toggleUserMenu() {
  document.querySelectorAll('.user-dropdown').forEach(d => {
    const rect = d.parentElement.getBoundingClientRect();
    if (rect.width > 0) d.classList.toggle('open');
  });
}

// ─────────────────────────────────────────
// DASHBOARD POPULATE
// ─────────────────────────────────────────
function populateDashboard() {
  if (!currentUser) return;

  // Welcome message
  const welcomeEl = document.getElementById('welcome-title');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${currentUser.name.split(' ')[0]}`;

  const rides = LS.getRides();
  const myJoined = rides.filter(r => r.joinedBy && r.joinedBy.includes(currentUser.id));
  const myPosted = rides.filter(r => r.postedBy === currentUser.id);

  const subEl = document.getElementById('welcome-sub');
  if (subEl) subEl.textContent = `You have ${myPosted.length + myJoined.length} ride(s) connected to your account.`;

  // Upcoming rides
  const container = document.getElementById('dash-upcoming-rides');
  if (container) {
    const upcoming = [...myPosted, ...myJoined]
      .filter(r => r.date >= new Date().toISOString().split('T')[0])
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 2);

    if (upcoming.length === 0) {
      container.innerHTML = `<div class="empty-state-small">
        <i data-lucide="car"></i>
        <p>No upcoming rides. <a href="#" onclick="showPage('page-find')">Find one!</a></p>
      </div>`;
    } else {
      container.innerHTML = upcoming.map(r => `
        <div class="upcoming-ride-item" onclick="openRideDetail('${r.id}')">
          <div class="uri-map">🗺️</div>
          <div class="uri-info">
            <div class="uri-time">${formatDateTime(r.date, r.time)}</div>
            <div class="uri-route">${r.from} → ${r.to}</div>
            <div class="uri-meta">
              ${r.vehicle} · ${r.seats} seat(s) left ·
              <span class="uri-fare">₹${calcSplitFare(r.fare, r.seats)}/person</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Stats
  const totalJoins = myJoined.length;
  const moneySaved = totalJoins * 80;
  const balEl = document.getElementById('balance-amount');
  const noteEl = document.getElementById('balance-note');
  const statMoney = document.getElementById('stat-money');
  if (balEl) balEl.textContent = `₹${moneySaved}`;
  if (noteEl) noteEl.textContent = totalJoins > 0 ? `${totalJoins} rides joined` : 'Start sharing rides to save!';
  if (statMoney) statMoney.textContent = `₹${moneySaved}`;

  lucide.createIcons();
}

// ─────────────────────────────────────────
// SEED SAMPLE RIDES
// ─────────────────────────────────────────
function seedSampleRides() {
  const rides = LS.getRides();
  if (rides.length > 0) return;

  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

  const fmt = (d) => d.toISOString().split('T')[0];

  const samples = [
    {
      id: generateId(), postedBy: 'sample1', driverName: 'Arjun K.', driverRating: '4.9',
      from: 'Amrita Campus Gate', to: 'Coimbatore Railway Station',
      date: fmt(today), time: '09:30', seats: 3, vehicle: 'Car', fare: 120, contact: '9876543210',
      joinedBy: [], createdAt: new Date().toISOString()
    },
    {
      id: generateId(), postedBy: 'sample2', driverName: 'Priya S.', driverRating: '5.0',
      from: 'Amrita Campus', to: 'Gandhipuram Bus Stand',
      date: fmt(today), time: '14:00', seats: 2, vehicle: 'Car', fare: 80, contact: '9123456789',
      joinedBy: [], createdAt: new Date().toISOString()
    },
    {
      id: generateId(), postedBy: 'sample3', driverName: 'Rahul M.', driverRating: '4.7',
      from: 'North Campus Gate', to: 'Peelamedu',
      date: fmt(tomorrow), time: '08:00', seats: 4, vehicle: 'Van', fare: 200, contact: '9234567891',
      joinedBy: [], createdAt: new Date().toISOString()
    },
    {
      id: generateId(), postedBy: 'sample4', driverName: 'Sneha L.', driverRating: '4.8',
      from: 'Amrita Main Gate', to: 'SITRA Bus Stop',
      date: fmt(tomorrow), time: '17:30', seats: 1, vehicle: 'Bike', fare: 40, contact: '9345678912',
      joinedBy: [], createdAt: new Date().toISOString()
    },
    {
      id: generateId(), postedBy: 'sample5', driverName: 'Vikram N.', driverRating: '4.6',
      from: 'Amrita Campus', to: 'Ukkadam',
      date: fmt(dayAfter), time: '11:00', seats: 3, vehicle: 'Auto', fare: 60, contact: '9456789123',
      joinedBy: [], createdAt: new Date().toISOString()
    },
    {
      id: generateId(), postedBy: 'sample6', driverName: 'Divya R.', driverRating: '4.9',
      from: 'Amrita CB Campus', to: 'Tidel Park',
      date: fmt(dayAfter), time: '07:45', seats: 3, vehicle: 'Car', fare: 150, contact: '9567891234',
      joinedBy: [], createdAt: new Date().toISOString()
    }
  ];

  LS.saveRides(samples);
}

// ─────────────────────────────────────────
// FIND RIDES — SEARCH
// ─────────────────────────────────────────
function searchRides() {
  const fromVal = (document.getElementById('find-from')?.value || '').trim().toLowerCase();
  const toVal   = (document.getElementById('find-to')?.value   || '').trim().toLowerCase();
  const dateVal = document.getElementById('find-date')?.value || '';
  const maxFare = parseInt(document.getElementById('fare-range')?.value || '5000', 10);
  const sortBy  = document.getElementById('sort-rides')?.value || 'time';

  let rides = LS.getRides();

  // Filter: exclude own posted rides
  if (currentUser) rides = rides.filter(r => r.postedBy !== currentUser.id);

  // Filter by text
  if (fromVal) rides = rides.filter(r => r.from.toLowerCase().includes(fromVal));
  if (toVal)   rides = rides.filter(r => r.to.toLowerCase().includes(toVal));
  if (dateVal) rides = rides.filter(r => r.date === dateVal);

  // Filter by fare
  rides = rides.filter(r => r.fare <= maxFare);

  // Filter: only rides with seats > 0
  rides = rides.filter(r => r.seats > 0);

  // Vehicle filters
  const carChecked   = document.getElementById('f-car')?.checked  ?? true;
  const bikeChecked  = document.getElementById('f-bike')?.checked ?? true;
  const autoChecked  = document.getElementById('f-auto')?.checked ?? true;
  const vanChecked   = document.getElementById('f-van')?.checked  ?? true;
  rides = rides.filter(r => {
    const v = r.vehicle;
    if (v === 'Car'  && !carChecked)  return false;
    if (v === 'Bike' && !bikeChecked) return false;
    if (v === 'Auto' && !autoChecked) return false;
    if ((v === 'Van' || v === 'Cab') && !vanChecked) return false;
    return true;
  });

  // Sort
  if (sortBy === 'time') rides.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (sortBy === 'fare') rides.sort((a, b) => a.fare - b.fare);
  if (sortBy === 'seats') rides.sort((a, b) => b.seats - a.seats);

  const countEl = document.getElementById('ride-count');
  if (countEl) countEl.textContent = `${rides.length} found`;

  const container = document.getElementById('rides-results');
  if (!container) return;

  if (rides.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="search-x"></i>
        <h3>No rides found</h3>
        <p>Try adjusting your search filters or check back later.</p>
      </div>`;
  } else {
    container.innerHTML = rides.map(r => renderRideCard(r, false)).join('');
  }

  lucide.createIcons();
}

// ─────────────────────────────────────────
// RENDER RIDE CARD
// ─────────────────────────────────────────
function renderRideCard(r, compact = false) {
  const splitFare = calcSplitFare(r.fare, r.seats);
  const isLowSeat = r.seats <= 1;
  const avatarColor = stringToColor(r.driverName || 'A');
  const initial = (r.driverName || 'A').charAt(0).toUpperCase();

  return `
    <div class="ride-card" onclick="openRideDetail('${r.id}')">
      <div class="ride-card-driver">
        <div class="driver-avatar-md" style="background:${avatarColor}">${initial}</div>
        <div class="driver-name-sm">${r.driverName || 'Driver'}</div>
        <span class="driver-verified"><i data-lucide="shield-check"></i> AMRITA STUDENT</span>
        <div class="driver-rating-sm">⭐ ${r.driverRating || '4.8'} · ${r.joinedBy?.length || 0} rides</div>
      </div>
      <div class="ride-card-route">
        <div class="route-point">
          <div class="route-dot-sm"></div>
          <span class="route-time">${r.time || '--:--'}</span>
          <span class="route-loc">${r.from}</span>
        </div>
        <div class="route-connector"></div>
        <div class="route-point">
          <div class="route-dot-sm end"></div>
          <span class="route-time">${r.date}</span>
          <span class="route-loc">${r.to}</span>
        </div>
        <div style="margin-top:6px;font-size:0.8rem;color:var(--text-muted)">
          🚗 ${r.vehicle} &nbsp;·&nbsp; 📞 ${r.contact}
        </div>
      </div>
      <div class="ride-card-right">
        <div class="ride-fare-big">₹${splitFare}</div>
        <div class="per-seat-sm">per seat</div>
        <div class="seats-badge ${isLowSeat ? 'low' : ''}">
          <i data-lucide="users"></i>
          ${r.seats} seat${r.seats !== 1 ? 's' : ''} left
        </div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openRideDetail('${r.id}')">
          Request Seat
        </button>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────
// RIDE DETAIL PAGE
// ─────────────────────────────────────────
function openRideDetail(rideId) {
  if (!currentUser) { requireAuth('page-dashboard'); return; }

  const rides = LS.getRides();
  const ride = rides.find(r => r.id === rideId);
  if (!ride) { showToast('Ride not found.', 'error'); return; }

  currentRideId = rideId;

  // Populate fields
  setText('rd-title', `${ride.from} → ${ride.to}`);
  setText('rd-fare', `₹${ride.fare}`);
  setText('rd-seats-left', `${ride.seats} available`);
  setText('rd-datetime', `${formatDate(ride.date)} • ${ride.time}`);
  setText('rd-from', ride.from);
  setText('rd-from-note', 'Pickup Point');
  setText('rd-to', ride.to);
  setText('rd-to-note', 'Drop-off Point');
  setText('rd-driver-name', ride.driverName || 'Driver');
  setText('rd-driver-rating', ride.driverRating || '4.9');
  setText('rd-driver-tag', 'Verified Amrita Student');

  const dAvatar = document.getElementById('rd-driver-avatar');
  if (dAvatar) {
    dAvatar.textContent = (ride.driverName || 'D').charAt(0).toUpperCase();
    dAvatar.style.background = stringToColor(ride.driverName || 'D');
  }

  // Fare breakdown
  const joinedCount = (ride.joinedBy || []).length;
  const totalPeople = joinedCount + 1;
  const perPerson = Math.ceil(ride.fare / totalPeople);
  setText('fb-base', `₹${ride.fare}`);
  setText('fb-split-count', `${totalPeople} person${totalPeople > 1 ? 's' : ''}`);
  setText('fb-total', `₹${perPerson}`);

  // Confirmed students (joined users)
  const confirmedEl = document.getElementById('confirmed-students-list');
  if (confirmedEl) {
    const users = LS.getUsers();
    const confirmed = (ride.joinedBy || []).map(uid => users.find(u => u.id === uid)).filter(Boolean);
    if (confirmed.length === 0) {
      confirmedEl.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem">No confirmed students yet.</p>`;
    } else {
      confirmedEl.innerHTML = confirmed.map(u => `
        <div class="confirmed-student-item">
          <div class="avatar-sm" style="background:${stringToColor(u.name)}">${u.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="cs-name">${u.name}</div>
            <div class="cs-dept">${u.email.split('@')[0]}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // Join button state
  const joinBtn = document.getElementById('join-ride-btn');
  if (joinBtn) {
    const alreadyJoined = (ride.joinedBy || []).includes(currentUser.id);
    const isOwn = ride.postedBy === currentUser.id;
    if (isOwn) {
      joinBtn.textContent = 'Your Ride';
      joinBtn.disabled = true;
      joinBtn.classList.add('btn-ghost');
      joinBtn.classList.remove('btn-primary');
    } else if (alreadyJoined) {
      joinBtn.innerHTML = '✓ Already Joined';
      joinBtn.disabled = true;
    } else if (ride.seats <= 0) {
      joinBtn.textContent = 'No Seats Left';
      joinBtn.disabled = true;
    } else {
      joinBtn.innerHTML = 'Join Ride <i data-lucide="arrow-right"></i>';
      joinBtn.disabled = false;
      joinBtn.classList.remove('btn-ghost');
      joinBtn.classList.add('btn-primary');
    }
  }

  showPage('page-ride-detail');
}

// ─────────────────────────────────────────
// JOIN RIDE
// ─────────────────────────────────────────
function joinCurrentRide() {
  if (!currentUser) { requireAuth('page-dashboard'); return; }
  if (!currentRideId) return;

  const rides = LS.getRides();
  const rideIdx = rides.findIndex(r => r.id === currentRideId);
  if (rideIdx === -1) { showToast('Ride not found.', 'error'); return; }

  const ride = rides[rideIdx];

  if (ride.postedBy === currentUser.id) { showToast("You can't join your own ride.", 'warning'); return; }
  if ((ride.joinedBy || []).includes(currentUser.id)) { showToast('You have already joined this ride!', 'info'); return; }
  if (ride.seats <= 0) { showToast('No seats available.', 'error'); return; }

  // Update ride
  ride.joinedBy = ride.joinedBy || [];
  ride.joinedBy.push(currentUser.id);
  ride.seats -= 1;
  rides[rideIdx] = ride;
  LS.saveRides(rides);

  // Update user record
  const users = LS.getUsers();
  const uIdx = users.findIndex(u => u.id === currentUser.id);
  if (uIdx !== -1) {
    users[uIdx].ridesJoined = users[uIdx].ridesJoined || [];
    users[uIdx].ridesJoined.push(ride.id);
    LS.saveUsers(users);
    currentUser = users[uIdx];
    LS.saveCurrentUser(currentUser);
  }

  // Recalculate split fare
  const totalPeople = ride.joinedBy.length + 1;
  const perPerson = Math.ceil(ride.fare / totalPeople);

  showModal(
    '🎉',
    'You\'re In!',
    `You've successfully joined the ride from ${ride.from} to ${ride.to}. Your split fare is ₹${perPerson}. Contact the driver at ${ride.contact}.`,
    'Awesome!',
    () => { showPage('page-myrides'); renderMyRides(); }
  );
}

// ─────────────────────────────────────────
// POST A RIDE
// ─────────────────────────────────────────
function handlePostRide(e) {
  e.preventDefault();
  if (!currentUser) { requireAuth('page-dashboard'); return; }

  const from    = document.getElementById('pr-from').value.trim();
  const to      = document.getElementById('pr-to').value.trim();
  const date    = document.getElementById('pr-date').value;
  const time    = document.getElementById('pr-time').value;
  const seats   = parseInt(document.getElementById('pr-seats').value, 10);
  const vehicle = document.getElementById('pr-vehicle').value;
  const fare    = parseFloat(document.getElementById('pr-fare').value);
  const contact = document.getElementById('pr-contact').value.trim();

  if (!from || !to || !date || !time || !seats || !vehicle || isNaN(fare) || !contact) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  if (!/^\d{10}$/.test(contact)) { showToast('Contact must be a 10-digit number.', 'error'); return; }
  if (date < new Date().toISOString().split('T')[0]) { showToast('Date cannot be in the past.', 'error'); return; }

  const newRide = {
    id: generateId(),
    postedBy: currentUser.id,
    driverName: currentUser.name,
    driverRating: '4.9',
    from, to, date, time, seats, vehicle, fare, contact,
    joinedBy: [],
    createdAt: new Date().toISOString()
  };

  const rides = LS.getRides();
  rides.unshift(newRide);
  LS.saveRides(rides);

  // Update user record
  const users = LS.getUsers();
  const uIdx = users.findIndex(u => u.id === currentUser.id);
  if (uIdx !== -1) {
    users[uIdx].ridesPosted = users[uIdx].ridesPosted || [];
    users[uIdx].ridesPosted.push(newRide.id);
    LS.saveUsers(users);
    currentUser = users[uIdx];
    LS.saveCurrentUser(currentUser);
  }

  document.getElementById('post-ride-form').reset();
  document.getElementById('fp-total').textContent = '₹0';
  document.getElementById('fp-seats').textContent = '0';
  document.getElementById('fp-per').textContent = '₹0';

  showModal('✅', 'Ride Posted!',
    `Your ride from ${from} to ${to} on ${formatDate(date)} at ${time} has been posted. Students will be able to find and join your ride.`,
    'View My Rides', () => { showPage('page-myrides'); renderMyRides(); }
  );
}

// Live fare preview
function updateFarePreview() {
  const fare  = parseFloat(document.getElementById('pr-fare')?.value || '0');
  const seats = parseInt(document.getElementById('pr-seats')?.value || '0', 10);
  if (isNaN(fare) || isNaN(seats) || seats <= 0) return;

  const per = Math.ceil(fare / seats);
  setText('fp-total', `₹${fare}`);
  setText('fp-seats', seats);
  setText('fp-per', `₹${per}`);
}

// Also trigger on seat change
document.addEventListener('change', (e) => {
  if (e.target.id === 'pr-seats') updateFarePreview();
});

// ─────────────────────────────────────────
// MY RIDES
// ─────────────────────────────────────────
function renderMyRides() {
  if (!currentUser) return;

  // Always reset to 'posted' tab — tab state persists in DOM across account switches
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const tabPostedBtn = document.getElementById('tab-posted');
  const tabPostedContent = document.getElementById('myrides-posted');
  if (tabPostedBtn) tabPostedBtn.classList.add('active');
  if (tabPostedContent) tabPostedContent.classList.add('active');

  const rides = LS.getRides();

  const posted = rides.filter(r => r.postedBy === currentUser.id);
  const joined = rides.filter(r => (r.joinedBy || []).includes(currentUser.id));

  // Posted
  const postedEl = document.getElementById('posted-rides-list');
  if (postedEl) {
    if (posted.length === 0) {
      postedEl.innerHTML = `<div class="empty-state">
        <i data-lucide="send"></i>
        <h3>No rides posted yet</h3>
        <p>Post your first ride and help fellow students!</p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="showPage('page-post')">Post a Ride</button>
      </div>`;
    } else {
      postedEl.innerHTML = posted.map(r => renderMyRideCard(r, 'posted')).join('');
    }
  }

  // Joined
  const joinedEl = document.getElementById('joined-rides-list');
  if (joinedEl) {
    if (joined.length === 0) {
      joinedEl.innerHTML = `<div class="empty-state">
        <i data-lucide="users"></i>
        <h3>No rides joined yet</h3>
        <p>Find a ride and join your first trip!</p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="showPage('page-find')">Find a Ride</button>
      </div>`;
    } else {
      joinedEl.innerHTML = joined.map(r => renderMyRideCard(r, 'joined')).join('');
    }
  }

  lucide.createIcons();
}

function renderMyRideCard(r, type) {
  const splitFare = calcSplitFare(r.fare, Math.max(1, (r.joinedBy?.length || 0) + 1));
  const statusClass = r.seats === 0 ? 'full' : (type === 'joined' ? 'joined' : 'active');
  const statusLabel = r.seats === 0 ? 'Full' : (type === 'joined' ? 'Joined' : 'Active');

  return `
    <div class="my-ride-card" onclick="openRideDetail('${r.id}')">
      <div class="mrc-route">
        <div class="mrc-route-title">
          <i data-lucide="map-pin"></i>
          ${r.from} → ${r.to}
        </div>
        <div class="mrc-meta">${r.vehicle} · Posted by ${type === 'posted' ? 'You' : r.driverName}</div>
      </div>
      <div class="mrc-info">
        <div class="mrc-info-row"><i data-lucide="calendar"></i>${formatDate(r.date)}</div>
        <div class="mrc-info-row"><i data-lucide="clock"></i>${r.time}</div>
        <div class="mrc-info-row"><i data-lucide="users"></i>${r.seats} seat(s) left</div>
        <div class="mrc-info-row fare"><i data-lucide="indian-rupee"></i>₹${splitFare}/person</div>
      </div>
      <div class="mrc-actions">
        <span class="status-badge ${statusClass}">${statusLabel}</span>
        ${type === 'posted' ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteRide('${r.id}')">Delete</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openRideDetail('${r.id}')">View</button>
      </div>
    </div>
  `;
}

function deleteRide(rideId) {
  showModal('🗑️', 'Delete Ride', 'Are you sure you want to delete this ride? This cannot be undone.',
    'Delete', () => {
      const rides = LS.getRides().filter(r => r.id !== rideId);
      LS.saveRides(rides);
      showToast('Ride deleted.', 'success');
      renderMyRides();
    }, true, 'Cancel'
  );
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`myrides-${tabName}`).classList.add('active');
}

// ─────────────────────────────────────────
// LANDING PREVIEW RIDES
// ─────────────────────────────────────────
function populateLandingPreview() {
  const container = document.getElementById('landing-rides-preview');
  if (!container) return;

  const rides = LS.getRides().slice(0, 4);
  if (rides.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px">No rides available yet.</p>`;
    return;
  }

  container.innerHTML = rides.map(r => `
    <div class="landing-ride-preview-card" onclick="showPage('page-signup')">
      <div class="lrpc-map">🗺️</div>
      <div class="lrpc-info">
        <div class="lrpc-driver">${r.driverName}</div>
        <div class="lrpc-route">${r.from} → ${r.to}</div>
        <div class="lrpc-time">🕐 ${r.time} · ${formatDate(r.date)}</div>
        <div class="lrpc-seats">${r.seats} seat(s) available</div>
        <button class="lrpc-book-btn" onclick="event.stopPropagation(); showPage('page-signup')">Book Seat</button>
      </div>
      <div class="lrpc-fare">₹${calcSplitFare(r.fare, r.seats)}</div>
    </div>
  `).join('');

  lucide.createIcons();
}

function renderPublicRides() {
  const container = document.getElementById('pub-rides-list');
  if (!container) return;
  const rides = LS.getRides().slice(0, 3);
  container.innerHTML = rides.map(r => renderRideCard(r, false)).join('');
  lucide.createIcons();
}

// ─────────────────────────────────────────
// HERO SEARCH
// ─────────────────────────────────────────
function heroSearch() {
  const from = document.getElementById('hero-from')?.value || '';
  const to   = document.getElementById('hero-to')?.value   || '';
  if (currentUser) {
    const findFromEl = document.getElementById('find-from');
    const findToEl   = document.getElementById('find-to');
    if (findFromEl) findFromEl.value = from;
    if (findToEl)   findToEl.value   = to;
    showPage('page-find');
    searchRides();
  } else {
    showPage('page-signup');
    showToast('Sign up to search and book rides!', 'info');
  }
}

function navSearch() {
  const query = document.getElementById('nav-search')?.value.toLowerCase() || '';
  if (!query) return;
  const findFromEl = document.getElementById('find-from');
  if (findFromEl) findFromEl.value = query;
  showPage('page-find');
  searchRides();
}

// ─────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────
function updateFareLabel(val) {
  const el = document.getElementById('fare-label-val');
  if (el) el.textContent = val;
  searchRides();
}

// ─────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────
function populateSettings() {
  if (!currentUser) return;
  const nameEl  = document.getElementById('settings-name');
  const phoneEl = document.getElementById('settings-phone');
  const emailEl = document.getElementById('settings-email');
  if (nameEl)  nameEl.value  = currentUser.name;
  if (phoneEl) phoneEl.value = currentUser.phone;
  if (emailEl) emailEl.value = currentUser.email;
}

function saveSettings() {
  const name  = document.getElementById('settings-name')?.value.trim();
  const phone = document.getElementById('settings-phone')?.value.trim();

  if (!name) { showToast('Name cannot be empty.', 'error'); return; }
  if (!/^\d{10}$/.test(phone)) { showToast('Enter a valid 10-digit phone number.', 'error'); return; }

  const users = LS.getUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx !== -1) {
    users[idx].name  = name;
    users[idx].phone = phone;
    LS.saveUsers(users);
    currentUser = users[idx];
    LS.saveCurrentUser(currentUser);
    updateUserAvatars();
    showToast('Settings saved successfully!', 'success');
  }
}

// ─────────────────────────────────────────
// FORM HELPERS
// ─────────────────────────────────────────
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.input-wrap input').forEach(el => el.style.borderColor = '');
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function calcSplitFare(totalFare, seats) {
  if (!seats || seats <= 0) return totalFare;
  return Math.ceil(totalFare / seats);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr, timeStr) {
  const d = formatDate(dateStr);
  return `${d}, ${timeStr}`;
}

function stringToColor(str) {
  const palette = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6','#f97316'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
