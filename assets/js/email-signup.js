document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('weekly-email-form');
  if (!form) return;

  const statusEl = document.getElementById('form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const endpoint = form.dataset.endpoint || '';

  const setStatus = (message, type = 'info') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('error', 'success');
    if (type === 'error') {
      statusEl.classList.add('error');
    } else if (type === 'success') {
      statusEl.classList.add('success');
    }
  };

  const validateSelections = () => {
    const hasRegion = form.querySelectorAll('input[name="regions"]:checked').length > 0;
    const hasDiscipline = form.querySelectorAll('input[name="disciplines"]:checked').length > 0;
    const weekday = form.querySelector('#weekday').value;
    const consent = form.querySelector('#consent').checked;

    if (!hasRegion) {
      setStatus('Please pick at least one region.', 'error');
      return false;
    }

    if (!hasDiscipline) {
      setStatus('Please choose at least one discipline.', 'error');
      return false;
    }

    if (!weekday) {
      setStatus('Choose the weekday you’d like your email.', 'error');
      return false;
    }

    if (!consent) {
      setStatus('You need to agree before we can send the digest.', 'error');
      return false;
    }

    return true;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    if (!validateSelections()) {
      return;
    }

    if (!endpoint || endpoint.includes('REPLACE_WITH_WEB_APP_ID')) {
      setStatus('Signup endpoint is not configured yet. Please contact hello@letsrace.cc.', 'error');
      return;
    }

    const formData = new FormData(form);
    const payload = {
      email: (formData.get('email') || '').trim(),
      regions: formData.getAll('regions'),
      disciplines: formData.getAll('disciplines'),
      weekday: (formData.get('weekday') || '').toLowerCase(),
      consent: formData.get('consent') === 'on',
      site_referrer: window.location.href,
      user_agent: navigator.userAgent
    };

    if (!payload.email) {
      setStatus('Please add your email address.', 'error');
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
      setStatus('Sending…');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Something went wrong. Please try again later.');
      }

      form.reset();
      setStatus(result.message || 'Thanks! Please check your inbox to confirm your email.', 'success');
    } catch (error) {
      console.error('Signup failed', error);
      setStatus(error.message || 'Something went wrong. Please try again later.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send me my weekly digest';
    }
  });
});

