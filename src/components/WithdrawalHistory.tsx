import { Badge } from '@/components/ui/badge';

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  upi_id: string;
  admin_note?: string;
  created_at: string;
}

export default function WithdrawalHistory({ requests }: { requests: WithdrawalRequest[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No withdrawal requests yet.</p>;
  }

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'default';
    if (s === 'rejected') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="flex justify-between items-start text-sm pb-3 border-b border-border last:border-0">
          <div>
            <p className="text-foreground font-medium">₹{Number(r.amount).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{r.upi_id}</p>
            <p className="text-xs font-mono text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            {r.admin_note && <p className="text-xs text-muted-foreground mt-1">Note: {r.admin_note}</p>}
          </div>
          <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
        </div>
      ))}
    </div>
  );
}
