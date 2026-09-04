const apiUrl=(window.PICKBEST_API_URL||'/api/v1').replace(/\/$/,'');
const productId=new URLSearchParams(location.search).get('id');
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
const escapeHTML=value=>{const el=document.createElement('div');el.textContent=value??'';return el.innerHTML};
const root=document.querySelector('#productDetail');
function setSeo(product){
  const url=location.href;
  const description=`Independent PICSOME review of ${product.name}: rating, price, features and who it is best for.`;
  document.title=`${product.name} Review, Price & Features | PICSOME`;
  document.querySelector('#pageDescription').content=description;
  document.querySelector('#canonicalUrl').href=url;
  document.querySelector('#ogTitle').content=document.title;
  document.querySelector('#ogDescription').content=description;
  document.querySelector('#ogUrl').content=url;
  document.querySelector('#ogImage').content=product.image||'https://pic-so.netlify.app/assets/picsome-logo.png';
  document.querySelector('#productSchema').textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:product.name,brand:{'@type':'Brand',name:product.brand},image:product.image,description:product.description,category:product.category,aggregateRating:{'@type':'AggregateRating',ratingValue:String(product.rating),reviewCount:String(product.reviews)},offers:{'@type':'Offer',price:String(product.price),priceCurrency:'USD',availability:'https://schema.org/InStock',url}});
}
function showProduct(product){
  setSeo(product);
  root.innerHTML=`<article class="product-detail-card"><div class="product-detail-image"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}"></div><div class="product-detail-copy"><p class="eyebrow blue">${escapeHTML(product.category)} · ${escapeHTML(product.brand)}</p><span class="tag violet">${escapeHTML(product.badge||'TOP PICK')}</span><h1>${escapeHTML(product.name)}</h1><p class="product-score">★ ${escapeHTML(product.rating)} <span>(${escapeHTML(product.reviews)} reviews)</span></p><p class="product-price">${money(product.price)}</p><p class="product-description">${escapeHTML(product.description||'Product details and recommendation coming soon.')}</p><dl class="product-facts"><div><dt>Best for</dt><dd>${escapeHTML(product.bestFor||'Everyday use')}</dd></div><div><dt>Battery</dt><dd>${escapeHTML(product.battery||'—')}</dd></div><div><dt>Weight</dt><dd>${escapeHTML(product.weight||'—')}</dd></div></dl><section class="product-faq" aria-label="Product overview"><h2>Why consider this product?</h2><p>This PICSOME page brings together the listed price, rating, core specifications and recommended use case so you can compare it with confidence.</p></section><a class="button product-deal" href="${escapeHTML(product.affiliateUrl||'#')}" target="_blank" rel="nofollow sponsored noopener">Check best price →</a><button class="copy-link" type="button" id="copyProductLink">Copy product link</button></div></article>`;
  document.querySelector('#copyProductLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);document.querySelector('#copyProductLink').textContent='Link copied ✓'}catch{document.querySelector('#copyProductLink').textContent='Copy this URL from browser'}});
}
async function loadProduct(){
  if(!productId){root.innerHTML='<p class="detail-error">Product link missing hai. Homepage se product select karein.</p>';return}
  try{const response=await fetch(`${apiUrl}/products/${encodeURIComponent(productId)}`);if(response.ok){showProduct((await response.json()).item);return}}catch{}
  const fallback=Array.isArray(products)?products.find(product=>product.id===productId):null;
  if(fallback)showProduct(fallback);else root.innerHTML='<p class="detail-error">Yeh product nahi mila ya ab available nahi hai.</p>';
}
loadProduct();