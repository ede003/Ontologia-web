import { useMemo, useState, useEffect, useRef } from 'react';
import { useOntology } from '../hooks/useOntology';
import { useOntologySchema } from '../hooks/useOntologySchema';
import { useDbpediaEnrich } from '../hooks/useDbpediaEnrich';
import { type Individual } from '../services/ontologyService';
import { getAnimales } from '../repositories/ontologyRepository';
import logo from '../assets/images/logoveterinaria.png';
import { Search } from 'lucide-react';

import { parseQuery } from '../utils/queryParser';
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
    ['Nombre',      p.nombreAnimal  ?? '—'],
    ['Especie',     p.especie       ?? '—'],
    ['Raza',        p.raza          ?? '—'],
    ['Sexo',        p.sexo          ?? '—'],
    ['Edad',        p.edad   ? `${p.edad} años` : '—'],
    ['Peso',        p.peso   ? `${p.peso} kg`   : '—'],
    ['Color',       p.color         ?? '—'],
    ['Enfermedad',  p.enfermedades  ?? '—'],
    ['Dueño',       p.dueno         ?? '—'],
    ['Veterinario', p.veterinario   ?? '—'],
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
  enfermedadOverride?: Map<string, string>;
}

function AnimalTable({ animales, selected, onSelect, footer, enfermedadOverride }: AnimalTableProps) {
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
            const enfermedad = enfermedadOverride?.get(a.uri) ?? a.props.enfermedades ?? '—';
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
                <td>{a.props.raza        ?? '—'}</td>
                <td>{a.props.sexo        ?? '—'}</td>
                <td>{a.props.edad        ?? '—'}</td>
                <td>{enfermedad}</td>
                <td>{a.props.dueno       ?? '—'}</td>
                <td>{a.props.veterinario ?? '—'}</td>
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
  const { schema, loading: schemaLoading } = useOntologySchema(store);
  const entityMap = useEntityMap(store, schema);

  const [animales, setAnimales]         = useState<Individual[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);

  const [search, setSearch]               = useState('');
  const [especieFilter, setEspecieFilter] = useState('');
  const [selected, setSelected]           = useState<Individual | null>(null);

  const [sparqlResults, setSparqlResults]           = useState<Record<string, string>[] | null>(null);
  const [queryMeta, setQueryMeta]                   = useState<QueryMeta | null>(null);
  const [intelligentLoading, setIntelligentLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar todos los animales al inicio
  useEffect(() => {
    if (!store) return;
    setQueryLoading(true);
    getAnimales(store)
      .then(result => { setAnimales(result); setQueryLoading(false); })
      .catch(() => setQueryLoading(false));
  }, [store]);

  // Pipeline SPARQL cuando cambia el input de búsqueda (debounced 300ms)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!search.trim() || !store || !schema) {
      setSparqlResults(null);
      setQueryMeta(null);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      setIntelligentLoading(true);
      const parsed = parseQuery(search, entityMap, schema);
      const { query: sparql, resolvedMode } = buildQuery(parsed, schema);

      console.group(`[AnimalesPage] Búsqueda: "${search}"`)
      console.log('parseQuery →', { searchMode: parsed.searchMode, resolvedMode, contexts: parsed.entityContexts })

      runQuery(store, sparql)
        .then(results => {
          console.log(`runQuery → ${results.length} resultados`, results)
          console.groupEnd()
          setSparqlResults(results);
          setQueryMeta({
            searchMode: resolvedMode,
            entityContexts: parsed.entityContexts,
            primaryType: parsed.entityContexts[0]?.className ?? null,
            secondaryType: parsed.entityContexts[1]?.className ?? null,
            isRelational: resolvedMode === 'multi-entity',
          });
        })
        .catch((err) => {
          console.error('[AnimalesPage] runQuery error:', err);
          console.groupEnd();
          setSparqlResults([]);
          setQueryMeta(null);
        })
        .finally(() => setIntelligentLoading(false));
    }, 300);

    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [search, store, schema, entityMap]);

  // Modo tabla de animales: entity mode con clase Animal (o sin clase detectada)
  const isAnimalTableMode =
    (queryMeta?.searchMode === 'entity' || queryMeta?.searchMode === 'fallback') &&
    (!queryMeta?.primaryType || queryMeta.primaryType === 'Animal');

  // Modo relacional Animal↔X: multi-entity con Animal como primer contexto
  const isAnimalRelationalMode =
    queryMeta?.searchMode === 'multi-entity' &&
    queryMeta?.entityContexts[0]?.className === 'Animal';

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

  // Animales desde SPARQL modo entity → ?instance
  const displayAnimals = useMemo<Individual[]>(() => {
    if (!isAnimalTableMode || !sparqlResults) return [];
    const uriSet = new Set(sparqlResults.map(r => r.instance).filter(Boolean));
    const matched = animales.filter(a => uriSet.has(a.uri));
    return matched.filter(a => !especieFilter || a.props.especie === especieFilter);
  }, [isAnimalTableMode, sparqlResults, animales, especieFilter]);

  // Animales desde SPARQL modo multi-entity con Animal como primer contexto → ?var0
  const { relationalAnimals, enfermedadOverride } = useMemo<{
    relationalAnimals: Individual[];
    enfermedadOverride: Map<string, string>;
  }>(() => {
    if (!isAnimalRelationalMode || !sparqlResults) {
      return { relationalAnimals: [], enfermedadOverride: new Map() };
    }

    const uriSet = new Set(sparqlResults.map(r => r.var0).filter(Boolean));
    const matched = animales.filter(a => uriSet.has(a.uri));
    const filtered = matched.filter(a => !especieFilter || a.props.especie === especieFilter);

    // Mapa URI animal → nombre de la segunda entidad (e.g. enfermedad)
    const override = new Map<string, string>();
    for (const r of sparqlResults) {
      if (r.var0 && r.var1Name) override.set(r.var0, r.var1Name);
    }

    return { relationalAnimals: filtered, enfermedadOverride: override };
  }, [isAnimalRelationalMode, sparqlResults, animales, especieFilter]);

  if (ontologyLoading || schemaLoading || queryLoading) {
    return (
      <div className="vet-state">
        <span className="vet-spinner" />
        {ontologyLoading ? 'Cargando ontología…'
          : schemaLoading ? 'Analizando schema…'
          : 'Ejecutando consulta SPARQL…'}
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
              placeholder="Buscar por nombre, especie, enfermedad, descripción…"
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

        ) : isAnimalRelationalMode ? (
          <div className="vet-layout">
            <AnimalTable
              animales={relationalAnimals}
              selected={selected}
              onSelect={setSelected}
              enfermedadOverride={enfermedadOverride}
              footer={`${relationalAnimals.length} de ${animales.length} animales${especieFilter ? ` · ${especieFilter}` : ''}${selected ? ' · Haz clic en la misma fila para cerrar el panel' : ' · Haz clic en una fila para ver detalles'}`}
            />
            {selected && (
              <AnimalDrawer animal={selected} onClose={() => setSelected(null)} />
            )}
          </div>

        ) : isAnimalTableMode ? (
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
          <ResultRenderer results={sparqlResults} queryMeta={queryMeta} />

        ) : null}
      </div>
    </>
  );
}
