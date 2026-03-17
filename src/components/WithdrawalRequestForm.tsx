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
  const [bankDetails, setBankDetails] = useState<any>(null);

  // For students, get bank details from localStorage
  const getStudentBankDetails = () => {
    if (!user) return null;
    const stored = localStorage.getItem(`bank_details_${user.id}`);
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  };

  // For center/admin/super_admin, fetch from DB
  useEffect(() => {
    if (!user || role === 'student') return;
    const fetch = async () => {
      const { data } = await supabase
        .from('bank_details' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setBankDetails(data);
    };
    fetch();
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

    const studentBD = getStudentBankDetails();

    // Validate bank details by role
    if (role === 'student' && !studentBD) {
      toast.error('Please save your bank details first in the Bank Details tab');
      return;
    }
    if ((role === 'center' || role === 'admin' || role === 'super_admin') && !bankDetails) {
      toast.error('Please add your bank details first in the Bank Details tab');
      return;
    }

    // Check for pending requests (prevent duplicates) - skip for super_admin
    if (role !== 'super_admin') {
      const { data: pendingReqs } = await supabase
        .from('withdrawal_requests' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      if ((pendingReqs as any[])?.length > 0) {
        toast.error('You already have a pending withdrawal request.');
        return;
      }
    }

    setLoading(true);

    const bankDetailsJson = role === 'student'
      ? JSON.stringify(studentBD)
      : bankDetails
        ? JSON.stringify({
            account_holder: (bankDetails as any).account_holder_name,
            bank_name: (bankDetails as any).bank_name,
            account_number: (bankDetails as any).account_number,
            ifsc_code: (bankDetails as any).ifsc_code,
            branch_name: (bankDetails as any).branch_name,
          })
        : null;

    // Super Admin: auto-completed
    const status = role === 'super_admin' ? 'completed' : 'pending';

    const insertData: any = {
      user_id: user.id,
      wallet_id: walletId,
      amount: numAmount,
      upi_id: role === 'student' ? (studentBD?.upi_id || null) : null,
      bank_details: bankDetailsJson,
      status,
      ...(role === 'super_admin' ? {
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        admin_note: 'Self-withdrawal by Super Admin',
      } : {}),
    };

    const { error } = await supabase.from('withdrawal_requests').insert(insertData);

    if (error) {
      toast.error('Request failed: ' + error.message);
    } else {
      toast.success(role === 'super_admin' ? 'Withdrawal completed!' : 'Withdrawal request submitted!');
      setAmount('');
      setUpiId('');
      onSuccess();
    }
    setLoading(false);
  };

  const studentBD = getStudentBankDetails();

  const renderBankInfo = () => {
    if (role === 'student') {
      if (!studentBD) return <p className="text-xs text-destructive">⚠ Please save bank details in the Bank Details tab first.</p>;
      return (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 space-y-0.5">
          <p className="font-medium text-foreground text-sm mb-1">Bank Details</p>
          <p>Name: {studentBD.account_holder}</p>
          <p>Bank: {studentBD.bank_name}</p>
          <p>A/C: {studentBD.account_number}</p>
          <p>IFSC: {studentBD.ifsc_code}</p>
          {studentBD.upi_id && <p>UPI: {studentBD.upi_id}</p>}
        </div>
      );
    }
    // Center, Admin, Super Admin - DB bank details
    if (!bankDetails) return <p className="text-xs text-destructive">⚠ Please add bank details in the Bank Details tab first.</p>;
    const bd = bankDetails as any;
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
  };

  const isDisabled = loading
    || (role === 'student' && !studentBD)
    || (role !== 'student' && !bankDetails);

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
      {role === 'super_admin' && (
        <p className="text-xs text-primary">✓ As Super Admin, withdrawal will be auto-completed.</p>
      )}
      <Button type="submit" disabled={isDisabled} className="w-full">
        {loading ? 'Submitting...' : role === 'super_admin' ? 'Withdraw Now' : 'Request Withdrawal'}
      </Button>
    </form>
  );
}
