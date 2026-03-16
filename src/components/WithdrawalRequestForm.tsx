import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface WithdrawalRequestFormProps {
  walletId: string;
  balance: number;
  onSuccess: () => void;
}

export default function WithdrawalRequestForm({ walletId, balance, onSuccess }: WithdrawalRequestFormProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valid amount enter करें');
      return;
    }
    if (numAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!upiId.trim()) {
      toast.error('UPI ID enter करें');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('withdrawal_requests' as any).insert({
      user_id: user.id,
      wallet_id: walletId,
      amount: numAmount,
      upi_id: upiId.trim(),
    } as any);

    if (error) {
      toast.error('Request failed: ' + error.message);
    } else {
      toast.success('Withdrawal request submitted!');
      setAmount('');
      setUpiId('');
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm">Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          placeholder={`Max ₹${balance.toFixed(2)}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          max={balance}
          min={1}
          step="0.01"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="upi" className="text-sm">UPI ID</Label>
        <Input
          id="upi"
          type="text"
          placeholder="example@upi"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Submitting...' : 'Request Withdrawal'}
      </Button>
    </form>
  );
}
