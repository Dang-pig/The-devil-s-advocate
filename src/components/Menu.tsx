import { motion } from 'motion/react';
import { Users, Brain, Target, Swords } from 'lucide-react';
import { Mode } from '../App';
import { useI18n } from '../hooks/useI18n';

export default function Menu({ onSelectMode }: { onSelectMode: (mode: Mode) => void }) {
  const { t } = useI18n();

  const groupedModes = [
    {
      id: 'classic',
      title: t('classicDebate.label'),
      description: t('classicDebate.desc'),
      icon: <Brain className="w-6 h-6" />,
      color: 'text-purple-500',
      border: 'border-purple-900/50',
      bg: 'hover:bg-purple-950/20'
    },
    {
      id: 'hvh',
      title: t('hvh.label'),
      description: t('hvh.desc'),
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-500',
      border: 'border-blue-900/50',
      bg: 'hover:bg-blue-950/20'
    },
    {
      id: 'bias',
      title: t('biasScanner.label'),
      description: t('biasScanner.desc'),
      icon: <Target className="w-6 h-6" />,
      color: 'text-emerald-500',
      border: 'border-emerald-900/50',
      bg: 'hover:bg-emerald-950/20'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-white">
          {t('menu.selectArena')}
        </h2>
        <p className="text-zinc-400 font-mono text-sm max-w-lg mx-auto">
          {t('menu.prepare')}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Prominent Quest Mode */}
        <button
          onClick={() => onSelectMode('quest')}
          className="group flex flex-col md:flex-row items-start md:items-center text-left p-8 rounded-2xl border border-amber-900/50 bg-amber-950/10 transition-all duration-300 hover:bg-amber-950/20 hover:border-amber-500/50 gap-6"
        >
          <div className="p-4 rounded-xl border bg-zinc-950 border-amber-900/50 text-amber-500">
            <Swords className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold uppercase tracking-wide mb-2 text-zinc-100 group-hover:text-white">
              {t('quest.label')}
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {t('quest.desc')}
            </p>
          </div>
        </button>

        {/* Grouped Modes */}
        <div 
          role="region" 
          aria-labelledby="modes-heading"
          className="border border-zinc-800/50 rounded-2xl p-6 bg-zinc-900/20"
        >
          <h3 id="modes-heading" className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-6">
            {t('modes.heading')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groupedModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSelectMode(mode.id as Mode)}
                className={`group flex flex-col items-start text-left p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 transition-all duration-300 ${mode.bg} hover:border-zinc-700`}
              >
                <div className={`p-3 rounded-lg border bg-zinc-950 mb-4 ${mode.border} ${mode.color}`}>
                  {mode.icon}
                </div>
                <div>
                  <h4 className="text-lg font-bold uppercase tracking-wide mb-2 text-zinc-100 group-hover:text-white">
                    {mode.title}
                  </h4>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
