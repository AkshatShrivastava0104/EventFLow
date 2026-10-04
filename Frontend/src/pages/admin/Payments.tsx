import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CreditCard, IndianRupee, ReceiptText } from 'lucide-react';
import { OrgsAPI, PaymentsAPI } from '../../lib/queries';
import { fmtDate, fmtMoney } from '../../lib/utils';
import { RevenueChart } from '../../components/admin/RevenueChart';

interface PaymentRecord {
  id: number;
  user_name: string;
  user_email: string;
  event_title: string;
  order_id: string;
  payment_id?: string;
  created_at: string;
  status: string;
  amount: number;
}

interface OrganizationPaymentData {
  payments: PaymentRecord[];
  revenue: number;
}

const NO_PAYMENTS: PaymentRecord[] = [];

export function AdminPayments() {
  const [search, setSearch] = useState('');
  const { data: organizations = [], isLoading: organizationsLoading } = useQuery({
    queryKey: ['organizations', 'admin'],
    queryFn: () => OrgsAPI.list(),
  });
  const organization = organizations[0];
  const organizationId = organization?.id;

  const { data, isLoading, isError } = useQuery<OrganizationPaymentData>({
    queryKey: ['organization-payments', organizationId],
    queryFn: () => PaymentsAPI.organization(organizationId!),
    enabled: Boolean(organizationId),
  });
  const payments = data?.payments ?? NO_PAYMENTS;
  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((payment) =>
      [
        payment.user_name,
        payment.user_email,
        payment.event_title,
        payment.order_id,
        payment.payment_id,
      ].some((value) => String(value ?? '').toLowerCase().includes(term)),
    );
  }, [payments, search]);

  if (organizationsLoading) {
    return <div className="p-8 text-sm text-ink-500">Loading organization payments…</div>;
  }
  if (!organizationId) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-8 text-center">
        <CreditCard className="mx-auto h-8 w-8 text-ink-300" />
        <h2 className="mt-3 font-semibold text-ink-900">No organization found</h2>
        <p className="mt-1 text-sm text-ink-500">Create or join an organization to view its payments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-brand-600">Organization finances</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-ink-900">Payments</h1>
        <p className="mt-1 text-sm text-ink-500">
          Sandbox ticket payments for {organization.name}. All amounts are shown in INR.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Captured ticket revenue"
          value={fmtMoney(Number(data?.revenue ?? 0))}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <SummaryCard
          label="Payment attempts"
          value={isLoading ? '—' : payments.length}
          icon={<ReceiptText className="h-5 w-5" />}
        />
      </div>

      <RevenueChart organizationId={organizationId} />

      <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">Payment history</h2>
            <p className="text-xs text-ink-500">Payer-level transaction details, including failed attempts.</p>
          </div>
          <label className="relative block sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search user, email, event or payment"
              className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
        </div>

        {isError ? (
          <div className="p-8 text-center text-sm text-red-600">Unable to load payments. Please retry.</div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-ink-500">Loading payments…</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">No payments match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Payer</th>
                  <th className="px-4 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Payment ID</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{payment.user_name || 'Attendee'}</p>
                      <p className="text-xs text-ink-500">{payment.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{payment.event_title || 'Event'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">{payment.payment_id || payment.order_id}</td>
                    <td className="px-4 py-3 text-ink-600">{fmtDate(payment.created_at, 'MMM d, yyyy · p')}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        payment.status === 'succeeded'
                          ? 'bg-emerald-50 text-emerald-700'
                          : payment.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink-900">{fmtMoney(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
        <span className="text-brand-600">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
