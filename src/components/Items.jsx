import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ItemForm = ({ item, onSave, onCancel }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    sku: item?.sku || '',
    name: item?.name || '',
    category: item?.category || '',
    purchasePrice: item?.purchasePrice?.toString() || '',
    salePrice: item?.salePrice?.toString() || '',
    openingStock: item?.openingStock || 0,
    unit: item?.unit || 'pcs',
    hasImei: item?.hasImei || false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
     if (!formData.name) {
      toast({ title: "Validation Error", description: "Item Name is required.", variant: "destructive" });
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="py-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label htmlFor="sku">SKU</Label><Input id="sku" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} /></div>
        <div><Label htmlFor="name">Item Name *</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div><Label htmlFor="category">Category</Label><Input id="category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} /></div>
         <div><Label htmlFor="unit">Unit (e.g., pcs, kg)</Label><Input id="unit" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label htmlFor="purchasePrice">Default Purchase Price</Label><Input id="purchasePrice" type="number" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} /></div>
        <div><Label htmlFor="salePrice">Default Sale Price</Label><Input id="salePrice" type="number" value={formData.salePrice} onChange={(e) => setFormData({...formData, salePrice: e.target.value})} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label htmlFor="openingStock">Opening Stock</Label><Input id="openingStock" type="number" value={formData.openingStock} onChange={(e) => setFormData({...formData, openingStock: e.target.value})} /></div>
        <div className="flex items-center space-x-2 pt-6">
          <Switch id="hasImei" checked={formData.hasImei} onCheckedChange={(checked) => setFormData({...formData, hasImei: checked})} />
          <Label htmlFor="hasImei">Track IMEI/Serial</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{item ? 'Update' : 'Add'} Item</Button>
      </DialogFooter>
    </form>
  );
};

function Items() {
  const { data, updateData, requestPasscode } = useData();
  const { items, purchases, sales } = data;
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const getItemStats = (itemId) => {
    const itemData = items.find(i => i.id === itemId);
    const openingStock = itemData?.openingStock || 0;

    const totalPurchased = (purchases || []).reduce((sum, p) => {
      if (!p || !p.items) return sum;
      const itemInPurchase = p.items.find(pi => pi.itemId === itemId);
      return sum + (itemInPurchase ? itemInPurchase.quantity : 0);
    }, 0);
    
    const totalSold = (sales || []).reduce((sum, s) => {
      if (!s || !s.items) return sum;
      const itemInSale = s.items.find(si => si.itemId === itemId);
      return sum + (itemInSale ? itemInSale.quantity : 0);
    }, 0);

    const closingStock = openingStock + totalPurchased - totalSold;
    
    return {
      openingStock,
      purchases: totalPurchased,
      sales: totalSold,
      closingStock
    };
  };

  const handleSave = (formData) => {
    const itemData = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      salePrice: parseFloat(formData.salePrice) || 0,
      openingStock: parseInt(formData.openingStock, 10) || 0,
      unit: formData.unit || 'pcs',
      hasImei: formData.hasImei,
    };

    let updatedItems;
    if (editingItem) {
      updatedItems = items.map(i => i.id === editingItem.id ? itemData : i);
      toast({ title: "Success", description: "Item updated successfully!" });
    } else {
      updatedItems = [...items, itemData];
      toast({ title: "Success", description: "Item added successfully!" });
    }

    updateData({ items: updatedItems });
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
     requestPasscode(() => {
        const isUsedInPurchase = (purchases || []).some(p => p && p.items && p.items.some(pi => pi.itemId === id));
        const isUsedInSale = (sales || []).some(s => s && s.items && s.items.some(si => si.itemId === id));
        
        if (isUsedInPurchase || isUsedInSale) {
          toast({ title: "Cannot Delete", description: "This item has associated purchase or sale records.", variant: "destructive" });
          return;
        }

        updateData({ items: items.filter(i => i.id !== id) });
        toast({ title: "Success", description: "Item deleted successfully!" });
    });
  };

  const resetForm = () => {
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Item Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your inventory items and stock levels</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsDialogOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle></DialogHeader>
            <ItemForm 
              item={editingItem}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Package className="h-5 w-5 mr-2" />Inventory Items</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8"><Package className="h-12 w-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">No items found.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b"><th className="text-left p-2">SKU</th><th className="text-left p-2">Item Name</th><th className="text-left p-2">Category</th><th className="text-left p-2">IMEI</th><th className="text-left p-2">Pur.</th><th className="text-left p-2">Sold</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Status</th><th className="text-left p-2">Actions</th></tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const stats = getItemStats(item.id);
                    const isLowStock = stats.closingStock <= 5 && stats.closingStock > 0;
                    const isOutOfStock = stats.closingStock <= 0;
                    return (
                      <motion.tr key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border-b hover:bg-muted">
                        <td className="p-2 font-mono text-sm">{item.sku}</td><td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2"><span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">{item.category}</span></td>
                        <td className="p-2">{item.hasImei ? <CheckCircle className="h-5 w-5 text-green-500" /> : null}</td>
                        <td className="p-2 text-blue-600">{stats.purchases}</td><td className="p-2 text-green-600">{stats.sales}</td>
                        <td className="p-2 font-semibold"><span className={`${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : ''}`}>{stats.closingStock} {item.unit}</span></td>
                        <td className="p-2">
                          {isOutOfStock ? <div className="flex items-center text-red-600"><AlertTriangle className="h-4 w-4 mr-1" /><span className="text-xs">Out of Stock</span></div>
                          : isLowStock ? <div className="flex items-center text-orange-600"><AlertTriangle className="h-4 w-4 mr-1" /><span className="text-xs">Low Stock</span></div>
                          : <div className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /><span className="text-xs">In Stock</span></div>}
                        </td>
                        <td className="p-2"><div className="flex space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-red-500" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the item.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Items;
export { ItemForm };