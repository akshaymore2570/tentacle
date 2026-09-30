import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tentacle_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status
    const data = err.response?.data

    if (status === 401) {
      localStorage.removeItem('tentacle_token')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }

    if (status === 403 && data?.licenseBlocked) {
      // Notify LicenseGuard to re-check
      window.dispatchEvent(new Event('license-changed'))
    }

    return Promise.reject(err)
  }
)

export default api
