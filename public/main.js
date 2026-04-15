async function postForm(form, url) {
  const result = document.getElementById('result');
  result.className = 'result';
  result.textContent = '';

  try {
    const isMultipart = form.enctype === 'multipart/form-data';
    const body = isMultipart ? new FormData(form) : JSON.stringify(Object.fromEntries(new FormData(form).entries()));
    const response = await fetch(url, {
      method: 'POST',
      headers: isMultipart ? undefined : { 'Content-Type': 'application/json' },
      body
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Submission failed.');
    result.className = 'result success';
    if (data.submission) {
      result.textContent = `Abstract received. Submission #${data.submission.id}. Word count: ${data.submission.totalWordCount}.`;
    } else {
      result.textContent = `Registration received. Reference #${data.registration.id}.`;
    }
    form.reset();
  } catch (err) {
    result.className = 'result error';
    result.textContent = err.message;
  }
}

const registerForm = document.getElementById('registerForm');
if (registerForm) registerForm.addEventListener('submit', (e) => { e.preventDefault(); postForm(registerForm, '/api/register'); });

const abstractForm = document.getElementById('abstractForm');
if (abstractForm) abstractForm.addEventListener('submit', (e) => { e.preventDefault(); postForm(abstractForm, '/api/submit-abstract'); });
