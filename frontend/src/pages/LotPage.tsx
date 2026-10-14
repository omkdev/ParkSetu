import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { api, errorMessage, money, toISO } from '../lib/api'
import { useAuth } from '../auth/auth-context'
import { vehicleLabel, type LotDetail, type VehicleType } from '../lib/types'

export function LotPage() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [start, setStart] = useState(search.get('start') ?? '')
  const [end, setEnd] = useState(search.get('end') ?? '')
  const [vehicleType, setVehicleType] = useState<VehicleType>('FOUR_WHEELER')
  const [vehicleNumber, setVehicleNumber] = useState('')

  const valid = !!start && !!end && new Date(end) > new Date(start)

  const { data: lot, isLoading, error } = useQuery({
    queryKey: ['lot', id, valid ? [start, end] : null],
    queryFn: async () =>
      (
        await api.get<{ data: LotDetail }>(`/lots/${id}`, {
          params: valid ? { start: toISO(start), end: toISO(end) } : undefined,
        })
      ).data.data,
  })

  const book = useMutation({
    mutationFn: async () =>
      api.post('/bookings', {
        lotId: id,
        vehicleType,
        vehicleNumber,
        startTime: toISO(start),
        endTime: toISO(end),
      }),
    onSuccess: () => navigate('/bookings'),
  })

  if (isLoading) return <p className="text-slate-500">Loading…</p>
  if (error || !lot) return <p className="text-red-600">Parking lot not found.</p>

  const rate = vehicleType === 'TWO_WHEELER' ? lot.twoWheelerRate : lot.fourWheelerRate
  const hours = valid ? Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000)) : 0

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!user) return navigate('/login', { state: { from: `/lots/${id}` } })
    book.mutate()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="card">
          <h1 className="text-2xl font-bold">{lot.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-slate-500">
            <MapPin className="h-4 w-4" /> {lot.address}, {lot.city}
          </p>
          {lot.description && <p className="mt-3 text-slate-700">{lot.description}</p>}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Slots {valid ? 'for your time window' : ''}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {lot.slots.map((s) => {
              const free = s.available !== false
              return (
                <div
                  key={s.id}
                  title={vehicleLabel[s.vehicleType]}
                  className={`rounded-lg border px-2 py-2 text-center text-xs font-medium ${
                    free ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-400 line-through'
                  }`}
                >
                  {s.label}
                </div>
              )
            })}
          </div>
          {!valid && <p className="mt-3 text-xs text-slate-500">Pick a time window to see live availability.</p>}
        </div>
      </div>

      <form onSubmit={submit} className="card h-fit space-y-3">
        <h2 className="font-semibold">Book a slot</h2>
        <select className="input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
          <option value="TWO_WHEELER">Two-wheeler · {money(lot.twoWheelerRate)}/hr</option>
          <option value="FOUR_WHEELER">Four-wheeler · {money(lot.fourWheelerRate)}/hr</option>
        </select>
        <input className="input" placeholder="Vehicle number (e.g. MH12AB1234)" required value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
        <label className="block text-xs text-slate-500">
          From
          <input className="input mt-1" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="block text-xs text-slate-500">
          Until
          <input className="input mt-1" type="datetime-local" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        {valid && (
          <p className="rounded bg-blue-50 p-2 text-sm text-blue-800">
            {hours} hr × {money(rate)} = <strong>{money(hours * rate)}</strong>
          </p>
        )}
        {book.error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{errorMessage(book.error)}</p>}
        <button className="btn w-full" disabled={!valid || book.isPending}>
          {book.isPending ? 'Booking…' : user ? 'Confirm booking' : 'Log in to book'}
        </button>
      </form>
    </div>
  )
}
