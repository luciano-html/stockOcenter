const state = {
  apiBase: localStorage.getItem('tienda_api_base') || 'https://stockocenter.onrender.com',
  productos: [],
  cart: JSON.parse(localStorage.getItem('tienda_cart') || '[]'),
  activeCategory: 'all',
  inStockOnly: false,
  minPrice: null,
  maxPrice: null,
  sortBy: 'relevance',
  userPostalCode: localStorage.getItem('tienda_cp') || ''
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function money(n) {
  return (n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2500);
}

function imagenUrl(imageUrl) {
  if (!imageUrl) return 'https://placehold.co/400x300?text=Silla+OfficeCenter';
  if (imageUrl.startsWith('http')) return imageUrl;
  return state.apiBase + imageUrl;
}

// ---------- API Utilities ----------

async function apiFetch(path, options = {}) {
  const res = await fetch(state.apiBase + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || body.message || `Error ${res.status}`);
  }
  return res.json();
}

// ---------- Conexión de API ----------

if ($('#apiBaseInput')) {
  $('#apiBaseInput').value = state.apiBase;
}

if ($('#conectarBtn')) {
  $('#conectarBtn').addEventListener('click', () => {
    const url = $('#apiBaseInput').value.trim().replace(/\/$/, '');
    state.apiBase = url;
    localStorage.setItem('tienda_api_base', url);
    toast(url ? 'Conectado a ' + url : 'Conectado a servidor local');
    cargarProductos();
  });
}

function setEstadoConexion(conectado) {
  const el = $('#conexionEstado');
  if (!el) return;
  if (conectado) {
    el.classList.add('ok');
    el.title = 'Conectado a la API';
  } else {
    el.classList.remove('ok');
    el.title = 'Desconectado';
  }
}

// ---------- Catálogo e Inventario ----------

async function cargarProductos() {
  $('#cargando').classList.remove('hidden');
  try {
    const data = await apiFetch('/api/live-seats');
    state.productos = (data || []).map((p) => {
      const precioLista = p.price || 150000;
      const precioEfectivo = Math.round(precioLista * 0.90); // 10% OFF en transferencia
      const cuota3 = Math.round(precioLista / 3);

      return {
        id: p._id,
        nombre: p.code,
        tipo: categorizarSilla(p.code),
        imageUrl: p.imageUrl,
        stock: p.stock ?? 0,
        activo: p.status === 'disponible',
        precioLista: precioLista,
        precioEfectivo: precioEfectivo,
        cuotas: cuota3,
        esFull: (p.stock ?? 0) > 0,
        garantiaAnios: 3
      };
    });
    
    // Ajuste de stock en carrito
    for (let item of state.cart) {
      const prod = state.productos.find(p => p.id === item.id);
      if (prod) {
        item.stockMax = prod.stock;
        if (item.qty > prod.stock) item.qty = prod.stock;
      }
    }
    state.cart = state.cart.filter(item => item.qty > 0);
    guardarCarrito();
    renderCart();
    renderGrid();
  } catch (err) {
    toast(err.message || 'Error al conectar con el catálogo');
  } finally {
    $('#cargando').classList.add('hidden');
  }
}

function categorizarSilla(codigo) {
  const c = (codigo || '').toLowerCase();
  if (c.includes('ergo') || c.includes('mesh') || c.includes('pro')) return 'ergonomica';
  if (c.includes('gerenc') || c.includes('eject') || c.includes('director')) return 'ejecutiva';
  if (c.includes('fija') || c.includes('trineo') || c.includes('tandem') || c.includes('espera')) return 'fija';
  return 'giratoria';
}

function renderGrid() {
  const grid = $('#grid');
  const term = $('#buscador').value.trim().toLowerCase();
  
  let lista = state.productos.filter((p) => {
    if (!p.activo) return false;
    
    // Búsqueda por texto
    if (term && !p.nombre.toLowerCase().includes(term)) return false;
    
    // Filtro por categoría o Full
    if (state.activeCategory === 'full' && !p.esFull) return false;
    if (state.activeCategory !== 'all' && state.activeCategory !== 'full') {
      if (p.tipo !== state.activeCategory) return false;
    }
    
    // Filtro solo en stock
    if (state.inStockOnly && p.stock <= 0) return false;
    
    // Filtros de precio
    if (state.minPrice !== null && p.precioEfectivo < state.minPrice) return false;
    if (state.maxPrice !== null && p.precioEfectivo > state.maxPrice) return false;
    
    return true;
  });

  // Ordenamiento
  if (state.sortBy === 'price_asc') {
    lista.sort((a, b) => a.precioEfectivo - b.precioEfectivo);
  } else if (state.sortBy === 'price_desc') {
    lista.sort((a, b) => b.precioEfectivo - a.precioEfectivo);
  } else if (state.sortBy === 'name_asc') {
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  $('#resultsCount').textContent = lista.length;
  grid.innerHTML = '';
  $('#mensajeVacio').classList.toggle('hidden', lista.length > 0);

  for (const p of lista) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const sinStock = p.stock <= 0;
    const badgeHtml = p.esFull && !sinStock
      ? `<div class="card-badges"><span class="badge-full">⚡ LLEGA MAÑANA</span><span class="badge-discount">10% OFF</span></div>`
      : `<div class="card-badges"><span class="badge-discount">10% OFF</span></div>`;

    const deliveryHtml = !sinStock
      ? `<div class="card-delivery-info"><span>🚚 Envío Gratis</span> • <span class="muted">Stock en fábrica: ${p.stock} un.</span></div>`
      : `<div class="card-delivery-info" style="color:#d97706;"><span>🔨 Fabricación a pedido</span> • <span class="muted">Demora: 5 días</span></div>`;

    card.innerHTML = `
      ${badgeHtml}
      <div class="card-image-wrap">
        <img src="${imagenUrl(p.imageUrl)}" alt="${p.nombre}" loading="lazy" onerror="this.src='https://placehold.co/400x300?text=OfficeCenter'" />
      </div>
      <div class="card-body">
        <div class="card-category">Línea ${p.tipo.toUpperCase()}</div>
        <h4 class="card-title" title="${p.nombre}">${p.nombre}</h4>
        
        <div class="card-pricing">
          <div class="regular-price">${money(p.precioLista)}</div>
          <div class="main-price-row">
            <span class="price-cash">${money(p.precioEfectivo)}</span>
            <span class="price-transfer-label">Transferencia</span>
          </div>
          <div class="installments-text">3 cuotas fijas de ${money(p.cuotas)}</div>
        </div>

        ${deliveryHtml}
      </div>
      
      <div class="card-actions">
        <input type="number" min="1" max="${sinStock ? 10 : p.stock}" value="1" class="qty-select" />
        <button class="add-to-cart-btn">${sinStock ? 'Reservar' : 'Agregar al Carrito'}</button>
      </div>
    `;

    card.querySelector('.add-to-cart-btn')?.addEventListener('click', () => {
      const qty = Number(card.querySelector('.qty-select').value) || 1;
      agregarAlCarrito(p, qty);
    });

    grid.appendChild(card);
  }
}

// ---------- Filtros e Interacciones ----------

$$('.quick-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    $$('.quick-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.activeCategory = chip.dataset.filter;
    renderGrid();
  });
});

$('#filterInStockOnly').addEventListener('change', (e) => {
  state.inStockOnly = e.target.checked;
  renderGrid();
});

$('#applyPriceFilterBtn').addEventListener('click', () => {
  const min = $('#minPriceInput').value;
  const max = $('#maxPriceInput').value;
  state.minPrice = min ? Number(min) : null;
  state.maxPrice = max ? Number(max) : null;
  renderGrid();
});

$('#clearFiltersBtn').addEventListener('click', () => {
  $('#buscador').value = '';
  $('#filterInStockOnly').checked = false;
  $('#minPriceInput').value = '';
  $('#maxPriceInput').value = '';
  state.inStockOnly = false;
  state.minPrice = null;
  state.maxPrice = null;
  state.activeCategory = 'all';
  $$('.quick-chip').forEach((c, idx) => c.classList.toggle('active', idx === 0));
  renderGrid();
});

$('#resetEmptyBtn').addEventListener('click', () => {
  $('#clearFiltersBtn').click();
});

$('#sortSelect').addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  renderGrid();
});

$('#buscador').addEventListener('input', renderGrid);
$('#refrescarBtn').addEventListener('click', cargarProductos);

// ---------- Calculador de Código Postal Estilo MeLi ----------

function calcularEnvio(cp) {
  const n = parseInt(cp, 10);
  if (!n || isNaN(n)) return 'Ingresá un CP válido de 4 o 5 dígitos.';
  
  if (n >= 3000 && n <= 3099) {
    return '⚡ Llega Mañana a Santa Fe y alrededores (Envío Gratis).';
  } else if (n >= 3100 && n <= 3199) {
    return '⚡ Llega en 24/48hs a Paraná y Entre Ríos (Envío Gratis).';
  } else if (n >= 1000 && n <= 1499) {
    return '🚚 Llega el jueves a CABA / GBA por transporte expreso.';
  } else {
    return '🚚 Envío a todo el país (Entrega estimada en 3 a 5 días hábiles).';
  }
}

if (state.userPostalCode) {
  $('#postalCodeInput').value = state.userPostalCode;
  $('#shippingResult').textContent = calcularEnvio(state.userPostalCode);
}

$('#calcShippingBtn').addEventListener('click', () => {
  const cp = $('#postalCodeInput').value.trim();
  state.userPostalCode = cp;
  localStorage.setItem('tienda_cp', cp);
  $('#shippingResult').textContent = calcularEnvio(cp);
});

// ---------- Carrito de Compras (Slide-over Cart) ----------

function guardarCarrito() {
  localStorage.setItem('tienda_cart', JSON.stringify(state.cart));
}

function agregarAlCarrito(producto, cantidad) {
  const existente = state.cart.find((i) => i.id === producto.id);
  const stockDisponible = Math.max(producto.stock, 20); // soporte para pedidos
  const cantidadActual = existente ? existente.qty : 0;
  const nuevaCantidad = cantidadActual + cantidad;

  if (existente) {
    existente.qty = nuevaCantidad;
  } else {
    state.cart.push({
      id: producto.id,
      nombre: producto.nombre,
      precioLista: producto.precioLista,
      precioEfectivo: producto.precioEfectivo,
      imageUrl: producto.imageUrl,
      stockMax: stockDisponible,
      qty: nuevaCantidad,
    });
  }
  guardarCarrito();
  renderCart();
  abrirCarrito();
  toast(`${producto.nombre} agregada al carrito`);
}

function renderCart() {
  const cont = $('#cartItems');
  cont.innerHTML = '';

  let totalLista = 0;
  let totalEfectivo = 0;
  let totalCantidad = 0;

  for (const item of state.cart) {
    totalLista += item.precioLista * item.qty;
    totalEfectivo += item.precioEfectivo * item.qty;
    totalCantidad += item.qty;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <img src="${imagenUrl(item.imageUrl)}" class="cart-item-img" onerror="this.src='https://placehold.co/100?text=Silla'" />
      <div class="cart-item-details">
        <div class="cart-item-title">${item.nombre}</div>
        <div class="cart-item-price">${money(item.precioEfectivo)} <span class="small muted">c/u</span></div>
        <div class="cart-item-controls">
          <button class="dec">−</button>
          <span>${item.qty}</span>
          <button class="inc">+</button>
        </div>
      </div>
      <button class="remove-item link-btn" title="Eliminar" style="color:#ef4444;font-size:1.1rem;">🗑</button>
    `;

    row.querySelector('.inc').addEventListener('click', () => {
      item.qty++;
      guardarCarrito();
      renderCart();
    });
    row.querySelector('.dec').addEventListener('click', () => {
      item.qty--;
      if (item.qty <= 0) {
        state.cart = state.cart.filter((i) => i.id !== item.id);
      }
      guardarCarrito();
      renderCart();
    });
    row.querySelector('.remove-item').addEventListener('click', () => {
      state.cart = state.cart.filter((i) => i.id !== item.id);
      guardarCarrito();
      renderCart();
    });

    cont.appendChild(row);
  }

  const descuento = totalLista - totalEfectivo;
  const cuota3 = Math.round(totalLista / 3);

  $('#cartSubtotal').textContent = money(totalLista);
  $('#cartDiscount').textContent = `-${money(descuento)}`;
  $('#cartTotal').textContent = money(totalEfectivo);
  $('#cartInstallments').textContent = `3 cuotas fijas de ${money(cuota3)}`;
  $('#cartCount').textContent = totalCantidad;
  $('#cartSubtitle').textContent = `${totalCantidad} artículo${totalCantidad !== 1 ? 's' : ''}`;
  $('#checkoutBtn').disabled = state.cart.length === 0;
}

function abrirCarrito() {
  $('#cartPanel').classList.remove('hidden');
  $('#overlay').classList.remove('hidden');
}

function cerrarCarrito() {
  $('#cartPanel').classList.add('hidden');
  if ($('#checkoutModal').classList.contains('hidden') && $('#successModal').classList.contains('hidden')) {
    $('#overlay').classList.add('hidden');
  }
}

$('#cartBtn').addEventListener('click', abrirCarrito);
$('#closeCart').addEventListener('click', cerrarCarrito);
$('#overlay').addEventListener('click', () => {
  cerrarCarrito();
  cerrarCheckoutModal();
  cerrarSuccessModal();
});

// ---------- Flujo de Checkout con Datos del Cliente ----------

function abrirCheckoutModal() {
  if (state.cart.length === 0) return;
  cerrarCarrito();
  
  let totalEfectivo = 0;
  for (const item of state.cart) {
    totalEfectivo += item.precioEfectivo * item.qty;
  }
  $('#checkoutFinalTotal').textContent = money(totalEfectivo);
  
  $('#checkoutModal').classList.remove('hidden');
  $('#overlay').classList.remove('hidden');
}

function cerrarCheckoutModal() {
  $('#checkoutModal').classList.add('hidden');
  if ($('#cartPanel').classList.contains('hidden') && $('#successModal').classList.contains('hidden')) {
    $('#overlay').classList.add('hidden');
  }
}

function cerrarSuccessModal() {
  $('#successModal').classList.add('hidden');
  $('#overlay').classList.add('hidden');
}

$('#checkoutBtn').addEventListener('click', abrirCheckoutModal);
$('#closeCheckoutModal').addEventListener('click', cerrarCheckoutModal);
$('#closeSuccessBtn').addEventListener('click', cerrarSuccessModal);

// Toggle campos de envío según método seleccionado
$('#deliveryMethod').addEventListener('change', (e) => {
  const isEnvio = e.target.value === 'envio_domicilio';
  if (isEnvio) {
    $('#shippingFields').classList.remove('hidden');
    $('#buyerAddress').required = true;
  } else {
    $('#shippingFields').classList.add('hidden');
    $('#buyerAddress').required = false;
  }
});

// Enviar Orden de Compra completa
$('#checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = $('#submitOrderBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando Pedido a Fábrica...';

  try {
    const buyerName = $('#buyerName').value.trim();
    const buyerCuit = $('#buyerCuit').value.trim();
    const buyerIva = $('#buyerIva').value;
    const buyerPhone = $('#buyerPhone').value.trim();
    const buyerEmail = $('#buyerEmail').value.trim();
    const deliveryMethod = $('#deliveryMethod').value;
    const buyerAddress = $('#buyerAddress').value.trim();
    const buyerCity = $('#buyerCity').value.trim() || 'Santa Fe';
    const buyerShift = $('#buyerShift').value;
    const buyerNotes = $('#buyerNotes').value.trim();

    const accessPlantaBaja = $('#accessPlantaBaja').checked;
    const accessAscensor = $('#accessAscensor').checked;
    const accessEscalera = $('#accessEscalera').checked;

    let sucursalOrigen = 'Santa Fe';
    let tipoEntrega = 'Retira';

    if (deliveryMethod === 'retiro_santa_fe') {
      sucursalOrigen = 'Santa Fe';
      tipoEntrega = 'Retira';
    } else if (deliveryMethod === 'retiro_parana') {
      sucursalOrigen = 'Paraná';
      tipoEntrega = 'Retira';
    } else if (deliveryMethod === 'envio_domicilio') {
      sucursalOrigen = 'Santa Fe';
      tipoEntrega = 'Reparto / Flete';
    }

    const itemsToPurchase = [];
    for (const c of state.cart) {
      for (let i = 0; i < c.qty; i++) {
        itemsToPurchase.push(c.id);
      }
    }

    const paymentMethod = $('#paymentMethod').value;
    
    // FASE 2: Mock de Pagos y Lógica del Remito
    let formaPago = 'Efectivo';
    let observacionesReparto = '';
    
    if (['credito', 'debito', 'transferencia'].includes(paymentMethod)) {
      const mockTxn = `mock_txn_${Math.floor(Math.random() * 900000) + 100000}`;
      formaPago = `${paymentMethod === 'credito' ? 'Crédito' : paymentMethod === 'debito' ? 'Débito' : 'Transferencia'} (Txn: ${mockTxn})`;
      observacionesReparto = '🚨 Firmar remito o factura';
    }

    const payload = {
      items: itemsToPurchase,
      customer: buyerName,
      cliente: {
        name: buyerName,
        razonSocial: buyerName,
        cuit: buyerCuit,
        condicionIva: buyerIva,
        telefono: buyerPhone,
        email: buyerEmail,
        domicilio: tipoEntrega === 'Reparto / Flete' ? `${buyerAddress}, ${buyerCity}` : undefined,
      },
      logistica: {
        sucursalOrigen: sucursalOrigen,
        tipoEntrega: tipoEntrega,
        direccionEntrega: tipoEntrega === 'Reparto / Flete' ? buyerAddress : undefined,
        localidadEntrega: tipoEntrega === 'Reparto / Flete' ? buyerCity : undefined,
        pisoAcceso: {
          plantaBaja: accessPlantaBaja,
          ascensor: accessAscensor,
          escaleraEstrecha: accessEscalera,
        },
        turnoEntrega: buyerShift,
      },
      condicionesComerciales: {
        formaPago: formaPago,
        observacionesReparto: observacionesReparto,
      },
      observaciones: buyerNotes || undefined,
    };

    const res = await apiFetch('/api/live-seats/purchase', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    cerrarCheckoutModal();

    // Mostrar modal de éxito
    const orderId = res.orderId || res.workOrderId || (res.data && res.data._id) || 'GENERADA';
    $('#successOrderId').textContent = `OT #${orderId.slice(-6).toUpperCase()}`;
    $('#successDetails').innerHTML = `
      <p><strong>Comprador:</strong> ${buyerName} (${buyerCuit})</p>
      <p><strong>Entrega:</strong> ${tipoEntrega === 'Retira' ? `Retiro en Sucursal ${sucursalOrigen}` : `Envío a domicilio (${buyerAddress}, ${buyerCity})`}</p>
      <p><strong>Turno:</strong> ${buyerShift}</p>
      <p><strong>Cantidad de Sillas:</strong> ${itemsToPurchase.length} unidad(es)</p>
    `;

    $('#successModal').classList.remove('hidden');
    $('#overlay').classList.remove('hidden');

    state.cart = [];
    guardarCarrito();
    renderCart();
    toast('🎉 ¡Orden registrada exitosamente en producción!');
  } catch (err) {
    toast(err.message || 'Error al procesar la compra');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmar y Enviar Pedido a Fábrica ➔';
  }
});

// ---------- Inicialización ----------

renderCart();
cargarProductos();


