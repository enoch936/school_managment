'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, CalendarRange, Clock, User, DoorOpen, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { timetablesApi } from '@/features/timetables/api';
import type { School, ClassEntity, Subject, Teacher } from '@/lib/api/domain';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

export default function TimetablesPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('timetable:manage');

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get<ClassEntity[]>('/classes', { query: { pageSize: 50 } }),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<Subject[]>('/subjects', { query: { pageSize: 50 } }),
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.get<any>('/teachers', { query: { pageSize: 50 } }),
  });

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });

  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const teachers: Teacher[] = useMemo(() => teachersQuery.data?.data ?? [], [teachersQuery.data]);
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);

  // Set default classId when classes load
  const activeClassId = selectedClassId || (classes[0]?.id ?? '');
  const activeClass = useMemo(() => classes.find((c) => c.id === activeClassId), [classes, activeClassId]);

  const timetableQuery = useQuery({
    queryKey: ['timetables', { classId: activeClassId, dayOfWeek: selectedDay }],
    queryFn: () =>
      timetablesApi.list({
        classId: activeClassId || undefined,
        dayOfWeek: selectedDay,
      }),
    enabled: !!activeClassId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timetablesApi.delete(id),
    onSuccess: () => {
      toast.success('Period removed from schedule');
      void queryClient.invalidateQueries({ queryKey: ['timetables'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove period');
    },
  });

  const entries = timetableQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timetables & Scheduling</h1>
          <p className="text-sm text-muted-foreground">
            Manage class schedules with automated teacher and room collision detection.
          </p>
        </div>
        {canManage && activeClass && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Period Slot
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Select Class:</Label>
          <select
            aria-label="Select class"
            value={activeClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-md border border-input bg-background p-2 text-sm sm:w-48"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex overflow-x-auto rounded-lg border border-border bg-card p-1">
          {DAYS.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedDay === day.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {day.name}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-primary" />
            {DAYS.find((d) => d.id === selectedDay)?.name} Schedule — {activeClass?.name ?? 'Select class'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timetableQuery.isLoading && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!timetableQuery.isLoading && entries.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No periods scheduled for {DAYS.find((d) => d.id === selectedDay)?.name}.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {entry.startTime} - {entry.endTime}
                    </Badge>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold">{entry.subject?.name ?? 'Subject'}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{entry.subject?.code}</p>
                </div>

                <div className="mt-4 border-t border-border pt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {entry.teacher
                        ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
                        : 'Unassigned Teacher'}
                    </span>
                  </div>
                  {entry.room && (
                    <div className="flex items-center gap-1.5">
                      <DoorOpen className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Room {entry.room.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Slot Modal */}
      {showAddModal && activeClass && (
        <CreateTimetableModal
          classEntity={activeClass}
          dayOfWeek={selectedDay}
          subjects={subjects}
          teachers={teachers}
          schools={schools}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            void queryClient.invalidateQueries({ queryKey: ['timetables'] });
          }}
        />
      )}
    </div>
  );
}

function CreateTimetableModal({
  classEntity,
  dayOfWeek,
  subjects,
  teachers,
  schools,
  onClose,
  onSuccess,
}: {
  classEntity: ClassEntity;
  dayOfWeek: number;
  subjects: Subject[];
  teachers: Teacher[];
  schools: School[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? '');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('09:15');

  const mutation = useMutation({
    mutationFn: () =>
      timetablesApi.create({
        schoolId: classEntity.schoolId,
        academicYearId: classEntity.academicYearId,
        classId: classEntity.id,
        subjectId,
        teacherId: teacherId || undefined,
        dayOfWeek,
        startTime,
        endTime,
      }),
    onSuccess: () => {
      toast.success('Period scheduled successfully');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Collision detected or schedule conflict');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Schedule Period Slot</CardTitle>
          <p className="text-xs text-muted-foreground">
            {classEntity.name} — {DAYS.find((d) => d.id === dayOfWeek)?.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Subject *</Label>
            <select
              aria-label="Select subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Teacher (Optional)</Label>
            <select
              aria-label="Select teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
            >
              <option value="">No teacher assigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !subjectId || !startTime || !endTime}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Period
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
