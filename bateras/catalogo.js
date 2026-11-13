const catalog = document.querySelector('#catalogo');
const overlay = document.querySelector('#modal-overlay');
const WHATSAPP_NUMBER = '5551992959534';
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const safe = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let allProducts = [];
function showMessage(message) { catalog.innerHTML = `<div class="catalog-message"><p>${safe(message)}</p></div>`; }
function openProduct(product) {
  document.querySelector('#modal-img').src = product.image_url || 'bateraslogo.png';
  document.querySelector('#modal-img').alt = product.title;
  document.querySelector('#modal-category').textContent = product.category || 'Instrumentos';
  document.querySelector('#modal-title').textContent = product.title;
  document.querySelector('#modal-preco').textContent = money(product.price);
  document.querySelector('#modal-desc').textContent = product.description || 'Consulte disponibilidade e condições com a loja.';
  const message = `Olá! Tenho interesse no produto ${product.title} (${money(product.price)}).`;
  document.querySelector('#btn-comprar').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  overlay.classList.add('active'); document.querySelector('#modal-close').focus();
}
function renderProducts(products) {
  const count = document.querySelector('#product-count');
  if (count) count.textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`;
  if (!products.length) return showMessage(allProducts.length ? 'Nenhum produto encontrado. Tente mudar a busca ou o filtro.' : 'Estamos preparando novidades. Consulte a loja pelo WhatsApp.');
  catalog.innerHTML = products.map(product => `<article class="produto"><button class="product-image-button" type="button" data-open="${product.id}" aria-label="Ver ${safe(product.title)}"><img src="${safe(product.image_url || 'bateraslogo.png')}" alt="${safe(product.title)}" loading="lazy"><span class="image-tag">${safe(product.category || 'Equipamentos')}</span></button><div class="product-card-info"><span class="card-label">${safe(product.category || 'Instrumentos')}</span><h2>${safe(product.title)}</h2><p class="product-description">${safe(product.description || 'Consulte disponibilidade com a loja.')}</p><div class="product-card-bottom"><strong class="product-price">${money(product.price)}</strong><button class="product-details" type="button" data-open="${product.id}">Ver detalhes <span aria-hidden="true">→</span></button></div></div></article>`).join('');
  catalog.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
    const product = products.find(item => String(item.id) === button.dataset.open);
    if (product) openProduct(product);
  }));
}
function applyFilters() {
  const query = (document.querySelector('#search-products')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const category = document.querySelector('#filter-category')?.value || '';
  const sort = document.querySelector('#sort-products')?.value || 'newest';
  let products = allProducts.filter(product => (!category || product.category === category) && (!query || `${product.title} ${product.category} ${product.description}`.toLocaleLowerCase('pt-BR').includes(query)));
  if (sort === 'price-asc') products.sort((a,b) => Number(a.price)-Number(b.price));
  if (sort === 'price-desc') products.sort((a,b) => Number(b.price)-Number(a.price));
  if (sort === 'name') products.sort((a,b) => a.title.localeCompare(b.title,'pt-BR'));
  renderProducts(products);
}
function closeModal() { overlay.classList.remove('active'); }
document.querySelector('#modal-close').addEventListener('click', closeModal);
overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
document.querySelector('#search-products').addEventListener('input', applyFilters);
document.querySelector('#filter-category').addEventListener('change', applyFilters);
document.querySelector('#sort-products').addEventListener('change', applyFilters);

try {
  const response = await fetch('api/index.php?action=products');
  const result = await response.json();
  if (!response.ok) throw new Error();
  allProducts = result.products || [];
  const categorySelect = document.querySelector('#filter-category');
  [...new Set(allProducts.map(product => product.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR')).forEach(category => {
    const option = document.createElement('option'); option.value = category; option.textContent = category; categorySelect.append(option);
  });
  const initialCategory = new URLSearchParams(location.search).get('categoria');
  if (initialCategory && [...categorySelect.options].some(option => option.value === initialCategory)) categorySelect.value = initialCategory;
  applyFilters();
} catch {
  showMessage('Não foi possível carregar o catálogo. Tente novamente em instantes.');
}
