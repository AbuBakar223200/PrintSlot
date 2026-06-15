import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminTemplatesService,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from '@/features/admin/services/adminTemplatesService';

/** Query key for slot templates. */
export const adminTemplatesKey = ['admin', 'templates'] as const;

/** All active slot templates (`GET /slots/templates`). */
export function useAdminTemplates() {
  return useQuery({
    queryKey: adminTemplatesKey,
    queryFn: () => adminTemplatesService.listTemplates(),
    staleTime: 30_000,
  });
}

function invalidateTemplates(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: adminTemplatesKey });
}

/** Create a slot template (`POST /slots/templates`). */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => adminTemplatesService.createTemplate(input),
    onSuccess: () => invalidateTemplates(queryClient),
  });
}

/** Update a slot template's window (`PATCH /slots/templates/:id`). */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTemplateInput) => adminTemplatesService.updateTemplate(input),
    onSuccess: () => invalidateTemplates(queryClient),
  });
}

/** Soft-delete a slot template (`DELETE /slots/templates/:id`). */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTemplatesService.deleteTemplate(id),
    onSuccess: () => invalidateTemplates(queryClient),
  });
}
