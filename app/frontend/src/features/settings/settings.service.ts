import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import type {
  IntegrationsConfig,
  MembershipPolicyConfig,
  RbacMatrixConfig,
  RentalPolicyConfig,
  UpdateIntegrationsRequest,
  UpdateMembershipPolicyRequest,
  UpdateRbacMatrixRequest,
  UpdateRentalPolicyRequest,
  SettingsHistoryItem,
} from './settings.type'

export class SettingsApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SettingsApiError'
    this.status = status
  }
}

function messageFrom(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (typeof data === 'object' && data !== null) {
    const body = data as Record<string, unknown>
    if (typeof body.message === 'string') return body.message
    if (typeof body.detail === 'string') return body.detail
    if (typeof body.title === 'string') return body.title
  }
  return error.message
}

async function requestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await request()
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new SettingsApiError(error.response?.status ?? 500, messageFrom(error))
    }
    throw error
  }
}

// SCR-SYS-01: Rental & Penalty
export async function getRentalPolicy(): Promise<RentalPolicyConfig> {
  return requestData(() => privateClient.get<RentalPolicyConfig>('/settings/rental-policy'))
}

export async function updateRentalPolicy(request: UpdateRentalPolicyRequest): Promise<RentalPolicyConfig> {
  return requestData(() => privateClient.put<RentalPolicyConfig>('/settings/rental-policy', request))
}

// SCR-SYS-02: Membership Tiers & Discounts
export async function getMembershipPolicy(): Promise<MembershipPolicyConfig> {
  return requestData(() => privateClient.get<MembershipPolicyConfig>('/settings/membership-policy'))
}

export async function updateMembershipPolicy(request: UpdateMembershipPolicyRequest): Promise<MembershipPolicyConfig> {
  return requestData(() => privateClient.put<MembershipPolicyConfig>('/settings/membership-policy', request))
}

// SCR-SYS-03: RBAC Matrix
export async function getRbacMatrix(): Promise<RbacMatrixConfig> {
  return requestData(() => privateClient.get<RbacMatrixConfig>('/settings/rbac-matrix'))
}

export async function updateRbacMatrix(request: UpdateRbacMatrixRequest): Promise<RbacMatrixConfig> {
  return requestData(() => privateClient.put<RbacMatrixConfig>('/settings/rbac-matrix', request))
}

// SCR-SYS-04: Integrations
export async function getIntegrations(): Promise<IntegrationsConfig> {
  return requestData(() => privateClient.get<IntegrationsConfig>('/settings/integrations'))
}

export async function updateIntegrations(request: UpdateIntegrationsRequest): Promise<IntegrationsConfig> {
  return requestData(() => privateClient.put<IntegrationsConfig>('/settings/integrations', request))
}

export async function getMyPermissions(): Promise<string[]> {
  return requestData(() => privateClient.get<string[]>('/settings/my-permissions'))
}

export async function getSettingsHistory(group: string): Promise<SettingsHistoryItem[]> {
  return requestData(() => privateClient.get<SettingsHistoryItem[]>(`/settings/history/${encodeURIComponent(group)}`))
}
