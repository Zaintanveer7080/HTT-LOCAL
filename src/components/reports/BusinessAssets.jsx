import React, { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Landmark, Wallet, Users, Building, Package } from 'lucide-react';
import ReportWrapper from './ReportWrapper';
import { formatMoney } from '@/lib/money';

const BusinessAssets = () => {
  const { data, getInvoiceStatus } = useData();
  const { cashInHand, banks, items, purchases, sales, suppliers, customers, payments } = data;
  const currencySymbol = data.settings?.currencySymbol || 'Rs';

  const assets = useMemo(() => {
    if (!items || !purchases || !sales || !customers || !payments || !banks) return { cash: 0, bank: 0, stock: 0, receivables: 0 };

    const stockValue = items.reduce((sum, item) => {
      const openingStock = item.openingStock || 0;
      const totalPurchased = purchases.reduce((acc, p) => acc + ((p.items || []).find(pi => pi.itemId === item.id)?.quantity || 0), 0);
      const totalSold = sales.reduce((acc, s) => acc + ((s.items || []).find(si => si.itemId === item.id)?.quantity || 0), 0);
      return sum + ((openingStock + totalPurchased - totalSold) * (item.purchasePrice || 0));
    }, 0);

    const totalBankBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);

    const totalReceivables = sales.reduce((total, sale) => {
        const { balance } = getInvoiceStatus(sale);
        return total + balance;
    }, 0);
    
    return {
      cash: cashInHand || 0,
      bank: totalBankBalance,
      stock: stockValue,
      receivables: totalReceivables > 0 ? totalReceivables : 0,
    };
  }, [cashInHand, banks, items, purchases, sales, customers, payments, getInvoiceStatus]);

  const liabilities = useMemo(() => {
    if (!suppliers || !purchases || !payments) return { payables: 0 };
      
    const totalPayables = purchases.reduce((total, purchase) => {
        const { balance } = getInvoiceStatus(purchase);
        return total + balance;
    }, 0);

    return {
      payables: totalPayables > 0 ? totalPayables : 0,
    };
  }, [suppliers, purchases, payments, getInvoiceStatus]);

  const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
  const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
  const equity = totalAssets - totalLiabilities;
  
  const chartData = [
    { name: 'Assets', value: totalAssets, fill: '#82ca9d' },
    { name: 'Liabilities', value: totalLiabilities, fill: '#ff8042' },
    { name: 'Equity', value: equity, fill: '#8884d8' },
  ];

  const kpiCards = [
    { title: 'Total Assets', value: totalAssets, icon: DollarSign, color: 'text-green-500' },
    { title: 'Total Liabilities', value: totalLiabilities, icon: Building, color: 'text-red-500' },
    { title: 'Business Equity', value: equity, icon: Users, color: 'text-blue-500' },
  ];

  return (
    <ReportWrapper title="Business Assets Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpiCards.map(card => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color}`}>{formatMoney(card.value, currencySymbol)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip formatter={(value) => formatMoney(value, currencySymbol)} />
            <Bar dataKey="value" barSize={40} />
          </BarChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Assets Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center"><span className="flex items-center"><Wallet className="mr-2 h-4 w-4 text-green-500" />Cash In Hand</span> <span className="font-semibold">{formatMoney(assets.cash, currencySymbol)}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center"><Landmark className="mr-2 h-4 w-4 text-blue-500" />Bank Balances</span> <span className="font-semibold">{formatMoney(assets.bank, currencySymbol)}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center"><Package className="mr-2 h-4 w-4 text-purple-500" />Stock Value</span> <span className="font-semibold">{formatMoney(assets.stock, currencySymbol)}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center"><Users className="mr-2 h-4 w-4 text-yellow-500" />Receivables</span> <span className="font-semibold">{formatMoney(assets.receivables, currencySymbol)}</span></div>
              <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold text-lg"><span >Total Assets</span> <span>{formatMoney(totalAssets, currencySymbol)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Liabilities Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center"><span className="flex items-center"><Building className="mr-2 h-4 w-4 text-red-500" />Payables</span> <span className="font-semibold">{formatMoney(liabilities.payables, currencySymbol)}</span></div>
              <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold text-lg"><span >Total Liabilities</span> <span>{formatMoney(totalLiabilities, currencySymbol)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ReportWrapper>
  );
};

export default BusinessAssets;