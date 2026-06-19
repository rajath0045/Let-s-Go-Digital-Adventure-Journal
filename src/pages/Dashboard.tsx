import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questService, storageService, type Quest, type QuestPriority, type QuestStatus } from '../services/supabase';
import { QuestCard } from '../components/QuestCard';
import { AddQuestModal } from '../components/AddQuestModal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  ArrowUpDown,
  Upload,
  Trophy,
  X,
  BookOpen
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // State controls
  const [search, setSearch] = useState('');
  const statusFilter = 'All';
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'created' | 'completion'>('created');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Complete Flow Modal State
  const [completingQuest, setCompletingQuest] = useState<Quest | null>(null);
  const [completionPhotos, setCompletionPhotos] = useState<File[]>([]);
  const [completionPhotoUrls, setCompletionPhotoUrls] = useState<string[]>([]);
  const [completionLore, setCompletionLore] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch Quests
  const { data: quests = [], isLoading } = useQuery<Quest[]>({
    queryKey: ['quests'],
    queryFn: questService.getQuests,
    enabled: !!user
  });

  // Mutate Quests (Create)
  const createQuestMutation = useMutation({
    mutationFn: questService.createQuest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      toast('Quest successfully summoned to your journal!', 'success');
    }
  });

  // Mutate Quests (Status Update)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuestStatus }) =>
      questService.updateQuest(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      toast(`Quest status updated to ${variables.status}!`, 'success');
    }
  });

  // Mutate Quests (Complete Flow)
  const completeQuestMutation = useMutation({
    mutationFn: ({ id, photoUrls, lore }: { id: string; photoUrls: string[]; lore: string }) =>
      questService.completeQuest(id, photoUrls, lore),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      
      toast('Quest completed! Lore successfully archived.', 'success');
      
      // Trigger canvas-confetti blast
      canvasConfetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']
      });

      // Notify of any new badges earned is disabled
    }
  });

  // Handle Add Quest
  const handleAddQuest = async (questData: any) => {
    await createQuestMutation.mutateAsync(questData);
  };

  // Handle Status Toggle
  const handleStatusChange = (id: string, status: QuestStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  // Complete Quest flow triggers
  const handleCompleteClick = (quest: Quest) => {
    setCompletingQuest(quest);
    setCompletionPhotos([]);
    setCompletionPhotoUrls([]);
    setCompletionLore(quest.lore_acquired || '');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setCompletionPhotos(prev => [...prev, ...files]);
      
      // Create local object URLs for preview
      const urls = files.map(file => URL.createObjectURL(file));
      setCompletionPhotoUrls(prev => [...prev, ...urls]);
    }
  };

  const removeSelectedPhoto = (index: number) => {
    setCompletionPhotos(prev => prev.filter((_, i) => i !== index));
    setCompletionPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingQuest) return;

    setIsCompleting(true);
    try {
      const uploadedUrls: string[] = [];
      
      // 1. Upload photos to Supabase storage
      for (const file of completionPhotos) {
        const url = await storageService.uploadFile(user.id, 'completed', file);
        uploadedUrls.push(url);
      }

      // 2. Fire mutation
      await completeQuestMutation.mutateAsync({
        id: completingQuest.id,
        photoUrls: uploadedUrls,
        lore: completionLore
      });

      setCompletingQuest(null);
    } catch (err: any) {
      toast(err.message || 'Image upload or completion failed', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  // Filter & Search Logic
  const filteredQuests = quests
    .filter(q => {
      // 1. Status Filter
      if (statusFilter !== 'All' && q.status !== statusFilter) return false;

      // 2. Search filter (title, location, lore)
      const qSearch = search.toLowerCase();
      if (!qSearch) return true;

      return (
        q.title.toLowerCase().includes(qSearch) ||
        (q.location || '').toLowerCase().includes(qSearch) ||
        (q.lore_acquired || '').toLowerCase().includes(qSearch)
      );
    })
    .sort((a, b) => {
      // 3. Sorting Logic
      if (sortBy === 'priority') {
        const priorityOrder: Record<QuestPriority, number> = {
          'Legendary': 4,
          'High': 3,
          'Medium': 2,
          'Low': 1
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      if (sortBy === 'date') {
        if (!a.quest_date) return 1;
        if (!b.quest_date) return -1;
        return new Date(a.quest_date).getTime() - new Date(b.quest_date).getTime();
      }

      if (sortBy === 'completion') {
        if (!a.completed_at) return 1;
        if (!b.completed_at) return -1;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      }

      // Default created sort
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-6">
      {/* 1. Header toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-parchment-100 dark:bg-rpg-card p-4 rounded-lg border border-parchment-200 dark:border-rpg-border journal-paper shadow-sm">
        
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-500 dark:text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quest, lore, or map pin..."
            className="w-full pl-9 pr-4 py-1.5 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Sort Select */}
          <div className="flex items-center gap-1.5 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded px-2.5 py-1 text-xs text-parchment-700 dark:text-gray-400">
            <ArrowUpDown size={12} />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none text-[10px] font-serif uppercase tracking-wider font-semibold"
            >
              <option value="created">Created Date</option>
              <option value="priority">Priority Tier</option>
              <option value="date">Quest Date</option>
              <option value="completion">Completion Date</option>
            </select>
          </div>

          {/* Summon Button */}
          <button
            onClick={() => setAddModalOpen(true)}
            className="py-1.5 px-4 bg-amber-500 hover:bg-amber-600 dark:bg-rpg-gold dark:hover:bg-amber-600 text-white dark:text-parchment-900 font-serif font-bold uppercase tracking-wider text-xs rounded transition shadow flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus size={14} /> Summon Quest
          </button>
        </div>
      </div>

      {/* 2. Grid Cards View */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="journal-paper rounded-lg p-5 border border-parchment-200 dark:border-rpg-border animate-pulse h-48 flex flex-col justify-between">
              <div>
                <div className="flex justify-between mb-3"><div className="w-12 h-4 bg-parchment-300 dark:bg-slate-700 rounded" /><div className="w-16 h-4 bg-parchment-300 dark:bg-slate-700 rounded" /></div>
                <div className="w-3/4 h-5 bg-parchment-350 dark:bg-slate-650 rounded mb-3" />
                <div className="w-1/2 h-3 bg-parchment-250 dark:bg-slate-800 rounded mb-1" />
                <div className="w-1/3 h-3 bg-parchment-250 dark:bg-slate-800 rounded" />
              </div>
              <div className="w-full h-8 bg-parchment-300 dark:bg-slate-750 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="journal-paper py-16 px-4 rounded-lg border border-dashed border-parchment-300 dark:border-rpg-border text-center flex flex-col items-center max-w-xl mx-auto shadow-sm">
          <Trophy size={48} className="text-parchment-300 dark:text-slate-700 mb-4 animate-bounce" />
          <h3 className="font-serif font-bold text-lg text-parchment-900 dark:text-white uppercase tracking-wider mb-2">
            No Quests Logged
          </h3>
          <p className="text-xs text-parchment-700 dark:text-gray-400 mb-6 font-sans">
            Your adventure journal lies empty. Summon your first quest to begin your saga of real-life accomplishments!
          </p>
          <button
            onClick={() => setAddModalOpen(true)}
            className="py-2 px-6 bg-amber-500 hover:bg-amber-600 dark:bg-rpg-gold dark:hover:bg-amber-600 text-white dark:text-parchment-900 font-serif font-bold uppercase tracking-wider text-xs rounded transition shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Log First Quest
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onCompleteClick={handleCompleteClick}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* 3. Add Quest Modal Overlay */}
      <AddQuestModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddQuest}
      />

      {/* 4. Complete Quest Overlay Dialog (Direct in-page flow) */}
      {completingQuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-badge-pop">
          <div className="journal-paper p-6 rounded-lg max-w-md w-full relative border-2 border-amber-300 dark:border-rpg-gold/50 shadow-2xl rpg-border">
            <button
              onClick={() => setCompletingQuest(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-parchment-200 dark:hover:bg-rpg-border text-parchment-500 hover:text-parchment-950 dark:hover:text-white transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-parchment-200 dark:border-rpg-border pb-3">
              <Trophy className="text-amber-500 animate-bounce" size={24} />
              <h2 className="font-serif font-bold text-lg uppercase tracking-wider text-parchment-900 dark:text-white m-0">
                Complete Quest
              </h2>
            </div>

            <h3 className="font-serif font-bold text-md text-amber-700 dark:text-rpg-gold mb-3 text-left">
              {completingQuest.title}
            </h3>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              {/* Image upload */}
              <div className="flex flex-col gap-1 text-left">
                <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                  Upload Completion Photos <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-parchment-350 dark:border-rpg-border rounded-lg p-4 text-center cursor-pointer hover:bg-parchment-50 dark:hover:bg-rpg-charcoal/50 transition relative">
                  <input
                    type="file"
                    required={completionPhotos.length === 0}
                    multiple
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="mx-auto text-parchment-400 mb-2" size={24} />
                  <span className="text-xs text-parchment-800 dark:text-gray-400 font-semibold block">Select Completion Images</span>
                  <span className="text-[10px] text-parchment-500 dark:text-gray-500 block mt-0.5">Supports PNG, JPG, JPEG</span>
                </div>

                {/* Previews */}
                {completionPhotoUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {completionPhotoUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square border border-parchment-350 rounded overflow-hidden">
                        <img src={url} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedPhoto(idx)}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow hover:bg-rose-600"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lore acquired / Experience notes */}
              <div className="flex flex-col gap-1 text-left">
                <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400 flex items-center gap-1">
                  <BookOpen size={12} /> Lore Acquired (Optional Notes)
                </label>
                <textarea
                  value={completionLore}
                  onChange={(e) => setCompletionLore(e.target.value)}
                  placeholder="Record your achievements, learnings, or memory here..."
                  rows={4}
                  className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white resize-none"
                />
              </div>

              {/* Submit triggers */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-parchment-200 dark:border-rpg-border">
                <button
                  type="button"
                  onClick={() => setCompletingQuest(null)}
                  className="px-4 py-2 border border-parchment-300 dark:border-rpg-border rounded text-xs font-serif uppercase tracking-wider font-semibold hover:bg-parchment-100 dark:hover:bg-rpg-border text-parchment-800 dark:text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompleting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded text-xs font-serif uppercase tracking-wider font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isCompleting ? (
                    <span>Uploading Lore...</span>
                  ) : (
                    <>
                      <Trophy size={14} /> Record Accomplishment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
