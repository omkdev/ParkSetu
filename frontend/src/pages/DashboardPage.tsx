import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus } from 'lucide-react'
import { api, errorMessage, fmtDate, money } from '../lib/api'
import { vehicleLabel, type Booking, type Lot, type Stats } from '../lib/types'
import { StatusBadge } from './BookingsPage'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

const emptyForm = {
  name: '',
  address: '',
  city: '',
  description: '',
  twoWheelerRate: '10',
  fourWheelerRate: '40',
  twoWheelerSlots: '10',
  fourWheelerSlots: '10',
}

function NewLotForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const create = useMutation({
    mutationFn: () =>
      api.post('/lots', {
        name: form.name,
        address: form.address,
        city: form.city,
        description: form.description || undefined,
        twoWheelerRate: Number(form.twoWheelerRate),
        fourWheelerRate: Number(form.fourWheelerRate),
        twoWheelerSlots: Number(form.twoWheelerSlots),
        fourWheelerSlots: Number(form.fourWheelerSlots),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-lots'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      onDone()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate()
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 md:grid-cols-2">
      <input className="input" placeholder="Lot name" required value={form.name} onChange={set('name')} />
      <input className="input" placeholder="City" required value={form.city} onChange={set('city')} />
      <input className="input md:col-span-2" placeholder="Address" required value={form.address} onChange={set('address')} />
      <input className="input md:col-span-2" placeholder="Description (optional)" value={form.description} onChange={set('description')} />
      <label className="text-xs text-slate-500">
        Two-wheeler rate (₹/hr)
        <input className="input mt-1" type="number" min={0} required value={form.twoWheelerRate} onChange={set('twoWheelerRate')} />
      </label>
      <label className="text-xs text-slate-500">
        Four-wheeler rate (₹/hr)
        <input className="input mt-1" type="number" min={0} required value={form.fourWheelerRate} onChange={set('fourWheelerRate')} />
      </label>
      <label className="text-xs text-slate-500">
        Two-wheeler slots
        <input className="input mt-1" type="number" min={0} max={1000} required value={form.twoWheelerSlots} onChange={set('twoWheelerSlots')} />
      </label>
      <label className="text-xs text-slate-500">
        Four-wheeler slots
        <input className="input mt-1" type="number" min={0} max={1000} required value={form.fourWheelerSlots} onChange={set('fourWheelerSlots')} />
      </label>
      {create.error && <p className="rounded bg-red-50 p-2 text-sm text-red-700 md:col-span-2">{errorMessage(create.error)}</p>}
      <div className="flex gap-2 md:col-span-2">
        <button className="btn" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Create lot'}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function LotBookings({ lotId }: { lotId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['lot-bookings', lotId],
    queryFn: async () => (await api.get<{ data: Booking[] }>(`/bookings/lot/${lotId}`)).data.data,
  })
  if (isLoading) return <p className="text-sm text-slate-500">Loading bookings…</p>
  if (!data?.length) return <p className="text-sm text-slate-500">No bookings yet.</p>
  return (
    <div className="divide-y divide-slate-100 text-sm">
      {data.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <div>
            <p className="font-medium">
              {b.user?.name} · {b.vehicleNumber} <StatusBadge status={b.status} />
            </p>
            <p className="text-slate-500">
              Slot {b.slot?.label} ({vehicleLabel[b.vehicleType]}) · {fmtDate(b.startTime)} → {fmtDate(b.endTime)}
            </p>
          </div>
          <span className="font-semibold">{money(b.totalAmount)}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [openLot, setOpenLot] = useState<string | null>(null)

  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get<{ data: Stats }>('/admin/stats')).data.data,
  })
  const lots = useQuery({
    queryKey: ['my-lots'],
    queryFn: async () => (await api.get<{ data: Lot[] }>('/lots/mine')).data.data,
  })
  const toggle = useMutation({
    mutationFn: (lot: Lot) => api.patch(`/lots/${lot.id}`, { isActive: !lot.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-lots'] }),
  })

  const s = stats.data
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {!adding && (
          <button className="btn" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add parking lot
          </button>
        )}
      </div>

      {adding && <NewLotForm onDone={() => setAdding(false)} />}

      {s && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Parking lots" value={s.lots} />
            <Stat label="Active slots" value={s.slots} />
            <Stat label="Bookings" value={s.bookings} />
            <Stat label="Revenue" value={money(s.revenue)} />
          </div>
          <div className="card">
            <h2 className="mb-3 font-semibold">Bookings, last 14 days</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.daily.map((d) => ({ ...d, date: d.date.slice(5) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Your parking lots</h2>
        {lots.data?.length === 0 && <p className="text-slate-500">No lots yet — add your first one.</p>}
        {lots.data?.map((lot) => (
          <div key={lot.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {lot.name}{' '}
                  {!lot.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactive</span>}
                </p>
                <p className="text-sm text-slate-500">
                  {lot.address}, {lot.city} · {lot.slotCount} slots · {lot.bookingCount} bookings
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setOpenLot(openLot === lot.id ? null : lot.id)}>
                  {openLot === lot.id ? 'Hide bookings' : 'View bookings'}
                </button>
                <button className="btn-secondary" disabled={toggle.isPending} onClick={() => toggle.mutate(lot)}>
                  {lot.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            {openLot === lot.id && <LotBookings lotId={lot.id} />}
          </div>
        ))}
      </div>
    </div>
  )
}
