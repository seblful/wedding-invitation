let weddingDate;
let countdownInterval;
let configData;
const CONFIG_API_ENDPOINT = '/api/config';
const SUBMIT_FORM_ENDPOINT = '/api/submit-form';

async function fetchConfig() {
  try {
    const response = await fetch(CONFIG_API_ENDPOINT);
    const data = await response.json();
    configData = data;
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
  const hours = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  document.getElementById('days').textContent = String(days).padStart(2, '0');
  document.getElementById('hours').textContent = String(hours).padStart(2, '0');
  document.getElementById('minutes').textContent = String(minutes).padStart(
    2,
    '0'
  );
  document.getElementById('seconds').textContent = String(seconds).padStart(
    2,
    '0'
  );
}

async function initCountdown() {
  const configLoaded = await fetchConfig();
  if (configLoaded) {
    loadMap();
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }
}

function cleanupCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
}

function loadMap() {
  const mapContainer = document.getElementById('mapContainer');
  if (mapContainer && configData?.location?.yandexMapUrl) {
    const width = configData.location.mapDimensions?.width || 580;
    const height = configData.location.mapDimensions?.height || 346;
    mapContainer.innerHTML = `
      <iframe
        src="${configData.location.yandexMapUrl}"
        width="${width}"
        height="${height}"
        frameborder="0"
        allowfullscreen="true"
        style="position: relative"
      ></iframe>
    `;
  }
}

function initGuestSurvey() {
  const form = document.getElementById('guestSurveyForm');
  const attendanceSelect = document.getElementById('attendance');
  const partnerNameGroup = document.querySelector('.partner-name-group');
  const formSuccess = document.getElementById('formSuccess');
  const formError = document.getElementById('formError');

  if (attendanceSelect) {
    attendanceSelect.addEventListener('change', function () {
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
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const guestName = form.querySelector('#guestName').value.trim();
      const attendance = form.querySelector('#attendance').value;
      const partnerName = form.querySelector('#partnerName').value.trim();

      if (!guestName) {
        alert('Калі ласка, увядзіце імя і прозвішча');
        return;
      }

      if (!attendance) {
        alert('Калі ласка, выберыце, ці плануеце вы прысутнічаць');
        return;
      }

      if (attendance === 'yes_with_partner' && !partnerName) {
        alert('Калі ласка, увядзіце імя і прозвішча вашай пары');
        return;
      }

      if (formError) formError.classList.add('form-message-hidden');

      const checkboxes = form.querySelectorAll(
        'input[name="alcohol_preference"]:checked'
      );
      const selectedAlcohol = Array.from(checkboxes)
        .map((cb) => cb.value)
        .join(', ');

      try {
        const response = await fetch(SUBMIT_FORM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guest_name: guestName,
            attendance: attendance,
            partner_name: partnerName,
            alcohol_preference: selectedAlcohol,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (formSuccess) formSuccess.classList.remove('form-message-hidden');
          if (formError) formError.classList.add('form-message-hidden');
          form.reset();
          if (partnerNameGroup)
            partnerNameGroup.classList.add('partner-group-hidden');
        } else {
          throw new Error('Form submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        if (formSuccess) formSuccess.classList.add('form-message-hidden');
        if (formError) formError.classList.remove('form-message-hidden');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initGuestSurvey);

document.addEventListener('DOMContentLoaded', initCountdown);
document.addEventListener('DOMContentLoaded', initScrollAnimations);
document.addEventListener('DOMContentLoaded', createFallingPetals);
window.addEventListener('beforeunload', cleanupCountdown);

function initScrollAnimations() {
  const facesContainer = document.querySelector('.faces-container');
  const namesBoard = document.querySelector('.names-board');
  
  [facesContainer, namesBoard].forEach(el => {
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
    }
  });
  
  setTimeout(() => {
    [facesContainer, namesBoard].forEach(el => {
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    });
  }, 300);
}


function createFallingPetals() {
  const petalColors = ['#ffb7c5', '#ffc0cb', '#ffd1dc', '#ffe4e1', '#fff0f5'];

  function createPetal() {
    const petal = document.createElement('div');
    petal.classList.add('petal');

    const size = Math.random() * 13 + 12;
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = Math.random() * 6 + 6;
    const rotation = Math.random() * 360;
    const color = petalColors[Math.floor(Math.random() * petalColors.length)];
    const fallDistance = window.innerHeight + 50;

    petal.style.cssText = `
      left: ${left}vw;
      width: ${size}px;
      height: ${size}px;
      animation: fall ${duration}s linear ${delay}s forwards;
      background: ${color};
      border-radius: 100% 0% 100% 0%;
      transform: rotate(${rotation}deg);
      --fall-distance: ${fallDistance}px;
    `;

    document.body.appendChild(petal);

    setTimeout(
      () => {
        petal.remove();
      },
      (duration + delay) * 1000
    );
  }

  setInterval(createPetal, 400);
}
