import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if we have real Supabase config
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'QuestVault: Supabase keys are missing. Falling back to LocalStorage mode. ' +
    'To use Supabase, configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Initialize Supabase if keys exist
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// =========================================================================
// TYPES
// =========================================================================
export type QuestPriority = 'Low' | 'Medium' | 'High' | 'Legendary';
export type QuestStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  priority: QuestPriority;
  location: string | null;
  quest_date: string | null;
  lore_acquired: string | null;
  media_link: string | null;
  photo_url: string | null;
  photo_urls: string[];
  status: QuestStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_quest',
    title: 'First Quest',
    description: 'Begin your journey! Complete your very first quest.',
    icon: '⚔️',
    rarity: 'Common'
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Record quests in 3 different locations.',
    icon: '🧭',
    rarity: 'Rare'
  },
  {
    id: 'adventurer',
    title: 'Seasoned Adventurer',
    description: 'Successfully complete 10 quests.',
    icon: '🛡️',
    rarity: 'Epic'
  },
  {
    id: 'food_hunter',
    title: 'Food Hunter',
    description: 'Log and complete a culinary quest (Quest title contains food, restaurant, or eat).',
    icon: '🍖',
    rarity: 'Common'
  },
  {
    id: 'legendary',
    title: 'Legendary Hero',
    description: 'Complete a quest with Legendary priority.',
    icon: '👑',
    rarity: 'Legendary'
  },
  {
    id: 'world_wanderer',
    title: 'World Wanderer',
    description: 'Complete quests in 5 unique locations.',
    icon: '🌍',
    rarity: 'Legendary'
  }
];

// =========================================================================
// MOCK AUTH STATE (For LocalStorage Fallback)
// =========================================================================
export const DEFAULT_USER = {
  id: 'guest-explorer',
  email: 'explorer@questvault.com',
  user_metadata: {
    full_name: 'Noble Explorer',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'
  },
  created_at: new Date('2026-01-01').toISOString()
};

const getMockUser = () => {
  const user = localStorage.getItem('qv_mock_user');
  if (!user) {
    localStorage.setItem('qv_mock_user', JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }
  return JSON.parse(user);
};

const setMockUser = (user: any) => {
  if (user) {
    localStorage.setItem('qv_mock_user', JSON.stringify(user));
  } else {
    localStorage.setItem('qv_mock_user', JSON.stringify(DEFAULT_USER));
  }
};

const mockAuthCallbacks = new Set<(event: string, session: any) => void>();

// =========================================================================
// LOCAL STORAGE DB SETUP
// =========================================================================
const getLocalQuests = (): Quest[] => {
  const quests = localStorage.getItem('qv_quests');
  return quests ? JSON.parse(quests) : [];
};

const setLocalQuests = (quests: Quest[]) => {
  localStorage.setItem('qv_quests', JSON.stringify(quests));
};

const getLocalStreak = (userId: string): UserStreak => {
  const streaksStr = localStorage.getItem('qv_streaks');
  const streaks = streaksStr ? JSON.parse(streaksStr) : {};
  if (!streaks[userId]) {
    streaks[userId] = {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null
    };
    localStorage.setItem('qv_streaks', JSON.stringify(streaks));
  }
  return streaks[userId];
};

const setLocalStreak = (userId: string, streak: UserStreak) => {
  const streaksStr = localStorage.getItem('qv_streaks');
  const streaks = streaksStr ? JSON.parse(streaksStr) : {};
  streaks[userId] = streak;
  localStorage.setItem('qv_streaks', JSON.stringify(streaks));
};

const getLocalBadges = (userId: string): UserBadge[] => {
  const badgesStr = localStorage.getItem('qv_badges');
  const badges = badgesStr ? JSON.parse(badgesStr) : [];
  return badges.filter((b: UserBadge) => b.user_id === userId);
};

const addLocalBadge = (userId: string, badgeId: string): UserBadge | null => {
  const badgesStr = localStorage.getItem('qv_badges');
  const badges = badgesStr ? JSON.parse(badgesStr) : [];
  
  // Check duplicate
  const exists = badges.some((b: UserBadge) => b.user_id === userId && b.badge_id === badgeId);
  if (exists) return null;

  const newBadge: UserBadge = {
    id: Math.random().toString(36).substring(2),
    user_id: userId,
    badge_id: badgeId,
    earned_at: new Date().toISOString()
  };

  badges.push(newBadge);
  localStorage.setItem('qv_badges', JSON.stringify(badges));
  return newBadge;
};


// =========================================================================
// AUTHENTICATION SERVICES
// =========================================================================
export const authService = {
  async signUp(email: string, password: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data.user;
    } else {
      // Mock SignUp returning DEFAULT_USER
      return DEFAULT_USER;
    }
  },

  async login(email: string, password: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.user;
    } else {
      // Mock Login returning DEFAULT_USER
      return DEFAULT_USER;
    }
  },

  async signInWithGoogle() {
    // Google sign in is removed/disabled; resolves immediately
    return;
  },

  async logout() {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } else {
      setMockUser(DEFAULT_USER);
      mockAuthCallbacks.forEach(cb => cb('SIGNED_IN', { user: DEFAULT_USER }));
    }
  },

  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      return user || DEFAULT_USER;
    } else {
      return getMockUser();
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session || { user: DEFAULT_USER });
      });
      return () => subscription.unsubscribe();
    } else {
      mockAuthCallbacks.add(callback);
      // Immediately notify about current status (always SIGNED_IN)
      const user = getMockUser();
      callback('SIGNED_IN', { user });
      return () => {
        mockAuthCallbacks.delete(callback);
      };
    }
  }
};


// =========================================================================
// STORAGE SERVICES
// =========================================================================
export const storageService = {
  async uploadFile(userId: string, folder: 'completed' | 'pending' | 'achievements', file: File): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('questvault')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('questvault')
        .getPublicUrl(data.path);

      return publicUrl;
    } else {
      // Mock File Upload (returns a local Object URL or Unsplash image)
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  }
};


// =========================================================================
// QUESTS SERVICES
// =========================================================================
export const questService = {
  async getQuests(): Promise<Quest[]> {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } else {
      const allQuests = getLocalQuests();
      return allQuests.filter(q => q.user_id === user.id);
    }
  },

  async getQuestById(id: string): Promise<Quest> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } else {
      const quests = getLocalQuests();
      const quest = quests.find(q => q.id === id);
      if (!quest) throw new Error('Quest not found');
      return quest;
    }
  },

  async createQuest(quest: Omit<Quest, 'id' | 'user_id' | 'status' | 'photo_urls' | 'completed_at' | 'created_at' | 'updated_at'>): Promise<Quest> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Authentication required');

    const newQuestData = {
      ...quest,
      status: 'Pending' as QuestStatus,
      photo_urls: [] as string[],
      completed_at: null,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quests')
        .insert({
          ...newQuestData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const quests = getLocalQuests();
      const newQuest: Quest = {
        ...newQuestData,
        id: Math.random().toString(36).substring(2),
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      quests.unshift(newQuest);
      setLocalQuests(quests);
      return newQuest;
    }
  },

  async updateQuest(id: string, questData: Partial<Omit<Quest, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Quest> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quests')
        .update(questData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const quests = getLocalQuests();
      const index = quests.findIndex(q => q.id === id);
      if (index === -1) throw new Error('Quest not found');

      const updatedQuest: Quest = {
        ...quests[index],
        ...questData,
        updated_at: new Date().toISOString()
      };
      quests[index] = updatedQuest;
      setLocalQuests(quests);
      return updatedQuest;
    }
  },

  async deleteQuest(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('quests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      const quests = getLocalQuests();
      const filtered = quests.filter(q => q.id !== id);
      setLocalQuests(filtered);
    }
  },

  async completeQuest(id: string, photoUrls: string[], lore: string): Promise<{ quest: Quest; newBadges: BadgeDefinition[] }> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Authentication required');

    const updateData = {
      status: 'Completed' as QuestStatus,
      photo_urls: photoUrls,
      photo_url: photoUrls[0] || null,
      lore_acquired: lore || null,
      completed_at: new Date().toISOString()
    };

    let updatedQuest: Quest;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      updatedQuest = data;
    } else {
      updatedQuest = await this.updateQuest(id, updateData);
    }

    // Update streaks and evaluate achievements
    await gamificationService.updateStreak(user.id);
    const newBadges = await gamificationService.evaluateBadges(user.id, updatedQuest);

    return {
      quest: updatedQuest,
      newBadges
    };
  }
};


// =========================================================================
// GAMIFICATION SERVICES
// =========================================================================
export const gamificationService = {
  async getStreak(): Promise<UserStreak | null> {
    const user = await authService.getCurrentUser();
    if (!user) return null;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for 0 rows returned
      
      if (!data) {
        // Initialize streak
        const newStreak = {
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          last_completed_date: null
        };
        const { data: inserted, error: insertError } = await supabase
          .from('streaks')
          .insert(newStreak)
          .select()
          .single();
        
        if (insertError) throw insertError;
        return inserted;
      }

      return data;
    } else {
      return getLocalStreak(user.id);
    }
  },

  async updateStreak(userId: string): Promise<UserStreak> {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (isSupabaseConfigured && supabase) {
      const currentStreakData = await this.getStreak();
      if (!currentStreakData) throw new Error('Streak record initialization failed');

      let current = currentStreakData.current_streak;
      let longest = currentStreakData.longest_streak;
      const lastCompleted = currentStreakData.last_completed_date;

      if (lastCompleted === todayStr) {
        // Already completed a quest today, streak stays same
      } else if (lastCompleted) {
        const lastDate = new Date(lastCompleted);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Successive day completion
          current += 1;
        } else {
          // Streak broken
          current = 1;
        }
      } else {
        // First completion ever
        current = 1;
      }

      if (current > longest) {
        longest = current;
      }

      const { data, error } = await supabase
        .from('streaks')
        .update({
          current_streak: current,
          longest_streak: longest,
          last_completed_date: todayStr
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const streak = getLocalStreak(userId);
      let current = streak.current_streak;
      let longest = streak.longest_streak;
      const lastCompleted = streak.last_completed_date;

      if (lastCompleted === todayStr) {
        // No change
      } else if (lastCompleted) {
        const lastDate = new Date(lastCompleted);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          current += 1;
        } else {
          current = 1;
        }
      } else {
        current = 1;
      }

      if (current > longest) {
        longest = current;
      }

      const updatedStreak = {
        ...streak,
        current_streak: current,
        longest_streak: longest,
        last_completed_date: todayStr
      };
      setLocalStreak(userId, updatedStreak);
      return updatedStreak;
    }
  },

  async getEarnedBadges(): Promise<UserBadge[]> {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    } else {
      return getLocalBadges(user.id);
    }
  },

  async evaluateBadges(userId: string, completedQuest: Quest): Promise<BadgeDefinition[]> {
    const earnedBadges = await this.getEarnedBadges();
    const earnedIds = new Set(earnedBadges.map(b => b.badge_id));
    const newlyEarned: BadgeDefinition[] = [];

    // Fetch all user quests to evaluate counts/locations
    const allQuests = await questService.getQuests();
    const completedQuests = allQuests.filter(q => q.status === 'Completed');

    // Helper to award badge
    const award = async (badgeId: string) => {
      if (earnedIds.has(badgeId)) return;
      
      const def = BADGE_DEFINITIONS.find(b => b.id === badgeId);
      if (!def) return;

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badgeId
          });
        
        if (error && error.code !== '23505') { // Ignore unique constraint violation
          throw error;
        }
      } else {
        addLocalBadge(userId, badgeId);
      }

      newlyEarned.push(def);
    };

    // 1. FIRST QUEST BADGE
    if (completedQuests.length >= 1) {
      await award('first_quest');
    }

    // 2. SEASONED ADVENTURER BADGE (10 completions)
    if (completedQuests.length >= 10) {
      await award('adventurer');
    }

    // 3. EXPLORER BADGE (3 unique locations)
    const uniqueLocations = new Set(
      completedQuests
        .map(q => q.location?.trim().toLowerCase())
        .filter(Boolean)
    );
    if (uniqueLocations.size >= 3) {
      await award('explorer');
    }

    // 4. WORLD WANDERER BADGE (5 unique locations)
    if (uniqueLocations.size >= 5) {
      await award('world_wanderer');
    }

    // 5. FOOD HUNTER BADGE ( Culinary words in title )
    const titleLower = completedQuest.title.toLowerCase();
    const culinaryKeywords = ['food', 'restaurant', 'eat', 'dine', 'cafe', 'coffee', 'dish', 'lunch', 'dinner', 'breakfast', 'culinary', 'tasty', 'delicious', 'burger', 'pizza', 'sushi'];
    const matchesCulinary = culinaryKeywords.some(keyword => titleLower.includes(keyword));
    if (matchesCulinary) {
      await award('food_hunter');
    }

    // 6. LEGENDARY BADGE (Legendary priority completion)
    if (completedQuest.priority === 'Legendary') {
      await award('legendary');
    }

    return newlyEarned;
  }
};
