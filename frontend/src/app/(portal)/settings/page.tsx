'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { user, refreshMe } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and account security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={user?.email ?? '-'} />
          <Field label="Role" value={user?.isPlatformAdmin ? 'Platform administrator' : 'Member'} />
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

function ChangePasswordCard({ onChanged }: { onChanged: () => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: async () => {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      await onChanged();
    },
    onError: () => toast.error('Unable to update password. Check your current password.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Password</CardTitle>
        <CardDescription>Use a strong, unique password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!currentPassword || newPassword.length < 12 || mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
}

function MfaCard() {
  const [setup, setSetup] = useState<MfaSetupResult | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const setupMutation = useMutation({
    mutationFn: () => api.post<MfaSetupResult>('/auth/mfa/setup'),
    onSuccess: (data) => setSetup(data),
    onError: () => toast.error('Unable to start MFA setup'),
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post<{ recoveryCodes: string[] }>('/auth/mfa/confirm', { code }),
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      toast.success('MFA enabled');
    },
    onError: () => toast.error('Invalid code'),
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
