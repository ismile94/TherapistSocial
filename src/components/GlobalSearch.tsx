import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'

export type SearchResultType = 'person' | 'post'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle: string
  avatar?: string
  highlighted?: boolean
  user_id?: string
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function highlight(text: string, query: string) {
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i === -1) return text
  return (
    <>
      {text.slice(0, i)}
      <span className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  )
}

export function GlobalSearch({
  onSelectPerson,
  onSelectPost,
  isConnected,
  className = '',
}: {
  onSelectPerson: (profileId: string) => void
  onSelectPost: (postId: string) => void
  isConnected?: (profileId: string) => boolean
  className?: string
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [people, setPeople] = useState<SearchResult[]>([])
  const [posts, setPosts] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const debounced = useDebouncedValue(query, 300)

  // recent searches
  const recentKey = 'global_recent_searches'
  const recents = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(recentKey) || '[]') as string[] } catch { return [] }
  }, [])
  const saveRecent = useCallback((q: string) => {
    if (!q.trim()) return
    const prev = (() => { try { return JSON.parse(localStorage.getItem(recentKey) || '[]') as string[] } catch { return [] } })()
    const next = [q, ...prev.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 5)
    localStorage.setItem(recentKey, JSON.stringify(next))
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    async function run() {
      if (!debounced.trim()) { setPeople([]); setPosts([]); setLoading(false); return }
      setLoading(true)
      const q = debounced.trim()
      try {
        // People
        const { data: peopleData } = await supabase
          .from('profiles')
          .select('id, full_name, profession, avatar_url, city, county, specialties')
          .or(`full_name.ilike.%${q}%,profession.ilike.%${q}%`)
          .limit(10)

        const peopleResults: SearchResult[] = (peopleData || []).map((p: any) => ({
          type: 'person',
          id: p.id,
          title: p.full_name || 'Unnamed',
          subtitle: p.profession || p.city || '',
          avatar: p.avatar_url || undefined,
          highlighted: isConnected ? !!isConnected(p.id) : false,
          user_id: p.id,
        }))

        // Posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title, content, user_id, created_at')
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
          .order('created_at', { ascending: false })
          .limit(10)

        const postsResults: SearchResult[] = (postsData || []).map((p: any) => ({
          type: 'post',
          id: p.id,
          title: p.title || '(Untitled post)',
          subtitle: (p.content || '').slice(0, 80),
          highlighted: isConnected ? !!isConnected(p.user_id) : false,
          user_id: p.user_id,
        }))

        setPeople(peopleResults)
        setPosts(postsResults)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [debounced, isConnected])

  const flatResults = useMemo(() => [...people, ...posts], [people, posts])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) setOpen(true)
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(flatResults.length - 1, i + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)) }
    if (e.key === 'Enter') {
      const target = flatResults[activeIndex]
      if (!target) return
      if (target.type === 'person') onSelectPerson(target.id)
      if (target.type === 'post') onSelectPost(target.id)
      saveRecent(query)
      setOpen(false)
    }
    if (e.key === 'Escape') setOpen(false)
  }, [flatResults, activeIndex, onSelectPerson, onSelectPost, saveRecent, query, open])

  const onPick = useCallback((r: SearchResult) => {
    if (r.type === 'person') onSelectPerson(r.id)
    if (r.type === 'post') onSelectPost(r.id)
    saveRecent(query)
    setOpen(false)
  }, [onSelectPerson, onSelectPost, saveRecent, query])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <input
          aria-label="Global search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search people or posts..."
          className="w-full rounded-full border px-4 py-2 shadow-sm bg-white focus:outline-none"
        />
        {query && (
          <button className="-ml-10 text-gray-500 hover:text-gray-700" aria-label="Clear" onClick={() => setQuery('')}>✕</button>
        )}
      </div>

      {open && (
        <div className="absolute mt-2 w-full max-w-xl bg-white border rounded-lg shadow-lg z-50">
          {loading ? (
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <>
              {(people.length + posts.length === 0 && !query) && (
                <div className="p-3 text-sm text-gray-500">
                  Recent searches
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recents.map((r, i) => (
                      <button key={i} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => { setQuery(r); setOpen(true) }}>{r}</button>
                    ))}
                  </div>
                </div>
              )}
              {(people.length + posts.length === 0 && query) && (
                <div className="p-4 text-sm text-gray-500">No results found</div>
              )}

              {people.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500">People</div>
                  {people.map((r, idx) => (
                    <div
                      key={r.id}
                      className={`px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${activeIndex === idx ? 'bg-gray-50' : ''}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => onPick(r)}
                    >
                      <Avatar src={r.avatar} name={r.title} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{highlight(r.title, query)}</div>
                        <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>
                      </div>
                      {r.highlighted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Connected</span>}
                    </div>
                  ))}
                </div>
              )}

              {posts.length > 0 && (
                <div className="border-t">
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500">Posts</div>
                  {posts.map((r, i) => {
                    const idx = people.length + i
                    return (
                      <div
                        key={r.id}
                        className={`px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${activeIndex === idx ? 'bg-gray-50' : ''}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => onPick(r)}
                      >
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">📝</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{highlight(r.title, query)}</div>
                          <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>
                        </div>
                        {r.highlighted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Connected</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch


