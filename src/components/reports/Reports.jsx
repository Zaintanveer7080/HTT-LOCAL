import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, BarChart2, PieChart, Users, Building, Package, ArrowRight, DollarSign, Briefcase, CreditCard, TrendingUp } from 'lucide-react';

import StockSummary from './StockSummary';
import StockValueReport from './StockValueReport';
import PartyLedger from './PartyLedger';
import DailyBook from './DailyBook';
import CreditManagement from './CreditManagement';
import BusinessAssets from './BusinessAssets';
import BankStatement from './BankStatement';
import InvoiceProfit from './InvoiceProfit';
import ClientProfit from './ClientProfit';
import ProfitSummary from './ProfitSummary';
import FifoAnalysisReport from './FifoAnalysisReport';

const reportComponents = {
  stockSummary: { title: "Stock Summary", component: StockSummary, icon: Package, description: "Live snapshot of all items, quantities, and serials." },
  stockValue: { title: "Stock Value Report", component: StockValueReport, icon: BarChart2, description: "Historical stock value and quantity on any given date." },
  partyLedger: { title: "Party Ledger", component: PartyLedger, icon: Users, description: "Complete transaction history for any customer or supplier." },
  dailyBook: { title: "Daily Book", component: DailyBook, icon: FileText, description: "All financial entries for a selected day or period." },
  creditManagement: { title: "Credit Management", component: CreditManagement, icon: CreditCard, description: "Track receivables and payables for all parties." },
  profitAndLoss: { title: "Profit & Loss Statement", component: ProfitSummary, icon: TrendingUp, description: "Overall business profitability including sales and expenses." },
  invoiceProfit: { title: "Invoice Profit Report", component: InvoiceProfit, icon: DollarSign, description: "Profit analysis for each individual invoice." },
  clientProfit: { title: "Client Profit Report", component: ClientProfit, icon: PieChart, description: "Analyze profitability per customer." },
  businessAssets: { title: "Business Assets", component: BusinessAssets, icon: Briefcase, description: "Summary of cash, bank balances, and stock value." },
  bankStatement: { title: "Bank Statement", component: BankStatement, icon: Building, description: "View detailed transaction log for any bank account." },
  fifoAnalysis: { title: "FIFO Analysis Report", component: FifoAnalysisReport, icon: BarChart2, description: "In-depth profit and stock analysis using FIFO method." },
};

function Reports() {
  const [activeReport, setActiveReport] = useState(null);

  const renderActiveReport = () => {
    if (!activeReport) return null;
    const ReportComponent = reportComponents[activeReport].component;
    return (
      <div>
        <Button onClick={() => setActiveReport(null)} className="mb-4">
          <ArrowRight className="mr-2 h-4 w-4" /> Back to Reports List
        </Button>
        <ReportComponent />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!activeReport ? (
        <>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Business Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gain valuable insights into your business performance with our comprehensive reports.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.entries(reportComponents).map(([key, { title, icon: Icon, description }]) => (
              <Card 
                key={key} 
                className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                onClick={() => setActiveReport(key)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                  <Icon className="h-6 w-6 text-gray-400" />
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        renderActiveReport()
      )}
    </div>
  );
}

export default Reports;