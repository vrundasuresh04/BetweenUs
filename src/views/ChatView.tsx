import React, { useState, useEffect, useRef } from 'react';
import { User, Partner, Message, CommunicationFeedback } from '../types';
import { api } from '../services/api';
import {
  Send,
  Sparkles,
  Info,
  BrainCircuit,
  AlertCircle,
  HelpCircle,
  X,
  CheckCircle2,
  Edit3,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';

interface ChatViewProps {
  user: User;
  partner: Partner | null;
  onNavigateToPartner: () => void;
  onStartReflection: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  user,
  partner,
  onNavigateToPartner,
  onStartReflection,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Communication Intelligence: Sender Review state
  const [reviewLoading, setReviewLoading] = useState(false);
  const [senderFeedback, setSenderFeedback] = useState<CommunicationFeedback | null>(null);
  const [showSenderReviewPanel, setShowSenderReviewPanel] = useState(false);

  // Communication Intelligence: Recipient Insight state
  const [selectedMessageForInsight, setSelectedMessageForInsight] = useState<Message | null>(null);
  const [recipientFeedback, setRecipientFeedback] = useState<CommunicationFeedback | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Machine Learning Emotion Analysis Modal state
  const [selectedMsgForMl, setSelectedMsgForMl] = useState<Message | null>(null);
  const [mlAnalysis, setMlAnalysis] = useState<any | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [saveMlLoading, setSaveMlLoading] = useState(false);
  const [saveMlSuccess, setSaveMlSuccess] = useState(false);
  const [saveMlError, setSaveMlError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial fetch and incremental polling
  useEffect(() => {
    if (!partner) return;

    let isMounted = true;
    setLoading(true);

    api.getMessages()
      .then((res) => {
        if (isMounted) {
          const list = res.messages || [];
          setMessages(list);
          messagesRef.current = list;
          setLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load conversation');
          setLoading(false);
        }
      });

    // Poll every 2.5 seconds for new messages
    const interval = setInterval(async () => {
      try {
        const cur = messagesRef.current;
        const lastMsg = cur[cur.length - 1];
        const res = await api.pollMessages(lastMsg ? lastMsg.created_at : undefined);
        if (isMounted && res.messages && res.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnly = res.messages.filter((m: Message) => !existingIds.has(m.id));
            if (newOnly.length > 0) {
              const updated = [...prev, ...newOnly];
              messagesRef.current = updated;
              setTimeout(scrollToBottom, 50);
              return updated;
            }
            return prev;
          });
        }
      } catch (err) {
        // Silent poll error
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [partner]);

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || sending) return;

    setSending(true);
    setError('');

    const clientMsgId = 'cli_' + Math.random().toString(36).substring(2, 9);

    try {
      const res = await api.sendMessage(text, clientMsgId);
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setInputText('');
        setShowSenderReviewPanel(false);
        setSenderFeedback(null);
        setTimeout(scrollToBottom, 50);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Sender-first: Review My Message
  const handleReviewDraft = async () => {
    if (!inputText.trim()) return;

    setReviewLoading(true);
    setError('');
    try {
      const lastPartnerMsg = [...messages].reverse().find((m) => m.sender_id !== user.id);
      const res = await api.reviewMessage(inputText, lastPartnerMsg?.text);
      setSenderFeedback(res.feedback);
      setShowSenderReviewPanel(true);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze wording');
    } finally {
      setReviewLoading(false);
    }
  };

  // ML-Assisted Conversation Tone Analysis (Trained GoEmotions Classifier)
  const handleAnalyzeMessageWithMl = async (msg: Message) => {
    setSelectedMsgForMl(msg);
    setMlLoading(true);
    setMlAnalysis(null);
    setSaveMlSuccess(false);
    setSaveMlError('');
    try {
      const res = await api.analyzeMessageEmotion(msg.text);
      setMlAnalysis(res);
    } catch (err: any) {
      setSaveMlError(err.message || 'Failed to analyze message tone with ML');
    } finally {
      setMlLoading(false);
    }
  };

  const handleSaveMlAnalysis = async () => {
    if (!selectedMsgForMl || !mlAnalysis) return;
    setSaveMlLoading(true);
    setSaveMlError('');
    try {
      await api.saveMessageAnalysis({
        message_id: selectedMsgForMl.id,
        message_text: selectedMsgForMl.text,
        top_emotion: mlAnalysis.topEmotion,
        confidence: mlAnalysis.confidence,
        probabilities: mlAnalysis.probabilities,
        observation: mlAnalysis.observation,
      });
      setSaveMlSuccess(true);
    } catch (err: any) {
      setSaveMlError(err.message || 'Failed to save observation to Insights');
    } finally {
      setSaveMlLoading(false);
    }
  };

  if (!partner) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="glass-panel rounded-2xl p-8 border-white/10">
          <div className="mx-auto h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white font-['Outfit']">Connect With Your Partner</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            BetweenUs is an exclusive two-person private platform. You need to link your account with your partner before entering the chat.
          </p>
          <button
            onClick={onNavigateToPartner}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer"
          >
            Go to Partner Linking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 h-[calc(100vh-5rem)] flex flex-col">
      {/* Chat Header */}
      <div className="glass-panel rounded-t-2xl px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: partner.avatar_color || '#06b6d4' }}
          >
            {partner.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-['Outfit']">{partner.full_name}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" title="Connected in private room" />
            </div>
            <span className="text-[11px] text-slate-400">Private Two-Partner Chat</span>
          </div>
        </div>

        <button
          onClick={onStartReflection}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-all"
          title="Create a reflection session from this conversation"
        >
          <BrainCircuit className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reflect on Conversation</span>
          <span className="sm:hidden">Reflect</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0a0d14]/70 border-x border-white/10">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            <Clock className="h-4 w-4 animate-spin mr-2" />
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white font-['Outfit']">Start your conversation</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              This space belongs only to you and {partner.full_name}. No fictional messages or preloaded scripts. Type your first thought to begin.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                  {!isMe && (
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-1"
                      style={{ backgroundColor: partner.avatar_color || '#06b6d4' }}
                    >
                      {partner.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-br-sm'
                        : 'bg-[#182138] border border-white/10 text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                        isMe ? 'text-purple-200/70' : 'text-slate-400'
                      }`}
                    >
                      <span>{timeStr}</span>
                      {isMe && (
                        msg.read_by_recipient === 1 ? (
                          <span title="Read by partner"><CheckCheck className="h-3 w-3 text-cyan-300" /></span>
                        ) : (
                          <span title="Sent"><Check className="h-3 w-3 text-purple-300/60" /></span>
                        )
                      )}
                    </div>
                  </div>

                  {/* ML Tone & Emotion Analysis action button */}
                  <button
                    onClick={() => handleAnalyzeMessageWithMl(msg)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-white/5 cursor-pointer"
                    title="Analyze message tone with trained GoEmotions NLP"
                  >
                    <BrainCircuit className="h-3.5 w-3.5 text-cyan-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sender-First Communication Review Panel (Expandable Drawer) */}
      {showSenderReviewPanel && senderFeedback && (
        <div className="border-x border-t border-purple-500/30 bg-[#12192c] p-4 text-xs transition-all animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-purple-300">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Communication Clarity Review</span>
            </div>
            <button
              onClick={() => setShowSenderReviewPanel(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 text-slate-300">
            <p className="leading-relaxed font-medium text-slate-200">
              {senderFeedback.neutralSummary}
            </p>

            {senderFeedback.constructiveSuggestion && (
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2.5 text-purple-200 leading-relaxed">
                <span className="font-semibold text-purple-300 block mb-0.5">Gentle Suggestion:</span>
                {senderFeedback.constructiveSuggestion}
              </div>
            )}

            {senderFeedback.nlpEmotion && senderFeedback.nlpEmotion.isPotentiallyHostileOrDismissive && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-2.5 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Tone Cue (GoEmotions Experimental):</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-100">
                  {senderFeedback.nlpEmotion.advisoryNote}
                </p>
                <p className="text-[10px] text-amber-400/80 italic">
                  Note: Experimental 9-class baseline. Does not reliably detect sarcasm, friendly teasing, or partner intent.
                </p>
              </div>
            )}

            {senderFeedback.nlpEmotion && !senderFeedback.nlpEmotion.isPotentiallyHostileOrDismissive && senderFeedback.nlpEmotion.topEmotion !== 'neutral' && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  Detected Emotion: <span className="text-cyan-300 font-semibold capitalize">{senderFeedback.nlpEmotion.topEmotion}</span> ({Math.round(senderFeedback.nlpEmotion.confidence * 100)}%)
                </span>
                <span className="text-[10px] text-slate-500 italic">GoEmotions Baseline</span>
              </div>
            )}

            {senderFeedback.detectedCues.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {senderFeedback.detectedCues.map((cue) => (
                  <span
                    key={cue.id}
                    className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                    {cue.label}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 italic">
                {senderFeedback.educationalNote}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSenderReviewPanel(false)}
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                >
                  Edit Message
                </button>
                <button
                  onClick={() => handleSendMessage()}
                  className="rounded-lg bg-purple-600 px-3 py-1 font-semibold text-white hover:bg-purple-500 text-xs shadow-sm cursor-pointer"
                >
                  Send Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ML Tone & Emotion Analysis Modal */}
      {selectedMsgForMl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-lg w-full border-cyan-500/30 bg-[#0e1526] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold font-['Outfit']">
                <BrainCircuit className="h-5 w-5 text-cyan-400" />
                <span>ML Tone & Emotion Analysis</span>
              </div>
              <button
                onClick={() => {
                  setSelectedMsgForMl(null);
                  setMlAnalysis(null);
                  setSaveMlSuccess(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-900/70 p-3.5 border border-white/10">
              <span className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                Analyzed Message
              </span>
              <p className="text-xs text-slate-200 italic leading-relaxed">
                "{selectedMsgForMl.text}"
              </p>
            </div>

            {mlLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Clock className="h-6 w-6 animate-spin mx-auto text-cyan-400" />
                <p>Running inference with trained GoEmotions NLP classifier...</p>
              </div>
            ) : mlAnalysis ? (
              <div className="space-y-4 text-xs">
                {/* Model Predictions */}
                <div className="rounded-xl bg-cyan-950/30 border border-cyan-500/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Predicted Tone</span>
                      <span className="text-lg font-bold text-cyan-300 capitalize font-['Outfit']">
                        {mlAnalysis.topEmotion}
                      </span>
                    </div>
                    <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 text-xs font-mono font-bold text-cyan-300">
                      {(mlAnalysis.confidence * 100).toFixed(1)}% confidence
                    </span>
                  </div>

                  {/* Top Probabilities */}
                  {mlAnalysis.probabilities && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Probability Distribution:</span>
                      <div className="space-y-1">
                        {Object.entries(mlAnalysis.probabilities as Record<string, number>)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 4)
                          .map(([emotion, prob]) => (
                            <div key={emotion} className="flex items-center justify-between text-[11px]">
                              <span className="capitalize text-slate-300 w-24">{emotion}</span>
                              <div className="flex-1 mx-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-cyan-400 rounded-full"
                                  style={{ width: `${Math.min(100, Math.round(prob * 100))}%` }}
                                />
                              </div>
                              <span className="font-mono text-slate-400 text-[10px] w-10 text-right">
                                {(prob * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-white/5 flex items-center justify-between">
                    <span>Artifact: Trained GoEmotions Logistic Regression</span>
                    <span className="text-cyan-400 font-mono">5,000 TF-IDF features</span>
                  </div>
                </div>

                {/* Observation */}
                {mlAnalysis.observation && (
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3.5 space-y-1">
                    <span className="text-[11px] font-semibold text-purple-300 block">Communication Observation:</span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {mlAnalysis.observation}
                    </p>
                  </div>
                )}

                {/* Conceptual Distinction Note */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-[10px] text-slate-400 leading-relaxed italic">
                  Note: Machine learning observes linguistic patterns in written text. It does not measure relationship quality, internal feelings, or replace subjective reflection ratings.
                </div>

                {saveMlError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-300">
                    {saveMlError}
                  </div>
                )}

                {saveMlSuccess && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>Saved to Insights Dashboard! This observation is now visible in your Communication Insights.</span>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => {
                  setSelectedMsgForMl(null);
                  setMlAnalysis(null);
                  setSaveMlSuccess(false);
                }}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/15 cursor-pointer"
              >
                Close
              </button>

              {mlAnalysis && !saveMlSuccess && (
                <button
                  onClick={handleSaveMlAnalysis}
                  disabled={saveMlLoading}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{saveMlLoading ? 'Saving...' : 'Save Observation to Insights'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="bg-red-500/10 border-x border-red-500/30 px-4 py-2 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Message Composer */}
      <div className="glass-panel rounded-b-2xl p-3 border-t border-white/10 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Review My Message (Sender-First Feedback Button) */}
          <button
            type="button"
            onClick={handleReviewDraft}
            disabled={!inputText.trim() || reviewLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
            title="Review how your message might sound before sending"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Review Draft</span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${partner.full_name}...`}
            className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 h-10 w-10 text-white shadow-md hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
            title="Send Message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
