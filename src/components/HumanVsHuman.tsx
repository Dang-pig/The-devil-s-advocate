import { useState } from 'react';
import { motion } from 'motion/react';
import { generateTopic, generateSides, evaluateHumanVsHuman } from '../services/geminiService';
import Markdown from 'react-markdown';
import { useI18n } from '../hooks/useI18n';

export default function HumanVsHuman({ onBack }: { onBack: () => void }) {
  const { t, locale } = useI18n();
  const [topic, setTopic] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [sides, setSides] = useState<{sideA: {title: string, summary: string}, sideB: {title: string, summary: string}} | null>(null);
  const [step, setStep] = useState<'topic' | 'debate' | 'evaluation'>('topic');
  const [transcript, setTranscript] = useState<{ player: number, text: string }[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<number>(1);
  const [currentInput, setCurrentInput] = useState('');
  const [round, setRound] = useState(1);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const maxRounds = 3;

  const handleAutoGenerateTopic = async () => {
    setLoading(true);
    try {
      const generatedTopic = await generateTopic(locale);
      setTopic(generatedTopic);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const generatedSides = await generateSides(topic, locale);
      setTopic(generatedSides.topic);
      setTopicDescription(generatedSides.description);
      setSides({ sideA: generatedSides.sideA, sideB: generatedSides.sideB });
      setStep('debate');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTurn = async () => {
    if (!currentInput.trim()) return;

    const newTranscript = [...transcript, { player: currentPlayer, text: currentInput }];
    setTranscript(newTranscript);
    setCurrentInput('');

    if (currentPlayer === 1) {
      setCurrentPlayer(2);
    } else {
      if (round < maxRounds) {
        setRound(round + 1);
        setCurrentPlayer(1);
      } else {
        // End of debate
        setStep('evaluation');
        setLoading(true);
        try {
          const evalResult = await evaluateHumanVsHuman(topic, newTranscript, locale);
          setEvaluation(evalResult);
        } catch (e) {
          setEvaluation("Error evaluating debate. The system encountered a fault.");
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      {step === 'topic' && (
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl mx-auto w-full">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-white">{t('hvh.defineTopic')}</h2>
          <div className="w-full space-y-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('classic.enterTopic')}
              disabled={loading}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors text-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
            <button
              onClick={handleAutoGenerateTopic}
              disabled={loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
            >
              {loading && !topic ? t('classic.generatingTopic') : t('classic.autoGenerate')}
            </button>
            <button
              onClick={handleStart}
              disabled={!topic.trim() || loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
            >
              {loading && topic ? t('classic.generatingSides') : t('hvh.commence')}
            </button>
          </div>
        </div>
      )}

      {step === 'debate' && (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-6 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-bold uppercase text-zinc-300">{t('hvh.topic')}: <span className="text-white">{topic}</span></h2>
              {sides && (
                <div className="text-sm font-mono text-zinc-500 mt-2">
                  <div className="mb-1">{topicDescription}</div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex-1 bg-zinc-900/50 p-2 rounded border border-zinc-800">
                      <strong className="text-blue-400">{sides.sideA.title}</strong>: {sides.sideA.summary}
                    </div>
                    <div className="flex-1 bg-zinc-900/50 p-2 rounded border border-zinc-800">
                      <strong className="text-purple-400">{sides.sideB.title}</strong>: {sides.sideB.summary}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest whitespace-nowrap ml-4">
              {t('hvh.round', { current: round, total: maxRounds })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-2">
            {transcript.map((tItem, i) => (
              <div key={i} className={`flex flex-col ${tItem.player === 1 ? 'items-start' : 'items-end'}`}>
                <div className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-wider">{t('hvh.player', { player: tItem.player })}</div>
                <div className={`p-4 rounded-xl max-w-[80%] font-mono ${tItem.player === 1 ? 'bg-blue-950/30 border border-blue-900/50 text-blue-100' : 'bg-purple-950/30 border border-purple-900/50 text-purple-100'}`}>
                  {tItem.text}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <div className="text-sm font-mono text-red-500 mb-2 uppercase tracking-wider">
              {t('hvh.playerTurn', { player: currentPlayer })}
            </div>
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder={t('hvh.construct')}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors h-32 resize-none mb-4"
            />
            <button
              onClick={handleSubmitTurn}
              disabled={!currentInput.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
            >
              {t('hvh.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'evaluation' && (
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 text-red-500 border-b border-zinc-800 pb-4">
            {t('hvh.evaluation')}
          </h2>
          
          <div className="flex-1 overflow-y-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full text-zinc-500 font-mono uppercase tracking-widest animate-pulse">
                {t('hvh.analyzing')}
              </div>
            ) : (
              <div className="prose prose-invert prose-red max-w-none">
                <Markdown>{evaluation || ''}</Markdown>
              </div>
            )}
          </div>

          {!loading && (
            <button
              onClick={onBack}
              className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
            >
              {t('hvh.returnToMenu')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
