import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import StockSummary from '@/components/reports/StockSummary';
import StockValueReport from '@/components/reports/StockValueReport';
import BusinessAssets from '@/components/reports/BusinessAssets';
import InvoiceProfit from '@/components/reports/InvoiceProfit';
import ClientProfit from '@/components/reports/ClientProfit';
import BankStatement from '@/components/reports/BankStatement';
import CreditManagement from '@/components/reports/CreditManagement';
import DailyBook from '@/components/reports/DailyBook';
import ProfitSummary from '@/components/reports/ProfitSummary';
import ImeiLookup from '@/components/ImeiLookup';
import PartyLedger from '@/components/reports/PartyLedger';
import { useData } from '@/contexts/DataContext';

const reportsList = [
  { value: 'daily-book', label: 'Daily Book', component: DailyBook },
  { value: 'profit-summary', label: 'Profit Summary', component: ProfitSummary },
  { value: 'client-profit', label: 'Client-wise Profit', component: ClientProfit },
  { value: 'party-ledger', label: 'Party Ledger', component: PartyLedger },
  { value: 'stock-summary', label: 'Stock Summary', component: StockSummary },
  { value: 'stock-value', label: 'Stock Value', component: StockValueReport },
  { value: 'imei-lookup', label: 'IMEI Lookup', component: ImeiLookup },
  { value: 'business-assets', label: 'Business Assets', component: BusinessAssets },
  { value: 'bank-statement', label: 'Bank Statement', component: BankStatement },
  { value: 'credit-management', 'label': 'Credit Management', component: CreditManagement },
];

const LAST_TAB_KEY = 'reports_last_active_tab';

function Reports() {
  const { setTransactionToView } = useData();
  const [activeTab, setActiveTab] = useState(localStorage.getItem(LAST_TAB_KEY) || 'daily-book');

  const handleTabChange = (value) => {
    setActiveTab(value);
    localStorage.setItem(LAST_TAB_KEY, value);
  };

  const ActiveComponent = reportsList.find(r => r.value === activeTab)?.component || DailyBook;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 -mx-8 px-8 py-2 border-b">
        <div className="relative overflow-x-auto no-scrollbar">
          <nav className="flex items-center space-x-2">
            {reportsList.map(report => (
              <button
                key={report.value}
                onClick={() => handleTabChange(report.value)}
                className={cn(
                  'relative whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeTab === report.value ? 'text-primary' : 'text-muted-foreground hover:text-primary/80'
                )}
                aria-selected={activeTab === report.value}
              >
                {report.label}
                {activeTab === report.value && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    layoutId="underline"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ActiveComponent setTransactionToView={setTransactionToView} />
      </motion.div>
    </div>
  );
}

export default Reports;