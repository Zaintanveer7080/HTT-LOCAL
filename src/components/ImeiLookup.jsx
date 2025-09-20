import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, TrendingUp, ShoppingCart, User, Building, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns-tz';

const ImeiLookup = ({ setActiveModule, setTransactionToView }) => {
    const [imei, setImei] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const { data } = useData();
    const { purchases, sales, items, suppliers, customers } = data;

    const handleSearch = (e) => {
        e.preventDefault();
        if (!imei) return;

        const purchaseRecord = (purchases || []).find(p => 
            (p.items || []).some(item => (item.serials || []).includes(imei))
        );

        const saleRecord = (sales || []).find(s => 
            (s.items || []).some(item => (item.serials || []).includes(imei))
        );

        if (!purchaseRecord) {
            setSearchResult({ error: 'IMEI/Serial not found in any purchase record.' });
            return;
        }

        const purchaseItem = purchaseRecord.items.find(item => item.serials.includes(imei));
        const itemInfo = (items || []).find(item => item.id === purchaseItem.itemId);
        const supplierInfo = (suppliers || []).find(s => s.id === purchaseRecord.supplierId);
        
        const result = {
            item: itemInfo,
            purchase: {
                ...purchaseRecord,
                supplier: supplierInfo
            },
            sale: null,
        };

        if (saleRecord) {
            const customerInfo = (customers || []).find(c => c.id === saleRecord.customerId);
            result.sale = {
                ...saleRecord,
                customer: customerInfo
            };
        }

        setSearchResult(result);
    };

    const viewTransaction = (transaction, type) => {
        setTransactionToView({ transaction, type });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">
            <Card>
                <CardHeader>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input 
                            placeholder="Enter IMEI or Serial Number..." 
                            value={imei}
                            onChange={(e) => setImei(e.target.value)}
                            className="max-w-sm"
                        />
                        <Button type="submit">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {searchResult && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            {searchResult.error ? (
                                <p className="text-red-500 text-center py-8">{searchResult.error}</p>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><Package /> Item Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <p><strong>Name:</strong> {searchResult.item?.name}</p>
                                            <p><strong>SKU:</strong> {searchResult.item?.sku}</p>
                                            <p><strong>Category:</strong> {searchResult.item?.category}</p>
                                        </CardContent>
                                    </Card>
                                    <div></div>
                                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                                                <div className="flex items-center gap-2"><ShoppingCart /> Purchase Details</div>
                                                <Button variant="link" size="sm" onClick={() => viewTransaction(searchResult.purchase, 'purchase')}><LinkIcon className="h-4 w-4 mr-1"/>View Invoice</Button>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <p><strong>Invoice:</strong> {searchResult.purchase.purchaseNumber}</p>
                                            <p><strong>Date:</strong> {format(new Date(searchResult.purchase.date), 'PPpp')}</p>
                                            <p className="flex items-center gap-2"><strong>Supplier:</strong> <Building className="h-4 w-4" /> {searchResult.purchase.supplier?.name}</p>
                                        </CardContent>
                                    </Card>
                                    
                                    {searchResult.sale ? (
                                        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-between text-green-600 dark:text-green-400">
                                                    <div className="flex items-center gap-2"><TrendingUp /> Sale Details</div>
                                                    <Button variant="link" size="sm" onClick={() => viewTransaction(searchResult.sale, 'sale')}><LinkIcon className="h-4 w-4 mr-1"/>View Invoice</Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2 text-sm">
                                                <p><strong>Invoice:</strong> {searchResult.sale.saleNumber}</p>
                                                <p><strong>Date:</strong> {format(new Date(searchResult.sale.date), 'PPpp')}</p>
                                                <p className="flex items-center gap-2"><strong>Customer:</strong> <User className="h-4 w-4" /> {searchResult.sale.customer?.name}</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card className="flex items-center justify-center border-dashed bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                                            <p className="text-red-600 dark:text-red-400 font-semibold text-lg">Not yet sold</p>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ImeiLookup;