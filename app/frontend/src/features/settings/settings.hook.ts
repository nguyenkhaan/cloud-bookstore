import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getIntegrations,
  getMembershipPolicy,
  getRbacMatrix,
  getRentalPolicy,
  getSettingsHistory,
  updateIntegrations,
  updateMembershipPolicy,
  updateRbacMatrix,
  updateRentalPolicy,
} from './settings.service'
import type {
  IntegrationsConfig,
  MembershipPolicyConfig,
  RbacMatrixConfig,
  RentalPolicyConfig,
  UpdateIntegrationsRequest,
  UpdateMembershipPolicyRequest,
  UpdateRbacMatrixRequest,
  UpdateRentalPolicyRequest,
} from './settings.type'

export const settingsKeys = {
  all: ['settings'] as const,
  rental: () => [...settingsKeys.all, 'rental'] as const,
  tiers: () => [...settingsKeys.all, 'tiers'] as const,
  rbac: () => [...settingsKeys.all, 'rbac'] as const,
  integrations: () => [...settingsKeys.all, 'integrations'] as const,
}

export function useRentalPolicy() {
  return useQuery<RentalPolicyConfig>({
    queryKey: settingsKeys.rental(),
    queryFn: getRentalPolicy,
  })
}

export function useUpdateRentalPolicy() {
  const queryClient = useQueryClient()
  return useMutation<RentalPolicyConfig, Error, UpdateRentalPolicyRequest>({
    mutationFn: updateRentalPolicy,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.rental(), data)
      void queryClient.invalidateQueries({ queryKey: ['settings-history', 'rental'] })
    },
  })
}

export function useMembershipPolicy() {
  return useQuery<MembershipPolicyConfig>({
    queryKey: settingsKeys.tiers(),
    queryFn: getMembershipPolicy,
  })
}

export function useUpdateMembershipPolicy() {
  const queryClient = useQueryClient()
  return useMutation<MembershipPolicyConfig, Error, UpdateMembershipPolicyRequest>({
    mutationFn: updateMembershipPolicy,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.tiers(), data)
      void queryClient.invalidateQueries({ queryKey: ['settings-history', 'membership'] })
    },
  })
}

export function useRbacMatrix() {
  return useQuery<RbacMatrixConfig>({
    queryKey: settingsKeys.rbac(),
    queryFn: getRbacMatrix,
  })
}

export function useUpdateRbacMatrix() {
  const queryClient = useQueryClient()
  return useMutation<RbacMatrixConfig, Error, UpdateRbacMatrixRequest>({
    mutationFn: updateRbacMatrix,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.rbac(), data)
      void queryClient.invalidateQueries({ queryKey: ['settings-history', 'rbac'] })
      void queryClient.invalidateQueries({ queryKey: ['role-permissions'] })
    },
  })
}

export function useIntegrations() {
  return useQuery<IntegrationsConfig>({
    queryKey: settingsKeys.integrations(),
    queryFn: getIntegrations,
  })
}

export function useUpdateIntegrations() {
  const queryClient = useQueryClient()
  return useMutation<IntegrationsConfig, Error, UpdateIntegrationsRequest>({
    mutationFn: updateIntegrations,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.integrations(), data)
      void queryClient.invalidateQueries({ queryKey: ['settings-history', 'integrations'] })
    },
  })
}

export function useSettingsHistory(group: string, enabled: boolean) {
  return useQuery({ queryKey: ['settings-history', group], queryFn: () => getSettingsHistory(group), enabled })
}
