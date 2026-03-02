function updateCountdown() {
  const timerSection = document.querySelector('.timer-section');
  const weddingDate = new Date(timerSection.dataset.weddingDate).getTime();
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

let countdownInterval;

function initCountdown() {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function cleanupCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
}

document.addEventListener('DOMContentLoaded', initCountdown);
window.addEventListener('beforeunload', cleanupCountdown);
