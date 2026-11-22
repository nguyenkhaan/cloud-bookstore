import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHrEmployee,
  getHrEmployeeById,
  listHrEmployees,
  updateHrEmployee,
} from './hr-employees.service'
import type {
  CreateHrEmployeeInput,
  HrEmployeeListQuery,
  UpdateHrEmployeeInput,
} from './hr-employees.type'

export const hrEmployeeKeys = {
  all: ['hr', 'employees'] as const,
  list: (query: HrEmployeeListQuery) => [...hrEmployeeKeys.all, 'list', query] as const,
  detail: (id: string) => [...hrEmployeeKeys.all, 'detail', id] as const,
}

export function useHrEmployeesQuery(query: HrEmployeeListQuery) {
  return useQuery({
    queryKey: hrEmployeeKeys.list(query),
    queryFn: () => listHrEmployees(query),
  })
}

export function useHrEmployeeDetailQuery(id: string) {
  return useQuery({
    queryKey: hrEmployeeKeys.detail(id),
    queryFn: () => getHrEmployeeById(id),
    enabled: Boolean(id),
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
