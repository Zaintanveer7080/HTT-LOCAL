import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Landmark, Wallet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import CashTransactionLog from '@/components/cash-and-bank/CashTransactionLog';
import BankTransactionLog from '@/components/cash-and-bank/BankTransactionLog';
import { formatMoney } from '@/lib/money';

const BankAccountsCard = ({ banks, onAdd, onEdit, onDelete, currencySymbol }) => (
    <Card className="card-hover lg:col-span-2">
        <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center"><Landmark className="h-5 w-5 mr-2 text-blue-500"/>Bank Accounts</div>
                <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1"/> Add Bank</Button>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4 max-h-48 overflow-y-auto">
                {banks.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No bank accounts added yet.</p>
                ) : (
                    banks.map(bank => (
                        <motion.div key={bank.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div>
                                <p className="font-semibold">{bank.name}</p>
                                <p className="text-xl font-bold text-blue-500">{formatMoney(bank.balance, currencySymbol)}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(bank)}><Edit className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(bank.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </CardContent>
    </Card>
);

const CashInHandCard = ({ cashInHand, onAdjust, currencySymbol }) => (
    <Card className="card-hover lg:col-span-1">
        <CardHeader>
            <CardTitle className="flex items-center text-lg"><Wallet className="h-5 w-5 mr-2 text-green-500"/>Cash in Hand</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-4xl font-bold text-green-500">{formatMoney(cashInHand, currencySymbol)}</p>
        </CardContent>
        <CardFooter>
            <Button size="sm" onClick={onAdjust}>Adjust Cash</Button>
        </CardFooter>
    </Card>
);

const BankDialog = ({ isOpen, onOpenChange, onSubmit, editingBank, formData, setFormData }) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingBank ? 'Edit Bank' : 'Add New Bank'}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="py-4 space-y-4">
                <div><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., HDFC Bank" /></div>
                <div><Label htmlFor="balance">{editingBank ? 'Current Balance' : 'Opening Balance'}</Label><Input id="balance" type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} placeholder="e.g., 50000" /></div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">{editingBank ? 'Update Bank' : 'Add Bank'}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
);

const CashDialog = ({ isOpen, onOpenChange, onSubmit, editingTx, formData, setFormData }) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingTx ? 'Edit Cash Transaction' : 'Adjust Cash in Hand'}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="py-4 space-y-4">
                <Tabs value={formData.type} onValueChange={(type) => setFormData({...formData, type})} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="add">Add Cash</TabsTrigger>
                        <TabsTrigger value="remove">Remove Cash</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div><Label htmlFor="cashAmount">Amount</Label><Input id="cashAmount" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="e.g., 5000" /></div>
                <div><Label htmlFor="cashDesc">Description</Label><Input id="cashDesc" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g., Initial cash deposit" /></div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">{editingTx ? 'Update Transaction' : 'Submit Adjustment'}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
);


function CashAndBank() {
    const { data, updateData, requestPasscode, requirePasscodeForAction } = useData();
    const { cashInHand, banks, sales, purchases, expenses, payments, cashTransactions, customers, suppliers } = data;
    const { toast } = useToast();
    const currencySymbol = data.settings?.currencySymbol || 'Rs';

    const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
    const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
    
    const [editingBank, setEditingBank] = useState(null);
    const [editingTx, setEditingTx] = useState(null);
    
    const [bankFormData, setBankFormData] = useState({ name: '', balance: '' });
    const [cashFormData, setCashFormData] = useState({ type: 'add', amount: '', description: '' });

    useEffect(() => {
        if (isBankDialogOpen && editingBank) {
            setBankFormData({ name: editingBank.name, balance: editingBank.balance.toString() });
        } else if (!isBankDialogOpen) {
            setEditingBank(null);
            setBankFormData({ name: '', balance: '' });
        }
    }, [isBankDialogOpen, editingBank]);

    useEffect(() => {
        if (isCashDialogOpen && editingTx) {
             setCashFormData({ 
                type: editingTx.ref.type === 'add' ? 'add' : 'remove', 
                amount: editingTx.ref.amount.toString(),
                description: editingTx.ref.description 
            });
        } else if (!isCashDialogOpen) {
            setEditingTx(null);
            setCashFormData({ type: 'add', amount: '', description: '' });
        }
    }, [isCashDialogOpen, editingTx]);

    const handleBankSubmit = (e) => {
        e.preventDefault();
        requirePasscodeForAction(() => {
            if (!bankFormData.name || !bankFormData.balance) {
                toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
                return;
            }
            const bankData = {
                id: editingBank ? editingBank.id : Date.now().toString(),
                name: bankFormData.name,
                balance: parseFloat(bankFormData.balance)
            };
            let updatedBanks;
            if (editingBank) {
                updatedBanks = banks.map(b => b.id === editingBank.id ? bankData : b);
            } else {
                updatedBanks = [...banks, bankData];
            }
            updateData({ banks: updatedBanks });
            toast({ title: "Success", description: `Bank ${editingBank ? 'updated' : 'added'} successfully!`, variant: 'success' });
            setIsBankDialogOpen(false);
        });
    };
  
    const handleCashSubmit = (e) => {
        e.preventDefault();
        requirePasscodeForAction(() => {
            if (!cashFormData.amount || !cashFormData.description) {
                toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
                return;
            }
            
            const amount = parseFloat(cashFormData.amount);
            
            if (editingTx) {
                const oldTx = editingTx.ref;
                const oldAmount = oldTx.amount;
                let revertedCash = cashInHand;
                if(oldTx.type === 'add') {
                    revertedCash -= oldAmount;
                } else {
                    revertedCash += oldAmount;
                }
                
                const newAmount = amount;
                let finalCash = revertedCash;
                if(cashFormData.type === 'add') {
                    finalCash += newAmount;
                } else {
                    finalCash -= newAmount;
                }

                const updatedTx = { ...oldTx, amount: newAmount, type: cashFormData.type, description: cashFormData.description };
                const updatedCashTransactions = cashTransactions.map(tx => tx.id === oldTx.id ? updatedTx : tx);
                updateData({ cashInHand: finalCash, cashTransactions: updatedCashTransactions });
                toast({ title: "Success", description: "Cash transaction updated successfully!", variant: 'success' });

            } else {
                const newCashInHand = cashFormData.type === 'add' ? cashInHand + amount : cashInHand - amount;
                const newTransaction = { id: Date.now().toString(), date: new Date().toISOString(), type: cashFormData.type, amount, description: cashFormData.description };
                updateData({ cashInHand: newCashInHand, cashTransactions: [...(cashTransactions || []), newTransaction] });
                toast({ title: "Success", description: "Cash in hand adjusted successfully!", variant: 'success' });
            }
           
            setIsCashDialogOpen(false);
        });
    };

    const handleEditBank = (bank) => {
        setEditingBank(bank);
        setIsBankDialogOpen(true);
    };

    const handleEditTransaction = (tx) => {
        if(tx.refType !== 'cash') {
             toast({ title: "Info", description: "Only manual cash adjustments can be edited here.", variant: "default" });
            return;
        }
        setEditingTx(tx);
        setIsCashDialogOpen(true);
    }
  
    const handleDeleteBank = (id) => {
        requirePasscodeForAction(() => {
            const isBankUsed = [
                ...(sales || []),
                ...(purchases || []),
                ...(expenses || []),
                ...(payments || [])
            ].some(tx => tx.payment?.bankId === id || tx.bankId === id);
            
            if(isBankUsed) {
                toast({ title: "Deletion Failed", description: "This bank account has transactions linked to it and cannot be deleted.", variant: "destructive" });
                return;
            }
            updateData({ banks: banks.filter(b => b.id !== id) });
            toast({ title: "Success", description: "Bank deleted successfully!", variant: 'success' });
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Cash & Bank</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your cash flow and bank accounts.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <CashInHandCard cashInHand={cashInHand} onAdjust={() => { setEditingTx(null); setIsCashDialogOpen(true); }} currencySymbol={currencySymbol} />
                <BankAccountsCard banks={banks} onAdd={() => setIsBankDialogOpen(true)} onEdit={handleEditBank} onDelete={handleDeleteBank} currencySymbol={currencySymbol} />
            </div>

            <BankDialog 
                isOpen={isBankDialogOpen}
                onOpenChange={setIsBankDialogOpen}
                onSubmit={handleBankSubmit}
                editingBank={editingBank}
                formData={bankFormData}
                setFormData={setBankFormData}
            />
            <CashDialog 
                isOpen={isCashDialogOpen}
                onOpenChange={setIsCashDialogOpen}
                onSubmit={handleCashSubmit}
                editingTx={editingTx}
                formData={cashFormData}
                setFormData={setCashFormData}
            />

            <Tabs defaultValue="cash" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cash"><Wallet className="h-4 w-4 mr-2"/>Cash Log</TabsTrigger>
                    <TabsTrigger value="bank"><Landmark className="h-4 w-4 mr-2"/>Bank Log</TabsTrigger>
                </TabsList>
                <TabsContent value="cash">
                    <CashTransactionLog onEditTransaction={handleEditTransaction} />
                </TabsContent>
                <TabsContent value="bank">
                     <BankTransactionLog />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default CashAndBank;