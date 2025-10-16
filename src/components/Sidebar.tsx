import React, { useState } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface SidebarProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedProfessions: string[]
  setSelectedProfessions: (professions: string[]) => void
  selectedLanguages: string[]
  setSelectedLanguages: (languages: string[]) => void
  languageMode: 'OR' | 'AND'
  setLanguageMode: (mode: 'OR' | 'AND') => void
}

const Sidebar: React.FC<SidebarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedProfessions,
  setSelectedProfessions,
  selectedLanguages,
  setSelectedLanguages,
  languageMode,
  setLanguageMode,
}) => {
  const [isProfessionOpen, setIsProfessionOpen] = useState(false)
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false)

  const professions = [
    'Physiotherapist',
    'Occupational Therapist',
    'Speech & Language Therapist',
    'Dietitian',
    'Podiatrist',
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
  ]

  return (
    <div className="w-80 bg-white shadow-sm border-r p-6 overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Find Therapists</h2>

      {/* 🔍 Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 🧑‍⚕️ Profession Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfessionOpen(!isProfessionOpen)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
          >
            <span className="text-gray-700">
              {selectedProfessions.length === 0
                ? 'All Professions'
                : `${selectedProfessions.length} selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {isProfessionOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {professions.map((profession) => (
                <label
                  key={profession}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProfessions.includes(profession)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProfessions([...selectedProfessions, profession])
                      } else {
                        setSelectedProfessions(
                          selectedProfessions.filter((p) => p !== profession)
                        )
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{profession}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedProfessions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedProfessions.map((profession) => (
              <span
                key={profession}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
              >
                {profession}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedProfessions(selectedProfessions.filter((p) => p !== profession))
                  }
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 🌍 Languages Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLanguagesOpen(!isLanguagesOpen)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
          >
            <span className="text-gray-700">
              {selectedLanguages.length === 0
                ? 'All Languages'
                : `${selectedLanguages.length} selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {isLanguagesOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {languages.map((language) => (
                <label
                  key={language}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(language)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLanguages([...selectedLanguages, language])
                      } else {
                        setSelectedLanguages(
                          selectedLanguages.filter((l) => l !== language)
                        )
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{language}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedLanguages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedLanguages.map((language) => (
              <span
                key={language}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
              >
                {language}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLanguages(selectedLanguages.filter((l) => l !== language))
                  }
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {selectedLanguages.length > 0 && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language Match Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="languageMode"
                  value="OR"
                  checked={languageMode === 'OR'}
                  onChange={() => setLanguageMode('OR')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Any (OR)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="languageMode"
                  value="AND"
                  checked={languageMode === 'AND'}
                  onChange={() => setLanguageMode('AND')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">All (AND)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
