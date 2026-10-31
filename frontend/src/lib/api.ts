import axios from 'axios'

export function getCookie(name: string): string | null {
  let cookieValue: string | null = null
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to automatically attach CSRF token for state-changing requests
api.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase() || 'GET'
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let csrfToken = getCookie('csrftoken')
    if (!csrfToken) {
      try {
        const res = await axios.get('/api/v1/auth/csrf/', { withCredentials: true })
        csrfToken = res.data.csrfToken || getCookie('csrftoken')
      } catch (err) {
        console.warn('Could not refresh CSRF token automatically:', err)
      }
    }
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken
    }
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  }
)


/** Fetches every page of a list endpoint (used to fill dropdowns without silently truncating at one page). */
export async function fetchAll<T = any>(path: string, params: Record<string, string> = {}, maxPages = 20): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const qs = new URLSearchParams({ ...params, page: String(page), page_size: '100' })
    const res = await api.get(`${path}?${qs.toString()}`)
    const rows = res.data.results ?? res.data
    out.push(...rows)
    if (!res.data.next) break
  }
  return out
}

/** Turns a DRF / network error into one readable sentence. */
export function getApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (err as any)?.response?.data
  if (!data) return (err as any)?.message || fallback
  if (typeof data === 'string') return data.length > 200 ? fallback : data
  if (data.error) return String(data.error)
  if (data.detail) return String(data.detail)
  const parts: string[] = []
  for (const [key, value] of Object.entries(data)) {
    const text = Array.isArray(value) ? value.join(' ') : typeof value === 'object' ? JSON.stringify(value) : String(value)
    parts.push(key === 'non_field_errors' ? text : `${key.replace(/_/g, ' ')}: ${text}`)
  }
  return parts.join(' | ') || fallback
}
