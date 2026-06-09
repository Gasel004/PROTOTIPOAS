import { useState, useEffect } from 'react';
import api from '../api/client';
import { BarChart3, TrendingUp, Package, DollarSign, Hash, Calendar, Filter } from 'lucide-react';

const CATEGORIAS = ['', 'Granos básicos', 'Frutas', 'Verduras', 'Hortalizas', 'Tubérculos', 'Especias'];

function formatCurrency(val) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 }).format(val);
}

export default function EstadisticasAsociacion() {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (periodo) params.set('periodo', periodo);
      if (categoria) params.set('categoria', categoria);
      const res = await api.get('/dashboard/estadisticas?' + params.toString());
      setData(res.data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudieron cargar las estadísticas');
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  function handleSubmit(e) { e.preventDefault(); cargar(); }

  const productos = data?.productos ?? [];
  const totales = data?.totales ?? { volumen_total: 0, valor_total: 0, transacciones_totales: 0 };
  const maxValor = Math.max(...productos.map(p => p.valor_total), 1);

  return (
    <div className="animate-fade-in-up dashboard-page dashboard-asociacion-page">
      <div className="page-header" style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
          <div>
            <h1 style={{ marginBottom: 'var(--sp-1)' }}>Estadísticas agregadas</h1>
            <p className="text-muted">Consulta el volumen de ventas, valor total y transacciones por producto sin datos personales.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label"><Calendar size={14}/> Período</label>
          <input className="form-input" type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label"><Filter size={14}/> Categoría</label>
          <select className="form-select" value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" style={{ marginBottom: 0 }}>
          <BarChart3 size={16}/> Consultar
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="loader-wrap"><div className="spinner" /></div> : (
        <>
          {productos.length === 0 ? (
            <div className="empty-state">
              <BarChart3 size={42}/>
              <h3>No hay transacciones registradas en ese período</h3>
              <p>Intenta con otro período o categoría.</p>
            </div>
          ) : (
            <>
              <div className="dashboard-kpi-strip assoc-strip">
                <div><Package size={18}/><strong>{totales.transacciones_totales}</strong><span>Transacciones</span></div>
                <div><TrendingUp size={18}/><strong>{Math.round(totales.volumen_total)}</strong><span>Volumen total</span></div>
                <div><DollarSign size={18}/><strong>{formatCurrency(totales.valor_total)}</strong><span>Valor negociado</span></div>
              </div>

              <div className="assoc-cal-list" style={{ marginTop: 'var(--sp-5)' }}>
                <h2>Desglose por producto</h2>
                <p className="assoc-cal-sub">{productos.length} productos con transacciones completadas en el período.</p>

                <div className="estadisticas-table-wrap">
                  <table className="estadisticas-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Volumen</th>
                        <th>Valor total</th>
                        <th>Transacciones</th>
                        <th>Proporción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(p => {
                        const pct = totales.valor_total ? (p.valor_total / totales.valor_total * 100) : 0;
                        return (
                          <tr key={p.producto_id}>
                            <td><strong>{p.producto_nombre}</strong></td>
                            <td>{p.categoria}</td>
                            <td>{p.volumen} {p.unidad_medida}</td>
                            <td>{formatCurrency(p.valor_total)}</td>
                            <td><span className="assoc-member-rating"><Hash size={10}/> {p.transacciones}</span></td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 8, background: 'var(--gris-100)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: pct + '%', height: '100%', background: 'var(--verde-600)', borderRadius: 4, transition: 'width .3s' }} />
                                </div>
                                <span style={{ fontSize: '.8rem', color: 'var(--gris-500)', minWidth: 40 }}>{Math.round(pct)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 'var(--sp-6)' }}>
                  <h2 style={{ marginBottom: 'var(--sp-3)' }}>Gráfico de valor por producto</h2>
                  <div className="estadisticas-bars">
                    {productos.map(p => {
                      const pct = (p.valor_total / maxValor * 100).toFixed(0);
                      return (
                        <div key={p.producto_id} className="estadisticas-bar-item">
                          <span className="estadisticas-bar-label">{p.producto_nombre}</span>
                          <div className="estadisticas-bar-track">
                            <div className="estadisticas-bar-fill" style={{ width: pct + '%' }}>
                              <span>{formatCurrency(p.valor_total)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
