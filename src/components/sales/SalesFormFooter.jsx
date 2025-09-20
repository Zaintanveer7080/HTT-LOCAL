import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { formatMoney } from '@/lib/money';

const SalesFormFooter = ({
  paymentMethod, onPaymentMethodChange, paidAmount, onPaidAmountChange, notes, onNotesChange, bankId, onBankIdChange, banks, paymentRef, onPaymentRefChange,
  totalQuantity, unit, subTotal, discount, onDiscountChange, discountType, onDiscountTypeChange,
  totalDiscount, totalCost, balance, profit, onClose, isEdit
}) => {
  const { data } = useData();
  const currencySymbol = data.settings?.currencySymbol || 'Rs';

  return (
    <div className="p-6 border-t bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left Column: Payment */}
        <div className="space-y-4">
          <div>
            <Label>Payment</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
              </Select>
              {paymentMethod === 'bank' && (
                <Select value={bankId} onValueChange={onBankIdChange}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>{(banks || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            {paymentMethod === 'bank' && <Input className="mt-2" placeholder="Bank Reference No." value={paymentRef} onChange={e => onPaymentRefChange(e.target.value)} />}
          </div>
          <div>
            <Label htmlFor="paidAmount">Amount Received Now</Label>
            <Input id="paidAmount" type="number" value={paidAmount} onChange={e => onPaidAmountChange(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => onNotesChange(e.target.value)} />
          </div>
        </div>
        
        {/* Right Column: Totals */}
        <div className="bg-muted p-4 rounded-lg space-y-2 lg:col-span-2">
          <div className="flex justify-between items-center text-sm">
            <span>Total Quantity</span>
            <span className="font-semibold">{totalQuantity} {unit}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Subtotal</span>
            <span className="font-semibold">{formatMoney(subTotal, currencySymbol)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Discount</span>
            <div className="flex gap-1">
              <Input type="number" value={discount} onChange={e => onDiscountChange(e.target.value)} className="h-8 w-20" />
              <Select value={discountType} onValueChange={onDiscountTypeChange}>
                <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="flat">Flat</SelectItem><SelectItem value="percent">%</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span>{formatMoney(totalCost, currencySymbol)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Paid</span>
            <span className="font-semibold">{formatMoney(parseFloat(paidAmount) || 0, currencySymbol)}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-semibold">
            <span>Balance Due</span>
            <span>{formatMoney(balance, currencySymbol)}</span>
          </div>
          <div className={`flex justify-between items-center text-sm font-bold pt-2 mt-2 border-t ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>Profit</span>
            <span className="flex items-center gap-1">
              {profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatMoney(profit, currencySymbol)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{isEdit ? 'Update Sale' : 'Save Sale'}</Button>
      </div>
    </div>
  );
};

export default SalesFormFooter;