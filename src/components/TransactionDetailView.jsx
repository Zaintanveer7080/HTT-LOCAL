import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileDown, X, ShoppingCart, TrendingUp, TrendingDown, CreditCard, ArrowLeftRight, ArrowUpRight, ArrowDownRight, User, Building, Landmark, Hand, Hash, Paperclip } from 'lucide-react';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import SaleInvoiceTemplate from '@/components/pdf/SaleInvoiceTemplate';
import PurchaseInvoiceTemplate from '@/components/pdf/PurchaseInvoiceTemplate';
import ExpenseVoucherTemplate from '@/components/pdf/ExpenseVoucherTemplate';
import { formatMoney, toNumber } from '@/lib/money';
import { formatFx } from '@/lib/fx';
import ViewAttachmentsModal from './ViewAttachmentsModal';

const TransactionDetailView = ({ transaction, type, onClose }) => {
  const { data, getInvoiceStatus, getProfitOfSale } = useData();
  const { items, customers, suppliers, banks, payments } = data;
  const baseCurrency = data.settings?.currency || 'RS';
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);

  const handleDownloadPdf = () => {
    switch (type) {
      case 'sale':
        const saleCustomer = customers.find(c => c.id === transaction.customerId);
        generatePdf(<SaleInvoiceTemplate sale={transaction} customer={saleCustomer} items={items} settings={data.settings} getInvoiceStatus={getInvoiceStatus} />, `Sale-Invoice-${transaction.saleNumber}.pdf`);
        break;
      case 'purchase':
        const purchaseSupplier = suppliers.find(s => s.id === transaction.supplierId);
        generatePdf(<PurchaseInvoiceTemplate purchase={transaction} supplier={purchaseSupplier} items={items} settings={data.settings} getInvoiceStatus={getInvoiceStatus} />, `Purchase-Invoice-${transaction.purchaseNumber}.pdf`);
        break;
      case 'expense':
        generatePdf(<ExpenseVoucherTemplate expense={transaction} settings={data.settings} />, `Expense-Voucher-${transaction.id}.pdf`);
        break;
      default:
        break;
    }
  };
  
  const getStatusBadge = (status) => {
    const statusStyles = {
      Paid: 'bg-green-100 text-green-800',
      Partial: 'bg-orange-100 text-orange-800',
      Credit: 'bg-red-100 text-red-800',
    };
    return <Badge className={`${statusStyles[status]} text-xs`}>{status}</Badge>;
  };
  
  const renderDetails = () => {
    if (!transaction) {
      return <p>Transaction details not available.</p>;
    }
    switch (type) {
      case 'sale':
      case 'purchase':
        const isSale = type === 'sale';
        const party = isSale 
          ? (customers || []).find(c => c.id === transaction.customerId)
          : (suppliers || []).find(s => s.id === transaction.supplierId);
        const { status, paidAmount, balance } = getInvoiceStatus(transaction);
        const relatedPayments = (payments || []).filter(p => p.invoiceId === transaction.id);
        
        const profit = isSale ? getProfitOfSale(transaction) : null;
        
        const foreignCurrency = transaction.currency || baseCurrency;
        const fxRate = toNumber(transaction.fx_rate_to_business) || 1;

        const subTotalForeign = transaction.subtotal_foreign ?? (transaction.subTotal_local / fxRate);
        const discountForeign = transaction.discount_foreign ?? 0;
        const taxForeign = transaction.tax_foreign ?? 0;
        const shippingForeign = transaction.shipping_foreign ?? 0;
        const totalForeign = transaction.total_foreign ?? (transaction.total_local / fxRate);
        const paidBase = paidAmount;
        const paidForeign = transaction.paid_amount_foreign ?? (paidBase / fxRate);
        const balanceBase = balance;
        const balanceForeign = transaction.balance_foreign ?? (balanceBase / fxRate);

        return (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div><strong>{isSale ? 'Invoice #' : 'Purchase #'}:</strong> {transaction.saleNumber || transaction.purchaseNumber}</div>
                <div><strong>Date:</strong> {new Date(transaction.date).toLocaleDateString()}</div>
                <div className="flex justify-end">{getStatusBadge(status)}</div>
            </div>
             <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">{isSale ? 'Customer' : 'Supplier'}</h4>
                    <p className="font-bold">{party?.name || 'N/A'}</p>
                    <p>{party?.contact || ''}</p>
                    <p>{party?.address || ''}</p>
                </div>
                <div className="text-right">
                     <h4 className="font-semibold text-muted-foreground mb-1">Created By</h4>
                     <p>Admin</p>
                     <p>{new Date(transaction.date).toLocaleString()}</p>
                </div>
            </div>
            
            <Card>
              <CardHeader><CardTitle>Items</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transaction.items || []).map((item, index) => {
                        const itemDetails = items.find(i => i.id === item.itemId);
                        const itemPriceForeign = isSale ? toNumber(item.price) : toNumber(item.unit_price_foreign);
                        const itemPriceLocal = isSale ? itemPriceForeign : toNumber(item.unit_price_local);
                        const itemQty = toNumber(item.quantity);
                        const itemTotalForeign = itemPriceForeign * itemQty;
                        const itemTotalLocal = itemPriceLocal * itemQty;
                        return (
                          <React.Fragment key={`${item.itemId}-${index}`}>
                            <TableRow>
                              <TableCell>{itemDetails?.name || 'N/A'}</TableCell>
                              <TableCell className="text-right">{itemQty} {itemDetails?.unit}</TableCell>
                              <TableCell className="text-right">{isSale ? formatMoney(itemPriceForeign, baseCurrency) : formatFx(itemPriceForeign, foreignCurrency, itemPriceLocal, baseCurrency)}</TableCell>
                              <TableCell className="text-right">{isSale ? formatMoney(itemTotalForeign, baseCurrency) : formatFx(itemTotalForeign, foreignCurrency, itemTotalLocal, baseCurrency)}</TableCell>
                            </TableRow>
                            {itemDetails?.hasImei && (item.serials || []).length > 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="py-1 px-8">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Hash className="h-3 w-3" />
                                    <span>Serials: {item.serials.join(', ')}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
             <div className="grid grid-cols-2 gap-8 mt-4">
                 <div>
                    {relatedPayments.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {relatedPayments.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">{formatMoney(p.amount, baseCurrency)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                 </div>
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{isSale ? formatMoney(transaction.subTotal, baseCurrency) : formatFx(subTotalForeign, foreignCurrency, transaction.subtotal_local, baseCurrency)}</span></div>
                    {discountForeign > 0 && <div className="flex justify-between"><span>Discount</span><span>- {isSale ? formatMoney(transaction.subTotal - transaction.totalCost, baseCurrency) : formatFx(discountForeign, foreignCurrency, transaction.discount_local, baseCurrency)}</span></div>}
                    {taxForeign > 0 && <div className="flex justify-between"><span>Tax</span><span>+ {formatFx(taxForeign, foreignCurrency, transaction.tax_local, baseCurrency)}</span></div>}
                    {shippingForeign > 0 && <div className="flex justify-between"><span>Shipping</span><span>+ {formatFx(shippingForeign, foreignCurrency, transaction.shipping_local, baseCurrency)}</span></div>}
                    <div className="flex justify-between font-bold text-base border-y py-2"><span>Total</span><span>{isSale ? formatMoney(transaction.totalCost, baseCurrency) : formatFx(totalForeign, foreignCurrency, transaction.total_local, baseCurrency)}</span></div>
                    <div className="flex justify-between"><span>Paid</span><span>{isSale ? formatMoney(paidBase, baseCurrency) : formatFx(paidForeign, foreignCurrency, paidBase, baseCurrency)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Balance Due</span><span>{isSale ? formatMoney(balanceBase, baseCurrency) : formatFx(balanceForeign, foreignCurrency, balanceBase, baseCurrency)}</span></div>
                    {isSale && profit && (
                      <div className={`flex justify-between items-center font-bold pt-2 mt-2 border-t ${profit.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>Profit</span>
                          <span className="flex items-center gap-1">
                            {profit.totalProfit >= 0 ? <TrendingUp className="h-4 w-4"/> : <TrendingDown className="h-4 w-4"/>}
                            {formatMoney(profit.totalProfit, baseCurrency)}
                          </span>
                      </div>
                    )}
                 </div>
            </div>
            {transaction.notes && <p className="mt-4 text-sm text-muted-foreground"><strong>Notes:</strong> {transaction.notes}</p>}
          </>
        );
      case 'expense':
        return (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><strong>Voucher ID:</strong> {transaction.id}</div>
                <div className="text-right"><strong>Date:</strong> {new Date(transaction.date).toLocaleDateString()}</div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>{transaction.category}</span>
                        <span className="text-2xl font-bold text-red-600">{formatMoney(transaction.amount, baseCurrency)}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{transaction.notes || 'No notes for this expense.'}</p>
                </CardContent>
            </Card>
          </>
        );
      case 'payment':
        const partyName = transaction.type === 'in'
            ? (customers || []).find(c => c.id === transaction.partyId)?.name
            : (suppliers || []).find(s => s.id === transaction.partyId)?.name;
        const paymentIcon = transaction.type === 'in' ? <User className="h-4 w-4 mr-2"/> : <Building className="h-4 w-4 mr-2"/>;
        const methodIcon = transaction.method === 'cash' ? <Hand className="h-4 w-4 mr-2"/> : <Landmark className="h-4 w-4 mr-2"/>;
        const bankName = transaction.method === 'bank' ? (banks || []).find(b => b.id === transaction.bankId)?.name : 'Cash';
        
        return (
            <>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div><strong>Payment ID:</strong> {transaction.id}</div>
                    <div className="text-right"><strong>Date:</strong> {new Date(transaction.date).toLocaleDateString()}</div>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle className={`flex justify-between items-center ${transaction.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                            <span>{transaction.type === 'in' ? 'Payment In' : 'Payment Out'}</span>
                            <span className="text-2xl font-bold">{formatMoney(transaction.amount, baseCurrency)}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center">{paymentIcon} <strong>Party:</strong> <span className="ml-2">{partyName || 'N/A'}</span></div>
                        <div className="flex items-center">{methodIcon} <strong>Method:</strong> <span className="ml-2">{bankName}</span></div>
                        {toNumber(transaction.discount) > 0 && <div><strong>Discount:</strong> <span className="ml-2">{formatMoney(transaction.discount, baseCurrency)}</span></div>}
                        {transaction.invoiceId && <div><strong>Invoice Ref:</strong> <span className="ml-2">{transaction.invoiceId}</span></div>}
                        {transaction.notes && <p className="text-muted-foreground pt-2 border-t"><strong>Notes:</strong> {transaction.notes}</p>}
                    </CardContent>
                </Card>
            </>
        );
      case 'cash':
        const cashIcon = transaction.type === 'add' ? <ArrowUpRight className="h-6 w-6 text-green-500"/> : <ArrowDownRight className="h-6 w-6 text-red-500"/>
        return (
             <>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div><strong>Transaction ID:</strong> {transaction.id}</div>
                    <div className="text-right"><strong>Date:</strong> {new Date(transaction.date).toLocaleString()}</div>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle className={`flex justify-between items-center ${transaction.type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                            <div className="flex items-center">{cashIcon} <span className="ml-2">Cash {transaction.type === 'add' ? 'Added' : 'Removed'}</span></div>
                            <span className="text-2xl font-bold">{formatMoney(transaction.amount, baseCurrency)}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{transaction.description}</p>
                    </CardContent>
                </Card>
            </>
        );
      default:
        return <p>Unsupported transaction type.</p>;
    }
  };
  
  const getTitle = () => {
      switch(type) {
          case 'sale': return { title: 'Sale Details', icon: <TrendingUp className="h-5 w-5 mr-2" /> };
          case 'purchase': return { title: 'Purchase Details', icon: <ShoppingCart className="h-5 w-5 mr-2" /> };
          case 'expense': return { title: 'Expense Details', icon: <CreditCard className="h-5 w-5 mr-2" /> };
          case 'payment': return { title: 'Payment Details', icon: <ArrowLeftRight className="h-5 w-5 mr-2" /> };
          case 'cash': return { title: 'Cash Transaction', icon: <ArrowLeftRight className="h-5 w-5 mr-2" /> };
          default: return { title: 'Transaction Details', icon: null };
      }
  }

  const { title, icon } = getTitle();

  return (
    <>
      <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">{icon} {title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
              {renderDetails()}
          </div>
          <DialogFooter className="sm:justify-between">
            <div>
              {(type === 'sale' || type === 'purchase') && (
                <Button variant="outline" onClick={() => setIsAttachmentsModalOpen(true)}>
                  <Paperclip className="mr-2 h-4 w-4" /> View Attachments
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {(type === 'sale' || type === 'purchase' || type === 'expense') && (
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <FileDown className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              )}
              <Button variant="outline" onClick={onClose}><X className="mr-2 h-4 w-4" /> Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isAttachmentsModalOpen && (
        <ViewAttachmentsModal
          transactionType={type}
          transactionId={transaction.id}
          open={isAttachmentsModalOpen}
          onClose={() => setIsAttachmentsModalOpen(false)}
        />
      )}
    </>
  );
};

export default TransactionDetailView;