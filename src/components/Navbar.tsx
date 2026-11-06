import React, { useState, useEffect, useRef } from 'react';
import { User, Partner } from '../types';
import { getSavedAccounts } from '../services/api';
import {
  MessageSquare,
  Users,
  BrainCircuit,
  BarChart3,
  History,
  Settings,
  LogOut,
  LayoutDashboard,
  Columns2,
  Database,
  HeartHandshake,
  User as UserIcon,
  UserPlus
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  partner: Partner | null;
  onLogout: () => void;
  onOpenDemoMode: () => void;
  isDemoActive?: boolean;
  onAddAccount: () => void;
  onSwitchAccount: (token: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  partner,
  onLogout,
  onOpenDemoMode,
  isDemoActive = false,
  onAddAccount,
  onSwitchAccount,
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const savedAccounts = user ? getSavedAccounts() : [];
  const otherAccounts = savedAccounts.filter(
    (acc) => acc.user.id !== user?.id && acc.user.email.toLowerCase() !== user?.email.toLowerCase()
  );
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'partner', label: 'Partner', icon: Users },
    { id: 'reflections', label: 'Reflections', icon: BrainCircuit },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0d14]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 shadow-md shadow-purple-500/20">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white font-['Outfit']">BetweenUs</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400 border-l border-white/10 pl-2">
                Intelligent Communication
              </span>
            </div>
          </button>

          {/* Navigation Links (Desktop) */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Dual-Partner Demo Mode Shortcut */}
          <button
            onClick={onOpenDemoMode}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all shadow-sm ${
              isDemoActive
                ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/30'
                : 'bg-white/5 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/15'
            }`}
            title="Open side-by-side split screen to test two partners communicating on one device"
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dual Demo Mode</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* Big Data & ML Studio link */}
          <button
            onClick={() => setCurrentTab('bigdata')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              currentTab === 'bigdata'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200'
            }`}
            title="Big Data Analytics & Machine Learning Pipeline Studio"
          >
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden md:inline">Big Data Studio</span>
          </button>

          {/* User & Partner Pill */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              {partner ? (
                <div
                  onClick={() => setCurrentTab('partner')}
                  className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400 cursor-pointer hover:bg-emerald-500/20 transition-all"
                  title={`Linked with ${partner.full_name}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[100px]">{partner.full_name}</span>
                </div>
              ) : (
                <div
                  onClick={() => setCurrentTab('partner')}
                  className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs text-amber-300 cursor-pointer hover:bg-amber-500/20 transition-all"
                  title="Connect with partner"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Not Linked</span>
                </div>
              )}

              {/* Top-Right Profile Avatar & Chrome-style Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-purple-500/30 hover:ring-purple-400 focus:outline-none transition-all cursor-pointer"
                  style={{ backgroundColor: user.avatar_color || '#8b5cf6' }}
                  title={`${user.full_name} (${user.email})`}
                  aria-label="Profile menu"
                  id="navbar-profile-avatar"
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </button>

                {isProfileDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl p-3 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                    role="menu"
                    id="chrome-profile-dropdown"
                  >
                    {/* Active Profile Card */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner"
                        style={{ backgroundColor: user.avatar_color || '#8b5cf6' }}
                      >
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Account Controls */}
                    <div className="mt-2 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('settings');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                      >
                        <UserIcon className="h-3.5 w-3.5 text-purple-400" />
                        <span>My Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('settings');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" />
                        <span>Manage Account</span>
                      </button>
                    </div>

                    {/* Other Logged-in Accounts */}
                    {otherAccounts.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Other Accounts
                        </p>
                        <div className="space-y-1">
                          {otherAccounts.map((acc) => (
                            <button
                              key={acc.user.id}
                              type="button"
                              id={`switch-account-${acc.user.id}`}
                              data-testid="switch-account-item"
                              onClick={() => {
                                onSwitchAccount(acc.token);
                                setIsProfileDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left group cursor-pointer"
                              title={`Switch to ${acc.user.full_name}`}
                            >
                              <div
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-inner"
                                style={{ backgroundColor: acc.user.avatar_color || '#6366f1' }}
                              >
                                {acc.user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                                  {acc.user.full_name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{acc.user.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Account Action */}
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          onAddAccount();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 rounded-lg transition-colors text-left"
                        id="dropdown-add-account-btn"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-purple-400" />
                        <span>Add Account</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="mt-1 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                        id="dropdown-logout-btn"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab('auth_login')}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentTab('auth_register')}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-purple-500 hover:to-indigo-500 transition-all"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      {user && (
        <div className="flex md:hidden border-t border-white/5 bg-[#0d121c] px-2 py-1.5 overflow-x-auto space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
