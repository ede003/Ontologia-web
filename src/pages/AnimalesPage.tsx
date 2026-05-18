import { useMemo, useState, useEffect } from 'react';
import { useOntology } from '../hooks/useOntology';
import { useDbpediaEnrich } from '../hooks/useDbpediaEnrich';
import { type Individual } from '../services/ontologyService';
import { getAnimales } from '../repositories/ontologyRepository';

// ── Shared styles ─────────────────────────────────────────────────────────────

const S = {
  cell: {
    border: '1px solid #ddd',
    padding: '0.5rem 0.75rem',
    textAlign: 'left' as const,
  },
  header: {
    border: '1px solid #ddd',
    padding: '0.5rem 0.75rem',
    textAlign: 'left' as const,
    background: '#f0f4f8',
    fontWeight: 600,
  },
  input: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.95rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  badge: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    background: '#fff3cd',
    color: '#856404',
    border: '1px solid #ffc107',
    borderRadius: '3px',
    padding: '0 5px',
    marginLeft: '6px',
    verticalAlign: 'middle',
  },
} as const;

// ── AnimalDrawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  animal: Individual;
  onClose: () => void;
}

function AnimalDrawer({ animal, onClose }: DrawerProps) {
  const { enriched, loading } = useDbpediaEnrich(animal);
  const p = animal.props;

  const fields: [string, string][] = [
    ['Nombre', p.nombreAnimal ?? '—'],
    ['Especie', p.especie ?? '—'],
    ['Raza', p.raza ?? '—'],
    ['Sexo', p.sexo ?? '—'],
    ['Edad', p.edad ? `${p.edad} años` : '—'],
    ['Peso', p.peso ? `${p.peso} kg` : '—'],
    ['Color', p.color ?? '—'],
  ];

  return (
    <aside
      style={{
        width: '320px',
        flexShrink: 0,
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        background: '#fff',
        alignSelf: 'flex-start',
        position: 'sticky',
        top: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,.08)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{p.nombreAnimal ?? 'Animal'}</h2>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, color: '#666', padding: '0 4px' }}
        >
          ×
        </button>
      </div>

      {/* Local ontology data */}
      <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555' }}>
        Datos de la ontología
      </p>
      <dl style={{ margin: '0 0 1rem' }}>
        {fields.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem', fontSize: '0.88rem' }}>
            <dt style={{ color: '#777', minWidth: '55px' }}>{label}:</dt>
            <dd style={{ margin: 0, fontWeight: 500 }}>{value}</dd>
          </div>
        ))}
      </dl>

      <hr style={{ margin: '0 0 0.75rem', border: 'none', borderTop: '1px solid #eee' }} />

      {/* DBpedia enrichment */}
      {loading && (
        <p style={{ color: '#888', fontSize: '0.88rem', margin: 0 }}>Consultando DBpedia…</p>
      )}

      {!loading && enriched?.abstract && (
        <>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555' }}>
            Información adicional
            <span style={S.badge}>DBpedia</span>
          </p>

          {enriched.thumbnail && (
            <img
              src={enriched.thumbnail}
              alt={p.raza ?? p.especie ?? ''}
              style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.6rem', display: 'block' }}
            />
          )}

          <p style={{ fontSize: '0.87rem', lineHeight: 1.55, color: '#333', margin: '0 0 0.6rem' }}>
            {enriched.abstract.length > 550
              ? enriched.abstract.slice(0, 550) + '…'
              : enriched.abstract}
          </p>

          {enriched.wikiPage && (
            <a
              href={enriched.wikiPage}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.87rem', color: '#0066cc' }}
            >
              Ver en Wikipedia →
            </a>
          )}
        </>
      )}

      {!loading && !enriched?.abstract && (
        <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
          Sin información adicional en DBpedia.
        </p>
      )}
    </aside>
  );
}

// ── AnimalesPage ──────────────────────────────────────────────────────────────

export function AnimalesPage() {
  const { store, loading: ontologyLoading, error: ontologyError } = useOntology();
  const [animales, setAnimales] = useState<Individual[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [especieFilter, setEspecieFilter] = useState('');
  const [selected, setSelected] = useState<Individual | null>(null);

  // Run SPARQL query via comunica once the store is ready
  useEffect(() => {
    if (!store) return;
    setQueryLoading(true);
    getAnimales(store)
      .then(result => {
        setAnimales(result);
        setQueryLoading(false);
      })
      .catch(() => setQueryLoading(false));
  }, [store]);

  const especies = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const a of animales) {
      if (a.props.especie) set.add(a.props.especie);
    }
    return Array.from(set).sort();
  }, [animales]);

  const filtered = useMemo<Individual[]>(() => {
    const q = search.toLowerCase().trim();
    return animales.filter(a => {
      const matchesSearch =
        !q ||
        [a.props.nombreAnimal, a.props.especie, a.props.raza].some(v =>
          v?.toLowerCase().includes(q),
        );
      const matchesEspecie = !especieFilter || a.props.especie === especieFilter;
      return matchesSearch && matchesEspecie;
    });
  }, [animales, search, especieFilter]);

  if (ontologyLoading || queryLoading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        {ontologyLoading ? 'Cargando ontología…' : 'Ejecutando consulta SPARQL…'}
      </div>
    );
  }

  if (ontologyError) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#c00' }}>
        Error: {ontologyError}
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '1rem' }}>Animales ({animales.length})</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, especie o raza…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...S.input, flex: 1 }}
        />
        <select
          value={especieFilter}
          onChange={e => setEspecieFilter(e.target.value)}
          style={S.input}
        >
          <option value="">Todas las especies</option>
          {especies.map(esp => (
            <option key={esp} value={esp}>{esp}</option>
          ))}
        </select>
      </div>

      {/* Layout: table + optional drawer */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Especie', 'Raza', 'Sexo', 'Edad'].map(col => (
                  <th key={col} style={S.header}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const isSelected = selected?.uri === a.uri;
                return (
                  <tr
                    key={a.uri}
                    onClick={() => setSelected(isSelected ? null : a)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? '#e8f0fe' : 'white',
                      outline: isSelected ? '2px solid #4285f4' : 'none',
                      outlineOffset: '-2px',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.background = '#f5f5f5';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.background = 'white';
                    }}
                  >
                    <td style={S.cell}>{a.props.nombreAnimal ?? '—'}</td>
                    <td style={S.cell}>{a.props.especie ?? '—'}</td>
                    <td style={S.cell}>{a.props.raza ?? '—'}</td>
                    <td style={S.cell}>{a.props.sexo ?? '—'}</td>
                    <td style={S.cell}>{a.props.edad ?? '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...S.cell, textAlign: 'center', color: '#888' }}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <p style={{ marginTop: '0.4rem', color: '#888', fontSize: '0.82rem' }}>
              {filtered.length} de {animales.length} animales
              {selected && ' · Haz clic en una fila para ver detalles'}
              {!selected && ' · Haz clic en una fila para ver detalles y enriquecimiento DBpedia'}
            </p>
          )}
        </div>

        {/* Drawer */}
        {selected && (
          <AnimalDrawer animal={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
