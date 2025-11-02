-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_participants INTEGER,
  registration_type TEXT NOT NULL DEFAULT 'rsvp' CHECK (registration_type IN ('rsvp', 'automatic')),
  category TEXT NOT NULL DEFAULT 'workshop' CHECK (category IN ('workshop', 'group_therapy', 'webinar', 'networking', 'seminar', 'other')),
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_participants table
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rsvp_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_rsvp_status ON event_participants(rsvp_status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for events table
-- Allow anyone to read upcoming events
CREATE POLICY "Anyone can view upcoming events" ON events
  FOR SELECT
  USING (start_time >= now());

-- Allow authenticated users to create events
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

-- Allow organizers to update their own events
CREATE POLICY "Organizers can update their events" ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- Allow organizers to delete their own events
CREATE POLICY "Organizers can delete their events" ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = organizer_id);

-- Create policies for event_participants table
-- Allow anyone to read participants (for public events)
CREATE POLICY "Anyone can view event participants" ON event_participants
  FOR SELECT
  USING (true);

-- Allow authenticated users to join events
CREATE POLICY "Authenticated users can join events" ON event_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own RSVP status
CREATE POLICY "Users can update their RSVP status" ON event_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to leave events
CREATE POLICY "Users can leave events" ON event_participants
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

