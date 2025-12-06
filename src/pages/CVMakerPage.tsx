import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { X, Printer, Download, Info } from 'lucide-react'

interface Profile {
  id: string
  full_name?: string
  profession?: string
  city?: string
  county?: string
  contact_email?: string
  phone?: string
  website?: string
  about_me?: string
  clinical_areas?: string[]
  languages?: string[]
  qualifications?: any[]
  work_experience?: any[]
  [key: string]: any
}

export default function CVMakerPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [cvStyle, setCvStyle] = useState<'modern' | 'professional' | 'creative'>('modern')
  const [selectedSections, setSelectedSections] = useState({
    personal: true,
    phone: false,
    summary: true,
    experience: true,
    qualifications: true,
    specialties: true,
    languages: true,
    additional: true
  })

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/auth')
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setUserProfile(data)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleClose = () => {
    navigate('/community')
  }

  const toggleSection = (section: string) => {
    setSelectedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }))
  }

  const calculateTotalExperience = (experiences: any[]) => {
    if (!experiences || experiences.length === 0) return 'N/A'
    
    let totalMonths = 0
    experiences.forEach(exp => {
      if (exp.start_date) {
        const start = new Date(exp.start_date)
        const end = exp.end_date?.toLowerCase() === 'present' ? new Date() : new Date(exp.end_date)
        
        if (!isNaN(start.getTime())) {
          const diffTime = Math.abs(end.getTime() - start.getTime())
          const months = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44))
          totalMonths += months
        }
      }
    })
    
    const years = Math.floor(totalMonths / 12)
    const months = totalMonths % 12
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`.trim()
    } else {
      return `${months} month${months > 1 ? 's' : ''}`
    }
  }

  const formatParagraphs = (text: string) => {
    if (!text) return ''
    return text.split('\n').filter(para => para.trim()).map(para => 
      `<p style="margin-bottom: 0.4rem;">${para.trim()}</p>`
    ).join('')
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: 'long' 
      })
    } catch {
      return dateString
    }
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    if (!startDate) return ''
    
    const start = new Date(startDate)
    const end = endDate?.toLowerCase() === 'present' ? new Date() : new Date(endDate)
    
    if (isNaN(start.getTime())) return ''
    
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25))
    const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
    
    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? 's' : ''} ${diffMonths > 0 ? `${diffMonths} month${diffMonths > 1 ? 's' : ''}` : ''}`.trim()
    } else {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
    }
  }

  const getCVStyles = (style: string) => {
    const baseStyles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', 'Roboto', sans-serif; line-height: 1.5; color: #333; }
      .cv-container { max-width: 800px; margin: 0 auto; padding: 2rem; background: white; }
      .cv-header { text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #e5e7eb; }
      .name { font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 0.25rem; }
      .title { font-size: 1.2rem; color: #6b7280; margin-bottom: 0.75rem; }
      .contact-info { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; font-size: 0.9rem; color: #4b5563; }
      .contact-item { display: flex; align-items: center; gap: 0.25rem; }
      .cv-main { display: grid; gap: 1.25rem; }
      .cv-section { margin-bottom: 0.75rem; }
      .section-title { font-size: 1.1rem; font-weight: 600; color: #1f2937; padding-bottom: 0.3rem; margin-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb; }
      .section-content { padding-left: 0.25rem; }
      .summary-text { color: #4b5563; line-height: 1.6; }
      .summary-text p { margin-bottom: 0.5rem; }
      .experience-item, .qualification-item { margin-bottom: 0.75rem; padding: 0.5rem; background: #f9fafb; border-radius: 0.375rem; }
      .job-title { font-weight: 600; color: #1f2937; }
      .job-company { color: #4b5563; font-size: 0.95rem; }
      .job-duration { font-size: 0.85rem; color: #9ca3af; }
      .job-description { margin-top: 0.5rem; color: #4b5563; font-size: 0.9rem; }
      .job-description p { margin-bottom: 0.4rem; }
      .skills-container { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .skill-tag { padding: 0.25rem 0.75rem; background: #e5e7eb; border-radius: 9999px; font-size: 0.85rem; color: #374151; }
      .languages-container { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .language-item { padding: 0.25rem 0.75rem; background: #e5e7eb; border-radius: 9999px; font-size: 0.85rem; color: #374151; }
    `
    
    if (style === 'modern') {
      return baseStyles + `
        .cv-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; margin: -2rem -2rem 1.5rem -2rem; text-align: center; }
        .name { color: white; }
        .title { color: rgba(255,255,255,0.9); }
        .contact-info { color: rgba(255,255,255,0.85); }
        .section-title { color: #667eea; border-color: #667eea; }
        .skill-tag, .language-item { background: #667eea; color: white; }
        .experience-item, .qualification-item { background: #f3f4f6; border-left: 3px solid #667eea; }
      `
    } else if (style === 'professional') {
      return baseStyles + `
        .cv-header { border-bottom: 3px solid #1f2937; }
        .section-title { text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.95rem; }
        .skill-tag, .language-item { background: #1f2937; color: white; }
        .experience-item, .qualification-item { border-left: 2px solid #1f2937; }
      `
    } else {
      return baseStyles + `
        .cv-header { background: #f0fdf4; padding: 2rem; margin: -2rem -2rem 1.5rem -2rem; border-radius: 0 0 1rem 1rem; }
        .name { color: #166534; }
        .section-title { color: #166534; border-color: #86efac; }
        .skill-tag, .language-item { background: #dcfce7; color: #166534; }
        .experience-item, .qualification-item { background: #f0fdf4; }
      `
    }
  }

  const getPrintStyles = () => `
    @media print {
      @page { margin: 15mm; size: A4; }
      body::before, body::after { display: none !important; content: none !important; }
      body { margin: 0; padding: 0; background: white !important; font-size: 10pt; line-height: 1.35; }
      .cv-container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
      .cv-section { break-inside: auto; margin-bottom: 0.8rem; }
      .experience-item, .qualification-item { break-inside: avoid; margin-bottom: 0.5rem; }
    }
  `

  const generateCVContent = () => {
    if (!userProfile) return ''
    
    let content = ''
    
    if (selectedSections.personal) {
      content += `
        <header class="cv-header">
          <h1 class="name">${userProfile.full_name || 'Professional Therapist'}</h1>
          <h2 class="title">${userProfile.profession || 'Therapist'}</h2>
          <div class="contact-info">
            ${userProfile.contact_email ? `<div class="contact-item">✉️ ${userProfile.contact_email}</div>` : ''}
            ${selectedSections.phone && userProfile.phone ? `<div class="contact-item">📞 ${userProfile.phone}</div>` : ''}
            ${userProfile.city ? `<div class="contact-item">📍 ${userProfile.city}, ${userProfile.county}</div>` : ''}
            ${userProfile.website ? `<div class="contact-item">🌐 ${userProfile.website}</div>` : ''}
          </div>
        </header>
      `
    }

    content += `<main class="cv-main">`

    if (selectedSections.summary && userProfile.about_me) {
      content += `
        <section class="cv-section">
          <h3 class="section-title">Professional Summary</h3>
          <div class="section-content summary-text">${formatParagraphs(userProfile.about_me)}</div>
        </section>
      `
    }

    if (selectedSections.experience && userProfile.work_experience?.length > 0) {
      content += `
        <section class="cv-section">
          <h3 class="section-title">Professional Experience (${calculateTotalExperience(userProfile.work_experience)})</h3>
          <div class="section-content">
            ${userProfile.work_experience.map(exp => `
              <div class="experience-item">
                <div class="job-title">${exp.position || 'Position'}</div>
                <div class="job-company">${exp.company || 'Company'}</div>
                <div class="job-duration">${formatDate(exp.start_date)} - ${exp.end_date?.toLowerCase() === 'present' ? 'Present' : formatDate(exp.end_date)} (${calculateDuration(exp.start_date, exp.end_date)})</div>
                ${exp.description ? `<div class="job-description">${formatParagraphs(exp.description)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      `
    }

    if (selectedSections.qualifications && userProfile.qualifications?.length > 0) {
      content += `
        <section class="cv-section">
          <h3 class="section-title">Qualifications & Education</h3>
          <div class="section-content">
            ${userProfile.qualifications.map(qual => `
              <div class="qualification-item">
                <div class="job-title">${qual.title || qual.degree || 'Qualification'}</div>
                <div class="job-company">${qual.institution || ''}</div>
                ${qual.year ? `<div class="job-duration">${qual.year}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      `
    }

    if (selectedSections.specialties && userProfile.clinical_areas?.length > 0) {
      content += `
        <section class="cv-section">
          <h3 class="section-title">Clinical Specialties</h3>
          <div class="section-content skills-container">
            ${userProfile.clinical_areas.map(area => `<span class="skill-tag">${area}</span>`).join('')}
          </div>
        </section>
      `
    }

    if (selectedSections.languages && userProfile.languages?.length > 0) {
      content += `
        <section class="cv-section">
          <h3 class="section-title">Languages</h3>
          <div class="section-content languages-container">
            ${userProfile.languages.map(lang => `<span class="language-item">${lang}</span>`).join('')}
          </div>
        </section>
      `
    }

    content += `</main>`
    return content
  }

  const printCV = async () => {
    if (!userProfile) return
    setLoading(true)
    
    try {
      const cvContent = generateCVContent()
      const printWindow = window.open('', '_blank')
      
      if (printWindow) {
        const fullName = (userProfile.full_name || 'Professional').trim()
        const now = new Date()
        const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`
        const fileBase = `${fullName} CV - ${dateStr}`
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileBase}</title>
              <meta charset="UTF-8">
              <style>
                ${getCVStyles(cvStyle)}
                ${getPrintStyles()}
              </style>
            </head>
            <body>
              <div class="cv-container">${cvContent}</div>
              <script>
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => window.close(), 500);
                  }, 250);
                }
              <\/script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('Error generating CV:', error)
      alert('Error generating CV')
    }
    setLoading(false)
  }

  const downloadPDF = async () => {
    if (!userProfile) return
    setLoading(true)
    
    try {
      const ensureHtml2Pdf = () => new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) return resolve()
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load html2pdf.js'))
        document.body.appendChild(script)
      })

      await ensureHtml2Pdf()

      const wrapper = document.createElement('div')
      wrapper.innerHTML = `
        <style>${getCVStyles(cvStyle)}</style>
        <div class="cv-container">${generateCVContent()}</div>
      `

      const fullName = (userProfile.full_name || 'Professional').trim()
      const now = new Date()
      const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`
      const fileBase = `${fullName} CV - ${dateStr}`

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${fileBase}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await (window as any).html2pdf().set(opt).from(wrapper).save()
    } catch (err) {
      console.error('PDF export error:', err)
      alert('Failed to export PDF')
    }
    setLoading(false)
  }

  if (loadingProfile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-600 mb-4">Please complete your profile first</p>
          <button onClick={handleClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">CV Maker</h2>
            <p className="text-sm text-gray-500">Create a professional CV from your profile</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Style Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Choose Style</h3>
            <div className="flex flex-wrap gap-3">
              {(['modern', 'professional', 'creative'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setCvStyle(style)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize ${
                    cvStyle === style
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Section Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Select Sections</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(selectedSections).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleSection(key)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{key.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-gray-50 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
            <div 
              className="bg-white border rounded-lg p-4 shadow-sm max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: `<style>${getCVStyles(cvStyle)}</style>${generateCVContent()}` }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={printCV}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-gray-700 border-t-transparent rounded-full"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  Print
                </>
              )}
            </button>
            <button
              onClick={downloadPDF}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download PDF
                </>
              )}
            </button>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Pro Tip
            </h4>
            <p className="text-sm text-blue-700">
              For best results when printing:<br/>
              1. Choose "A4" paper size<br/>
              2. In "More settings" <strong>disable "Headers and footers"</strong><br/>
              3. Click "Save as PDF" for a clean, professional look
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
