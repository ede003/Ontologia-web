import { type Language, type Translations } from '../i18n/translations';

interface Props {
  lang: Language;
  setLang: (l: Language) => void;
  t: Translations;
}

const FLAG: Record<Language, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  pt: '🇧🇷',
};

const LABEL: Record<Language, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

export function LanguageSelector({ lang, setLang, t }: Props) {
  return (
    <div className="vet-lang-selector">
      <label className="vet-lang-selector__label">{t.languageLabel}:</label>
      <select
        className="vet-select"
        value={lang}
        onChange={e => setLang(e.target.value as Language)}
      >
        {(['es', 'en', 'pt'] as Language[]).map(l => (
          <option key={l} value={l}>
            {FLAG[l]} {LABEL[l]}
          </option>
        ))}
      </select>
    </div>
  );
}