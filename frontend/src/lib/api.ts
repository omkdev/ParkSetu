import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'parksetu_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string; errors?: { path: string; message: string }[] }
      | undefined
    if (data?.errors?.length) {
      return data.errors.map((e) => `${e.path}: ${e.message}`).join(', ')
    }
    return data?.message ?? err.message
  }
  return err instanceof Error ? err.message : 'Something went wrong'
}

/** Convert a <input type="datetime-local"> value to ISO string. */
export const toISO = (local: string) => new Date(local).toISOString()

export const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
