import  type { Therapist } from '../types';

export const therapists: Therapist[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    profession: 'Physiotherapist',
    specialty: ['Orthopedics', 'Sports Medicine'],
    location: { city: 'London', lat: 51.5074, lng: -0.1278 },
    languages: ['English', 'Turkish'],
    bio: 'Experienced physiotherapist specializing in sports injuries and rehabilitation.',
    experience: 8
  },
  {
    id: '2',
    name: 'Ahmed Hassan',
    profession: 'Occupational Therapist',
    specialty: ['Pediatrics', 'Mental Health'],
    location: { city: 'Birmingham', lat: 52.4862, lng: -1.8904 },
    languages: ['English', 'Arabic'],
    bio: 'Passionate about helping children and adults achieve independence.',
    experience: 5
  },
  {
    id: '3',
    name: 'Maria Rodriguez',
    profession: 'Speech & Language Therapist',
    specialty: ['Autism', 'Language Development'],
    location: { city: 'Manchester', lat: 53.4808, lng: -2.2426 },
    languages: ['English', 'Spanish'],
    bio: 'Dedicated to improving communication skills in children and adults.',
    experience: 12
  }
];
 