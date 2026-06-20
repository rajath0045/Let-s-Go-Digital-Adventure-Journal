import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { questService, isSupabaseConfigured, type Quest } from '../services/supabase';
import { exportToGoogleSheets } from '../services/googleSheets';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  Database,
  FileSpreadsheet,
  Bell,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Cloud
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, login, signUp, logout } = useAuth();
  const { toast } = useToast();

  // Settings State persisted in localStorage
  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('qv_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('qv_sound_enabled') !== 'false';
  });

  const [emailAlerts, setEmailAlerts] = useState(() => {
    return localStorage.getItem('qv_email_alerts') === 'true';
  });

  // Export State
  const [exportScope, setExportScope] = useState<'all' | 'pending' | 'completed' | 'date_range'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Fetch quests
  const { data: quests = [] } = useQuery<Quest[]>({
    queryKey: ['quests'],
    queryFn: questService.getQuests,
    enabled: !!user
  });

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem('qv_google_client_id', googleClientId);
  }, [googleClientId]);

  useEffect(() => {
    localStorage.setItem('qv_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('qv_email_alerts', String(emailAlerts));
  }, [emailAlerts]);

  // Trigger Google Sheets Export
  const handleSheetsExport = async () => {
    if (!googleClientId.trim()) {
      toast('Please supply a Google Client ID to authorize export.', 'error');
      return;
    }

    setIsExporting(true);
    setExportedSheetUrl(null);

    try {
      const url = await exportToGoogleSheets(
        quests,
        {
          scope: exportScope,
          startDate: exportScope === 'date_range' ? startDate : undefined,
          endDate: exportScope === 'date_range' ? endDate : undefined
        },
        googleClientId.trim()
      );

      setExportedSheetUrl(url);
      toast('Export Successful! Google Sheet created.', 'success');
      
      // Open sheet in new tab automatically
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast(err.message || 'Export spells failed.', 'error');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast('Please fill out all credentials fields.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        await signUp(email.trim(), password.trim());
        toast('Sync Account created and device successfully linked!', 'success');
      } else {
        await login(email.trim(), password.trim());
        toast('Device successfully synced to your cloud journal!', 'success');
      }
      setEmail('');
      setPassword('');
    } catch (err: any) {
      toast(err.message || 'Authentication failed.', 'error');
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast('Device unsynced. Your session is now local/anonymous.', 'success');
    } catch (err: any) {
      toast(err.message || 'Logout failed.', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-left">
      {/* 1. Database Connection Status */}
      <div className="journal-paper p-5 rounded-lg border border-parchment-200 dark:border-rpg-border shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-parchment-900 dark:text-white m-0 border-b border-parchment-200 dark:border-rpg-border pb-2 flex items-center gap-2">
          <Database size={16} /> Vault Server Status
        </h3>
        
        <div className="flex items-center justify-between gap-3 text-xs bg-parchment-50 dark:bg-rpg-charcoal/30 p-4 rounded border border-parchment-200 dark:border-rpg-border/50">
          <div className="flex items-start gap-3">
            {isSupabaseConfigured ? (
              <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            ) : (
              <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
            )}
            <div>
              <span className="font-serif font-bold block mb-0.5 uppercase tracking-wide">
                {isSupabaseConfigured ? 'Supabase Vault Online' : 'Local Archive Mode'}
              </span>
              <p className="text-[10px] text-parchment-650 dark:text-gray-400">
                {isSupabaseConfigured
                  ? 'All quests, streaks, and media uploads are synced securely in your Supabase DB.'
                  : 'Running locally. Quests are saved inside your browser\'s LocalStorage. Add environment variables in your .env file to sync to Supabase.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cloud Sync & Device Sharing */}
      <div className="journal-paper p-5 rounded-lg border border-parchment-200 dark:border-rpg-border shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-parchment-900 dark:text-white m-0 border-b border-parchment-200 dark:border-rpg-border pb-2 flex items-center gap-2">
          <Cloud className="text-amber-500" size={16} /> Cloud Sync & Device Sharing
        </h3>

        {!isSupabaseConfigured ? (
          <p className="text-xs text-parchment-650 dark:text-gray-400 italic">
            Cloud sync is not available in local database mode. Set up Supabase environment variables in `.env` to enable multi-device sync.
          </p>
        ) : (
          <div className="space-y-4 text-xs">
            {/* If user is anonymous or logged in as the default shared account */}
            {user?.is_anonymous || user?.email === 'explorer@questvault.com' ? (
              <div className="space-y-4">
                <p className="text-xs text-parchment-650 dark:text-gray-400">
                  {user?.email === 'explorer@questvault.com' ? (
                    <span>Your device is currently using the <strong>Default Shared Cloud Journal</strong>. Any device accessing the app will see this journal by default. You can register your own private Sync Account below:</span>
                  ) : (
                    <span>Your journal is currently in <strong>anonymous mode</strong> on this device. Create a Cloud Sync Account to save your quests to the cloud and share them across different devices!</span>
                  )}
                </p>

                <form onSubmit={handleSyncSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-serif font-semibold text-[10px] uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="adventure@example.com"
                        className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-serif font-semibold text-[10px] uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      onClick={() => setAuthMode('signup')}
                      disabled={authLoading}
                      className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded font-serif font-bold uppercase tracking-wider text-[11px] transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {authLoading && authMode === 'signup' ? 'Upgrading...' : 'Register Sync Account'}
                    </button>
                    <button
                      type="submit"
                      onClick={() => setAuthMode('login')}
                      disabled={authLoading}
                      className="flex-1 py-2 px-4 bg-parchment-200 hover:bg-parchment-350 dark:bg-rpg-charcoal dark:hover:bg-rpg-border border border-parchment-350 dark:border-rpg-border rounded font-serif font-bold uppercase tracking-wider text-[11px] text-parchment-800 dark:text-gray-300 transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {authLoading && authMode === 'login' ? 'Connecting...' : 'Log In to Sync'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // If user has permanent account
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 p-4 rounded text-xs">
                  <div>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 block mb-0.5">Device Sync Activated!</span>
                    <p className="text-[10px] text-parchment-650 dark:text-gray-400">
                      Your journal is linked to: <strong className="text-parchment-900 dark:text-white">{user?.email}</strong>
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded font-serif font-bold uppercase tracking-wider text-[10px] transition shadow cursor-pointer"
                  >
                    Unsync Device
                  </button>
                </div>

                <div className="bg-parchment-50 dark:bg-rpg-charcoal/30 p-4 rounded border border-parchment-200 dark:border-rpg-border/50 space-y-2">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-rpg-gold">
                    Multi-Device Instructions
                  </h4>
                  <p className="text-[11px] text-parchment-700 dark:text-gray-400 leading-normal">
                    To access this exact journal on a mobile phone, tablet, or another browser:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] text-parchment-700 dark:text-gray-400">
                    <li>Open this web app link on the other device.</li>
                    <li>Go to Settings → Cloud Sync & Device Sharing.</li>
                    <li>Choose <strong>Log In to Sync</strong> and enter the email and password: <strong>{user?.email}</strong>.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Google Sheets Integration */}
      <div className="journal-paper p-5 rounded-lg border border-parchment-200 dark:border-rpg-border shadow-sm space-y-5">
        <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-parchment-900 dark:text-white m-0 border-b border-parchment-200 dark:border-rpg-border pb-2 flex items-center gap-2">
          <FileSpreadsheet size={16} /> Google Sheets Export Integration
        </h3>

        {/* Client ID Configuration */}
        <div className="flex flex-col gap-1">
          <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
            Google API Client ID
          </label>
          <input
            type="text"
            value={googleClientId}
            onChange={(e) => setGoogleClientId(e.target.value)}
            placeholder="Paste your Google OAuth 2.0 Client ID here"
            className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
          />
          <span className="text-[9px] text-parchment-500 dark:text-gray-500 leading-normal">
            Need a client ID? Go to the Google Cloud Console, create a client credential with OAuth 2.0 type Web Application, add <code>{window.location.origin}</code> to Authorized JavaScript Origins, and paste the Client ID above.
          </span>
        </div>

        {/* Export form */}
        <div className="pt-4 border-t border-parchment-200 dark:border-rpg-border/50 space-y-4">
          <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-rpg-gold">
            Execute Export Run
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scope select */}
            <div className="flex flex-col gap-1">
              <label className="font-serif font-semibold text-[10px] uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                Export Scope
              </label>
              <select
                value={exportScope}
                onChange={(e: any) => setExportScope(e.target.value)}
                className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
              >
                <option value="all">Export All Quests</option>
                <option value="pending">Export Active/Pending Quests Only</option>
                <option value="completed">Export Completed Quests Only</option>
                <option value="date_range">Export By Date Range</option>
              </select>
            </div>

            {/* Date range pickers */}
            {exportScope === 'date_range' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-serif font-semibold text-[10px] uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1.5 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-serif font-semibold text-[10px] uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1.5 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSheetsExport}
            disabled={isExporting}
            className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded font-serif font-bold uppercase tracking-wider text-xs transition shadow flex items-center gap-2 cursor-pointer w-full justify-center"
          >
            <FileSpreadsheet size={16} />
            {isExporting ? 'Conjuring Spreadsheet...' : 'Export to Google Sheets'}
          </button>

          {/* Success Link */}
          {exportedSheetUrl && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 p-3 rounded flex items-center justify-between text-xs">
              <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Spreadsheet Created Successfully!</span>
              <a
                href={exportedSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-450 hover:underline font-serif uppercase tracking-wider font-bold"
              >
                Open Sheets <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 4. Notification Preferences */}
      <div className="journal-paper p-5 rounded-lg border border-parchment-200 dark:border-rpg-border shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-parchment-900 dark:text-white m-0 border-b border-parchment-200 dark:border-rpg-border pb-2 flex items-center gap-2">
          <Bell size={16} /> Preferences
        </h3>

        <div className="space-y-4">
          {/* Sound toggle */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-serif font-bold block mb-0.5">Synthesis Audio Fanfare</span>
              <p className="text-[10px] text-parchment-550 dark:text-gray-400">Play an ascending retro synth arpeggio when unlocking a badge seal.</p>
            </div>
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`w-10 h-5 rounded-full p-0.5 transition cursor-pointer ${soundEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Email digest */}
          <div className="flex items-center justify-between text-xs border-t border-parchment-200 dark:border-rpg-border pt-4">
            <div>
              <span className="font-serif font-bold block mb-0.5">Quest Streak Reminders</span>
              <p className="text-[10px] text-parchment-550 dark:text-gray-400">Receive mock warning triggers if you have uncompleted daily tasks.</p>
            </div>
            <button
              onClick={() => setEmailAlerts(prev => !prev)}
              className={`w-10 h-5 rounded-full p-0.5 transition cursor-pointer ${emailAlerts ? 'bg-amber-500' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition transform ${emailAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
