import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Shield, Users, Calendar, MessageCircle, Award, Coffee, Eye, EyeOff, X, Search } from 'lucide-react'

// Import constants from App.tsx
const PROFESSION_OPTIONS = ['Physiotherapist', 'Occupational Therapist', 'Speech & Language Therapist', 'Practitioner psychologist', 'Registered psychologist', 'Clinical psychologist', 'Forensic psychologist', 'Counselling psychologist', 'Health psychologist', 'Educational psychologist', 'Occupational psychologist', 'Sport and exercise psychologist', 'Dietitian/Dietician', 'Chiropodist', 'Podiatrist', 'Doctor', 'Nurse', 'Paramedic', 'Psychologist', 'Clinical scientist', 'Hearing aid dispenser', 'Orthoptist', 'Prosthetist', 'Orthotist', 'Radiographer', 'Diagnostic radiographer', 'Therapeutic radiographer', 'Speech and language/Speech therapist', 'Pharmacist', 'Social Worker', 'Care Assistant', 'Art Psychotherapist', 'Art therapist', 'Dramatherapist', 'Music therapist', 'Biomedical scientist', 'Operating Department Practitioner (ODP)', 'Midwife', 'Genetic Counsellor', 'Dental Hygienist', 'Dental Therapist', 'Orthodontic Therapist', 'Prosthetist', 'Orthotist', 'Clinical Physiologist', 'Audiologist']

const CLINICAL_AREA_OPTIONS = [
  'Neurology', 'Orthopaedics', 'Cardiorespiratory', 'Paediatrics',
  'Mental Health', 'Community Care', 'Acute Care', 'Sports Medicine',
  'Geriatrics', 'Oncology', 'Dysphagia', 'Voice Disorders', 'ICU/Critical Care',
  'Musculoskeletal', 'Women\'s Health', 'Palliative Care', 'Rehabilitation'
]

const LANGUAGE_OPTIONS = [
  'Afrikaans','Albanian','Amharic','Arabic','Armenian','Assamese','Aymara','Azerbaijani','Bambara','Basque',
  'Belarusian','Bengali','Bhojpuri','Bosnian','Bulgarian','Catalan','Cebuano','Chinese (Simplified)','Chinese (Traditional)',
  'Corsican','Croatian','Czech','Danish','Dhivehi','Dogri','Dutch','English','Esperanto','Estonian','Ewe',
  'Filipino','Finnish','French','Frisian','Galician','Georgian','German','Greek','Guarani','Gujarati','Haitian Creole',
  'Hausa','Hawaiian','Hebrew','Hindi','Hmong','Hungarian','Icelandic','Igbo','Ilocano','Indonesian','Irish',
  'Italian','Japanese','Javanese','Kannada','Kazakh','Khmer','Kinyarwanda','Konkani','Korean','Krio','Kurdish (Kurmanji)',
  'Kurdish (Sorani)','Kyrgyz','Lao','Latin','Latvian','Lingala','Lithuanian','Luganda','Luxembourgish','Macedonian',
  'Maithili','Malagasy','Malay','Malayalam','Maltese','Maori','Marathi','Mizo','Mongolian','Myanmar (Burmese)',
  'Nepali','Norwegian','Nyanja (Chichewa)','Odia (Oriya)','Oromo','Pashto','Persian','Polish','Portuguese','Punjabi',
  'Quechua','Romanian','Russian','Samoan','Sanskrit','Scots Gaelic','Sepedi','Serbian','Sesotho','Shona','Sindhi',
  'Sinhala','Slovak','Slovenian','Somali','Spanish','Sundanese','Swahili','Swedish','Tagalog (Filipino)','Tajik',
  'Tamil','Tatar','Telugu','Thai','Tigrinya','Tsonga','Turkish','Turkmen','Twi (Akan)','Ukrainian','Urdu','Uyghur',
  'Uzbek','Vietnamese','Welsh','Xhosa','Yiddish','Yoruba','Zulu'
]

interface LandingPageProps {
  onSignInSuccess: () => void
}

export default function LandingPage({ onSignInSuccess }: LandingPageProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  
  // Sign In state
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  
  // Sign Up state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    profession: '',
    specialties: [] as string[],
    languages: [] as string[],
    city: '',
    county: '',
    lat: null as number | null,
    lng: null as number | null,
    offersRemote: false,
    acceptTerms: false,
    useSignupEmailAsContact: true
  })
  
  // Profession, Specialty, Language inputs
  const [professionInput, setProfessionInput] = useState('')
  const [filteredProfessions, setFilteredProfessions] = useState<string[]>([])
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false)
  const [highlightedProfessionIndex, setHighlightedProfessionIndex] = useState(-1)
  const [allAvailableProfessions, setAllAvailableProfessions] = useState<string[]>([])
  
  const [specialtyInput, setSpecialtyInput] = useState('')
  const [filteredSpecialties, setFilteredSpecialties] = useState<string[]>([])
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false)
  const [highlightedSpecialtyIndex, setHighlightedSpecialtyIndex] = useState(-1)
  const [allAvailableSpecialties, setAllAvailableSpecialties] = useState<string[]>([])
  
  const [languageInput, setLanguageInput] = useState('')
  const [filteredLanguages, setFilteredLanguages] = useState<string[]>([])
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [highlightedLanguageIndex, setHighlightedLanguageIndex] = useState(-1)
  const [allAvailableLanguages, setAllAvailableLanguages] = useState<string[]>([])
  
  // Location search
  const [locationSearch, setLocationSearch] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  
  const locationRef = useRef<HTMLDivElement>(null)
  const professionRef = useRef<HTMLDivElement>(null)
  const specialtyRef = useRef<HTMLDivElement>(null)
  const languageRef = useRef<HTMLDivElement>(null)
  
  // Load professions, specialties, languages
  useEffect(() => {
    fetchAllProfessions()
    fetchAllSpecialties()
    fetchAllLanguages()
  }, [])
  
  const fetchAllProfessions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profession')
        .not('profession', 'is', null)
      
      if (!error && data) {
        const usedProfessions = [...new Set(data.map(p => p.profession).filter(p => p && p.trim()))] as string[]
        const combinedProfessions = [...new Set([...PROFESSION_OPTIONS, ...usedProfessions])]
        combinedProfessions.sort()
        setAllAvailableProfessions(combinedProfessions)
      } else {
        setAllAvailableProfessions([...PROFESSION_OPTIONS])
      }
    } catch (err) {
      console.error('Error loading professions:', err)
      setAllAvailableProfessions([...PROFESSION_OPTIONS])
    }
  }
  
  const fetchAllSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('specialties')
        .not('specialties', 'is', null)
      
      if (error) {
        console.error('Error fetching specialties:', error)
        return
      }
      
      const allSpecialties = new Set<string>()
      data.forEach(profile => {
        if (profile.specialties && Array.isArray(profile.specialties)) {
          profile.specialties.forEach((s: string) => {
            if (s.trim()) {
              allSpecialties.add(s.trim())
            }
          })
        }
      })
      
      const combinedSpecialties = [...new Set([...CLINICAL_AREA_OPTIONS, ...Array.from(allSpecialties)])]
      combinedSpecialties.sort()
      setAllAvailableSpecialties(combinedSpecialties)
    } catch (err) {
      console.error('Error fetching specialties:', err)
      setAllAvailableSpecialties([...CLINICAL_AREA_OPTIONS])
    }
  }
  
  const fetchAllLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('languages')
        .not('languages', 'is', null)
      
      if (error) {
        console.error('Error fetching languages:', error)
        return
      }
      
      const allLanguages = new Set<string>()
      data.forEach(profile => {
        if (profile.languages && Array.isArray(profile.languages)) {
          profile.languages.forEach((l: string) => {
            if (l.trim()) {
              allLanguages.add(l.trim())
            }
          })
        }
      })
      
      const combinedLanguages = [...new Set([...LANGUAGE_OPTIONS, ...Array.from(allLanguages)])]
      combinedLanguages.sort()
      setAllAvailableLanguages(combinedLanguages)
    } catch (err) {
      console.error('Error fetching languages:', err)
      setAllAvailableLanguages([...LANGUAGE_OPTIONS])
    }
  }
  
  // Location search
  useEffect(() => {
    if (locationSearch.length < 3) {
      setLocationSuggestions([])
      return
    }
    
    const timeoutId = setTimeout(async () => {
      setIsSearchingLocation(true)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=5&addressdetails=1`
        )
        const data = await response.json()
        setLocationSuggestions(data)
        setShowLocationSuggestions(true)
      } catch (error) {
        console.error('Location search error:', error)
      } finally {
        setIsSearchingLocation(false)
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [locationSearch])
  
  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false)
      }
      if (professionRef.current && !professionRef.current.contains(event.target as Node)) {
        setShowProfessionDropdown(false)
      }
      if (specialtyRef.current && !specialtyRef.current.contains(event.target as Node)) {
        setShowSpecialtyDropdown(false)
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Profession handlers
  const handleProfessionInputChange = (value: string) => {
    setProfessionInput(value)
    setFormData({ ...formData, profession: value })
    setHighlightedProfessionIndex(-1)
    
    if (value.trim()) {
      const filtered = allAvailableProfessions.filter(prof => 
        prof.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredProfessions(filtered)
      setShowProfessionDropdown(true)
    } else {
      setFilteredProfessions([])
      setShowProfessionDropdown(false)
    }
  }
  
  const selectProfession = (profession: string) => {
    setProfessionInput(profession)
    setFormData({ ...formData, profession })
    setShowProfessionDropdown(false)
    setHighlightedProfessionIndex(-1)
  }
  
  const handleProfessionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProfessionDropdown) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedProfessionIndex(prev => 
          prev < filteredProfessions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedProfessionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedProfessionIndex >= 0 && highlightedProfessionIndex < filteredProfessions.length) {
          selectProfession(filteredProfessions[highlightedProfessionIndex])
        } else if (professionInput.trim() && !allAvailableProfessions.includes(professionInput.trim())) {
          const newProfession = professionInput.trim()
          setAllAvailableProfessions(prev => [...prev, newProfession].sort())
          selectProfession(newProfession)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowProfessionDropdown(false)
        setHighlightedProfessionIndex(-1)
        break
    }
  }
  
  // Specialty handlers
  const handleSpecialtyInputChange = (value: string) => {
    setSpecialtyInput(value)
    setHighlightedSpecialtyIndex(-1)
    
    if (value.trim()) {
      const filtered = allAvailableSpecialties.filter(spec => 
        spec.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSpecialties(filtered)
      setShowSpecialtyDropdown(true)
    } else {
      setFilteredSpecialties([])
      setShowSpecialtyDropdown(false)
    }
  }
  
  const addSpecialty = (specialty: string) => {
    if (!formData.specialties.includes(specialty)) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialty]
      })
      
      if (!allAvailableSpecialties.includes(specialty)) {
        setAllAvailableSpecialties(prev => [...prev, specialty].sort())
      }
    }
    setSpecialtyInput('')
    setShowSpecialtyDropdown(false)
    setHighlightedSpecialtyIndex(-1)
  }
  
  const handleSpecialtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSpecialtyDropdown) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedSpecialtyIndex(prev => 
          prev < filteredSpecialties.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedSpecialtyIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedSpecialtyIndex >= 0 && highlightedSpecialtyIndex < filteredSpecialties.length) {
          addSpecialty(filteredSpecialties[highlightedSpecialtyIndex])
        } else if (specialtyInput.trim() && !allAvailableSpecialties.includes(specialtyInput.trim())) {
          addSpecialty(specialtyInput.trim())
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSpecialtyDropdown(false)
        setHighlightedSpecialtyIndex(-1)
        break
    }
  }
  
  // Language handlers
  const handleLanguageInputChange = (value: string) => {
    setLanguageInput(value)
    setHighlightedLanguageIndex(-1)
    
    if (value.trim()) {
      const filtered = allAvailableLanguages.filter(lang => 
        lang.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredLanguages(filtered)
      setShowLanguageDropdown(true)
    } else {
      setFilteredLanguages([])
      setShowLanguageDropdown(false)
    }
  }
  
  const addLanguage = (language: string) => {
    if (!formData.languages.includes(language)) {
      setFormData({
        ...formData,
        languages: [...formData.languages, language]
      })
      
      if (!allAvailableLanguages.includes(language)) {
        setAllAvailableLanguages(prev => [...prev, language].sort())
      }
    }
    setLanguageInput('')
    setShowLanguageDropdown(false)
    setHighlightedLanguageIndex(-1)
  }
  
  const handleLanguageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLanguageDropdown) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedLanguageIndex(prev => 
          prev < filteredLanguages.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedLanguageIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedLanguageIndex >= 0 && highlightedLanguageIndex < filteredLanguages.length) {
          addLanguage(filteredLanguages[highlightedLanguageIndex])
        } else if (languageInput.trim() && !allAvailableLanguages.includes(languageInput.trim())) {
          addLanguage(languageInput.trim())
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowLanguageDropdown(false)
        setHighlightedLanguageIndex(-1)
        break
    }
  }
  
  // Location handler
  const handleLocationSelect = (suggestion: any) => {
    const city = suggestion.address.city || 
                 suggestion.address.town || 
                 suggestion.address.village || 
                 suggestion.address.hamlet ||
                 suggestion.address.municipality ||
                 suggestion.address.locality || ''
    const county = suggestion.address.county || 
                   suggestion.address.state || 
                   suggestion.address.region ||
                   suggestion.address.province ||
                   suggestion.address.district || ''
    
    setFormData({
      ...formData,
      city: city,
      county: county,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    })
    setLocationSearch(suggestion.display_name)
    setShowLocationSuggestions(false)
  }
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthMessage(null)
    
    if (isSignUp) {
      if (!formData.acceptTerms) {
        setAuthMessage({ type: 'error', text: 'Please accept Terms & Privacy Policy' })
        return
      }
      setLoading(true)
      try {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim()
        
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: fullName
            }
          }
        })
        
        if (error) {
          setAuthMessage({ type: 'error', text: error.message })
          return
        }
        
        const user = data.user
        if (!user || !user.id) {
          setAuthMessage({ type: 'error', text: 'User creation failed' })
          return
        }
        
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: formData.email,
            contact_email: formData.useSignupEmailAsContact ? formData.email : '',
            full_name: fullName,
            profession: formData.profession,
            specialties: formData.specialties,
            languages: formData.languages,
            city: formData.city,
            county: formData.county,
            lat: formData.lat,
            lng: formData.lng,
            offers_remote: formData.offersRemote
          }, {
            onConflict: 'id'
          })
        
        if (upsertError) {
          setAuthMessage({ type: 'error', text: `Failed to save profile: ${upsertError.message}` })
          return
        }
        
        setAuthMessage({ type: 'success', text: 'Account created successfully!' })
        setTimeout(() => {
          onSignInSuccess()
        }, 1500)
      } catch (err: any) {
        setAuthMessage({ type: 'error', text: err.message })
      } finally {
        setLoading(false)
      }
    } else {
      // Sign In
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: signInEmail,
          password: signInPassword
        })
        if (error) {
          setAuthMessage({ type: 'error', text: 'Invalid email or password' })
          return
        }
        
        setAuthMessage({ type: 'success', text: 'Successfully signed in!' })
        // Auth state değişikliğini bekle, reload yerine state update kullan
        setTimeout(() => {
          onSignInSuccess()
        }, 500)
      } catch (err: any) {
        setAuthMessage({ type: 'error', text: err.message })
      } finally {
        setLoading(false)
      }
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-indigo-500/3 to-purple-500/3"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Header */}
          <header className="flex justify-between items-center mb-12 sm:mb-16 lg:mb-20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">TherapistSocial</span>
            </div>
          </header>
          
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-20 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] text-gray-900 tracking-tight">
                  Professional <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-medium">Community</span><br />
                  for Therapists
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl font-light">
                  Join a dedicated platform where therapy professionals connect, share knowledge, organize events, and grow together in a supportive community environment.
                </p>
              </div>
              
              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-200/40 border border-gray-100 hover:shadow-lg hover:shadow-gray-300/40 transition-[transform,box-shadow] duration-200 hover:-translate-y-1" style={{ willChange: 'transform' }}>
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1.5 text-[15px]">Network & Connect</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Build meaningful relationships with fellow professionals</p>
                </div>
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-200/40 border border-gray-100 hover:shadow-lg hover:shadow-gray-300/40 transition-[transform,box-shadow] duration-200 hover:-translate-y-1" style={{ willChange: 'transform' }}>
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl flex items-center justify-center mb-4">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1.5 text-[15px]">Host Events</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Organize workshops, meetups, and professional gatherings</p>
                </div>
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-200/40 border border-gray-100 hover:shadow-lg hover:shadow-gray-300/40 transition-[transform,box-shadow] duration-200 hover:-translate-y-1" style={{ willChange: 'transform' }}>
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1.5 text-[15px]">Share Knowledge</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Exchange insights and best practices in safe spaces</p>
                </div>
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-200/40 border border-gray-100 hover:shadow-lg hover:shadow-gray-300/40 transition-[transform,box-shadow] duration-200 hover:-translate-y-1" style={{ willChange: 'transform' }}>
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1.5 text-[15px]">Professional Growth</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">Continuous learning and career development opportunities</p>
                </div>
              </div>
            </div>
            
            {/* Auth Form */}
            <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/40 border border-gray-100 p-6 sm:p-8 lg:p-10">
              {authMessage && (
                <div className={`mb-5 p-3.5 rounded-2xl text-sm font-light ${
                  authMessage.type === 'error' 
                    ? 'bg-red-50/80 text-red-700 border border-red-100' 
                    : 'bg-emerald-50/80 text-emerald-700 border border-emerald-100'
                }`}>
                  {authMessage.text}
                </div>
              )}
              
              {!isSignUp ? (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-gray-900 tracking-tight">Welcome Back</h2>
                    <p className="text-gray-600 font-light">Sign in to your professional community</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                      type="email"
                      placeholder="Professional Email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                    />
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-2xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <button 
                      type="button"
                      className="w-full text-center text-blue-600 hover:text-blue-700 font-light text-sm transition-colors duration-200"
                    >
                      Forgot your password?
                    </button>
                    <div className="border-t border-gray-100 pt-6">
                      <p className="text-center text-gray-600 font-light text-sm">
                        New to the community?{' '}
                        <button
                          type="button"
                          onClick={() => setIsSignUp(true)}
                          className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                        >
                          Join now
                        </button>
                      </p>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-gray-900 tracking-tight">Join Our Community</h2>
                    <p className="text-gray-600 font-light">Connect with therapy professionals worldwide</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="First Name"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                    
                    <input
                      type="text"
                      placeholder="Last Name"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                    
                    {/* Profession */}
                    <div className="relative" ref={professionRef}>
                      <input
                        type="text"
                        placeholder="Type to search or add new profession..."
                        required
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                        value={professionInput}
                        onChange={(e) => handleProfessionInputChange(e.target.value)}
                        onKeyDown={handleProfessionKeyDown}
                        onFocus={() => {
                          if (professionInput.trim()) {
                            const filtered = allAvailableProfessions.filter(prof => 
                              prof.toLowerCase().includes(professionInput.toLowerCase())
                            )
                            setFilteredProfessions(filtered)
                            setShowProfessionDropdown(true)
                          }
                        }}
                      />
                      {showProfessionDropdown && filteredProfessions.length > 0 && (
                        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-200/50 max-h-60 overflow-y-auto">
                          {filteredProfessions.map((prof, index) => (
                            <button
                              key={prof}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                selectProfession(prof)
                              }}
                              onMouseEnter={() => setHighlightedProfessionIndex(index)}
                              className={`w-full text-left px-4 py-2.5 text-sm font-light transition-colors duration-150 ${
                                index === highlightedProfessionIndex 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {prof}
                            </button>
                          ))}
                          {professionInput.trim() && !allAvailableProfessions.includes(professionInput.trim()) && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                const newProfession = professionInput.trim()
                                setAllAvailableProfessions(prev => [...prev, newProfession].sort())
                                selectProfession(newProfession)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm border-t border-gray-100 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 font-light transition-colors duration-150"
                            >
                              + Add "{professionInput.trim()}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Specialty */}
                    <div className="relative" ref={specialtyRef}>
                      <input
                        type="text"
                        placeholder="Type to search or add new specialty..."
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                        value={specialtyInput}
                        onChange={(e) => handleSpecialtyInputChange(e.target.value)}
                        onKeyDown={handleSpecialtyKeyDown}
                        onFocus={() => {
                          if (specialtyInput.trim()) {
                            const filtered = allAvailableSpecialties.filter(spec => 
                              spec.toLowerCase().includes(specialtyInput.toLowerCase())
                            )
                            setFilteredSpecialties(filtered)
                            setShowSpecialtyDropdown(true)
                          }
                        }}
                      />
                      {showSpecialtyDropdown && filteredSpecialties.length > 0 && (
                        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-200/50 max-h-60 overflow-y-auto">
                          {filteredSpecialties.map((spec, index) => (
                            <button
                              key={spec}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addSpecialty(spec)
                              }}
                              onMouseEnter={() => setHighlightedSpecialtyIndex(index)}
                              className={`w-full text-left px-4 py-2.5 text-sm font-light transition-colors duration-150 ${
                                index === highlightedSpecialtyIndex 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {spec}
                            </button>
                          ))}
                          {specialtyInput.trim() && !allAvailableSpecialties.includes(specialtyInput.trim()) && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addSpecialty(specialtyInput.trim())
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm border-t border-gray-100 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 font-light transition-colors duration-150"
                            >
                              + Add "{specialtyInput.trim()}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {formData.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.specialties.map((s) => (
                          <span 
                            key={s} 
                            className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full flex items-center text-sm font-light border border-emerald-100"
                          >
                            {s}
                            <X 
                              className="w-3.5 h-3.5 ml-2 cursor-pointer hover:text-emerald-900 transition-colors" 
                              onClick={() => setFormData({ 
                                ...formData, 
                                specialties: formData.specialties.filter((x) => x !== s) 
                              })} 
                            />
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Language */}
                    <div className="relative" ref={languageRef}>
                      <input
                        type="text"
                        placeholder="Type to search or add new language..."
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                        value={languageInput}
                        onChange={(e) => handleLanguageInputChange(e.target.value)}
                        onKeyDown={handleLanguageKeyDown}
                        onFocus={() => {
                          if (languageInput.trim()) {
                            const filtered = allAvailableLanguages.filter(lang => 
                              lang.toLowerCase().includes(languageInput.toLowerCase())
                            )
                            setFilteredLanguages(filtered)
                            setShowLanguageDropdown(true)
                          }
                        }}
                      />
                      {showLanguageDropdown && filteredLanguages.length > 0 && (
                        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-200/50 max-h-60 overflow-y-auto">
                          {filteredLanguages.map((lang, index) => (
                            <button
                              key={lang}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addLanguage(lang)
                              }}
                              onMouseEnter={() => setHighlightedLanguageIndex(index)}
                              className={`w-full text-left px-4 py-2.5 text-sm font-light transition-colors duration-150 ${
                                index === highlightedLanguageIndex 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                          {languageInput.trim() && !allAvailableLanguages.includes(languageInput.trim()) && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addLanguage(languageInput.trim())
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm border-t border-gray-100 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 font-light transition-colors duration-150"
                            >
                              + Add "{languageInput.trim()}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {formData.languages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.languages.map((l) => (
                          <span 
                            key={l} 
                            className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full flex items-center text-sm font-light border border-emerald-100"
                          >
                            {l}
                            <X 
                              className="w-3.5 h-3.5 ml-2 cursor-pointer hover:text-emerald-900 transition-colors" 
                              onClick={() => setFormData({ 
                                ...formData, 
                                languages: formData.languages.filter((x) => x !== l) 
                              })} 
                            />
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Contact Email Checkbox */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500/20 focus:ring-2"
                          checked={formData.useSignupEmailAsContact}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            useSignupEmailAsContact: e.target.checked
                          })}
                        />
                        <div>
                          <span className="text-sm font-medium text-blue-900">Use my sign-up email as contact email</span>
                          <p className="text-xs text-blue-700/80 mt-1 font-light leading-relaxed">When checked, other therapists can contact you via your sign-up email address. If unchecked, you can set a different contact email later in your profile settings.</p>
                        </div>
                      </label>
                    </div>
                    
                    {/* Location */}
                    <div className="relative" ref={locationRef}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-light">Location (City/Town)</label>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Type your city or town..."
                          required
                          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white transition-all duration-200 font-light"
                          value={locationSearch}
                          onChange={(e) => {
                            setLocationSearch(e.target.value)
                            if (e.target.value.length < 3) {
                              setFormData({ ...formData, city: '', county: '', lat: null, lng: null })
                            }
                          }}
                        />
                        {isSearchingLocation && (
                          <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          </div>
                        )}
                      </div>
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute w-full bg-white border border-gray-200 mt-2 rounded-2xl shadow-lg shadow-gray-200/50 max-h-60 overflow-y-auto z-50">
                          {locationSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleLocationSelect(suggestion)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50/80 border-b border-gray-100/50 last:border-b-0 transition-colors duration-150 font-light"
                            >
                              <div className="font-medium text-sm text-gray-900">
                                {suggestion.address.city || suggestion.address.town || suggestion.address.village}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {suggestion.display_name}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      placeholder="City"
                      required
                      disabled
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 font-light cursor-not-allowed"
                      value={formData.city}
                      readOnly
                    />
                    
                    <input
                      type="text"
                      placeholder="County"
                      required
                      disabled
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 font-light cursor-not-allowed"
                      value={formData.county}
                      readOnly
                    />
                    
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.offersRemote}
                        onChange={(e) => setFormData({ ...formData, offersRemote: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500/20 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 font-light group-hover:text-gray-900 transition-colors">Offers remote sessions</span>
                    </label>
                    
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500/20 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 font-light group-hover:text-gray-900 transition-colors">Accept Terms & Privacy Policy</span>
                    </label>
                    
                    <button
                      type="submit"
                      disabled={loading || !formData.acceptTerms}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30"
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                    
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setIsSignUp(false)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                      >
                        Already have an account? Sign in
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Community Showcase Section */}
      <div className="bg-gray-50 py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4 text-gray-900 tracking-tight">Your Professional Community Awaits</h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Join therapy professionals from around the world who are already building meaningful connections and advancing their practice together
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center group">
              <div className="relative mb-6 overflow-hidden rounded-3xl shadow-md shadow-gray-200/40 group-hover:shadow-lg group-hover:shadow-gray-300/50 transition-shadow duration-200">
                <img 
                  src="https://images.unsplash.com/photo-1555069855-e580a9adbf43?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHx0aGVyYXBpc3QlMjBjb21tdW5pdHklMjBuZXR3b3JraW5nJTIwcHJvZmVzc2lvbmFsJTIwbWVldGluZ3xlbnwwfHx8fDE3NjI0NDEyNjR8MA&ixlib=rb-4.1.0&fit=fillmax&h=400&w=800"
                  alt="circle of people sitting on chair on grass field"
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300 will-change-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent"></div>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 text-gray-900">Support Circles</h3>
              <p className="text-gray-700 leading-relaxed">Join peer support groups for professional guidance and emotional wellbeing</p>
            </div>
            <div className="text-center group">
              <div className="relative mb-6 overflow-hidden rounded-3xl shadow-md shadow-gray-200/40 group-hover:shadow-lg group-hover:shadow-gray-300/50 transition-shadow duration-200">
                <img 
                  src="https://images.unsplash.com/photo-1761250246894-ee2314939662?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwzfHx0aGVyYXBpc3QlMjBjb21tdW5pdHklMjBuZXR3b3JraW5nJTIwcHJvZmVzc2lvbmFsJTIwbWVldGluZ3xlbnwwfHx8fDE3NjI0NDEyNjR8MA&ixlib=rb-4.1.0&fit=fillmax&h=400&w=800"
                  alt="Three people talking in a casual meeting"
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300 will-change-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent"></div>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 text-gray-900">Collaborative Learning</h3>
              <p className="text-gray-700 leading-relaxed">Engage in meaningful discussions and collaborative learning sessions</p>
            </div>
            <div className="text-center group">
              <div className="relative mb-6 overflow-hidden rounded-3xl shadow-md shadow-gray-200/40 group-hover:shadow-lg group-hover:shadow-gray-300/50 transition-shadow duration-200">
                <div className="w-full h-64 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center group-hover:from-blue-100 group-hover:via-indigo-100 group-hover:to-purple-100 transition-colors duration-300">
                  <Coffee className="w-16 h-16 text-blue-500 group-hover:scale-110 transition-transform duration-300 will-change-transform" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 text-gray-900">Networking Events</h3>
              <p className="text-gray-700 leading-relaxed">Attend local and virtual meetups to expand your professional network</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-semibold tracking-tight">TherapistSocial</span>
          </div>
          <p className="text-gray-400 mb-4 font-light">Building stronger communities for therapy professionals</p>
          <div className="flex justify-center gap-6 sm:gap-8 text-sm text-gray-400 font-light">
            <span>Professional Community</span>
            <span className="text-gray-600">•</span>
            <span>Safe & Secure</span>
            <span className="text-gray-600">•</span>
            <span>Non-Commercial</span>
          </div>
        </div>
      </div>
    </div>
  )
}

