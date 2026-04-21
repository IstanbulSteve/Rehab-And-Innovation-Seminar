console.log('main.js loaded');

function showResult(form, type, message) {
  const result = form.querySelector('.result') || document.getElementById('result');
  if (!result) {
    alert(message);
    return;
  }
  result.className = `result ${type}`;
  result.textContent = message;
  console.log('result shown:', type, message);
}

async function postForm(form, url) {
  console.log('postForm entered for', url);

  try {
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

    const text = await response.text();
    console.log('raw response text', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error(`Response was not valid JSON: ${text.slice(0, 200)}`);
    }

    console.log('parsed response data', data);

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Submission failed.');
    }

    if (data.submission) {
      showResult(
        form,
        'success',
        `Abstract received. Submission #${data.submission.id}. Word count: ${data.submission.totalWordCount}.`
      );
    } else if (data.registration) {
      showResult(
        form,
        'success',
        `Registration received. Reference #${data.registration.id}.`
      );
    } else {
      showResult(form, 'success', 'Submission received.');
    }

    form.reset();
  } catch (err) {
    console.error('postForm error', err);
    showResult(form, 'error', err.message || 'Submission failed.');
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

  const registerButton = registerForm.querySelector('button[type="submit"]');
  if (registerButton) {
    registerButton.addEventListener('click', () => {
      console.log('register submit button clicked');
    });
  }
}

const abstractForm = document.getElementById('abstractForm');
console.log('abstractForm found:', !!abstractForm);

if (abstractForm) {
  abstractForm.addEventListener('submit', (e) => {
    console.log('abstract submit fired');
    e.preventDefault();
    postForm(abstractForm, '/api/submit-abstract');
  });

  const abstractButton = abstractForm.querySelector('button[type="submit"]');
  if (abstractButton) {
    abstractButton.addEventListener('click', () => {
      console.log('abstract submit button clicked');
    });
  }
}