const profileForm = document.querySelector('#profile-form');
const profileMessage = document.querySelector('#profile-message');
let originalEmail = '';

async function request(action, options = {}) {
  const response = await fetch(`api/index.php?action=${action}`, { credentials: 'same-origin', ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir. Tente novamente.');
  return result;
}
function fillProfile(profile) {
  document.querySelector('#profile-name').value = profile.name || '';
  document.querySelector('#profile-email').value = profile.email || '';
  document.querySelector('#profile-phone').value = profile.phone || '';
  document.querySelector('#profile-city').value = profile.city || '';
  document.querySelector('#profile-state').value = profile.state || '';
  document.querySelector('#profile-level').value = profile.playing_level || '';
  document.querySelector('#profile-gear').value = profile.favorite_gear || '';
  document.querySelector('#profile-about').value = profile.about || '';
  originalEmail = profile.email || '';
  document.querySelector('#member-email').textContent = originalEmail;
  document.querySelector('#member-since').textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(profile.created_at));
  document.querySelector('#customer-name').textContent = profile.name || 'cliente';
}

document.querySelectorAll('.account-logout').forEach(button => button.addEventListener('click', async () => {
  try { await request('logout', { method: 'POST' }); } finally { window.location.href = 'login.html'; }
}));

profileForm.addEventListener('input', () => {
  const emailChanged = document.querySelector('#profile-email').value.trim().toLowerCase() !== originalEmail.toLowerCase();
  document.querySelector('#email-password-row').hidden = !emailChanged;
});
profileForm.addEventListener('submit', async event => {
  event.preventDefault(); profileMessage.textContent = 'Salvando seu perfil…';
  const payload = {
    name: document.querySelector('#profile-name').value,
    email: document.querySelector('#profile-email').value,
    phone: document.querySelector('#profile-phone').value,
    city: document.querySelector('#profile-city').value,
    state: document.querySelector('#profile-state').value,
    playing_level: document.querySelector('#profile-level').value,
    favorite_gear: document.querySelector('#profile-gear').value,
    about: document.querySelector('#profile-about').value,
    current_password: document.querySelector('#email-current-password').value,
  };
  try {
    const result = await request('profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    originalEmail = result.email;
    document.querySelector('#member-email').textContent = result.email;
    document.querySelector('#customer-name').textContent = result.name;
    document.querySelector('#email-current-password').value = '';
    document.querySelector('#email-password-row').hidden = true;
    profileMessage.textContent = 'Perfil atualizado.';
  } catch (error) { profileMessage.textContent = error.message; }
});

const passwordForm = document.querySelector('#password-form');
passwordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#password-message');
  if (document.querySelector('#new-password').value !== document.querySelector('#confirm-password').value) { message.textContent = 'A nova senha e a confirmação não conferem.'; return; }
  message.textContent = 'Atualizando senha…';
  try {
    await request('change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: document.querySelector('#current-password').value, new_password: document.querySelector('#new-password').value }) });
    passwordForm.reset(); message.textContent = 'Senha atualizada.';
  } catch (error) { message.textContent = error.message; }
});

try {
  const session = await request('session');
  if (!session.authenticated) window.location.replace('login.html');
  else if (session.role === 'admin') window.location.replace('admin.html');
  else {
    const { profile } = await request('profile');
    fillProfile(profile);
  }
} catch { window.location.replace('login.html'); }
