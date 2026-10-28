'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Plus, Trash2, KeyRound } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/components/providers/auth-provider';
import { useAuthStore } from '@/lib/auth/store';
import { rolesApi, type RoleItem, type PermissionItem } from '@/features/roles/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SettingsPage() {
  const { user, refreshMe } = useAuth();
  const principal = useAuthStore((s) => s.principal);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canReadRoles = hasPermission('role:read') || principal?.isPlatformAdmin;

  const [activeTab, setActiveTab] = useState<'profile' | 'roles'>('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings & Administration</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal security profile and organization role-based access control.
        </p>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> Profile & Security
        </button>
        {canReadRoles && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="h-4 w-4" /> Roles & Permissions (RBAC)
          </button>
        )}
      </div>

      {activeTab === 'profile' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your personal account details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={user?.email ?? '-'} />
              <Field
                label="Role"
                value={
                  user?.isPlatformAdmin
                    ? 'Platform administrator'
                    : principal?.memberships[0]?.roleKey || 'Member'
                }
              />
              <Field label="First name" value={user?.firstName ?? '-'} />
              <Field label="Last name" value={user?.lastName ?? '-'} />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground">Email verified</p>
                {user?.emailVerifiedAt ? (
                  <Badge variant="success">verified</Badge>
                ) : (
                  <Badge variant="warning">unverified</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <ChangePasswordCard onChanged={refreshMe} />
          <MfaCard />
        </div>
      ) : (
        <RolesManagementSection />
      )}
    </div>
  );
}

function RolesManagementSection() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const principal = useAuthStore((s) => s.principal);
  const canManageRoles = hasPermission('role:manage') || principal?.isPlatformAdmin;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<RoleItem | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.listRoles(),
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.listPermissions(),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => rolesApi.deleteRole(id),
    onSuccess: () => {
      toast.success('Custom role deleted');
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete role');
    },
  });

  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Configurable Role-Based Access Control</h2>
          <p className="text-xs text-muted-foreground">
            System defaults and organization custom roles with fine-grained permissions.
          </p>
        </div>
        {canManageRoles && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create Custom Role
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System & Custom Roles ({roles.length})</CardTitle>
          <CardDescription>
            Roles govern access to tenant records, academic data, financial ledgers, and sensitive medical/disciplinary files.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name & Key</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Assigned Users</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolesQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8">
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.name}
                    <span className="block font-mono text-xs text-muted-foreground">{r.key}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isSystem ? 'secondary' : 'default'}>
                      {r.isSystem ? 'System Default' : 'Custom Organization Role'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.userCount} users</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {r.permissions.slice(0, 4).map((p) => (
                        <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                          {p}
                        </span>
                      ))}
                      {r.permissions.length > 4 && (
                        <button
                          onClick={() => setSelectedRoleForDetail(r)}
                          className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium hover:underline"
                        >
                          +{r.permissions.length - 4} more
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedRoleForDetail(r)}
                      >
                        Inspect
                      </Button>
                      {!r.isSystem && canManageRoles && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteRoleMutation.mutate(r.id)}
                          disabled={deleteRoleMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Custom Role Modal */}
      {showCreateModal && (
        <CreateCustomRoleModal
          permissions={permissions}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            void queryClient.invalidateQueries({ queryKey: ['roles'] });
          }}
        />
      )}

      {/* Inspect Permissions Modal */}
      {selectedRoleForDetail && (
        <RoleDetailModal
          role={selectedRoleForDetail}
          onClose={() => setSelectedRoleForDetail(null)}
        />
      )}
    </div>
  );
}

function CreateCustomRoleModal({
  permissions,
  onClose,
  onSuccess,
}: {
  permissions: PermissionItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Group permissions by category
  const grouped = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      const cat = p.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [permissions]);

  const toggleKey = (pKey: string) => {
    const next = new Set(selectedKeys);
    if (next.has(pKey)) next.delete(pKey);
    else next.add(pKey);
    setSelectedKeys(next);
  };

  const mutation = useMutation({
    mutationFn: () =>
      rolesApi.createRole({
        name,
        key,
        description: description || undefined,
        permissionKeys: [...selectedKeys],
      }),
    onSuccess: () => {
      toast.success('Custom role created successfully');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create role');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>Create Custom Role</CardTitle>
          <CardDescription>
            Configure fine-grained resource permissions for specialized administrative or staff roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role Name *</Label>
              <Input
                placeholder="e.g. Senior Curriculum Lead"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!key) {
                    setKey(e.target.value.toLowerCase().replace(/[\s-]+/g, '_'));
                  }
                }}
              />
            </div>
            <div>
              <Label>Role Identifier Key *</Label>
              <Input
                placeholder="e.g. senior_curriculum_lead"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              placeholder="Oversees department syllabi and exam reviews..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-4 pt-2">
            <Label className="text-sm font-semibold">Assign Permissions ({selectedKeys.size} selected)</Label>
            {[...grouped.entries()].map(([category, items]) => (
              <div key={category} className="rounded-lg border p-3 bg-muted/20 space-y-2">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  {category}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 text-xs font-mono p-1 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(perm.key)}
                        onChange={() => toggleKey(perm.key)}
                        className="rounded border-input text-primary"
                      />
                      <span>{perm.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="border-t p-4 flex justify-end gap-2 bg-card">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name || !key || selectedKeys.size === 0}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Custom Role
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RoleDetailModal({ role, onClose }: { role: RoleItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-xl shadow-xl max-h-[80vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{role.name}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">{role.key}</p>
            </div>
            <Badge variant={role.isSystem ? 'secondary' : 'default'}>
              {role.isSystem ? 'System Default' : 'Custom'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs text-muted-foreground">{role.description || 'No description provided.'}</p>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Configured Permissions ({role.permissions.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {role.permissions.map((p) => (
                <span key={p} className="rounded bg-muted px-2 py-1 text-xs font-mono">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
        <div className="border-t p-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function ChangePasswordCard({ onChanged }: { onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      onChanged();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to change password');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>Must be at least 8 characters with upper, lower, and numbers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Current password</Label>
          <Input
            id="current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new">New password</Label>
          <Input
            id="new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!currentPassword || !newPassword || mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}

function MfaCard() {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const setupMutation = useMutation({
    mutationFn: () => api.post<{ secret: string; uri: string }>('/auth/mfa/setup'),
    onSuccess: (res) => setSetup(res),
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post<{ recoveryCodes: string[] }>('/auth/mfa/confirm', { code }),
    onSuccess: (res) => {
      toast.success('MFA enabled');
      setRecoveryCodes(res.recoveryCodes);
      setSetup(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Two-factor authentication
        </CardTitle>
        <CardDescription>Protect your account with a TOTP authenticator app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recoveryCodes ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Save these recovery codes somewhere safe:</p>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-4 font-mono text-sm">
              {recoveryCodes.map((rc) => (
                <span key={rc}>{rc}</span>
              ))}
            </div>
          </div>
        ) : setup ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scan the QR code or enter the secret in your authenticator app, then confirm with a code.
            </p>
            <div className="rounded-md border p-3 font-mono text-sm break-all">{setup.secret}</div>
            <div className="flex items-end gap-2">
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verification code</Label>
                <Input
                  id="mfaCode"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button disabled={code.length < 6 || confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
                {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
            {setupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enable MFA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
