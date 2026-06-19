import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, Award } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'achievement';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  badgeTitle?: string;
  badgeIcon?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number, badgeTitle?: string, badgeIcon?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((
    message: string,
    type: ToastType = 'success',
    duration = 4000,
    badgeTitle?: string,
    badgeIcon?: string
  ) => {
    const id = Math.random().toString(36).substring(2);
    
    // Play a brief synth chime for achievements!
    if (type === 'achievement') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // RPG fanfare chords (ascending arpeggio C4 -> E4 -> G4 -> C5)
        const playNote = (freq: number, start: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          
          gainNode.gain.setValueAtTime(0, start);
          gainNode.gain.linearRampToValueAtTime(0.15, start + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.start(start);
          osc.stop(start + duration);
        };

        const now = audioCtx.currentTime;
        playNote(261.63, now, 0.4);       // C4
        playNote(329.63, now + 0.1, 0.4); // E4
        playNote(392.00, now + 0.2, 0.4); // G4
        playNote(523.25, now + 0.3, 0.6); // C5
      } catch (e) {
        console.warn('AudioContext not allowed or not supported:', e);
      }
    }

    setToasts((prev) => [...prev, { id, message, type, duration, badgeTitle, badgeIcon }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 md:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0 animate-badge-pop ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/90 dark:border-emerald-800 text-emerald-850 dark:text-emerald-250'
                : t.type === 'error'
                ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/90 dark:border-rose-800 text-rose-850 dark:text-rose-250'
                : t.type === 'achievement'
                ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/90 dark:border-amber-800 text-amber-900 dark:text-amber-200 legendary-card'
                : 'bg-parchment-100 border-parchment-300 dark:bg-rpg-card dark:border-rpg-border text-parchment-900 dark:text-gray-200'
            }`}
          >
            {/* Icon selection */}
            {t.type === 'success' && <CheckCircle size={20} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />}
            {t.type === 'error' && <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />}
            {t.type === 'info' && <Info size={20} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />}
            {t.type === 'achievement' && (
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg wax-seal wax-seal-gold">
                {t.badgeIcon || '🏆'}
              </div>
            )}

            <div className="flex-1">
              {t.type === 'achievement' && (
                <div className="font-serif font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-450 mb-0.5 flex items-center gap-1">
                  <Award size={12} /> Badge Unlocked!
                </div>
              )}
              {t.badgeTitle && <h4 className="font-serif font-semibold text-sm leading-tight mb-0.5">{t.badgeTitle}</h4>}
              <p className="text-xs font-sans leading-relaxed">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 self-center"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
