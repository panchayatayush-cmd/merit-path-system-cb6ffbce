import { useState, useEffect } from 'react';
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
  const [centerBankDetails, setCenterBankDetails] = useState<any>(null);

  // For students, get bank details from localStorage
  const getStudentBankDetails = () => {
    if (!user) return null;
    const stored = localStorage.getItem(`bank_details_${user.id}`);
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  };

  // For centers, fetch from DB
  useEffect(() => {
    if (!user || role !== 'center') return;
    const fetchBankDetails = async () => {
      const { data } = await supabase
        .from('center_bank_details' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setCenterBankDetails(data);
    };
    fetchBankDetails();
  }, [user, role]);

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

    const studentBankDetails = getStudentBankDetails();

    // For students, require bank details from localStorage
    if (role === 'student' && !studentBankDetails) {
      toast.error('Please save your bank details first in the Bank Details tab');
      return;
    }

    // For centers, require bank details from DB
    if (role === 'center' && !centerBankDetails) {
      toast.error('Please add your bank details first in the Bank Details tab');
      return;
    }

    // For admins, require UPI
    if (role !== 'student' && role !== 'center' && !upiId.trim()) {
      toast.error('Please enter UPI ID');
      return;
    }

    // Check for pending requests (prevent duplicates)
    const { data: pendingReqs } = await supabase
      .from('withdrawal_requests' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');
    if ((pendingReqs as any[])?.length > 0) {
      toast.error('You already have a pending withdrawal request. Please wait for it to be processed.');
      return;
    }

    setLoading(true);
    const bankDetailsJson = role === 'student'
      ? JSON.stringify(studentBankDetails)
      : role === 'center' && centerBankDetails
        ? JSON.stringify({
            account_holder: (centerBankDetails as any).account_holder_name,
            bank_name: (centerBankDetails as any).bank_name,
            account_number: (centerBankDetails as any).account_number,
            ifsc_code: (centerBankDetails as any).ifsc_code,
            branch_name: (centerBankDetails as any).branch_name,
          })
        : null;

    const insertData: any = {
      user_id: user.id,
      wallet_id: walletId,
      amount: numAmount,
      upi_id: role === 'student'
        ? (studentBankDetails?.upi_id || null)
        : role === 'center'
          ? null
          : upiId.trim(),
      bank_details: bankDetailsJson,
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

  const studentBankDetails = getStudentBankDetails();

  const renderBankInfo = () => {
    if (role === 'student') {
      if (!studentBankDetails) {
        return <p className="text-xs text-destructive">⚠ Please save bank details in the Bank Details tab first.</p>;
      }
      return (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 space-y-0.5">
          <p className="font-medium text-foreground text-sm mb-1">Bank Details</p>
          <p>Name: {studentBankDetails.account_holder}</p>
          <p>Bank: {studentBankDetails.bank_name}</p>
          <p>A/C: {studentBankDetails.account_number}</p>
          <p>IFSC: {studentBankDetails.ifsc_code}</p>
          {studentBankDetails.upi_id && <p>UPI: {studentBankDetails.upi_id}</p>}
        </div>
      );
    }
    if (role === 'center') {
      if (!centerBankDetails) {
        return <p className="text-xs text-destructive">⚠ Please add bank details in the Bank Details tab first.</p>;
      }
      const bd = centerBankDetails as any;
      return (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 space-y-0.5">
          <p className="font-medium text-foreground text-sm mb-1">Bank Details</p>
          <p>Name: {bd.account_holder_name}</p>
          <p>Bank: {bd.bank_name}</p>
          <p>A/C: {bd.account_number}</p>
          <p>IFSC: {bd.ifsc_code}</p>
          {bd.branch_name && <p>Branch: {bd.branch_name}</p>}
        </div>
      );
    }
    // Admin - UPI
    return (
      <div className="space-y-2">
        <Label htmlFor="upi" className="text-sm">UPI ID</Label>
        <Input id="upi" type="text" placeholder="example@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
      </div>
    );
  };

  const isDisabled = loading
    || (role === 'student' && !studentBankDetails)
    || (role === 'center' && !centerBankDetails);

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

      {renderBankInfo()}

      <Button type="submit" disabled={isDisabled} className="w-full">
        {loading ? 'Submitting...' : 'Request Withdrawal'}
      </Button>
    </form>
  );
}
