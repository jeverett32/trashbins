// Firebase configuration and main application logic
const firebaseConfig = {
    apiKey: "AIzaSyBsHCie58L2nYYKtts6In5DS2F1a3_aDPM",
    authDomain: "trash-bins.firebaseapp.com",
    projectId: "trash-bins",
    storageBucket: "trash-bins.appspot.com",
    messagingSenderId: "981537041970",
    appId: "1:981537041970:web:83f0fda02b87e294be562b",
    measurementId: "G-ZWX9BNHB6Y"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, runTransaction, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- App State & Elements ---
let currentDate = new Date();
let selectedDate = null;
let availabilityData = {};

const monthYearEl = document.getElementById('month-year');
const calendarGridEl = document.getElementById('calendar-grid');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const addressEl = document.getElementById('address');
const emailEl = document.getElementById('email');
const phoneEl = document.getElementById('phone');
const binCountEl = document.getElementById('bin-count');
const notesEl = document.getElementById('notes');
const selectionDisplayEl = document.getElementById('selection-display');
const bookNowBtn = document.getElementById('book-now-button');

const paymentBinCountEl = document.getElementById('payment-bin-count');
const paymentPlansContainer = document.getElementById('payment-plans-container');

const messageModal = document.getElementById('message-modal');
const modalMessage = document.getElementById('modal-message');
const modalCloseButton = document.getElementById('modal-close-button');

// --- Business Logic ---
// Weekly availability: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
const weeklyAvailability = { 0: 0, 1: 10, 2: 10, 3: 10, 4: 10, 5: 8, 6: 0 };

// **IMPORTANT**: Replace placeholder URLs with your actual Square Payment Links.
const paymentPricing = {
    onetime: { 
        '1': 'https://square.link/u/ze8UHLTl', // Replace
        '2': 'https://square.link/u/GZ2l7BeB', // Replace
        '3+': 'https://square.link/u/OZPP8msW' // Replace
    },
    semiannually: { 
        '1': 'https://square.link/u/ze8UHLTl', // Replace
        '2': 'https://square.link/u/GZ2l7BeB', // Replace
        '3+': 'https://square.link/u/OZPP8msW' // Replace
    },
    annually: { 
        '1': 'https://square.link/u/ze8UHLTl', // Replace
        '2': 'https://square.link/u/GZ2l7BeB', // Replace
        '3+': 'https://square.link/u/OZPP8msW' // Replace
    }
};

const planDetails = {
    onetime: { name: 'One-Time Clean', prices: { '1': '$50', '2': '$60', '3+': '$70' } },
    semiannually: { name: 'Semi-Annually (2 cleans/yr)', prices: { '1': '$75', '2': '$90', '3+': '$110' } },
    annually: { name: 'Annually (1 clean/yr)', prices: { '1': '$45', '2': '$55', '3+': '$65' } }
};

// --- Calendar & Booking Functions ---
function renderCalendar() {
    console.log('Rendering calendar...');

    if (!calendarGridEl) {
        console.error('Calendar grid element not found!');
        return;
    }

    // Clear only the calendar days, keep the headers
    const existingDays = calendarGridEl.querySelectorAll('.calendar-day, div:not([class])');
    existingDays.forEach(day => day.remove());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (monthYearEl) {
        monthYearEl.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
    }

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`Rendering ${daysInMonth} days for ${month + 1}/${year}`);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        calendarGridEl.appendChild(emptyDay);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day); 
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayEl = document.createElement('div'); 
        const dayOfWeek = dayDate.getDay();
        const totalSlotsForDay = weeklyAvailability[dayOfWeek]; 
        const { booked_slots = 0 } = availabilityData[dateStr] || {};
        const availableSlots = totalSlotsForDay - booked_slots;
        let slotsText = '';
        
        if (dayDate >= today && dayOfWeek !== 0) {
            slotsText = availableSlots > 0 ? `${availableSlots} spots` : 'Full';
        }
        
        dayEl.innerHTML = `<div class="font-semibold">${day}</div><div class="slots-available">${slotsText}</div>`;
        dayEl.dataset.date = dateStr; 
        dayEl.className = 'calendar-day';
        
        if (dayDate < today || dayOfWeek === 0 || dayOfWeek === 6) {
            dayEl.classList.add('disabled');
        } else if (totalSlotsForDay === 0 || availableSlots <= 0) {
            dayEl.classList.add('full');
        } else {
            dayEl.addEventListener('click', () => handleDateClick(dayDate, dayEl));
        }
        
        if (selectedDate && dateStr === selectedDate.toISOString().split('T')[0]) { 
            dayEl.classList.add('selected'); 
        }
        
        calendarGridEl.appendChild(dayEl);
        console.log(`Added day ${day} to calendar`);
    }

    console.log('Calendar rendering complete');
    listenForAvailability();
}

function handleDateClick(date, element) {
    document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    selectedDate = date; 
    element.classList.add('selected');
    selectionDisplayEl.innerHTML = `
        <div class="text-center">
            <div class="text-2xl mb-2">📅</div>
            <div class="font-bold text-blue-600">Selected Date:</div>
            <div class="text-lg text-gray-900">${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
    `;
    selectionDisplayEl.className = 'p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200';
    validateBookingForm();
}

function validateBookingForm() {
    const isValid = addressEl.value.trim() !== '' && 
                   emailEl.value.trim() !== '' && 
                   phoneEl.value.trim() !== '' && 
                   binCountEl.value && 
                   selectedDate !== null;
    bookNowBtn.disabled = !isValid;
    return isValid;
}

async function handleBooking() {
    if (!validateBookingForm()) { 
        showModal("Please fill out all fields and select a date."); 
        return; 
    }
    
    bookNowBtn.disabled = true; 
    bookNowBtn.textContent = 'Booking...';
    
    const bookingData = {
        address: addressEl.value, 
        email: emailEl.value, 
        phone: phoneEl.value,
        binCount: binCountEl.value, 
        notes: notesEl.value,
        selectedDate: selectedDate.toISOString().split('T')[0],
        status: 'booked', 
        createdAt: new Date()
    };
    
    try {
        const dayRef = doc(db, "availability", bookingData.selectedDate);
        await runTransaction(db, async (transaction) => {
            const dayDoc = await transaction.get(dayRef);
            if (!dayDoc.exists()) throw "Date not available.";
            const data = dayDoc.data();
            if (data.booked_slots >= data.total_slots) throw "Day is now full.";
            transaction.update(dayRef, { booked_slots: data.booked_slots + 1 });
        });
        
        await addDoc(collection(db, "bookings"), bookingData);
        await submitToFormspree(bookingData);
        showModal(`Success! Your cleaning is booked for ${selectedDate.toLocaleDateString()}. You will receive an email confirmation shortly.`);
        resetBookingForm();
    } catch (error) {
        console.error("Booking failed: ", error);
        showModal(typeof error === 'string' ? error : "There was an error. Please try again.");
    } finally {
        bookNowBtn.disabled = false; 
        bookNowBtn.textContent = 'Book Now';
    }
}

function resetBookingForm() {
    addressEl.value = ''; 
    emailEl.value = ''; 
    phoneEl.value = '';
    binCountEl.value = '1'; 
    notesEl.value = '';
    selectedDate = null;
    document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    selectionDisplayEl.textContent = '📅 Please select a day from the calendar above';
    selectionDisplayEl.className = 'p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg text-gray-600 text-center border-2 border-dashed border-blue-200';
    validateBookingForm();
}

async function submitToFormspree(data) {
    const form = document.getElementById('formspree-form');
    document.getElementById('formspree-email').value = data.email; 
    document.getElementById('formspree-address').value = data.address;
    document.getElementById('formspree-phone').value = data.phone; 
    document.getElementById('formspree-binCount').value = data.binCount;
    document.getElementById('formspree-selectedDate').value = new Date(data.selectedDate+'T00:00:00').toLocaleDateString();
    document.getElementById('formspree-notes').value = data.notes; 
    document.getElementById('formspree-replyto').value = data.email;
    document.getElementById('formspree-cc').value = data.email;
    
    try {
        const response = await fetch(form.action, { 
            method: 'POST', 
            body: new FormData(form), 
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) { 
            throw new Error('Form submission failed'); 
        }
    } catch (error) {
        console.error('Could not submit to Formspree', error);
    }
}

// --- Payment Section Functions ---
function renderPaymentPlans() {
    const binCount = paymentBinCountEl.value;
    paymentPlansContainer.innerHTML = '';

    Object.keys(planDetails).forEach(planKey => {
        const plan = planDetails[planKey];
        if (!paymentPricing[planKey]) {
            console.error(`Pricing details not found for plan: ${planKey}`);
            return;
        }

        const squareUrl = paymentPricing[planKey][binCount];
        const price = plan.prices[binCount];
        const card = document.createElement('div');
        card.className = 'plan-card p-8 text-center';
        card.innerHTML = `
            <div class="service-icon mb-6">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
            </div>
            <h3 class="text-2xl font-bold mb-4 text-gray-900">${plan.name}</h3>
            <p class="text-4xl font-bold text-blue-600 mb-6">${price}</p>
            <button data-url="${squareUrl}" class="pay-button btn-success w-full text-lg font-semibold">
                💳 Pay Securely
            </button>
        `;
        paymentPlansContainer.appendChild(card);
    });

    // Add event listeners to the new buttons
    document.querySelectorAll('.pay-button').forEach(button => {
        button.addEventListener('click', window.showCheckoutWindow);
    });
}

// --- Utility & Firebase Listener Functions ---
function listenForAvailability() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        initializeDayInDB(dateStr);
        const dayRef = doc(db, "availability", dateStr);
        onSnapshot(dayRef, (doc) => {
            if (doc.exists()) {
                availabilityData[dateStr] = doc.data();
                updateDayUI(dateStr);
            }
        });
    }
}

async function initializeDayInDB(dateStr) {
    const dayRef = doc(db, "availability", dateStr);
    const daySnap = await getDoc(dayRef);

    if (!daySnap.exists()) {
        const dayOfWeek = new Date(dateStr).getUTCDay();
        const total_slots = weeklyAvailability[dayOfWeek];
        await setDoc(dayRef, { booked_slots: 0, total_slots });
    }
}

function updateDayUI(dateStr) {
    const dayEl = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
    if (!dayEl || dayEl.classList.contains('disabled')) return;

    const { booked_slots = 0, total_slots = 0 } = availabilityData[dateStr] || {};
    const availableSlots = total_slots - booked_slots;
    const slotsEl = dayEl.querySelector('.slots-available');

    if(slotsEl) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const dayDate = new Date(dateStr + 'T00:00:00');

        if (dayDate >= today && dayDate.getDay() !== 0) {
            slotsEl.textContent = availableSlots > 0 ? `${availableSlots} left` : 'Full';
        } else {
            slotsEl.textContent = '';
        }
    }

    if ((total_slots > 0 && availableSlots <= 0) || (total_slots === 0 && new Date(dateStr+'T00:00:00') >= today)) {
        dayEl.classList.add('full');
    } else {
        dayEl.classList.remove('full');
    }
}

function showModal(message) {
    modalMessage.textContent = message;
    messageModal.classList.remove('hidden');
}

function hideModal() {
    messageModal.classList.add('hidden');
}

// --- Event Listeners ---
[addressEl, emailEl, phoneEl, binCountEl].forEach(el => el.addEventListener('input', validateBookingForm));
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});
bookNowBtn.addEventListener('click', handleBooking);
paymentBinCountEl.addEventListener('change', renderPaymentPlans);
modalCloseButton.addEventListener('click', hideModal);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing calendar...');
    renderCalendar();
    validateBookingForm();
    renderPaymentPlans();
});
