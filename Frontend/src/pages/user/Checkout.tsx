import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Lock, Shield } from 'lucide-react';
import { isAxiosError } from 'axios';
import { EventsAPI, PaymentsAPI, RegistrationsAPI } from '../../lib/queries';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OrderSummary, Stepper } from './RegisterEvent';
import toast from 'react-hot-toast';

interface Checkout {
  event_id: number;
  name: string;
  email: string;
  phone: string;
  qty: number;
  ticket_type: string;
  total: number;
}

export function CheckoutPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [checkout] = useState<Checkout | null>(() => {
    const raw = sessionStorage.getItem('ef.checkout');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Checkout;
    } catch {
      return null;
    }
  });
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [orderId, setOrderId] = useState<string | null>(() =>
    id ? sessionStorage.getItem(`ef.payment.${id}.order`) : null,
  );
  const [successfulPaymentId, setSuccessfulPaymentId] = useState<string | null>(() =>
    id ? sessionStorage.getItem(`ef.payment.${id}.payment`) : null,
  );

  useEffect(() => {
    if (!checkout || checkout.event_id !== Number(id)) {
      sessionStorage.removeItem('ef.checkout');
      nav(`/events/${id}/register`);
    }
  }, [checkout, id, nav]);

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => EventsAPI.get(id!),
    enabled: !!id,
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!event || !checkout) throw new Error('Checkout details are missing.');
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 4) throw new Error('Enter a test card number.');

      let activeOrderId: string;
      if (orderId) {
        activeOrderId = orderId;
      } else {
        const intent = await PaymentsAPI.createIntent({
          purpose: 'event',
          event_id: event.id,
          quantity: checkout.qty,
        });
        activeOrderId = intent.order_id;
        sessionStorage.setItem(`ef.payment.${event.id}.order`, activeOrderId);
        setOrderId(activeOrderId);
      }

      let paymentId: string;
      if (successfulPaymentId) {
        paymentId = successfulPaymentId;
      } else {
        const payment = await PaymentsAPI.confirm({
          order_id: activeOrderId,
          test_card_last_four: digits.slice(-4),
        });
        if (payment.status !== 'succeeded' || !payment.payment_id) {
          sessionStorage.removeItem(`ef.payment.${event.id}.order`);
          setOrderId(null);
          throw new Error('Sandbox payment declined. Use a card ending in 4242 to succeed.');
        }
        paymentId = payment.payment_id;
        sessionStorage.setItem(`ef.payment.${event.id}.payment`, paymentId);
        setSuccessfulPaymentId(paymentId);
      }

      return RegistrationsAPI.create({
        event_id: event.id,
        quantity: checkout.qty,
        payment_id: paymentId,
      });
    },
    onSuccess: (response) => {
      sessionStorage.removeItem('ef.checkout');
      if (id) {
        sessionStorage.removeItem(`ef.payment.${id}.order`);
        sessionStorage.removeItem(`ef.payment.${id}.payment`);
      }
      const registrationId =
        response?.registration_id ??
        response?.registration?.id ??
        response?.id;
      if (registrationId) {
        nav(`/registrations/${registrationId}/success`);
      } else {
        nav('/my-registrations');
      }
    },
    onError: (error: unknown) => {
      toast.error(
        (isAxiosError<{ error?: string }>(error) ? error.response?.data?.error : undefined) ??
        (error instanceof Error ? error.message : undefined) ??
        'Payment failed. Please try again.',
      );
    },
  });

  if (!event || !checkout) {
    return <div className="p-10 text-center text-ink-500">Loading checkout…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={() => nav(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <Stepper current={2} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-ink-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">EventFlow sandbox checkout</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Test payment simulation only. No real money is charged. All amounts are in INR.
                </p>
              </div>
            </div>
            <div className="mt-5 max-w-lg">
              <Input
                label="Sandbox card number"
                icon={<CreditCard className="h-4 w-4" />}
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <p className="mt-2 text-xs text-ink-500">
                Test success: card ending in <code className="font-mono">4242</code>. Test decline: ending in <code className="font-mono">0002</code>.
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1 text-xs text-ink-500">
              <Shield className="h-3 w-3" />
              Only the last four test-card digits are sent to the sandbox.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => pay.mutate()}
              loading={pay.isPending}
            >
              <Lock className="mr-2 h-4 w-4" />
              {successfulPaymentId ? 'Complete registration' : 'Pay & register'}
            </Button>
          </div>
        </div>
        <OrderSummary
          event={event}
          qty={checkout.qty}
          ticketType={checkout.ticket_type}
          total={Number(event.price) * checkout.qty}
          isFree={false}
        />
      </div>
    </div>
  );
}
