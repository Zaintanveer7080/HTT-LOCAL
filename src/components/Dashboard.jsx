import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShoppingCart, TrendingUp, TrendingDown, Package, Users, ChevronsRight, AlertCircle, Banknote, Landmark } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { formatMoney, toNumber, safeSum } from '@/lib/money';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfToday, endOfToday, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format as formatDate, isWithinInterval, startOfYesterday, endOfYesterday, getMonth } from 'date-fns';

const StatCard = ({
  title,
  value,
  icon,
  onClick,
  description,
  color = 'primary'
}) => <motion.div initial={{
  opacity: 0,
  y: 20
}} animate={{
  opacity: 1,
  y: 0
}} transition={{
  duration: 0.5
}} className="h-full">
    <Card className={`flex flex-col justify-between h-full bg-gradient-to-br from-${color}-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-lg hover:shadow-xl transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </CardContent>
      {onClick && <div className="p-4 pt-0">
          <Button variant="ghost" size="sm" onClick={onClick} className="w-full justify-start text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary">
            View Details <ChevronsRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>}
    </Card>
  </motion.div>;

const Dashboard = ({
  setActiveModule
}) => {
  const {
    data,
    getProfitOfSale,
    getInvoiceStatus
  } = useData();
  const {
    sales,
    purchases,
    items,
    customers,
    suppliers,
    expenses,
    cashInHand,
    banks
  } = data;
  const baseCurrency = data.settings?.currency || 'AED';
  const [salesPeriod, setSalesPeriod] = useState('this_year');

  const periodLabels = {
    today: 'Today',
    last_7_days: 'Last 7 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year'
  };

  const stats = useMemo(() => {
    const totalRevenue = safeSum(...(sales || []).map(s => s.totalCost));
    const totalPurchase = safeSum(...(purchases || []).map(p => p.total_local));
    const totalProfit = safeSum(...(sales || []).map(getProfitOfSale).map(p => p.totalProfit));
    const totalExpenses = safeSum(...(expenses || []).map(e => e.amount));
    const creditSales = (sales || []).map(s => getInvoiceStatus(s)).filter(s => s.status === 'Credit' || s.status === 'Partial').reduce((sum, s) => sum + s.balance, 0);
    const creditPurchases = (purchases || []).map(p => getInvoiceStatus(p)).filter(p => p.status === 'Credit' || p.status === 'Partial').reduce((sum, p) => sum + p.balance, 0);
    const totalAssets = safeSum(cashInHand, ...(banks || []).map(b => b.balance));

    // Sales Chart Logic
    const now = new Date();
    let interval;
    switch (salesPeriod) {
      case 'today':
        interval = { start: startOfToday(), end: endOfToday() };
        break;
      case 'last_7_days':
        interval = { start: subDays(startOfToday(), 6), end: endOfToday() };
        break;
      case 'this_month':
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case 'last_month':
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        interval = { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
        break;
      case 'this_year':
      default:
        interval = { start: startOfYear(now), end: endOfYear(now) };
        break;
    }

    const filteredSales = (sales || []).filter(s => isWithinInterval(new Date(s.date), interval));
    
    let chartData = [];
    if (salesPeriod === 'today') {
      const salesByHour = filteredSales.reduce((acc, sale) => {
        const hour = formatDate(new Date(sale.date), 'ha');
        acc[hour] = (acc[hour] || 0) + sale.totalCost;
        return acc;
      }, {});
      chartData = Array.from({ length: 24 }, (_, i) => {
        const hour = formatDate(new Date(0,0,0,i), 'ha');
        return { name: hour, Sales: salesByHour[hour] || 0 };
      });
    } else if (salesPeriod === 'last_7_days') {
        chartData = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(now, 6 - i);
        const dayKey = formatDate(day, 'EEE');
        const daySales = filteredSales
            .filter(s => formatDate(new Date(s.date), 'yyyy-MM-dd') === formatDate(day, 'yyyy-MM-dd'))
            .reduce((sum, s) => sum + s.totalCost, 0);
        return { name: dayKey, Sales: daySales };
        });
    } else if (salesPeriod === 'this_month' || salesPeriod === 'last_month') {
        const salesByDay = filteredSales.reduce((acc, sale) => {
        const day = formatDate(new Date(sale.date), 'd');
        acc[day] = (acc[day] || 0) + sale.totalCost;
        return acc;
        }, {});
        chartData = Array.from({ length: new Date(interval.end).getDate() }, (_, i) => {
        const day = i + 1;
        return { name: `Day ${day}`, Sales: salesByDay[day] || 0 };
        });
    } else { // this_year
        const salesByMonth = filteredSales.reduce((acc, sale) => {
        const month = formatDate(new Date(sale.date), 'MMM');
        acc[month] = (acc[month] || 0) + sale.totalCost;
        return acc;
        }, {});
         chartData = Array.from({ length: getMonth(now) + 1 }, (_, i) => {
            const month = formatDate(new Date(now.getFullYear(), i), 'MMM');
            return { name: month, Sales: salesByMonth[month] || 0 };
        });
    }


    const lowStockItems = (items || []).filter(item => {
      const stock = item.openingStock + safeSum(...(purchases || []).flatMap(p => p.items).filter(pi => pi.itemId === item.id).map(pi => pi.quantity)) - safeSum(...(sales || []).flatMap(s => s.items).filter(si => si.itemId === item.id).map(si => si.quantity));
      return stock <= (item.lowStockThreshold || 5);
    });

    return {
      totalRevenue,
      totalPurchase,
      totalProfit,
      totalExpenses,
      creditSales,
      creditPurchases,
      totalAssets,
      chartData,
      lowStockItems
    };
  }, [data, getProfitOfSale, getInvoiceStatus, salesPeriod]);

  const currencySymbol = data.settings?.currencySymbol || 'Rs';
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Welcome back! Here's a snapshot of your business performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={formatMoney(stats.totalRevenue, currencySymbol, baseCurrency)} icon={<TrendingUp className="h-5 w-5 text-green-500" />} onClick={() => setActiveModule('sales')} description="All sales transactions" color="green" />
        <StatCard title="Total Purchase" value={formatMoney(stats.totalPurchase, currencySymbol, baseCurrency)} icon={<ShoppingCart className="h-5 w-5 text-blue-500" />} onClick={() => setActiveModule('purchase')} description="All purchase invoices" color="blue" />
        <StatCard title="Total Profit" value={formatMoney(stats.totalProfit, currencySymbol, baseCurrency)} icon={stats.totalProfit >= 0 ? <TrendingUp className="h-5 w-5 text-purple-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />} onClick={() => setActiveModule('reports')} description="Revenue minus cost of goods" color="purple" />
        <StatCard title="Total Expenses" value={formatMoney(stats.totalExpenses, currencySymbol, baseCurrency)} icon={<TrendingDown className="h-5 w-5 text-orange-500" />} onClick={() => setActiveModule('expenses')} description="Operational costs" color="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: 0.2
      }} className="lg:col-span-2">
           <Card className="h-full shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Overview ({periodLabels[salesPeriod]})</CardTitle>
                <Select value={salesPeriod} onValueChange={setSalesPeriod}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_month">Last Month</SelectItem>
                        <SelectItem value="this_year">This Year</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={stats.chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${currencySymbol}${value / 1000}k`} />
                  <Tooltip contentStyle={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: 'blur(5px)',
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem'
                }} labelStyle={{
                  color: '#333'
                }} itemStyle={{
                  fontWeight: 'bold'
                }} />
                  <Bar dataKey="Sales" radius={[4, 4, 0, 0]}>
                    {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`} fillOpacity={1 - index / (stats.chartData.length * 1.5)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{
        opacity: 0,
        x: 20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: 0.2
      }}>
          <Card className="h-full shadow-lg flex flex-col">
            <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-600">Credit Sales</p>
                  <p className="text-lg font-bold">{formatMoney(stats.creditSales, currencySymbol, baseCurrency)}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-orange-600">Credit Purchases</p>
                  <p className="text-lg font-bold">{formatMoney(stats.creditPurchases, currencySymbol, baseCurrency)}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-orange-400" />
              </div>
              <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-indigo-600">Total Liquid Assets</p>
                  <p className="text-lg font-bold">{formatMoney(stats.totalAssets, currencySymbol, baseCurrency)}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Customers" value={customers?.length || 0} icon={<Users className="h-5 w-5 text-teal-500" />} onClick={() => setActiveModule('customers')} />
        <StatCard title="Suppliers" value={suppliers?.length || 0} icon={<Package className="h-5 w-5 text-rose-500" />} onClick={() => setActiveModule('suppliers')} />
        <StatCard title="Items" value={items?.length || 0} icon={<Package className="h-5 w-5 text-cyan-500" />} onClick={() => setActiveModule('items')} />
      </div>

       {stats.lowStockItems.length > 0 && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      delay: 0.4
    }}>
          <Card className="border-yellow-400 border-2 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-yellow-700 dark:text-yellow-300">Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">The following items are running low on stock:</p>
              <ul className="list-disc pl-5 text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {stats.lowStockItems.map(item => <li key={item.id}>{item.name} ({item.sku})</li>)}
              </ul>
            </CardContent>
          </Card>
        </motion.div>}

    </div>;
};
export default Dashboard;