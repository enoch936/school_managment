import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="h-6 w-6" aria-hidden />
          School Management System
        </Link>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Everything your school needs</h2>
          <p className="text-primary-foreground/80">
            Manage admissions, academics, attendance, examinations, and finance with confidence.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} School Management System
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
