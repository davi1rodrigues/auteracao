const api = 'api/index.php';
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginMessage = document.querySelector('#login-message');
const registerMessage = document.querySelector('#register-message');

function showForm(mode) {
  const registering = mode === 'register';
  loginForm.hidden = registering;
  registerForm.hidden = !registering;
  document.querySelector('#tab-login').classList.toggle('is-active', !registering);
  document.querySelector('#tab-register').classList.toggle('is-active', registering);
  document.querySelector('#tab-login').setAttribute('aria-selected', String(!registering));
  document.querySelector('#tab-register').setAttribute('aria-selected', String(registering));
  document.querySelector(registering ? '#register-name' : '#login-email').focus();
}
async function send(action, payload) {
  let response;
  try { response = await fetch(`${api}?action=${action}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
  catch { throw new Error('Não foi possível conectar à loja. Abra o site pelo Apache do XAMPP.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
function goToAccount(role) { window.location.href = role === 'admin' ? 'admin.html' : 'conta.html'; }

document.querySelector('#tab-login').addEventListener('click', () => showForm('login'));
document.querySelector('#tab-register').addEventListener('click', () => showForm('register'));
document.querySelectorAll('[data-show]').forEach(button => button.addEventListener('click', () => showForm(button.dataset.show)));
loginForm.addEventListener('submit', async event => {
  event.preventDefault(); loginMessage.textContent = 'Entrando…';
  try {
    const result = await send('login', { email: document.querySelector('#login-email').value, password: document.querySelector('#login-password').value });
    goToAccount(result.role);
  } catch (error) { loginMessage.textContent = error.message; }
});
registerForm.addEventListener('submit', async event => {
  event.preventDefault(); registerMessage.textContent = '';
  const password = document.querySelector('#register-password').value;
  if (password !== document.querySelector('#register-confirm').value) { registerMessage.textContent = 'As senhas não conferem.'; return; }
  registerMessage.textContent = 'Criando sua conta…';
  try {
    await send('register', { name: document.querySelector('#register-name').value, email: document.querySelector('#register-email').value, password });
    window.location.href = 'conta.html';
  } catch (error) { registerMessage.textContent = error.message; }
});

try {
  const response = await fetch(`${api}?action=session`, { credentials: 'same-origin' });
  const session = await response.json();
  if (session.authenticated) goToAccount(session.role);
} catch { /* Os formulários mostram o erro se a pessoa tentar usá-los. */ }
if (new URLSearchParams(location.search).get('criar') === '1') showForm('register');
