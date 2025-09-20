import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, KeyRound, Upload, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import * as bcrypt from 'bcryptjs';

const DangerZone = () => {
    const { updateData, requestPasscode } = useData();
    const { toast } = useToast();
    const [confirmationText, setConfirmationText] = useState('');

    const handleEraseData = () => {
        requestPasscode(() => {
            const emptyState = {
                customers: [],
                suppliers: [],
                items: [],
                purchases: [],
                sales: [],
                expenses: [],
                banks: [],
                cashInHand: 0,
                cashTransactions: [],
                payments: [],
            };
            updateData(emptyState);
            toast({ title: "Success", description: "All business data has been erased." });
            setConfirmationText('');
            document.querySelector('[data-state="open"]')?.click();
        }, { isEdit: true });
    };

    return (
        <Card className="border-red-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500"><AlertTriangle /> Danger Zone</CardTitle>
                <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Erase All Business Data</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Erase All Business Data</DialogTitle>
                            <DialogDescription>
                                This will permanently delete all items, sales, purchases, payments, and other business-related records.
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <Label htmlFor="confirmation">Type <span className="font-bold text-red-600">ERASE ALL DATA</span> to confirm.</Label>
                            <Input id="confirmation" value={confirmationText} onChange={e => setConfirmationText(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button variant="destructive" onClick={handleEraseData} disabled={confirmationText !== 'ERASE ALL DATA'}>
                                I understand, erase everything.
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

function Settings() {
  const { data, updateData } = useData();
  const { settings } = data;
  const { toast } = useToast();
  const logoInputRef = useRef(null);

  const [passcodeData, setPasscodeData] = useState({ currentPasscode: '', newPasscode: '', confirmPasscode: '' });
  const [companyData, setCompanyData] = useState({
    companyName: settings.companyName || '',
    companyLogo: settings.companyLogo || '',
    currency: settings.currency || 'PKR',
    currencySymbol: settings.currencySymbol || 'Rs'
  });
  
  const handlePasscodeChange = (e) => {
    e.preventDefault();
    const { currentPasscode, newPasscode, confirmPasscode } = passcodeData;
    if (newPasscode !== confirmPasscode) {
      toast({ title: 'Error', description: 'New passcodes do not match.', variant: 'destructive' });
      return;
    }
    if (settings.passcode && !bcrypt.compareSync(currentPasscode, settings.passcode)) {
      toast({ title: 'Error', description: 'Incorrect current passcode.', variant: 'destructive' });
      return;
    }
    const hashedPasscode = bcrypt.hashSync(newPasscode, 10);
    updateData({ settings: { ...settings, passcode: hashedPasscode } });
    toast({ title: 'Success', description: 'Transaction passcode updated successfully!' });
    setPasscodeData({ currentPasscode: '', newPasscode: '', confirmPasscode: '' });
  };
  
  const handleBrandingChange = (e) => {
    e.preventDefault();
    updateData({ settings: { ...settings, ...companyData } });
    toast({ title: 'Success', description: 'Company branding updated successfully!' });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCompanyData({...companyData, companyLogo: reader.result });
        };
        reader.readAsDataURL(file);
    } else {
        toast({ title: 'Error', description: 'Please select a valid image file.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage application settings, security, and branding.</p>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="branding">Company Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>
        <TabsContent value="branding">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building /> Company Branding</CardTitle>
                <CardDescription>Customize the look and feel of the application to match your brand.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBrandingChange} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" value={companyData.companyName} onChange={e => setCompanyData({ ...companyData, companyName: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="currencyCode">Base Currency Code</Label>
                            <Input id="currencyCode" value={companyData.currency} onChange={e => setCompanyData({ ...companyData, currency: e.target.value.toUpperCase() })} placeholder="e.g. PKR, USD"/>
                        </div>
                        <div>
                            <Label htmlFor="currencySymbol">Currency Symbol</Label>
                            <Input id="currencySymbol" value={companyData.currencySymbol} onChange={e => setCompanyData({ ...companyData, currencySymbol: e.target.value })} placeholder="e.g. $, £, Rs"/>
                        </div>
                   </div>
                  <div>
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {companyData.companyLogo ? (
                                <img src={companyData.companyLogo} alt="Logo Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Building className="w-8 h-8 text-muted-foreground" />
                            )}
                        </div>
                        <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Upload Logo
                        </Button>
                        <Input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    </div>
                  </div>
                  <Button type="submit">Save Branding</Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        <TabsContent value="security">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound /> Transaction Passcode</CardTitle>
                <CardDescription>Set a passcode to authorize editing or deleting transactions for added security.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasscodeChange} className="space-y-4">
                  {settings.passcode && (
                    <div><Label htmlFor="currentPasscode">Current Passcode</Label><Input id="currentPasscode" type="password" value={passcodeData.currentPasscode} onChange={e => setPasscodeData({ ...passcodeData, currentPasscode: e.target.value })} /></div>
                  )}
                  <div><Label htmlFor="newPasscode">New Passcode</Label><Input id="newPasscode" type="password" value={passcodeData.newPasscode} onChange={e => setPasscodeData({ ...passcodeData, newPasscode: e.target.value })} /></div>
                  <div><Label htmlFor="confirmPasscode">Confirm New Passcode</Label><Input id="confirmPasscode" type="password" value={passcodeData.confirmPasscode} onChange={e => setPasscodeData({ ...passcodeData, confirmPasscode: e.target.value })} /></div>
                   <div className="flex items-center justify-between">
                        <Button type="submit"><ShieldCheck className="mr-2 h-4 w-4" />Update Passcode</Button>
                    </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        <TabsContent value="danger">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <DangerZone />
            </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Settings;