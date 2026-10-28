'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Plus, Search, ArrowUpRight, CheckCircle2, Loader2, Library as LibraryIcon } from 'lucide-react';
import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { Book, Loan, School, Student } from '@/lib/api/domain';
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

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('library:manage');

  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [loaningBook, setLoaningBook] = useState<Book | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  // Books Query
  const booksQuery = useQuery({
    queryKey: ['library-books', { page, search: debouncedSearch }],
    queryFn: () =>
      apiRequestWithMeta<Book>('/library/books', {
        query: { page, pageSize: 20, search: debouncedSearch || undefined },
      }),
    enabled: activeTab === 'catalog',
    placeholderData: (prev) => prev,
  });

  // Active Loans Query
  const loansQuery = useQuery({
    queryKey: ['library-loans', { page }],
    queryFn: () =>
      apiRequestWithMeta<Loan>('/library/loans', {
        query: { page, pageSize: 20 },
      }),
    enabled: activeTab === 'loans',
    placeholderData: (prev) => prev,
  });

  // Return Loan Mutation
  const returnMutation = useMutation({
    mutationFn: (loanId: string) => api.post(`/library/loans/${loanId}/return`, {}),
    onSuccess: () => {
      toast.success('Book successfully returned');
      void queryClient.invalidateQueries({ queryKey: ['library-loans'] });
      void queryClient.invalidateQueries({ queryKey: ['library-books'] });
    },
    onError: () => toast.error('Unable to return book'),
  });

  const books = booksQuery.data?.data ?? [];
  const loans = loansQuery.data?.data ?? [];
  const meta = activeTab === 'catalog' ? booksQuery.data?.meta : loansQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage textbook catalogs, barcode copies, and student borrowing records.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddBook((v) => !v)}>
            <Plus className="h-4 w-4" /> Add Book to Catalog
          </Button>
        )}
      </div>

      {showAddBook && canManage && (
        <CreateBookForm
          onCreated={() => {
            setShowAddBook(false);
            void queryClient.invalidateQueries({ queryKey: ['library-books'] });
          }}
        />
      )}

      {loaningBook && canManage && (
        <CheckoutBookDialog
          book={loaningBook}
          onClose={() => setLoaningBook(null)}
          onLoaned={() => {
            setLoaningBook(null);
            void queryClient.invalidateQueries({ queryKey: ['library-books'] });
            void queryClient.invalidateQueries({ queryKey: ['library-loans'] });
          }}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'catalog' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveTab('catalog');
            setPage(1);
          }}
        >
          <BookOpen className="mr-1.5 h-4 w-4" /> Book Catalog
        </Button>
        <Button
          variant={activeTab === 'loans' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveTab('loans');
            setPage(1);
          }}
        >
          <LibraryIcon className="mr-1.5 h-4 w-4" /> Active Loans & Returns
        </Button>
      </div>

      {activeTab === 'catalog' ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              {meta ? `${meta.total} title${meta.total === 1 ? '' : 's'}` : 'Book Catalog'}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                className="pl-8 sm:w-64"
                placeholder="Search title, author or ISBN"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search catalog"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Copies</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {booksQuery.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={canManage ? 6 : 5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!booksQuery.isLoading && books.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-muted-foreground">
                      No books found in catalog.
                    </TableCell>
                  </TableRow>
                )}
                {books.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>{b.author ?? '-'}</TableCell>
                    <TableCell>
                      {b.category ? <Badge variant="secondary">{b.category}</Badge> : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{b.isbn ?? '-'}</TableCell>
                    <TableCell>{b._count?.copies ?? 0} total</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setLoaningBook(b)}>
                          <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-primary" />
                          Checkout
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {meta ? `${meta.total} active loan${meta.total === 1 ? '' : 's'}` : 'Loans'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Borrowed Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loansQuery.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={canManage ? 6 : 5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!loansQuery.isLoading && loans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-muted-foreground">
                      No active loans currently.
                    </TableCell>
                  </TableRow>
                )}
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      {loan.bookCopy?.book?.title ?? 'Book'}
                    </TableCell>
                    <TableCell>
                      {loan.student
                        ? `${loan.student.firstName} ${loan.student.lastName} (${loan.student.studentNumber})`
                        : '-'}
                    </TableCell>
                    <TableCell>{new Date(loan.borrowedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(loan.dueAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === 'RETURNED' ? 'success' : 'warning'}>
                        {loan.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {loan.status !== 'RETURNED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={returnMutation.isPending}
                            onClick={() => returnMutation.mutate(loan.id)}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                            Return
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Returned</span>
                        )}
                      </TableCell>
                    )}
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

function CreateBookForm({ onCreated }: { onCreated: () => void }) {
  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.get<School[]>('/schools', { query: { pageSize: 50 } }),
  });
  const schools = schoolsQuery.data ?? [];

  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('Science');
  const [copiesCount, setCopiesCount] = useState(5);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/library/books', {
        schoolId: schoolId || schools[0]?.id,
        title,
        author: author || undefined,
        isbn: isbn || undefined,
        category: category || undefined,
        copiesCount: Number(copiesCount),
      }),
    onSuccess: () => {
      toast.success('Book and copies added to catalog');
      onCreated();
    },
    onError: () => toast.error('Unable to add book'),
  });

  const disabled = !title || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Catalog New Book</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bk-school">School</Label>
            <select
              id="bk-school"
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
            <Label htmlFor="bk-title">Book Title</Label>
            <Input id="bk-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bk-author">Author</Label>
            <Input id="bk-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bk-isbn">ISBN / Code</Label>
            <Input id="bk-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bk-cat">Category</Label>
            <Input id="bk-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bk-copies">Initial Copies Count</Label>
            <Input
              id="bk-copies"
              type="number"
              min={1}
              value={copiesCount}
              onChange={(e) => setCopiesCount(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckoutBookDialog({
  book,
  onClose,
  onLoaned,
}: {
  book: Book;
  onClose: () => void;
  onLoaned: () => void;
}) {
  const studentsQuery = useQuery({
    queryKey: ['students-quick'],
    queryFn: () => apiRequestWithMeta<Student>('/students', { query: { pageSize: 50 } }),
  });

  const students = studentsQuery.data?.data ?? [];
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10));

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/library/loans', {
        bookId: book.id,
        studentId: studentId || students[0]?.id,
        dueAt,
      }),
    onSuccess: () => {
      toast.success(`Checked out "${book.title}"`);
      onLoaned();
    },
    onError: () => toast.error('Unable to checkout book'),
  });

  return (
    <Card className="border-primary/50 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">Checkout Book: {book.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="loan-student">Student</Label>
            <select
              id="loan-student"
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
          <div className="space-y-2">
            <Label htmlFor="loan-due">Return Due Date</Label>
            <Input id="loan-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Loan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
