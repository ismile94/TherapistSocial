// ============================================
// Profession Options
// ============================================

export const PROFESSION_OPTIONS = [
  'Physiotherapist',
  'Occupational Therapist',
  'Speech & Language Therapist',
  'Practitioner psychologist',
  'Registered psychologist',
  'Clinical psychologist',
  'Forensic psychologist',
  'Counselling psychologist',
  'Health psychologist',
  'Educational psychologist',
  'Occupational psychologist',
  'Sport and exercise psychologist',
  'Dietitian/Dietician',
  'Chiropodist',
  'Podiatrist',
  'Doctor',
  'Nurse',
  'Paramedic',
  'Psychologist',
  'Clinical scientist',
  'Hearing aid dispenser',
  'Orthoptist',
  'Prosthetist',
  'Orthotist',
  'Radiographer',
  'Diagnostic radiographer',
  'Therapeutic radiographer',
  'Speech and language/Speech therapist',
  'Pharmacist',
  'Social Worker',
  'Care Assistant',
  'Art Psychotherapist',
  'Art therapist',
  'Dramatherapist',
  'Music therapist',
  'Biomedical scientist',
  'Operating Department Practitioner (ODP)',
  'Midwife',
  'Genetic Counsellor',
  'Dental Hygienist',
  'Dental Therapist',
  'Orthodontic Therapist',
  'Clinical Physiologist',
  'Audiologist'
]

// ============================================
// Clinical Area Options
// ============================================

export const CLINICAL_AREA_OPTIONS = [
  'Neurology',
  'Orthopaedics',
  'Cardiorespiratory',
  'Paediatrics',
  'Mental Health',
  'Community Care',
  'Acute Care',
  'Sports Medicine',
  'Geriatrics',
  'Oncology',
  'Dysphagia',
  'Voice Disorders',
  'ICU/Critical Care',
  'Musculoskeletal',
  "Women's Health",
  'Palliative Care',
  'Rehabilitation'
]

// ============================================
// Content Type Options
// ============================================

export const CONTENT_TYPE_OPTIONS = [
  'Research summary',
  'Case study',
  'Clinical guideline',
  'Opinion/Discussion',
  'Question/Request for feedback',
  'Evidence-based tip',
  'Continuing education material',
  'Job opportunity',
  'Event announcement'
]

// ============================================
// Audience Level Options
// ============================================

export const AUDIENCE_LEVEL_OPTIONS = [
  'Student',
  'Junior professional',
  'Experienced clinician',
  'Researcher/Academic',
  'All levels'
]

// ============================================
// Related Conditions Options
// ============================================

export const RELATED_CONDITIONS_OPTIONS = [
  'Stroke',
  'COPD',
  'Low back pain',
  "Parkinson's",
  'Dementia',
  'Arthritis',
  'COVID-19',
  'Spinal cord injury',
  'Autism',
  'Dysphagia',
  'Multiple Sclerosis',
  'Cardiac conditions',
  'Pulmonary diseases'
]

// ============================================
// Language Options
// ============================================

export const LANGUAGE_OPTIONS = [
  'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Assamese', 'Aymara',
  'Azerbaijani', 'Bambara', 'Basque', 'Belarusian', 'Bengali', 'Bhojpuri', 'Bosnian',
  'Bulgarian', 'Catalan', 'Cebuano', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Corsican', 'Croatian', 'Czech', 'Danish', 'Dhivehi', 'Dogri', 'Dutch', 'English',
  'Esperanto', 'Estonian', 'Ewe', 'Filipino', 'Finnish', 'French', 'Frisian', 'Galician',
  'Georgian', 'German', 'Greek', 'Guarani', 'Gujarati', 'Haitian Creole', 'Hausa',
  'Hawaiian', 'Hebrew', 'Hindi', 'Hmong', 'Hungarian', 'Icelandic', 'Igbo', 'Ilocano',
  'Indonesian', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kazakh', 'Khmer',
  'Kinyarwanda', 'Konkani', 'Korean', 'Krio', 'Kurdish (Kurmanji)', 'Kurdish (Sorani)',
  'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luganda', 'Luxembourgish',
  'Macedonian', 'Maithili', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Maori', 'Marathi',
  'Mizo', 'Mongolian', 'Myanmar (Burmese)', 'Nepali', 'Norwegian', 'Nyanja (Chichewa)',
  'Odia (Oriya)', 'Oromo', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Punjabi',
  'Quechua', 'Romanian', 'Russian', 'Samoan', 'Sanskrit', 'Scots Gaelic', 'Sepedi',
  'Serbian', 'Sesotho', 'Shona', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali',
  'Spanish', 'Sundanese', 'Swahili', 'Swedish', 'Tagalog (Filipino)', 'Tajik', 'Tamil',
  'Tatar', 'Telugu', 'Thai', 'Tigrinya', 'Tsonga', 'Turkish', 'Turkmen', 'Twi (Akan)',
  'Ukrainian', 'Urdu', 'Uyghur', 'Uzbek', 'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish',
  'Yoruba', 'Zulu'
]

// ============================================
// Emoji Reactions
// ============================================

export const EMOJI_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '💡', label: 'Insightful' }
]

// ============================================
// Route Paths
// ============================================

export const ROUTES = {
  HOME: '/',
  COMMUNITY: '/community',
  MAP: '/map',
  PROFILE: '/profile/:id',
  MESSAGES: '/messages',
  NETWORK: '/network',
  SETTINGS: '/settings',
  CV_MAKER: '/cv-maker',
  AUTH: '/auth'
} as const

