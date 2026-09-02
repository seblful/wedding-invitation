/**
 * Guest RSVP form.
 *
 * Posts straight to Formspree — the same endpoint in development and in
 * production, so there is no untested path between the two.
 */

const SUBMITTING_LABEL = 'Адпраўка...';

/** Formspree only answers with JSON when asked; without this it 302s to HTML. */
const FORMSPREE_HEADERS = Object.freeze({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

/**
 * @param {HTMLFormElement} form
 * @param {string} fieldId
 * @returns {HTMLElement | null}
 */
function errorElementFor(form, fieldId) {
  return form.querySelector(`.form-error[data-for="${fieldId}"]`);
}

/**
 * @param {HTMLFormElement} form
 * @param {string} fieldId
 * @param {boolean} invalid
 */
function setFieldError(form, fieldId, invalid) {
  const field = form.querySelector(`#${fieldId}`);
  const error = errorElementFor(form, fieldId);

  error?.classList.toggle('active', invalid);
  if (field instanceof HTMLElement) {
    if (invalid) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
  }
}

/** @param {HTMLFormElement} form */
function clearAllErrors(form) {
  for (const error of form.querySelectorAll('.form-error')) {
    error.classList.remove('active');
  }
  for (const field of form.querySelectorAll('[aria-invalid]')) {
    field.removeAttribute('aria-invalid');
  }
}

/**
 * @param {HTMLFormElement} form
 * @returns {{ values: Record<string, string>, invalidFieldIds: string[] }}
 */
function readAndValidate(form) {
  /** @param {string} id */
  const value = (id) =>
    /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
      form.querySelector(`#${id}`)
    )?.value.trim() ?? '';

  const guestName = value('guestName');
  const attendance = value('attendance');
  const partnerName = value('partnerName');
  const secondDayAttendance = value('attendanceSecondDay');

  const alcoholPreference = Array.from(
    form.querySelectorAll('input[name="alcohol_preference"]:checked')
  )
    .map((input) => /** @type {HTMLInputElement} */ (input).value)
    .join(', ');

  const invalidFieldIds = [];
  if (!guestName) invalidFieldIds.push('guestName');
  if (!attendance) invalidFieldIds.push('attendance');
  if (!secondDayAttendance) invalidFieldIds.push('attendanceSecondDay');
  if (attendance === 'yes_with_partner' && !partnerName) {
    invalidFieldIds.push('partnerName');
  }

  return {
    values: {
      guest_name: guestName,
      attendance,
      partner_name: partnerName,
      alcohol_preference: alcoholPreference,
      second_day_attendance: secondDayAttendance,
    },
    invalidFieldIds,
  };
}

/**
 * @param {string} endpoint
 * @param {Record<string, string>} payload
 * @returns {Promise<boolean>} whether Formspree accepted the submission
 */
async function submitToFormspree(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: FORMSPREE_HEADERS,
    body: JSON.stringify(payload),
  });

  if (response.ok) return true;

  // Surface the reason in the console; guests get the generic message.
  const detail = await response.text().catch(() => '');
  console.error(`Formspree rejected the RSVP (${response.status}):`, detail);
  return false;
}

/**
 * Wires up validation, the conditional partner field and submission.
 *
 * @param {Document | HTMLElement} [root]
 */
export function initRsvpForm(root = document) {
  const form = root.querySelector('#guestSurveyForm');
  if (!(form instanceof HTMLFormElement)) return;

  const attendanceSelect = form.querySelector('#attendance');
  const partnerGroup = form.querySelector('.partner-name-group');
  const partnerInput = form.querySelector('#partnerName');
  const submitButton = form.querySelector('.form-submit-btn');
  const successMessage = form.querySelector('#formSuccess');
  const errorMessage = form.querySelector('#formError');

  let isSubmitting = false;

  /** @param {boolean} visible */
  const setPartnerVisible = (visible) => {
    partnerGroup?.classList.toggle('partner-group-hidden', !visible);
    if (partnerInput instanceof HTMLInputElement) {
      partnerInput.required = visible;
      if (visible) partnerInput.focus();
      else setFieldError(form, 'partnerName', false);
    }
  };

  /** @param {HTMLElement | null} element @param {boolean} visible */
  const setMessageVisible = (element, visible) => {
    element?.classList.toggle('form-message-hidden', !visible);
  };

  if (attendanceSelect instanceof HTMLSelectElement) {
    attendanceSelect.addEventListener('change', () => {
      setFieldError(form, 'attendance', false);
      setPartnerVisible(attendanceSelect.value === 'yes_with_partner');
    });
  }

  // Clearing on input gives immediate feedback that the field is now fine.
  for (const field of form.querySelectorAll('.form-input, .form-select')) {
    const clear = () => setFieldError(form, field.id, false);
    field.addEventListener('input', clear);
    field.addEventListener('change', clear);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    clearAllErrors(form);
    setMessageVisible(
      /** @type {HTMLElement | null} */ (successMessage),
      false
    );
    setMessageVisible(/** @type {HTMLElement | null} */ (errorMessage), false);

    const { values, invalidFieldIds } = readAndValidate(form);

    if (invalidFieldIds.length > 0) {
      for (const id of invalidFieldIds) setFieldError(form, id, true);
      /** @type {HTMLElement | null} */ (
        form.querySelector(`#${invalidFieldIds[0]}`)
      )?.focus();
      return;
    }

    isSubmitting = true;
    const button = /** @type {HTMLButtonElement | null} */ (submitButton);
    const originalLabel = button?.textContent ?? '';
    if (button) {
      button.disabled = true;
      button.textContent = SUBMITTING_LABEL;
    }

    try {
      const accepted = await submitToFormspree(form.action, values);
      setMessageVisible(
        /** @type {HTMLElement | null} */ (
          accepted ? successMessage : errorMessage
        ),
        true
      );
      if (accepted) {
        form.reset();
        setPartnerVisible(false);
      }
    } catch (error) {
      console.error('RSVP submission failed:', error);
      setMessageVisible(/** @type {HTMLElement | null} */ (errorMessage), true);
    } finally {
      isSubmitting = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  });
}
