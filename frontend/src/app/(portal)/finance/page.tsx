'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CreditCard,
  DollarSign,
  Plus,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { api, apiRequestWithMeta } from '@/lib/api/client';
import type { FinanceSummary, Invoice, Student } from '@/lib/api/domain';
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

function formatMoney(minorUnits: number, currency = 'ETB') {
  return `${(minorUnits / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

const INVOICE_STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  ISSUED: 'warning',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'destructive',
  VOID: 'secondary',
  REFUNDED: 'secondary',
};

export default function FinancePage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManageInvoice = hasPermission('invoice:manage');
  const canManagePayment = hasPermission('payment:manage');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // Financial Summary KPIs
  const summaryQuery = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => api.get<FinanceSummary>('/finance/summary'),
  });

  // Invoices list
  const invoicesQuery = useQuery({
    queryKey: ['invoices', { page, status }],
    queryFn: () =>
      apiRequestWithMeta<Invoice>('/finance/invoices', {
        query: { page, pageSize: 20, status: status || undefined },
      }),
    placeholderData: (prev) => prev,
  });

  const summary = summaryQuery.data;
  const invoices = invoicesQuery.data?.data ?? [];
  const meta = invoicesQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance & Billing</h1>
          <p className="text-sm text-muted-foreground">
            Track tuition fee invoices, outstanding balances, and payment collections.
          </p>
        </div>
        {canManageInvoice && (
          <Button onClick={() => setShowCreateInvoice((v) => !v)}>
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatMoney(summary.totalInvoicedMinor, summary.currency) : <Skeleton className="h-8 w-32" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary ? `${summary.totalInvoicesCount} invoices issued` : 'Loading metrics...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {summary ? formatMoney(summary.totalCollectedMinor, summary.currency) : <Skeleton className="h-8 w-32" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary ? `${summary.collectionRate}% collection efficiency` : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {summary ? formatMoney(summary.totalOutstandingMinor, summary.currency) : <Skeleton className="h-8 w-32" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receivables pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary ? summary.overdueCount : <Skeleton className="h-8 w-16" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate follow-up</p>
          </CardContent>
        </Card>
      </div>

      {showCreateInvoice && canManageInvoice && (
        <CreateInvoiceForm
          onCreated={() => {
            setShowCreateInvoice(false);
            void queryClient.invalidateQueries({ queryKey: ['invoices'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
          }}
        />
      )}

      {payingInvoice && canManagePayment && (
        <RecordPaymentDialog
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onPaid={() => {
            setPayingInvoice(null);
            void queryClient.invalidateQueries({ queryKey: ['invoices'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
          }}
        />
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {meta ? `${meta.total} invoice${meta.total === 1 ? '' : 's'}` : 'Invoices'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <label htmlFor="inv-status" className="text-sm text-muted-foreground">
              Status:
            </label>
            <select
              id="inv-status"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DRAFT'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                {canManagePayment && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesQuery.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={canManagePayment ? 7 : 6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!invoicesQuery.isLoading && invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManagePayment ? 7 : 6} className="py-10 text-center text-muted-foreground">
                    No invoices recorded.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                  <TableCell className="font-medium">
                    {inv.student ? (
                      <div>
                        {inv.student.firstName} {inv.student.lastName}
                        <div className="text-xs text-muted-foreground">{inv.student.studentNumber}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{formatMoney(inv.totalMinor, inv.currency)}</TableCell>
                  <TableCell className="text-emerald-600">{formatMoney(inv.paidMinor, inv.currency)}</TableCell>
                  <TableCell className="font-semibold text-amber-600">
                    {formatMoney(inv.balanceMinor, inv.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={INVOICE_STATUS_VARIANTS[inv.status] ?? 'secondary'}>
                      {inv.status.toLowerCase().replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  {canManagePayment && (
                    <TableCell className="text-right">
                      {inv.balanceMinor > 0 ? (
                        <Button variant="outline" size="sm" onClick={() => setPayingInvoice(inv)}>
                          <DollarSign className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                          Record payment
                        </Button>
                      ) : (
                        <span className="flex items-center justify-end text-xs text-emerald-600">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Paid in full
                        </span>
                      )}
                    </TableCell>
                  )}
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

function CreateInvoiceForm({ onCreated }: { onCreated: () => void }) {
  const studentsQuery = useQuery({
    queryKey: ['students-quick'],
    queryFn: () => apiRequestWithMeta<Student>('/students', { query: { pageSize: 50 } }),
  });

  const students = studentsQuery.data?.data ?? [];
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('Tuition');
  const [amountMajor, setAmountMajor] = useState(1500); // 1,500.00 ETB
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10));

  const mutation = useMutation({
    mutationFn: () => {
      const selectedStudent = students.find((s) => s.id === studentId);
      if (!selectedStudent) throw new Error('Select a student');

      const amountMinor = Math.round(Number(amountMajor) * 100);
      return api.post('/finance/invoices', {
        schoolId: selectedStudent.schoolId,
        studentId,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        dueDate,
        currency: 'ETB',
        items: [
          {
            category,
            quantity: 1,
            unitMinor: amountMinor,
          },
        ],
      });
    },
    onSuccess: () => {
      toast.success('Invoice issued successfully');
      onCreated();
    },
    onError: (err: Error) => toast.error(err.message || 'Unable to issue invoice'),
  });

  const disabled = !studentId || !amountMajor || mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Issue New Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="inv-stu">Student</Label>
            <select
              id="inv-stu"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.studentNumber})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-cat">Fee Category</Label>
            <Input id="inv-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-amt">Amount (ETB)</Label>
            <Input
              id="inv-amt"
              type="number"
              value={amountMajor}
              onChange={(e) => setAmountMajor(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-due">Due Date</Label>
            <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Invoice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecordPaymentDialog({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: Invoice;
  onClose: () => void;
  onPaid: () => void;
}) {
  const maxMajor = invoice.balanceMinor / 100;
  const [amountMajor, setAmountMajor] = useState(maxMajor);
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/finance/payments', {
        invoiceId: invoice.id,
        amountMinor: Math.round(Number(amountMajor) * 100),
        method,
        reference: reference || undefined,
        idempotencyKey: `pay-${invoice.id}-${Date.now()}`,
      }),
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      onPaid();
    },
    onError: () => toast.error('Unable to record payment'),
  });

  return (
    <Card className="border-primary/50 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">
          Record Payment for {invoice.invoiceNumber} (Balance: {formatMoney(invoice.balanceMinor, invoice.currency)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pay-amt">Amount to pay ({invoice.currency})</Label>
            <Input
              id="pay-amt"
              type="number"
              max={maxMajor}
              value={amountMajor}
              onChange={(e) => setAmountMajor(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-method">Payment Method</Label>
            <select
              id="pay-method"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="BANK_TRANSFER">Bank Transfer (CBE / Awash)</option>
              <option value="TELEBIRR">Telebirr</option>
              <option value="CHAPA">Chapa (Card / Online)</option>
              <option value="CASH">Cash / Cashier</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-ref">Reference / Slip #</Label>
            <Input
              id="pay-ref"
              placeholder="e.g. TXN-10928374"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={amountMajor <= 0 || amountMajor > maxMajor || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
