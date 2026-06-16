import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const fileInputRef = useRef(null);
  
  // DATOS
  const [productos, setProductos] = useState(() => {
    const saved = localStorage.getItem('mi_inventario');
    return saved ? JSON.parse(saved) : [];
  });

  const [ordenes, setOrdenes] = useState(() => {
    const saved = localStorage.getItem('mis_ordenes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => localStorage.setItem('mi_inventario', JSON.stringify(productos)), [productos]);
  useEffect(() => localStorage.setItem('mis_ordenes', JSON.stringify(ordenes)), [ordenes]);

  // INVENTARIO
  const [editandoId, setEditandoId] = useState(null);
  const [formProd, setFormProd] = useState({ nombre: '', stock: '', precioCoste: '', precio: '' });

  // VENTAS
  const [busquedaProd, setBusquedaProd] = useState('');
  const [ventaProdId, setVentaProdId] = useState('');
  const [ventaCantidad, setVentaCantidad] = useState(1);
  const [ventaPrecioOp, setVentaPrecioOp] = useState('');
  const [ventaCliente, setVentaCliente] = useState('');

  // --- LÓGICA INVENTARIO ---
  const guardarProducto = (e) => {
    e.preventDefault();
    if (editandoId) {
      setProductos(productos.map(p => p.id === editandoId ? { ...p, ...formProd, stock: parseInt(formProd.stock), precioCoste: parseInt(formProd.precioCoste), precio: parseInt(formProd.precio) } : p));
      setEditandoId(null);
    } else {
      setProductos([...productos, { id: Date.now(), ...formProd, stock: parseInt(formProd.stock), precioCoste: parseInt(formProd.precioCoste), precio: parseInt(formProd.precio) }]);
    }
    setFormProd({ nombre: '', stock: '', precioCoste: '', precio: '' });
  };

  const iniciarEdicion = (p) => {
    setEditandoId(p.id);
    setFormProd({ nombre: p.nombre, stock: p.stock, precioCoste: p.precioCoste, precio: p.precio });
    window.scrollTo(0, 0);
  };

  const borrarProducto = (id) => {
    if (window.confirm("¿Borrar producto?")) setProductos(productos.filter(p => p.id !== id));
  };

  // --- LÓGICA VENTAS ---
  const registrarTransaccion = (estado, esConsignacion = false) => {
    if (!ventaProdId || ventaCantidad < 1) return alert("Selecciona un producto y cantidad.");
    
    const productoInfo = productos.find(p => p.id === parseInt(ventaProdId));
    if (productoInfo.stock < ventaCantidad) return alert('¡No hay stock suficiente!');

    setProductos(productos.map(p => p.id === productoInfo.id ? { ...p, stock: p.stock - ventaCantidad } : p));

    const precioFinal = ventaPrecioOp !== '' ? parseInt(ventaPrecioOp) : productoInfo.precio;
    const montoTotal = ventaCantidad * precioFinal;
    const costoTotal = ventaCantidad * productoInfo.precioCoste;

    const nuevaOrden = {
      id: Date.now(),
      productoId: productoInfo.id,
      nombre: productoInfo.nombre,
      cantidad: ventaCantidad,
      precioUnitarioCobrado: precioFinal,
      total: montoTotal,
      costo: costoTotal,
      estado: estado, 
      cliente: ventaCliente || 'Sin nombre',
      fecha: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      fechaCorta: new Date().toLocaleDateString('es-CL')
    };
    
    setOrdenes([...ordenes, nuevaOrden]);
    
    setVentaProdId(''); setVentaCantidad(1); setVentaPrecioOp(''); setVentaCliente(''); setBusquedaProd('');
    setActiveTab(esConsignacion ? 'ordenes' : 'ordenes');
  };

  const cambiarEstadoOrden = (id, nuevoEstado) => {
    setOrdenes(ordenes.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o));
  };

  const resolverConsignacion = (id, cantidadVendida) => {
    const orden = ordenes.find(o => o.id === id);
    if(cantidadVendida < 0 || cantidadVendida > orden.cantidad) return alert("Cantidad inválida");

    const stockSobrante = orden.cantidad - cantidadVendida;
    if(stockSobrante > 0) {
      setProductos(productos.map(p => p.id === orden.productoId ? { ...p, stock: p.stock + stockSobrante } : p));
    }

    const nuevoTotal = cantidadVendida * orden.precioUnitarioCobrado;
    const nuevoCosto = cantidadVendida * (orden.costo / orden.cantidad);

    setOrdenes(ordenes.map(o => o.id === id ? { 
      ...o, 
      cantidad: cantidadVendida, 
      total: nuevoTotal, 
      costo: nuevoCosto,
      estado: cantidadVendida > 0 ? 'completada' : 'cancelada' 
    } : o));
  };

  // --- IMPORTAR / EXPORTAR ---
  const exportarCSV = () => {
    const encabezados = "ID,Fecha,Cliente,Producto,Cantidad,Estado,Total Cobrado,Costo\n";
    const filas = ordenes.map(o => `${o.id},${o.fechaCorta},${o.cliente},${o.nombre},${o.cantidad},${o.estado},${o.total},${o.costo}`).join("\n");
    const blob = new Blob([encabezados + filas], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "respaldo_ventas.csv";
    link.click();
    setMenuAbierto(false);
  };

  const exportarJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({productos, ordenes}));
    const link = document.createElement("a");
    link.href = dataStr;
    link.download = "backup_completo.json";
    link.click();
    setMenuAbierto(false);
  };

  const importarJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (window.confirm("Importar un respaldo reemplazará los datos actuales. ¿Deseas continuar?")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.productos && data.ordenes) {
            setProductos(data.productos);
            setOrdenes(data.ordenes);
            alert("Datos importados correctamente.");
          } else {
            alert("El archivo no tiene el formato válido.");
          }
        } catch (error) {
          alert("Error al leer el archivo JSON.");
        }
      };
      reader.readAsText(file);
    }
    event.target.value = null;
    setMenuAbierto(false);
  };

  // --- STATS ---
  const ventasValidas = ordenes.filter(o => o.estado === 'completada');
  const gananciaBruta = ventasValidas.reduce((acc, o) => acc + o.total, 0);
  const costosDeVentas = ventasValidas.reduce((acc, o) => acc + o.costo, 0);
  const gananciaLimpia = gananciaBruta - costosDeVentas;
  const cantVentas = ventasValidas.length;
  
  const costoStockActual = productos.reduce((acc, p) => acc + (p.stock * p.precioCoste), 0);
  const costoOrdenesPendientes = ordenes.filter(o => o.estado !== 'completada' && o.estado !== 'cancelada').reduce((acc, o) => acc + o.costo, 0);
  const totalGastado = costoStockActual + costoOrdenesPendientes + costosDeVentas;

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busquedaProd.toLowerCase()));

  return (
    <>
      <div className="header">
        <button className="menu-btn" onClick={() => setMenuAbierto(true)}>☰</button>
        <span>Gestor de Ventas</span>
        <div style={{width: '30px'}}></div>
      </div>

      {/* Menú Lateral */}
      <div className={`sidebar-overlay ${menuAbierto ? 'open' : ''}`} onClick={() => setMenuAbierto(false)}></div>
      <div className={`sidebar ${menuAbierto ? 'open' : ''}`}>
        <h2 style={{marginTop: '20px', color: 'var(--primary)'}}>Opciones</h2>
        
        <button className="btn btn-primary" onClick={exportarCSV} style={{marginBottom: '10px'}}>Exportar CSV (Excel)</button>
        <button className="btn btn-primary" onClick={exportarJSON} style={{marginBottom: '30px'}}>Respaldar Datos (JSON)</button>
        
        <h3 style={{fontSize: '1rem', color: 'var(--text)'}}>Restaurar Sistema</h3>
        <input type="file" ref={fileInputRef} style={{display: 'none'}} accept=".json" onChange={importarJSON} />
        <button className="btn btn-outline" onClick={() => fileInputRef.current.click()}>Importar Backup (JSON)</button>
        
        <p style={{fontSize: '0.8rem', color: 'gray', marginTop: '20px'}}>El CSV es ideal para ver en hojas de cálculo. El JSON sirve para recuperar la app y el inventario en otro dispositivo.</p>
      </div>

      <div className="container">
        
        {/* VISTA INVENTARIO */}
        {activeTab === 'productos' && (
          <div>
            <div className="card">
              <h2 className="card-title">{editandoId ? 'Editar Producto' : 'Crear Producto'}</h2>
              <form onSubmit={guardarProducto}>
                <div className="input-group">
                  <label>Nombre del producto</label>
                  <input required value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} placeholder="Ej. Frutillas grandes" />
                </div>
                <div className="flex-between gap-2">
                  <div className="input-group">
                    <label>Stock</label>
                    <input type="number" min="0" required value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Costo ($)</label>
                    <input type="number" min="0" required value={formProd.precioCoste} onChange={e => setFormProd({...formProd, precioCoste: e.target.value})} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Precio Venta ($)</label>
                  <input type="number" min="0" required value={formProd.precio} onChange={e => setFormProd({...formProd, precio: e.target.value})} />
                </div>
                <div className="flex-gap">
                  <button type="submit" className="btn btn-primary">{editandoId ? 'Actualizar' : 'Guardar'}</button>
                  {editandoId && <button type="button" onClick={() => {setEditandoId(null); setFormProd({nombre:'', stock:'', precioCoste:'', precio:''})}} className="btn btn-danger" style={{width: '40%'}}>Cancelar</button>}
                </div>
              </form>
            </div>

            <h3 style={{color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginTop: '20px'}}>Stock ({productos.length})</h3>
            {productos.slice().reverse().map(p => (
              <div key={p.id} className="card item-list flex-between" style={{padding: '12px'}}>
                <div>
                  <div style={{fontWeight: 'bold'}}>{p.nombre}</div>
                  <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>V: ${p.precio} | C: ${p.precioCoste}</div>
                  <div className="flex-gap" style={{marginTop: '6px'}}>
                    <button onClick={() => iniciarEdicion(p)} className="btn btn-info btn-small">Editar</button>
                    <button onClick={() => borrarProducto(p.id)} className="btn btn-danger btn-small">Borrar</button>
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: '900', fontSize: '1.2rem'}}>{p.stock}</div>
                  <div style={{color: 'var(--text-muted)', fontSize: '0.7rem'}}>disp.</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA VENDER */}
        {activeTab === 'ventas' && (
          <div className="card">
            <h2 className="card-title">Registrar Salida</h2>
            
            <div className="input-group">
              <label>Buscar / Seleccionar Producto</label>
              <input type="text" placeholder="Escribe para buscar..." value={busquedaProd} onChange={e => setBusquedaProd(e.target.value)} style={{marginBottom: '8px'}}/>
              <select value={ventaProdId} onChange={e => setVentaProdId(e.target.value)}>
                <option value="">Selecciona...</option>
                {productosFiltrados.filter(p => p.stock > 0).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (Disp: {p.stock})</option>
                ))}
              </select>
            </div>
            
            <div className="flex-between gap-2">
              <div className="input-group" style={{width: '30%'}}>
                <label>Cant.</label>
                <input type="number" min="1" value={ventaCantidad} onChange={e => setVentaCantidad(e.target.value)} />
              </div>
              <div className="input-group" style={{width: '70%'}}>
                <label>Precio Especial C/U</label>
                <input type="number" placeholder="Opcional" value={ventaPrecioOp} onChange={e => setVentaPrecioOp(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label>Cliente / Referencia (Opcional)</label>
              <input type="text" placeholder="Ej. Juan o Local Centro" value={ventaCliente} onChange={e => setVentaCliente(e.target.value)} />
            </div>
            
            <div style={{marginTop: '16px'}}>
              <button onClick={() => registrarTransaccion('completada')} className="btn btn-success">Venta Directa</button>
              <div className="flex-gap">
                <button onClick={() => registrarTransaccion('pendiente')} className="btn btn-warning">Debe y No Entregado</button>
                <button onClick={() => registrarTransaccion('pagado_no_entregado')} className="btn btn-info">Pagó pero No Entregado</button>
              </div>
              <button onClick={() => registrarTransaccion('consignacion', true)} className="btn btn-purple">Dejar en Consignación</button>
            </div>
          </div>
        )}

        {/* VISTA ÓRDENES */}
        {activeTab === 'ordenes' && (
          <div>
            <h3 style={{color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '10px'}}>Por Gestionar</h3>
            
            {ordenes.filter(o => ['pendiente', 'pagado_no_entregado'].includes(o.estado)).slice().reverse().map(o => (
              <div key={o.id} className="card" style={{border: o.estado === 'pendiente' ? '1px solid #fde68a' : '1px solid #bfdbfe', padding: '12px'}}>
                <div className="flex-between">
                  <div>
                    <span className={`badge ${o.estado === 'pendiente' ? 'badge-pending' : 'badge-paid'}`}>
                      {o.estado === 'pendiente' ? 'PENDIENTE PAGO' : 'PAGADO - FALTA ENTREGAR'}
                    </span>
                    <div style={{fontWeight: 'bold', fontSize: '1.1rem', margin: '4px 0'}}>{o.cantidad}x {o.nombre}</div>
                    <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>{o.cliente} • ${o.total}</div>
                  </div>
                </div>
                <div className="flex-gap" style={{marginTop: '10px'}}>
                  {o.estado === 'pendiente' && <button onClick={() => cambiarEstadoOrden(o.id, 'pagado_no_entregado')} className="btn btn-info btn-small">Marcar Pagado</button>}
                  <button onClick={() => cambiarEstadoOrden(o.id, 'completada')} className="btn btn-success btn-small">Finalizar Todo</button>
                </div>
              </div>
            ))}

            <h3 style={{color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginTop: '20px', marginBottom: '10px'}}>Consignaciones Activas</h3>
            {ordenes.filter(o => o.estado === 'consignacion').slice().reverse().map(o => (
               <div key={o.id} className="card" style={{border: '1px solid #e9d5ff', padding: '12px'}}>
                 <span className="badge badge-consignment">CONSIGNACIÓN</span>
                 <div style={{fontWeight: 'bold', fontSize: '1.1rem', margin: '4px 0'}}>{o.cantidad}x {o.nombre}</div>
                 <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>Dejado en: {o.cliente}</div>
                 
                 <div className="flex-gap" style={{marginTop: '10px', alignItems: 'center'}}>
                    <input type="number" id={`cons_${o.id}`} placeholder="Cant. Vendida" style={{width: '100px', padding: '8px'}} min="0" max={o.cantidad}/>
                    <button onClick={() => {
                      const input = document.getElementById(`cons_${o.id}`);
                      resolverConsignacion(o.id, parseInt(input.value || 0));
                    }} className="btn btn-purple btn-small">Liquidar</button>
                 </div>
               </div>
            ))}

            {ordenes.filter(o => ['pendiente', 'pagado_no_entregado', 'consignacion'].includes(o.estado)).length === 0 && (
              <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>Todo limpio.</div>
            )}
          </div>
        )}

        {/* VISTA ESTADÍSTICAS */}
        {activeTab === 'estadisticas' && (
          <div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px'}}>
              <div className="stat-box">
                <div className="stat-label">Inversión</div>
                <div className="stat-value" style={{color: 'var(--text-muted)'}}>${totalGastado}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Ingresos</div>
                <div className="stat-value" style={{color: '#3b82f6'}}>${gananciaBruta}</div>
              </div>
              <div className="stat-box" style={{gridColumn: '1 / -1', background: '#ecfdf5', borderColor: '#a7f3d0'}}>
                <div className="stat-label" style={{color: '#059669'}}>Ganancia Neta</div>
                <div className="stat-value" style={{color: '#10b981', fontSize: '1.6rem'}}>${gananciaLimpia}</div>
              </div>
              <div className="stat-box" style={{gridColumn: '1 / -1'}}>
                <div className="stat-label">Ventas Concretadas</div>
                <div className="stat-value">{cantVentas}</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '10px'}}>Historial Reciente</h3>
              {ventasValidas.slice().reverse().map(o => (
                <div key={o.id} style={{borderBottom: '1px solid #f3f4f6', padding: '8px 0', display: 'flex', justifyContent: 'space-between'}}>
                  <div>
                    <span style={{fontWeight: '600', fontSize: '0.85rem'}}>{o.cantidad}x {o.nombre}</span>
                    <span style={{display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)'}}>{o.cliente} • ${o.precioUnitarioCobrado} c/u</span>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <span style={{fontWeight: 'bold', color: '#059669', fontSize: '0.85rem'}}>+${o.total}</span>
                    <span style={{display: 'block', fontSize: '0.7rem', color: '#ef4444'}}>-${o.costo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="nav-bottom">
        <button className={`nav-item ${activeTab === 'productos' ? 'active' : ''}`} onClick={() => setActiveTab('productos')}>Stock</button>
        <button className={`nav-item ${activeTab === 'ventas' ? 'active' : ''}`} onClick={() => setActiveTab('ventas')}>Vender</button>
        <button className={`nav-item ${activeTab === 'ordenes' ? 'active' : ''}`} onClick={() => setActiveTab('ordenes')}>Órdenes</button>
        <button className={`nav-item ${activeTab === 'estadisticas' ? 'active' : ''}`} onClick={() => setActiveTab('estadisticas')}>Stats</button>
      </nav>
    </>
  );
}
