import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Save } from 'lucide-react';

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

  const handleChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('platform_settings', JSON.stringify(settings));
    toast.success('Settings saved successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">Website Settings</h1>
        </div>

        <div className="card-shadow rounded-lg bg-card p-6 space-y-6">
          {/* Basic Info */}
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

          {/* Maintenance */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">When enabled, students cannot access the platform.</p>
            </div>
            <Switch checked={settings.maintenanceMode} onCheckedChange={v => handleChange('maintenanceMode', v)} />
          </div>

          {/* Financial */}
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
