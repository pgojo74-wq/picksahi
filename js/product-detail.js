const apiUrl=(window.PICKBEST_API_URL||'/api/v1').replace(/\/$/,'');
const productId=new URLSearchParams(location.search).get('id');
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
const escapeHTML=value=>{const el=document.createElement('div');el.textContent=value??'';return el.innerHTML};
const root=document.querySelector('#productDetail');
function showProduct(product){
  document.title=`${product.name} | PICSOME`;
  root.innerHTML=`<article class="product-detail-card"><div class="product-detail-image"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}"></div><div class="product-detail-copy"><p class="eyebrow blue">${escapeHTML(product.category)} · ${escapeHTML(product.brand)}</p><span class="tag violet">${escapeHTML(product.badge||'TOP PICK')}</span><h1>${escapeHTML(product.name)}</h1><p class="product-score">★ ${escapeHTML(product.rating)} <span>(${escapeHTML(product.reviews)} reviews)</span></p><p class="product-price">${money(product.price)}</p><p class="product-description">${escapeHTML(product.description||'Product details and recommendation coming soon.')}</p><dl class="product-facts"><div><dt>Best for</dt><dd>${escapeHTML(product.bestFor||'Everyday use')}</dd></div><div><dt>Battery</dt><dd>${escapeHTML(product.battery||'—')}</dd></div><div><dt>Weight</dt><dd>${escapeHTML(product.weight||'—')}</dd></div></dl><a class="button product-deal" href="${escapeHTML(product.affiliateUrl||'#')}" target="_blank" rel="nofollow sponsored noopener">Check best price →</a><button class="copy-link" type="button" id="copyProductLink">Copy product link</button></div></article>`;
  document.querySelector('#copyProductLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);document.querySelector('#copyProductLink').textContent='Link copied ✓'}catch{document.querySelector('#copyProductLink').textContent='Copy this URL from browser'}});
}
async function loadProduct(){
  if(!productId){root.innerHTML='<p class="detail-error">Product link missing hai. Homepage se product select karein.</p>';return}
  try{const response=await fetch(`${apiUrl}/products/${encodeURIComponent(productId)}`);if(response.ok){showProduct((await response.json()).item);return}}catch{}
  const fallback=Array.isArray(products)?products.find(product=>product.id===productId):null;
  if(fallback)showProduct(fallback);else root.innerHTML='<p class="detail-error">Yeh product nahi mila ya ab available nahi hai.</p>';
}
loadProduct();