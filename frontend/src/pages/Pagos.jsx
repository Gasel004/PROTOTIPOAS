import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const MOCK = [
  { id:1, negociacion_id:1, titulo_neg:'Maíz blanco 50 qq',     monto:6000,  metodo_pago:'transferencia', referencia:'TRF-20250510-001', estado:'completado', fecha_pago:'2025-05-10', contraparte:'Comercial Sur S.A.' },
  { id:2, negociacion_id:5, titulo_neg:'Aguacate Hass 15 cajas', monto:5250,  metodo_pago:'cheque',        referencia:'CHQ-0042',         estado:'pendiente',  fecha_pago:null,         contraparte:'ExportFresh' },
  { id:3, negociacion_id:3, titulo_neg:'Tomate cherry 10 cajas', monto:900,   metodo_pago:'efectivo',      referencia:null,               estado:'completado', fecha_pago:'2025-05-01', contraparte:'Mercado Central' },
  { id:4, negociacion_id:2, titulo_neg:'Frijol negro 20 qq',     monto:5600,  metodo_pago:'transferencia', referencia:'TRF-20250508-003', estado:'fallido',    fecha_pago:null,         contraparte:'Juan García' },
];

const METODOS = ['efectivo','transferencia','cheque','otro'];

const ESTADO_CFG = {
  pendiente:   { badge:'badge-oro',    icon:'⏳', label:'Pendiente' },
  completado:  { badge:'badge-verde',  icon:'✅', label:'Completado' },
  fallido:     { badge:'badge-rojo',   icon:'❌', label:'Fallido' },
  reembolsado: { badge:'badge-azul',   icon:'↩️', label:'Reembolsado' },
};

export default function Pagos() {
  const navigate      = useNavigate();
  const [pagos,    setPagos]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('Todos');
  const [modalNew, setModalNew] = useState(false);
  const [form,     setForm]     = useState({ negociacion_id:'', monto:'', metodo_pago:'efectivo', referencia:'', fecha_pago:'', notas:'' });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.get('/pagos')
      .then(r => setPagos(r.data?.data ?? []))
      .catch(() => setPagos(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const totales = {
    completado:  pagos.filter(p => p.estado === 'completado').reduce((s,p) => s + p.monto, 0),
    pendiente:   pagos.filter(p => p.estado === 'pendiente').reduce((s,p)  => s + p.monto, 0),
  };

  const filtrados = filtro === 'Todos' ? pagos : pagos.filter(p => p.estado === filtro);

  async function guardarPago(e) {
    e.preventDefault();
    if (!form.negociacion_id || !form.monto || Number(form.monto) <= 0) {
      alert('Negociación y monto son requeridos'); return;
    }
    setSaving(true);
    try {
      const res = await api.post('/pagos', {
        ...form,
        negociacion_id: Number(form.negociacion_id),
        monto: Number(form.monto),
      });
      setPagos(prev => [res.data?.data ?? { ...form, id: Date.now(), estado:'pendiente' }, ...prev]);
      setModalNew(false);
      setForm({ negociacion_id:'', monto:'', metodo_pago:'efectivo', referencia:'', fecha_pago:'', notas:'' });
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al registrar pago');
    } finally { setSaving(false); }
  }

  async function actualizarEstado(id, estado) {
    try {
      await api.put(`/pagos/${id}`, { estado });
      setPagos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    } catch { alert('Error al actualizar estado'); }
  }

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>💳 Pagos</h1>
          <p className="text-muted">{pagos.length} pago{pagos.length !== 1 ? 's' : ''} registrado{pagos.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalNew(true)}>
          ➕ Registrar pago
        </button>
      </div>

      {/* Resumen financiero */}
      <div className="grid-2" style={{ marginBottom:'var(--sp-6)' }}>
        <div className="stat-card">
          <div className="stat-icon verde"><span>✅</span></div>
          <div>
            <div className="stat-value">Q{totales.completado.toLocaleString()}</div>
            <div className="stat-label">Total pagos completados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon oro"><span>⏳</span></div>
          <div>
            <div className="stat-value">Q{totales.pendiente.toLocaleString()}</div>
            <div className="stat-label">Total pagos pendientes</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'var(--sp-2)', marginBottom:'var(--sp-5)', flexWrap:'wrap' }}>
        {['Todos','pendiente','completado','fallido','reembolsado'].map(e => (
          <button key={e}
            className={filtro === e ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setFiltro(e)}>
            {e === 'Todos' ? 'Todos' : ESTADO_CFG[e]?.label ?? e}
          </button>
        ))}
      </div>

      {filtrados.length === 0
        ? <div className="empty-state card" style={{ padding:'var(--sp-16)' }}>
            <div className="empty-state-icon">💳</div>
            <h3>Sin pagos registrados</h3>
            <p>Registra el pago de tus negociaciones completadas</p>
          </div>
        : <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Negociación</th>
                  <th>Contraparte</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Fecha pago</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const cfg = ESTADO_CFG[p.estado] ?? { badge:'badge-gris', icon:'•', label:p.estado };
                  return (
                    <tr key={p.id}>
                      <td>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/negociaciones/${p.negociacion_id}`)}>
                          {p.titulo_neg}
                        </button>
                      </td>
                      <td style={{ color:'var(--gris-700)' }}>{p.contraparte}</td>
                      <td>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.0625rem', color:'var(--verde-800)' }}>
                          Q{p.monto.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textTransform:'capitalize' }}>{p.metodo_pago}</td>
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:'.8125rem', color:'var(--gris-500)' }}>
                        {p.referencia ?? '—'}
                      </td>
                      <td style={{ color:'var(--gris-500)', fontSize:'.875rem' }}>{p.fecha_pago ?? '—'}</td>
                      <td><span className={`badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span></td>
                      <td>
                        {p.estado === 'pendiente' && (
                          <div style={{ display:'flex', gap:'var(--sp-2)' }}>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--verde-700)' }}
                              onClick={() => actualizarEstado(p.id, 'completado')}>✅ Completar</button>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--rojo)' }}
                              onClick={() => actualizarEstado(p.id, 'fallido')}>❌ Fallido</button>
                          </div>
                        )}
                        {p.estado === 'completado' && (
                          <button className="btn btn-ghost btn-sm" style={{ color:'var(--azul)' }}
                            onClick={() => actualizarEstado(p.id, 'reembolsado')}>↩️ Reembolsar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      }

      {/* Modal nuevo pago */}
      {modalNew && (
        <div className="modal-overlay" onClick={() => !saving && setModalNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Registrar pago</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalNew(false)} disabled={saving}>✕</button>
            </div>
            <form onSubmit={guardarPago}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">ID de Negociación <span style={{ color:'var(--rojo)' }}>*</span></label>
                  <input className="form-input" type="number" placeholder="Ej: 1"
                    value={form.negociacion_id}
                    onChange={e => setForm(f => ({ ...f, negociacion_id: e.target.value }))} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Monto (Q) <span style={{ color:'var(--rojo)' }}>*</span></label>
                    <div className="input-group">
                      <span className="input-prefix">Q</span>
                      <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0.00"
                        value={form.monto}
                        onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de pago <span style={{ color:'var(--rojo)' }}>*</span></label>
                    <select className="form-select" value={form.metodo_pago}
                      onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                      {METODOS.map(m => <option key={m} value={m} style={{ textTransform:'capitalize' }}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Referencia / Comprobante</label>
                    <input className="form-input" placeholder="TRF-001, CHQ-042..."
                      value={form.referencia}
                      onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de pago</label>
                    <input className="form-input" type="date" value={form.fecha_pago}
                      onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Notas adicionales</label>
                  <textarea className="form-textarea" rows={2} placeholder="Observaciones..."
                    value={form.notas}
                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalNew(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
