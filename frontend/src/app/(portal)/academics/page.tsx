'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { AcademicYear, ClassEntity, Subject } from '@/lib/api/domain';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AcademicsPage() {
  const years = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get<AcademicYear[]>('/academic-years', { query: { pageSize: 50 } }),
  });
  const classes = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get<ClassEntity[]>('/classes', { query: { pageSize: 50 } }),
  });
  const subjects = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<Subject[]>('/subjects', { query: { pageSize: 50 } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Academics</h1>
        <p className="text-sm text-muted-foreground">
          Academic years, classes, and subjects for your school.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic years</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Current</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.isLoading && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!years.isLoading && (years.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No academic years yet.
                  </TableCell>
                </TableRow>
              )}
              {years.data?.map((year) => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium">{year.name}</TableCell>
                  <TableCell>{new Date(year.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(year.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>{year.isCurrent && <Badge variant="success">current</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!classes.isLoading && (classes.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No classes yet.
                    </TableCell>
                  </TableRow>
                )}
                {classes.data?.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.academicYear?.name ?? '-'}</TableCell>
                    <TableCell>{cls._count?.enrollments ?? 0}</TableCell>
                    <TableCell>{cls.capacity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subjects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Core</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!subjects.isLoading && (subjects.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No subjects yet.
                    </TableCell>
                  </TableRow>
                )}
                {subjects.data?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-mono text-xs">{subject.code}</TableCell>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.isCore ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
