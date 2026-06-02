import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, onPrev, onNext, onSetPage, label = 'elementos' }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-3)',
      padding: 'var(--sp-3) var(--sp-4)',
      marginTop: 'var(--sp-4)',
      borderTop: '1px solid var(--gris-200)',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '.8125rem', color: 'var(--gris-600)' }}>
        {total} {label} · página {page} de {totalPages}
      </span>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onPrev} disabled={page <= 1} aria-label="Página anterior">
          <ChevronLeft size={14} /> Anterior
        </button>
        {totalPages <= 7
          ? Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                className={'btn btn-sm ' + (n === page ? 'btn-primary' : 'btn-ghost')}
                onClick={() => onSetPage(n)}
                aria-current={n === page ? 'page' : undefined}
                style={{ minWidth: 36 }}
              >
                {n}
              </button>
            ))
          : (
            <>
              <button
                type="button"
                className={'btn btn-sm ' + (page === 1 ? 'btn-primary' : 'btn-ghost')}
                onClick={() => onSetPage(1)}
                style={{ minWidth: 36 }}
              >1</button>
              {page > 3 && <span style={{ alignSelf: 'center', color: 'var(--gris-500)' }}>…</span>}
              {page > 2 && page < totalPages - 1 && (
                <button type="button" className="btn btn-sm btn-primary" disabled style={{ minWidth: 36 }}>{page}</button>
              )}
              {page < totalPages - 2 && <span style={{ alignSelf: 'center', color: 'var(--gris-500)' }}>…</span>}
              <button
                type="button"
                className={'btn btn-sm ' + (page === totalPages ? 'btn-primary' : 'btn-ghost')}
                onClick={() => onSetPage(totalPages)}
                style={{ minWidth: 36 }}
              >{totalPages}</button>
            </>
          )
        }
        <button type="button" className="btn btn-ghost btn-sm" onClick={onNext} disabled={page >= totalPages} aria-label="Página siguiente">
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
