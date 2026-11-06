import React from 'react';
import { User, Partner, ReflectionSession, AnalyticsData } from '../types';
import {
  MessageSquare,
  Users,
  BrainCircuit,
  BarChart3,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  partner: Partner | null;
  reflections: ReflectionSession[];
  analytics: AnalyticsData | null;
  onNavigate: (tab: string) => void;
  onStartReflection: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  partner,
  reflections,
  analytics,
  onNavigate,
  onStartReflection,
}) => {
  const pendingReflections = reflections.filter((r) => !r.bothCompleted);
  const completedReflections = reflections.filter((r) => r.bothCompleted);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome & Partner Status Card */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-bl from-purple-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-purple-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Personal Space</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
              Welcome, {user.full_name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {partner
                ? `You are connected with ${partner.full_name}. Your communication is private and secured.`
                : 'Connect with your partner to begin your shared private conversation.'}
            </p>
          </div>

          <div>
            {partner ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-inner"
                  style={{ backgroundColor: partner.avatar_color || '#06b6d4' }}
                >
                  {partner.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-medium text-emerald-300">Connected Partner</div>
                  <div className="text-sm font-semibold text-white">{partner.full_name}</div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('partner')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Connect With Your Partner
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Chat shortcut, Reflections, Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Messages Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-[11px] font-medium text-slate-400">Private Messenger</span>
            </div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Conversations</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {partner
                ? `Open your shared dialogue with ${partner.full_name}. Real-time messaging with communication clarity cues.`
                : 'Link your partner to start natural two-way messaging with communication clarity insights.'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => onNavigate('messages')}
              className="w-full inline-flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all"
            >
              <span>{partner ? 'Open Messages' : 'Connect First'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Reflections Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <BrainCircuit className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-[11px] font-medium text-slate-400">Reflect Together</span>
            </div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Shared Reflections</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Voluntary assessments on Communication, Trust, Support, and Conflict Resolution.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Completed Sessions:</span>
                <span className="font-semibold text-white">{completedReflections.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Pending Partner:</span>
                <span className="font-semibold text-amber-300">{pendingReflections.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
            <button
              onClick={() => onNavigate('reflections')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-all"
            >
              <span>View Sessions</span>
            </button>
            {partner && (
              <button
                onClick={onStartReflection}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-3 py-2.5 text-xs font-semibold hover:bg-cyan-600/30 transition-all"
                title="Create a reflection session"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Perspective Analytics Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-[11px] font-medium text-slate-400">Perspective Gap</span>
            </div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Perspective Score</h3>
            
            {analytics && analytics.averagePgs !== null ? (
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white font-['Outfit']">
                    {analytics.averagePgs.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">/ 16.00</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Calculated across {analytics.totalSessions} completed reflections.
                </p>
                {analytics.baselineBenchmark && (
                  <div className="mt-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 text-[11px] text-indigo-300">
                    <span className="font-semibold">Verified Baseline:</span> {analytics.baselineBenchmark.mean_pgs.toFixed(2)} PGS ({analytics.baselineBenchmark.paired_interactions.toLocaleString()} synthetic pairs)
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="rounded-xl bg-slate-900/60 p-3.5 text-xs text-slate-400 leading-relaxed border border-white/5">
                  No session scores yet. Complete a reflection session together to reveal genuine perspective divergence data.
                </div>
                {analytics?.baselineBenchmark && (
                  <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 text-[11px] text-indigo-300">
                    <span className="font-semibold">Verified Baseline:</span> {analytics.baselineBenchmark.mean_pgs.toFixed(2)} Mean PGS ({analytics.baselineBenchmark.paired_interactions.toLocaleString()} synthetic pairs).
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => onNavigate('insights')}
              className="w-full inline-flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all"
            >
              <span>Explore Insights</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Pending Reflection Alert (if any) */}
      {pendingReflections.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Reflection in progress: {pendingReflections[0].title}
                </h4>
                <p className="mt-0.5 text-xs text-slate-400">
                  {pendingReflections[0].hasMyAssessment
                    ? "Your assessment is saved. Awaiting your partner's assessment."
                    : 'Your partner has created a reflection session. Complete your 4-dimension assessment.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('reflections')}
              className="shrink-0 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 transition-all"
            >
              {pendingReflections[0].hasMyAssessment ? 'Check Status' : 'Submit Assessment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
