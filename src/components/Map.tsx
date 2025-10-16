import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabaseClient'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

interface Filters {
  professions: string[]
  languages: string[]
  languageMode: 'OR' | 'AND'
}

interface MapProps {
  filters: Filters
}

interface Profile {
  id: string
  full_name: string
  profession: string
  languages: string[]
  specialties: string[]
  city: string
  county: string
}

function Map({ filters }: MapProps) {
  const [therapists, setTherapists] = useState<Profile[]>([])

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) console.error(error)
    else setTherapists(data || [])
  }

  const filtered = therapists.filter(t => {
    const prof = filters.professions.length === 0 || filters.professions.includes(t.profession)
    const lang =
      filters.languages.length === 0 ||
      (filters.languageMode === 'OR'
        ? filters.languages.some(l => t.languages?.includes(l))
        : filters.languages.every(l => t.languages?.includes(l)))
    return prof && lang
  })

  return (
    <div className="h-full">
      <MapContainer center={[54.5, -2]} zoom={6} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {filtered.map(t => (
          <Marker key={t.id} position={[54.5, -2]}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-lg">{t.full_name}</h3>
                <p className="text-blue-600 font-medium">{t.profession}</p>
                <p className="text-sm text-gray-600">
                  <strong>Languages:</strong> {t.languages?.join(', ') || '-'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Specialties:</strong> {t.specialties?.join(', ') || '-'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Location:</strong> {t.city}, {t.county}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default Map
