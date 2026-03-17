import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import WithdrawalRequestForm from '@/components/WithdrawalRequestForm';

const MINIMUM_LIMITS: Record<string, number> = {
  student: 350,
  center: 1000,
  admin: 1500,
  super_admin: 0,
};

interface WithdrawButtonProps {
  walletId: string;
  balance: number;
  onSuccess: () => void;
}

export default function WithdrawButton({ walletId, balance, onSuccess }: WithdrawButtonProps) {
  const { role } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const minAmount = MINIMUM_LIMITS[role ?? ''] ?? 350;

  const handleClick = () => {
    if (balance < minAmount) {
      setShowAlert(true);
    } else {
      setShowForm(true);
    }
  };

  return (
    <>
      <Button onClick={handleClick} className="w-full">
        Withdraw
      </Button>

      {/* Insufficient balance alert */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Withdraw</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <span className="block">Minimum withdrawal amount is ₹{minAmount}.</span>
              <span className="block">Please earn more to withdraw your balance.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdrawal form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>Enter the amount and your UPI ID to withdraw.</DialogDescription>
          </DialogHeader>
          <WithdrawalRequestForm
            walletId={walletId}
            balance={balance}
            onSuccess={() => {
              setShowForm(false);
              onSuccess();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
