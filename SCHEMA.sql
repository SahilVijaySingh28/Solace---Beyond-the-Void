-- SQL Schema for Solace (Phase 4: Private Pulsations & Style Overhaul)

-- 1. Create the capsules table (with explicit link names)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.capsules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipient_id UUID,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  media_name TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  encryption_salt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  unlock_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT user_id_link FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT recipient_id_link FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Force add columns if table already existed when file was run previously
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS media_name TEXT;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS encryption_salt TEXT;

-- 2. Create the Global Lobby messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. [NEW] Private Direct Messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Direct Messages (Private 1-on-1)
CREATE POLICY "Users can view their private conversations" 
ON public.direct_messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send private messages" 
ON public.direct_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- 6. Policies for capsules
CREATE POLICY "Users can view relevant capsules" 
ON public.capsules FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert their own capsules" ON public.capsules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own capsules" ON public.capsules FOR DELETE USING (auth.uid() = user_id);

-- 7. Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8. Policies for Global messages
CREATE POLICY "Global messages are viewable by everyone" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Users can insert their own global messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Enable Realtime
-- Note: You MUST enable these tables in the Supabase Dashboard -> Database -> Replication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 11. Storage Bucket setup for Capsule Media
INSERT INTO storage.buckets (id, name, public) VALUES ('capsules', 'capsules', true) ON CONFLICT DO NOTHING;

-- Storage Policies (Drop if they exist to prevent errors)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'capsules');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'capsules' AND auth.role() = 'authenticated');
