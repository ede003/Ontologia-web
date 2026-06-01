import { useMemo, useState, useEffect } from 'react';
import { useOntology } from '../hooks/useOntology';
import { useDbpediaEnrich } from '../hooks/useDbpediaEnrich';
import { type Individual } from '../services/ontologyService';
import { getAnimales } from '../repositories/ontologyRepository';
import logo from '../assets/images/logoveterinaria.png';
import { Search } from 'lucide-react';

import { parseQuery } from '../utils/queryParser';
import { detectEntityType } from '../utils/entityDetector';
import { buildQuery } from '../utils/sparqlBuilder';
import { runQuery } from '../utils/sparqlExecutor';
import { useEntityMap } from '../hooks/useEntityMap';
import ResultRenderer, { type QueryMeta } from '../components/ResultRenderer';

// ── AnimalDrawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  animal: Individual;
  onClose: () => void;
}

function AnimalDrawer({ animal, onClose }: DrawerProps) {
  const { enriched, loading } = useDbpediaEnrich(animal);
  const p = animal.props;

  const fields: [string, string][] = [
    ['Nombre',       p.nombreAnimal  ?? '—'],
    ['Especie',      p.especie       ?? '—'],
    ['Raza',         p.raza          ?? '—'],
    ['Sexo',         p.sexo          ?? '—'],
    ['Edad',         p.edad   ? `${p.edad} años` : '—'],
    ['Peso',         p.peso   ? `${p.peso} kg`   : '—'],
    ['Color',        p.color         ?? '—'],
    ['Enfermedad',   p.enfermedades  ?? '—'],
    ['Dueño',        p.dueno         ?? '—'],
    ['Veterinario',  p.veterinario   ?? '—'],
  ];

  return (
    <aside className="vet-drawer">
      <div className="vet-drawer__header">
        <h2>{p.nombreAnimal ?? 'Animal'}</h2>
        <button className="vet-drawer__close" onClick={onClose} aria-label="Cerrar">×</button>
      </div>

      <div className="vet-drawer__body">
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

        {loading && <p className="vet-drawer__muted">Consultando DBpedia…</p>}

        {!loading && enriched && enriched.length > 0 && (() => {
          const row = enriched[0];
          return (
            <>
              <p className="vet-drawer__section-label">
                Información adicional
                <span className="vet-badge">DBpedia</span>
              </p>

              {row.thumbnail && (
                <img
                  className="vet-drawer__thumbnail"
                  src={row.thumbnail}
                  alt={p.raza ?? p.especie ?? ''}
                />
              )}

              {row.abstract && (
                <p className="vet-drawer__abstract">
                  {row.abstract.length > 550
                    ? row.abstract.slice(0, 550) + '…'
                    : row.abstract}
                </p>
              )}

              <div className="vet-drawer__links">
                {row.page && (
                  <a className="vet-drawer__link" href={row.page} target="_blank" rel="noopener noreferrer">
                    Ver en Wikipedia →
                  </a>
                )}
                {row.dbpediaUri && (
                  <a className="vet-drawer__link" href={row.dbpediaUri} target="_blank" rel="noopener noreferrer">
                    Ver en DBpedia →
                  </a>
                )}
              </div>
            </>
          );
        })()}

        {!loading && (!enriched || enriched.length === 0) && (
          <p className="vet-drawer__muted">Sin información adicional en DBpedia.</p>
        )}
      </div>
    </aside>
  );
}

// ── AnimalTable ───────────────────────────────────────────────────────────────

interface AnimalTableProps {
  animales: Individual[];
  selected: Individual | null;
  onSelect: (a: Individual | null) => void;
  footer?: string;
}

function AnimalTable({ animales, selected, onSelect, footer }: AnimalTableProps) {
  return (
    <div className="vet-table-wrap">
      <table className="vet-table">
        <thead>
          <tr>
            {['Nombre', 'Especie', 'Raza', 'Sexo', 'Edad', 'Enfermedades', 'Dueño', 'Veterinario'].map(col => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {animales.map(a => {
            const isSelected = selected?.uri === a.uri;
            return (
              <tr
                key={a.uri}
                className={isSelected ? 'selected' : ''}
                onClick={() => onSelect(isSelected ? null : a)}
              >
                <td>{a.props.nombreAnimal ?? '—'}</td>
                <td>
                  {a.props.especie
                    ? <span className="vet-pill">{a.props.especie}</span>
                    : '—'}
                </td>
                <td>{a.props.raza         ?? '—'}</td>
                <td>{a.props.sexo         ?? '—'}</td>
                <td>{a.props.edad         ?? '—'}</td>
                <td>{a.props.enfermedades ?? '—'}</td>
                <td>{a.props.dueno        ?? '—'}</td>
                <td>{a.props.veterinario  ?? '—'}</td>
              </tr>
            );
          })}
          {animales.length === 0 && (
            <tr className="empty-row">
              <td colSpan={8}>Sin resultados</td>
            </tr>
          )}
        </tbody>
      </table>
      {footer && animales.length > 0 && (
        <div className="vet-table-footer">{footer}</div>
      )}
    </div>
  );
}

// ── AnimalesPage ──────────────────────────────────────────────────────────────

export function AnimalesPage() {
  const { store, loading: ontologyLoading, error: ontologyError } = useOntology();
  const entityMap = useEntityMap(store);

  const [animales, setAnimales]         = useState<Individual[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);

  const [search, setSearch]               = useState('');
  const [especieFilter, setEspecieFilter] = useState('');
  const [selected, setSelected]           = useState<Individual | null>(null);

  const [sparqlResults, setSparqlResults]           = useState<Record<string, string>[] | null>(null);
  const [queryMeta, setQueryMeta]                   = useState<QueryMeta | null>(null);
  const [intelligentLoading, setIntelligentLoading] = useState(false);

  // Cargar todos los animales al inicio
  useEffect(() => {
    if (!store) return;
    setQueryLoading(true);
    getAnimales(store)
      .then(result => { setAnimales(result); setQueryLoading(false); })
      .catch(() => setQueryLoading(false));
  }, [store]);

  // Pipeline SPARQL cuando cambia el input de búsqueda
  useEffect(() => {
    if (!search.trim() || !store) {
      setSparqlResults(null);
      setQueryMeta(null);
      return;
    }

    setIntelligentLoading(true);
    const parsed        = parseQuery(search, entityMap);
    const primaryType   = detectEntityType(parsed.primaryTerm, entityMap);
    const secondaryType = parsed.secondaryTerm
      ? detectEntityType(parsed.secondaryTerm, entityMap)
      : null;
    const sparql = buildQuery({ ...parsed, primaryType, secondaryType, entityMap, filters: parsed.filters });

    console.group(`[AnimalesPage] Búsqueda: "${search}"`)
    console.log('parseQuery →', { terms: parsed.terms, primaryTerm: parsed.primaryTerm, secondaryTerm: parsed.secondaryTerm, isRelational: parsed.isRelational, filters: parsed.filters })
    console.log('detectEntityType →', { primaryType, secondaryType })

    runQuery(store, sparql)
      .then(results => {
        console.log(`runQuery → ${results.length} resultados`)
        console.groupEnd()
        setSparqlResults(results);

        const hasAnimalFilters =
          !!(parsed.filters.especie || parsed.filters.raza ||
             parsed.filters.sexo   || parsed.filters.edad);

        const resolvedPrimaryType = hasAnimalFilters ? 'Animal' : primaryType;

        setQueryMeta({
          isRelational: parsed.isRelational,
          primaryType: resolvedPrimaryType,
          secondaryType,
          primaryTerm: parsed.primaryTerm,
          secondaryTerm: parsed.secondaryTerm,
        });
      })
      .catch((err) => {
        console.error('[AnimalesPage] runQuery error:', err);
        console.groupEnd();
        setSparqlResults([]);
        setQueryMeta(null);
      })
      .finally(() => setIntelligentLoading(false));
  }, [search, store, entityMap]);

  // Modo tabla de animales: no relacional y primaryType es Animal (o null)
  const isAnimalTableMode = !queryMeta?.isRelational &&
    (!queryMeta?.primaryType || queryMeta.primaryType === 'Animal');

  // Especies únicas para el dropdown
  const especies = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const a of animales) if (a.props.especie) set.add(a.props.especie);
    return Array.from(set).sort();
  }, [animales]);

  // Animales filtrados solo por especie (sin búsqueda)
  const animalesPorEspecie = useMemo<Individual[]>(() => {
    if (!especieFilter) return animales;
    return animales.filter(a => a.props.especie === especieFilter);
  }, [animales, especieFilter]);

  // Animales desde SPARQL + filtro dropdown combinados
  const displayAnimals = useMemo<Individual[]>(() => {
    if (!isAnimalTableMode || !sparqlResults) return [];
    const uriSet = new Set(sparqlResults.map(r => r.instance).filter(Boolean));
    const matched = animales.filter(a => uriSet.has(a.uri));
    return matched.filter(a => !especieFilter || a.props.especie === especieFilter);
  }, [isAnimalTableMode, sparqlResults, animales, especieFilter]);

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

  const noSearch = search.trim() === '';

  return (
    <>
      <header className="vet-header">
        <div className="vet-header__left">
          <img src={logo} alt="Logo Veterinaria" className="vet-header__logo" />
          <div>
            <p className="vet-header__title">Veterinaria</p>
            <p className="vet-header__sub font-open-sans text-sm">Buscador Semántico</p>
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
              placeholder="Buscar por nombre, especie, enfermedad…"
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

        {/* ── Área de resultados ───────────────────────────────────────── */}

        {noSearch && !especieFilter ? (
          <div className="vet-empty-state" />

        ) : noSearch && especieFilter ? (
          /* Solo filtro de especie activo */
          <div className="vet-layout">
            <AnimalTable
              animales={animalesPorEspecie}
              selected={selected}
              onSelect={setSelected}
              footer={`${animalesPorEspecie.length} animales · ${especieFilter}${selected ? ' · Haz clic en la misma fila para cerrar el panel' : ' · Haz clic en una fila para ver detalles'}`}
            />
            {selected && (
              <AnimalDrawer animal={selected} onClose={() => setSelected(null)} />
            )}
          </div>

        ) : intelligentLoading ? (
          <div className="vet-state">
            <span className="vet-spinner" />
            Ejecutando consulta SPARQL…
          </div>

        ) : isAnimalTableMode ? (
          /* Búsqueda de animales → tabla + drawer */
          <div className="vet-layout">
            <AnimalTable
              animales={displayAnimals}
              selected={selected}
              onSelect={setSelected}
              footer={`${displayAnimals.length} de ${animales.length} animales${especieFilter ? ` · ${especieFilter}` : ''}${selected ? ' · Haz clic en la misma fila para cerrar el panel' : ' · Haz clic en una fila para ver detalles'}`}
            />
            {selected && (
              <AnimalDrawer animal={selected} onClose={() => setSelected(null)} />
            )}
          </div>

        ) : sparqlResults !== null && queryMeta !== null ? (
          /* Relacional o no-animal → ResultRenderer */
          <ResultRenderer results={sparqlResults} queryMeta={queryMeta} />

        ) : null}
      </div>
    </>
  );
}
