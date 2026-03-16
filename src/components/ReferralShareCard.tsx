import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReferralShareCardProps {
  referralCode: string;
}

const SITE_URL = window.location.origin;

export default function ReferralShareCard({ referralCode }: ReferralShareCardProps) {
  const registerUrl = `${SITE_URL}/auth/register?ref=${referralCode}`;

  const message = `🎓 GPHDM National Scholarship Exam 2026!\n\nमैं GPHDM छात्रवृत्ति परीक्षा में भाग ले रहा/रही हूँ। आप भी रजिस्टर करें और ₹1,00,000 तक की छात्रवृत्ति जीतें!\n\n✅ Class 1-12 के लिए\n✅ Top 100 students को scholarship\n✅ QR-coded certificate\n\nMy Referral Code: ${referralCode}\n\nRegister here: ${registerUrl}`;

  const encodedMessage = encodeURIComponent(message);

  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodedMessage}`,
      color: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      label: 'Facebook',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(registerUrl)}&quote=${encodedMessage}`,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      label: 'Instagram',
      icon: '📸',
      url: null, // Instagram doesn't support direct share links
      color: 'bg-pink-600 hover:bg-pink-700 text-white',
    },
    {
      label: 'Copy Link',
      icon: '🔗',
      url: null,
      color: 'bg-secondary hover:bg-secondary/80 text-foreground',
    },
  ];

  const handleShare = (option: typeof shareOptions[0]) => {
    if (option.label === 'Copy Link') {
      navigator.clipboard.writeText(`${message}`);
      toast.success('Share message copied to clipboard!');
      return;
    }
    if (option.label === 'Instagram') {
      navigator.clipboard.writeText(`${message}`);
      toast.success('Message copied! Paste it in your Instagram story or DM.');
      return;
    }
    if (option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  return (
    <div className="card-shadow rounded-lg bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">🔗 Your Referral Code</h2>

      <div className="flex items-center gap-3">
        <span className="font-mono text-lg font-bold text-primary">{referralCode}</span>
        <button onClick={copyCode} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Share this code. You earn <span className="font-semibold text-primary">₹70</span> + <span className="font-semibold text-primary">2 bonus marks</span> per referral!
      </p>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <Share2 className="h-3 w-3" /> Share via
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shareOptions.map((opt) => (
            <Button
              key={opt.label}
              variant="ghost"
              size="sm"
              className={`${opt.color} text-xs gap-1.5 justify-start`}
              onClick={() => handleShare(opt)}
            >
              <span>{opt.icon}</span> {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
