import React, { useState, useRef, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    profession: '',
    registrationNumber: '',
    experienceMonth: '',
    experienceYear: '',
    specialties: [] as string[],
    languages: [] as string[],
    city: '',
    county: '',
    offersRemote: false,
    acceptTerms: false
  })
  
  const [dropdowns, setDropdowns] = useState({
    specialties: false,
    languages: false
  })

  // Refs for dropdown containers
  const specialtiesRef = useRef<HTMLDivElement>(null)
  const languagesRef = useRef<HTMLDivElement>(null)

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specialtiesRef.current && !specialtiesRef.current.contains(event.target as Node)) {
        setDropdowns(prev => ({ ...prev, specialties: false }))
      }
      if (languagesRef.current && !languagesRef.current.contains(event.target as Node)) {
        setDropdowns(prev => ({ ...prev, languages: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const professions = [
    'Physiotherapist',
    'Occupational Therapist',
    'Speech & Language Therapist',
    'Dietitian',
    'Podiatrist'
  ]

  const specialtiesOptions = [
    'Orthopaedics',
    'Neurology',
    'Cardiorespiratory',
    'Paediatrics',
    'Mental Health',
    'Community Care',
    'Acute Care',
    'Sports Medicine',
    'Geriatrics',
    'Oncology',
    'Dysphagia',
    'Voice Disorders'
  ]

  const languageOptions = [
    'English',
    'Turkish',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Arabic',
    'Hindi',
    'Urdu',
    'Polish',
    'Romanian'
  ]

  const getRegistrationPlaceholder = (profession: string) => {
    switch (profession) {
      case 'Physiotherapist': return 'HP123456'
      case 'Occupational Therapist': return 'OT123456'
      case 'Speech & Language Therapist': return 'SL123456'
      case 'Dietitian': return 'DT123456'
      case 'Podiatrist': return 'CH123456'
      default: return 'REG123456'
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      if (!formData.acceptTerms) {
        alert('Please accept Terms & Privacy Policy')
        return
      }
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        })
        if (error) throw error
        const user = data.user
        if (!user) throw new Error('User creation failed')
        
        const fullName = `${formData.firstName} ${formData.lastName}`.trim()
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: fullName,
          profession: formData.profession,
          regulator_number: formData.registrationNumber,
          experience_years: new Date().getFullYear() - parseInt(formData.experienceYear || '0'),
          specialties: formData.specialties,
          languages: formData.languages,
          city: formData.city,
          county: formData.county,
          offers_remote: formData.offersRemote
        })
        if (insertError) throw insertError
        
        alert('Account created successfully! Check your email for verification.')
        onClose()
      } catch (err: any) {
        alert(err.message)
      } finally {
        setLoading(false)
      }
    } else {
      alert('Sign-in functionality coming soon.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Join Network' : 'Sign In'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <input 
                  type="text" 
                  placeholder="First Name" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </>
            )}

            <input 
              type="email" 
              placeholder="Email" 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            {isSignUp && (
              <>
                <select 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                >
                  <option value="">Select Profession</option>
                  {professions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                {formData.profession && (
                  <input 
                    type="text" 
                    placeholder={getRegistrationPlaceholder(formData.profession)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  />
                )}

                {/* Specialties Dropdown */}
                <div className="relative" ref={specialtiesRef}>
                  <button 
                    type="button"
                    onClick={() => setDropdowns({ ...dropdowns, specialties: !dropdowns.specialties })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl flex justify-between items-center hover:border-gray-300"
                  >
                    <span>{formData.specialties.length ? `${formData.specialties.length} selected` : 'Select Specialties'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.specialties ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {dropdowns.specialties && (
                    <div className="absolute w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {specialtiesOptions.map((s) => (
                        <label key={s} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.specialties.includes(s)}
                            onChange={() => {
                              setFormData({
                                ...formData,
                                specialties: formData.specialties.includes(s)
                                  ? formData.specialties.filter((x) => x !== s)
                                  : [...formData.specialties, s]
                              })
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{s}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {formData.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map((s) => (
                      <span 
                        key={s} 
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm"
                      >
                        {s}
                        <X 
                          className="w-3 h-3 ml-2 cursor-pointer" 
                          onClick={() => setFormData({ 
                            ...formData, 
                            specialties: formData.specialties.filter((x) => x !== s) 
                          })} 
                        />
                      </span>
                    ))}
                  </div>
                )}

                {/* Languages Dropdown */}
                <div className="relative" ref={languagesRef}>
                  <button 
                    type="button"
                    onClick={() => setDropdowns({ ...dropdowns, languages: !dropdowns.languages })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl flex justify-between items-center hover:border-gray-300"
                  >
                    <span>{formData.languages.length ? `${formData.languages.length} selected` : 'Select Languages'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdowns.languages ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {dropdowns.languages && (
                    <div className="absolute w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {languageOptions.map((lang) => (
                        <label key={lang} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.languages.includes(lang)}
                            onChange={() => {
                              setFormData({
                                ...formData,
                                languages: formData.languages.includes(lang)
                                  ? formData.languages.filter((x) => x !== lang)
                                  : [...formData.languages, lang]
                              })
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{lang}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {formData.languages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.languages.map((l) => (
                      <span 
                        key={l} 
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-sm"
                      >
                        {l}
                        <X 
                          className="w-3 h-3 ml-2 cursor-pointer" 
                          onClick={() => setFormData({ 
                            ...formData, 
                            languages: formData.languages.filter((x) => x !== l) 
                          })} 
                        />
                      </span>
                    ))}
                  </div>
                )}

                <input 
                  type="text" 
                  placeholder="City" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="County" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.county}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                />

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.offersRemote}
                    onChange={(e) => setFormData({ ...formData, offersRemote: e.target.checked })}
                  />
                  Offers remote sessions
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                  />
                  Accept Terms & Privacy Policy
                </label>
              </>
            )}

            <button 
              type="submit" 
              disabled={loading || (isSignUp && !formData.acceptTerms)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            <div className="text-center mt-3">
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AuthModal