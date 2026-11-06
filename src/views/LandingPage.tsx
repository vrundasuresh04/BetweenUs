import React from 'react';
import {
  MessageSquare,
  ShieldCheck,
  BrainCircuit,
  Eye,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
  HeartHandshake
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onOpenDemoMode: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onSignIn,
  onOpenDemoMode,
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[250px] bg-cyan-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-6 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Intelligent Communication & Relationship Understanding</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-['Outfit'] leading-[1.15]">
            Better Conversations <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Begin With Understanding.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            A private space to connect, communicate, and understand each other's perspectives.
          </p>

          {/* Core Call to Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-600/35 transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onSignIn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
            >
              Sign In
            </button>
          </div>

          {/* Quick Dual Demo Callout */}
          <div className="mt-8">
            <button
              onClick={onOpenDemoMode}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 transition-colors"
            >
              Evaluate as evaluator? Open Interactive Dual-Partner Mode
            </button>
          </div>
        </div>
      </section>

      {/* Philosophy & How BetweenUs Works */}
      <section className="border-t border-white/10 bg-[#0d121f] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
              The Perspective Principle
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
              Two people can interpret the exact same message differently. BetweenUs helps you communicate naturally, explore subtle wording cues, and reflect on different points of view.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-6 transition-all">
              <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5">
                <MessageSquare className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit'] mb-2">
                Private Two-Way Chat
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect exclusively with your partner using their registered email. Messages are preserved only for authorized partners with zero fabricated auto-replies.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-6 transition-all">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                <Eye className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit'] mb-2">
                Communication Intelligence
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Optional, restrained assistance. Use "Review My Message" to check if wording might sound abrupt before sending, or "Understand This Reply" to reflect on conversational context.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-6 transition-all">
              <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5">
                <BrainCircuit className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit'] mb-2">
                Reflect Together & PGS
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Rate four dimensions independently: Communication, Trust, Support, and Conflict Resolution. The Perspective Gap Score highlights where experiences aligned or diverged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ethical Boundaries Banner */}
      <section className="border-t border-white/5 py-12 bg-[#090d16]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-400 mb-4">
            <Lock className="h-3.5 w-3.5 text-slate-300" />
            <span>Ethical Communication Guardrails</span>
          </div>
          <h4 className="text-base font-semibold text-slate-200">
            Clear boundaries built into every interaction
          </h4>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            BetweenUs never claims to read hidden emotions, diagnose psychological conditions, or label anyone toxic. Assessments are voluntary, private notes remain unshared, and partners remain entirely in control.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#070a10] py-8 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-purple-600 flex items-center justify-center">
              <HeartHandshake className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-slate-300">BetweenUs</span>
            <span>— A private communication platform.</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={onGetStarted}
              className="hover:text-purple-300 transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={onSignIn}
              className="hover:text-purple-300 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onOpenDemoMode}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Evaluator Demo Mode
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
