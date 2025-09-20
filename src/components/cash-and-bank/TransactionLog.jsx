import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Eye, ArrowUpRight, ArrowDownRight, TrendingUp, ShoppingCart, CreditCard, ArrowLeftRight, Wallet, Landmark } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useData } from '@/contexts/DataContext';

const TransactionIcon = ({ type }) => {
  switch (type) {
      case 'Sale': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'Purchase': return <ShoppingCart className="h-5 w-5 text-red-500" />;
      case 'Expense': return <CreditCard className="h-5 w-5 text-orange-500" />;
      case 'Payment': return <ArrowLeftRight className="h-5 w-5 text-blue-500" />;
      case 'Manual': return <Wallet className="h-5 w-5 text-yellow-500" />;
      default: return <Wallet className="h-5 w-5 text-gray-500" />;
  }
};

const TransactionLog = ({ transactions, title, icon, onEdit }) => {
    const { setTransactionToView, requestPasscode } = useData();
    
    const [filters, setFilters] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        types: ['Sale', 'Purchase', 'Expense', 'Payment', 'Manual'],
    });

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleTypeToggle = (type) => {
        setFilters(prev => ({
            ...prev,
            types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type]
        }));
    };

    const handleSecureEdit = (tx) => {
        requestPasscode(() => onEdit(tx));
    }

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            txDate.setHours(0, 0, 0, 0);

            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);

            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if (endDate) endDate.setHours(0, 0, 0, 0);

            if (startDate && !endDate && txDate.getTime() !== startDate.getTime()) return false;
            if (startDate && endDate && (txDate < startDate || txDate > endDate)) return false;

            if (!filters.types.includes(tx.type)) return false;
            
            return true;
        });
    }, [transactions, filters]);

    const totals = useMemo(() => {
        const totalIn = filteredTransactions.reduce((sum, tx) => tx.flow === 'in' ? sum + tx.amount : sum, 0);
        const totalOut = filteredTransactions.reduce((sum, tx) => tx.flow === 'out' ? sum + tx.amount : sum, 0);
        return { totalIn, totalOut };
    }, [filteredTransactions]);

    return (
        <Card className="card-hover">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">{icon} {title}</div>
                </CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div>
                        <Label>Date Range</Label>
                        <div className="flex gap-2">
                            <Input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                            <Input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <Label>Transaction Types</Label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                            {['Sale', 'Purchase', 'Expense', 'Payment', 'Manual'].map(type => (
                                <div key={type} className="flex items-center space-x-2">
                                    <Checkbox id={`type-${type}-${title}`} checked={filters.types.includes(type)} onCheckedChange={() => handleTypeToggle(type)} />
                                    <label htmlFor={`type-${type}-${title}`} className="text-sm font-medium">{type}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTransactions.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No transactions found for the selected filters.</p>
                    ) : (
                        filteredTransactions.map(tx => (
                            <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-between items-center p-3 bg-muted rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <TransactionIcon type={tx.type} />
                                    <div>
                                        <p className="font-semibold">{tx.description}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleString()} {tx.bankName ? `• ${tx.bankName}`: ''}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <p className={`font-bold text-lg flex items-center gap-1 ${tx.flow === 'in' ? 'text-green-500' : 'text-red-500'}`}>
                                        {tx.flow === 'in' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                        RS {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    {onEdit && tx.type === 'Manual' && (
                                        <Button variant="ghost" size="icon" onClick={() => handleSecureEdit(tx)}>
                                            <Edit className="h-4 w-4 text-blue-500" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={() => setTransactionToView({ transaction: tx.ref, type: tx.refType })}>
                                        <Eye className="h-4 w-4 text-purple-500" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </CardContent>
             <CardFooter className="flex justify-end gap-6 font-bold pt-4 border-t">
                    <div className="text-green-500">Total In: RS {totals.totalIn.toFixed(2)}</div>
                    <div className="text-red-500">Total Out: RS {totals.totalOut.toFixed(2)}</div>
            </CardFooter>
        </Card>
    );
};

export default TransactionLog;