import type { SlotTemplate } from '@printslot/shared';
import { apiFetch } from '@/services/api';

/** A slot template prepared for display: the raw row + its "HH:MM–HH:MM" window. */
export interface AdminTemplate {
  id: string;
  startTime: string;
  endTime: string;
  /** Display window, e.g. "09:00–09:30" (en-dash, matching the prototype). */
  time: string;
}

/** Body for `POST /slots/templates`. */
export interface CreateTemplateInput {
  startTime: string;
  endTime: string;
}

/** Body for `PATCH /slots/templates/:id`. */
export interface UpdateTemplateInput {
  id: string;
  startTime: string;
  endTime: string;
}

function toAdminTemplate(template: SlotTemplate): AdminTemplate {
  return {
    id: template.id,
    startTime: template.startTime,
    endTime: template.endTime,
    time: `${template.startTime}–${template.endTime}`,
  };
}

export const adminTemplatesService = {
  /** All active (non-soft-deleted) slot templates (`GET /slots/templates`). */
  async listTemplates(): Promise<AdminTemplate[]> {
    const templates = await apiFetch<SlotTemplate[]>('/slots/templates');
    return templates
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(toAdminTemplate);
  },

  /** Create a template (`POST /slots/templates`). */
  async createTemplate(input: CreateTemplateInput): Promise<AdminTemplate> {
    const created = await apiFetch<SlotTemplate>('/slots/templates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return toAdminTemplate(created);
  },

  /** Update a template's window (`PATCH /slots/templates/:id`). */
  async updateTemplate({ id, startTime, endTime }: UpdateTemplateInput): Promise<AdminTemplate> {
    const updated = await apiFetch<SlotTemplate>(`/slots/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ startTime, endTime }),
    });
    return toAdminTemplate(updated);
  },

  /** Soft-delete a template (`DELETE /slots/templates/:id`). */
  deleteTemplate(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/slots/templates/${id}`, {
      method: 'DELETE',
    });
  },
};
