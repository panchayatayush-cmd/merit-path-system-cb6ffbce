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
  const { user, role } = useAuth();
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);

  // For students, try to get bank details
  const getBankDetails = () => {
    if (!user) return null;
    const stored = localStorage.getItem(`bank_details_${user.id}`);
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (numAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    const bankDetails = getBankDetails();

    // For students, require bank details
    if (role === 'student' && !bankDetails) {
      toast.error('Please save your bank details first in the Bank Details tab');
      return;
    }

    // For non-students, require UPI
    if (role !== 'student' && !upiId.trim()) {
      toast.error('Please enter UPI ID');
      return;
    }

    setLoading(true);
    const insertData: any = {
      user_id: user.id,
      wallet_id: walletId,
      amount: numAmount,
      upi_id: role === 'student' ? (bankDetails?.upi_id || null) : upiId.trim(),
      bank_details: bankDetails ? JSON.stringify(bankDetails) : null,
    };

    const { error } = await supabase.from('withdrawal_requests').insert(insertData);

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

  const bankDetails = getBankDetails();

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

      {role === 'student' ? (
        bankDetails ? (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 space-y-0.5">
            <p className="font-medium text-foreground text-sm mb-1">Bank Details</p>
            <p>Name: {bankDetails.account_holder}</p>
            <p>Bank: {bankDetails.bank_name}</p>
            <p>A/C: {bankDetails.account_number}</p>
            <p>IFSC: {bankDetails.ifsc_code}</p>
            {bankDetails.upi_id && <p>UPI: {bankDetails.upi_id}</p>}
          </div>
        ) : (
          <p className="text-xs text-destructive">⚠ Please save bank details in the Bank Details tab first.</p>
        )
      ) : (
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
      )}

      <Button type="submit" disabled={loading || (role === 'student' && !bankDetails)} className="w-full">
        {loading ? 'Submitting...' : 'Request Withdrawal'}
      </Button>
    </form>
  );
}
