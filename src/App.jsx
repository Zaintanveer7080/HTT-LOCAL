import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar.jsx';
import Dashboard from '@/components/Dashboard.jsx';
import { Purchase } from '@/components/Purchase.jsx';
import Sales from '@/components/Sales.jsx';
import Expenses from '@/components/Expenses.jsx';
import Suppliers from '@/components/Suppliers.jsx';
import Customers from '@/components/Customers.jsx';
import Items from '@/components/Items.jsx';
import Reports from '@/components/reports/Reports.jsx';
import Payments from '@/components/Payments.jsx';
import CashAndBank from '@/components/CashAndBank.jsx';
import TransactionsLog from '@/components/TransactionsLog.jsx';
import Settings from '@/components/Settings.jsx';
import { Toaster } from '@/components/ui/toaster';
import { DataProvider, useData } from '@/contexts/DataContext.jsx';
import { PDFViewport } from '@/components/pdf/PDFViewport';
import TransactionDetailView from '@/components/TransactionDetailView.jsx';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Auth from '@/components/auth/Auth';

function AppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { data, transactionToView, setTransactionToView, loading: dataLoading, isDataInitialized } = useData();
  const companyName = data?.settings?.companyName || 'ERP System';

  const handleNavigate = (module) => {
    setActiveModule(module);
  };

  const renderActiveModule = useCallback(() => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard setActiveModule={handleNavigate} />;
      case 'purchase':
        return <Purchase setActiveModule={handleNavigate} />;
      case 'sales':
        return <Sales setActiveModule={handleNavigate} />;
      case 'transactions':
        return <TransactionsLog />;
      case 'expenses':
        return <Expenses />;
      case 'suppliers':
        return <Suppliers />;
      case 'customers':
        return <Customers />;
      case 'items':
        return <Items />;
      case 'reports':
        return <Reports />;
      case 'payments':
        return <Payments />;
      case 'cashAndBank':
        return <CashAndBank />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveModule={handleNavigate} />;
    }
  }, [activeModule]);

  if (dataLoading || !isDataInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-semibold text-foreground">Loading Your Business Data...</p>
          {!isDataInitialized && <p className="text-sm text-muted-foreground">Performing first-time setup...</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{companyName} - Inventory, Billing & Reporting</title>
        <meta name="description" content={`Complete ERP solution for inventory management, billing, and business reporting for ${companyName}`} />
        <meta property="og:title" content={`${companyName} - Inventory, Billing & Reporting`} />
        <meta property="og:description" content={`Complete ERP solution for inventory management, billing, and business reporting for ${companyName}`} />
      </Helmet>
      
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar activeModule={activeModule} setActiveModule={handleNavigate} />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-6 lg:p-8 h-full"
            >
              {renderActiveModule()}
            </motion.div>
          </div>
        </main>
        
        <Toaster />
        <PDFViewport />
        {transactionToView && (
          <TransactionDetailView 
            transaction={transactionToView.transaction}
            type={transactionToView.type}
            onClose={() => setTransactionToView(null)}
          />
        )}
      </div>
    </>
  );
}

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;