import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function BankDetailsForm() {
  const { user } = useAuth();
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Load existing bank details from localStorage (profile doesn't have bank fields)
      const stored = localStorage.getItem(`bank_details_${user.id}`);
      if (stored) {
        const details = JSON.parse(stored);
        setAccountHolder(details.account_holder || '');
        setBankName(details.bank_name || '');
        setAccountNumber(details.account_number || '');
        setIfscCode(details.ifsc_code || '');
        setUpiId(details.upi_id || '');
        setSaved(true);
      } else if (data?.full_name) {
        setAccountHolder(data.full_name);
      }
    };
    load();
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    if (!accountHolder.trim() || !bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      toast.error('Please fill all required bank fields');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim())) {
      toast.error('Invalid IFSC code format');
      return;
    }

    setLoading(true);
    const details = {
      account_holder: accountHolder.trim(),
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim().toUpperCase(),
      upi_id: upiId.trim(),
    };
    localStorage.setItem(`bank_details_${user.id}`, JSON.stringify(details));
    setSaved(true);
    toast.success('Bank details saved!');
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accountHolder" className="text-sm">Account Holder Name *</Label>
        <Input id="accountHolder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Full name as per bank" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bankName" className="text-sm">Bank Name *</Label>
        <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. State Bank of India" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accountNumber" className="text-sm">Account Number *</Label>
        <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter account number" type="text" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ifscCode" className="text-sm">IFSC Code *</Label>
        <Input id="ifscCode" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" maxLength={11} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="upiId" className="text-sm">UPI ID (Optional)</Label>
        <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. name@upi" />
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? 'Saving...' : saved ? 'Update Bank Details' : 'Save Bank Details'}
      </Button>
      {saved && <p className="text-xs text-primary text-center">✓ Bank details saved</p>}
    </div>
  );
}
