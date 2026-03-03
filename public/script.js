let weddingDate;
let countdownInterval;

async function fetchConfig() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    weddingDate = new Date(data.weddingDate).getTime();
    return true;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return false;
  }
}

function updateCountdown() {
  if (!weddingDate) return;
  
  const now = new Date().getTime();
  const timeRemaining = weddingDate - now;

  if (timeRemaining <= 0) {
    document.getElementById('days').textContent = '0';
    document.getElementById('hours').textContent = '0';
    document.getElementById('minutes').textContent = '0';
    document.getElementById('seconds').textContent = '0';
    return;
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = String(days).padStart(2, '0');
  document.getElementById('hours').textContent = String(hours).padStart(2, '0');
  document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

async function initCountdown() {
  const configLoaded = await fetchConfig();
  if (configLoaded) {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }
}

function cleanupCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
}

function initGuestSurvey() {
  const form = document.getElementById('guestSurveyForm');
  const attendanceSelect = document.getElementById('attendance');
  const partnerNameGroup = document.querySelector('.partner-name-group');
  const formSuccess = document.getElementById('formSuccess');
  const formError = document.getElementById('formError');
  const formDeadline = document.getElementById('formDeadline');
  
  if (attendanceSelect) {
    attendanceSelect.addEventListener('change', function() {
      if (this.value === 'yes_with_partner') {
        partnerNameGroup.classList.remove('partner-group-hidden');
        setTimeout(() => {
          const partnerInput = document.getElementById('partnerName');
          if (partnerInput) partnerInput.focus();
        }, 100);
      } else {
        partnerNameGroup.classList.add('partner-group-hidden');
      }
    });
  }
  
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (formError) formError.classList.add('form-message-hidden');
      if (formDeadline) formDeadline.classList.add('form-message-hidden');
      
      const checkboxes = form.querySelectorAll('input[name="alcohol_preference"]:checked');
      const selectedAlcohol = Array.from(checkboxes).map(cb => cb.value).join(', ');
      
      try {
        const response = await fetch('/api/submit-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            guest_name: form.querySelector('#guestName').value,
            attendance: form.querySelector('#attendance').value,
            partner_name: form.querySelector('#partnerName').value || '',
            alcohol_preference: selectedAlcohol
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          if (formSuccess) formSuccess.classList.remove('form-message-hidden');
          if (formError) formError.classList.add('form-message-hidden');
          if (formDeadline) formDeadline.classList.add('form-message-hidden');
          form.reset();
          if (partnerNameGroup) partnerNameGroup.classList.add('partner-group-hidden');
        } else {
          throw new Error('Form submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        if (formSuccess) formSuccess.classList.add('form-message-hidden');
        if (formError) formError.classList.remove('form-message-hidden');
        if (formDeadline) formDeadline.classList.add('form-message-hidden');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initGuestSurvey);

document.addEventListener('DOMContentLoaded', initCountdown);
document.addEventListener('DOMContentLoaded', initGuestSurvey);
window.addEventListener('beforeunload', cleanupCountdown);
