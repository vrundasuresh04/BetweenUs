import React, { useState, useEffect, useCallback } from 'react';
import { User, Partner, PartnerRequest } from '../types';
import { api } from '../services/api';
import {
  Users,
  Check,
  AlertCircle,
  Search,
  UserPlus,
  Clock,
  X,
  HeartHandshake,
  ShieldCheck,
  RefreshCw,
  Mail
} from 'lucide-react';

interface PartnerViewProps {
  user: User;
  partner: Partner | null;
  onPartnerLinked: (partner: Partner) => void;
  onPartnerUnlinked: () => void;
}

export const PartnerView: React.FC<PartnerViewProps> = ({
  user,
  partner,
  onPartnerLinked,
  onPartnerUnlinked,
}) => {
  // Search state
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // Requests state
  const [incomingRequests, setIncomingRequests] = useState<PartnerRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PartnerRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Status feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  // Fetch pending partner requests
  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await api.getPartnerRequests();
      setIncomingRequests(res.incoming || []);
      setOutgoingRequests(res.outgoing || []);
    } catch (err: any) {
      console.error('Failed to load partner requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (!partner) {
      loadRequests();
      const interval = setInterval(loadRequests, 4000);
      return () => clearInterval(interval);
    }
  }, [partner, loadRequests]);

  // Search for partner by exact email
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchEmail.trim();
    if (!query) return;

    setError('');
    setSuccess('');
    setSearching(true);
    setHasSearched(true);
    setSearchResult(null);

    try {
      const res = await api.findPartner(query);
      if (res.user) {
        setSearchResult(res.user);
      } else {
        setSearchResult(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error finding account');
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  // Send partner connection request
  const handleSendRequest = async () => {
    if (!searchResult) return;
    setError('');
    setSuccess('');
    setActionLoading('send');

    try {
      const res = await api.sendPartnerRequest(searchResult.email);
      setSuccess(res.message || `Connection request sent to ${searchResult.full_name}!`);
      setSearchResult(null);
      setSearchEmail('');
      setHasSearched(false);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to send connection request');
    } finally {
      setActionLoading(null);
    }
  };

  // Accept incoming request
  const handleAcceptRequest = async (requestId: string) => {
    setError('');
    setSuccess('');
    setActionLoading(requestId);

    try {
      const res = await api.acceptPartnerRequest(requestId);
      setSuccess(res.message || 'Partner request accepted! You are now connected.');
      if (res.partner) {
        onPartnerLinked(res.partner);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to accept partner request');
      await loadRequests();
    } finally {
      setActionLoading(null);
    }
  };

  // Decline incoming request
  const handleDeclineRequest = async (requestId: string) => {
    setError('');
    setSuccess('');
    setActionLoading(requestId);

    try {
      await api.declinePartnerRequest(requestId);
      setSuccess('Connection request declined.');
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to decline request');
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel outgoing request
  const handleCancelRequest = async (requestId: string) => {
    setError('');
    setSuccess('');
    setActionLoading(requestId);

    try {
      await api.cancelPartnerRequest(requestId);
      setSuccess('Connection request cancelled.');
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setActionLoading(null);
    }
  };

  // Safe unlink
  const handleUnlink = async () => {
    const confirm = window.confirm(
      'Are you sure you want to unlink your accounts? This will close your shared private room.'
    );
    if (!confirm) return;

    setUnlinkLoading(true);
    setError('');
    try {
      await api.unlinkPartner();
      onPartnerUnlinked();
      setSuccess('Accounts unlinked.');
      loadRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to unlink');
    } finally {
      setUnlinkLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
          Partner Connection
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          BetweenUs pairs two real accounts into an exclusive private dialogue.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Linked State */}
      {partner ? (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border-emerald-500/20 bg-[#0e1628]">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Partner Connection</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* You */}
            <div className="glass-card rounded-xl p-5 border-white/5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Your Account
              </span>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner"
                  style={{ backgroundColor: user.avatar_color || '#8b5cf6' }}
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{user.full_name}</h4>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Partner */}
            <div className="glass-card rounded-xl p-5 border-white/5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block mb-2">
                Connected Partner
              </span>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner"
                  style={{ backgroundColor: partner.avatar_color || '#06b6d4' }}
                >
                  {partner.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{partner.full_name}</h4>
                  <p className="text-xs text-slate-400">{partner.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Your conversations and reflections are synchronized between these two identities.
            </div>

            <button
              onClick={handleUnlink}
              disabled={unlinkLoading}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              {unlinkLoading ? 'Unlinking...' : 'Unlink Partner'}
            </button>
          </div>
        </div>
      ) : (
        /* Not Linked State: Find by Email & Manage Requests */
        <div className="space-y-6">
          {/* Email Search Card */}
          <div className="glass-card rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit']">Find Partner by Email</h3>
                <p className="text-xs text-slate-400">
                  Search for your partner by their registered email address to send a connection request.
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  id="partner-email-search-input"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchEmail.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-purple-500 disabled:opacity-50 transition-all cursor-pointer"
                id="partner-search-submit-btn"
              >
                {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>{searching ? 'Searching...' : 'Find Account'}</span>
              </button>
            </form>

            {/* Search Result Card */}
            {hasSearched && (
              <div className="mt-5 pt-5 border-t border-white/5">
                {searchResult ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-purple-500/30">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner"
                        style={{ backgroundColor: searchResult.avatar_color || '#8b5cf6' }}
                      >
                        {searchResult.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{searchResult.full_name}</h4>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Registered Account
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{searchResult.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendRequest}
                      disabled={actionLoading === 'send'}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                      id="partner-connect-btn"
                    >
                      {actionLoading === 'send' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      <span>Connect</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-center text-xs text-slate-400">
                    No registered BetweenUs account was found for &ldquo;{searchEmail}&rdquo;. Please verify the email with your partner.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Connection Requests (Incoming & Outgoing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incoming Requests */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white font-['Outfit']">Incoming Requests</h3>
                  </div>
                  {incomingRequests.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {incomingRequests.length} pending
                    </span>
                  )}
                </div>

                {incomingRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No incoming connection requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: req.sender_avatar_color || '#8b5cf6' }}
                          >
                            {(req.sender_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-white truncate">
                              {req.sender_name}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">{req.sender_email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req.id)}
                            disabled={actionLoading === req.id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
                            id={`accept-request-${req.id}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineRequest(req.id)}
                            disabled={actionLoading === req.id}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                            id={`decline-request-${req.id}`}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Only accounts you accept can message with you.</span>
              </div>
            </div>

            {/* Outgoing Requests */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white font-['Outfit']">Sent Requests</h3>
                  </div>
                  {outgoingRequests.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {outgoingRequests.length} waiting
                    </span>
                  )}
                </div>

                {outgoingRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No active sent requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-white truncate">
                              {req.recipient_name || req.recipient_email}
                            </h4>
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Pending
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{req.recipient_email}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req.id)}
                          disabled={actionLoading === req.id}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-all cursor-pointer"
                          id={`cancel-request-${req.id}`}
                        >
                          <X className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500">
                The other user will see your request in their Partner tab to accept or decline.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
