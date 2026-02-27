import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Globe } from 'lucide-react';
import Menu from './components/Menu';
import HumanVsHuman from './components/HumanVsHuman';
import ClassicDebate from './components/ClassicDebate';
import BiasScanner from './components/BiasScanner';
import DebateQuest from './components/DebateQuest';
import { I18nProvider, useI18n } from './hooks/useI18n';

export type Mode = 'menu' | 'quest' | 'hvh' | 'classic' | 'bias';

function AppContent() {
  const [mode, setMode] = useState<Mode>('menu');
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-red-900 selection:text-white flex flex-col">
      <div className="max-w-6xl mx-auto w-full p-6 md:p-12 flex-1 flex flex-col">
        <header className="flex items-center justify-between mb-12 border-b border-zinc-800/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-950/30 border border-red-900/50 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-widest uppercase text-zinc-100">
                {t('app.title')}
              </h1>
              <p className="text-xs font-mono text-zinc-500 tracking-wider uppercase">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-500" />
              <select
                id="language-switcher"
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono uppercase tracking-widest rounded px-2 py-1 focus:outline-none focus:border-red-500"
              >
                <option value="en">EN</option>
                <option value="vi">VI</option>
                <option value="fr">FR</option>
                <option value="de">DE</option>
                <option value="ja">JA</option>
                <option value="zh-CN">ZH</option>
              </select>
            </div>
            {mode !== 'menu' && (
              <button 
                onClick={() => setMode('menu')}
                className="text-xs font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                {t('app.exit')}
              </button>
            )}
          </div>
        </header>
        
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            {mode === 'menu' && <Menu key="menu" onSelectMode={setMode} />}
            {mode === 'quest' && <DebateQuest key="quest" onBack={() => setMode('menu')} />}
            {mode === 'hvh' && <HumanVsHuman key="hvh" onBack={() => setMode('menu')} />}
            {mode === 'classic' && <ClassicDebate key="classic" mode="classic" onBack={() => setMode('menu')} />}
            {mode === 'bias' && <BiasScanner key="bias" onBack={() => setMode('menu')} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
