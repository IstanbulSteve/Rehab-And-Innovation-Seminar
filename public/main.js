console.log('main.js loaded');

async function postForm(form, url) {
  console.log('postForm entered for', url);

  const result = form.querySelector('.result') || document.getElementById('result');

  try {
    if (!result) {
      throw new Error('Result container not found.');
    }

    result.className = 'result';
    result.textContent = '';

    const isMultipart = form.enctype === 'multipart/form-data';
    const body = isMultipart
      ? new FormData(form)
      : JSON.stringify(Object.fromEntries(new FormData(form).entries()));

    const response = await fetch(url, {
      method: 'POST',
      headers: isMultipart ? undefined : { 'Content-Type': 'application/json' },
      body
    });

    console.log('response status', response.status);

    const data = await response.json();
    console.log('response data', data);

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Submission failed.');
    }

    result.className = 'result success';

    if (data.submission) {
      result.textContent = `Abstract received. Submission #${data.submission.id}. Word count: ${data.submission.totalWordCount}.`;
    } else if (data.registration) {
      result.textContent = `Registration received. Reference #${data.registration.id}.`;
    } else {
      result.textContent = 'Submission received.';
    }

    form.reset();
  } catch (err) {
    console.error('postForm error', err);

    if (result) {
      result.className = 'result error';
      result.textContent = err.message || 'Submission failed.';
    } else {
      alert(err.message || 'Submission failed.');
    }
  }
}

const registerForm = document.getElementById('registerForm');
console.log('registerForm found:', !!registerForm);

if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    console.log('register submit fired');
    e.preventDefault();
    postForm(registerForm, '/api/register');
  });
}

const abstractForm = document.getElementById('abstractForm');
console.log('abstractForm found:', !!abstractForm);

if (abstractForm) {
  abstractForm.addEventListener('submit', (e) => {
    console.log('abstract submit fired');
    e.preventDefault();
    postForm(abstractForm, '/api/submit-abstract');
  });
}