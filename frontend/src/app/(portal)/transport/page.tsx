'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bus, Plus, MapPin, Users, Phone, Loader2 } from 'lucide-react';
import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { Route, School, Student, Vehicle } from '@/lib/api/domain';
import { useAuthStore } from '@/lib/auth/store';
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

export default function TransportPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('transport:manage');

  const [activeTab, setActiveTab] = useState<'routes' | 'vehicles'>('routes');
  const [page, setPage] = useState(1);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [assigningRoute, setAssigningRoute] = useState<Route | null>(null);

  // Routes Query
  const routesQuery = useQuery({
    queryKey: ['transport-routes', { page }],
    queryFn: () =>
      apiRequestWithMeta<Route>('/transport/routes', {
        query: { page, pageSize: 20 },
      }),
    enabled: activeTab === 'routes',
    placeholderData: (prev) => prev,
  });

  // Vehicles Query
  const vehiclesQuery = useQuery({
    queryKey: ['transport-vehicles', { page }],
    queryFn: () =>
      apiRequestWithMeta<Vehicle>('/transport/vehicles', {
        query: { page, pageSize: 20 },
      }),
    enabled: activeTab === 'vehicles',
    placeholderData: (prev) => prev,
  });

  const routes = routesQuery.data?.data ?? [];
  const vehicles = vehiclesQuery.data?.data ?? [];
  const meta = activeTab === 'routes' ? routesQuery.data?.meta : vehiclesQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transport Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage school buses, routes, driver contacts, and student route assignments.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddVehicle((v) => !v)}>
              <Plus className="h-4 w-4" /> Add Vehicle
            </Button>
            <Button onClick={() => setShowAddRoute((v) => !v)}>
              <Plus className="h-4 w-4" /> Create Route
            </Button>
          </div>
        )}
      </div>

      {showAddVehicle && canManage && (
        <CreateVehicleForm
          onCreated={() => {
            setShowAddVehicle(false);
            void queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
          }}
        />
      )}

      {showAddRoute && canManage && (
        <CreateRouteForm
          vehicles={vehicles}
          onCreated={() => {
            setShowAddRoute(false);
            void queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
          }}
        />
      )}

      {assigningRoute && canManage && (
        <AssignStudentDialog
          route={assigningRoute}
          onClose={() => setAssigningRoute(null)}
          onAssigned={() => {
            setAssigningRoute(null);
            void queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
          }}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'routes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveTab('routes');
            setPage(1);
          }}
        >
          <MapPin className="mr-1.5 h-4 w-4" /> Bus Routes & Stops
        </Button>
        <Button
          variant={activeTab === 'vehicles' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveTab('vehicles');
            setPage(1);
          }}
        >
          <Bus className="mr-1.5 h-4 w-4" /> Vehicle Fleet
        </Button>
      </div>

      {activeTab === 'routes' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {meta ? `${meta.total} active route${meta.total === 1 ? '' : 's'}` : 'Routes'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route Name</TableHead>
                  <TableHead>Vehicle Plate</TableHead>
                  <TableHead>Stops</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Fee</TableHead>
                  {canManage && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {routesQuery.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={canManage ? 6 : 5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!routesQuery.isLoading && routes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-muted-foreground">
                      No routes created yet.
                    </TableCell>
                  </TableRow>
                )}
                {routes.map((r) => {
                  const capacity = r.vehicle?.capacity ?? 40;
                  const assigned = r._count?.assignments ?? 0;
                  const percent = Math.min(100, Math.round((assigned / capacity) * 100));

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4 text-primary" aria-hidden />
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.vehicle?.plateNumber ?? 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {r.stops && r.stops.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.stops.map((s, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {s.sequence}. {s.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Direct route</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs">
                            {assigned} / {capacity} seats ({percent}%)
                          </div>
                          <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{r.feeMinor > 0 ? `${r.feeMinor / 100} ETB` : 'Included'}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setAssigningRoute(r)}>
                            <Users className="mr-1 h-3.5 w-3.5 text-primary" />
                            Assign Student
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {meta ? `${meta.total} vehicle${meta.total === 1 ? '' : 's'}` : 'Vehicles'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Driver Contact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehiclesQuery.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!vehiclesQuery.isLoading && vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No vehicles registered.
                    </TableCell>
                  </TableRow>
                )}
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs font-semibold">{v.plateNumber}</TableCell>
                    <TableCell>{v.model ?? '-'}</TableCell>
                    <TableCell>{v.capacity} passengers</TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="font-medium">{v.driverName ?? 'Unassigned'}</div>
                        {v.driverPhone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {v.driverPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.isActive ? 'success' : 'secondary'}>
                        {v.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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

function CreateVehicleForm({ onCreated }: { onCreated: () => void }) {
  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });
  const schools = schoolsQuery.data ?? [];

  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState(40);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/transport/vehicles', {
        schoolId: schoolId || schools[0]?.id,
        plateNumber,
        model: model || undefined,
        capacity: Number(capacity),
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
      }),
    onSuccess: () => {
      toast.success('Vehicle registered');
      onCreated();
    },
    onError: () => toast.error('Unable to register vehicle'),
  });

  const disabled = !plateNumber || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Register Fleet Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="v-school">School</Label>
            <select
              id="v-school"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-plate">Plate Number</Label>
            <Input id="v-plate" placeholder="e.g. 3-A12345" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-model">Vehicle Model</Label>
            <Input id="v-model" placeholder="e.g. Toyota Coaster" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-cap">Seating Capacity</Label>
            <Input id="v-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-driver">Driver Name</Label>
            <Input id="v-driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-phone">Driver Phone</Label>
            <Input id="v-phone" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Vehicle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateRouteForm({
  vehicles,
  onCreated,
}: {
  vehicles: Vehicle[];
  onCreated: () => void;
}) {
  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });
  const schools = schoolsQuery.data ?? [];

  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [name, setName] = useState('');
  const [feeMajor, setFeeMajor] = useState(500); // 500 ETB
  const [stop1, setStop1] = useState('Bole Medhanialem');
  const [stop2, setStop2] = useState('Meskel Square');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/transport/routes', {
        schoolId: schoolId || schools[0]?.id,
        vehicleId: vehicleId || undefined,
        name,
        feeMinor: Math.round(Number(feeMajor) * 100),
        stops: [
          { name: stop1, sequence: 1 },
          { name: stop2, sequence: 2 },
        ],
      }),
    onSuccess: () => {
      toast.success('Route created');
      onCreated();
    },
    onError: () => toast.error('Unable to create route'),
  });

  const disabled = !name || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create Transport Route</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="r-school">School</Label>
            <select
              id="r-school"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-name">Route Name</Label>
            <Input id="r-name" placeholder="e.g. Route 1 - Bole Line" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-veh">Assigned Vehicle</Label>
            <select
              id="r-veh"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} ({v.model ?? 'Bus'} - {v.capacity} seats)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-fee">Monthly Fee (ETB)</Label>
            <Input id="r-fee" type="number" value={feeMajor} onChange={(e) => setFeeMajor(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-s1">Stop Point 1</Label>
            <Input id="r-s1" value={stop1} onChange={(e) => setStop1(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-s2">Stop Point 2</Label>
            <Input id="r-s2" value={stop2} onChange={(e) => setStop2(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Route
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignStudentDialog({
  route,
  onClose,
  onAssigned,
}: {
  route: Route;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const studentsQuery = useQuery({
    queryKey: ['students-quick'],
    queryFn: () => apiRequestWithMeta<Student>('/students', { query: { pageSize: 50 } }),
  });
  const students = studentsQuery.data?.data ?? [];

  const [studentId, setStudentId] = useState(students[0]?.id ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/transport/assignments', {
        routeId: route.id,
        studentId: studentId || students[0]?.id,
      }),
    onSuccess: () => {
      toast.success('Student assigned to route');
      onAssigned();
    },
    onError: () => toast.error('Unable to assign student (route may be full)'),
  });

  return (
    <Card className="border-primary/50 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">Assign Student to {route.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="assign-student">Student</Label>
          <select
            id="assign-student"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.studentNumber})
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Assignment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
