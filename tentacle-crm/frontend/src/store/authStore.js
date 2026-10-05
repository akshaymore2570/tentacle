import { create } from 'zustand'
import api from '../api'

export const useAuth = create((set) => ({
  user: null,
  token: localStorage.getItem('tentacle_token'),
  loading: false,

  login: async (username, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('tentacle_token', data.token)
      set({ token: data.token, user: data.user, loading: false })
      return { ok: true, user: data.user }
    } catch (e) {
      set({ loading: false })
      return { ok: false, error: e.response?.data?.error || 'Login failed' }
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data })
    } catch {
      set({ user: null })
    }
  },

  logout: () => {
    localStorage.removeItem('tentacle_token')
    set({ user: null, token: null })
  },
}))
