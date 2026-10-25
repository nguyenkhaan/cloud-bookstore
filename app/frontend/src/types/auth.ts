export type Role = 'ADMIN' | 'CASHIER' | 'INVENTORY_MANAGER'

export interface User {
    id: string
    email: string
    fullName: string
    role: Role
}

export interface LoginPayload {
    email: string
    password: string
}

export interface RegisterPayload {
    email: string
    fullName: string
    phone: string
    password: string
}

export interface RegisterResult {
    email: string
    fullName: string
    activation: string
}

export interface AccessTokenResponse {
    accessToken: string
}