import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, BookOpen, Youtube, Instagram, CheckCircle2, Play, Trophy } from 'lucide-react';
import type { Quest, QuestStatus } from '../services/supabase';
import { FlippingCard } from './ui/flipping-card';

interface QuestCardProps {
  quest: Quest;
  onCompleteClick?: (quest: Quest) => void;
  onStatusChange?: (questId: string, newStatus: QuestStatus) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  onCompleteClick,
  onStatusChange
}) => {
  const navigate = useNavigate();

  const getStatusBadgeStyle = (status: QuestStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500 text-white';
      case 'In Progress':
        return 'bg-amber-500 text-white';
      case 'Pending':
      default:
        return 'bg-gray-400 dark:bg-gray-600 text-white';
    }
  };

  const isInstagram = quest.media_link?.includes('instagram.com');
  const isYoutube = quest.media_link?.includes('youtube.com') || quest.media_link?.includes('youtu.be');

  const handleCardClick = () => {
    navigate(`/quests/${quest.id}`);
  };

  const frontContent = (
    <div className="flex flex-col justify-between h-full w-full p-5 text-left">
      <div>
        {/* Top Header: Priority & Status badge */}
        <div className="flex justify-between items-center mb-4">
          <span className={`text-[10px] uppercase font-bold tracking-widest ${
            quest.priority === 'Legendary' ? 'text-amber-600 dark:text-amber-400 font-extrabold' :
            quest.priority === 'High' ? 'text-orange-600 dark:text-orange-400' :
            quest.priority === 'Medium' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
          }`}>
            {quest.priority} Priority
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-serif font-bold uppercase tracking-wider shadow-sm ${getStatusBadgeStyle(quest.status)}`}>
            {quest.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif font-bold text-base leading-snug text-parchment-900 dark:text-gray-100 mb-3 line-clamp-2">
          {quest.title}
        </h3>

        {/* Meta details */}
        <div className="space-y-2">
          {quest.location && (
            <div className="flex items-center gap-1.5 text-xs text-parchment-800 dark:text-gray-400">
              <MapPin size={13} className="text-parchment-400 shrink-0" />
              <span className="truncate">{quest.location}</span>
            </div>
          )}
          {quest.quest_date && (
            <div className="flex items-center gap-1.5 text-xs text-parchment-800 dark:text-gray-400">
              <Calendar size={13} className="text-parchment-400 shrink-0" />
              <span>{new Date(quest.quest_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Info */}
      <div className="text-[10px] text-center text-parchment-400 dark:text-gray-500 italic mt-2 border-t border-dashed border-parchment-200 dark:border-rpg-border/40 pt-2 shrink-0">
        Hover to reveal chronicle lore & actions
      </div>
    </div>
  );

  const backContent = (
    <div className="flex flex-col justify-between h-full w-full p-5 text-left">
      <div className="flex flex-col flex-grow overflow-hidden mb-2">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-600 dark:text-rpg-gold flex items-center gap-1 mb-2 shrink-0">
          <BookOpen size={12} /> Chronicle Lore
        </h4>
        
        {quest.lore_acquired ? (
          <div className="bg-parchment-50 dark:bg-rpg-charcoal/40 p-2.5 rounded border border-parchment-200/50 dark:border-rpg-border/50 overflow-y-auto max-h-[105px] flex-grow">
            <p className="text-xs text-parchment-800 dark:text-gray-300 italic leading-relaxed">
              "{quest.lore_acquired}"
            </p>
          </div>
        ) : (
          <div className="bg-parchment-50 dark:bg-rpg-charcoal/40 p-3 rounded border border-parchment-200/50 dark:border-rpg-border/50 flex flex-col items-center justify-center text-center flex-grow">
            <BookOpen size={18} className="text-parchment-300 dark:text-gray-600 mb-1" />
            <p className="text-[11px] text-parchment-500 dark:text-gray-500 italic">
              No lore acquired yet.
            </p>
          </div>
        )}
      </div>

      {/* Actions & Links Footer */}
      <div className="mt-2 pt-2.5 border-t border-parchment-200/60 dark:border-rpg-border/60 flex items-center justify-between gap-2 shrink-0" onClick={e => e.stopPropagation()}>
        {/* Media Icons */}
        <div className="flex items-center gap-1.5">
          {isInstagram && (
            <span className="p-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-500" title="Instagram Link">
              <Instagram size={14} />
            </span>
          )}
          {isYoutube && (
            <span className="p-1 rounded bg-red-50 dark:bg-red-950/40 text-red-500" title="YouTube Link">
              <Youtube size={14} />
            </span>
          )}
          {!isInstagram && !isYoutube && quest.media_link && (
            <span className="p-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-500" title="Web Link">
              <Play size={14} className="rotate-90" />
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {quest.status === 'In Progress' && onStatusChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(quest.id, 'Pending');
              }}
              className="text-[10px] font-serif uppercase tracking-wider px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition shadow-sm font-semibold cursor-pointer"
            >
              Pause
            </button>
          )}

          {quest.status !== 'Completed' && onCompleteClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompleteClick(quest);
              }}
              className="text-[10px] font-serif uppercase tracking-wider px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-sm font-semibold flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 size={10} /> Complete
            </button>
          )}

          {quest.status === 'Completed' && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-serif font-semibold uppercase flex items-center gap-1">
              <Trophy size={10} /> Claimed
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <FlippingCard
      onClick={handleCardClick}
      height={230}
      className={`journal-paper shadow-md rounded-2xl border transition duration-300 w-full ${
        quest.priority === 'Legendary' ? 'legendary-card border-amber-400' : 'border-parchment-200 dark:border-rpg-border'
      } ${quest.status === 'Completed' ? 'opacity-90 hover:opacity-100' : ''}`}
      frontContent={frontContent}
      backContent={backContent}
    />
  );
};
