import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('ventas');
  
  // DATOS PRINCIPALES
  const [productos, setProductos] = useState(() => {
    const saved = localStorage.getItem('mi_inventario');
    return saved ? JSON.parse(saved) : [{ id: 1, nombre: 'Frutillas con crema', stock: 20, precioCoste: 1500, precio: 3500 }];
  });

  const [ordenes, setOrdenes] = useState(() => {
    const saved = localStorage.getItem('mis_ordenes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => localStorage.setItem('mi_inventario', JSON.stringify(productos)), [productos]);
  useEffect(() => localStorage.setItem('mis_ordenes', JSON.stringify(ordenes)), [ordenes]);

  // ESTADOS FORMULARIO INVENTARIO (CRUD)
  const [editandoId, setEditandoId] = useState(null);
  const [formProd, setFormProd] = useState({ nombre: '', stock: '', precioCoste: '', precio: '' });

  // ESTADOS FORMULARIO VENTAS
  const [ventaProdId, setVentaProdId] = useState('');
  const [ventaCantidad, setVentaCantidad] = useState(1);
  const [ventaPrecioOp, setVentaPrecioOp] = useState('');

  // --- LÓGICA DE INVENTARIO (CRUD) ---
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
    if (window.confirm("¿Seguro que quieres borrar este producto? Las ventas pasadas no se borrarán.")) {
      setProductos(productos.filter(p => p.id !== id));
    }
  };

  // --- LÓGICA DE VENTAS ---
  const registrarTransaccion = (tipo) => {
    if (!ventaProdId || ventaCantidad < 1) return alert("Selecciona un producto y cantidad válida.");
    
    const productoInfo = productos.find(p => p.id === parseInt(ventaProdId));
    if (productoInfo.stock < ventaCantidad) return alert('¡No hay suficiente stock!');

    // Descontar stock
    setProductos(productos.map(p => p.id === productoInfo.id ? { ...p, stock: p.stock - ventaCantidad } : p));

    // Calcular totales (usar el precio opcional si se ingresó, si no, usar el precio base)
    const precioFinalUnitario = ventaPrecioOp !== '' ? parseInt(ventaPrecioOp) : productoInfo.precio;
    const montoTotal = ventaCantidad * precioFinalUnitario;
    const costoTotal = ventaCantidad * productoInfo.precioCoste;

    const nuevaOrden = {
      id: Date.now(),
      productoId: productoInfo.id,
      nombre: productoInfo.nombre,
      cantidad: ventaCantidad,
      precioUnitarioCobrado: precioFinalUnitario,
      total: montoTotal,
      costo: costoTotal,
      estado: tipo, 
      fecha: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setOrdenes([...ordenes, nuevaOrden]);
    
    // Limpiar formulario de venta
    setVentaProdId('');
    setVentaCantidad(1);
    setVentaPrecioOp('');
    setActiveTab('ordenes');
  };

  const completarOrden = (id) => {
    setOrdenes(ordenes.map(o => o.id === id ? { ...o, estado: 'completada' } : o));
  };

  // --- LÓGICA DE ESTADÍSTICAS ---
  const ventasCompletadas = ordenes.filter(o => o.estado === 'completada');
  const gananciaBruta = ventasCompletadas.reduce((acc, o) => acc + o.total, 0);
  const costosDeVentas = ventasCompletadas.reduce((acc, o) => acc + o.costo, 0);
  const gananciaLimpia = gananciaBruta - costosDeVentas;
  
  // Total gastado = Costo del stock actual (en bodega) + Costo de TODO lo que ya se registró (vendido o pendiente)
  const costoStockActual = productos.reduce((acc, p) => acc + (p.stock * p.precioCoste), 0);
  const costoOrdenesGeneradas = ordenes.reduce((acc, o) => acc + o.costo, 0);
  const totalGastado = costoStockActual + costoOrdenesGeneradas;

  return (
    <>
      <div className="header">
        Gestor de Ventas
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
                  <div className="input-group" style={{width: '50%'}}>
                    <label>Stock Disp.</label>
                    <input type="number" min="0" required value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} />
                  </div>
                  <div className="input-group" style={{width: '50%'}}>
                    <label>Costo de Hacerlo ($)</label>
                    <input type="number" min="0" required value={formProd.precioCoste} onChange={e => setFormProd({...formProd, precioCoste: e.target.value})} />
                  </div>
                </div>

                <div className="input-group">
                  <label>Precio de Venta Sugerido ($)</label>
                  <input type="number" min="0" required value={formProd.precio} onChange={e => setFormProd({...formProd, precio: e.target.value})} />
                </div>

                <div className="flex-gap">
                  <button type="submit" className="btn btn-primary">{editandoId ? 'Actualizar' : 'Guardar Producto'}</button>
                  {editandoId && <button type="button" onClick={() => {setEditandoId(null); setFormProd({nombre:'', stock:'', precioCoste:'', precio:''})}} className="btn btn-danger" style={{width: '30%'}}>Cancelar</button>}
                </div>
              </form>
            </div>

            <h3 style={{color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', marginTop: '24px'}}>Inventario Actual</h3>
            {productos.map(p => (
              <div key={p.id} className="card item-list flex-between">
                <div>
                  <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{p.nombre}</div>
                  <div style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Venta: ${p.precio} | Costo: ${p.precioCoste}</div>
                  <div className="flex-gap" style={{marginTop: '8px'}}>
                    <button onClick={() => iniciarEdicion(p)} className="btn btn-info btn-small">Editar</button>
                    <button onClick={() => borrarProducto(p.id)} className="btn btn-danger btn-small">Borrar</button>
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: '900', fontSize: '1.4rem'}}>{p.stock}</div>
                  <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>disp.</div>
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
              <label>Producto a vender</label>
              <select value={ventaProdId} onChange={e => setVentaProdId(e.target.value)}>
                <option value="">Selecciona un producto...</option>
                {productos.filter(p => p.stock > 0).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (Quedan {p.stock})</option>
                ))}
              </select>
            </div>
            
            <div className="flex-between gap-2">
              <div className="input-group" style={{width: '30%'}}>
                <label>Cant.</label>
                <input type="number" min="1" value={ventaCantidad} onChange={e => setVentaCantidad(e.target.value)} />
              </div>
              
              <div className="input-group" style={{width: '70%'}}>
                <label>Precio Opcional (C/U) - Si hubo dto.</label>
                <input type="number" placeholder="Dejar vacío para usar normal" value={ventaPrecioOp} onChange={e => setVentaPrecioOp(e.target.value)} />
              </div>
            </div>
            
            <div style={{marginTop: '24px'}}>
              <button onClick={() => registrarTransaccion('completada')} className="btn btn-success">
                Venta Pagada (Instantánea)
              </button>
              <button onClick={() => registrarTransaccion('pendiente')} className="btn btn-warning">
                Añadir Pedido (Pendiente)
              </button>
            </div>
          </div>
        )}

        {/* VISTA ÓRDENES */}
        {activeTab === 'ordenes' && (
          <div>
            <h3 style={{color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '12px'}}>Órdenes en Espera</h3>
            {ordenes.filter(o => o.estado === 'pendiente').map(o => (
              <div key={o.id} className="card" style={{border: '1px solid #fde68a'}}>
                <div className="flex-between">
                  <div>
                    <span className="badge badge-pending">PENDIENTE</span>
                    <div style={{fontWeight: 'bold', fontSize: '1.2rem', margin: '8px 0'}}>{o.cantidad}x {o.nombre}</div>
                    <div style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Hora: {o.fecha} • Cobrado: ${o.total}</div>
                  </div>
                </div>
                <button onClick={() => completarOrden(o.id)} className="btn btn-warning">
                  Marcar como Entregado/Pagado
                </button>
              </div>
            ))}
            
            {ordenes.filter(o => o.estado === 'pendiente').length === 0 && (
              <div style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>
                No hay órdenes pendientes.
              </div>
            )}

            <h3 style={{color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', marginTop: '30px', marginBottom: '12px'}}>Recientes Completadas</h3>
            {ordenes.filter(o => o.estado === 'completada').slice(-10).reverse().map(o => (
              <div key={o.id} className="card flex-between" style={{opacity: 0.7, padding: '16px'}}>
                <div>
                  <div style={{fontWeight: 'bold'}}>{o.cantidad}x {o.nombre}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{o.fecha}</div>
                </div>
                <div style={{fontWeight: 'bold', color: '#059669'}}>${o.total}</div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA ESTADÍSTICAS */}
        {activeTab === 'estadisticas' && (
          <div>
            <h2 className="card-title" style={{marginBottom: '16px'}}>Resumen del Negocio</h2>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px'}}>
              <div className="stat-box">
                <div className="stat-label">Inversión / Gastado</div>
                <div className="stat-value" style={{color: 'var(--text-muted)'}}>${totalGastado}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Ganancia Bruta (Ingresos)</div>
                <div className="stat-value" style={{color: '#3b82f6'}}>${gananciaBruta}</div>
              </div>
              <div className="stat-box" style={{gridColumn: '1 / -1', background: '#ecfdf5', borderColor: '#a7f3d0'}}>
                <div className="stat-label" style={{color: '#059669'}}>Ganancia Limpia (Neta)</div>
                <div className="stat-value" style={{color: '#10b981', fontSize: '1.8rem'}}>${gananciaLimpia}</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '12px'}}>Historial Completo de Ventas</h3>
              {ventasCompletadas.length === 0 ? (
                <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Aún no hay ventas registradas.</p>
              ) : (
                ventasCompletadas.slice().reverse().map(o => (
                  <div key={o.id} style={{borderBottom: '1px solid #f3f4f6', padding: '8px 0', display: 'flex', justifyContent: 'space-between'}}>
                    <div>
                      <span style={{fontWeight: '600', fontSize: '0.9rem'}}>{o.cantidad}x {o.nombre}</span>
                      <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)'}}>Cobrado a ${o.precioUnitarioCobrado} c/u</span>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <span style={{fontWeight: 'bold', color: '#059669', fontSize: '0.9rem'}}>+${o.total}</span>
                      <span style={{display: 'block', fontSize: '0.75rem', color: '#ef4444'}}>Costo: -${o.costo}</span>
                    </div>
                  </div>
                ))
              )}
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
