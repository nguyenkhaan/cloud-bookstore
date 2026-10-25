import { http, tokenStore } from '../../../services/http'
import type {
    AccessTokenResponse,
    LoginPayload,
    RegisterPayload,
    RegisterResult,
    User,
} from '../../../types/auth'

export const authApi = {
    async login(payload: LoginPayload): Promise<void> {
        const { data } = await http.post<AccessTokenResponse>('/auth/login', payload)
        tokenStore.set(data.accessToken)
    },

    async register(payload: RegisterPayload): Promise<RegisterResult> {
        const { data } = await http.post<RegisterResult>('/auth/register', payload)
        return data
    },

    async verify(token: string): Promise<void> {
        await http.post('/auth/verify', { token })
    },

    async me(): Promise<User> {
        const { data } = await http.get<User>('/auth/me')
        return data
    },

    async logout(): Promise<void> {
        try {
            await http.post('/auth/logout')
        } finally {
            tokenStore.set(null)
        }
    },
}