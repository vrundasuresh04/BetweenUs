import React, { useState, useEffect } from 'react';
import { api, getSavedAccounts } from '../services/api';
import { Message, ReflectionSession, CommunicationFeedback, User, Partner } from '../types';
import {
  Columns2,
  Trash2,
  Send,
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  X,
  UserPlus,
  ArrowRight,
  LogIn
} from 'lucide-react';

interface PartnerDemoState {
  token: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_color: string;
  };
}

interface DualPartnerDemoViewProps {
  onClose: () => void;
  currentUser?: User | null;
  linkedPartner?: Partner | null;
  onPartnerLinked?: () => void;
  onNavigateToAuth?: () => void;
}

export const DualPartnerDemoView: React.FC<DualPartnerDemoViewProps> = ({
  onClose,
  currentUser,
  linkedPartner,
  onPartnerLinked,
  onNavigateToAuth,
}) => {
  const [partnerA, setPartnerA] = useState<PartnerDemoState | null>(null);
  const [partnerB, setPartnerB] = useState<PartnerDemoState | null>(null);
  const [coupleId, setCoupleId] = useState<string>('');
  const [isLinked, setIsLinked] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);

  // Quick linking state inside demo
  const [partnerEmailInput, setPartnerEmailInput] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState('');

  // Messages shared between both sides
  const [messages, setMessages] = useState<Message[]>([]);

  // Input states
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [sendingA, setSendingA] = useState(false);
  const [sendingB, setSendingB] = useState(false);

  // Communication review drawer states
  const [reviewA, setReviewA] = useState<CommunicationFeedback | null>(null);
  const [reviewB, setReviewB] = useState<CommunicationFeedback | null>(null);

  // Reflections state
  const [reflections, setReflections] = useState<ReflectionSession[]>([]);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionTitle, setReflectionTitle] = useState('Discussion on weekend plans');

  // Rating forms for Partner A & B
  const [ratingsA, setRatingsA] = useState({ communication: 3, trust: 4, support: 3, conflict: 3 });
  const [ratingsB, setRatingsB] = useState({ communication: 4, trust: 4, support: 4, conflict: 4 });
  const [submittingA, setSubmittingA] = useState(false);
  const [submittingB, setSubmittingB] = useState(false);

  // Initialize demo session
  const initDemo = async () => {
    setLoading(true);
    setError('');
    setAuthRequired(false);
    try {
      const res = await api.setupDemoSession();
      if (res.partnerA) {
        setPartnerA(res.partnerA);
      }
      if (res.isLinked && res.partnerB) {
        setIsLinked(true);
        setPartnerB(res.partnerB);
        setCoupleId(res.coupleId || '');
        await refreshData(res.partnerA.token);
      } else {
        setIsLinked(false);
        setPartnerB(null);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('Authentication required'))) {
        setAuthRequired(true);
      } else {
        setError(err.message || 'Failed to initialize demonstration session');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (token?: string) => {
    const activeToken = token || partnerA?.token;
    if (!activeToken || !isLinked) return;

    try {
      const resMsg = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${activeToken}` },
      }).then((r) => r.json());
      setMessages(resMsg.messages || []);

      const resRef = await fetch('/api/reflections', {
        headers: { Authorization: `Bearer ${activeToken}` },
      }).then((r) => r.json());
      setReflections(resRef.reflections || []);
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    initDemo();

    const interval = setInterval(() => {
      refreshData();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Quick connect / pair partner in demo view
  const handlePairAccounts = async (emailToPair: string) => {
    if (!emailToPair.trim()) return;
    setLinkingLoading(true);
    setError('');
    setLinkSuccess('');
    try {
      const res = await api.pairDemoUsers(emailToPair.trim());
      setLinkSuccess(res.message || 'Accounts linked successfully!');
      if (onPartnerLinked) {
        onPartnerLinked();
      }
      await initDemo();
    } catch (err: any) {
      setError(err.message || 'Failed to pair with partner account');
    } finally {
      setLinkingLoading(false);
    }
  };

  // Send message as Partner A
  const handleSendA = async (textOverride?: string) => {
    const text = textOverride !== undefined ? textOverride : inputA;
    if (!text.trim() || !partnerA) return;
    setSendingA(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerA.token}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      }).then((r) => r.json());

      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setInputA('');
        setReviewA(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingA(false);
    }
  };

  // Send message as Partner B
  const handleSendB = async (textOverride?: string) => {
    const text = textOverride !== undefined ? textOverride : inputB;
    if (!text.trim() || !partnerB) return;
    setSendingB(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerB.token}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      }).then((r) => r.json());

      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setInputB('');
        setReviewB(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingB(false);
    }
  };

  // Review Draft for A
  const handleReviewA = async () => {
    if (!inputA.trim() || !partnerA) return;
    try {
      const res = await fetch('/api/intelligence/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerA.token}`,
        },
        body: JSON.stringify({ text: inputA }),
      }).then((r) => r.json());
      setReviewA(res.feedback);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Review Draft for B
  const handleReviewB = async () => {
    if (!inputB.trim() || !partnerB) return;
    try {
      const res = await fetch('/api/intelligence/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerB.token}`,
        },
        body: JSON.stringify({ text: inputB }),
      }).then((r) => r.json());
      setReviewB(res.feedback);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Clear demo chat to start fresh
  const handleClearDemoChat = async () => {
    try {
      await api.clearDemoChat();
      setMessages([]);
      setReflections([]);
      setReviewA(null);
      setReviewB(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create reflection session
  const handleCreateReflection = async () => {
    if (!partnerA) return;
    try {
      await fetch('/api/reflections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerA.token}`,
        },
        body: JSON.stringify({ title: reflectionTitle }),
      });
      setShowReflectionModal(false);
      refreshData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit assessment from Partner A
  const handleSubmitAssessmentA = async (sessionId: string) => {
    if (!partnerA) return;
    setSubmittingA(true);
    try {
      await fetch(`/api/reflections/${sessionId}/assess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerA.token}`,
        },
        body: JSON.stringify(ratingsA),
      });
      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingA(false);
    }
  };

  // Submit assessment from Partner B
  const handleSubmitAssessmentB = async (sessionId: string) => {
    if (!partnerB) return;
    setSubmittingB(true);
    try {
      await fetch(`/api/reflections/${sessionId}/assess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${partnerB.token}`,
        },
        body: JSON.stringify(ratingsB),
      });
      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingB(false);
    }
  };

  const activeReflection = reflections[0] || null;

  // Partner names
  const nameA = partnerA?.user?.full_name || currentUser?.full_name || 'Partner A';
  const nameB = partnerB?.user?.full_name || linkedPartner?.full_name || 'Partner B';
  const colorA = partnerA?.user?.avatar_color || currentUser?.avatar_color || '#8b5cf6';
  const colorB = partnerB?.user?.avatar_color || linkedPartner?.avatar_color || '#06b6d4';

  const savedAccounts = getSavedAccounts().filter(
    (a) => a.user.id !== partnerA?.user?.id
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070a10] text-slate-100 overflow-hidden">
      {/* Top Demo Bar */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0d121f] px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Columns2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-['Outfit']">
              Dual-Partner Interactive Demonstration
            </h2>
            <span className="text-[11px] text-slate-400">
              Live two-way SQLite messaging between registered partner accounts
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Script Prompts */}
          {isLinked && (
            <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400">
              <span className="text-slate-400">Demo test prompt:</span>
              <button
                onClick={() => setInputA("Why didn't you speak much today? Are you upset about something?")}
                className="rounded bg-white/5 px-2 py-1 hover:bg-white/10 text-purple-300"
              >
                Fill {nameA} Prompt
              </button>
              <button
                onClick={() => setInputB("No, nothing like that. I was just busy. Did you take it that way? I'm sorry.")}
                className="rounded bg-white/5 px-2 py-1 hover:bg-white/10 text-cyan-300"
              >
                Fill {nameB} Reassuring
              </button>
              <button
                onClick={() => setInputB("Nothing like that. Bye.")}
                className="rounded bg-white/5 px-2 py-1 hover:bg-white/10 text-amber-300"
              >
                Fill {nameB} Brief
              </button>
            </div>
          )}

          {isLinked && (
            <button
              onClick={handleClearDemoChat}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
              title="Reset conversation to empty"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}

          {isLinked && (
            <button
              onClick={() => setShowReflectionModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer"
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              <span>Reflect Together</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
          >
            Exit Demo
          </button>
        </div>
      </div>

      {/* Shared Reflections Banner (If a reflection session is active) */}
      {isLinked && activeReflection && (
        <div className="border-b border-cyan-500/30 bg-[#0e172a] px-4 py-2.5 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-white">Active Reflection:</span>
            <span className="text-cyan-200">{activeReflection.title}</span>
            <span className="text-[10px] text-slate-400">
              ({activeReflection.bothCompleted ? 'Both submitted' : 'Pending submissions'})
            </span>
          </div>

          {activeReflection.bothCompleted && activeReflection.pgs ? (
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 text-cyan-300 font-bold font-mono">
                PGS: {activeReflection.pgs.pgs.toFixed(2)} / 16.00
              </span>
              <span className="text-slate-300 text-[11px]">
                {activeReflection.pgs.summary}
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Submit assessments on both sides below to reveal Perspective Gap Score</span>
            </div>
          )}
        </div>
      )}

      {/* Authentication required prompt */}
      {authRequired ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0d14]">
          <div className="glass-panel max-w-md w-full p-8 rounded-2xl text-center space-y-4 border-white/10">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
              <LogIn className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Authentication Required</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dual Demo Mode uses authenticated user identities and verified SQLite database storage. Please sign in or register to launch Dual Demo with your own account.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              {onNavigateToAuth ? (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAuth();
                  }}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Sign In / Register
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Close Demo
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Split-Screen Main Area */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
          {/* ================= LEFT SIDE: PARTNER A ================= */}
          <div className="flex flex-col h-full bg-[#0a0d14]/90 overflow-hidden">
            {/* Header A */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#0f172a] px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                  style={{ backgroundColor: colorA }}
                >
                  {nameA.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Partner A: {nameA}</span>
                  <span className="text-[10px] text-purple-300">Viewing as {nameA}</span>
                </div>
              </div>
              <span className="text-[10px] rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-purple-300">
                Authenticated (ID: {partnerA?.user?.id?.slice(0, 10)})
              </span>
            </div>

            {/* Messages Stream for A */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 p-6">
                  {isLinked
                    ? `No messages yet. Type below as ${nameA} to send to ${nameB}.`
                    : 'Connect a partner on the right to start messaging.'}
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === partnerA?.user.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isMe
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-slate-800 border border-white/10 text-slate-100 rounded-bl-sm'
                        }`}
                      >
                        <span className="text-[10px] block opacity-70 mb-0.5 font-semibold">
                          {isMe ? `You (${nameA})` : nameB}
                        </span>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reflection Assessment Card for A (if reflection is active and A hasn't submitted) */}
            {isLinked && activeReflection && !activeReflection.hasMyAssessment && (
              <div className="border-t border-purple-500/30 bg-[#121626] p-3 text-xs shrink-0">
                <div className="font-bold text-purple-300 mb-1">{nameA}'s Assessment (1 to 5):</div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Comm: {ratingsA.communication}</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={ratingsA.communication}
                      onChange={(e) => setRatingsA({ ...ratingsA, communication: Number(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Trust: {ratingsA.trust}</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={ratingsA.trust}
                      onChange={(e) => setRatingsA({ ...ratingsA, trust: Number(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Supp: {ratingsA.support}</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={ratingsA.support}
                      onChange={(e) => setRatingsA({ ...ratingsA, support: Number(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Conf: {ratingsA.conflict}</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={ratingsA.conflict}
                      onChange={(e) => setRatingsA({ ...ratingsA, conflict: Number(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSubmitAssessmentA(activeReflection.id)}
                  disabled={submittingA}
                  className="w-full rounded bg-purple-600 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 cursor-pointer"
                >
                  Submit {nameA}'s Perspective
                </button>
              </div>
            )}

            {/* Review Drawer A */}
            {reviewA && (
              <div className="border-t border-purple-500/30 bg-purple-950/30 p-3 text-xs shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-purple-300 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Clarity Review
                  </span>
                  <button onClick={() => setReviewA(null)} className="text-slate-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-slate-200 text-[11px] mb-2">{reviewA.neutralSummary}</p>
                {reviewA.nlpEmotion && reviewA.nlpEmotion.isPotentiallyHostileOrDismissive && (
                  <div className="rounded bg-amber-500/15 border border-amber-500/25 p-2 text-amber-200 text-[11px] mb-2 space-y-1">
                    <span className="font-semibold text-amber-300 block">Tone Cue (GoEmotions NLP):</span>
                    <p>{reviewA.nlpEmotion.advisoryNote}</p>
                    <span className="text-[10px] text-amber-400/80 italic block">
                      Trained Logistic Regression. Cautious observational indicator.
                    </span>
                  </div>
                )}
                {reviewA.constructiveSuggestion && !reviewA.nlpEmotion?.isPotentiallyHostileOrDismissive && (
                  <div className="rounded bg-purple-500/10 p-2 text-purple-200 text-[11px] mb-2">
                    {reviewA.constructiveSuggestion}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setReviewA(null)}
                    className="rounded px-2 py-1 text-slate-400 text-[11px]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleSendA()}
                    className="rounded bg-purple-600 px-3 py-1 text-white text-[11px] font-semibold"
                  >
                    Send Original
                  </button>
                </div>
              </div>
            )}

            {/* Composer A */}
            <div className="border-t border-white/10 bg-[#0d121c] p-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReviewA}
                  disabled={!inputA.trim() || !isLinked}
                  className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-2 text-xs text-purple-300 hover:bg-purple-500/20 disabled:opacity-40"
                  title="Review message clarity"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <input
                  type="text"
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendA()}
                  disabled={!isLinked}
                  placeholder={isLinked ? `Type as ${nameA}...` : 'Connect partner on right to chat...'}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
                <button
                  onClick={() => handleSendA()}
                  disabled={!inputA.trim() || sendingA || !isLinked}
                  className="rounded-xl bg-purple-600 p-2 text-white hover:bg-purple-500 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT SIDE: PARTNER B OR PARTNER LINKING ================= */}
          {!isLinked ? (
            /* Unlinked State: Show Partner Linking Interface */
            <div className="flex flex-col h-full bg-[#0a0d14]/90 p-6 overflow-y-auto">
              <div className="my-auto max-w-md mx-auto w-full glass-panel rounded-2xl p-6 border-cyan-500/20 bg-slate-900/80 space-y-4">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <UserPlus className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white font-['Outfit']">Partner Connection Required</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    You are signed in as <strong className="text-purple-300">{nameA}</strong>. Dual Demo Mode requires pairing with an authorized partner account.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                {linkSuccess && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    {linkSuccess}
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Pair with registered partner email:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={partnerEmailInput}
                      onChange={(e) => setPartnerEmailInput(e.target.value)}
                      placeholder="partner@example.com"
                      className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => handlePairAccounts(partnerEmailInput)}
                      disabled={!partnerEmailInput.trim() || linkingLoading}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40 cursor-pointer"
                    >
                      {linkingLoading ? 'Pairing...' : 'Pair'}
                    </button>
                  </div>
                </div>

                {/* Quick saved accounts from browser */}
                {savedAccounts.length > 0 && (
                  <div className="border-t border-white/10 pt-3 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      Or quick-connect with local saved account:
                    </span>
                    <div className="space-y-1.5">
                      {savedAccounts.map((acc) => (
                        <button
                          key={acc.user.id}
                          onClick={() => handlePairAccounts(acc.user.email)}
                          disabled={linkingLoading}
                          className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/70 p-2.5 text-left text-xs text-slate-200 hover:bg-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-white block">{acc.user.full_name}</span>
                            <span className="text-[10px] text-slate-400">{acc.user.email}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-semibold">
                            Connect <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Linked State: PARTNER B Stream */
            <div className="flex flex-col h-full bg-[#0a0d14]/90 overflow-hidden">
              {/* Header B */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0f172a] px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                    style={{ backgroundColor: colorB }}
                  >
                    {nameB.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Partner B: {nameB}</span>
                    <span className="text-[10px] text-cyan-300">Viewing as {nameB}</span>
                  </div>
                </div>
                <span className="text-[10px] rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-cyan-300">
                  Authenticated (ID: {partnerB?.user?.id?.slice(0, 10)})
                </span>
              </div>

              {/* Messages Stream for B */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 p-6">
                    Waiting for conversation to begin...
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === partnerB?.user.id;
                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-cyan-600 text-white rounded-br-sm'
                              : 'bg-slate-800 border border-white/10 text-slate-100 rounded-bl-sm'
                          }`}
                        >
                          <span className="text-[10px] block opacity-70 mb-0.5 font-semibold">
                            {isMe ? `You (${nameB})` : nameA}
                          </span>
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reflection Assessment Card for B (if reflection is active and B hasn't submitted) */}
              {activeReflection && (
                <div className="border-t border-cyan-500/30 bg-[#101c2c] p-3 text-xs shrink-0">
                  <div className="font-bold text-cyan-300 mb-1">{nameB}'s Assessment (1 to 5):</div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Comm: {ratingsB.communication}</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={ratingsB.communication}
                        onChange={(e) => setRatingsB({ ...ratingsB, communication: Number(e.target.value) })}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Trust: {ratingsB.trust}</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={ratingsB.trust}
                        onChange={(e) => setRatingsB({ ...ratingsB, trust: Number(e.target.value) })}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Supp: {ratingsB.support}</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={ratingsB.support}
                        onChange={(e) => setRatingsB({ ...ratingsB, support: Number(e.target.value) })}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Conf: {ratingsB.conflict}</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={ratingsB.conflict}
                        onChange={(e) => setRatingsB({ ...ratingsB, conflict: Number(e.target.value) })}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleSubmitAssessmentB(activeReflection.id)}
                    disabled={submittingB}
                    className="w-full rounded bg-cyan-600 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 cursor-pointer"
                  >
                    Submit {nameB}'s Perspective
                  </button>
                </div>
              )}

              {/* Review Drawer B */}
              {reviewB && (
                <div className="border-t border-cyan-500/30 bg-cyan-950/30 p-3 text-xs shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Clarity Review
                    </span>
                    <button onClick={() => setReviewB(null)} className="text-slate-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-slate-200 text-[11px] mb-2">{reviewB.neutralSummary}</p>
                  {reviewB.nlpEmotion && reviewB.nlpEmotion.isPotentiallyHostileOrDismissive && (
                    <div className="rounded bg-amber-500/15 border border-amber-500/25 p-2 text-amber-200 text-[11px] mb-2 space-y-1">
                      <span className="font-semibold text-amber-300 block">Tone Cue (GoEmotions NLP):</span>
                      <p>{reviewB.nlpEmotion.advisoryNote}</p>
                      <span className="text-[10px] text-amber-400/80 italic block">
                        Trained Logistic Regression. Cautious observational indicator.
                      </span>
                    </div>
                  )}
                  {reviewB.constructiveSuggestion && !reviewB.nlpEmotion?.isPotentiallyHostileOrDismissive && (
                    <div className="rounded bg-cyan-500/10 p-2 text-cyan-200 text-[11px] mb-2">
                      {reviewB.constructiveSuggestion}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setReviewB(null)}
                      className="rounded px-2 py-1 text-slate-400 text-[11px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSendB()}
                      className="rounded bg-cyan-600 px-3 py-1 text-white text-[11px] font-semibold"
                    >
                      Send Original
                    </button>
                  </div>
                </div>
              )}

              {/* Composer B */}
              <div className="border-t border-white/10 bg-[#0d121c] p-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReviewB}
                    disabled={!inputB.trim()}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2 text-xs text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40"
                    title="Review message clarity"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="text"
                    value={inputB}
                    onChange={(e) => setInputB(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendB()}
                    placeholder={`Type as ${nameB}...`}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSendB()}
                    disabled={!inputB.trim() || sendingB}
                    className="rounded-xl bg-cyan-600 p-2 text-white hover:bg-cyan-500 disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reflection Creation Modal */}
      {showReflectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full bg-[#0e1628] border-white/10">
            <h4 className="text-sm font-bold text-white mb-2">Create Reflection Session</h4>
            <input
              type="text"
              value={reflectionTitle}
              onChange={(e) => setReflectionTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-2.5 text-xs text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReflectionModal(false)}
                className="rounded-lg px-3 py-1 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReflection}
                className="rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};