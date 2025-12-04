import React, { useState, useCallback } from 'react'
import { Search, ChevronDown, X, Filter, MapPin, Globe, Briefcase, Languages } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SidebarProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedProfessions: string[]
  setSelectedProfessions: (professions: string[]) => void
  selectedLanguages: string[]
  setSelectedLanguages: (languages: string[]) => void
  languageMode: 'OR' | 'AND'
  setLanguageMode: (mode: 'OR' | 'AND') => void
  isOpen?: boolean
  onClose?: () => void
}

// Collapsible filter section component
const FilterSection = ({ 
  title, 
  icon: Icon, 
  isOpen, 
  onToggle, 
  children,
  badge
}: { 
  title: string
  icon: typeof Filter
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: number
}) => (
  <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm hover:shadow-soft transition-all duration-300">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-600" />
        </div>
        <span className="font-medium text-gray-900">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
            {badge}
          </span>
        )}
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </motion.div>
    </button>
    
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 pt-2">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

// Tag chip component
const TagChip = ({ 
  label, 
  onRemove, 
  variant = 'primary' 
}: { 
  label: string
  onRemove: () => void
  variant?: 'primary' | 'secondary'
}) => {
  const variantClasses = {
    primary: 'bg-primary-50 text-primary-700 border-primary-100 hover:bg-primary-100',
    secondary: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
  }
  
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        border transition-colors duration-200
        ${variantClasses[variant]}
      `}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  )
}

// Checkbox item component
const CheckboxItem = ({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <label className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-150 group">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div className={`
        w-5 h-5 rounded-md border-2 transition-all duration-200
        ${checked 
          ? 'bg-primary-500 border-primary-500' 
          : 'border-gray-300 group-hover:border-primary-300'
        }
      `}>
        {checked && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-full h-full text-white p-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </div>
    </div>
    <span className={`text-sm transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
      {label}
    </span>
  </label>
)

const Sidebar: React.FC<SidebarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedProfessions,
  setSelectedProfessions,
  selectedLanguages,
  setSelectedLanguages,
  languageMode,
  setLanguageMode,
  isOpen = true,
  onClose
}) => {
  const [isProfessionOpen, setIsProfessionOpen] = useState(true)
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false)
  const [professionSearch, setProfessionSearch] = useState('')
  const [languageSearch, setLanguageSearch] = useState('')

  const professions = [
    'Physiotherapist',
    'Occupational Therapist',
    'Speech & Language Therapist',
    'Dietitian',
    'Podiatrist',
    'Psychologist',
    'Counsellor',
    'Nurse',
    'Social Worker',
  ]

  const languages = [
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
    'Romanian',
    'Mandarin',
    'Russian',
    'Japanese',
    'Korean',
  ]

  const filteredProfessions = professions.filter(p => 
    p.toLowerCase().includes(professionSearch.toLowerCase())
  )

  const filteredLanguages = languages.filter(l => 
    l.toLowerCase().includes(languageSearch.toLowerCase())
  )

  const handleProfessionToggle = useCallback((profession: string, checked: boolean) => {
    if (checked) {
      setSelectedProfessions([...selectedProfessions, profession])
    } else {
      setSelectedProfessions(selectedProfessions.filter(p => p !== profession))
    }
  }, [selectedProfessions, setSelectedProfessions])

  const handleLanguageToggle = useCallback((language: string, checked: boolean) => {
    if (checked) {
      setSelectedLanguages([...selectedLanguages, language])
    } else {
      setSelectedLanguages(selectedLanguages.filter(l => l !== language))
    }
  }, [selectedLanguages, setSelectedLanguages])

  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedProfessions([])
    setSelectedLanguages([])
    setLanguageMode('OR')
  }, [setSearchTerm, setSelectedProfessions, setSelectedLanguages, setLanguageMode])

  const hasActiveFilters = searchTerm || selectedProfessions.length > 0 || selectedLanguages.length > 0

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`
        w-full md:w-80 lg:w-96
        bg-gradient-to-b from-gray-50/80 to-white
        md:border-r border-gray-100
        p-4 md:p-6
        overflow-y-auto
        h-full
        scrollbar-thin
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-indigo flex items-center justify-center shadow-lg shadow-primary-500/20">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Find Therapists</h2>
            <p className="text-xs text-gray-500">Search and filter professionals</p>
          </div>
        </div>
        
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, city, specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-10 pr-4 py-3
              bg-white border border-gray-200 rounded-xl
              text-sm text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400
              transition-all duration-200
              hover:border-gray-300
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Clear filters button */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={clearAllFilters}
            className="w-full mb-4 py-2 px-3 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear all filters
          </motion.button>
        )}
      </AnimatePresence>

      {/* Filter Sections */}
      <div className="space-y-3">
        {/* Profession Filter */}
        <FilterSection
          title="Profession"
          icon={Briefcase}
          isOpen={isProfessionOpen}
          onToggle={() => setIsProfessionOpen(!isProfessionOpen)}
          badge={selectedProfessions.length}
        >
          {/* Search within professions */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search professions..."
              value={professionSearch}
              onChange={(e) => setProfessionSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            />
          </div>
          
          {/* Selected Tags */}
          {selectedProfessions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <AnimatePresence>
                {selectedProfessions.map((profession) => (
                  <TagChip
                    key={profession}
                    label={profession}
                    onRemove={() => setSelectedProfessions(selectedProfessions.filter(p => p !== profession))}
                    variant="primary"
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
          
          {/* Checkbox List */}
          <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-0.5">
            {filteredProfessions.map((profession) => (
              <CheckboxItem
                key={profession}
                label={profession}
                checked={selectedProfessions.includes(profession)}
                onChange={(checked) => handleProfessionToggle(profession, checked)}
              />
            ))}
            {filteredProfessions.length === 0 && (
              <p className="text-sm text-gray-500 py-2 text-center">No professions found</p>
            )}
          </div>
        </FilterSection>

        {/* Languages Filter */}
        <FilterSection
          title="Languages"
          icon={Languages}
          isOpen={isLanguagesOpen}
          onToggle={() => setIsLanguagesOpen(!isLanguagesOpen)}
          badge={selectedLanguages.length}
        >
          {/* Search within languages */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search languages..."
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
            />
          </div>
          
          {/* Selected Tags */}
          {selectedLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <AnimatePresence>
                {selectedLanguages.map((language) => (
                  <TagChip
                    key={language}
                    label={language}
                    onRemove={() => setSelectedLanguages(selectedLanguages.filter(l => l !== language))}
                    variant="secondary"
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
          
          {/* Language Match Mode */}
          {selectedLanguages.length > 1 && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Match Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguageMode('OR')}
                  className={`
                    flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${languageMode === 'OR' 
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  Any (OR)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguageMode('AND')}
                  className={`
                    flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${languageMode === 'AND' 
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  All (AND)
                </button>
              </div>
            </div>
          )}
          
          {/* Checkbox List */}
          <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-0.5">
            {filteredLanguages.map((language) => (
              <CheckboxItem
                key={language}
                label={language}
                checked={selectedLanguages.includes(language)}
                onChange={(checked) => handleLanguageToggle(language, checked)}
              />
            ))}
            {filteredLanguages.length === 0 && (
              <p className="text-sm text-gray-500 py-2 text-center">No languages found</p>
            )}
          </div>
        </FilterSection>
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-accent-indigo/10 rounded-2xl border border-primary-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Find the right match</p>
            <p className="text-xs text-gray-600 mt-1">Use filters to narrow down your search and find therapists that match your needs.</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default Sidebar
