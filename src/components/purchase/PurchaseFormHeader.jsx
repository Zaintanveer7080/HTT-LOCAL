import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import MiniCreateModal from '@/components/MiniCreateModal';
import { saveSupplier } from '@/data/create';
import { useToast } from '@/components/ui/use-toast';

const PurchaseFormHeader = ({ purchase, onFieldChange, suppliers, isEditing, settings }) => {
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const { updateData } = useData();
  const { toast } = useToast();

  const handleSaveSuccess = async (newSupplier) => {
    try {
        await updateData(prevData => {
            const newSuppliers = [...(prevData.suppliers || []), newSupplier];
            return { ...prevData, suppliers: newSuppliers };
        });
        onFieldChange('supplierId', newSupplier.id);
        toast({ title: 'Success', description: 'New supplier added and selected.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to update suppliers list.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="purchase-number">Purchase Number</Label>
          <Input id="purchase-number" value={purchase.purchaseNumber} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase-date">Date & Time</Label>
          <Input id="purchase-date" type="datetime-local" value={purchase.date} onChange={(e) => onFieldChange('date', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <div className="flex gap-2">
            <Select onValueChange={(value) => onFieldChange('supplierId', value)} value={purchase.supplierId || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {(suppliers || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={() => setIsSupplierModalOpen(true)}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                    onValueChange={(value) => {
                        onFieldChange('currency', value);
                        if (value === settings.currency) {
                            onFieldChange('fx_rate_to_business', 1);
                        }
                    }} 
                    value={purchase.currency}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                        {settings.supportedCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="fx_rate">FX Rate (to {settings.currency})</Label>
                <Input 
                    id="fx_rate" 
                    type="number" 
                    step="0.000001"
                    value={purchase.fx_rate_to_business} 
                    onChange={(e) => onFieldChange('fx_rate_to_business', e.target.value)}
                    disabled={purchase.currency === settings.currency}
                />
            </div>
        </div>
      </CardContent>
      <MiniCreateModal
        open={isSupplierModalOpen}
        title="Add New Supplier"
        fields={[
          { key: 'name', label: 'Supplier Name', required: true },
          { key: 'contact', label: 'Contact', type: 'tel' },
          { key: 'address', label: 'Address' }
        ]}
        onSave={saveSupplier}
        onClose={() => setIsSupplierModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
      />
    </Card>
  );
};

export default PurchaseFormHeader;