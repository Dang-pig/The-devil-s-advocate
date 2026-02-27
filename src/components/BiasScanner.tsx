import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { generateBiasScannerQuestion } from '../services/geminiService';
import Markdown from 'react-markdown';
import { useI18n } from '../hooks/useI18n';

export default function BiasScanner({ onBack }: { onBack: () => void }) {
  const { t, locale } = useI18n();
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const loadQuestion = async () => {
    setLoading(true);
    setShowExplanation(false);
    setSelectedOption(null);
    try {
      const q = await generateBiasScannerQuestion(score, locale);
      setQuestion(q);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestion();
  }, [locale]);

  const handleSelectOption = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
    if (index === question.correctOptionIndex) {
      setScore(prev => prev + 10);
    } else {
      setScore(prev => Math.max(0, prev - 5));
    }
  };

  const getDifficultyTier = () => {
    if (score < 50) return t('bias.tier.beginner');
    if (score < 100) return t('bias.tier.analyst');
    if (score < 150) return t('bias.tier.strategist');
    return t('bias.tier.master');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-emerald-500">{t('bias.title')}</h2>
          <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest mt-1">
            {t('bias.tier')}: <span className="text-emerald-400">{getDifficultyTier()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest">{t('bias.score')}</div>
          <div className="text-3xl font-black font-mono text-white">{score}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono uppercase tracking-widest animate-pulse">
            {t('bias.generating')}
          </div>
        ) : question ? (
          <>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
              <div className="text-xs font-mono text-emerald-500 mb-4 uppercase tracking-wider">{t('bias.analyze')}</div>
              <div className="text-lg text-zinc-100 leading-relaxed font-serif italic">
                "{question.argument}"
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-8">
              {question.options.map((opt: string, i: number) => {
                let btnClass = "bg-zinc-900 border-zinc-800 hover:border-emerald-500 text-zinc-300";
                if (showExplanation) {
                  if (i === question.correctOptionIndex) {
                    btnClass = "bg-emerald-950/50 border-emerald-500 text-emerald-100";
                  } else if (i === selectedOption) {
                    btnClass = "bg-red-950/50 border-red-500 text-red-100";
                  } else {
                    btnClass = "bg-zinc-900 border-zinc-800 text-zinc-600 opacity-50";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(i)}
                    disabled={showExplanation}
                    className={`p-4 rounded-xl border text-left transition-all duration-300 ${btnClass}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center font-mono text-sm text-zinc-500">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div className="font-medium">{opt}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8"
              >
                <div className="mb-4 pb-4 border-b border-zinc-800">
                  <div className="text-xs font-mono text-emerald-500 mb-2 uppercase tracking-wider">{t('bias.whyCorrect')}</div>
                  <div className="text-zinc-300 text-sm leading-relaxed">{question.explanationCorrect}</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-red-500 mb-2 uppercase tracking-wider">{t('bias.whyWrong')}</div>
                  <div className="text-zinc-400 text-sm leading-relaxed">{question.explanationIncorrect}</div>
                </div>
              </motion.div>
            )}

            <div className="mt-auto flex gap-4">
              <button
                onClick={onBack}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
              >
                {t('bias.exit')}
              </button>
              {showExplanation && (
                <button
                  onClick={loadQuestion}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
                >
                  {t('bias.next')}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-red-500 font-mono uppercase tracking-widest">
            {t('bias.fault')}
          </div>
        )}
      </div>
    </motion.div>
  );
}
