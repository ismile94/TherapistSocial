// ============================================
// Date & Time Helpers
// ============================================

/**
 * Parse a date string to Date object
 */
export const parseDate = (d?: string): Date | null => {
  if (!d) return null
  const t = d.toLowerCase()
  if (t === 'present') return new Date()
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? null : dt
}

/**
 * Sort experiences by date (current first, then by end date, then by duration)
 */
export const getSortedExperiences = (items: any[]) => {
  return [...(items || [])].sort((a, b) => {
    const aIsCurrent = (a.end_date || '').toLowerCase() === 'present'
    const bIsCurrent = (b.end_date || '').toLowerCase() === 'present'
    const aStart = parseDate(a.start_date)
    const bStart = parseDate(b.start_date)
    const aEnd = parseDate(a.end_date) || (aIsCurrent ? new Date() : null)
    const bEnd = parseDate(b.end_date) || (bIsCurrent ? new Date() : null)

    if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1
    if (!aIsCurrent && aEnd && bEnd && aEnd.getTime() !== bEnd.getTime()) {
      return bEnd.getTime() - aEnd.getTime()
    }
    const aDur = aStart && aEnd ? (aEnd.getTime() - aStart.getTime()) : 0
    const bDur = bStart && bEnd ? (bEnd.getTime() - bStart.getTime()) : 0
    if (aDur !== bDur) return bDur - aDur
    return 0
  })
}

/**
 * Calculate total experience from work history
 */
export function calculateTotalExperience(workExperience: any[]): string {
  if (!workExperience || workExperience.length === 0) return '0'

  let totalYears = 0
  let totalMonths = 0
  let totalDays = 0

  workExperience.forEach((exp: any) => {
    let startDate: Date | null = null
    let endDate: Date | null = null

    if (exp.start_date) {
      const [year, month, day] = exp.start_date.split('-').map(Number)
      startDate = new Date(year, month - 1, day || 1)
    }

    if (exp.end_date?.toLowerCase() === 'present') {
      endDate = new Date()
    } else if (exp.end_date) {
      const [year, month, day] = exp.end_date.split('-').map(Number)
      endDate = new Date(year, month - 1, day || 1)
    }

    if (startDate && endDate) {
      let years = endDate.getFullYear() - startDate.getFullYear()
      let months = endDate.getMonth() - startDate.getMonth()
      let days = endDate.getDate() - startDate.getDate()

      if (days < 0) {
        months--
        const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0)
        days += prevMonth.getDate()
      }

      if (months < 0) {
        years--
        months += 12
      }

      totalYears += years
      totalMonths += months
      totalDays += days
    }
  })

  if (totalDays >= 30) {
    totalMonths += Math.floor(totalDays / 30)
    totalDays = totalDays % 30
  }

  if (totalMonths >= 12) {
    totalYears += Math.floor(totalMonths / 12)
    totalMonths = totalMonths % 12
  }

  if (totalYears === 0) {
    return totalMonths > 0 ? `${totalMonths}m` : `${totalDays}d`
  }

  if (totalYears < 3) {
    return totalMonths > 0 ? `${totalYears}y ${totalMonths}m` : `${totalYears}y`
  }

  if (totalYears >= 3) {
    if (totalMonths < 4) {
      return `${totalYears}+ years`
    }
    if (totalMonths >= 4 && totalMonths <= 5) {
      return `approximately ${totalYears}.5 years`
    }
    if (totalMonths > 5 && totalMonths <= 8) {
      return `${totalYears}.5+ years`
    }
    if (totalMonths > 8) {
      return `approximately ${totalYears + 1} years`
    }
  }

  return `${totalYears}y`
}

// ============================================
// String Helpers
// ============================================

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`
  
  return date.toLocaleDateString()
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ============================================
// Array Helpers
// ============================================

/**
 * Remove duplicates from array
 */
export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Group array by key
 */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const groupKey = String(item[key])
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

