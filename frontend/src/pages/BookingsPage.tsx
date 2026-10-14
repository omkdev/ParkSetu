import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage, fmtDate, money } from '../lib/api'
import { vehicleLabel, type Booking, type BookingStatus } from '../lib/types'

const badge: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[status]}`}>{status.toLowerCase()}</span>
}

export function BookingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => (await api.get<{ data: Booking[] }>('/bookings/mine')).data.data,
  })
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/bookings/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings'] }),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My bookings</h1>
      {isLoading && <p className="text-slate-500">Loading…</p>}
      {data?.length === 0 && <p className="text-slate-500">You have no bookings yet.</p>}
      {cancel.error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{errorMessage(cancel.error)}</p>}
      <div className="space-y-3">
        {data?.map((b) => {
          const canCancel = b.status === 'CONFIRMED' && new Date(b.endTime) > new Date()
          return (
            <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {b.lot?.name} <StatusBadge status={b.status} />
                </p>
                <p className="text-sm text-slate-500">
                  Slot {b.slot?.label} · {vehicleLabel[b.vehicleType]} · {b.vehicleNumber}
                </p>
                <p className="text-sm text-slate-500">
                  {fmtDate(b.startTime)} → {fmtDate(b.endTime)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">{money(b.totalAmount)}</span>
                {canCancel && (
                  <button className="btn-secondary" disabled={cancel.isPending} onClick={() => confirm('Cancel this booking?') && cancel.mutate(b.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
