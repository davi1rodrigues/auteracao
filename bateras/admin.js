const byId = id => document.getElementById(id);
const dashboard = byId('dashboard');
const api = 'api/index.php';
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

async function request(action, options = {}) {
  let response;
  try {
    response = await fetch(`${api}?action=${action}`, { credentials: 'same-origin', ...options });
  } catch {
    throw new Error('Não consegui conectar à API PHP. Abra o site pelo Apache do XAMPP (localhost), e confirme que Apache e MySQL estão iniciados.');
  }
  const result = await response.json().catch(() => ({}));
  if (!Object.keys(result).length && !response.ok) {
    throw new Error(`A API respondeu com erro HTTP ${response.status}. Confira o caminho do projeto no htdocs e a configuração do PHP.`);
  }
  if (!response.ok) throw new Error(result.error || 'Não foi possível completar a operação.');
  return result;
}

try {
  const session = await request('session');
  if (session.role === 'admin') await showDashboard();
  else if (session.role === 'customer') window.location.replace('conta.html');
  else window.location.replace('login.html?admin=1');
} catch {
  byId('config-notice').hidden = false;
  byId('config-notice').innerHTML = '<h2>API indisponível</h2><p>Abra o site pelo Apache/PHP (por exemplo, <code>http://localhost/bateras/</code> no XAMPP), configure o banco em <code>api/config.php</code> e importe <code>mysql-schema.sql</code>.</p>';
}

byId('logout').addEventListener('click', async () => {
  await request('logout', { method: 'POST' }); dashboard.hidden = true; loginForm.hidden = false;
});

async function showDashboard() { dashboard.hidden = false; await loadProducts(); }
async function loadProducts() {
  const target = byId('admin-products'); target.innerHTML = '<p>Carregando produtos…</p>';
  try {
    const { products } = await request('products');
    if (!products.length) { target.innerHTML = '<p>Seu catálogo está vazio. Use o formulário acima para cadastrar o primeiro produto.</p>'; return; }
    target.innerHTML = products.map(product => `<article class="admin-product"><img src="${safe(product.image_url || 'bateraslogo.png')}" alt=""><div class="admin-product-info"><span class="card-label">${product.active ? 'Publicado' : 'Rascunho'} · ${safe(product.category)}</span><h3>${safe(product.title)}</h3><p>${money(product.price)}</p></div><div class="admin-product-actions"><button type="button" data-edit="${product.id}" class="text-button">Editar</button><button type="button" data-delete="${product.id}" class="text-button text-button--danger">Excluir</button></div></article>`).join('');
    target.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => editProduct(products.find(item => String(item.id) === button.dataset.edit))));
    target.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => deleteProduct(button.dataset.delete)));
  } catch (error) { target.innerHTML = `<p>${safe(error.message)}</p>`; }
}
function safe(text) { return String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function editProduct(product) {
  byId('product-id').value = product.id; byId('title').value = product.title; byId('category').value = product.category;
  byId('price').value = product.price; byId('description').value = product.description || ''; byId('active').checked = Boolean(Number(product.active));
  byId('form-title').textContent = 'Editar produto'; byId('cancel-edit').hidden = false; byId('photo').value = '';
  byId('product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function resetForm() { byId('product-form').reset(); byId('product-id').value = ''; byId('active').checked = true; byId('form-title').textContent = 'Adicionar produto'; byId('cancel-edit').hidden = true; }
byId('cancel-edit').addEventListener('click', resetForm);
byId('product-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = byId('form-message'); message.textContent = 'Salvando…';
  const data = new FormData();
  data.set('id', byId('product-id').value); data.set('title', byId('title').value.trim());
  data.set('category', byId('category').value.trim()); data.set('price', byId('price').value);
  data.set('description', byId('description').value.trim()); data.set('active', byId('active').checked ? '1' : '');
  if (byId('photo').files[0]) data.set('photo', byId('photo').files[0]);
  try { await request('products', { method: 'POST', body: data }); message.textContent = 'Produto salvo.'; resetForm(); await loadProducts(); }
  catch (error) { message.textContent = error.message; }
});
async function deleteProduct(id) {
  if (!window.confirm('Excluir este produto do catálogo?')) return;
  try { await request('products', { method: 'DELETE', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ id }) }); await loadProducts(); }
  catch (error) { window.alert(error.message); }
}
