import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as bcrypt from 'bcryptjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useInvoiceLogic } from '@/hooks/useInvoiceLogic';
import { useProfitLogic } from '@/hooks/useProfitLogic';
import { useStockLogic } from '@/hooks/useStockLogic';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const getInitialState = () => ({
  customers: [],
  suppliers: [],
  items: [],
  purchases: [],
  sales: [],
  expenses: [],
  banks: [],
  cashInHand: 0,
  cashTransactions: [],
  payments: [],
  settings: {
    currency: 'AED',
    currencySymbol: 'AED',
    supportedCurrencies: ['PKR', 'USD', 'GBP', 'EUR', 'AED'],
    passcode: '',
    companyName: 'ERP Pro',
    companyLogo: ''
  }
});

const PasscodeModal = ({ isOpen, onVerified, onClose, requirePasscode }) => {
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const { data } = useData();
  const { toast } = useToast();

  const handleVerify = (e) => {
    e.preventDefault();
    if (!requirePasscode) {
        onVerified();
        return;
    }
    if (data.settings.passcode && bcrypt.compareSync(enteredPasscode, data.settings.passcode)) {
      toast({ title: "Success", description: "Action authorized.", variant: 'success' });
      onVerified();
    } else {
      toast({ title: "Error", description: "Incorrect passcode.", variant: "destructive" });
    }
    setEnteredPasscode('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Passcode to Authorize</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleVerify} className="py-4 space-y-4">
          <div>
            <Label htmlFor="passcodeInput">Transaction Passcode</Label>
            <Input
              id="passcodeInput"
              type="password"
              value={enteredPasscode}
              onChange={(e) => setEnteredPasscode(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Authorize</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const DataProvider = ({ children }) => {
  const [data, setData] = useState(getInitialState);
  const [loading, setLoading] = useState(true);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [passcodeCallback, setPasscodeCallback] = useState(null);
  const [passcodeContext, setPasscodeContext] = useState({ isEdit: false });
  const [transactionToView, setTransactionToView] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const tablesToSync = [
    'customers', 'suppliers', 'items', 'purchases', 'sales',
    'expenses', 'transactions'
  ];

  const loadDataFromSupabase = useCallback(async () => {
    if (!user) {
        setLoading(false);
        setIsDataInitialized(false);
        return;
    }
    setLoading(true);
    try {
      // Fetch main app data (settings, banks, cash etc.)
      const { data: appDataRes, error: appDataError } = await supabase
        .from('app_data')
        .select('data')
        .eq('user_id', user.id)
        .single();
      
      if (appDataError && appDataError.code !== 'PGRST116') throw appDataError;

      const mainData = appDataRes ? appDataRes.data : {};
      
      // Fetch data from individual tables
      const tablePromises = tablesToSync.map(table =>
        supabase.from(table).select('*').eq('user_id', user.id)
      );
      
      const results = await Promise.all(tablePromises);
      const tableData = {};
      results.forEach((res, index) => {
        const tableName = tablesToSync[index];
        if (res.error) {
          console.error(`Error fetching ${tableName}:`, res.error);
        } else {
          tableData[tableName] = res.data;
        }
      });
      
      const initialState = getInitialState();
      const combinedData = {
        ...initialState,
        ...mainData,
        ...tableData,
        settings: {
          ...initialState.settings,
          ...(mainData.settings || {}),
        },
      };

      setData(combinedData);

    } catch (err) {
      console.error("Error loading data from Supabase:", err);
      toast({ title: "Error", description: "Could not load cloud data. Check your connection.", variant: "destructive" });
      setData(getInitialState());
    } finally {
      setLoading(false);
      setIsDataInitialized(true);
    }
  }, [toast, user]);
  
  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  const updateData = useCallback(async (updateArg, { tableName, recordId } = {}) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to save data.", variant: "destructive" });
      return;
    }

    const updatedData = typeof updateArg === 'function' ? updateArg(data) : { ...data, ...updateArg };
    
    // Optimistically update local state
    setData(updatedData);

    try {
      if (tableName) {
        const records = updatedData[tableName];
        if (!Array.isArray(records)) {
          throw new Error(`Data for table "${tableName}" is not an array.`);
        }
        
        // This is a simplified upsert logic. Assumes a full replace of the table data.
        // For more granular updates, you would check recordId
        await supabase.from(tableName).delete().eq('user_id', user.id);
        const recordsWithUserId = records.map(r => ({ ...r, user_id: user.id }));
        const { error } = await supabase.from(tableName).upsert(recordsWithUserId);
        if (error) throw error;
        
      } else {
        // This is for main app_data (settings, banks, cash)
        const nonTableData = {
          banks: updatedData.banks,
          cashInHand: updatedData.cashInHand,
          cashTransactions: updatedData.cashTransactions, // these should probably be in their own table
          settings: updatedData.settings,
        };
        const { error } = await supabase
          .from('app_data')
          .upsert({ user_id: user.id, data: nonTableData }, { onConflict: 'user_id' });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error saving data to Supabase:', err);
      toast({ title: "Error", description: `Failed to save ${tableName || 'app'} data to the cloud.`, variant: "destructive" });
      // Here you might want to revert the optimistic update or re-fetch data
      loadDataFromSupabase();
    }
  }, [data, toast, user, loadDataFromSupabase]);

  const requestPasscode = useCallback((onSuccess, { isEdit = false } = {}) => {
      const requiresPasscode = isEdit && data.settings?.passcode;
      if (requiresPasscode) {
        setPasscodeContext({ isEdit });
        setPasscodeCallback(() => onSuccess);
        setIsPasscodeModalOpen(true);
      } else {
        onSuccess();
      }
  }, [data.settings?.passcode]);

  const requirePasscodeForAction = useCallback((action) => {
    requestPasscode(action, { isEdit: true });
  }, [requestPasscode]);

  const onPasscodeVerified = () => {
    if (passcodeCallback) passcodeCallback();
    setIsPasscodeModalOpen(false);
    setPasscodeCallback(null);
    setPasscodeContext({ isEdit: false });
  };

  const onPasscodeCancel = () => {
    setIsPasscodeModalOpen(false);
    setPasscodeCallback(null);
    setPasscodeContext({ isEdit: false });
  };

  const { getInvoiceStatus, recalculateAndSyncInvoices } = useInvoiceLogic(data);
  const { getProfitOfSale } = useProfitLogic(data);
  const { getStockDetails } = useStockLogic(data);

  const value = {
    data,
    updateData,
    loading,
    isDataInitialized,
    requestPasscode,
    requirePasscodeForAction,
    transactionToView,
    setTransactionToView,
    getInvoiceStatus,
    recalculateAndSyncInvoices,
    getProfitOfSale,
    getStockDetails,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      {isPasscodeModalOpen && (
         <PasscodeModal
            isOpen={isPasscodeModalOpen}
            onVerified={onPasscodeVerified}
            onClose={onPasscodeCancel}
            requirePasscode={passcodeContext.isEdit}
         />
      )}
    </DataContext.Provider>
  );
};