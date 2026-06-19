import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { questService, type Quest } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, Calendar, MapPin, Eye, ChevronLeft, ChevronRight, X, BookOpen, Clock, Award, Trophy } from 'lucide-react';

export const Accomplished: React.FC = () => {
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Lightbox State
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Fetch quests
  const { data: quests = [], isLoading } = useQuery<Quest[]>({
    queryKey: ['quests'],
    queryFn: questService.getQuests,
    enabled: !!user
  });

  const completedQuests = quests.filter(q => q.status === 'Completed');

  // Filter & Search
  const filteredQuests = completedQuests
    .filter(q => {
      const qSearch = search.toLowerCase();
      if (!qSearch) return true;
      return (
        q.title.toLowerCase().includes(qSearch) ||
        (q.location || '').toLowerCase().includes(qSearch)
      );
    })
    .sort((a, b) => {
      const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  // Lightbox handlers
  const openLightbox = (quest: Quest) => {
    setActiveQuest(quest);
    setActivePhotoIdx(0);
  };

  const closeLightbox = () => {
    setActiveQuest(null);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeQuest || !activeQuest.photo_urls) return;
    setActivePhotoIdx(prev => (prev + 1) % activeQuest.photo_urls.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeQuest || !activeQuest.photo_urls) return;
    setActivePhotoIdx(prev => (prev - 1 + activeQuest.photo_urls.length) % activeQuest.photo_urls.length);
  };

  return (
    <div className="space-y-6">
      {/* Search & Sort Panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-parchment-100 dark:bg-rpg-card p-4 rounded-lg border border-parchment-200 dark:border-rpg-border journal-paper shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter accomplished titles or locations..."
            className="w-full pl-9 pr-4 py-1.5 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-serif uppercase tracking-wider text-parchment-500">Chronology:</span>
          <button
            onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="px-3 py-1.5 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-[10px] font-serif font-bold uppercase tracking-wider text-parchment-800 dark:text-gray-300 hover:bg-parchment-200 dark:hover:bg-rpg-border transition cursor-pointer"
          >
            {sortOrder === 'desc' ? 'Newest Completions First' : 'Oldest Completions First'}
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="journal-paper rounded-lg overflow-hidden border border-parchment-200 dark:border-rpg-border animate-pulse h-80 flex flex-col justify-between">
              <div className="aspect-[4/3] bg-parchment-300 dark:bg-slate-700" />
              <div className="p-4 space-y-2">
                <div className="w-2/3 h-5 bg-parchment-250 dark:bg-slate-650 rounded" />
                <div className="w-1/2 h-3 bg-parchment-250 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="journal-paper py-16 px-4 rounded-lg border border-dashed border-parchment-300 dark:border-rpg-border text-center max-w-xl mx-auto shadow-sm">
          <Award size={48} className="text-parchment-300 dark:text-slate-700 mb-4 mx-auto animate-pulse" />
          <h3 className="font-serif font-bold text-lg text-parchment-900 dark:text-white uppercase tracking-wider mb-2">
            No Accomplished Quests
          </h3>
          <p className="text-xs text-parchment-700 dark:text-gray-400 font-sans">
            {completedQuests.length === 0
              ? 'Complete quests from your Dashboard and upload your journey photos to fill this gallery!'
              : 'No completed quests match your search query.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredQuests.map((quest) => (
            <div
              key={quest.id}
              onClick={() => openLightbox(quest)}
              className="journal-paper cursor-pointer rounded-lg overflow-hidden border border-parchment-200 dark:border-rpg-border group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
            >
              {/* Image box */}
              <div className="relative aspect-[4/3] bg-parchment-250 dark:bg-rpg-charcoal overflow-hidden">
                {quest.photo_url ? (
                  <img
                    src={quest.photo_url}
                    alt={quest.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-parchment-400 bg-parchment-100 dark:bg-rpg-card">
                    <Award size={40} className="stroke-1 mb-2" />
                    <span className="text-[10px] uppercase font-serif tracking-widest">Victory achieved</span>
                  </div>
                )}
                {/* Hover overlay preview text */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white text-xs font-serif uppercase tracking-widest gap-1.5 font-bold">
                  <Eye size={16} /> Inspect Chronicle
                </div>
              </div>

              {/* Text box */}
              <div className="p-4 text-left space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif font-bold text-base text-parchment-900 dark:text-white line-clamp-1">
                    {quest.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[10px] text-parchment-600 dark:text-gray-400">
                  {quest.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={10} className="text-parchment-400 shrink-0" />
                      <span className="truncate max-w-[120px]">{quest.location}</span>
                    </div>
                  )}
                  {quest.completed_at && (
                    <div className="flex items-center gap-1">
                      <Calendar size={10} className="text-parchment-400 shrink-0" />
                      <span>{new Date(quest.completed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {quest.lore_acquired && (
                  <p className="text-xs text-parchment-800 dark:text-gray-300 italic line-clamp-2 pt-1 border-t border-parchment-200/50 dark:border-rpg-border/40">
                    "{quest.lore_acquired}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. LIGHTBOX VIEWPORT (Responsive modal) */}
      {activeQuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-8 animate-badge-pop"
          onClick={closeLightbox}
        >
          {/* Close trigger */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 p-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/85 rounded-full transition cursor-pointer"
          >
            <X size={24} />
          </button>

          {/* Lightbox Shell */}
          <div
            className="flex flex-col lg:flex-row w-full max-w-5xl h-full max-h-[85vh] bg-parchment-50 dark:bg-rpg-card rounded-lg overflow-hidden journal-paper border border-parchment-200 dark:border-rpg-border shadow-2xl rpg-border"
            onClick={e => e.stopPropagation()}
          >
            {/* Left: Image slideshow (interactive) */}
            <div className="relative flex-1 bg-black flex items-center justify-center group/nav">
              {activeQuest.photo_urls && activeQuest.photo_urls.length > 0 ? (
                <>
                  <img
                    src={activeQuest.photo_urls[activePhotoIdx]}
                    alt={`Chronicle photo ${activePhotoIdx + 1}`}
                    className="max-w-full max-h-[50vh] lg:max-h-full object-contain"
                  />

                  {/* Nav Arrows */}
                  {activeQuest.photo_urls.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-4 p-2 rounded-full bg-black/40 hover:bg-black/85 text-white/80 hover:text-white transition cursor-pointer"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-4 p-2 rounded-full bg-black/40 hover:bg-black/85 text-white/80 hover:text-white transition cursor-pointer"
                      >
                        <ChevronRight size={24} />
                      </button>

                      {/* Photo indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2.5 py-0.5 rounded-full font-sans tracking-wide">
                        {activePhotoIdx + 1} / {activeQuest.photo_urls.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-white/40 flex flex-col items-center">
                  <Award size={48} className="stroke-1 mb-2 animate-bounce" />
                  <span className="text-xs uppercase font-serif tracking-widest">No Photos Recorded</span>
                </div>
              )}
            </div>

            {/* Right: Chronicle Lore and Description */}
            <div className="w-full lg:w-80 p-5 md:p-6 text-left flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-parchment-200 dark:border-rpg-border overflow-y-auto bg-parchment-100 dark:bg-rpg-card">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-[9px] uppercase font-serif tracking-widest text-amber-600 dark:text-rpg-gold font-bold">
                  <Trophy size={11} /> Quest Cleared
                </div>
                
                <h3 className="font-serif font-black text-xl text-parchment-900 dark:text-white leading-tight">
                  {activeQuest.title}
                </h3>

                {/* Meta details */}
                <div className="space-y-2 pt-3 border-t border-parchment-200 dark:border-rpg-border/50">
                  {activeQuest.location && (
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin size={14} className="text-parchment-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] uppercase font-serif tracking-widest text-parchment-500 block">Pin</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeQuest.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-amber-600 dark:text-rpg-gold hover:underline"
                        >
                          {activeQuest.location}
                        </a>
                      </div>
                    </div>
                  )}

                  {activeQuest.completed_at && (
                    <div className="flex items-start gap-2 text-xs">
                      <Clock size={14} className="text-parchment-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] uppercase font-serif tracking-widest text-parchment-500 block">Chronicle Date</span>
                        <span className="font-semibold">
                          {new Date(activeQuest.completed_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chronicle Lore */}
                {activeQuest.lore_acquired && (
                  <div className="pt-3 border-t border-parchment-200 dark:border-rpg-border/50 space-y-1.5">
                    <span className="text-[9px] uppercase font-serif tracking-widest text-parchment-500 block flex items-center gap-1">
                      <BookOpen size={10} /> Lore Scroll
                    </span>
                    <p className="text-xs text-parchment-800 dark:text-gray-300 italic bg-parchment-50 dark:bg-rpg-charcoal/30 p-3 rounded border border-parchment-200 dark:border-rpg-border/50 leading-relaxed">
                      "{activeQuest.lore_acquired}"
                    </p>
                  </div>
                )}
              </div>

              {/* Go to Details button */}
              <button
                onClick={() => {
                  closeLightbox();
                  window.location.href = `/quests/${activeQuest.id}`;
                }}
                className="mt-6 w-full py-2 bg-parchment-200 hover:bg-parchment-350 dark:bg-rpg-charcoal dark:hover:bg-rpg-border border border-parchment-350 dark:border-rpg-border rounded text-xs font-serif uppercase tracking-wider font-bold text-center text-parchment-800 dark:text-gray-300 transition"
              >
                Inspect Chronicle File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
