import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generateTurn, generatePlayerChoices, explainChoice, levelSummary, LEVEL_FIRST_SPEAKER } from '../services/geminiService';
import { Download, ArrowLeft } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

type TurnState = 
  | 'AI_GENERATING'
  | 'AI_DISPLAYING'
  | 'PLAYER_CHOOSING'
  | 'PLAYER_TYPING'
  | 'EVALUATING'
  | 'SHOWING_FEEDBACK'
  | 'LEVEL_COMPLETE';

export default function DebateQuest({ onBack }: { onBack: () => void }) {
  const { t, locale } = useI18n();
  const [hardcore, setHardcore] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [view, setView] = useState<'map' | 'briefing' | 'level' | 'summary'>('map');
  
  // Level State
  const [turnIndex, setTurnIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [aiText, setAiText] = useState('');
  const [displayedAiText, setDisplayedAiText] = useState('');
  const [playerText, setPlayerText] = useState('');
  const [displayedPlayerText, setDisplayedPlayerText] = useState('');
  const [playerChoices, setPlayerChoices] = useState<any[]>([]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [wrongChoices, setWrongChoices] = useState<string[]>([]);
  const [feedbackPanel, setFeedbackPanel] = useState<{ type: 'correct' | 'incorrect', text: string } | null>(null);
  const [totalTurns, setTotalTurns] = useState(8);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);
  const [correctPicks, setCorrectPicks] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [turnState, setTurnState] = useState<TurnState>('AI_GENERATING');

  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const speaker = LEVEL_FIRST_SPEAKER[currentLevel] === 'AI' 
    ? (turnIndex % 2 === 0 ? 'AI' : 'Player') 
    : (turnIndex % 2 === 0 ? 'Player' : 'AI');

  const topicTitle = t(`topics.level${currentLevel + 1}.title`);
  const topicDesc = t(`topics.level${currentLevel + 1}.description`);
  const playerRole = t(`topics.level${currentLevel + 1}.playerRole`);
  const aiRole = t(`topics.level${currentLevel + 1}.aiRole`);

  // Shuffle array utility
  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  useEffect(() => {
    if (view === 'level') {
      // Re-run generation if language changes during a level
      processTurn(turnIndex, history);
    }
  }, [locale]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, displayedAiText, turnState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'level' || turnState !== 'PLAYER_CHOOSING') return;

      // Number keys 1-4
      const num = parseInt(e.key);
      if (!isNaN(num) && num > 0 && num <= playerChoices.length) {
        const choiceId = playerChoices[num - 1].id;
        if (!wrongChoices.includes(choiceId)) {
          setSelectedChoiceId(choiceId);
        }
      }

      // Enter to confirm
      if (e.key === 'Enter' && selectedChoiceId) {
        handleConfirmChoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, turnState, playerChoices, selectedChoiceId, wrongChoices]);

  const startLevel = () => {
    setTurnIndex(0);
    setHistory([]);
    setAiText('');
    setDisplayedAiText('');
    setPlayerText('');
    setDisplayedPlayerText('');
    setPlayerChoices([]);
    setSelectedChoiceId(null);
    setWrongChoices([]);
    setFeedbackPanel(null);
    setAttempts(0);
    setCorrectPicks(0);
    setTotalTurns(8);
    setView('level');
    processTurn(0, []);
  };

  const processTurn = async (tIndex: number, currentHistory: any[]) => {
    const currentSpeaker = LEVEL_FIRST_SPEAKER[currentLevel] === 'AI' 
      ? (tIndex % 2 === 0 ? 'AI' : 'Player') 
      : (tIndex % 2 === 0 ? 'Player' : 'AI');

    if (currentSpeaker === 'AI') {
      setTurnState('AI_GENERATING');
      setPlayerChoices([]);
      try {
        const aiResponse = await generateTurn(topicTitle, topicDesc, playerRole, aiRole, currentLevel, tIndex, currentHistory, hardcore, locale);
        setAiText(aiResponse.text);
        setTurnState('AI_DISPLAYING');
        startTyping(aiResponse.text, 'AI');
      } catch (e) {
        setAiText("System error generating AI response.");
        setTurnState('AI_DISPLAYING');
        startTyping("System error generating AI response.", 'AI');
      }
    } else {
      setTurnState('PLAYER_CHOOSING');
      setPlayerChoices([]);
      try {
        const choicesResponse = await generatePlayerChoices(topicTitle, topicDesc, playerRole, aiRole, currentLevel, tIndex, currentHistory, hardcore, locale);
        setPlayerChoices(shuffleArray(choicesResponse.choices || []));
      } catch (e) {
        setPlayerChoices([]);
      }
    }
  };

  const startTyping = (text: string, target: 'AI' | 'Player', choiceId?: string) => {
    if (skipTyping || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (target === 'AI') {
        setDisplayedAiText(text);
      } else {
        setDisplayedPlayerText(text);
        finishPlayerTyping(text, choiceId);
      }
      return;
    }

    if (target === 'AI') setDisplayedAiText('');
    else setDisplayedPlayerText('');

    let i = 0;
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    typingIntervalRef.current = setInterval(() => {
      if (target === 'AI') {
        setDisplayedAiText(text.substring(0, i + 1));
      } else {
        setDisplayedPlayerText(text.substring(0, i + 1));
      }
      i++;
      if (i >= text.length) {
        clearInterval(typingIntervalRef.current!);
        if (target === 'Player') {
          finishPlayerTyping(text, choiceId);
        }
      }
    }, 30);
  };

  const handleSkipTyping = () => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    if (turnState === 'AI_DISPLAYING') {
      setDisplayedAiText(aiText);
    } else if (turnState === 'PLAYER_TYPING') {
      setDisplayedPlayerText(playerText);
      finishPlayerTyping(playerText, selectedChoiceId || undefined);
    }
  };

  const finishPlayerTyping = async (text: string, choiceId?: string) => {
    setTurnState('EVALUATING');
    const idToUse = choiceId || selectedChoiceId;
    const choice = playerChoices.find(c => c.id === idToUse);
    if (!choice) return;

    const explanation = await explainChoice(topicTitle, topicDesc, playerRole, aiRole, choice.id, history, hardcore, choice.rationaleForCorrectness, choice.isCorrect, locale);
    
    if (choice.isCorrect) {
      setCorrectPicks(prev => prev + 1);
      setFeedbackPanel({ type: 'correct', text: explanation.explanationText });
      setTurnState('SHOWING_FEEDBACK');
      
      const newHistory = [...history, { speaker: 'Player', text: choice.text, isCorrect: true, rationale: explanation.explanationText }];
      setHistory(newHistory);
      
      setTimeout(() => {
        setFeedbackPanel(null);
        setSelectedChoiceId(null);
        setWrongChoices([]);
        
        if (turnIndex + 1 >= totalTurns) {
          finishLevel(newHistory);
        } else {
          setTurnIndex(prev => prev + 1);
          processTurn(turnIndex + 1, newHistory);
        }
      }, hardcore ? 1500 : 2500);
    } else {
      setFeedbackPanel({ type: 'incorrect', text: explanation.explanationText });
      setTurnState('SHOWING_FEEDBACK');
    }
  };

  const handleConfirmChoice = () => {
    if (!selectedChoiceId || turnState !== 'PLAYER_CHOOSING') return;
    
    const choice = playerChoices.find(c => c.id === selectedChoiceId);
    if (!choice) return;

    setAttempts(prev => prev + 1);
    setPlayerText(choice.text);
    setTurnState('PLAYER_TYPING');
    startTyping(choice.text, 'Player', choice.id);
  };

  const handleRetry = () => {
    if (selectedChoiceId) {
      setWrongChoices(prev => [...prev, selectedChoiceId]);
    }
    setFeedbackPanel(null);
    setSelectedChoiceId(null);
    setTurnState('PLAYER_CHOOSING');
  };

  const finishLevel = async (finalHistory: any[]) => {
    setTurnState('LEVEL_COMPLETE');
    setView('summary');
    try {
      const summary = await levelSummary(topicTitle, topicDesc, playerRole, aiRole, finalHistory, hardcore, locale);
      if (hardcore) {
        const penalty = (attempts - correctPicks) * 5;
        summary.score = Math.max(0, summary.score - penalty);
      }
      setSummaryData(summary);
    } catch (e) {
      setSummaryData({ score: 0, overallTips: "Error generating summary.", perTurnAnalysis: [] });
    }
  };

  const exportSummary = () => {
    if (!summaryData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(summaryData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `debate_quest_level_${currentLevel + 1}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (view === 'map') {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('map.backToMenu')}
          </button>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono uppercase tracking-widest ${hardcore ? 'text-red-500' : 'text-zinc-500'}`}>
              {hardcore ? t('quest.hardcore') : t('quest.standard')}
            </span>
            <button 
              onClick={() => setHardcore(!hardcore)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${hardcore ? 'bg-red-900' : 'bg-zinc-800'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hardcore ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-white text-center">{t('quest.label')}</h2>
        
        <div className="max-w-2xl mx-auto w-full space-y-4 relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-800 z-0" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="relative z-10 flex items-center gap-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-xl border-4 ${i === currentLevel ? 'bg-red-600 border-red-900 text-white' : i < currentLevel ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
                {i + 1}
              </div>
              <div 
                className={`flex-1 p-6 rounded-2xl border transition-all cursor-pointer ${i === currentLevel ? 'bg-zinc-900 border-red-500/50 hover:border-red-500' : i < currentLevel ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-950/50 border-zinc-900 opacity-50 pointer-events-none'}`}
                onClick={() => { if (i <= currentLevel) { setCurrentLevel(i); setView('briefing'); } }}
              >
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">{t('map.level', { level: i + 1 })}</div>
                <div className={`text-lg font-bold ${i === currentLevel ? 'text-white' : 'text-zinc-400'}`}>{t(`topics.level${i + 1}.title`)}</div>
              </div>
            </div>
          ))}
          <div className="text-center pt-8 text-zinc-500 font-mono text-sm uppercase tracking-widest">
            {t('map.toBeContinued')}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'briefing') {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div id="level-briefing-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-xl w-full text-center shadow-2xl">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-6 text-white">{t('levelBriefing.title')}</h2>
          
          <div className="space-y-6 mb-8 text-left">
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">{t('levelBriefing.topic')}</div>
              <div className="text-xl font-bold text-white">{topicTitle}</div>
            </div>
            
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
              <div className="text-zinc-300 whitespace-pre-wrap">
                {t('quest.roleBriefing', { playerRole, aiRole })}
              </div>
            </div>

            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
              <div className="text-zinc-300 font-mono text-sm">
                {t('quest.turnsInfo', { turns: 8 })}
              </div>
            </div>
          </div>

          <button
            onClick={startLevel}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors"
          >
            {t('levelBriefing.start')}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'summary') {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-white text-center">{t('summary.levelComplete')}</h2>
        
        {!summaryData ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono uppercase tracking-widest animate-pulse">
            {t('summary.analyzing')}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="text-6xl font-black text-white mb-2">{summaryData.score}</div>
              <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-6">{t('summary.finalScore')}</div>
              <p className="text-zinc-300 leading-relaxed">{summaryData.overallTips}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold uppercase text-white mb-4">{t('summary.turnAnalysis')}</h3>
              {summaryData.perTurnAnalysis.map((analysis: any, i: number) => (
                <div key={i} className={`p-6 rounded-xl border ${analysis.isCorrect ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                  <div className="text-xs font-mono uppercase tracking-widest mb-2 text-zinc-500">Turn {analysis.turnIndex + 1}</div>
                  <div className="font-medium text-white mb-2">"{analysis.playerChoiceText}"</div>
                  <div className={`text-sm ${analysis.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.explanation}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setView('map')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors">
                {t('summary.returnToMap')}
              </button>
              <button onClick={exportSummary} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest py-4 rounded-xl transition-colors">
                <Download className="w-5 h-5" /> {t('summary.exportJson')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Level View - Asymmetric Grid
  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 grid grid-cols-[1fr_2fr] grid-rows-2 gap-4 min-h-0">
        
        {/* Top: Debate History & Current AI Argument (100%) */}
        <div className="col-start-1 col-end-3 row-start-1 row-end-2 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 flex flex-col relative overflow-y-auto break-words" style={{ fontSize: 'clamp(12px, 1.3vw, 15px)' }}>
          <div className="flex flex-col gap-6 h-full">
            {history.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.speaker === 'Player' ? 'items-end' : 'items-start'} gap-2`}>
                <div className="flex items-center gap-2">
                  <div className="text-2xl">{msg.speaker === 'Player' ? '🧑' : '🤖'}</div>
                  <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{msg.speaker === 'Player' ? t('quest.player') : t('classic.system')}</div>
                </div>
                <div className={`max-w-3xl w-full font-mono ${msg.speaker === 'Player' ? 'bg-blue-900/50 border border-blue-700/50 rounded-2xl rounded-tr-none text-blue-100' : 'bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-none text-white'} p-6 shadow-xl break-words`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Current AI Message */}
            {speaker === 'AI' && (
              <div className="flex flex-col items-start gap-2 mt-auto">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">🤖</div>
                  {turnState === 'AI_GENERATING' && (
                    <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                      {t('quest.generatingArgument')}
                    </div>
                  )}
                  {turnState === 'AI_DISPLAYING' && (
                    <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                      {t('classic.system')}
                    </div>
                  )}
                </div>
                
                {(turnState !== 'AI_GENERATING' && aiText) && (
                  <div className="max-w-3xl w-full">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-none p-6 text-white shadow-xl relative chat-bubble break-words font-mono">
                      {displayedAiText}
                      {turnState === 'AI_DISPLAYING' && displayedAiText !== aiText && <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse align-middle" />}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        <div className={`w-2 h-2 rounded-full ${turnState === 'AI_DISPLAYING' && displayedAiText !== aiText ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
                        {turnState === 'AI_DISPLAYING' && displayedAiText !== aiText ? t('quest.systemTyping') : t('quest.systemIdle')}
                      </div>
                      {turnState === 'AI_DISPLAYING' && displayedAiText !== aiText && (
                        <button onClick={handleSkipTyping} className="text-xs font-mono text-zinc-400 hover:text-white uppercase tracking-widest">
                          {t('quest.skipTyping')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom-Left: Context */}
        <div className="col-start-1 col-end-2 row-start-2 row-end-3 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 flex flex-col justify-between z-10 overflow-y-auto break-words" style={{ fontSize: 'clamp(12px, 1.3vw, 15px)' }}>
          <div>
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Topic: {topicTitle}</div>
            <div className="flex items-center gap-4 text-sm font-mono text-zinc-400">
              <span>{t('quest.turn', { current: turnIndex + 1, total: totalTurns })}</span>
              <span>•</span>
              <span className={hardcore ? 'text-red-400' : ''}>{hardcore ? t('quest.hardcore') : t('quest.standard')}</span>
            </div>
          </div>
        </div>

        {/* Bottom-Right: Player Area */}
        <div className="col-start-2 col-end-3 row-start-2 row-end-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex gap-6 relative z-20 overflow-y-auto break-words" style={{ fontSize: 'clamp(12px, 1.3vw, 15px)' }}>
          
          {/* Left side of Player Area: Choices & Bubble */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            {turnState === 'PLAYER_CHOOSING' && playerChoices.map((choice, index) => {
              const isSelected = selectedChoiceId === choice.id;
              const isWrong = wrongChoices.includes(choice.id);
              return (
                <button
                  key={choice.id}
                  data-choice-id={choice.id}
                  onClick={() => !isWrong && setSelectedChoiceId(choice.id)}
                  disabled={isWrong}
                  className={`p-3 rounded-xl text-left transition-all ${isWrong ? 'opacity-30 line-through bg-zinc-950 border-zinc-900' : isSelected ? 'bg-blue-900/50 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'} border break-words`}
                >
                  <span className="font-mono text-xs opacity-50 mr-2">{index + 1}.</span>
                  {choice.text}
                </button>
              );
            })}
            
            {(turnState === 'PLAYER_TYPING' || turnState === 'EVALUATING' || turnState === 'SHOWING_FEEDBACK') && (
              <div className="mt-auto flex flex-col gap-2">
                <div className="bg-blue-900 border border-blue-700 rounded-2xl rounded-tr-none p-4 text-white leading-relaxed shadow-xl break-words chat-bubble font-mono">
                  {displayedPlayerText}
                  {turnState === 'PLAYER_TYPING' && <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse align-middle" />}
                </div>
                {turnState === 'PLAYER_TYPING' && displayedPlayerText !== playerText && (
                  <button onClick={handleSkipTyping} className="text-xs font-mono text-zinc-400 hover:text-white uppercase tracking-widest self-end">
                    {t('quest.skipTyping')}
                  </button>
                )}
                {turnState === 'EVALUATING' && (
                  <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse self-end mt-1">
                    {t('quest.evaluating')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side of Player Area: Avatar & Buttons */}
          <div className="w-40 flex flex-col items-center justify-between shrink-0 border-l border-zinc-800/50 pl-6">
            <div className="w-full flex flex-col gap-2 items-end">
              <div className="bg-zinc-800 px-3 py-1 rounded-full text-xs font-mono text-zinc-400 uppercase tracking-widest">
                {t('quest.player')}
              </div>
              <div className="bg-zinc-800 px-3 py-1 rounded-full text-xs font-mono text-zinc-400 uppercase tracking-widest">
                {t('quest.attempts', { count: attempts })}
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 mt-auto w-full">
              <div className="text-5xl mb-2">🧑</div>
              
              {turnState === 'PLAYER_CHOOSING' && playerChoices.length === 0 && (
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse text-center">
                  {t('quest.preparingChoices')}
                </div>
              )}

              {turnState === 'PLAYER_CHOOSING' && playerChoices.length > 0 && (
                <button
                  id="confirm-choice-btn"
                  onClick={handleConfirmChoice}
                  disabled={!selectedChoiceId}
                  className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 font-bold uppercase tracking-widest py-3 px-2 rounded-xl transition-colors confirm-button text-sm text-center"
                >
                  {t('confirmButton.label')}
                </button>
              )}

              {turnState === 'AI_DISPLAYING' && displayedAiText === aiText && (
                <button
                  onClick={() => {
                    setTurnIndex(prev => prev + 1);
                    const newHistory = [...history, { speaker: 'AI', text: aiText }];
                    setHistory(newHistory);
                    processTurn(turnIndex + 1, newHistory);
                  }}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest py-3 px-2 rounded-xl transition-colors text-sm text-center"
                >
                  {t('quest.nextTurn')}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Feedback Panels */}
      <AnimatePresence>
        {feedbackPanel?.type === 'incorrect' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm error-overlay"
          >
            <div className="bg-red-950 border-2 border-red-600 rounded-3xl p-12 max-w-3xl w-full shadow-2xl shadow-red-900/50 text-center">
              <div className="text-6xl mb-6">❌</div>
              <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-6">{t('errorOverlay.flawedLogic')}</h3>
              <p className="text-xl text-red-200 leading-relaxed mb-12">
                {feedbackPanel.text}
              </p>
              <button
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest py-4 px-12 rounded-xl transition-colors"
              >
                {t('errorOverlay.retry')}
              </button>
            </div>
          </motion.div>
        )}

        {feedbackPanel?.type === 'correct' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-emerald-950 border border-emerald-600 rounded-2xl p-6 shadow-2xl shadow-emerald-900/20 max-w-md w-full success-panel"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl">✅</div>
              <div>
                <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-sm mb-1">{t('successPanel.soundArgument')}</h4>
                <p className="text-emerald-100 text-sm leading-relaxed">{feedbackPanel.text}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
