'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  CreditCard,
  MapPin,
  Plus,
  Save,
  Shield,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth/store';
import {
  createCalendarEvent,
  createCampus,
  deleteCalendarEvent,
  deleteCampus,
  getSchool,
  getTenantSubscription,
  listCalendarEvents,
  listCampuses,
  listFeatureFlags,
  listSchools,
  onboardSchool,
  toggleFeatureFlag,
  updateSchool,
} from '@/features/schools/api';

export default function OrganizationPage() {
  const queryClient = useQueryClient();
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('school:manage');

  const [activeTab, setActiveTab] = useState<'profile' | 'campuses' | 'calendar' | 'policies' | 'subscription' | 'features'>('profile');

  // Modals state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // New Campus Form
  const [newCampus, setNewCampus] = useState({ name: '', code: '', address: '', capacity: 500, phone: '' });

  // New Calendar Event Form
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'HOLIDAY',
    startDate: '',
    endDate: '',
    description: '',
    affectsAttendance: true,
    isAllDay: true,
  });

  // Onboarding Form
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    code: '',
    type: 'K12',
    email: '',
    phone: '',
    address: '',
    website: '',
    taxId: '',
    timezone: 'Africa/Addis_Ababa',
    currency: 'ETB',
    locale: 'en',
    mainCampusName: 'Main Campus',
    mainCampusCode: 'MAIN',
    academicYearName: '2026-2027 Academic Year',
    academicYearStartDate: '2026-09-01',
    academicYearEndDate: '2027-06-30',
    termNames: 'Semester 1, Semester 2',
    minAttendancePercentage: 75,
  });

  // Queries
  const { data: schoolsData } = useQuery({
    queryKey: ['schools', 'list'],
    queryFn: listSchools,
  });

  const selectedSchoolId = activeSchoolId ?? schoolsData?.items[0]?.id;

  const { data: schoolDetails, isLoading: isSchoolLoading } = useQuery({
    queryKey: ['school', selectedSchoolId],
    queryFn: () => getSchool(selectedSchoolId!),
    enabled: Boolean(selectedSchoolId),
  });

  const { data: campuses } = useQuery({
    queryKey: ['campuses', selectedSchoolId],
    queryFn: () => listCampuses(selectedSchoolId!),
    enabled: Boolean(selectedSchoolId),
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ['calendar-events', selectedSchoolId],
    queryFn: () => listCalendarEvents(selectedSchoolId!),
    enabled: Boolean(selectedSchoolId),
  });

  const { data: subscriptionInfo } = useQuery({
    queryKey: ['organization', 'subscription'],
    queryFn: getTenantSubscription,
  });

  const { data: featureFlags } = useQuery({
    queryKey: ['organization', 'feature-flags'],
    queryFn: listFeatureFlags,
  });

  // Profile Form state initialized from query
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});

  // Mutations
  const updateSchoolMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateSchool>[1]) => updateSchool(selectedSchoolId!, data),
    onSuccess: () => {
      toast.success('School profile and regional preferences updated');
      void queryClient.invalidateQueries({ queryKey: ['school', selectedSchoolId] });
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Update failed'),
  });

  const createCampusMutation = useMutation({
    mutationFn: (data: Parameters<typeof createCampus>[0]) => createCampus(data),
    onSuccess: () => {
      toast.success('New campus created successfully');
      setIsCampusModalOpen(false);
      setNewCampus({ name: '', code: '', address: '', capacity: 500, phone: '' });
      void queryClient.invalidateQueries({ queryKey: ['campuses', selectedSchoolId] });
      void queryClient.invalidateQueries({ queryKey: ['organization', 'subscription'] });
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Failed to create campus'),
  });

  const deleteCampusMutation = useMutation({
    mutationFn: deleteCampus,
    onSuccess: () => {
      toast.success('Campus deleted');
      void queryClient.invalidateQueries({ queryKey: ['campuses', selectedSchoolId] });
      void queryClient.invalidateQueries({ queryKey: ['organization', 'subscription'] });
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Failed to delete campus'),
  });

  const createEventMutation = useMutation({
    mutationFn: (data: Parameters<typeof createCalendarEvent>[1]) => createCalendarEvent(selectedSchoolId!, data),
    onSuccess: () => {
      toast.success('Calendar event scheduled');
      setIsEventModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['calendar-events', selectedSchoolId] });
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Failed to add event'),
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      toast.success('Calendar event deleted');
      void queryClient.invalidateQueries({ queryKey: ['calendar-events', selectedSchoolId] });
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => toggleFeatureFlag(key, enabled),
    onSuccess: () => {
      toast.success('Feature flag state updated');
      void queryClient.invalidateQueries({ queryKey: ['organization', 'feature-flags'] });
    },
  });

  const onboardMutation = useMutation({
    mutationFn: onboardSchool,
    onSuccess: () => {
      toast.success('School onboarded successfully with campus, academic year, and default policies!');
      setIsOnboardingOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['schools'] });
      void queryClient.invalidateQueries({ queryKey: ['contexts'] });
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Onboarding failed'),
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolMutation.mutate(profileForm);
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onboardMutation.mutate({
      ...onboardForm,
      termNames: onboardForm.termNames.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization & School Management</h1>
          <p className="text-sm text-muted-foreground">
            Configure school profiles, branches, academic calendars, policies, SaaS quotas, and feature flags.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsOnboardingOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" /> Onboard New School
          </Button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('profile')}
          className="gap-2"
        >
          <Building2 className="h-4 w-4" /> Profile & Branding
        </Button>
        <Button
          variant={activeTab === 'campuses' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('campuses')}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" /> Campuses & Branches
        </Button>
        <Button
          variant={activeTab === 'calendar' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('calendar')}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" /> Academic Calendar
        </Button>
        <Button
          variant={activeTab === 'policies' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('policies')}
          className="gap-2"
        >
          <Sliders className="h-4 w-4" /> Policies & Grading
        </Button>
        <Button
          variant={activeTab === 'subscription' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('subscription')}
          className="gap-2"
        >
          <CreditCard className="h-4 w-4" /> Subscription & Quotas
        </Button>
        <Button
          variant={activeTab === 'features' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('features')}
          className="gap-2"
        >
          <Shield className="h-4 w-4" /> Feature Flags
        </Button>
      </div>

      {/* Tab: Profile & Branding */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>School Profile & Regional Settings</CardTitle>
            <CardDescription>
              General institutional details, contact information, timezone, locale, and operational currency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSchoolLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading school details...</div>
            ) : (
              <form onSubmit={handleProfileSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    defaultValue={schoolDetails?.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={!canManage}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="schoolCode">School Code</Label>
                  <Input id="schoolCode" defaultValue={schoolDetails?.code} disabled />
                </div>
                <div>
                  <Label htmlFor="email">Official Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={schoolDetails?.email ?? ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Official Phone</Label>
                  <Input
                    id="phone"
                    defaultValue={schoolDetails?.phone ?? ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Physical Address</Label>
                  <Input
                    id="address"
                    defaultValue={schoolDetails?.address ?? ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    defaultValue={schoolDetails?.website ?? ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <Label htmlFor="taxId">Tax Identification Number (TIN)</Label>
                  <Input
                    id="taxId"
                    defaultValue={schoolDetails?.taxId ?? ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, taxId: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    defaultValue={schoolDetails?.timezone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, timezone: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency Code</Label>
                  <Input
                    id="currency"
                    defaultValue={schoolDetails?.currency}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, currency: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="logoUrl">School Logo URL</Label>
                  <Input
                    id="logoUrl"
                    defaultValue={schoolDetails?.logoUrl ?? ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>

                {canManage && (
                  <div className="sm:col-span-2 flex justify-end pt-4">
                    <Button type="submit" disabled={updateSchoolMutation.isPending} className="gap-2">
                      <Save className="h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Campuses & Branches */}
      {activeTab === 'campuses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Campuses & Branch Network</h2>
              <p className="text-xs text-muted-foreground">Manage physical campuses, student capacities, and facility allocations.</p>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsCampusModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Branch Campus
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campuses?.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{c.name}</CardTitle>
                    <Badge variant="outline">{c.code}</Badge>
                  </div>
                  <CardDescription className="text-xs">{c.address ?? 'No address provided'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-xs">
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Max Capacity:</span>
                    <span className="font-medium">{c.capacity ? `${c.capacity} students` : 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enrolled Students:</span>
                    <span className="font-medium">{c._count?.students ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staff Assigned:</span>
                    <span className="font-medium">{c._count?.staff ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classrooms / Rooms:</span>
                    <span className="font-medium">{c._count?.rooms ?? 0}</span>
                  </div>

                  {canManage && (
                    <div className="flex justify-end pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-7 px-2 text-xs gap-1"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete campus "${c.name}"?`)) {
                            deleteCampusMutation.mutate(c.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Academic Calendar */}
      {activeTab === 'calendar' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Academic Calendar Events & Holidays</CardTitle>
              <CardDescription>Scheduled holidays, examination periods, term breaks, and school activities.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsEventModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Event
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {calendarEvents?.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No calendar events scheduled yet.</div>
            ) : (
              <div className="divide-y rounded-md border">
                {calendarEvents?.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge variant="secondary" className="text-[10px]">{event.type}</Badge>
                        {event.affectsAttendance && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                            No Attendance
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString()} — {new Date(event.endDate).toLocaleDateString()}
                        {event.description ? ` • ${event.description}` : ''}
                      </p>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Policies & Grading Scales */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grading Scale & Letter Bands</CardTitle>
              <CardDescription>Configured score thresholds and GPA weights.</CardDescription>
            </CardHeader>
            <CardContent>
              {schoolDetails?.gradingScales?.map((scale) => (
                <div key={scale.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{scale.name}</span>
                    <Badge variant="outline">{scale.type}</Badge>
                  </div>
                  <div className="divide-y rounded border text-xs">
                    {scale.bands?.map((b) => (
                      <div key={b.grade} className="flex justify-between p-2">
                        <span className="font-bold text-primary">{b.grade}</span>
                        <span>{b.minPercentage}% – {b.maxPercentage}%</span>
                        <span className="text-muted-foreground">GPA: {b.gpaValue ?? 'N/A'}</span>
                        <span className="text-muted-foreground">{b.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurable Institutional Policies</CardTitle>
              <CardDescription>Attendance thresholds, finance rules, and passing standards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {schoolDetails?.policies?.map((policy) => (
                <div key={policy.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{policy.name}</span>
                    <Badge variant="secondary">{policy.category}</Badge>
                  </div>
                  <p className="text-muted-foreground">{policy.description}</p>
                  <pre className="mt-2 rounded bg-muted/50 p-2 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(policy.value, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Subscription & Quotas */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active SaaS Plan</CardDescription>
                <CardTitle className="text-2xl font-bold uppercase text-primary">
                  {subscriptionInfo?.subscription.plan ?? 'GROWTH'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{subscriptionInfo?.subscription.status ?? 'ACTIVE'}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Registered Schools</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {subscriptionInfo?.usage.schools.current ?? 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                In this organization
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Storage Quota</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {Math.round((subscriptionInfo?.subscription.storageLimitMb ?? 5120) / 1024)} GB
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Cloud documents & media
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Quota Utilization</CardTitle>
              <CardDescription>Resource capacities enforced across all schools and campuses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Students Quota */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Students Registered</span>
                  <span>
                    {subscriptionInfo?.usage.students.current} / {subscriptionInfo?.usage.students.limit} ({subscriptionInfo?.usage.students.utilizationPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, subscriptionInfo?.usage.students.utilizationPercent ?? 0)}%` }}
                  />
                </div>
              </div>

              {/* Staff Quota */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Faculty & Staff Members</span>
                  <span>
                    {subscriptionInfo?.usage.staff.current} / {subscriptionInfo?.usage.staff.limit} ({subscriptionInfo?.usage.staff.utilizationPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all"
                    style={{ width: `${Math.min(100, subscriptionInfo?.usage.staff.utilizationPercent ?? 0)}%` }}
                  />
                </div>
              </div>

              {/* Campus Quota */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Branches & Campuses</span>
                  <span>
                    {subscriptionInfo?.usage.campuses.current} / {subscriptionInfo?.usage.campuses.limit} ({subscriptionInfo?.usage.campuses.utilizationPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, subscriptionInfo?.usage.campuses.utilizationPercent ?? 0)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Feature Flags */}
      {activeTab === 'features' && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant-Level Feature Flags</CardTitle>
            <CardDescription>
              Toggle modular subsystem access and compliance controls across all tenant schools.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {featureFlags?.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{flag.description}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{flag.key}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {flag.enabled ? 'Module enabled and accessible' : 'Module locked'}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFlagMutation.mutate({ key: flag.key, enabled: !flag.enabled })}
                  >
                    {flag.enabled ? (
                      <ToggleRight className="h-6 w-6 text-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modal: Add Campus */}
      {isCampusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle>Add School Campus / Branch</CardTitle>
              <CardDescription>Create an independent facility branch subject to your subscription quota.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 py-2">
              <div>
                <Label>Campus Name</Label>
                <Input
                  placeholder="e.g. West Campus"
                  value={newCampus.name}
                  onChange={(e) => setNewCampus((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Campus Code</Label>
                <Input
                  placeholder="e.g. WEST"
                  value={newCampus.code}
                  onChange={(e) => setNewCampus((prev) => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div>
                <Label>Physical Address</Label>
                <Input
                  placeholder="Street address / Zone"
                  value={newCampus.address}
                  onChange={(e) => setNewCampus((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div>
                <Label>Student Capacity</Label>
                <Input
                  type="number"
                  value={newCampus.capacity}
                  onChange={(e) => setNewCampus((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0 border-t mt-4">
              <Button variant="outline" onClick={() => setIsCampusModalOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createCampusMutation.mutate({ ...newCampus, schoolId: selectedSchoolId! })}
                disabled={createCampusMutation.isPending || !newCampus.name || !newCampus.code}
              >
                Create Campus
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Add Calendar Event */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
              <CardTitle>Schedule Academic Calendar Event</CardTitle>
              <CardDescription>Define school holidays, term breaks, or exam sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 py-2">
              <div>
                <Label>Event Title</Label>
                <Input
                  placeholder="e.g. Midterm Examinations"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Event Category</Label>
                <select
                  className="w-full rounded-md border p-2 text-sm bg-transparent"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="HOLIDAY">Official Public Holiday</option>
                  <option value="EXAM_PERIOD">Exam Period</option>
                  <option value="TERM_BREAK">Term Break</option>
                  <option value="TEACHER_TRAINING">Staff Training Day</option>
                  <option value="EVENT">Sports or Cultural Event</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0 border-t mt-4">
              <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createEventMutation.mutate(newEvent)}
                disabled={createEventMutation.isPending || !newEvent.title || !newEvent.startDate}
              >
                Schedule Event
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: School Registration & Onboarding Wizard */}
      {isOnboardingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle>School Registration & Onboarding Wizard</CardTitle>
              <CardDescription>
                Launch a complete school with foundational campus, academic year, grading scale, and policies.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleOnboardSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>School Name</Label>
                  <Input
                    required
                    placeholder="e.g. Addis International Academy"
                    value={onboardForm.name}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>School Code</Label>
                  <Input
                    required
                    placeholder="e.g. AIA"
                    value={onboardForm.code}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, code: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="admin@aia.edu.et"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    placeholder="+251 911 000000"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-2">Main Campus Branch</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Main Campus Name</Label>
                    <Input
                      required
                      value={onboardForm.mainCampusName}
                      onChange={(e) => setOnboardForm((p) => ({ ...p, mainCampusName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Main Campus Code</Label>
                    <Input
                      required
                      value={onboardForm.mainCampusCode}
                      onChange={(e) => setOnboardForm((p) => ({ ...p, mainCampusCode: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-2">Initial Academic Calendar</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Academic Year Name</Label>
                    <Input
                      required
                      value={onboardForm.academicYearName}
                      onChange={(e) => setOnboardForm((p) => ({ ...p, academicYearName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      required
                      value={onboardForm.academicYearStartDate}
                      onChange={(e) => setOnboardForm((p) => ({ ...p, academicYearStartDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      required
                      value={onboardForm.academicYearEndDate}
                      onChange={(e) => setOnboardForm((p) => ({ ...p, academicYearEndDate: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Terms (comma separated)</Label>
                    <Input
                      value={onboardForm.termNames}
                      onChange={(e) => setOnboardForm((p) => ({ ...p, termNames: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsOnboardingOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={onboardMutation.isPending} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Finish Onboarding
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
