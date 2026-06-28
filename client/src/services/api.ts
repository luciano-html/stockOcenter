import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

let isRefreshing = false
let refreshSubscribers: Array<(token?: string) => void> = []

function subscribeTokenRefresh(callback: (token?: string) => void) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(token?: string) {
  refreshSubscribers.forEach((callback) => callback(token))
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
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(api(originalRequest))
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
        onTokenRefreshed()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default api
