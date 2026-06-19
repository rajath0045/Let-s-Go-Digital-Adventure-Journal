-- SUPABASE DATABASE SCHEMA FOR QUESTVAULT

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. QUESTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Legendary
    location TEXT,
    quest_date DATE,
    lore_acquired TEXT,
    media_link TEXT, -- General media link or social link
    photo_url TEXT,  -- Primary cover image URL
    photo_urls TEXT[] DEFAULT '{}'::TEXT[], -- Support for multiple completion photos
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, In Progress, Completed
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for user quests
CREATE INDEX IF NOT EXISTS quests_user_id_idx ON public.quests(user_id);
CREATE INDEX IF NOT EXISTS quests_status_idx ON public.quests(status);

-- Enable RLS for quests
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- Policies for quests
CREATE POLICY "Users can view their own quests" 
    ON public.quests FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quests" 
    ON public.quests FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests" 
    ON public.quests FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quests" 
    ON public.quests FOR DELETE 
    USING (auth.uid() = user_id);


-- =========================================================================
-- 2. STREAKS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS for streaks
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Policies for streaks
CREATE POLICY "Users can view their own streak" 
    ON public.streaks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own streak" 
    ON public.streaks FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 3. BADGES TABLE & USER BADGES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    badge_id TEXT NOT NULL, -- 'first_quest', 'explorer', 'adventurer', 'food_hunter', 'legendary', 'world_wanderer'
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, badge_id)
);

-- Index for user badges
CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges(user_id);

-- Enable RLS for badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policies for badges
CREATE POLICY "Users can view their own badges" 
    ON public.user_badges FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can earn their own badges" 
    ON public.user_badges FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- 4. TRIGGER FOR AUTO-UPDATED TIMESTAMPS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quests_updated_at
    BEFORE UPDATE ON public.quests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- =========================================================================
-- 5. STORAGE BUCKET SETUP (To be run by Postgres admin or via Supabase Console)
-- =========================================================================
-- Note: Supabase Storage uses the storage schema. We insert the bucket if it doesn't exist.
-- If running this script inside the SQL editor throws a permission error on 'storage.buckets',
-- you can create the bucket manually named 'questvault' and set it to PUBLIC.

-- Insert the questvault bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('questvault', 'questvault', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the 'questvault' bucket
-- Allow public access to read files
CREATE POLICY "Public Access" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'questvault');

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow Auth Uploads" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'questvault' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update/delete their own files
CREATE POLICY "Allow Auth Updates" 
    ON storage.objects FOR UPDATE 
    USING (
        bucket_id = 'questvault' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow Auth Deletes" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'questvault' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
