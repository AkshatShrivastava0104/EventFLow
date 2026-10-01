import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Lock, Shield } from 'lucide-react';
import { EventsAPI, PaymentsAPI, RegistrationsAPI } from '../../lib/queries';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OrderSummary, Stepper } from './RegisterEvent';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface Checkout {
  event_id: number; name: string; email: string; phone: string;
  qty: number; ticket_type: string; total: number;
}

export function CheckoutPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [gateway, setGateway] = useState<'stripe' | 'razorpay'>('stripe');
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [saveCard, setSaveCard] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem('ef.checkout');
    if (raw) setCheckout(JSON.parse(raw));
    else nav(`/events/${id}/register`);
  }, [id, nav]);

  const { data: event } = useQuery({ queryKey: ['event', id], queryFn: () => EventsAPI.get(id!), enabled: !!id });

  const pay = useMutation({
    mutationFn: async () => {
      if (!event || !checkout || !user) throw new Error('missing state');
      const feeRate = 0.03;
      const grand = checkout.total + checkout.total * feeRate;
      const intent = await PaymentsAPI.createIntent({ amount: grand, currency: event.currency, event_id: event.id });
      const paid = await PaymentsAPI.confirm({ order_id: intent.order_id, card });
      const { registration } = await RegistrationsAPI.create({
        event_id: event.id,
        user_id: String(user.id),
        user_name: checkout.name,
        user_email: checkout.email,
        user_phone: checkout.phone,
        ticket_type: checkout.ticket_type,
        quantity: checkout.qty,
        total_amount: grand,
        payment_status: 'paid',
        payment_id: paid.payment_id,
      });
      return registration;
    },
    onSuccess: (reg) => { sessionStorage.removeItem('ef.checkout'); nav(`/registrations/${reg.id}/success`); },
    onError: (e: any) => toast.error(e.message || 'Payment failed'),
  });

  if (!event || !checkout) return <div className="p-10 text-center text-ink-500">Loading checkout…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button onClick={() => nav(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Back</button>
      <Stepper current={2} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="font-display text-xl font-semibold">Choose payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <GatewayOption id="stripe" active={gateway === 'stripe'} onClick={() => setGateway('stripe')}
                title="Stripe" subtitle="Cards, Apple Pay, Google Pay" logo="stripe" />
              <GatewayOption id="razorpay" active={gateway === 'razorpay'} onClick={() => setGateway('razorpay')}
                title="Razorpay" subtitle="UPI, Netbanking, Wallets" logo="razorpay" />
            </div>
          </div>

          <motion.div key={gateway} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="font-display text-xl font-semibold">Card details</h2>
            <p className="mt-1 text-xs text-ink-500 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Encrypted via {gateway === 'stripe' ? 'Stripe' : 'Razorpay'}. We never store your card.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px_100px]">
              <Input label="Card number" icon={<CreditCard className="h-4 w-4" />} value={card} onChange={(e) => setCard(e.target.value)} />
              <Input label="Expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" />
              <Input label="CVC" type="password" value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="•••" />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="h-4 w-4 accent-brand-500" />
              Save this card for faster checkout next time
            </label>
            <p className="mt-3 text-xs text-ink-500">Test cards: <code className="font-mono">4242…4242</code> succeeds. <code className="font-mono">…0002</code> is declined.</p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500 inline-flex items-center gap-1"><Shield className="h-3 w-3" /> PCI-DSS Level 1 compliant checkout.</p>
            <Button size="lg" variant="secondary" onClick={() => pay.mutate()} loading={pay.isPending}>Pay & register</Button>
          </div>
        </div>
        <OrderSummary event={event} qty={checkout.qty} ticketType={checkout.ticket_type} total={checkout.total} isFree={false} />
      </div>
    </div>
  );
}

function GatewayOption({ id, active, onClick, title, subtitle, logo }: { id: string; active: boolean; onClick: () => void; title: string; subtitle: string; logo: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${active ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-ink-200 hover:border-ink-400'}`}>
      <div className={`flex h-10 w-14 items-center justify-center rounded-md text-xs font-bold text-white ${logo === 'stripe' ? 'bg-[#635bff]' : 'bg-[#0c2451]'}`}>{title.slice(0, 2).toUpperCase()}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-ink-500">{subtitle}</p>
      </div>
      <input type="radio" checked={active} readOnly className="ml-auto accent-brand-500" />
    </button>
  );
}
