/*
 * MODO DEMO — Sistema de Administración Comercial (SAC)
 * ------------------------------------------------------------------
 * Este archivo reemplaza al backend: intercepta fetch('/api/...') y responde con
 * datos de demostración generados en memoria. No hay servidor de datos, base de
 * datos ni archivo JSON persistente: todo lo que se cargue/edite en la demo vive
 * en memoria y se reinicia al recargar la página.
 *
 *   Login: cualquier usuario y contraseña sirven.
 */
(function () {
  'use strict';

  var APP_VERSION = '1.1';
  var realFetch = window.fetch ? window.fetch.bind(window) : null;

  // ---- utilidades -------------------------------------------------------
  function serial(y, m, d) { return Math.floor((Date.UTC(y, m, d) - Date.UTC(1899, 11, 30)) / 86400000); }
  // Generador pseudo-aleatorio determinístico: la demo se ve igual en cada carga.
  var seed = 20260705;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  function between(a, b) { return a + rnd() * (b - a); }
  function round(n, step) { step = step || 100; return Math.round(n / step) * step; }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  // ---- datos ------------------------------------------------------------
  function buildData() {
    var now = new Date();
    var year = 2026;
    var today = serial(now.getFullYear(), now.getMonth(), now.getDate());
    var start = serial(year, 0, 5);
    var end = Math.min(today, serial(year, 11, 31));
    if (now.getFullYear() !== year) end = serial(year, 9, 5); // demo congelada si el año no coincide

    var ventas = [], compras = [], gastos = [], pagosProveedores = [], aportesSocios = [], otrosIngresos = [];
    var socios = ['Martín', 'Tomás', 'Gabriel', 'Andrés'];

    // Aportes iniciales de capital
    var aportesIni = [
      [serial(year, 0, 5), 'Andrés', 3200000, 'Aporte de capital inicial'],
      [serial(year, 0, 5), 'Martín', 2800000, 'Aporte de capital inicial'],
      [serial(year, 0, 6), 'Tomás', 2400000, 'Aporte de capital inicial'],
      [serial(year, 0, 6), 'Gabriel', 2000000, 'Aporte de capital inicial'],
      [serial(year, 3, 14), 'Andrés', 930300, 'Refuerzo de caja'],
      [serial(year, 6, 10), 'Martín', 350000, '']
    ];
    aportesIni.forEach(function (a) {
      if (a[0] <= end) aportesSocios.push({ fecha: a[0], socio: a[1], monto: a[2], obs: a[3] });
    });

    // Ventas diarias (lunes a sábado)
    var cierre = 1;
    for (var day = start; day <= end; day++) {
      var dt = new Date(Math.round((day - 25569) * 86400000));
      var dow = dt.getUTCDay();
      if (dow === 0) continue;
      var monthIdx = dt.getUTCMonth();
      var season = 1 + 0.18 * Math.sin((monthIdx - 1) / 12 * Math.PI * 2) + monthIdx * 0.015;
      var weekend = dow === 6 ? 1.25 : dow === 5 ? 1.1 : 1;
      var base = 520000 * season * weekend;
      var canales = [
        ['Ventas Contado', 0.46],
        ['Ventas Trasnferencia', 0.34],
        ['Ventas Qr - Debito', 0.20]
      ];
      canales.forEach(function (c) {
        if (c[0] !== 'Ventas Contado' && rnd() < 0.18) return;
        var total = round(base * c[1] * between(0.75, 1.3), 100);
        var costo = round(total * between(0.62, 0.72), 100);
        var partes = 5;
        for (var pt = 0; pt < partes; pt++) {
          var tp = round(total / partes * between(0.8, 1.2), 100);
          ventas.push({ dia: day, nCierre: 'Cierre ' + (cierre++), canal: c[0], total: tp, costo: round(tp * costo / (total || 1), 100), mes: day, estado: rnd() < 0.03 ? '#REF!' : 'Completado', obs: ['Turno mañana', 'Turno tarde', 'Salón', 'Mostrador', 'Reparto'][pt] });
        }
      });
      if (dow === 3 && rnd() < 0.7) {
        var tl = round(between(380000, 780000), 100);
        ventas.push({ dia: day, nCierre: 'LDC ' + (cierre++), canal: 'Mercaderia Vendida a LDC', total: tl, costo: round(tl * 0.8, 100), mes: day, estado: 'Completado', obs: 'Entrega semanal LDC' });
      }
    }
    if (end >= serial(year, 6, 8)) {
      ventas.push({ dia: serial(year, 6, 8), nCierre: 'Nota de credito', canal: '(-) Reembolsos/Devoluciones', total: 220000, costo: 0, mes: serial(year, 6, 1), estado: 'Completado', obs: 'Nota de crédito don panificado' });
    }

    // Compras de mercadería a proveedores
    var provs = [
      ['Chammas', 'A Cuenta Chammas', 520000, 900000],
      ['Dulcy', 'A Cuenta Dulcy y Aceite', 900000, 1500000],
      ['Premium', 'A Cuenta Premium', 80000, 220000],
      ['RyE', 'A Cuenta RyE', 700000, 1300000],
      ['Otro', 'A Cuenta Harinas', 600000, 950000],
      ['Don Panificado', 'Contado', 300000, 650000],
      ['Distribuidora Norte', 'Transferencia', 450000, 800000]
    ];
    var sums = {};
    for (var d2 = start + 1; d2 <= end; d2 += 1) for (var rep2 = 0; rep2 < 2; rep2++) {
      var p = pick(provs);
      var val = round(between(p[2], p[3]) * 0.2, 100);
      var venc = d2 + pick([7, 10, 14, 21]);
      compras.push({ vencimiento: venc, fecha: d2, proveedor: p[0], valor: val, formaPago: p[1], obs: p[0] === 'Otro' ? 'Blunno' : '' });
      sums[p[0]] = (sums[p[0]] || 0) + val;
    }

    // Pagos a proveedores (cancelan ~85% de lo comprado, así queda una deuda pendiente realista)
    Object.keys(sums).forEach(function (name) {
      var target = sums[name] * 0.85;
      var paid = 0;
      for (var d3 = start + 14; d3 <= end && paid < target; d3 += pick([1, 2, 3])) {
        var v = Math.min(round(between(400000, 1200000) * 0.18, 100), target - paid);
        if (v < 5000) break;
        pagosProveedores.push({ fecha: d3, mes: serial(new Date(Math.round((d3 - 25569) * 86400000)).getUTCFullYear(), new Date(Math.round((d3 - 25569) * 86400000)).getUTCMonth(), 1), proveedor: name, valor: v, formaPago: pick(['Transferencia', 'Contado', 'Transferencia']), obs: '' });
        paid += v;
      }
    });

    // Gastos operativos
    var cats = [
      ['Gastos', 2000, 9000, 'Contado'], ['Descartables', 4500, 22000, 'Contado'], ['Combustible', 25000, 70000, 'Contado'],
      ['Gastos Vehiculo', 30000, 120000, 'Transferencia'], ['Gastos Mejoras', 40000, 180000, 'Transferencia'], ['Publicidad', 20000, 90000, 'Transferencia']
    ];
    for (var d4 = start; d4 <= end; d4 += 1) for (var rep4 = 0; rep4 < 2 + (d4 % 2); rep4++) {
      var c = pick(cats);
      var gv = round(between(c[1], c[2]) * 0.4, 100);
      gastos.push({ vencimiento: d4, fecha: d4, categoria: c[0], valor: gv, formaPago: c[3], obs: c[0] === 'Gastos' ? pick(['Hielo', 'Viáticos', 'Limpieza', 'Librería', '']) : '' });
    }
    // Retiros mensuales de socios
    for (var m = 0; m < 12; m++) {
      var rd = serial(year, m, 28);
      if (rd > end) break;
      socios.forEach(function (s, i) {
        gastos.push({ vencimiento: rd, fecha: rd, categoria: 'Retiro ' + s, valor: 250000 + i * 40000, formaPago: 'Transferencia ' + s, obs: 'Retiro mensual' });
      });
      if (m % 2 === 1) gastos.push({ vencimiento: rd, fecha: rd, categoria: 'Retiros a LDC', valor: round(between(300000, 600000), 1000), formaPago: 'Mercadería', obs: 'Movimiento de mercadería' });
    }

    // Crédito: desembolso + pagos semanales de 417.000
    var creditos = [], creditoPagos = [];
    var cStart = serial(year, 1, 16);
    if (cStart <= end) {
      creditos.push({ nombre: 'Crédito credito.demo', monto: 10008000, fecha: cStart, obs: 'Cronograma original de 24 cuotas' });
      otrosIngresos.push({ tipo: 'credito', monto: 10008000, fecha: cStart, detalle: 'Crédito credito.demo', obs: 'Desembolso del crédito', origen: 'app' });
      for (var w = 1; w <= 24; w++) {
        var pd = cStart + w * 7;
        if (pd > end) break;
        creditoPagos.push({ credito: 'Crédito credito.demo', valor: 417000, formaPago: 'Transferencia', fecha: pd, obs: 'Cuota semana ' + w + (w % 2 ? ' — abonado por Andrés' : ' — abonado por Martín') });
      }
    }
    var c2 = serial(year, 6, 10);
    if (c2 <= end) {
      creditos.push({ nombre: 'Crédito insumos julio', monto: 500000, fecha: c2, obs: '' });
      otrosIngresos.push({ tipo: 'credito', monto: 500000, fecha: c2, detalle: 'Crédito insumos julio', obs: 'Desembolso del crédito', origen: 'app' });
      creditoPagos.push({ credito: 'Crédito insumos julio', valor: 125000, formaPago: 'Contado', fecha: Math.min(end, c2 + 30), obs: 'Cuota 1' });
    }

    function byFechaDesc(k) { return function (a, b) { return (b[k] || 0) - (a[k] || 0); }; }
    ventas.sort(byFechaDesc('dia')); compras.sort(byFechaDesc('fecha')); gastos.sort(byFechaDesc('fecha'));
    pagosProveedores.sort(byFechaDesc('fecha')); creditoPagos.sort(byFechaDesc('fecha')); aportesSocios.sort(byFechaDesc('fecha'));

    return {
      empresa: 'Provee Alimentos',
      anio: year,
      meses: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      saldoInicial: 0,
      creditoAlias: 'credito.demo',
      socios: socios.map(function (n) { return { nombre: n }; }),
      ventas: ventas, compras: compras, gastos: gastos, pagosProveedores: pagosProveedores,
      aportesSocios: aportesSocios, creditos: creditos, creditoPagos: creditoPagos, otrosIngresos: otrosIngresos
    };
  }

  // ---- "servidor" en memoria ---------------------------------------------
  var store = buildData();
  var session = false;
  try { session = sessionStorage.getItem('sac_demo_session') === '1'; } catch (e) {}

  function json(status, body) {
    return new Response(JSON.stringify(body), { status: status, headers: { 'Content-Type': 'application/json' } });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (path.indexOf('/api/') !== 0) return realFetch ? realFetch(input, init) : Promise.reject(new Error('fetch no disponible'));

    return wait(180 + Math.random() * 220).then(function () {
      if (path === '/api/version') return json(200, { version: APP_VERSION });
      if (path === '/api/login' && method === 'POST') {
        session = true;
        try { sessionStorage.setItem('sac_demo_session', '1'); } catch (e) {}
        return json(200, { ok: true });
      }
      if (path === '/api/logout') {
        session = false;
        try { sessionStorage.removeItem('sac_demo_session'); } catch (e) {}
        return json(200, { ok: true });
      }
      if (!session) return json(401, { error: 'No autenticado' });
      if (path === '/api/data' && method === 'GET') return json(200, JSON.parse(JSON.stringify(store)));
      if (path === '/api/data' && method === 'PUT') {
        try { store = JSON.parse((init && init.body) || '{}'); } catch (e) { return json(400, { error: 'Cuerpo inválido' }); }
        return json(200, { ok: true });
      }
      if (path === '/api/backup') return json(200, store);
      return json(404, { error: 'Endpoint simulado no encontrado' });
    });
  };
})();
