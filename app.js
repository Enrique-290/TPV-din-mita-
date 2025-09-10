
/* DINAMITA POS - App estática con localStorage */
/* Estructura de módulos: Ventas, Productos, Clientes, Membresías (mes real), Calendario, Reportes, Historial, Config */

const LS = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
};

const state = {
  negocio: LS.get("negocio", {
    nombre: "Dinamita Gym",
    rfc: "",
    direccion: "",
    telefono: "",
    whatsapp: "",
    mensajeTicket: "Gracias por tu compra en Dinamita Gym 💥",
    logoDataUrl: null,
    sucursal: "Principal",
  }),
  caja: LS.get("caja", { abierta: false, montoInicial: 0, movimientos: [], historico: [] }),
  productos: LS.get("productos", [
    {id: genId(), sku:"MUT-100", codigo:"750000001", nombre:"Proteína Mutant 2lb", categoria:"Suplementos", marca:"Mutant", costo:800, precio:999, iva:0, stock:5, stockMin:1, fotoUrl:null, proveedorId:null, activo:true},
    {id: genId(), sku:"GUAN-01", codigo:"750000002", nombre:"Guantes de gimnasio", categoria:"Accesorios", marca:"Dinamita", costo:120, precio:199, iva:0, stock:12, stockMin:3, fotoUrl:null, proveedorId:null, activo:true},
  ]),
  clientes: LS.get("clientes", []),
  ventas: LS.get("ventas", []),
  historial: LS.get("historial", []), // tickets
  membresias: LS.get("membresias", []), // {id, clienteId, tipo, inicio, fin, estatus, precio, promo, pagoRef}
};

function persist(){
  LS.set("negocio", state.negocio);
  LS.set("caja", state.caja);
  LS.set("productos", state.productos);
  LS.set("clientes", state.clientes);
  LS.set("ventas", state.ventas);
  LS.set("historial", state.historial);
  LS.set("membresias", state.membresias);
}

function genId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(2); }
function fmt(n){ return (Math.round(n*100)/100).toFixed(2); }

function sel(q){ return document.querySelector(q); }
function el(tag, opts={}){
  const e = document.createElement(tag);
  if(opts.className) e.className = opts.className;
  if(opts.text) e.textContent = opts.text;
  if(opts.html) e.innerHTML = opts.html;
  return e;
}

function router(){
  const route = location.hash || "#/ventas";
  document.querySelectorAll(".sidebar a").forEach(a=>a.classList.remove("active"));
  const a = document.querySelector(`.sidebar a[href='${route}']`);
  if(a) a.classList.add("active");

  const view = sel("#view");
  view.innerHTML = "";
  switch(true){
    case route.startsWith("#/ventas"): renderVentas(view); break;
    case route.startsWith("#/productos"): renderProductos(view); break;
    case route.startsWith("#/clientes"): renderClientes(view); break;
    case route.startsWith("#/membresias"): renderMembresias(view); break;
    case route.startsWith("#/calendario"): renderCalendario(view); break;
    case route.startsWith("#/reportes"): renderReportes(view); break;
    case route.startsWith("#/historial"): renderHistorial(view); break;
    case route.startsWith("#/config"): renderConfig(view); break;
    default: renderVentas(view);
  }
}
window.addEventListener("hashchange", router);

function init(){
  // header
  sel("#negocioNombreHeader").textContent = state.negocio.nombre || "Dinamita Gym";
  sel("#sucursalHeader").textContent = "Sucursal: " + (state.negocio.sucursal || "Principal");
  if(state.negocio.logoDataUrl){
    sel("#brandLogo").style.background = `center/cover no-repeat url(${state.negocio.logoDataUrl})`;
  }

  sel("#btnAbrirCaja").onclick = ()=>{
    if(state.caja.abierta){ alert("La caja ya está abierta."); return; }
    const monto = prompt("Monto inicial en caja:", "0") || "0";
    state.caja.abierta = true;
    state.caja.montoInicial = parseFloat(monto)||0;
    state.caja.movimientos.push({id:genId(), tipo:"apertura", monto:state.caja.montoInicial, fecha:new Date().toISOString()});
    persist(); alert("Caja abierta.");
  };
  sel("#btnCerrarCaja").onclick = ()=>{
    if(!state.caja.abierta){ alert("La caja no está abierta."); return; }
    state.caja.abierta = false;
    state.caja.movimientos.push({id:genId(), tipo:"cierre", fecha:new Date().toISOString()});
    state.caja.historico.push({id:genId(), movimientos: state.caja.movimientos, fecha:new Date().toISOString()});
    state.caja.movimientos = [];
    persist(); alert("Caja cerrada.");
  };

  router();
}
document.addEventListener("DOMContentLoaded", init);

/* -------- Ventas (TPV) -------- */
function renderVentas(view){
  const card = el("div",{className:"card"});
  const h = el("h3",{text:"Ventas (TPV)"});
  const row = el("div",{className:"row"});
  const inputBuscar = el("input",{className:"input",});
  inputBuscar.placeholder = "Buscar por nombre, SKU o código...";
  row.appendChild(inputBuscar);

  const lista = el("div",{className:"catalog"});
  renderCatalogo(lista, state.productos);

  const carritoCard = el("div",{className:"card"});
  carritoCard.appendChild(el("h3",{text:"Carrito"}));
  const tbl = el("table",{className:"table"});
  tbl.innerHTML = `<thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Desc</th><th>Total</th><th></th></tr></thead>`;
  const tbody = el("tbody");
  tbl.appendChild(tbody);
  carritoCard.appendChild(tbl);

  const pagosDiv = el("div",{className:"row wrap"});
  const pEfe = pagoControl("Efectivo");
  const pTar = pagoControl("Tarjeta");
  const pTra = pagoControl("Transferencia");
  const pOtr = pagoControl("Otro");
  pagosDiv.append(pEfe.wrapper, pTar.wrapper, pTra.wrapper, pOtr.wrapper);

  const totDiv = el("div",{className:"row"});
  const totLbl = el("div",{html:"<b>Totales</b>"});
  const subEl = el("div",{text:"Subtotal: $0.00"});
  const ivaEl = el("div",{text:"IVA: $0.00"});
  const totEl = el("div",{html:"<b>Total: $0.00</b>"});
  totDiv.append(totLbl, subEl, ivaEl, totEl);

  const btnCobrar = el("button",{className:"btn", text:"Cobrar y generar ticket"});

  // estado carrito
  const carrito = [];

  function addToCart(prod){
    const found = carrito.find(i=>i.id===prod.id);
    if(found){ found.cantidad += 1; }
    else { carrito.push({ ...prod, cantidad:1, descuento:0, precio: prod.precio }); }
    renderCart();
  }

  function renderCart(){
    tbody.innerHTML = "";
    let subtotal=0, iva=0, total=0;
    carrito.forEach((item, idx)=>{
      const tr = el("tr");
      const tdN = el("td",{text:item.nombre});
      const tdC = el("td");
      const inpC = el("input",{className:"input"}); inpC.type="number"; inpC.value=item.cantidad; inpC.min=1;
      inpC.oninput = ()=>{ item.cantidad = parseInt(inpC.value)||1; calc(); };
      tdC.appendChild(inpC);

      const tdP = el("td");
      const inpP = el("input",{className:"input"}); inpP.type="number"; inpP.value=item.precio;
      inpP.oninput = ()=>{ item.precio = parseFloat(inpP.value)||0; calc(); };
      tdP.appendChild(inpP);

      const tdD = el("td");
      const inpD = el("input",{className:"input"}); inpD.type="number"; inpD.value=item.descuento||0;
      inpD.oninput = ()=>{ item.descuento = parseFloat(inpD.value)||0; calc(); };
      tdD.appendChild(inpD);

      const tdT = el("td");
      const lineTotal = (item.precio - (item.descuento||0)) * item.cantidad;
      tdT.textContent = "$"+fmt(lineTotal);

      const tdX = el("td");
      const delBtn = el("button",{className:"btn small secondary", text:"X"});
      delBtn.onclick = ()=>{ carrito.splice(idx,1); renderCart(); };
      tdX.appendChild(delBtn);

      tr.append(tdN, tdC, tdP, tdD, tdT, tdX);
      tbody.appendChild(tr);
    });
    function calc(){
      renderCart();
    }
    subtotal = carrito.reduce((s,i)=> s + (i.precio - (i.descuento||0)) * i.cantidad, 0);
    iva = 0; // simplificado
    total = subtotal + iva;
    subEl.textContent = "Subtotal: $" + fmt(subtotal);
    ivaEl.textContent = "IVA: $" + fmt(iva);
    totEl.innerHTML = "<b>Total: $" + fmt(total) + "</b>";
    return {subtotal, iva, total};
  }

  function pagoControl(tipo){
    const wrapper = el("div",{className:"card"});
    wrapper.style.flex = "1";
    const h= el("div",{html:`<b>${tipo}</b>`});
    const inp = el("input",{className:"input"});
    inp.type="number"; inp.placeholder="0.00";
    wrapper.append(h, inp);
    return {wrapper, tipo, input:inp};
  }

  function cobrar(){
    if(!state.caja.abierta){ alert("Abre la caja antes de cobrar."); return; }
    if(carrito.length===0){ alert("Carrito vacío."); return; }
    const {total} = renderCart();
    const pagos = [];
    [pEfe,pTar,pTra,pOtr].forEach(p=>{
      const v = parseFloat(p.input.value)||0;
      if(v>0) pagos.push({tipo:p.tipo.toLowerCase(), monto:v});
    });
    const sumaPagos = pagos.reduce((s,p)=>s+p.monto,0);
    if(Math.abs(sumaPagos - total) > 0.01){
      const ok = confirm("Los pagos no igualan el total. ¿Deseas ajustar al total automáticamente?");
      if(!ok) return;
      // ajustar: poner en efectivo el total
      pagos.length = 0; pagos.push({tipo:"efectivo", monto: total});
    }

    // disminuir stock
    carrito.forEach(item=>{
      const prod = state.productos.find(p=>p.id===item.id);
      if(prod){ prod.stock = (prod.stock||0) - item.cantidad; if(prod.stock<0) prod.stock=0; }
    });

    const venta = {
      id: genId(),
      folio: "F-"+Date.now(),
      fecha: new Date().toISOString(),
      items: carrito.map(i=>({productoId:i.id, nombre:i.nombre, precio:i.precio, cantidad:i.cantidad, descuento:i.descuento||0})),
      totales: {subtotal: renderCart().subtotal, iva:0, total: renderCart().total},
      pagos,
      tipoVenta: "producto",
      mensajeTicket: state.negocio.mensajeTicket || "",
    };
    state.ventas.push(venta);
    state.historial.push(venta);
    // caja movimiento
    pagos.forEach(pg=>{
      state.caja.movimientos.push({id:genId(), tipo:"ingreso", origen:"venta", metodo:pg.tipo, monto:pg.monto, fecha:new Date().toISOString(), ref:venta.id});
    });
    persist();
    renderTicket(venta);
    window.print();
    location.hash = "#/historial";
  }

  inputBuscar.oninput = ()=>{
    const q = inputBuscar.value.toLowerCase();
    const filtered = state.productos.filter(p=>
      (p.nombre||"").toLowerCase().includes(q) ||
      (p.sku||"").toLowerCase().includes(q) ||
      (p.codigo||"").toLowerCase().includes(q)
    );
    renderCatalogo(lista, filtered);
  };

  btnCobrar.onclick = cobrar;

  card.append(h, row, lista);
  view.append(card, carritoCard, pagosDiv, totDiv, btnCobrar);

  function renderCatalogo(container, arr){
    container.innerHTML="";
    arr.forEach(p=>{
      const c = el("div",{className:"product-card"});
      const img = el("img");
      img.src = p.fotoUrl || placeholderImg();
      const name = el("div",{className:"name", text:p.nombre});
      const price = el("div",{className:"price", text:"$"+fmt(p.precio)});
      const stock = el("div",{html:`Stock: <b>${p.stock ?? 0}</b>`});
      const add = el("button",{className:"btn", text:"Agregar"});
      add.onclick = ()=> addToCart(p);
      c.append(img, name, price, stock, add);
      container.appendChild(c);
    });
  }
}

/* -------- Productos -------- */
function renderProductos(view){
  const container = el("div",{className:"grid cols-2"});

  const form = el("div",{className:"card"});
  form.append(el("h3",{text:"Nuevo / Editar producto"}));
  const fNombre = inputPair("Nombre");
  const fSKU = inputPair("SKU");
  const fCodigo = inputPair("Código barras");
  const fCat = inputPair("Categoría");
  const fMarca = inputPair("Marca");
  const fCosto = inputPair("Costo", "number");
  const fPrecio = inputPair("Precio", "number");
  const fIVA = inputPair("IVA", "number"); fIVA.input.value="0";
  const fStock = inputPair("Stock", "number");
  const fMin = inputPair("Stock mínimo", "number");
  const foto = inputFilePair("Foto");

  const btnGuardar = el("button",{className:"btn", text:"Guardar"});
  btnGuardar.onclick = ()=>{
    const prod = {
      id: genId(),
      sku: fSKU.input.value.trim(),
      codigo: fCodigo.input.value.trim(),
      nombre: fNombre.input.value.trim(),
      categoria: fCat.input.value.trim(),
      marca: fMarca.input.value.trim(),
      costo: parseFloat(fCosto.input.value)||0,
      precio: parseFloat(fPrecio.input.value)||0,
      iva: parseFloat(fIVA.input.value)||0,
      stock: parseInt(fStock.input.value)||0,
      stockMin: parseInt(fMin.input.value)||0,
      fotoUrl: foto.dataUrl || null,
      proveedorId: null,
      activo: true,
    };
    if(!prod.nombre){ alert("Nombre requerido."); return; }
    state.productos.push(prod);
    persist(); alert("Producto guardado.");
    renderProductos(view);
  };

  [fNombre.div, fSKU.div, fCodigo.div, fCat.div, fMarca.div, fCosto.div, fPrecio.div, fIVA.div, fStock.div, fMin.div, foto.div, btnGuardar].forEach(x=>form.appendChild(x));

  const list = el("div",{className:"card"});
  list.append(el("h3",{text:"Listado"}));
  const q = el("input",{className:"input"}); q.placeholder="Buscar...";
  list.append(q);
  const table = el("table",{className:"table"});
  table.innerHTML = "<thead><tr><th>Nombre</th><th>Precio</th><th>Stock</th><th></th></tr></thead>";
  const tb = el("tbody");
  table.append(tb);
  list.append(table);

  function draw(filter=""){
    tb.innerHTML="";
    state.productos
      .filter(p=>(p.nombre||"").toLowerCase().includes(filter.toLowerCase()))
      .forEach(p=>{
        const tr = el("tr");
        tr.append(el("td",{text:p.nombre}), el("td",{text:"$"+fmt(p.precio)}), el("td",{text:p.stock ?? 0}));
        const td = el("td");
        const del = el("button",{className:"btn small secondary", text:"Eliminar"});
        del.onclick = ()=>{
          if(!confirm("¿Eliminar producto?")) return;
          state.productos = state.productos.filter(x=>x.id!==p.id);
          persist(); draw(q.value);
        };
        td.append(del);
        tr.append(td);
        tb.append(tr);
      });
  }
  q.oninput = ()=>draw(q.value);
  draw();

  container.append(form, list);
  view.append(container);
}

function inputPair(label, type="text"){
  const div = el("div",{className:"row"});
  const lab = el("label",{html:`<small>${label}</small>`});
  const input = el("input",{className:"input"}); input.type=type;
  div.append(lab, input);
  return {div, input};
}

function inputFilePair(label){
  const div = el("div",{className:"row"});
  const lab = el("label",{html:`<small>${label}</small>`});
  const input = el("input"); input.type="file"; input.accept="image/*";
  const prev = el("img"); prev.style.width="100%"; prev.style.maxHeight="150px"; prev.style.objectFit="cover"; prev.style.borderRadius="10px"; prev.style.background="#111";
  let dataUrl = null;
  input.onchange = ()=>{
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = e=>{ dataUrl = e.target.result; prev.src = dataUrl; };
    reader.readAsDataURL(file);
  };
  div.append(lab, input, prev);
  return {div, input, prev, get dataUrl(){return dataUrl;} };
}

/* -------- Clientes -------- */
function renderClientes(view){
  const wrap = el("div",{className:"grid cols-2"});

  const form = el("div",{className:"card"});
  form.append(el("h3",{text:"Nuevo cliente"}));
  const fNom = inputPair("Nombre");
  const fTel = inputPair("Teléfono");
  const fMail = inputPair("Email");
  const btn = el("button",{className:"btn", text:"Guardar"});
  btn.onclick = ()=>{
    const c = {id:genId(), nombre:fNom.input.value.trim(), telefono:fTel.input.value.trim(), email:fMail.input.value.trim(), etiquetas:[], notas:""};
    if(!c.nombre){ alert("Nombre requerido."); return; }
    state.clientes.push(c); persist(); alert("Cliente guardado."); renderClientes(view);
  };
  [fNom.div, fTel.div, fMail.div, btn].forEach(x=>form.appendChild(x));

  const list = el("div",{className:"card"});
  list.append(el("h3",{text:"Listado"}));
  const q = el("input",{className:"input"}); q.placeholder="Buscar...";
  list.append(q);
  const table = el("table",{className:"table"});
  table.innerHTML = "<thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th></th></tr></thead>";
  const tb = el("tbody");
  table.append(tb); list.append(table);

  function draw(filter=""){
    tb.innerHTML="";
    state.clientes
      .filter(c=>(c.nombre||"").toLowerCase().includes(filter.toLowerCase()))
      .forEach(c=>{
        const tr = el("tr");
        tr.append(el("td",{text:c.nombre}), el("td",{text:c.telefono}), el("td",{text:c.email}));
        const td = el("td");
        const del = el("button",{className:"btn small secondary", text:"Eliminar"});
        del.onclick = ()=>{
          if(!confirm("¿Eliminar cliente?")) return;
          state.clientes = state.clientes.filter(x=>x.id!==c.id); persist(); draw(q.value);
        };
        td.append(del); tr.append(td); tb.append(tr);
      });
  }
  q.oninput = ()=>draw(q.value);
  draw();

  wrap.append(form, list);
  view.append(wrap);
}

/* -------- Membresías -------- */
function renderMembresias(view){
  const wrap = el("div",{className:"grid cols-2"});

  const form = el("div",{className:"card"});
  form.append(el("h3",{text:"Nueva / Renovar Membresía (mes real)"}));
  const clienteSel = el("select",{className:"input"});
  clienteSel.innerHTML = `<option value="">-- Selecciona cliente --</option>` + state.clientes.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join("");
  const tipoSel = el("select",{className:"input"});
  ["Visita","Semana","Mensualidad","6 meses","12 meses"].forEach(t=>{
    const o = el("option",{text:t}); o.value=t; tipoSel.append(o);
  });
  const inicio = inputPair("Fecha inicio","date");
  const precio = inputPair("Precio","number");
  const promo = inputPair("Promo / Nota");
  const btn = el("button",{className:"btn", text:"Guardar"});
  btn.onclick = ()=>{
    const cid = clienteSel.value;
    if(!cid){ alert("Selecciona un cliente."); return; }
    const t = tipoSel.value;
    const fi = inicio.input.value ? new Date(inicio.input.value) : new Date();
    const fin = calcularFin(t, fi);
    const mem = {
      id: genId(), clienteId: cid, tipo: t,
      inicio: fi.toISOString().slice(0,10),
      fin: fin.toISOString().slice(0,10),
      estatus: estadoMembresia(fin),
      precio: parseFloat(precio.input.value)||0,
      promo: promo.input.value.trim()||null,
      pagoRef: null,
    };
    state.membresias.push(mem); persist(); alert("Membresía guardada."); renderMembresias(view);
  };

  form.append(
    el("label",{html:"<small>Cliente</small>"}), clienteSel,
    el("label",{html:"<small>Tipo</small>"}), tipoSel,
    inicio.div, precio.div, promo.div, btn
  );

  const list = el("div",{className:"card"});
  list.append(el("h3",{text:"Membresías"}));
  const table = el("table",{className:"table"});
  table.innerHTML = "<thead><tr><th>Cliente</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estatus</th></tr></thead>";
  const tb = el("tbody"); table.append(tb); list.append(table);

  state.membresias.sort((a,b)=> a.fin.localeCompare(b.fin));
  state.membresias.forEach(m=>{
    const tr = el("tr");
    const cli = state.clientes.find(c=>c.id===m.clienteId);
    tr.append(
      el("td",{text:cli?cli.nombre:"—"}),
      el("td",{text:m.tipo}),
      el("td",{text:m.inicio}),
      el("td",{text:m.fin}),
      el("td",{html:`<span class="badge ${badgeFromStatus(m.estatus)}">${m.estatus}</span>`}),
    );
    tb.append(tr);
  });

  wrap.append(form, list);
  view.append(wrap);
}

function calcularFin(tipo, inicio){
  const dt = new Date(inicio.getTime());
  switch(tipo){
    case "Visita": return dt;
    case "Semana": dt.setDate(dt.getDate()+7); return dt;
    case "Mensualidad": return addRealMonth(dt);
    case "6 meses": return addRealMonth(dt,6);
    case "12 meses": return addRealMonth(dt,12);
    default: return addRealMonth(dt);
  }
}

function addRealMonth(date, months=1){
  const d = new Date(date.getTime());
  const day = d.getDate();
  const m = d.getMonth();
  const y = d.getFullYear();
  const targetM = m + months;
  const target = new Date(y, targetM, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth()+1, 0).getDate();
  const newDay = Math.min(day, lastDay);
  target.setDate(newDay);
  // mantener misma hora local
  target.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return target;
}

function estadoMembresia(finDate){
  const today = new Date();
  const fin = (finDate instanceof Date) ? finDate : new Date(finDate);
  const diff = (fin - today)/(1000*60*60*24);
  if(diff < 0) return "vencida";
  if(diff <= 3) return "por vencer";
  return "activa";
}
function badgeFromStatus(s){ return s==="activa"?"ok": s==="por vencer"?"warn":"bad"; }

/* -------- Calendario -------- */
function renderCalendario(view){
  const card = el("div",{className:"card"});
  card.append(el("h3",{text:"Calendario de vencimientos"}));

  const now = new Date();
  const year = now.getFullYear(); const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month+1, 0);
  const days = last.getDate();

  const grid = el("div",{className:"grid cols-4"});

  for(let d=1; d<=days; d++){
    const dt = new Date(year, month, d);
    const box = el("div",{className:"card"});
    box.append(el("div",{html:`<b>${d}/${month+1}</b>`}));
    // membresías que vencen este día
    const hoy = dt.toISOString().slice(0,10);
    const v = state.membresias.filter(m=> m.fin === hoy);
    v.forEach(m=>{
      const cli = state.clientes.find(c=>c.id===m.clienteId);
      box.append(el("div",{html:`<span class="badge ${badgeFromStatus(estadoMembresia(m.fin))}">${m.tipo}</span> ${cli?cli.nombre:""}`}));
    });
    grid.append(box);
  }
  card.append(grid);
  view.append(card);
}

/* -------- Reportes -------- */
function renderReportes(view){
  const card = el("div",{className:"card"});
  card.append(el("h3",{text:"Reportes"}));
  const row = el("div",{className:"row wrap"});
  const fDesde = inputPair("Desde","date");
  const fHasta = inputPair("Hasta","date");
  row.append(fDesde.div, fHasta.div);
  const btn = el("button",{className:"btn", text:"Generar"});
  const expBtn = el("button",{className:"btn secondary", text:"Exportar CSV"});
  const out = el("div",{className:"card"});
  card.append(row, btn, expBtn, out);
  view.append(card);

  btn.onclick = ()=>{
    const d = fDesde.input.value ? new Date(fDesde.input.value) : new Date("1970-01-01");
    const h = fHasta.input.value ? new Date(fHasta.input.value) : new Date();
    const ventas = state.ventas.filter(v=>{
      const t = new Date(v.fecha);
      return t>=d && t<=h;
    });
    const total = ventas.reduce((s,v)=> s+(v.totales?.total||0), 0);
    const porPago = {};
    ventas.forEach(v=> (v.pagos||[]).forEach(p=> porPago[p.tipo] = (porPago[p.tipo]||0)+p.monto ));
    out.innerHTML = `
      <b>Total vendido:</b> $${fmt(total)}<br/>
      <b>Por forma de pago:</b> ${Object.entries(porPago).map(([k,v])=>`${k}: $${fmt(v)}`).join(" · ") || "—"}
    `;
  };

  expBtn.onclick = ()=>{
    const rows = [["Folio","Fecha","Total","Pagos","Items"]];
    state.ventas.forEach(v=>{
      rows.push([
        v.folio, v.fecha, fmt(v.totales?.total||0),
        (v.pagos||[]).map(p=>`${p.tipo}:${fmt(p.monto)}`).join("|"),
        (v.items||[]).map(i=>`${i.nombre}x${i.cantidad}`).join("|"),
      ]);
    });
    const csv = rows.map(r=>r.map(s=>`"${String(s).replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadText("reporte_ventas.csv", csv);
  };
}

/* -------- Historial -------- */
function renderHistorial(view){
  const card = el("div",{className:"card"});
  card.append(el("h3",{text:"Historial de tickets"}));
  const table = el("table",{className:"table"});
  table.innerHTML = "<thead><tr><th>Folio</th><th>Fecha</th><th>Total</th><th></th></tr></thead>";
  const tbody = el("tbody");
  table.append(tbody); card.append(table); view.append(card);

  state.historial.slice().reverse().forEach(v=>{
    const tr = el("tr");
    tr.append(el("td",{text:v.folio}), el("td",{text:new Date(v.fecha).toLocaleString()}), el("td",{text:"$"+fmt(v.totales?.total||0)}));
    const td = el("td");
    const btn = el("button",{className:"btn small", text:"Reimprimir"});
    btn.onclick = ()=>{ renderTicket(v); window.print(); };
    td.append(btn); tr.append(td); tbody.append(tr);
  });
}

/* -------- Configuración -------- */
function renderConfig(view){
  const card = el("div",{className:"card"}); view.append(card);
  card.append(el("h3",{text:"Configuración del negocio"}));
  const nombre = inputPair("Nombre negocio"); nombre.input.value = state.negocio.nombre||"";
  const rfc = inputPair("RFC"); rfc.input.value = state.negocio.rfc||"";
  const dir = inputPair("Dirección"); dir.input.value = state.negocio.direccion||"";
  const tel = inputPair("Teléfono"); tel.input.value = state.negocio.telefono||"";
  const wa = inputPair("WhatsApp"); wa.input.value = state.negocio.whatsapp||"";
  const suc = inputPair("Sucursal"); suc.input.value = state.negocio.sucursal||"Principal";
  const msg = inputPair("Mensaje ticket"); msg.input.value = state.negocio.mensajeTicket||"";
  const logo = inputFilePair("Logo (para ticket y barra lateral)");
  const btn = el("button",{className:"btn", text:"Guardar"});
  btn.onclick = ()=>{
    state.negocio = {
      nombre: nombre.input.value.trim()||"Dinamita Gym",
      rfc: rfc.input.value.trim(),
      direccion: dir.input.value.trim(),
      telefono: tel.input.value.trim(),
      whatsapp: wa.input.value.trim(),
      mensajeTicket: msg.input.value.trim(),
      logoDataUrl: logo.dataUrl || state.negocio.logoDataUrl || null,
      sucursal: suc.input.value.trim()||"Principal",
    };
    persist(); alert("Configuración guardada."); location.reload();
  };
  [nombre.div, rfc.div, dir.div, tel.div, wa.div, suc.div, msg.div, logo.div, btn].forEach(x=>card.appendChild(x));
}

/* -------- Ticket (58mm) -------- */
function renderTicket(venta){
  const area = sel("#ticketArea");
  const n = state.negocio;
  const pagoResumen = (venta.pagos||[]).map(p=>`${p.tipo}: $${fmt(p.monto)}`).join(" | ");
  const logoHtml = n.logoDataUrl ? `<img src="${n.logoDataUrl}" style="max-width:100%;max-height:60px;object-fit:contain;"/>` : `<div style="font-weight:bold">DINAMITA</div>`;
  area.innerHTML = `
    <div class="center">${logoHtml}</div>
    <div class="center"><b>${n.nombre||"Dinamita Gym"}</b></div>
    <div class="small center">${n.direccion||""}</div>
    <div class="small center">${n.telefono||""}</div>
    <div class="hr"></div>
    <div>Folio: ${venta.folio}</div>
    <div class="small">Fecha: ${new Date(venta.fecha).toLocaleString()}</div>
    <div class="hr"></div>
    ${(venta.items||[]).map(i=>`<div>${i.nombre} x${i.cantidad}  $${fmt((i.precio-(i.descuento||0))*i.cantidad)}</div>`).join("")}
    <div class="hr"></div>
    <div>Subtotal: $${fmt(venta.totales?.subtotal||0)}</div>
    <div>IVA: $${fmt(venta.totales?.iva||0)}</div>
    <div><b>Total: $${fmt(venta.totales?.total||0)}</b></div>
    <div class="small">Pago: ${pagoResumen || "—"}</div>
    <div class="hr"></div>
    <div class="center small">${n.mensajeTicket||""}</div>
  `;
}

/* -------- Utilidades -------- */
function placeholderImg(){
  // simple base64 1x1 dark
  return "data:image/svg+xml;base64,"+btoa(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#111'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#555' font-family='monospace' font-size='16'>Sin imagen</text></svg>`);
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
