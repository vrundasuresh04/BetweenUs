import React, { useState } from 'react';
import { User, Partner, ReflectionSession } from '../types';
import { api } from '../services/api';
import {
  BrainCircuit,
  PlusCircle,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
  BarChart3,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface ReflectionsViewProps {
  user: User;
  partner: Partner | null;
  reflections: ReflectionSession[];
  onRefresh: () => void;
  onNavigateToPartner: () => void;
}

export const ReflectionsView: React.FC<ReflectionsViewProps> = ({
  user,
  partner,
  reflections,
  onRefresh,
  onNavigateToPartner,
}) => {
  const [selectedSession, setSelectedSession] = useState<ReflectionSession | null>(
    reflections.length > 0 ? reflections[0] : null
  );

  // Form state for assessment submission
  const [commRating, setCommRating] = useState<number>(3);
  const [trustRating, setTrustRating] = useState<number>(3);
  const [suppRating, setSuppRating] = useState<number>(3);
  const [confRating, setConfRating] = useState<number>(3);
  const [privateNotes, setPrivateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Create session modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // If no partner linked
  if (!partner) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="glass-panel rounded-2xl p-8 border-white/10">
          <BrainCircuit className="h-10 w-10 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white font-['Outfit']">Reflect Together</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Reflections require a connected partner so that both perspectives can be submitted and compared independently.
          </p>
          <button
            onClick={onNavigateToPartner}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-purple-500 transition-all cursor-pointer"
          >
            Connect With Partner
          </button>
        </div>
      </div>
    );
  }

  // Handle creating a new reflection session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.createReflection(newTitle.trim() || undefined);
      setShowCreateModal(false);
      setNewTitle('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create reflection session');
    } finally {
      setCreating(false);
    }
  };

  // Handle submitting assessment
  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    setSubmitting(true);
    setError('');
    try {
      await api.submitAssessment(selectedSession.id, {
        communication: commRating,
        trust: trustRating,
        support: suppRating,
        conflict: confRating,
        private_notes: privateNotes.trim(),
      });
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit ratings');
    } finally {
      setSubmitting(false);
    }
  };

  const currentSession =
    reflections.find((r) => r.id === selectedSession?.id) || reflections[0] || null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1">
            <BrainCircuit className="h-4 w-4" />
            <span>Reflect Together</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
            Independent Reflections & Perspective Gap
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Submit your private ratings on 4 key dimensions. Scores are only compared when both partners submit.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Start New Reflection
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Layout */}
      {reflections.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center max-w-lg mx-auto">
          <BrainCircuit className="h-12 w-12 text-cyan-400/80 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white font-['Outfit']">No Reflection Sessions Yet</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Reflections allow you and {partner.full_name} to assess a conversation privately across 4 dimensions: Communication, Trust, Support, and Conflict Resolution.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-cyan-500 transition-all cursor-pointer"
          >
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sessions List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Sessions ({reflections.length})
            </h3>
            <div className="space-y-2">
              {reflections.map((r) => {
                const isSelected = r.id === currentSession?.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedSession(r)}
                    className={`w-full text-left rounded-xl p-4 transition-all border ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/5 bg-slate-900/60 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {r.title}
                      </span>
                      {r.bothCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          PGS Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      <span>
                        {r.hasMyAssessment
                          ? r.hasPartnerAssessment
                            ? 'Both Completed'
                            : 'Awaiting Partner'
                          : 'Your rating pending'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Session Details, Form, and PGS Result */}
          <div className="lg:col-span-8">
            {currentSession && (
              <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
                {/* Session Header */}
                <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-white font-['Outfit']">
                      {currentSession.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Created by {currentSession.created_by === user.id ? 'You' : partner.full_name} on{' '}
                      {new Date(currentSession.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                        currentSession.bothCompleted
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                          : 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {currentSession.bothCompleted ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Comparison Computed
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          Awaiting Completion
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* State A: Both Completed -> Display Perspective Gap Score (PGS) */}
                {currentSession.bothCompleted && currentSession.pgs ? (
                  <div className="space-y-6">
                    {/* Score Card */}
                    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-purple-950/30 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block mb-1">
                            Perspective Gap Score (PGS)
                          </span>
                          <div className="flex items-baseline gap-3">
                            <span className="text-4xl sm:text-5xl font-extrabold text-white font-['Outfit']">
                              {currentSession.pgs.pgs.toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">/ 16.00</span>
                            <span className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs text-cyan-300 font-semibold capitalize">
                              {currentSession.pgs.divergenceLevel} Divergence
                            </span>
                          </div>
                        </div>

                        {/* Mathematical Formula callout */}
                        <div className="rounded-xl bg-black/40 border border-white/10 p-3 text-[11px] font-mono text-slate-300 max-w-xs">
                          <span className="text-[10px] text-slate-400 block font-sans">Formula:</span>
                          PGS = [(ΔComm)² + (ΔTrust)² + (ΔSupp)² + (ΔConf)²] / 4
                        </div>
                      </div>

                      <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {currentSession.pgs.summary}
                      </p>
                    </div>

                    {/* Dimension Breakdown Table / Visualizer */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Dimension Perspective Breakdown
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentSession.pgs.gaps.map((gap) => (
                          <div
                            key={gap.dimension}
                            className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{gap.label}</span>
                              <span className="text-xs font-mono font-semibold text-cyan-400">
                                Δ = {gap.delta} pt{gap.delta === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Your Rating: <strong className="text-purple-300">{gap.partnerAScore} / 5</strong></span>
                              <span>Partner's Rating: <strong className="text-cyan-300">{gap.partnerBScore} / 5</strong></span>
                            </div>

                            {/* Gap Bar */}
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  gap.delta === 0
                                    ? 'bg-emerald-400 w-full'
                                    : gap.delta <= 1
                                    ? 'bg-cyan-400 w-1/3'
                                    : gap.delta <= 2
                                    ? 'bg-amber-400 w-2/3'
                                    : 'bg-rose-400 w-full'
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reflection Prompt */}
                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 mb-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Constructive Reflection Question</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {currentSession.pgs.reflectionPrompt}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-400 italic">
                      Perspective Gap Score indicates differences in reported perspective. It is not an evaluation of relationship quality or emotional intention.
                    </div>
                  </div>
                ) : currentSession.hasMyAssessment ? (
                  /* State B: You submitted, partner pending */
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 mx-auto">
                      <Clock className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-white font-['Outfit']">
                      Your Assessment is Stored Privately
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      You have submitted your ratings. To maintain independent perspective integrity, individual scores are concealed until {partner.full_name} submits their evaluation.
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Perspective Gap Score will automatically reveal when both finish.</span>
                    </div>
                  </div>
                ) : (
                  /* State C: You have not submitted yet -> Show Assessment Form */
                  <form onSubmit={handleSubmitAssessment} className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">
                        Submit Your Independent Perspective
                      </h3>
                      <p className="text-xs text-slate-400">
                        Rate this conversation on each of the 4 core dimensions (1 = Low / Disconnected, 5 = High / Aligned).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Communication Clarity */}
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white">Communication Clarity</label>
                          <span className="text-xs font-mono font-bold text-purple-400">{commRating} / 5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={commRating}
                          onChange={(e) => setCommRating(Number(e.target.value))}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>1 (Unclear/Abrupt)</span>
                          <span>5 (Clear/Attuned)</span>
                        </div>
                      </div>

                      {/* Mutual Trust */}
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white">Mutual Trust & Openness</label>
                          <span className="text-xs font-mono font-bold text-cyan-400">{trustRating} / 5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={trustRating}
                          onChange={(e) => setTrustRating(Number(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>1 (Guarded)</span>
                          <span>5 (Open/Secure)</span>
                        </div>
                      </div>

                      {/* Emotional Support */}
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white">Emotional Support</label>
                          <span className="text-xs font-mono font-bold text-indigo-400">{suppRating} / 5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={suppRating}
                          onChange={(e) => setSuppRating(Number(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>1 (Dismissive)</span>
                          <span>5 (Supportive)</span>
                        </div>
                      </div>

                      {/* Conflict Resolution */}
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white">Conflict Resolution</label>
                          <span className="text-xs font-mono font-bold text-teal-400">{confRating} / 5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={confRating}
                          onChange={(e) => setConfRating(Number(e.target.value))}
                          className="w-full accent-teal-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>1 (Left Open)</span>
                          <span>5 (Constructive)</span>
                        </div>
                      </div>
                    </div>

                    {/* Private personal note */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">
                          Private Personal Reflection Note
                        </label>
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <Lock className="h-3 w-3" />
                          Strictly private (never visible to partner)
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Optional personal notes about how you felt or what you wished was communicated..."
                        className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{submitting ? 'Submitting...' : 'Save & Submit Perspective'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border-white/10 bg-[#0f172a] shadow-2xl">
            <h3 className="text-lg font-bold text-white font-['Outfit'] mb-1">
              Start Reflection Session
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Creates a mutual session for you and {partner.full_name} to rate your latest conversation.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Session Topic / Reference
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Conversation about evening schedule"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-500 shadow-md transition-all cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
