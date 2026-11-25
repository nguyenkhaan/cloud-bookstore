import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth.hook'
import {
  createHrEmployee,
  getHrEmployeeById,
  getHrEmployeeShifts,
  listHrEmployees,
  resendHrEmployeeSetupEmail,
  updateHrEmployee,
} from './hr-employees.service'
import type {
  CreateHrEmployeeInput,
  HrEmployeeListQuery,
  UpdateHrEmployeeInput,
} from './hr-employees.type'

export const hrEmployeeKeys = {
  all: ['hr', 'employees'] as const,
  list: (query: HrEmployeeListQuery) =>
    [...hrEmployeeKeys.all, 'list', query] as const,
  detail: (id: string) => [...hrEmployeeKeys.all, 'detail', id] as const,
  shifts: (id: string, page: number, pageSize: number) =>
    [...hrEmployeeKeys.all, 'shifts', id, page, pageSize] as const,
}

export function useHrEmployeesQuery(query: HrEmployeeListQuery) {
  const { session } = useAuth()
  return useQuery({
    queryKey: hrEmployeeKeys.list(query),
    queryFn: () => listHrEmployees(query),
    enabled: Boolean(session),
  })
}

export function useHrEmployeeDetailQuery(id: string) {
  const { session } = useAuth()
  return useQuery({
    queryKey: hrEmployeeKeys.detail(id),
    queryFn: () => getHrEmployeeById(id),
    enabled: Boolean(session) && Boolean(id),
  })
}

export function useHrEmployeeShiftsQuery(
  id: string,
  page: number,
  pageSize: number,
) {
  const { session } = useAuth()
  return useQuery({
    queryKey: hrEmployeeKeys.shifts(id, page, pageSize),
    queryFn: () => getHrEmployeeShifts(id, page, pageSize),
    enabled: Boolean(session) && Boolean(id),
  })
}

export function useCreateHrEmployeeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['hr', 'employees', 'create'],
    mutationFn: (input: CreateHrEmployeeInput) => createHrEmployee(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrEmployeeKeys.all })
    },
  })
}

export function useUpdateHrEmployeeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['hr', 'employees', 'update'],
    mutationFn: (input: UpdateHrEmployeeInput) => updateHrEmployee(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrEmployeeKeys.all })
    },
  })
}

export function useResendSetupEmailMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['hr', 'employees', 'resend-setup-email'],
    mutationFn: (employeeId: string) => resendHrEmployeeSetupEmail(employeeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrEmployeeKeys.all })
    },
  })
}
