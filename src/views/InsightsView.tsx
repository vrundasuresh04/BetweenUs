import React from 'react';
import { AnalyticsData, Partner } from '../types';
import {
  BarChart3,
  TrendingUp,
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  TrendingDown,
  Activity
} from 'lucide-react';

interface InsightsViewProps {
  analytics: AnalyticsData | null;
  partner: Partner | null;
  onNavigateToReflections: () => void;
  onNavigateToChat?: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  analytics,
  partner,
  onNavigateToReflections,
  onNavigateToChat,
}) => {
  const hasReflectionData =
    analytics && (analytics.totalSessions > 0 || (analytics.pendingSessions || 0) > 0);
  const hasCompletedSessions = analytics && analytics.totalSessions > 0;
  const emotionInsights = analytics?.emotionInsights;
  const hasMlData = emotionInsights && emotionInsights.totalAnalyzed > 0;

  // Calculate PGS trajectory
  let trajectory: 'converging' | 'diverging' | 'stable' | null = null;
  let pgsDelta = 0;
  if (analytics && analytics.snapshots.length >= 2) {
    const firstPgs = analytics.snapshots[0].pgs_score;
    const lastPgs = analytics.snapshots[analytics.snapshots.length - 1].pgs_score;
    pgsDelta = Math.round((lastPgs - firstPgs) * 100) / 100;
    if (pgsDelta < -0.2) trajectory = 'converging';
    else if (pgsDelta > 0.2) trajectory = 'diverging';
    else trajectory = 'stable';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
          <BarChart3 className="h-4 w-4" />
          <span>Dynamic Relationship Analytics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
          Communication & Perspective Insights
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Genuinely dynamic metrics derived strictly from mutual SQLite reflection evaluations and trained NLP tone inference.
        </p>
      </div>

      {!hasReflectionData && !hasMlData ? (
        <div className="glass-panel rounded-2xl p-12 text-center max-w-lg mx-auto">
          <BarChart3 className="h-12 w-12 text-indigo-400/80 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white font-['Outfit']">No Saved Insights Yet</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Historical perspective trends, dimension discrepancies, and ML tone patterns become available once you and {partner?.full_name || 'your partner'} complete reflections or analyze conversation tone.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={onNavigateToReflections}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-purple-500 transition-all cursor-pointer"
            >
              Go to Reflections
            </button>
            {onNavigateToChat && (
              <button
                onClick={onNavigateToChat}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition-all cursor-pointer"
              >
                Go to Chat
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 4 Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current PGS */}
            <div className="glass-card rounded-2xl p-5 border-white/10 bg-slate-900/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Current PGS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-['Outfit']">
                  {analytics?.currentPgs !== null && analytics?.currentPgs !== undefined
                    ? analytics.currentPgs.toFixed(2)
                    : '—'}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 16.00</span>
              </div>
              <p className="mt-1.5 text-[11px] text-cyan-300">
                {analytics?.currentPgs !== null && analytics?.currentPgs !== undefined
                  ? 'Latest completed mutual reflection'
                  : 'Awaiting mutual submission'}
              </p>
            </div>

            {/* Average PGS */}
            <div className="glass-card rounded-2xl p-5 border-white/10 bg-slate-900/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Average PGS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-['Outfit']">
                  {analytics?.averagePgs !== null && analytics?.averagePgs !== undefined
                    ? analytics.averagePgs.toFixed(2)
                    : '—'}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 16.00</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Mean across all completed evaluations
              </p>
            </div>

            {/* Completed Sessions */}
            <div className="glass-card rounded-2xl p-5 border-white/10 bg-slate-900/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Completed Reflections
              </span>
              <div className="text-3xl font-extrabold text-emerald-400 font-['Outfit']">
                {analytics?.totalSessions || 0}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Evaluated by both you and {partner?.full_name || 'partner'}
              </p>
            </div>

            {/* Pending Sessions */}
            <div className="glass-card rounded-2xl p-5 border-white/10 bg-slate-900/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Pending Reflections
              </span>
              <div className="text-3xl font-extrabold text-amber-400 font-['Outfit']">
                {analytics?.pendingSessions || 0}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Awaiting one or both partner ratings
              </p>
            </div>
          </div>

          {/* PGS Trend Visualizer */}
          {analytics && analytics.snapshots.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 border-white/10 bg-slate-900/70 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-base font-bold text-white font-['Outfit']">
                      Perspective Gap Trajectory & History
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chronological progression of mutual discrepancy scores (0 = identical, 16 = maximum disagreement).
                  </p>
                </div>

                {trajectory && (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                      trajectory === 'converging'
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : trajectory === 'diverging'
                        ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                        : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                    }`}
                  >
                    {trajectory === 'converging' ? (
                      <>
                        <TrendingDown className="h-3.5 w-3.5" />
                        <span>Gap Narrowing ({Math.abs(pgsDelta).toFixed(2)} pts closer)</span>
                      </>
                    ) : trajectory === 'diverging' ? (
                      <>
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Gap Widening (+{pgsDelta.toFixed(2)} pts)</span>
                      </>
                    ) : (
                      <>
                        <Activity className="h-3.5 w-3.5" />
                        <span>Stable Alignment</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Visual Bars for Snapshots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                {analytics.snapshots.map((s, idx) => {
                  const pgs = s.pgs_score;
                  const level =
                    pgs <= 1.0 ? 'Minimal' : pgs <= 3.0 ? 'Mild' : pgs <= 6.0 ? 'Moderate' : 'Significant';
                  const colorClass =
                    pgs <= 1.0
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                      : pgs <= 3.0
                      ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
                      : pgs <= 6.0
                      ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                      : 'border-rose-500/40 bg-rose-950/20 text-rose-300';

                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl border p-4 space-y-2 transition-all hover:bg-white/5 ${colorClass}`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Session #{idx + 1}</span>
                        <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-extrabold text-2xl font-['Outfit'] text-white">
                          {pgs.toFixed(2)}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider">{level}</span>
                      </div>
                      {/* Bar indicator */}
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-current transition-all"
                          style={{ width: `${Math.min(100, Math.round((pgs / 16) * 100))}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-300 truncate" title={s.interaction_title}>
                        {s.interaction_title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Average Dimension Gaps */}
          {analytics?.dimensionAverages && hasCompletedSessions && (
            <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                Average Dimension Discrepancies
              </h3>
              <p className="text-xs text-slate-400">
                Displays the average rating discrepancy (Δ = 0 to 4 points) between your ratings and your partner's across each core dimension.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-xs text-slate-400 block mb-1">Communication Gap</span>
                  <div className="text-2xl font-bold text-purple-300 font-mono">
                    Δ {analytics.dimensionAverages.communication_gap.toFixed(2)}
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(analytics.dimensionAverages.communication_gap / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Clarity & attunement</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-xs text-slate-400 block mb-1">Trust Gap</span>
                  <div className="text-2xl font-bold text-cyan-300 font-mono">
                    Δ {analytics.dimensionAverages.trust_gap.toFixed(2)}
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${(analytics.dimensionAverages.trust_gap / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Security & openness</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-xs text-slate-400 block mb-1">Support Gap</span>
                  <div className="text-2xl font-bold text-indigo-300 font-mono">
                    Δ {analytics.dimensionAverages.support_gap.toFixed(2)}
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(analytics.dimensionAverages.support_gap / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Empathy & listening</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <span className="text-xs text-slate-400 block mb-1">Conflict Resolution Gap</span>
                  <div className="text-2xl font-bold text-teal-300 font-mono">
                    Δ {analytics.dimensionAverages.conflict_gap.toFixed(2)}
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${(analytics.dimensionAverages.conflict_gap / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">De-escalation & repair</span>
                </div>
              </div>
            </div>
          )}

          {/* Machine Learning Tone & Emotion Patterns (Change 3) */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5 border-cyan-500/20 bg-slate-900/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
                  <BrainCircuit className="h-4 w-4" />
                  <span>NLP Model Insights</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                  Machine Learning Emotion & Tone Summaries
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Aggregated from messages analyzed using the trained GoEmotions One-vs-Rest Logistic Regression classifier.
                </p>
              </div>

              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[11px] font-mono text-cyan-300 shrink-0">
                9-Class GoEmotions Artifact
              </span>
            </div>

            {hasMlData ? (
              <div className="space-y-6">
                {/* Distribution Grid */}
                <div>
                  <span className="text-xs font-semibold text-slate-300 block mb-3 uppercase tracking-wider">
                    Observed Tone Distribution ({emotionInsights.totalAnalyzed} Analyzed Messages)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(emotionInsights.emotionCounts).map(([emotion, count]) => {
                      const pct = Math.round((count / emotionInsights.totalAnalyzed) * 100);
                      return (
                        <div
                          key={emotion}
                          className="rounded-xl border border-white/10 bg-slate-900/60 p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white capitalize">{emotion}</span>
                            <span className="text-[11px] font-mono text-cyan-300 font-bold">{count}x</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 block">{pct}% of sample</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Saved Observations */}
                {emotionInsights.recentObservations && emotionInsights.recentObservations.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
                      Recent Saved Communication Observations
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {emotionInsights.recentObservations.map((obs) => (
                        <div
                          key={obs.id}
                          className="rounded-xl border border-white/10 bg-[#0d1424] p-4 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-bold text-cyan-300 capitalize">
                              {obs.top_emotion} ({(obs.confidence * 100).toFixed(0)}%)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(obs.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-300 italic text-[11px] line-clamp-2">
                            "{obs.message_text}"
                          </p>
                          {obs.observation && (
                            <p className="text-slate-400 text-[11px] leading-relaxed pt-1 border-t border-white/5">
                              {obs.observation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6 text-center space-y-2">
                <BrainCircuit className="h-8 w-8 text-cyan-400/60 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No Message Tone Analyses Saved Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Hover over any message in the Chat and click the <strong className="text-cyan-300">BrainCircuit</strong> icon to analyze tone with the trained GoEmotions model. Saved observations will aggregate here automatically.
                </p>
              </div>
            )}
          </div>

          {/* Academic / Architectural Distinction Callout */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-6 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Info className="h-4 w-4" />
              <span>Complementary Analytics Architecture</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="rounded-xl bg-black/40 border border-white/5 p-4 space-y-1.5">
                <span className="font-bold text-white block text-sm font-['Outfit']">
                  1. Perspective Gap Score (PGS)
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  <strong>Deterministic & Subjective:</strong> Measures the mathematical variance (mean squared rating difference) between both partners' independent 1–5 ratings. Reflects perceived alignment and shared understanding.
                </p>
              </div>

              <div className="rounded-xl bg-black/40 border border-white/5 p-4 space-y-1.5">
                <span className="font-bold text-white block text-sm font-['Outfit']">
                  2. Machine Learning Tone Analysis
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  <strong>Probabilistic & Linguistic:</strong> Analyzes raw written phrasing using trained GoEmotions logistic regression weights (5,000 n-gram features) to identify tone markers (gratitude, joy, annoyance, anger). Helps spot tone misunderstandings before they escalate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};