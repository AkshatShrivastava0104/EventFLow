import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Check, CreditCard, ShieldCheck } from 'lucide-react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentsAPI } from '../../lib/queries';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { fmtMoney } from '../../lib/utils';

type Plan = 'pro' | 'plus';

export function OrganizerStart() {
  const [searchParams] = useSearchParams();
  const [plan, setPlan] = useState<Plan>(
    searchParams.get('plan') === 'plus' ? 'plus' : 'pro',
  );
  const [organizationName, setOrganizationName] = useState('');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const { refreshUser, user } = useAuth();
  const paymentOrderKey = `ef.organizer.${user?.id ?? 'user'}.order.v2`;
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(() =>
    sessionStorage.getItem(paymentOrderKey),
  );
  const navigate = useNavigate();

  const activate = useMutation({
    mutationFn: async () => {
      const name = organizationName.trim();
      if (!name) throw new Error('Enter your organization name.');

      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 4) throw new Error('Enter a sandbox test card.');
      let orderId: string;
      if (paymentOrderId) {
        orderId = paymentOrderId;
      } else {
        const intent = await PaymentsAPI.createIntent({
          purpose: 'subscription',
          plan,
          organization_name: name,
        });
        orderId = intent.order_id;
        sessionStorage.setItem(paymentOrderKey, orderId);
        setPaymentOrderId(orderId);
      }
      const payment = await PaymentsAPI.confirm({
        order_id: orderId,
        test_card_last_four: digits.slice(-4),
      });
      if (payment.status !== 'succeeded') {
        sessionStorage.removeItem(paymentOrderKey);
        setPaymentOrderId(null);
        throw new Error('Sandbox payment declined. Use a card ending in 4242 to succeed.');
      }
    },
    onSuccess: async () => {
      sessionStorage.removeItem(paymentOrderKey);
      await refreshUser();
      toast.success('Organizer workspace is ready.');
      navigate('/admin', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(
        (isAxiosError<{ error?: string }>(error) ? error.response?.data?.error : undefined) ??
        (error instanceof Error ? error.message : undefined) ??
        'Could not activate your organizer workspace.',
      );
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Become an organizer</p>
        <h1 className="font-display mt-2 text-4xl font-semibold text-ink-900">Choose your workspace plan</h1>
        <p className="mt-3 text-ink-500">Choose Pro at ₹999/month or Plus at ₹2,499/month. Sandbox checkout simulates the first payment without auto-renewal or a real charge.</p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
        <PlanCard
          name="Pro"
          price={`${fmtMoney(999)}/month`}
          description="For community organizers"
          selected={plan === 'pro'}
          onChoose={() => setPlan('pro')}
          disabled={Boolean(paymentOrderId)}
          features={['Up to 100 attendees per event', 'QR check-in', 'Basic analytics']}
        />
        <PlanCard
          name="Plus"
          price={`${fmtMoney(2499)}/month`}
          description="For growing clubs and studios"
          selected={plan === 'plus'}
          onChoose={() => setPlan('plus')}
          disabled={Boolean(paymentOrderId)}
          features={['Unlimited attendees', 'Custom branding', 'Staff roles and permissions', 'Priority support']}
        />
      </div>

      <form
        className="mx-auto mt-6 max-w-3xl rounded-2xl border border-ink-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          activate.mutate();
        }}
      >
        <h2 className="font-display text-xl font-semibold text-ink-900">Workspace details</h2>
        <div className="mt-4 max-w-xl">
          <Input
            label="Organization name"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            required
            maxLength={100}
            placeholder="e.g. Bengaluru Tech Community"
            disabled={Boolean(paymentOrderId)}
          />
        </div>

        <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 text-brand-600" />
            <div className="flex-1">
              <p className="font-semibold text-ink-900">Sandbox subscription payment</p>
              <p className="mt-1 text-sm text-ink-600">
                {fmtMoney(plan === 'pro' ? 999 : 2499)} per month · INR only · no real charge.
              </p>
              <div className="mt-3 max-w-md">
                <Input
                  label="Sandbox card number"
                  value={cardNumber}
                  inputMode="numeric"
                  onChange={(event) => setCardNumber(event.target.value)}
                />
                <p className="mt-2 text-xs text-ink-500">
                  Use a card ending in 4242 to succeed or 0002 to simulate a decline.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-xs text-ink-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {`${plan === 'pro' ? 'Pro' : 'Plus'} admin access is enabled only after successful payment.`}
          </p>
          <Button type="submit" loading={activate.isPending}>
            {`Pay ${fmtMoney(plan === 'pro' ? 999 : 2499)} and start`}
          </Button>
        </div>
      </form>
    </main>
  );
}

function PlanCard({
  name,
  price,
  description,
  selected,
  onChoose,
  disabled,
  features,
}: {
  name: string;
  price: string;
  description: string;
  selected: boolean;
  onChoose: () => void;
  disabled: boolean;
  features: string[];
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      className={`rounded-2xl border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
        selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-ink-200 bg-white'
      }`}
    >
      <span className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">{name}</span>
        {selected && <Check className="h-5 w-5 text-brand-600" />}
      </span>
      <span className="mt-2 block font-display text-3xl font-semibold text-ink-900">{price}</span>
      <span className="mt-1 block text-sm text-ink-500">{description}</span>
      <span className="mt-4 grid gap-2">
        {features.map((feature) => (
          <span key={feature} className="flex items-center gap-2 text-sm text-ink-700">
            <Check className="h-4 w-4 text-emerald-600" />
            {feature}
          </span>
        ))}
      </span>
    </button>
  );
}
