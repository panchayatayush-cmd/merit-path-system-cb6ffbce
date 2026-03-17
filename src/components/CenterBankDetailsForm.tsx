import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CenterBankDetailsForm() {
  const { user } = useAuth();
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('center_bank_details' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setAccountHolder(d.account_holder_name || '');
        setBankName(d.bank_name || '');
        setAccountNumber(d.account_number || '');
        setIfscCode(d.ifsc_code || '');
        setBranchName(d.branch_name || '');
        setExisting(true);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!accountHolder.trim() || !bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim())) {
      toast.error('Invalid IFSC code format');
      return;
    }
    if (accountNumber.trim().length < 9 || accountNumber.trim().length > 18) {
      toast.error('Account number must be 9-18 digits');
      return;
    }

    setLoading(true);
    const payload: any = {
      user_id: user.id,
      account_holder_name: accountHolder.trim(),
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim().toUpperCase(),
      branch_name: branchName.trim() || null,
    };

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('center_bank_details' as any)
        .update(payload)
        .eq('user_id', user.id));
    } else {
      ({ error } = await supabase.from('center_bank_details' as any).insert(payload));
    }

    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Bank details saved!');
      setExisting(true);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ch-holder" className="text-sm">Account Holder Name *</Label>
        <Input id="ch-holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Full name as per bank" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ch-bank" className="text-sm">Bank Name *</Label>
        <Input id="ch-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. State Bank of India" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ch-acc" className="text-sm">Account Number *</Label>
        <Input id="ch-acc" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter account number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ch-ifsc" className="text-sm">IFSC Code *</Label>
        <Input id="ch-ifsc" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" maxLength={11} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ch-branch" className="text-sm">Branch Name (Optional)</Label>
        <Input id="ch-branch" value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Main Branch" />
      </div>
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? 'Saving...' : existing ? 'Update Bank Details' : 'Save Bank Details'}
      </Button>
      {existing && <p className="text-xs text-primary text-center">✓ Bank details saved</p>}
    </div>
  );
}
