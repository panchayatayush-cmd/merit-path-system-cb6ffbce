import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CenterShareCardProps {
  centerCode: string;
}

const SITE_URL = 'https://merit-path-system.lovable.app';

export default function CenterShareCard({ centerCode }: CenterShareCardProps) {
  const registerUrl = `${SITE_URL}/auth/register?center=${centerCode}`;

  const message = `🎓 GPHDM National Scholarship Exam 2026

हमारे सेंटर के माध्यम से छात्र GPHDM छात्रवृत्ति परीक्षा के लिए रजिस्टर कर सकते हैं।

आप भी रजिस्टर करें और छात्रवृत्ति पाए।

✅ Class 1–12 के लिए
✅ Top 100 Students को Scholarship
✅ QR-Coded Certificate

अगर आप हमारे Center Code से रजिस्टर करके परीक्षा फीस सफलतापूर्वक जमा करते हैं, तो हमारा सेंटर ₹40 referral reward प्राप्त करेगा।

Register Here
${registerUrl}

Center Code
${centerCode}`;

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
      url: null,
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
      navigator.clipboard.writeText(message);
      toast.success('Share message copied to clipboard!');
      return;
    }
    if (option.label === 'Instagram') {
      navigator.clipboard.writeText(message);
      toast.success('Message copied! Paste it in your Instagram story or DM.');
      return;
    }
    if (option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(centerCode);
    toast.success('Center code copied!');
  };

  return (
    <div className="card-shadow rounded-lg bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">🏫 Your Center Code</h2>

      <div className="flex items-center gap-3">
        <span className="font-mono text-lg font-bold text-primary">{centerCode}</span>
        <button onClick={copyCode} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Share करें — हर student की फीस पर आपको <span className="font-semibold text-primary">₹40</span> मिलेंगे!
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
