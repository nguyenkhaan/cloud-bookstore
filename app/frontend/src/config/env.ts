// Dev: '/api' (đi qua proxy của Vite). Production: đặt VITE_API_URL=https://<api-domain>/api
export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api'