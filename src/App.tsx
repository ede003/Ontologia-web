import { useState } from 'react';
import { AnimalesPage } from './pages/AnimalesPage';
import { type Language } from './i18n/translations';

function App() {
  const [lang, setLang] = useState<Language>('es');

  return <AnimalesPage lang={lang} setLang={setLang} />;
}

export default App;