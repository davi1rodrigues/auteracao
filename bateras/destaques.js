const area = document.querySelector('#featured-products');
const WHATSAPP_NUMBER = '5551992959534';
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const safe = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try {
  const response = await fetch('api/index.php?action=products');
  const { products } = await response.json();
  if (!response.ok || !products?.length) throw new Error();
  area.innerHTML = products.slice(0, 3).map(item => {const message=encodeURIComponent(`Olá! Tenho interesse no produto ${item.title} (${money(item.price)}).`);return `<article class="card"><a class="featured-image" href="produtos.html" aria-label="Ver ${safe(item.title)}"><img src="${safe(item.image_url || 'bateraslogo.png')}" alt="${safe(item.title)}" loading="lazy"></a><div class="card-content"><span class="card-label">${safe(item.category)}</span><h3>${safe(item.title)}</h3><p class="product-price">${money(item.price)}</p><a class="button button--gold" href="https://wa.me/${WHATSAPP_NUMBER}?text=${message}" target="_blank" rel="noopener">Consultar produto <span aria-hidden="true">↗</span></a></div></article>`}).join('');
} catch {
  area.innerHTML = '<p class="catalog-status">Veja o catálogo para conhecer os produtos disponíveis.</p>';
}
