import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import MiniCreateModal from '@/components/MiniCreateModal';
import { saveCustomer } from '@/data/create';
import { useToast } from '@/components/ui/use-toast';

const SalesFormHeader = ({ saleNumber, onSaleNumberChange, customerId, onCustomerChange, customers, date, onDateChange }) => {
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const { updateData } = useData();
  const { toast } = useToast();

  const handleSaveSuccess = async (newCustomer) => {
     try {
        await updateData(prevData => {
            const newCustomers = [...(prevData.customers || []), newCustomer];
            return { ...prevData, customers: newCustomers };
        });
        onCustomerChange(newCustomer.id);
        toast({ title: 'Success', description: 'New customer added and selected.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to update customers list.', variant: 'destructive' });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label htmlFor="saleNumber">Sale Number</Label>
        <Input id="saleNumber" value={saleNumber} onChange={e => onSaleNumberChange(e.target.value)} readOnly />
      </div>
      <div>
        <Label htmlFor="customer">Customer</Label>
        <div className="flex gap-2">
          <Select value={customerId} onValueChange={onCustomerChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={() => setIsCustomerModalOpen(true)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <div>
        <Label htmlFor="date">Date & Time</Label>
        <Input id="date" type="datetime-local" value={date} onChange={e => onDateChange(e.target.value)} />
      </div>
      <MiniCreateModal
        open={isCustomerModalOpen}
        title="Add New Customer"
        fields={[
          { key: 'name', label: 'Customer Name', required: true },
          { key: 'contact', label: 'Contact', type: 'tel' },
          { key: 'address', label: 'Address' }
        ]}
        onSave={saveCustomer}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
};

export default SalesFormHeader;