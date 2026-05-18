import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';

const MOCK = [
  { id:1, negociacion_id:1, titulo:'Maíz blanco 50 qq', contraparte:'Comercial Sur S.A.',
    estado:'pendiente', fecha_programada:'2025-05-20', lugar_entrega:'Finca San Luis, Chiquimula',
    confirmacion_productor:false, confirmacion_comprador:false },
  { id:2, negociacion_id:5, titulo:'Aguacate Hass 15 cajas', contraparte:'ExportFresh',
    estado:'en_transito', fecha_programada:'2025-05-15', lugar_entrega:'Bodega ExportFresh, Guatemala',
    confirmacion_productor:true, confirmacion_comprador:false },
  { id:3, negociacion_id:3, titulo:'Tomate cherry 10 cajas', contraparte:'Mercado Central',
    estado:'entregado', fecha_programada:'2025-05-01', lugar_entrega:'Puesto 14, Mercado Central',
    confirmacion_productor:true, confirmacion_comprador:true },
];

const ESTADO_CFG = {
  pendiente:   { badge:'badge-oro',   label:'Pendiente',   icon:'⏳' },
  en_transito: { badge:'badge-azul',  label:'En tránsito', icon:'🚛' },
  entregado:   { badge:'badge-verde', label:'Entregado',   icon:'✅' },
  con_problema:{ badge:'badge-rojo',  label:'Con problema',icon:'⚠️' },
};

export default function Entregas() {
  const navigate      = useNavigate();
  const { user }      = useAuthStore();
  const isProductor   = user?.rol === 'productor';

  const [entregas,  setEntregas]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState('Todos');
  const [modalConf, setModalConf] = useState(null); // entrega a confirmar
  const [obs,       setObs]       = useState('');
  const [confirming,setConfirming]= useState(false);

  useEffect(() => {
    api.get('/entregas')
      .then(r => setEntregas(r.data?.data ?? []))
      .catch(() => setEntregas(MOCK))
      .finally(() => setLoading(false));
  }, []);

  async function confirmar(entregaId) {
    setConfirming(true);
    try {
      await api.post(`/entregas/${entregaId}/confirmar`, { observaciones: obs });
      setEntregas(prev => prev.map(e => {
        if (e.id !== entregaId) return e;
        const updProd = isProductor ? true : e.confirmacion_productor;
        const updComp = !isProductor ? true : e.confirmacion_comprador;
        const nuevoEstado = updProd && updComp ? 'entregado' : e.estado;
        return { ...e, confirmacion_productor: updProd, confirmacion_comprador: updComp, estado: nuevoEstado };
      }));
      setModalConf(null);
      setObs('');
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al confirmar');
    } finally { setConfirming(false); }
  }

  const filtradas = filtro === 'Todos' ? entregas : entregas.filter(e => e.estado === filtro);

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>📦 Entregas</h1>
          <p className="text-muted">{entregas.length} entrega{entregas.length !== 1 ? 's' : ''} registrada{entregas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'var(--sp-2)', marginBottom:'var(--sp-6)', flexWrap:'wrap' }}>
        {['Todos','pendiente','en_transito','entregado','con_problema'].map(e => (
          <button key={e}
            className={filtro === e ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setFiltro(e)}>
            {e === 'Todos' ? 'Todas' : ESTADO_CFG[e]?.label ?? e}
          </button>
        ))}
      </div>

      {filtradas.length === 0
        ? <div className="empty-state card" style={{ padding:'var(--sp-16)' }}>
            <div className="empty-state-icon">📦</div>
            <h3>Sin entregas</h3>
            <p>Las entregas aparecerán aquí cuando tengas negociaciones aceptadas</p>
          </div>
        : <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-4)' }}>
            {filtradas.map(e => {
              const cfg      = ESTADO_CFG[e.estado] ?? { badge:'badge-gris', label:e.estado, icon:'•' };
              const yoConfirm= isProductor ? e.confirmacion_productor : e.confirmacion_comprador;
              const elConfirm= isProductor ? e.confirmacion_comprador : e.confirmacion_productor;

              return (
                <div key={e.id} className="card">
                  <div style={{ padding:'var(--sp-5) var(--sp-6)' }}>
                    {/* Cabecera */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'var(--sp-4)' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', marginBottom:'var(--sp-1)' }}>
                          <span style={{ fontSize:'1.25rem' }}>{cfg.icon}</span>
                          <h4 style={{ margin:0 }}>{e.titulo}</h4>
                        </div>
                        <div style={{ fontSize:'.875rem', color:'var(--gris-500)' }}>
                          🧑‍💼 {e.contraparte} · 📅 {e.fecha_programada}
                        </div>
                        {e.lugar_entrega && (
                          <div style={{ fontSize:'.875rem', color:'var(--gris-500)', marginTop:'var(--sp-1)' }}>
                            📍 {e.lugar_entrega}
                          </div>
                        )}
                      </div>
                      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                    </div>

                    {/* Confirmaciones */}
                    <div style={{
                      background:'var(--gris-50)', borderRadius:'var(--radius)',
                      padding:'var(--sp-4)', display:'flex', gap:'var(--sp-6)', flexWrap:'wrap',
                    }}>
                      <ConfirmBadge label="Productor" done={e.confirmacion_productor} />
                      <ConfirmBadge label="Comprador" done={e.confirmacion_comprador} />
                      {e.confirmacion_productor && e.confirmacion_comprador
                        ? <span style={{ color:'var(--verde-700)', fontWeight:600, fontSize:'.875rem' }}>
                            🏁 Entrega completada — ambas partes confirmaron
                          </span>
                        : <span style={{ color:'var(--gris-500)', fontSize:'.875rem' }}>
                            Se necesitan ambas confirmaciones para completar la entrega
                          </span>
                      }
                    </div>

                    {/* Acciones */}
                    {e.estado !== 'entregado' && (
                      <div style={{ display:'flex', gap:'var(--sp-3)', marginTop:'var(--sp-4)', flexWrap:'wrap' }}>
                        {!yoConfirm && (
                          <button className="btn btn-primary btn-sm"
                            onClick={() => setModalConf(e)}>
                            ✅ Confirmar entrega
                          </button>
                        )}
                        {yoConfirm && !elConfirm && (
                          <div className="alert alert-info" style={{ padding:'var(--sp-2) var(--sp-4)', fontSize:'.875rem' }}>
                            ⏳ Esperando confirmación de la otra parte
                          </div>
                        )}
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/negociaciones/${e.negociacion_id}`)}>
                          Ver negociación
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      }

      {/* Modal confirmar */}
      {modalConf && (
        <div className="modal-overlay" onClick={() => !confirming && setModalConf(null)}>
          <div className="modal" onClick={ev => ev.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ Confirmar entrega</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalConf(null)} disabled={confirming}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom:'var(--sp-4)', color:'var(--gris-700)' }}>
                Estás confirmando la entrega de <strong>{modalConf.titulo}</strong>.
                Esta acción no se puede deshacer.
              </p>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Observaciones (opcional)</label>
                <textarea className="form-textarea" rows={3}
                  value={obs} onChange={e => setObs(e.target.value)}
                  placeholder="Todo correcto, producto en buen estado..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalConf(null)} disabled={confirming}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => confirmar(modalConf.id)} disabled={confirming}>
                {confirming ? '⏳ Confirmando...' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmBadge({ label, done }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)' }}>
      <span style={{
        width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
        background: done ? 'var(--verde-700)' : 'var(--gris-300)',
        color: 'var(--blanco)', fontSize:'.75rem', fontWeight:700, flexShrink:0,
      }}>
        {done ? '✓' : '○'}
      </span>
      <span style={{ fontSize:'.875rem', fontWeight:500, color: done ? 'var(--verde-800)' : 'var(--gris-500)' }}>
        {label}
      </span>
    </div>
  );
}
