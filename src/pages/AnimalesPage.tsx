import { useMemo, useState, useEffect } from 'react';
import { useOntology } from '../hooks/useOntology';
import { useDbpediaEnrich } from '../hooks/useDbpediaEnrich';
import { type Individual } from '../services/ontologyService';
import { getAnimales } from '../repositories/ontologyRepository';
import logo from '../assets/images/logoveterinaria.png';
import { Search } from 'lucide-react';

// ── AnimalDrawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  animal: Individual;
  onClose: () => void;
}

function AnimalDrawer({ animal, onClose }: DrawerProps) {
  const { enriched, loading } = useDbpediaEnrich(animal);
  const p = animal.props;

  const fields: [string, string][] = [
    ['Nombre',  p.nombreAnimal ?? '—'],
    ['Especie', p.especie ?? '—'],
    ['Raza',    p.raza ?? '—'],
    ['Sexo',    p.sexo ?? '—'],
    ['Edad',    p.edad  ? `${p.edad} años`  : '—'],
    ['Peso',    p.peso  ? `${p.peso} kg`    : '—'],
    ['Color',   p.color ?? '—'],
    ['Enfermedad',   p.enfermedades ?? '—'],
  ];

  return (
    <aside className="vet-drawer">
      {/* Header */}
      <div className="vet-drawer__header">
        <h2>{p.nombreAnimal ?? 'Animal'}</h2>
        <button
          className="vet-drawer__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="vet-drawer__body">
        {/* Ontology data */}
        <p className="vet-drawer__section-label">Datos de la ontología</p>
        <dl className="vet-drawer__fields">
          {fields.map(([label, value]) => (
            <>
              <dt key={`dt-${label}`}>{label}:</dt>
              <dd key={`dd-${label}`}>{value}</dd>
            </>
          ))}
        </dl>

        <hr className="vet-drawer__divider" />

        {/* DBpedia enrichment */}
        {loading && (
          <p className="vet-drawer__muted">Consultando DBpedia…</p>
        )}

        {!loading && enriched?.abstract && (
          <>
            <p className="vet-drawer__section-label">
              Información adicional
              <span className="vet-badge">DBpedia</span>
            </p>

            {enriched.thumbnail && (
              <img
                className="vet-drawer__thumbnail"
                src={enriched.thumbnail}
                alt={p.raza ?? p.especie ?? ''}
              />
            )}

            <p className="vet-drawer__abstract">
              {enriched.abstract.length > 550
                ? enriched.abstract.slice(0, 550) + '…'
                : enriched.abstract}
            </p>

            {enriched.wikiPage && (
              <a
                className="vet-drawer__link"
                href={enriched.wikiPage}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver en Wikipedia →
              </a>
            )}
          </>
        )}

        {!loading && !enriched?.abstract && (
          <p className="vet-drawer__muted">Sin información adicional en DBpedia.</p>
        )}
      </div>
    </aside>
  );
}

// ── AnimalesPage ──────────────────────────────────────────────────────────────

export function AnimalesPage() {
  const { store, loading: ontologyLoading, error: ontologyError } = useOntology();
  const [animales, setAnimales]         = useState<Individual[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [search, setSearch]             = useState('');
  const [especieFilter, setEspecieFilter] = useState('');
  const [selected, setSelected]         = useState<Individual | null>(null);

  useEffect(() => {
    if (!store) return;
    setQueryLoading(true);
    getAnimales(store)
      .then(result => { setAnimales(result); setQueryLoading(false); })
      .catch(() => setQueryLoading(false));
  }, [store]);

  const especies = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const a of animales) if (a.props.especie) set.add(a.props.especie);
    return Array.from(set).sort();
  }, [animales]);

  const filtered = useMemo<Individual[]>(() => {
  const normalize = (text?: string) =>
    (text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const q = normalize(search);

  const stopWords = [
    'de',
    'del',
    'la',
    'el',
    'los',
    'las',
    'un',
    'una',
    'ano',
    'anos',
    'año',
    'años',
  ];

  const words = q
    .split(/\s+/)
    .filter(word => word && !stopWords.includes(word));

  return animales.filter(a => {
    const searchableText = normalize([
      a.props.nombreAnimal,
      a.props.especie,
      a.props.raza,
      a.props.sexo,
      a.props.edad,
      a.props.enfermedades,
    ].join(' '));

    const matchesSearch =
      words.length === 0 ||
      words.every(word => searchableText.includes(word));

    const matchesEspecie = !especieFilter || a.props.especie === especieFilter;

    return matchesSearch && matchesEspecie;
  });
}, [animales, search, especieFilter]);

  if (ontologyLoading || queryLoading) {
    return (
      <div className="vet-state">
        <span className="vet-spinner" />
        {ontologyLoading ? 'Cargando ontología…' : 'Ejecutando consulta SPARQL…'}
      </div>
    );
  }

  if (ontologyError) {
    return (
      <div className="vet-state vet-state--error">
        Error: {ontologyError}
      </div>
    );
  }

  return (
    <>
      <header className="vet-header">
        <div className="vet-header__left">
          <img
            src={logo}
            alt="Logo Veterinaria"
            className="vet-header__logo"
          />
          <div>
            <p className="vet-header__title">Veterinaria</p>
            <p className="vet-header__sub font-open-sans text-sm">Buscador Semático</p>
          </div>
        </div>
      </header>

      <div className="vet-page">
        <h1 className="vet-page__title">Buscador Semántico Veterinario</h1>

        <div className="vet-filters">
          <div className="vet-search-wrapper">
            <span className="vet-search-icon" aria-hidden="true">
              <Search size={16} />
            </span>
            <input
              className="vet-input"
              style={{ width: '100%' }}
              type="text"
              placeholder="Buscar por nombre, especie o raza…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="vet-select"
            value={especieFilter}
            onChange={e => setEspecieFilter(e.target.value)}
          >
            <option value="">Todas las especies</option>
            {especies.map(esp => (
              <option key={esp} value={esp}>{esp}</option>
            ))}
          </select>
        </div>

        {search.trim() === '' ? (
          <div className="vet-empty-state"/>
        ) : (
          <div className="vet-layout">
            <div className="vet-table-wrap">
              <table className="vet-table">
                <thead>
                  <tr>
                    {['Nombre', 'Especie', 'Raza', 'Sexo', 'Edad', 'Enfermedades'].map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const isSelected = selected?.uri === a.uri;
                    return (
                      <tr
                        key={a.uri}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => setSelected(isSelected ? null : a)}
                      >
                        <td>{a.props.nombreAnimal ?? '—'}</td>
                        <td>
                          {a.props.especie
                            ? <span className="vet-pill">{a.props.especie}</span>
                            : '—'}
                        </td>
                        <td>{a.props.raza ?? '—'}</td>
                        <td>{a.props.sexo ?? '—'}</td>
                        <td>{a.props.edad ?? '—'}</td>
                        <td>{a.props.enfermedades ?? '—'}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={6}>Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filtered.length > 0 && (
                <div className="vet-table-footer">
                  {filtered.length} de {animales.length} animales
                  {' · '}
                  {selected
                    ? 'Haz clic en la misma fila para cerrar el panel'
                    : 'Haz clic en una fila para ver detalles y enriquecimiento DBpedia'}
                </div>
              )}
            </div>

            {selected && (
              <AnimalDrawer animal={selected} onClose={() => setSelected(null)} />
            )}
          </div>
        )}
      </div>
    </>
  );
}