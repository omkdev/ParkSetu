import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Search } from 'lucide-react'
import { api, money, toISO } from '../lib/api'
import type { Lot, VehicleType } from '../lib/types'

export function HomePage() {
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const hasWindow = !!start && !!end && new Date(end) > new Date(start)
  const params = {
    q: q || undefined,
    city: city || undefined,
    vehicleType: vehicleType || undefined,
    start: hasWindow ? toISO(start) : undefined,
    end: hasWindow ? toISO(end) : undefined,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['lots', params],
    queryFn: async () => (await api.get<{ data: Lot[] }>('/lots', { params })).data.data,
  })

  const windowQuery = hasWindow ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find a parking spot</h1>
        <p className="text-slate-600">Search nearby lots and book a slot in seconds.</p>
      </div>

      <div className="card grid gap-3 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name or address" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <select className="input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType | '')}>
          <option value="">Any vehicle</option>
          <option value="TWO_WHEELER">Two-wheeler</option>
          <option value="FOUR_WHEELER">Four-wheeler</option>
        </select>
        <div />
        <label className="text-xs text-slate-500">
          From
          <input className="input mt-1" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="text-xs text-slate-500">
          Until
          <input className="input mt-1" type="datetime-local" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      {isLoading && <p className="text-slate-500">Loading parking lots…</p>}
      {error && <p className="text-red-600">Could not load parking lots.</p>}
      {data?.length === 0 && <p className="text-slate-500">No parking lots match your search.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((lot) => (
          <Link key={lot.id} to={`/lots/${lot.id}${windowQuery}`} className="card transition hover:border-blue-400 hover:shadow-md">
            <h2 className="font-semibold">{lot.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-4 w-4" /> {lot.address}, {lot.city}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Two-wheeler</dt>
                <dd className="font-medium">{money(lot.twoWheelerRate)}/hr</dd>
                <dd className="text-xs text-emerald-600">{lot.availableSlots?.TWO_WHEELER} free</dd>
              </div>
              <div>
                <dt className="text-slate-500">Four-wheeler</dt>
                <dd className="font-medium">{money(lot.fourWheelerRate)}/hr</dd>
                <dd className="text-xs text-emerald-600">{lot.availableSlots?.FOUR_WHEELER} free</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </div>
  )
}
