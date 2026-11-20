import type { components } from '@/contract/api-contract'

export type DamagePenaltyConfig = components['schemas']['DamagePenaltyConfigDto']
export type RentalPolicyConfig = components['schemas']['RentalPolicyConfigDto']
export type UpdateRentalPolicyRequest = components['schemas']['UpdateRentalPolicyRequest']

export type MembershipTierItem = components['schemas']['MembershipTierItemDto']
export type MembershipPolicyConfig = components['schemas']['MembershipPolicyConfigDto']
export type UpdateMembershipPolicyRequest = components['schemas']['UpdateMembershipPolicyRequest']

export type RbacMatrixItem = components['schemas']['RbacMatrixItemDto']
export type RbacMatrixConfig = components['schemas']['RbacMatrixConfigDto']
export type UpdateRbacMatrixRequest = components['schemas']['UpdateRbacMatrixRequest']

export type VietQrIntegration = components['schemas']['VietQrIntegrationDto']
export type ZaloOaIntegration = components['schemas']['ZaloOaIntegrationDto']
export type BookMetadataIntegration = components['schemas']['BookMetadataIntegrationDto']
export type SmtpIntegration = components['schemas']['SmtpIntegrationDto']
export type IntegrationsConfig = components['schemas']['IntegrationsConfigDto']
export type UpdateIntegrationsRequest = components['schemas']['UpdateIntegrationsRequest']

export type SystemTabKey = 'rental' | 'tiers' | 'rbac' | 'integrations'
export type SettingsHistoryItem = components['schemas']['SettingsHistoryItemDto']
