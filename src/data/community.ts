import  { CommunityPost } from '../types';

export const communityPosts: CommunityPost[] = [
  {
    id: '1',
    title: 'Best practices for remote therapy sessions',
    content: 'Has anyone found effective techniques for maintaining patient engagement during virtual consultations? I\'d love to hear your experiences and any tools you\'ve found helpful.',
    author: 'Sarah Johnson',
    profession: 'Physiotherapist',
    timestamp: new Date('2024-02-10'),
    likes: 15,
    replies: 8
  },
  {
    id: '2',
    title: 'Multilingual assessment tools',
    content: 'Looking for recommendations on assessment tools that work well with non-English speaking patients. Currently working with Turkish and Arabic speaking clients.',
    author: 'Ahmed Hassan',
    profession: 'Speech & Language Therapist',
    timestamp: new Date('2024-02-09'),
    likes: 23,
    replies: 12
  },
  {
    id: '3',
    title: 'Pediatric OT resources',
    content: 'Does anyone have good sensory integration activity suggestions for children aged 5-8? Looking for creative ideas that work well in community settings.',
    author: 'Emma Thompson',
    profession: 'Occupational Therapist',
    timestamp: new Date('2024-02-08'),
    likes: 31,
    replies: 19
  }
];
 