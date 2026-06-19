import React, { useEffect, useRef, useState } from 'react';
import { X, Flame, Link, Sparkles, MapPin, Calendar, BookOpen } from 'lucide-react';
import type { QuestPriority } from '../services/supabase';
import { useToast } from './Toast';

interface AddQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (questData: {
    title: string;
    priority: QuestPriority;
    location: string;
    quest_date: string;
    lore_acquired: string;
    media_link: string;
  }) => Promise<void>;
}

export const AddQuestModal: React.FC<AddQuestModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<QuestPriority>('Medium');
  const [location, setLocation] = useState('');
  const [questDate, setQuestDate] = useState('');
  const [lore, setLore] = useState('');
  const [mediaLink, setMediaLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync native dialog state with isOpen prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        // Reset fields when opening
        setTitle('');
        setPriority('Medium');
        setLocation('');
        setQuestDate('');
        setLore('');
        setMediaLink('');
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Fallback for backdrop click (light dismiss) in browsers without native closedby support
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Detect click on backdrop (dialog itself) rather than its content children
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isInside = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );

      if (!isInside) {
        onClose();
      }
    }
  };

  // Listen to escape key / native close event
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  // Social Media Paste link parser
  const handleLinkPaste = (val: string) => {
    setMediaLink(val);
    
    // Auto-populate title if empty when link is pasted
    if (!title.trim() && val.trim()) {
      const isIg = val.includes('instagram.com');
      const isYt = val.includes('youtube.com') || val.includes('youtu.be');
      
      if (isIg) {
        setTitle('New Instagram Quest');
        toast('Detected Instagram link! Title set to placeholder.', 'info');
      } else if (isYt) {
        setTitle('New YouTube Quest');
        toast('Detected YouTube link! Title set to placeholder.', 'info');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalTitle = title.trim() || 'New Quest';
    setIsSubmitting(true);

    try {
      await onAdd({
        title: finalTitle,
        priority,
        location: location.trim(),
        quest_date: questDate,
        lore_acquired: lore.trim(),
        media_link: mediaLink.trim()
      });
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to summon quest', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg p-0 bg-transparent text-parchment-900 dark:text-gray-250 outline-none max-w-lg w-full"
      style={{ overflow: 'visible' }}
    >
      <div className="journal-paper p-6 rounded-lg w-full max-h-[90vh] overflow-y-auto relative rpg-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-parchment-200 dark:border-rpg-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500 animate-spin" size={20} style={{ animationDuration: '6s' }} />
            <h2 className="font-serif font-bold text-xl uppercase tracking-wider text-parchment-900 dark:text-white m-0">
              Summon New Quest
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-parchment-200 dark:hover:bg-rpg-border text-parchment-500 hover:text-parchment-950 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="flex flex-col gap-1 text-left">
            <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
              Quest Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Conquer Mt. Fuji or Try Spicy Ramen"
              className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
            />
          </div>

          {/* Priority Selection */}
          <div className="flex flex-col gap-1 text-left">
            <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
              Priority Tier
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Low', 'Medium', 'High', 'Legendary'] as QuestPriority[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setPriority(tier)}
                  className={`py-1.5 px-1 rounded text-xs font-serif uppercase tracking-wider font-semibold border transition ${
                    priority === tier
                      ? tier === 'Legendary'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-pulse'
                        : tier === 'High'
                        ? 'bg-orange-500 text-white border-orange-600 shadow-md'
                        : tier === 'Medium'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                        : 'bg-slate-600 text-white border-slate-700 shadow-md'
                      : 'bg-parchment-100 dark:bg-rpg-charcoal text-parchment-800 dark:text-gray-400 border-parchment-300 dark:border-rpg-border hover:bg-parchment-200 dark:hover:bg-rpg-border'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Location & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 text-left">
              <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400 flex items-center gap-1">
                <MapPin size={12} /> Location (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kyoto, Japan or Local Bakery"
                className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400 flex items-center gap-1">
                <Calendar size={12} /> Quest Date (Optional)
              </label>
              <input
                type="date"
                value={questDate}
                onChange={(e) => setQuestDate(e.target.value)}
                className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
              />
            </div>
          </div>

          {/* Link import */}
          <div className="flex flex-col gap-1 text-left">
            <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400 flex items-center gap-1">
              <Link size={12} /> Media Link / Social Import (Optional)
            </label>
            <input
              type="url"
              value={mediaLink}
              onChange={(e) => handleLinkPaste(e.target.value)}
              placeholder="Paste Instagram Reel or YouTube Video URL"
              className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
            />
          </div>

          {/* Lore Notes */}
          <div className="flex flex-col gap-1 text-left">
            <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400 flex items-center gap-1">
              <BookOpen size={12} /> Lore / Notes (Optional)
            </label>
            <textarea
              value={lore}
              onChange={(e) => setLore(e.target.value)}
              placeholder="Describe the adventure, why you want to do it, or clues..."
              rows={3}
              className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-parchment-200 dark:border-rpg-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-parchment-300 dark:border-rpg-border rounded text-xs font-serif uppercase tracking-wider font-semibold hover:bg-parchment-100 dark:hover:bg-rpg-border text-parchment-800 dark:text-gray-300 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 dark:bg-rpg-gold dark:hover:bg-amber-600 dark:disabled:bg-amber-950 text-white dark:text-parchment-900 rounded text-xs font-serif uppercase tracking-wider font-bold transition shadow flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Summoning...</span>
              ) : (
                <>
                  <Flame size={14} /> Summon Quest
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
