import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Users,
    title: 'Student information',
    description: 'Complete student, guardian, and enrollment records with a full academic history.',
  },
  {
    icon: CalendarCheck,
    title: 'Attendance',
    description: 'Daily and per-period attendance with corrections, alerts, and analytics.',
  },
  {
    icon: BookOpen,
    title: 'Academics & exams',
    description: 'Classes, subjects, timetables, assignments, examinations, and grading.',
  },
  {
    icon: BarChart3,
    title: 'Finance & reports',
    description: 'Fee structures, invoices, payments, and exportable financial and academic reports.',
  },
  {
    icon: GraduationCap,
    title: 'Multi-campus',
    description: 'Run many schools and campuses from a single, securely isolated platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    description: 'Role-based access, tenant isolation, MFA, and full audit trails.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-6 w-6 text-primary" aria-hidden />
            <span>School Management System</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container grid gap-8 py-20 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-medium text-primary">Enterprise school operations</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Run your entire school from one secure platform
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Admissions, academics, attendance, examinations, finance, and communication — built for
              multi-campus institutions that need reliability, security, and clear reporting.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">Start free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
          <Card className="lg:justify-self-end">
            <CardHeader>
              <CardTitle>Built for scale</CardTitle>
              <CardDescription>Designed for thousands of concurrent sessions.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-2xl font-semibold">100k+</div>
                <div className="text-muted-foreground">Registered users target</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">Multi-tenant</div>
                <div className="text-muted-foreground">School &amp; campus isolation</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">RBAC</div>
                <div className="text-muted-foreground">25+ configurable roles</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">Audited</div>
                <div className="text-muted-foreground">Every sensitive action</div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="container grid gap-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-6 w-6 text-primary" aria-hidden />
                <CardTitle className="pt-2 text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} School Management System</span>
          <span>Secure, multi-tenant, and auditable.</span>
        </div>
      </footer>
    </div>
  );
}
