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

