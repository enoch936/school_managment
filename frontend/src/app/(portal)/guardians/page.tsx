'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, UserSquare2, Phone, Mail, Loader2 } from 'lucide-react';
import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { Guardian, School } from '@/lib/api/domain';
import { useAuthStore } from '@/lib/auth/store';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function GuardiansPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('guardian:manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);

  const query = useQuery({
    queryKey: ['guardians', { page, search: debouncedSearch }],
    queryFn: () =>
      apiRequestWithMeta<Guardian>('/guardians', {
        query: { page, pageSize: 20, search: debouncedSearch || undefined },
      }),
    placeholderData: (prev) => prev,
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });

  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Guardians</h1>
          <p className="text-sm text-muted-foreground">
            Manage student parents, guardians, and emergency contact relationships.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Add guardian
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <CreateGuardianForm
          schools={schools}
          onCreated={() => {
            setShowForm(false);
            void queryClient.invalidateQueries({ queryKey: ['guardians'] });
          }}
        />
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {meta ? `${meta.total} guardian${meta.total === 1 ? '' : 's'}` : 'Guardians'}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              className="pl-8 sm:w-64"
              placeholder="Search name, phone or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search guardians"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Linked Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No guardians found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserSquare2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                      {g.firstName} {g.lastName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {g.phone}
                      </div>
                      {g.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {g.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{g.occupation ?? '-'}</TableCell>
                  <TableCell>
                    {g.students && g.students.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {g.students.map((sg, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {sg.student.firstName} {sg.student.lastName} ({sg.student.studentNumber})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No students linked</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrevious}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateGuardianForm({
  schools,
  onCreated,
}: {
  schools: School[];
  onCreated: () => void;
}) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/guardians', {
        schoolId,
        firstName,
        lastName,
        phone,
        email: email || undefined,
        occupation: occupation || undefined,
      }),
    onSuccess: () => {
      toast.success('Guardian created successfully');
      onCreated();
    },
    onError: () => toast.error('Unable to create guardian'),
  });

  const disabled = !schoolId || !firstName || !lastName || !phone || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Guardian</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="g-school">School</Label>
            <select
              id="g-school"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">Select school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-first">First name</Label>
            <Input id="g-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-last">Last name</Label>
            <Input id="g-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-phone">Phone number</Label>
            <Input id="g-phone" placeholder="+251..." value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-email">Email (optional)</Label>
            <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-occ">Occupation</Label>
            <Input id="g-occ" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Guardian
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
