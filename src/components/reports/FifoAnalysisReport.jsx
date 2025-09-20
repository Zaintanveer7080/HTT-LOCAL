import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as CustomTableFooter } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { toNumber, formatMoney } from '@/lib/money';
import ReportWrapper from './ReportWrapper';
import { BarChart, DollarSign, Package, FileText, Repeat } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const FifoAnalysisReport = () => {
    const { data } = useData();
    const { sales, purchases, items: allItems } = data;
    const currencySymbol = data.settings?.currencySymbol || 'AED';

    const fifoCalculations = useMemo(() => {
        const normalizedItemNames = {};
        allItems.forEach(item => {
            const normalizedName = item.name.trim().toLowerCase();
            if (!normalizedItemNames[normalizedName]) {
                normalizedItemNames[normalizedName] = item.id;
            }
        });

        const getItemId = (name) => {
            const normalizedName = name.trim().toLowerCase();
            return normalizedItemNames[normalizedName] || name;
        };

        let purchaseLots = [];
        purchases.forEach(p => {
            p.items.forEach(pi => {
                const qty = toNumber(pi.quantity);
                if (qty <= 0) return;
                purchaseLots.push({
                    itemId: getItemId(allItems.find(i => i.id === pi.itemId)?.name || ''),
                    date: new Date(p.date),
                    qty: qty,
                    cost: toNumber(pi.unit_price_local),
                });
            });
        });

        purchaseLots.sort((a, b) => a.date - b.date);

        let salesLines = [];
        sales.forEach(s => {
            s.items.forEach(si => {
                const qty = toNumber(si.quantity);
                if (qty <= 0) return;
                salesLines.push({
                    itemId: getItemId(allItems.find(i => i.id === si.itemId)?.name || ''),
                    date: new Date(s.date),
                    qty: qty,
                    revenue: toNumber(si.price) * qty,
                });
            });
        });

        salesLines.sort((a, b) => a.date - b.date);

        const purchaseQueue = JSON.parse(JSON.stringify(purchaseLots));
        let fifoCogs = 0;
        let totalRevenue = 0;

        for (const sale of salesLines) {
            totalRevenue += sale.revenue;
            let qtyToFulfill = sale.qty;
            let costForThisSale = 0;

            for (let i = 0; i < purchaseQueue.length; i++) {
                if (purchaseQueue[i].itemId !== sale.itemId || purchaseQueue[i].qty === 0) continue;

                const qtyFromLot = Math.min(qtyToFulfill, purchaseQueue[i].qty);
                costForThisSale += qtyFromLot * purchaseQueue[i].cost;
                purchaseQueue[i].qty -= qtyFromLot;
                qtyToFulfill -= qtyFromLot;

                if (qtyToFulfill === 0) break;
            }
            fifoCogs += costForThisSale;
        }

        const closingStockLots = purchaseQueue.filter(lot => lot.qty > 0);
        const fifoClosingStockValue = closingStockLots.reduce((sum, lot) => sum + lot.qty * lot.cost, 0);

        const totalPurchasesValue = purchaseLots.reduce((sum, lot) => sum + lot.qty * lot.cost, 0);
        
        const fifoProfit = totalRevenue - fifoCogs;
        
        return {
            totalSales: totalRevenue,
            totalPurchases: totalPurchasesValue,
            fifoCogs,
            fifoProfit,
            fifoClosingStockValue,
            closingStockLots,
        };
    }, [sales, purchases, allItems]);

    const { 
      totalSales, 
      totalPurchases, 
      fifoCogs, 
      fifoProfit, 
      fifoClosingStockValue, 
      closingStockLots,
    } = fifoCalculations;

    const summaryCards = [
        { title: "Total Sales Revenue", value: totalSales, icon: DollarSign, color: "text-green-500" },
        { title: "Total Purchases Value", value: totalPurchases, icon: Package, color: "text-blue-500" },
        { title: "FIFO COGS", value: fifoCogs, icon: FileText, color: "text-orange-500" },
        { title: "FIFO Gross Profit", value: fifoProfit, icon: BarChart, color: "text-purple-500" },
        { title: "FIFO Closing Stock", value: fifoClosingStockValue, icon: Repeat, color: "text-yellow-500" },
    ];

    return (
        <ReportWrapper title="FIFO Profitability & Stock Analysis">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
                {summaryCards.map(card => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className={`h-4 w-4 text-muted-foreground ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatMoney(card.value, currencySymbol)}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Closing Stock Details (FIFO)</CardTitle>
                    <CardDescription>
                        List of remaining purchase lots that constitute the closing stock value.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">Quantity Left</TableHead>
                                    <TableHead className="text-right">Avg Cost (AED)</TableHead>
                                    <TableHead className="text-right">Stock Value (AED)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {closingStockLots.length > 0 ? (
                                    closingStockLots.map((lot, index) => {
                                        const item = allItems.find(i => i.id === lot.itemId);
                                        return (
                                            <TableRow key={index}>
                                                <TableCell>{item?.name || 'Unknown Item'}</TableCell>
                                                <TableCell className="text-right">{lot.qty}</TableCell>
                                                <TableCell className="text-right">{formatMoney(lot.cost, currencySymbol)}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatMoney(lot.qty * lot.cost, currencySymbol)}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">No stock remaining.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <CustomTableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total FIFO Closing Stock Value</TableCell>
                                    <TableCell className="text-right font-bold text-lg">{formatMoney(fifoClosingStockValue, currencySymbol)}</TableCell>
                                </TableRow>
                            </CustomTableFooter>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </ReportWrapper>
    );
};

export default FifoAnalysisReport;