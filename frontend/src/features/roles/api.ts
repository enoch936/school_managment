import { api } from '@/lib/api/client';

export interface PermissionItem {
  id: string;
  key: string;
  description: string | null;
  category: string | null;
}

export interface RoleItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  organizationId: string | null;
  userCount: number;
  permissions: string[];
}

export const rolesApi = {
  listRoles: (): Promise<RoleItem[]> => api.get<RoleItem[]>('/roles'),
  listPermissions: (): Promise<PermissionItem[]> => api.get<PermissionItem[]>('/permissions'),
  createRole: (payload: { name: string; key: string; description?: string; permissionKeys: string[] }) =>
    api.post<RoleItem>('/roles', payload),
  updateRole: (id: string, payload: { name?: string; description?: string; permissionKeys?: string[] }) =>
    api.patch<RoleItem>(`/roles/${id}`, payload),
  deleteRole: (id: string) => api.delete<{ success: boolean; id: string }>(`/roles/${id}`),
};
