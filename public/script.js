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

function initMapFallback() {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '';
  
  const iframe = document.querySelector('.yandex-map');
  const fallback = document.getElementById('mapFallback');
  
  if (isLocalhost && iframe && fallback) {
    iframe.style.display = 'none';
    fallback.style.display = 'flex';
  } else if (iframe && fallback) {
    setTimeout(() => {
      if (iframe.style.display === 'none' || iframe.contentDocument === null) {
        fallback.style.display = 'flex';
      }
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', initCountdown);
document.addEventListener('DOMContentLoaded', initMapFallback);
window.addEventListener('beforeunload', cleanupCountdown);
