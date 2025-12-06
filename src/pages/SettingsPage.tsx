import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import { SettingsSkeleton } from '../components/SkeletonLoaders'
import {
  X, Settings, Lock, Eye, ShieldAlert, Bell, UserX, Monitor,
  Smartphone, LogOut, QrCode, Download, Trash2, CheckCircle
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  avatar_url?: string | null
  profession?: string
  [key: string]: any
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'visibility' | 'privacy' | 'notifications' | 'blocked' | 'sessions'>('account')
  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    profile_visibility: 'public',
    message_permissions: 'network',
    language: 'english',
    timezone: 'Europe/London',
    email_connection_requests: true,
    email_messages: true,
    email_community_posts: false,
    email_post_reactions: false,
    email_comments: false,
    email_mentions: false,
    email_events: true,
    push_messages: true,
    push_connection_activity: false,
    push_post_reactions: true,
    push_comments: true,
    push_mentions: true,
    push_events: true,
    two_factor_enabled: false,
    two_factor_secret: null as string | null,
    activity_status_visible: true,
    search_visible: true,
    profile_view_tracking: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    profile_info_visibility: 'public' as 'public' | 'network' | 'private',
    connection_request_permissions: 'public' as 'public' | 'network' | 'none',
    show_email: 'network' as 'public' | 'network' | 'private',
    show_phone: 'network' as 'public' | 'network' | 'private',
    show_location: 'public' as 'public' | 'network' | 'private',
    show_profession: 'public' as 'public' | 'network' | 'private',
    show_specialties: 'public' as 'public' | 'network' | 'private',
    show_qualifications: 'network' as 'public' | 'network' | 'private',
    show_experience: 'network' as 'public' | 'network' | 'private'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [changePasswordModal, setChangePasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [exportingData, setExportingData] = useState(false)
  const [twoFactorModal, setTwoFactorModal] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorQR, setTwoFactorQR] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState('')

  const sections = [
    { id: 'account', name: 'Account preferences', icon: Settings },
    { id: 'security', name: 'Sign in & security', icon: Lock },
    { id: 'visibility', name: 'Visibility', icon: Eye },
    { id: 'privacy', name: 'Data privacy', icon: ShieldAlert },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'blocked', name: 'Blocked users', icon: UserX },
    { id: 'sessions', name: 'Active sessions', icon: Monitor }
  ]

  const handleClose = () => {
    navigate('/community')
  }

  useEffect(() => {
    initializeUser()
    loadSettings()
    loadUserProfile()
  }, [])

  useEffect(() => {
    if (activeSection === 'blocked') {
      loadBlockedUsers()
    }
    if (activeSection === 'sessions') {
      loadSessions()
    }
  }, [activeSection])

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    if (!user) {
      navigate('/auth')
    }
  }

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        setUserProfile(data)
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        alert('Error uploading image: ' + uploadError.message)
        setUploadingAvatar(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        alert('Error updating profile. Please try again.')
      } else {
        setUserProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message: 'Profile picture updated successfully!', type: 'success' }
        }))
        window.location.reload()
      }
    } catch (err) {
      console.error('Error uploading avatar:', err)
      alert('Error uploading image. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!currentUser || !confirm('Are you sure you want to remove your profile picture?')) return

    setUploadingAvatar(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', currentUser.id)

      if (error) {
        console.error('Error removing avatar:', error)
        alert('Error removing profile picture. Please try again.')
      } else {
        setUserProfile(prev => prev ? { ...prev, avatar_url: null } : null)
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message: 'Profile picture removed successfully!', type: 'success' }
        }))
        window.location.reload()
      }
    } catch (err) {
      console.error('Error removing avatar:', err)
      alert('Error removing profile picture. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const loadSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setSettings({
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? true,
          profile_visibility: data.profile_visibility || 'public',
          message_permissions: data.message_permissions || 'network',
          language: data.language || 'english',
          timezone: data.timezone || 'Europe/London',
          email_connection_requests: data.email_connection_requests ?? true,
          email_messages: data.email_messages ?? true,
          email_community_posts: data.email_community_posts ?? false,
          email_post_reactions: data.email_post_reactions ?? false,
          email_comments: data.email_comments ?? false,
          email_mentions: data.email_mentions ?? false,
          email_events: data.email_events ?? true,
          push_messages: data.push_messages ?? true,
          push_connection_activity: data.push_connection_activity ?? false,
          push_post_reactions: data.push_post_reactions ?? true,
          push_comments: data.push_comments ?? true,
          push_mentions: data.push_mentions ?? true,
          push_events: data.push_events ?? true,
          two_factor_enabled: data.two_factor_enabled ?? false,
          two_factor_secret: data.two_factor_secret || null,
          activity_status_visible: data.activity_status_visible ?? true,
          search_visible: data.search_visible ?? true,
          profile_view_tracking: data.profile_view_tracking ?? true,
          quiet_hours_enabled: data.quiet_hours_enabled ?? false,
          quiet_hours_start: data.quiet_hours_start || '22:00',
          quiet_hours_end: data.quiet_hours_end || '08:00',
          profile_info_visibility: data.profile_info_visibility || 'public',
          connection_request_permissions: data.connection_request_permissions || 'public',
          show_email: data.show_email || 'network',
          show_phone: data.show_phone || 'network',
          show_location: data.show_location || 'public',
          show_profession: data.show_profession || 'public',
          show_specialties: data.show_specialties || 'public',
          show_qualifications: data.show_qualifications || 'network',
          show_experience: data.show_experience || 'network'
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (updates: Partial<typeof settings>) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setSaving(false)
      return
    }

    try {
      const newSettings = { ...settings, ...updates }
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Error saving settings:', error)
        alert('Error saving settings. Please try again.')
      } else {
        setSettings(newSettings)
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message: 'Settings saved successfully!', type: 'success' }
        }))
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Error saving settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setChangePasswordModal(true)
    setPasswordForm({ current: '', new: '', confirm: '' })
    setPasswordError('')
  }

  const handleChangePasswordSubmit = async () => {
    setPasswordError('')
    
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setPasswordError('All fields are required')
      return
    }

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordForm.new.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      })

      if (error) {
        setPasswordError(error.message || 'Failed to change password')
        return
      }

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Password changed successfully!', type: 'success' }
      }))
      setChangePasswordModal(false)
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password')
    }
  }

  const loadBlockedUsers = async () => {
    setLoadingBlocked(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoadingBlocked(false)
      return
    }

    try {
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', user.id)
        .single()

      const blockedIds = settingsData?.blocked_users || []
      
      if (blockedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', blockedIds)

        if (profiles) {
          setBlockedUsers(profiles as Profile[])
        } else {
          setBlockedUsers([])
        }
      } else {
        setBlockedUsers([])
      }
    } catch (err) {
      console.error('Error loading blocked users:', err)
    } finally {
      setLoadingBlocked(false)
    }
  }

  const handleUnblockUser = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('blocked_users')
        .eq('id', user.id)
        .single()

      const currentBlocked = currentSettings?.blocked_users || []
      const updatedBlocked = currentBlocked.filter((id: string) => id !== userId)

      await supabase
        .from('user_settings')
        .upsert({
          id: user.id,
          blocked_users: updatedBlocked,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      await loadBlockedUsers()
      
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'User unblocked successfully', type: 'success' }
      }))
    } catch (err) {
      console.error('Error unblocking user:', err)
      alert('Error unblocking user')
    }
  }

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const currentSession = {
          id: session.access_token.substring(0, 8),
          device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          browser: getBrowserName(),
          location: 'Unknown',
          last_active: new Date(session.expires_at! * 1000).toISOString(),
          current: true,
          ip: 'Unknown'
        }
        setSessions([currentSession])
      }
    } catch (err) {
      console.error('Error loading sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  const getBrowserName = (): string => {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to sign out of this device?')) return

    try {
      if (sessions.find(s => s.id === sessionId && s.current)) {
        await supabase.auth.signOut()
        window.location.reload()
      } else {
        setSessions(sessions.filter(s => s.id !== sessionId))
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message: 'Session terminated', type: 'success' }
        }))
      }
    } catch (err) {
      console.error('Error terminating session:', err)
      alert('Error terminating session')
    }
  }

  const handleExportData = async () => {
    if (!confirm('This will download all your account data. Continue?')) return

    setExportingData(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setExportingData(false)
      return
    }

    try {
      const exportData: any = {
        export_date: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      exportData.profile = profile

      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
      exportData.posts = posts || []

      const { data: comments } = await supabase
        .from('post_comments')
        .select('*')
        .eq('user_id', user.id)
      exportData.comments = comments || []

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*, messages(*)')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      exportData.conversations = conversations || []

      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      exportData.connections = connections || []

      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single()
      exportData.settings = userSettings

      const jsonStr = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `therapist-finder-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Data exported successfully!', type: 'success' }
      }))
    } catch (err) {
      console.error('Error exporting data:', err)
      alert('Error exporting data. Please try again.')
    } finally {
      setExportingData(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.from('user_settings').delete().eq('id', user.id)
      
      alert('Account deleted successfully. You will be signed out.')
      handleClose()
      await supabase.auth.signOut()
      window.location.reload()
    } catch (err) {
      console.error('Error deleting account:', err)
      alert('Error deleting account. Please contact support.')
    }
  }

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'turkish', label: 'Turkish' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' }
  ]

  const timezones = [
    { value: 'Europe/London', label: '(GMT+00:00) London' },
    { value: 'Europe/Istanbul', label: '(GMT+03:00) Istanbul' },
    { value: 'America/New_York', label: '(GMT-05:00) New York' },
    { value: 'Europe/Paris', label: '(GMT+01:00) Paris' },
    { value: 'Asia/Dubai', label: '(GMT+04:00) Dubai' }
  ]

  if (loading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-6xl h-[90vh] sm:h-[80vh] overflow-hidden flex flex-col sm:flex-row relative">
        {/* Close Button */}
        <button 
          onClick={handleClose} 
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 sm:p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mobile Section Selector */}
        <div className="sm:hidden bg-gray-50 border-b p-3">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as any)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sidebar - Desktop Only */}
        <div className="hidden sm:block w-56 md:w-64 bg-gray-50 border-r h-full overflow-y-auto flex-shrink-0">
          <nav className="p-4 md:p-6 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {section.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-8">
          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Account Preferences</h3>
              <div className="space-y-4">
                {/* Profile Picture */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Profile Picture</h4>
                  <div className="flex items-center gap-6">
                    <Avatar src={userProfile?.avatar_url} name={userProfile?.full_name} size={96} className="border-2 border-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors inline-block">
                          {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                            className="hidden"
                          />
                        </label>
                        {userProfile?.avatar_url && (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={uploadingAvatar}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Max size: 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Language & Region */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Language & Region</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <select 
                        className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2"
                        value={settings.language}
                        onChange={(e) => saveSettings({ language: e.target.value })}
                        disabled={saving}
                      >
                        {languages.map(lang => (
                          <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                      <select 
                        className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2"
                        value={settings.timezone}
                        onChange={(e) => saveSettings({ timezone: e.target.value })}
                        disabled={saving}
                      >
                        {timezones.map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Sign In & Security</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Password</h4>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    onClick={handleChangePassword}
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Visibility Section */}
          {activeSection === 'visibility' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Visibility</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Profile Visibility</h4>
                  <div className="space-y-3">
                    {['public', 'network', 'private'].map((value) => (
                      <label key={value} className="flex items-center">
                        <input 
                          type="radio" 
                          name="visibility" 
                          className="mr-2" 
                          checked={settings.profile_visibility === value}
                          onChange={() => saveSettings({ profile_visibility: value })}
                          disabled={saving}
                        />
                        <span className="text-sm text-gray-700 capitalize">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Data Privacy</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Export Your Data</h4>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    onClick={handleExportData}
                    disabled={exportingData}
                  >
                    <Download className="w-4 h-4" />
                    {exportingData ? 'Exporting...' : 'Export Data'}
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Delete Account</h4>
                  <button 
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Email Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Email notifications</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.email_notifications}
                        onChange={(e) => saveSettings({ email_notifications: e.target.checked })}
                        disabled={saving}
                      />
                    </label>
                    <label className="flex items-center justify-between w-full max-w-md">
                      <span className="text-sm text-gray-700">Push notifications</span>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={settings.push_notifications}
                        onChange={(e) => saveSettings({ push_notifications: e.target.checked })}
                        disabled={saving}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blocked Users Section */}
          {activeSection === 'blocked' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Blocked Users</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {loadingBlocked ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No blocked users</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatar_url} name={user.full_name} size={40} />
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            {user.profession && <p className="text-sm text-gray-500">{user.profession}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblockUser(user.id)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sessions Section */}
          {activeSection === 'sessions' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Active Sessions</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {loadingSessions ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No active sessions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          {session.device === 'Mobile' ? (
                            <Smartphone className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Monitor className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{session.browser} on {session.device}</p>
                              {session.current && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Current</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">Last active: {new Date(session.last_active).toLocaleString()}</p>
                          </div>
                        </div>
                        {!session.current && (
                          <button
                            onClick={() => handleTerminateSession(session.id)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Change Password Modal */}
        {changePasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
                <button onClick={() => setChangePasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  />
                </div>
                {passwordError && <div className="text-red-600 text-sm">{passwordError}</div>}
                <div className="flex gap-2">
                  <button
                    onClick={handleChangePasswordSubmit}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => setChangePasswordModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saving Indicator */}
        {saving && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Saving...
          </div>
        )}
      </div>
    </div>
  )
}
