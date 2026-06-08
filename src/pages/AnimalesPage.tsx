import { useMemo, useState, useEffect, useRef } from 'react';
import { useOntology } from '../hooks/useOntology';
import { useOntologySchema } from '../hooks/useOntologySchema';
import { useDbpediaEnrich } from '../hooks/useDbpediaEnrich';
import { type Individual } from '../services/ontologyService';
import { getAnimales } from '../repositories/ontologyRepository';
import logo from '../assets/images/logoveterinaria.png';
import { Search } from 'lucide-react';
import { type Language, useTranslations } from '../i18n/translations';
import { LanguageSelector } from '../components/LanguageSelector';

import { parseQuery } from '../utils/queryParser';
import { buildQuery } from '../utils/sparqlBuilder';
import { runQuery } from '../utils/sparqlExecutor';
import { useEntityMap } from '../hooks/useEntityMap';
import ResultRenderer, { type QueryMeta } from '../components/ResultRenderer';

// ── AnimalDrawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  animal: Individual;
  onClose: () => void;
  lang: Language;
}

function AnimalDrawer({ animal, onClose, lang }: DrawerProps) {
  const t = useTranslations(lang);
  const { enriched, loading } = useDbpediaEnrich(animal, lang);
  const p = animal.props;

  const fields: [string, string][] = [
    [t.drawerFieldName,    p.nombreAnimal  ?? '—'],
    [t.drawerFieldSpecies, p.especie       ?? '—'],
    [t.drawerFieldBreed,   p.raza          ?? '—'],
    [t.drawerFieldSex,     p.sexo          ?? '—'],
    [t.drawerFieldAge,     p.edad   ? `${p.edad} ${t.drawerFieldAgeUnit}` : '—'],
    [t.drawerFieldWeight,  p.peso   ? `${p.peso} ${t.drawerFieldWeightUnit}` : '—'],
    [t.drawerFieldColor,   p.color         ?? '—'],
    [t.drawerFieldDisease, p.enfermedades  ?? '—'],
    ['Dueño',              p.dueno         ?? '—'],
    ['Veterinario',        p.veterinario   ?? '—'],
  ];

  return (
    <aside className="vet-drawer">
      <div className="vet-drawer__header">
        <h2>{p.nombreAnimal ?? 'Animal'}</h2>
        <button className="vet-drawer__close" onClick={onClose} aria-label={t.drawerClose}>×</button>
      </div>

      <div className="vet-drawer__body">
        <p className="vet-drawer__section-label">{t.drawerOntologyData}</p>
        <dl className="vet-drawer__fields">
          {fields.map(([label, value]) => (
            <>
              <dt key={`dt-${label}`}>{label}:</dt>
              <dd key={`dd-${label}`}>{value}</dd>
            </>
          ))}
        </dl>

        <hr className="vet-drawer__divider" />

        {loading && <p className="vet-drawer__muted">{t.drawerConsultingDbpedia}</p>}

        {!loading && enriched && enriched.length > 0 && (() => {
          const row = enriched[0];
          return (
            <>
              <p className="vet-drawer__section-label">
                {t.drawerAdditionalInfo}
                <span className="vet-badge">DBpedia</span>
              </p>
              {row.thumbnail && (
                <img className="vet-drawer__thumbnail" src={row.thumbnail} alt={p.raza ?? p.especie ?? ''} />
              )}
              {row.abstract && (
                <p className="vet-drawer__abstract">
                  {row.abstract.length > 550 ? row.abstract.slice(0, 550) + '…' : row.abstract}
                </p>
              )}
              <div className="vet-drawer__links">
                {row.page && (
                  <a className="vet-drawer__link" href={row.page} target="_blank" rel="noopener noreferrer">
                    {t.drawerWikipediaLink}
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
          <p className="vet-drawer__muted">{t.drawerNoDbpedia}</p>
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
  lang: Language;
  enfermedadOverride?: Map<string, string>;
}

function AnimalTable({ animales, selected, onSelect, footer, lang, enfermedadOverride }: AnimalTableProps) {
  const t = useTranslations(lang);
  return (
    <div className="vet-table-wrap">
      <table className="vet-table">
        <thead>
          <tr>
            {[t.colName, t.colSpecies, t.colBreed, t.colSex, t.colAge, t.colDiseases, 'Dueño', 'Veterinario'].map(col => (
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
                <td>{a.props.especie ? <span className="vet-pill">{a.props.especie}</span> : '—'}</td>
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
              <td colSpan={8}>{t.noResults}</td>
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

interface AnimalesPageProps {
  lang: Language;
  setLang: (l: Language) => void;
}

export function AnimalesPage({ lang, setLang }: AnimalesPageProps) {
  const t = useTranslations(lang);
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

  useEffect(() => {
    if (!store) return;
    setQueryLoading(true);
    getAnimales(store)
      .then(result => { setAnimales(result); setQueryLoading(false); })
      .catch(() => setQueryLoading(false));
  }, [store]);

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

  const isAnimalTableMode =
    (queryMeta?.searchMode === 'entity' || queryMeta?.searchMode === 'fallback') &&
    (!queryMeta?.primaryType || queryMeta.primaryType === 'Animal');

  const isAnimalRelationalMode =
    queryMeta?.searchMode === 'multi-entity' &&
    queryMeta?.entityContexts[0]?.className === 'Animal';

  const especies = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const a of animales) if (a.props.especie) set.add(a.props.especie);
    return Array.from(set).sort();
  }, [animales]);

  const animalesPorEspecie = useMemo<Individual[]>(() => {
    if (!especieFilter) return animales;
    return animales.filter(a => a.props.especie === especieFilter);
  }, [animales, especieFilter]);

  const displayAnimals = useMemo<Individual[]>(() => {
    if (!isAnimalTableMode || !sparqlResults) return [];
    const uriSet = new Set(sparqlResults.map(r => r.instance).filter(Boolean));
    const matched = animales.filter(a => uriSet.has(a.uri));
    return matched.filter(a => !especieFilter || a.props.especie === especieFilter);
  }, [isAnimalTableMode, sparqlResults, animales, especieFilter]);

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
        {ontologyLoading ? t.loadingOntology : schemaLoading ? 'Analizando schema…' : t.loadingSparql}
      </div>
    );
  }

  if (ontologyError) {
    return <div className="vet-state vet-state--error">Error: {ontologyError}</div>;
  }

  const noSearch = search.trim() === '';

  return (
    <>
      <header className="vet-header">
        <div className="vet-header__left">
          <img src={logo} alt="Logo Veterinaria" className="vet-header__logo" />
          <div>
            <p className="vet-header__title">{t.headerTitle}</p>
            <p className="vet-header__sub font-open-sans text-sm">{t.headerSub}</p>
          </div>
        </div>
        <LanguageSelector lang={lang} setLang={setLang} t={t} />
      </header>

      <div className="vet-page">
        <h1 className="vet-page__title">{t.pageTitle}</h1>

        <div className="vet-filters">
          <div className="vet-search-wrapper">
            <span className="vet-search-icon" aria-hidden="true"><Search size={16} /></span>
            <input
              className="vet-input"
              style={{ width: '100%' }}
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="vet-select" value={especieFilter} onChange={e => setEspecieFilter(e.target.value)}>
            <option value="">{t.allSpecies}</option>
            {especies.map(esp => <option key={esp} value={esp}>{esp}</option>)}
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
              footer={`${animalesPorEspecie.length} ${t.footerAnimals} · ${especieFilter}${selected ? ` · ${t.footerClickClose}` : ` · ${t.footerClickDetail}`}`}
              lang={lang}
            />
            {selected && <AnimalDrawer animal={selected} onClose={() => setSelected(null)} lang={lang} />}
          </div>

        ) : intelligentLoading ? (
          <div className="vet-state"><span className="vet-spinner" />{t.loadingSparql}</div>

        ) : isAnimalRelationalMode ? (
          <div className="vet-layout">
            <AnimalTable
              animales={relationalAnimals}
              selected={selected}
              onSelect={setSelected}
              enfermedadOverride={enfermedadOverride}
              footer={`${relationalAnimals.length} ${t.footerOf ?? 'de'} ${animales.length} ${t.footerAnimals}${especieFilter ? ` · ${especieFilter}` : ''}${selected ? ` · ${t.footerClickClose}` : ` · ${t.footerClickDetail}`}`}
              lang={lang}
            />
            {selected && <AnimalDrawer animal={selected} onClose={() => setSelected(null)} lang={lang} />}
          </div>

        ) : isAnimalTableMode ? (
          <div className="vet-layout">
            <AnimalTable
              animales={displayAnimals}
              selected={selected}
              onSelect={setSelected}
              footer={`${displayAnimals.length} ${t.footerOf ?? 'de'} ${animales.length} ${t.footerAnimals}${especieFilter ? ` · ${especieFilter}` : ''}${selected ? ` · ${t.footerClickClose}` : ` · ${t.footerClickDetail}`}`}
              lang={lang}
            />
            {selected && <AnimalDrawer animal={selected} onClose={() => setSelected(null)} lang={lang} />}
          </div>

        ) : sparqlResults !== null && queryMeta !== null ? (
          <ResultRenderer results={sparqlResults} queryMeta={queryMeta} lang={lang} />

        ) : null}
      </div>
    </>
  );
}
