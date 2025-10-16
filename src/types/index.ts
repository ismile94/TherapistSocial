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
 