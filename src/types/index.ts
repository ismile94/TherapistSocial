export  interface Therapist {
  id: string;
  full_name: string;
  profession: string;
  regulator_number: string;
  specialties: string[];
  experience_years: number;
  languages: string[];
  city: string;
  county: string;
  postcode?: string;
  offers_remote: boolean;
  avatar_url?: string;
  email: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: string;
  profession: string;
  timestamp: Date;
  likes: number;
  replies: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location: string;
  organizer_id: string;
  max_participants?: number;
  registration_type: 'rsvp' | 'automatic';
  category: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  organizer?: {
    id: string;
    full_name: string;
    profession?: string;
    avatar_url?: string;
  };
  participant_count?: number;
  is_participant?: boolean;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  rsvp_status: boolean;
  created_at: string;
}
 