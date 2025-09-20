import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatFx } from '@/lib/fx';

const PurchaseFormFooter = ({
  purchase, onFieldChange, 
  subtotal_foreign, subtotal_local, 
  total_foreign, total_local, 
  balance_foreign, balance_local,
  paid_amount_foreign, paid_amount_local,
  totalQuantity, onClose, isEditing, banks, settings
}) => {

  const baseCurrency = settings.currency;
  const foreignCurrency = purchase.currency;

  const renderMoney = (foreignAmount, baseAmount) => (
    <div className="text-right font-semibold">
      <span>{formatFx(foreignAmount, foreignCurrency, baseAmount, baseCurrency)}</span>
    </div>
  );

  return (
    <div className="p-6 border-t bg-background">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div>
            <Label>Payment</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={purchase.paymentMethod} onValueChange={(value) => onFieldChange('paymentMethod', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
              </Select>
              {purchase.paymentMethod === 'bank' && (
                <Select value={purchase.bankId} onValueChange={(value) => onFieldChange('bankId', value)}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>{(banks || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="paidAmount">Amount Paid Now ({baseCurrency})</Label>
            <Input id="paidAmount" type="number" value={purchase.paid_amount_local} onChange={e => onFieldChange('paid_amount_local', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={purchase.notes} onChange={e => onFieldChange('notes', e.target.value)} />
          </div>
        </div>

        <div className="md:col-span-2 bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Total Quantity</span>
            <span className="font-semibold">{totalQuantity}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Subtotal</span>
            {renderMoney(subtotal_foreign, subtotal_local)}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Discount ({foreignCurrency})</span>
            <Input type="number" value={purchase.discount_foreign || ''} onChange={e => onFieldChange('discount_foreign', e.target.value)} className="h-8 w-24" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Tax ({foreignCurrency})</span>
            <Input type="number" value={purchase.tax_foreign || ''} onChange={e => onFieldChange('tax_foreign', e.target.value)} className="h-8 w-24" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Shipping ({foreignCurrency})</span>
            <Input type="number" value={purchase.shipping_foreign || ''} onChange={e => onFieldChange('shipping_foreign', e.target.value)} className="h-8 w-24" />
          </div>
          <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
            <span>Grand Total</span>
            {renderMoney(total_foreign, total_local)}
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Paid</span>
            <span className="font-semibold">{formatFx(paid_amount_foreign, foreignCurrency, paid_amount_local, baseCurrency)}</span>
          </div>
          <div className={`flex justify-between items-center text-lg font-bold ${balance_local > 0 ? 'text-red-500' : 'text-green-500'}`}>
            <span>Balance Due</span>
            {renderMoney(balance_foreign, balance_local)}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{isEditing ? 'Update Purchase' : 'Save Purchase'}</Button>
      </div>
    </div>
  );
};

export default PurchaseFormFooter;