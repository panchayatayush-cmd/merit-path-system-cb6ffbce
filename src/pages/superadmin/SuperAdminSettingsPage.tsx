import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState({
    websiteName: 'GPHDM Scholarship Exam',
    contactEmail: 'info@gphdm.org',
    contactPhone: '',
    whatsappNumber: '',
    footerText: '© 2026 GPHDM Scholarship Exam. All rights reserved.',
    maintenanceMode: false,
    scholarshipAmount: '100000',
    referralReward: '70',
    centerCommission: '40',
    adminCommission: '30',
    superAdminCommission: '60',
  });

  const [razorpaySettings, setRazorpaySettings] = useState({
    paymentEnabled: true,
    mode: 'test' as 'test' | 'live',
  });

  useEffect(() => {
    const saved = localStorage.getItem('platform_settings');
    if (saved) {
      try { setSettings(JSON.parse(saved)); } catch {}
    }
    const rpSaved = localStorage.getItem('razorpay_settings');
    if (rpSaved) {
      try { setRazorpaySettings(JSON.parse(rpSaved)); } catch {}
    }
  }, []);

  const handleChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('platform_settings', JSON.stringify(settings));
    toast.success('Settings saved successfully');
  };

  const handleRazorpaySave = () => {
    localStorage.setItem('razorpay_settings', JSON.stringify(razorpaySettings));
    toast.success('Razorpay settings saved');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">Website Settings</h1>
        </div>

        {/* Razorpay Settings */}
        <div className="card-shadow rounded-lg bg-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">💳 Razorpay Payment Settings</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Razorpay Key ID</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">••••••••••configured</Badge>
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Managed via secure secrets</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Razorpay Secret Key</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">••••••••••configured</Badge>
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Managed via secure secrets</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Webhook Secret</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">••••••••••configured</Badge>
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">For automatic payment verification</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Payments</p>
              <p className="text-xs text-muted-foreground">When disabled, all payment buttons are hidden.</p>
            </div>
            <Switch
              checked={razorpaySettings.paymentEnabled}
              onCheckedChange={v => setRazorpaySettings(prev => ({ ...prev, paymentEnabled: v }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Payment Mode</p>
              <p className="text-xs text-muted-foreground">
                {razorpaySettings.mode === 'test' ? '⚠️ Test mode — no real money charged' : '🟢 Live mode — real transactions'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={razorpaySettings.mode === 'test' ? 'secondary' : 'default'}>
                {razorpaySettings.mode === 'test' ? 'Test' : 'Live'}
              </Badge>
              <Switch
                checked={razorpaySettings.mode === 'live'}
                onCheckedChange={v => setRazorpaySettings(prev => ({ ...prev, mode: v ? 'live' : 'test' }))}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Webhook URL (configure in Razorpay Dashboard):</p>
            <code className="block bg-background rounded p-2 text-xs break-all border border-border">
              {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? 'xhjchbvowughqcnlfkgt'}.supabase.co/functions/v1/razorpay-webhook`}
            </code>
            <p>Events: <code>payment.captured</code>, <code>payment.failed</code></p>
          </div>

          <Button onClick={handleRazorpaySave} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" /> Save Razorpay Settings
          </Button>
        </div>

        {/* Basic Info */}
        <div className="card-shadow rounded-lg bg-card p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">🌐 Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Website Name</Label>
                <Input value={settings.websiteName} onChange={e => handleChange('websiteName', e.target.value)} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={settings.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={settings.contactPhone} onChange={e => handleChange('contactPhone', e.target.value)} />
              </div>
              <div>
                <Label>WhatsApp Number</Label>
                <Input value={settings.whatsappNumber} onChange={e => handleChange('whatsappNumber', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <Label>Footer Text</Label>
            <Input value={settings.footerText} onChange={e => handleChange('footerText', e.target.value)} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">When enabled, students cannot access the platform.</p>
            </div>
            <Switch checked={settings.maintenanceMode} onCheckedChange={v => handleChange('maintenanceMode', v)} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">💰 Financial Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Total Scholarship Pool (₹)</Label>
                <Input type="number" value={settings.scholarshipAmount} onChange={e => handleChange('scholarshipAmount', e.target.value)} />
              </div>
              <div>
                <Label>Referral Reward (₹)</Label>
                <Input type="number" value={settings.referralReward} onChange={e => handleChange('referralReward', e.target.value)} />
              </div>
              <div>
                <Label>Center Commission (₹)</Label>
                <Input type="number" value={settings.centerCommission} onChange={e => handleChange('centerCommission', e.target.value)} />
              </div>
              <div>
                <Label>Admin Commission (₹)</Label>
                <Input type="number" value={settings.adminCommission} onChange={e => handleChange('adminCommission', e.target.value)} />
              </div>
              <div>
                <Label>Super Admin Commission (₹)</Label>
                <Input type="number" value={settings.superAdminCommission} onChange={e => handleChange('superAdminCommission', e.target.value)} />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" /> Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
