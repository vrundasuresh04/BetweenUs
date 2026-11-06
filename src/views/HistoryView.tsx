import React, { useState, useEffect } from 'react';
import { User, Partner, Message, ReflectionSession } from '../types';
import { api } from '../services/api';
import {
  History as HistoryIcon,
  Search,
  MessageSquare,
  BrainCircuit,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';

interface HistoryViewProps {
  user: User;
  partner: Partner | null;
  reflections: ReflectionSession[];
  onNavigateToReflections: () => void;
  onNavigateToChat: () => void;
  onRefresh?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  user,
  partner,
  reflections,
  onNavigateToReflections,
  onNavigateToChat,
  onRefresh,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'messages' | 'reflections'>('messages');

  // Deletion modals state
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [messageDeleteError, setMessageDeleteError] = useState('');

  const [reflectionToWithdraw, setReflectionToWithdraw] = useState<ReflectionSession | null>(null);
  const [withdrawingReflection, setWithdrawingReflection] = useState(false);
  const [reflectionWithdrawError, setReflectionWithdrawError] = useState('');

  const loadMessages = () => {
    if (!partner) return;
    setLoading(true);
    api.getMessages()
      .then((res) => {
        setMessages(res.messages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
  }, [partner]);

  // Handle message deletion
  const handleConfirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    setDeletingMessage(true);
    setMessageDeleteError('');
    try {
      await api.deleteMessage(messageToDelete.id);
      setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
      setMessageToDelete(null);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setMessageDeleteError(err.message || 'Failed to delete message');
    } finally {
      setDeletingMessage(false);
    }
  };

  // Handle reflection withdrawal
  const handleConfirmWithdrawReflection = async () => {
    if (!reflectionToWithdraw) return;
    setWithdrawingReflection(true);
    setReflectionWithdrawError('');
    try {
      await api.deleteReflection(reflectionToWithdraw.id);
      setReflectionToWithdraw(null);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setReflectionWithdrawError(err.message || 'Failed to withdraw reflection assessment');
    } finally {
      setWithdrawingReflection(false);
    }
  };

  const filteredMessages = messages.filter((m) =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedReflections = reflections.filter((r) => r.bothCompleted);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <HistoryIcon className="h-4 w-4" />
            <span>Interaction Archive</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
            History & Records
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Searchable historical archive of your conversations and mutual reflection evaluations.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Messages ({messages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reflections')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'reflections'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>Reflections ({completedReflections.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'messages' ? (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past messages..."
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading conversation history...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {searchQuery ? 'No messages match your search filter.' : 'No messages in conversation history yet.'}
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3 last:border-0 group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: isMe ? user.avatar_color : (partner?.avatar_color || '#06b6d4') }}
                      >
                        {isMe ? user.full_name.charAt(0).toUpperCase() : (partner?.full_name.charAt(0).toUpperCase() || 'P')}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          {isMe ? 'You' : partner?.full_name}
                        </span>
                        <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>

                      {/* Authorized Message Deletion (Only author can delete) */}
                      {isMe && (
                        <button
                          onClick={() => setMessageToDelete(msg)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-400 rounded hover:bg-white/5 cursor-pointer"
                          title="Delete message for both users"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Completed Reflections */
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-3">
            {completedReflections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No completed reflections found. Both partners must submit their ratings to complete a reflection.
              </div>
            ) : (
              completedReflections.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-900/40 p-4 transition-all hover:bg-slate-900/70 group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{r.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      Completed on {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {r.pgs && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Perspective Gap</span>
                        <span className="font-mono font-bold text-cyan-300 text-sm">
                          PGS {r.pgs.pgs.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={onNavigateToReflections}
                      className="rounded-lg bg-white/5 p-2 text-slate-300 hover:bg-white/10 cursor-pointer"
                      title="View detailed breakdown in Reflections"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    {/* Authorized Reflection Assessment Withdrawal */}
                    {r.hasMyAssessment && (
                      <button
                        onClick={() => setReflectionToWithdraw(r)}
                        className="rounded-lg bg-white/5 p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Withdraw your evaluation from this session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Message Deletion Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border-red-500/30 bg-[#121626] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">Delete Message?</h3>
                <span className="text-xs text-slate-400">Permanently removes from SQLite conversation</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/80 p-3 border border-white/5">
              <p className="text-xs text-slate-200 italic line-clamp-3">"{messageToDelete.text}"</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deleting this message permanently removes it from the shared conversation for both you and <strong className="text-white">{partner?.full_name || 'your partner'}</strong>. This action updates the database and cannot be undone.
            </p>

            {messageDeleteError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                {messageDeleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setMessageToDelete(null);
                  setMessageDeleteError('');
                }}
                disabled={deletingMessage}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/15 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteMessage}
                disabled={deletingMessage}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deletingMessage ? 'Deleting...' : 'Delete for Both'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Withdrawal Confirmation Modal */}
      {reflectionToWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border-amber-500/30 bg-[#121626] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">Withdraw Reflection Assessment?</h3>
                <span className="text-xs text-slate-400">Withdraw your ratings for this session</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/80 p-3 border border-white/5">
              <span className="text-[10px] text-slate-400 block mb-0.5">Session Title:</span>
              <p className="text-xs font-semibold text-white">{reflectionToWithdraw.title}</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Withdrawing your assessment will remove your ratings and re-lock the Perspective Gap Score until you evaluate again. Your partner's independent submission will remain safely preserved in the database.
            </p>

            {reflectionWithdrawError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                {reflectionWithdrawError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setReflectionToWithdraw(null);
                  setReflectionWithdrawError('');
                }}
                disabled={withdrawingReflection}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/15 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWithdrawReflection}
                disabled={withdrawingReflection}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{withdrawingReflection ? 'Withdrawing...' : 'Withdraw Assessment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};