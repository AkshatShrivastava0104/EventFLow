import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export function OwnerSettings() {
  const [payoutMethod, setPayoutMethod] = useState('stripe');
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-ink-500">Manage payouts, integrations and preferences.</p>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Payouts</h3>
        <Select label="Payment gateway" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
          <option value="stripe">Stripe — US/EU/AU/UK</option>
          <option value="razorpay">Razorpay — India</option>
          <option value="paypal">PayPal — Global</option>
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Bank name" placeholder="Northwind Bank" />
          <Input label="Account number" placeholder="•••• 4212" />
        </div>
        <div className="flex justify-end"><Button variant="secondary" onClick={() => toast.success('Payout details saved')}>Save</Button></div>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Integrations</h3>
        {[
          ['Slack', 'Post ticket sales to a channel', 'Connected'],
          ['Mailchimp', 'Sync attendees to a mailing list', 'Not connected'],
          ['Zoom', 'Auto-create meetings for virtual events', 'Not connected'],
        ].map(([name, desc, status]) => (
          <div key={name} className="flex items-center justify-between rounded-xl border border-ink-200 p-4">
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-ink-500">{desc}</p>
            </div>
            <Button variant={status === 'Connected' ? 'outline' : 'secondary'} size="sm">{status === 'Connected' ? 'Manage' : 'Connect'}</Button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-display text-lg font-semibold text-red-800">Danger zone</h3>
        <p className="mt-1 text-sm text-red-700">Deleting your organization is permanent. All events, tickets and staff will be removed.</p>
        <Button variant="danger" className="mt-4" onClick={() => toast.error('This is a demo — nothing was deleted')}>Delete organization</Button>
      </div>
    </div>
  );
}
