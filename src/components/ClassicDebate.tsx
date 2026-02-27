import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { generateTopic, generateSides, generateClassicDebateResponse, evaluateClassicDebate } from '../services/geminiService';
import Markdown from 'react-markdown';
import { useI18n } from '../hooks/useI18n';

export default function ClassicDebate({ mode, onBack }: { mode: 'classic' | 'hardcore', onBack: () => void }) {
  const { t, locale } = useI18n();
  const [topic, setTopic] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [sides, setSides] = useState<{sideA: {title: string, summary: string}, sideB: {title: string, summary: string}} | null>(null);
  const [selectedSide, setSelectedSide] = useState<'A' | 'B' | null>(null);
  const [aiSide, setAiSide] = useState<{title: string, summary: string} | null>(null);
  const [userSide, setUserSide] = useState<{title: string, summary: string} | null>(null);
  const [step, setStep] = useState<'topic' | 'sides' | 'init' | 'debate' | 'evaluation'>('topic');
  const [transcript, setTranscript] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [viewMode, setViewMode] = useState<'text' | 'mindmap'>('text');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mode === 'hardcore' && timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      
      if (timeLeft === 90) setWarningMessage("⚠ 30 seconds used. Strengthen your structure.");
      else if (timeLeft === 60) setWarningMessage("⚠ 1 minute left. Focus on core logic.");
      else if (timeLeft === 30) setWarningMessage("⚠ FINAL 30 SECONDS. Deliver or collapse.");
      
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else if (mode === 'hardcore' && timerActive && timeLeft === 0) {
      handleTimeout();
    }
  }, [timeLeft, timerActive, mode]);

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

  const handleConfirmTopic = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setStep('sides');
    try {
      const generatedSides = await generateSides(topic, locale);
      setTopic(generatedSides.topic);
      setTopicDescription(generatedSides.description);
      setSides({ sideA: generatedSides.sideA, sideB: generatedSides.sideB });
    } catch (e) {
      console.error(e);
      setStep('topic');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSide = (side: 'A' | 'B') => {
    setSelectedSide(side);
  };

  const handleConfirmSide = () => {
    if (!sides || !selectedSide) return;
    if (selectedSide === 'A') {
      setUserSide(sides.sideA);
      setAiSide(sides.sideB);
    } else {
      setUserSide(sides.sideB);
      setAiSide(sides.sideA);
    }
    setStep('init');
  };

  const handleStart = async () => {
    if (!aiSide || !userSide) return;
    setStep('debate');
    setLoading(true);
    try {
      const aiResponse = await generateClassicDebateResponse(topic, aiSide.title, userSide.title, [], locale);
      setTranscript([{ role: 'ai', text: aiResponse }]);
      if (mode === 'hardcore') {
        setTimeLeft(120);
        setTimerActive(true);
        setWarningMessage('');
      }
    } catch (e) {
      setTranscript([{ role: 'ai', text: "Error initializing debate." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTurn = async () => {
    if (!currentInput.trim() || loading || !aiSide || !userSide) return;

    setTimerActive(false);
    const newTranscript = [...transcript, { role: 'user' as const, text: currentInput }];
    setTranscript(newTranscript);
    setCurrentInput('');
    setLoading(true);

    try {
      const aiResponse = await generateClassicDebateResponse(topic, aiSide.title, userSide.title, newTranscript, locale);
      setTranscript([...newTranscript, { role: 'ai', text: aiResponse }]);
      if (mode === 'hardcore') {
        setTimeLeft(120);
        setTimerActive(true);
        setWarningMessage('');
      }
    } catch (e) {
      setTranscript([...newTranscript, { role: 'ai', text: "System fault." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeout = async () => {
    if (!aiSide || !userSide) return;
    setTimerActive(false);
    setStep('evaluation');
    setLoading(true);
    try {
      const evalResult = await evaluateClassicDebate(topic, aiSide.title, userSide.title, transcript, true, locale);
      setEvaluation(evalResult);
    } catch (e) {
      setEvaluation("Error evaluating debate.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchSides = () => {
    const temp = aiSide;
    setAiSide(userSide);
    setUserSide(temp);
    setStep('init');
    setTranscript([]);
    setEvaluation(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      {step === 'topic' && (
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl mx-auto w-full text-center">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-white">
            {mode === 'hardcore' ? t('classic.hardcoreArena') : t('classic.classicArena')}
          </h2>
          <div className="w-full space-y-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('classic.enterTopic')}
              disabled={loading}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              onClick={handleAutoGenerateTopic}
              disabled={loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
            >
              {loading && !topic ? t('classic.generatingTopic') : t('classic.autoGenerate')}
            </button>
            <button
              onClick={handleConfirmTopic}
              disabled={!topic.trim() || loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
            >
              {loading && topic ? t('classic.generatingSides') : t('classic.confirmTopic')}
            </button>
          </div>
        </div>
      )}

      {step === 'sides' && (
        <div className="flex flex-col items-center justify-center flex-1 max-w-2xl mx-auto w-full text-center">
          {!sides ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-5xl animate-bounce">🎲</div>
              <div className="text-zinc-500 font-mono uppercase tracking-widest animate-pulse">
                {t('classic.generatingSides')}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 text-white">
                {t('classic.selectSide')}
              </h2>
              <div className="text-zinc-400 mb-8">{topicDescription}</div>
              <div className="grid grid-cols-2 gap-6 w-full mb-8">
                <button
                  onClick={() => handleSelectSide('A')}
                  className={`p-6 bg-zinc-900 hover:bg-zinc-800 border ${selectedSide === 'A' ? 'border-blue-500 bg-blue-950/20' : 'border-zinc-700 hover:border-blue-500/50'} rounded-xl transition-all text-left flex flex-col gap-2`}
                >
                  <div className="text-xl font-bold text-white">{sides.sideA.title}</div>
                  <div className="text-sm text-zinc-400">{sides.sideA.summary}</div>
                </button>
                <button
                  onClick={() => handleSelectSide('B')}
                  className={`p-6 bg-zinc-900 hover:bg-zinc-800 border ${selectedSide === 'B' ? 'border-red-500 bg-red-950/20' : 'border-zinc-700 hover:border-red-500/50'} rounded-xl transition-all text-left flex flex-col gap-2`}
                >
                  <div className="text-xl font-bold text-white">{sides.sideB.title}</div>
                  <div className="text-sm text-zinc-400">{sides.sideB.summary}</div>
                </button>
              </div>
              <button
                onClick={handleConfirmSide}
                disabled={!selectedSide}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
              >
                {t('confirmButton.label')}
              </button>
            </>
          )}
        </div>
      )}

      {step === 'init' && userSide && aiSide && (
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl mx-auto w-full text-center">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-white">
            {mode === 'hardcore' ? t('classic.hardcoreArena') : t('classic.classicArena')}
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 mb-8 w-full">
            <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-2">{t('classic.topicSelected')}</div>
            <div className="text-2xl font-bold text-white mb-6">{topic}</div>
            
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
                <div className="text-xs font-mono text-red-500 uppercase tracking-widest mb-1">{t('classic.aiStance')}</div>
                <div className="text-red-100 font-medium">{aiSide.title}</div>
              </div>
              <div className="p-4 bg-blue-950/20 border border-blue-900/50 rounded-lg">
                <div className="text-xs font-mono text-blue-500 uppercase tracking-widest mb-1">{t('classic.yourStance')}</div>
                <div className="text-blue-100 font-medium">{userSide.title}</div>
              </div>
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors"
          >
            {loading ? t('classic.processing') : t('classic.acknowledge')}
          </button>
        </div>
      )}

      {step === 'debate' && userSide && aiSide && (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-bold uppercase text-zinc-300">{t('classic.topicAck', { topic })}</h2>
              <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest mt-1">
                {t('classic.userAck', { side: userSide.title })} | {t('classic.aiAck', { side: aiSide.title })}
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div className="flex bg-zinc-900 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-1 text-xs font-mono uppercase tracking-widest rounded-md transition-colors ${viewMode === 'text' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t('classic.plainTextView')}
                </button>
                <button
                  onClick={() => setViewMode('mindmap')}
                  className={`px-3 py-1 text-xs font-mono uppercase tracking-widest rounded-md transition-colors ${viewMode === 'mindmap' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t('classic.mindMapView')}
                </button>
              </div>
              {mode === 'hardcore' && (
                <div className={`text-xl font-black font-mono mt-1 ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-zinc-300'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mb-6 pr-2">
            {viewMode === 'text' ? (
              <div className="space-y-6">
                {transcript.map((tItem, i) => (
                  <div key={i} className={`flex flex-col ${tItem.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-wider">
                      {tItem.role === 'user' ? t('classic.you') : t('classic.system')}
                    </div>
                    <div className={`p-4 rounded-xl max-w-[80%] font-mono ${tItem.role === 'user' ? 'bg-blue-950/30 border border-blue-900/50 text-blue-100' : 'bg-red-950/30 border border-red-900/50 text-red-100'}`}>
                      <Markdown>{tItem.text}</Markdown>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex flex-col items-start">
                    <div className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-wider">{t('classic.system')}</div>
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-sm animate-pulse">
                      {t('classic.processing')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-8 py-8 px-4 max-w-4xl mx-auto w-full">
                {transcript.map((tItem, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className={`text-xs font-mono uppercase tracking-widest ${tItem.role === 'user' ? 'text-blue-500' : 'text-red-500'}`}>
                      {tItem.role === 'user' ? t('classic.you') : t('classic.system')} - Turn {Math.floor(i/2) + 1}
                    </div>
                    
                    {tItem.role === 'user' ? (
                      <div className="bg-blue-950/20 border border-blue-900/50 p-6 rounded-xl text-blue-100 font-mono">
                        <Markdown>{tItem.text}</Markdown>
                      </div>
                    ) : (
                      <div className="bg-red-950/10 border border-red-900/30 p-6 rounded-xl text-red-100 font-mono">
                        <Markdown
                          components={{
                            p: ({node, ...props}) => <div className="bg-zinc-900/80 border border-red-900/30 p-4 rounded-lg mb-4 shadow-sm" {...props} />,
                            ul: ({node, ...props}) => <ul className="flex flex-col gap-3 my-4" {...props} />,
                            ol: ({node, ...props}) => <ol className="flex flex-col gap-3 my-4 list-decimal pl-4" {...props} />,
                            li: ({node, ...props}) => <li className="bg-zinc-900/80 border border-red-900/30 p-4 rounded-lg shadow-sm" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4 text-white" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 text-white" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2 text-white" {...props} />,
                          }}
                        >
                          {tItem.text}
                        </Markdown>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-mono text-red-500 uppercase tracking-widest">{t('classic.system')}</div>
                    <div className="bg-red-950/10 border border-red-900/30 p-6 rounded-xl">
                      <div className="bg-zinc-900/80 border border-red-900/30 p-4 rounded-lg shadow-sm animate-pulse text-zinc-500 font-mono">
                        {t('classic.processing')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto">
            {warningMessage && (
              <div className="text-sm font-mono text-red-500 mb-2 uppercase tracking-wider animate-pulse">
                {warningMessage}
              </div>
            )}
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder={t('hvh.construct')}
              disabled={loading}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors h-32 resize-none mb-4 disabled:opacity-50"
            />
            <button
              onClick={handleSubmitTurn}
              disabled={!currentInput.trim() || loading}
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
          
          <div className="flex-1 overflow-y-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
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
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={onBack}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors text-sm"
              >
                {t('classic.menu')}
              </button>
              <button
                onClick={() => setStep('topic')}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors text-sm"
              >
                {t('classic.replay')}
              </button>
              <button
                onClick={handleSwitchSides}
                className="bg-red-900/50 hover:bg-red-800/50 border border-red-900 text-white font-bold uppercase tracking-widest py-4 rounded-lg transition-colors text-sm"
              >
                {t('classic.switchSides')}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
