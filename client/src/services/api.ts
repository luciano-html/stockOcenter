import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

let isRefreshing = false
let refreshSubscribers: Array<{ resolve: () => void; reject: () => void }> = []

function subscribeTokenRefresh(subscriber: { resolve: () => void; reject: () => void }) {
  refreshSubscribers.push(subscriber)
}

function onTokenRefreshed() {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve())
  refreshSubscribers = []
}

function onRefreshFailed() {
  refreshSubscribers.forEach((subscriber) => subscriber.reject())
  refreshSubscribers = []
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (err.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh({
            resolve: () => resolve(api(originalRequest)),
            reject: () => reject(err),
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        onTokenRefreshed()
        return api(originalRequest)
      } catch {
        onRefreshFailed()
        const isAuthCheck = originalRequest.url?.includes('/auth/me')
        const alreadyOnLogin = window.location.pathname === '/login'
        if (!isAuthCheck && !alreadyOnLogin) {
          window.location.href = '/login'
        }
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default api
