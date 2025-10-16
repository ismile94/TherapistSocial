export  interface Therapist {
  id: string;
  name: string;
  profession: string;
  specialty: string[];
  location: {
    city: string;
    lat: number;
    lng: number;
  };
  languages: string[];
  bio: string;
  experience: number;
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
 