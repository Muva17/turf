/* ===================================================
   JK Turf Booking — Frontend JS
   Backend: MySQL via REST API (see backend.js / schema.sql)
   Payment: UPI deeplink / Paytm / PhonePe
   =================================================== */

// ── CONFIG ──────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api'; // Change to your backend URL
const UPI_ID   = '9788599717@upi';             // Change to your UPI ID
const MERCHANT_NAME = 'JK Turf';

// ── TURF DATA ────────────────────────────────────────
const TURFS = [
  {
    id: 1,
    name: 'Alpha Arena',
    type: '5-a-Side · Synthetic Grass',
    icon: '🏟️',
    price: 800,
    tags: ['Floodlights', 'Parking', 'Changing Room'],
  },
  {
    id: 2,
    name: 'Beta Ground',
    type: '7-a-Side · Natural Turf',
    icon: '⚽',
    price: 1200,
    tags: ['Floodlights', 'Scoreboard', 'Cafeteria'],
  },
  {
    id: 3,
    name: 'Delta Field',
    type: '5-a-Side · Hybrid Turf',
    icon: '🥅',
    price: 900,
    tags: ['AC Lounge', 'Parking', 'WiFi'],
  },
  {
    id: 4,
    name: 'Omega Pitch',
    type: '11-a-Side · Natural Grass',
    icon: '🏆',
    price: 2000,
    tags: ['Stadium Lights', 'Spectator Stand', 'Full Equipment'],
  },
];

// ── TIME SLOTS ───────────────────────────────────────
const TIME_SLOTS = [
  '05:00', '06:00', '07:00', '08:00', '09:00',
  '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00',
];

// ── STATE ────────────────────────────────────────────
let selectedTurf     = TURFS[0];
let selectedDate     = null;
let selectedSlot     = null;
let selectedPayment  = null;
let currentMonth     = new Date();
let bookings         = JSON.parse(localStorage.getItem('gf_bookings') || '[]');
// simulated booked slots: { "turfId_YYYY-MM-DD": ["HH:MM", ...] }
let bookedSlots      = JSON.parse(localStorage.getItem('gf_booked') || '{}');

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTurfs();
  renderCalendar();
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('myBookingsBtn').addEventListener('click', openMyBookings);
});

// ── RENDER TURFS ─────────────────────────────────────
function renderTurfs() {
  const grid = document.getElementById('turfGrid');
  grid.innerHTML = TURFS.map(t => `
    <div class="turf-card ${t.id === selectedTurf.id ? 'selected' : ''}"
         onclick="selectTurf(${t.id})">
      <span class="selected-badge">SELECTED</span>
      <div class="turf-card-icon">${t.icon}</div>
      <div class="turf-name">${t.name}</div>
      <div class="turf-type">${t.type}</div>
      <div class="turf-price">₹${t.price.toLocaleString()} <span>/ hr</span></div>
      <div class="turf-tags">
        ${t.tags.map(tag => `<span class="turf-tag">${tag}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function selectTurf(id) {
  selectedTurf = TURFS.find(t => t.id === id);
  renderTurfs();
  if (selectedDate) renderSlots(selectedDate);
  document.getElementById('slotTurfBadge').textContent = selectedTurf.name.toUpperCase();
  document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
}

// ── CALENDAR ─────────────────────────────────────────
function renderCalendar() {
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const label = currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase();
  document.getElementById('calMonthLabel').textContent = label;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const container = document.getElementById('calDays');
  container.innerHTML = '';

  // Empty cells before 1st
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    container.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    const dateStr = formatDate(date);
    const isPast  = date < today;
    const isToday = date.getTime() === today.getTime();
    const isSelected = selectedDate === dateStr;

    // availability simulation
    const avail = getDayAvailability(dateStr);

    const el = document.createElement('div');
    el.className = 'cal-day';
    if (isPast)       el.classList.add('past');
    else if (avail === 'full') el.classList.add('full');
    else if (avail === 'partial') el.classList.add('partial');
    else              el.classList.add('avail');
    if (isToday)     el.classList.add('today');
    if (isSelected)  el.classList.add('selected-day');

    el.innerHTML = `
      <span>${d}</span>
      <div class="dot-row">
        ${avail !== 'past' && !isPast ? getDots(dateStr) : ''}
      </div>
    `;

    if (!isPast && avail !== 'full') {
      el.addEventListener('click', () => pickDate(dateStr));
    }
    container.appendChild(el);
  }
}

function getDayAvailability(dateStr) {
  const key    = `${selectedTurf.id}_${dateStr}`;
  const booked = bookedSlots[key] || [];
  const ratio  = booked.length / TIME_SLOTS.length;
  if (ratio === 0)   return 'avail';
  if (ratio >= 1)    return 'full';
  if (ratio >= 0.5)  return 'partial';
  return 'avail';
}

function getDots(dateStr) {
  const key    = `${selectedTurf.id}_${dateStr}`;
  const booked = bookedSlots[key] || [];
  const ratio  = booked.length / TIME_SLOTS.length;
  if (ratio === 0)  return '<div class="cal-dot g"></div>';
  if (ratio >= 1)   return '<div class="cal-dot r"></div>';
  return '<div class="cal-dot g"></div><div class="cal-dot y"></div>';
}

function pickDate(dateStr) {
  selectedDate = dateStr;
  selectedSlot = null;
  renderCalendar();
  renderSlots(dateStr);

  const d = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('slotsDateLabel').textContent = label.toUpperCase();
  document.getElementById('slotTurfBadge').textContent  = selectedTurf.name.toUpperCase();
}

// ── SLOTS ────────────────────────────────────────────
function renderSlots(dateStr) {
  const key    = `${selectedTurf.id}_${dateStr}`;
  const booked = bookedSlots[key] || [];
  const grid   = document.getElementById('slotsGrid');
  const today  = new Date();

  grid.innerHTML = TIME_SLOTS.map(time => {
    const [h, m] = time.split(':').map(Number);
    const slotDate = new Date(dateStr + 'T' + time + ':00');
    const isPast   = slotDate <= today;
    const isBooked = booked.includes(time) || isPast;
    const endHr    = h + 1;
    const endTime  = `${String(endHr).padStart(2,'0')}:${m === 0 ? '00' : m}`;
    const status   = isBooked ? 'BOOKED' : 'AVAILABLE';
    const cls      = isBooked ? 'slot-booked' : 'slot-avail';

    return `
      <div class="slot-card ${cls}" ${!isBooked ? `onclick="selectSlot('${time}','${endTime}')"` : ''}>
        <div class="slot-time">${time} – ${endTime}</div>
        <div class="slot-status">${status}</div>
        <div class="slot-price-mini">${isBooked ? '—' : '₹' + selectedTurf.price.toLocaleString()}</div>
      </div>
    `;
  }).join('');
}

function selectSlot(start, end) {
  selectedSlot = { start, end };
  openBookingModal(start, end);
}

// ── BOOKING MODAL ─────────────────────────────────────
function openBookingModal(start, end) {
  const total = selectedTurf.price + 20;
  const d     = new Date(selectedDate + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  document.getElementById('bookingSummary').innerHTML = `
    <div class="sum-item"><label>Turf</label><strong>${selectedTurf.name}</strong></div>
    <div class="sum-item"><label>Type</label><strong>${selectedTurf.type}</strong></div>
    <div class="sum-item"><label>Date</label><strong>${dateLabel}</strong></div>
    <div class="sum-item"><label>Time</label><strong>${start} – ${end}</strong></div>
  `;

  document.getElementById('slotPrice').textContent = '₹' + selectedTurf.price.toLocaleString();
  document.getElementById('totalPrice').textContent = '₹' + total.toLocaleString();
  document.getElementById('bookingModal').classList.add('open');
}

function closeModal() {
  document.getElementById('bookingModal').classList.remove('open');
  selectedPayment = null;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
}

// ── PAYMENT ───────────────────────────────────────────
function initiatePayment(method) {
  selectedPayment = method;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-method="${method}"]`).classList.add('active');

  const total = selectedTurf.price + 20;
  const note  = encodeURIComponent(`JK ${selectedTurf.name} ${selectedDate} ${selectedSlot.start}`);

  // Build deeplinks
  if (method === 'upi') {
    const url = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=${note}`;
    window.location.href = url;
    // Fallback — browsers that can't open UPI on desktop
    setTimeout(() => {
      console.log('UPI deeplink attempted:', url);
    }, 500);
  } else if (method === 'paytm') {
    // Paytm deep link (works on Android/iOS Paytm app)
    const url = `paytmmp://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=${note}`;
    window.location.href = url;
  } else if (method === 'phonepe') {
    // PhonePe deep link
    const url = `phonepe://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=${note}`;
    window.location.href = url;
  }
}

// ── CONFIRM BOOKING ───────────────────────────────────
function confirmBooking() {
  const name  = document.getElementById('userName').value.trim();
  const phone = document.getElementById('userPhone').value.trim();
  const team  = document.getElementById('teamName').value.trim();

  if (!name)  { alert('Please enter your name.'); return; }
  if (!phone) { alert('Please enter your phone number.'); return; }

  // In production: POST to /api/bookings — check below backend.js
  const bookingId = 'GF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const d = new Date(selectedDate + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const booking = {
    id: bookingId,
    turf: selectedTurf.name,
    turfId: selectedTurf.id,
    date: selectedDate,
    dateLabel,
    start: selectedSlot.start,
    end: selectedSlot.end,
    name, phone, team,
    price: selectedTurf.price + 20,
    payment: selectedPayment || 'pending',
    createdAt: new Date().toISOString(),
  };

  // Mark slot as booked
  const key = `${selectedTurf.id}_${selectedDate}`;
  if (!bookedSlots[key]) bookedSlots[key] = [];
  bookedSlots[key].push(selectedSlot.start);
  localStorage.setItem('gf_booked', JSON.stringify(bookedSlots));

  // Save booking
  bookings.unshift(booking);
  localStorage.setItem('gf_bookings', JSON.stringify(bookings));

  // POST to backend (non-blocking)
  postBookingToBackend(booking);

  // Show success
  closeModal();
  document.getElementById('bookingIdDisplay').textContent = bookingId;
  document.getElementById('successModal').classList.add('open');

  // Refresh
  if (selectedDate) renderSlots(selectedDate);
  renderCalendar();
}

async function postBookingToBackend(booking) {
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    if (!res.ok) console.warn('Backend save failed (running offline)');
  } catch (e) {
    console.warn('Backend unavailable — booking saved locally only.');
  }
}

function closeSuccess() {
  document.getElementById('successModal').classList.remove('open');
  document.getElementById('userName').value  = '';
  document.getElementById('userPhone').value = '';
  document.getElementById('teamName').value  = '';
  selectedSlot    = null;
  selectedPayment = null;
}

// ── MY BOOKINGS ────────────────────────────────────────
function openMyBookings() {
  const list = document.getElementById('myBookingsList');
  if (bookings.length === 0) {
    list.innerHTML = '<p class="empty-msg">No bookings yet. Get out there! ⚽</p>';
  } else {
    list.innerHTML = bookings.map(b => `
      <div class="booking-item">
        <div class="booking-item-id">${b.id}</div>
        <div class="booking-item-info">
          <div><span>Turf: </span>${b.turf}</div>
          <div><span>Date: </span>${b.dateLabel}</div>
          <div><span>Time: </span>${b.start} – ${b.end}</div>
          <div><span>Name: </span>${b.name}</div>
          ${b.team ? `<div><span>Team: </span>${b.team}</div>` : ''}
          <div><span>Paid: </span>₹${b.price.toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('myBookingsPanel').classList.add('open');
  document.getElementById('backdrop').classList.add('open');
}

function closeMyBookings() {
  document.getElementById('myBookingsPanel').classList.remove('open');
  document.getElementById('backdrop').classList.remove('open');
}

// ── UTILS ──────────────────────────────────────────────
function formatDate(date) {
  return date.toISOString().split('T')[0];
}
