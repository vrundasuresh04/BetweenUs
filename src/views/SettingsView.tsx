import React, { useState } from 'react';
import { User, Partner } from '../types';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Lock,
  ShieldCheck,
  LogOut,
  Bell,
  EyeOff,
  Check,
  AlertCircle
} from 'lucide-react';

interface SettingsViewProps {
  user: User;
  partner: Partner | null;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  partner,
  onLogout,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Privacy toggles
  const [privateNotesEncrypted, setPrivateNotesEncrypted] = useState(true);
  const [allowInsightCues, setAllowInsightCues] = useState(true);
  const [mutualConsentRequired, setMutualConsentRequired] = useState(true);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
          <SettingsIcon className="h-4 w-4" />
          <span>Account & Security</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
          Application Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Manage your personal profile, privacy safeguards, and session preferences.
        </p>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>Privacy preferences updated successfully.</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <h3 className="text-base font-bold text-white font-['Outfit']">Profile Information</h3>

        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg"
            style={{ backgroundColor: user.avatar_color || '#8b5cf6' }}
          >
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-base font-bold text-white">{user.full_name}</h4>
            <p className="text-xs text-slate-400">{user.email}</p>
            <span className="inline-block mt-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
              User ID: {user.id}
            </span>
          </div>
        </div>
      </div>

      {/* Privacy & Safeguards */}
      <form onSubmit={handleSavePreferences} className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <h3 className="text-base font-bold text-white font-['Outfit']">Privacy & Safeguards</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div>
              <span className="text-xs font-semibold text-white block">Strict Private Notes Isolation</span>
              <span className="text-[11px] text-slate-400">
                Notes written during reflection sessions remain exclusively in your personal account view and are never shared.
              </span>
            </div>
            <input
              type="checkbox"
              checked={privateNotesEncrypted}
              onChange={(e) => setPrivateNotesEncrypted(e.target.checked)}
              className="h-4 w-4 accent-purple-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div>
              <span className="text-xs font-semibold text-white block">Communication Clarity Pre-Send Review</span>
              <span className="text-[11px] text-slate-400">
                Enable optional 'Review My Message' checks before dispatching drafts.
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowInsightCues}
              onChange={(e) => setAllowInsightCues(e.target.checked)}
              className="h-4 w-4 accent-purple-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div>
              <span className="text-xs font-semibold text-white block">Mutual Assessment Consent Gate</span>
              <span className="text-[11px] text-slate-400">
                Perspective Gap Score will only be calculated once both partners have submitted their ratings.
              </span>
            </div>
            <input
              type="checkbox"
              checked={mutualConsentRequired}
              onChange={(e) => setMutualConsentRequired(e.target.checked)}
              className="h-4 w-4 accent-purple-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 shadow-md transition-all cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Logout Card */}
      <div className="glass-panel rounded-2xl p-6 border-red-500/20 bg-red-950/10 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">Log Out</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            End your active authenticated session on this browser.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600/20 border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-600/30 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
