import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questService, storageService, type Quest, type QuestPriority } from '../services/supabase';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { EmbedPreview } from '../components/EmbedPreview';
import {
  MapPin,
  Calendar,
  BookOpen,
  Link as LinkIcon,
  Trash2,
  Edit3,
  CheckCircle2,
  ArrowLeft,
  X,
  Save,
  Trophy,
  Upload
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

export const QuestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [completeMode, setCompleteMode] = useState(false);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<QuestPriority>('Medium');
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLore, setEditLore] = useState('');
  const [editMediaLink, setEditMediaLink] = useState('');

  // Complete fields
  const [completionPhotos, setCompletionPhotos] = useState<File[]>([]);
  const [completionPhotoUrls, setCompletionPhotoUrls] = useState<string[]>([]);
  const [completionLore, setCompletionLore] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch single quest
  const { data: quest, isLoading, error } = useQuery<Quest>({
    queryKey: ['quest', id],
    queryFn: () => questService.getQuestById(id || ''),
    enabled: !!id && !!user,
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: (updateData: Partial<Quest>) => questService.updateQuest(id || '', updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quest', id] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      toast('Quest details successfully recorded!', 'success');
      setEditMode(false);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => questService.deleteQuest(id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      toast('Quest deleted from journal.', 'info');
      navigate('/');
    }
  });

  // Complete Mutation
  const completeMutation = useMutation({
    mutationFn: ({ photoUrls, lore }: { photoUrls: string[]; lore: string }) =>
      questService.completeQuest(id || '', photoUrls, lore),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quest', id] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      
      toast('Quest completed! Lore successfully archived.', 'success');
      
      // Confetti
      canvasConfetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      // Notify of any new badges earned is disabled
      setCompleteMode(false);
    }
  });

  const handleEditClick = () => {
    if (!quest) return;
    setEditTitle(quest.title);
    setEditPriority(quest.priority);
    setEditLocation(quest.location || '');
    setEditDate(quest.quest_date || '');
    setEditLore(quest.lore_acquired || '');
    setEditMediaLink(quest.media_link || '');
    setEditMode(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await editMutation.mutateAsync({
      title: editTitle.trim() || 'New Quest',
      priority: editPriority,
      location: editLocation.trim() || null,
      quest_date: editDate || null,
      lore_acquired: editLore.trim() || null,
      media_link: editMediaLink.trim() || null
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this quest from your journal? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setCompletionPhotos(prev => [...prev, ...files]);
      
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
    if (!user) return;

    setIsCompleting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of completionPhotos) {
        const url = await storageService.uploadFile(user.id, 'completed', file);
        uploadedUrls.push(url);
      }

      await completeMutation.mutateAsync({
        photoUrls: uploadedUrls,
        lore: completionLore
      });
    } catch (err: any) {
      toast(err.message || 'Complete quest transaction failed.', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto journal-paper p-8 rounded-lg animate-pulse space-y-6">
        <div className="w-12 h-6 bg-parchment-300 dark:bg-slate-700 rounded" />
        <div className="w-3/4 h-8 bg-parchment-350 dark:bg-slate-650 rounded" />
        <div className="space-y-2">
          <div className="w-full h-4 bg-parchment-200 dark:bg-slate-800 rounded" />
          <div className="w-5/6 h-4 bg-parchment-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <h3 className="font-serif font-bold text-lg text-rose-500 uppercase">Quest Missing</h3>
        <p className="text-xs text-parchment-800 dark:text-gray-400">
          This quest record could not be read from your scroll journal.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-amber-500 text-white rounded text-xs font-serif uppercase tracking-wider"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-serif uppercase tracking-wider text-parchment-600 hover:text-parchment-900 dark:hover:text-white transition cursor-pointer"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Main Details Panel */}
      {!editMode ? (
        <div className="journal-paper p-6 md:p-8 rounded-lg border border-parchment-200 dark:border-rpg-border relative rpg-border space-y-6">
          {/* Header Priority & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-parchment-200 dark:border-rpg-border pb-4">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold font-serif uppercase tracking-widest border px-2 py-0.5 rounded ${
                quest.priority === 'Legendary'
                  ? 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/80 dark:text-amber-200 animate-pulse'
                  : 'bg-parchment-50 dark:bg-rpg-charcoal text-parchment-800 dark:text-gray-400 border-parchment-350 dark:border-rpg-border'
              }`}>
                {quest.priority} Priority
              </span>
              <span className={`text-[10px] font-bold font-serif uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${
                quest.status === 'Completed'
                  ? 'bg-emerald-600'
                  : quest.status === 'In Progress'
                  ? 'bg-amber-500'
                  : 'bg-gray-400 dark:bg-gray-600'
              }`}>
                {quest.status}
              </span>
            </div>
            
            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditClick}
                className="p-2 border border-parchment-300 dark:border-rpg-border rounded-md hover:bg-parchment-200 dark:hover:bg-rpg-border text-parchment-700 dark:text-gray-400 hover:text-parchment-950 dark:hover:text-white transition cursor-pointer"
                title="Edit Quest"
              >
                <Edit3 size={15} />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 border border-rose-200 dark:border-rose-900 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 transition cursor-pointer"
                title="Delete Quest"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Title */}
          <h2 className="font-serif font-black text-2xl md:text-3xl text-parchment-900 dark:text-white text-left m-0">
            {quest.title}
          </h2>

          {/* Location & Date Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left border-b border-parchment-200 dark:border-rpg-border pb-4">
            {quest.location && (
              <div className="flex items-start gap-2">
                <MapPin className="text-parchment-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="text-[10px] uppercase font-serif tracking-widest text-parchment-500 dark:text-gray-400 block">
                    Location Pin
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quest.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-amber-600 dark:text-rpg-gold hover:underline"
                  >
                    {quest.location}
                  </a>
                </div>
              </div>
            )}

            {quest.quest_date && (
              <div className="flex items-start gap-2">
                <Calendar className="text-parchment-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="text-[10px] uppercase font-serif tracking-widest text-parchment-500 dark:text-gray-400 block">
                    Date of Journey
                  </span>
                  <span className="text-sm font-semibold">
                    {new Date(quest.quest_date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description / Quest Lore */}
          {quest.lore_acquired && (
            <div className="text-left space-y-2">
              <span className="text-[10px] uppercase font-serif tracking-widest text-parchment-500 dark:text-gray-400 flex items-center gap-1.5">
                <BookOpen size={13} /> Lore Acquired / Chronicle Notes
              </span>
              <div className="bg-parchment-100/50 dark:bg-rpg-charcoal/30 p-4 rounded border border-parchment-200 dark:border-rpg-border italic text-parchment-800 dark:text-gray-300">
                "{quest.lore_acquired}"
              </div>
            </div>
          )}

          {/* completion gallery */}
          {quest.status === 'Completed' && quest.photo_urls && quest.photo_urls.length > 0 && (
            <div className="text-left space-y-2 border-t border-parchment-200 dark:border-rpg-border pt-4">
              <span className="text-[10px] uppercase font-serif tracking-widest text-parchment-500 dark:text-gray-400">
                Chronicle Photos
              </span>
              <div className="grid grid-cols-2 gap-4">
                {quest.photo_urls.map((photo, idx) => (
                  <div key={idx} className="aspect-video rounded border border-parchment-300 dark:border-rpg-border overflow-hidden bg-parchment-200 dark:bg-rpg-charcoal shadow-sm">
                    <img src={photo} alt={`Chronicle ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Links */}
          {quest.media_link && (
            <div className="text-left space-y-2 border-t border-parchment-200 dark:border-rpg-border pt-4">
              <span className="text-[10px] uppercase font-serif tracking-widest text-parchment-500 dark:text-gray-400 flex items-center gap-1.5">
                <LinkIcon size={13} /> Media Attachments & Previews
              </span>
              <EmbedPreview url={quest.media_link} />
            </div>
          )}

          {/* Bottom Complete buttons */}
          {quest.status !== 'Completed' && (
            <div className="pt-4 border-t border-parchment-200 dark:border-rpg-border flex justify-end">
              <button
                onClick={() => setCompleteMode(true)}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-serif font-bold uppercase tracking-wider text-xs transition shadow flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} /> Complete Quest
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Edit Mode Form */
        <div className="journal-paper p-6 md:p-8 rounded-lg border border-parchment-250 dark:border-rpg-border rpg-border">
          <div className="flex items-center justify-between border-b border-parchment-200 dark:border-rpg-border pb-3 mb-5">
            <h3 className="font-serif font-bold text-lg uppercase tracking-wider text-parchment-900 dark:text-white m-0">
              Edit Quest Log
            </h3>
            <button
              onClick={() => setEditMode(false)}
              className="p-1 rounded-full hover:bg-parchment-200 dark:hover:bg-rpg-border text-parchment-500 hover:text-parchment-950 dark:hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="flex flex-col gap-1 text-left">
              <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                Quest Title
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                Priority Tier
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Low', 'Medium', 'High', 'Legendary'] as QuestPriority[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setEditPriority(tier)}
                    className={`py-1.5 px-1 rounded text-xs font-serif uppercase tracking-wider font-semibold border transition cursor-pointer ${
                      editPriority === tier
                        ? tier === 'Legendary'
                          ? 'bg-amber-500 text-white border-amber-600 shadow animate-pulse'
                          : tier === 'High'
                          ? 'bg-orange-500 text-white border-orange-600 shadow'
                          : tier === 'Medium'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow'
                          : 'bg-slate-600 text-white border-slate-700 shadow'
                        : 'bg-parchment-100 dark:bg-rpg-charcoal text-parchment-800 dark:text-gray-400 border-parchment-300 dark:border-rpg-border hover:bg-parchment-200 dark:hover:bg-rpg-border'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 text-left">
                <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                  Location
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                  Quest Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                Media link
              </label>
              <input
                type="url"
                value={editMediaLink}
                onChange={(e) => setEditMediaLink(e.target.value)}
                className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1 text-left">
              <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                Quest Notes / Clues
              </label>
              <textarea
                value={editLore}
                onChange={(e) => setEditLore(e.target.value)}
                rows={3}
                className="px-3 py-2 bg-parchment-50 dark:bg-rpg-charcoal border border-parchment-300 dark:border-rpg-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-rpg-gold text-parchment-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-parchment-200 dark:border-rpg-border">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-parchment-300 dark:border-rpg-border rounded text-xs font-serif uppercase tracking-wider font-semibold hover:bg-parchment-100 dark:hover:bg-rpg-border text-parchment-800 dark:text-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-rpg-gold dark:hover:bg-amber-600 text-white dark:text-parchment-900 rounded text-xs font-serif uppercase tracking-wider font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} /> {editMutation.isPending ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Quest Modal Layer */}
      {completeMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-badge-pop">
          <div className="journal-paper p-6 rounded-lg max-w-md w-full relative border-2 border-emerald-500 dark:border-emerald-700 shadow-2xl rpg-border">
            <button
              onClick={() => setCompleteMode(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-parchment-200 dark:hover:bg-rpg-border text-parchment-500 hover:text-parchment-950 dark:hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-parchment-200 dark:border-rpg-border pb-3">
              <Trophy className="text-emerald-500 animate-bounce" size={24} />
              <h2 className="font-serif font-bold text-lg uppercase tracking-wider text-parchment-900 dark:text-white m-0">
                Record Achievement
              </h2>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div className="flex flex-col gap-1 text-left">
                <label className="font-serif font-semibold text-xs uppercase tracking-wider text-parchment-800 dark:text-gray-400">
                  Select Quest Photos <span className="text-rose-500">*</span>
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
                  <span className="text-xs text-parchment-800 dark:text-gray-400 font-semibold block">Upload images</span>
                </div>

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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-parchment-200 dark:border-rpg-border">
                <button
                  type="button"
                  onClick={() => setCompleteMode(false)}
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
                    <span>Uploading chronicle...</span>
                  ) : (
                    <>
                      <Trophy size={14} /> Chronicle Completion
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
