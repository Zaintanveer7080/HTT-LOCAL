import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle } from 'lucide-react';
import SaleItemRow from './SaleItemRow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MiniCreateModal from '@/components/MiniCreateModal';
import { saveItem } from '@/data/create';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';

const SalesFormItems = ({ saleItems, onItemsChange, allItems, sale, itemProfits, purchases, sales }) => {
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemCreationIndex, setItemCreationIndex] = useState(null);
  const { updateData } = useData();
  const { toast } = useToast();

  const addItem = () => {
    onItemsChange([...(saleItems || []), { itemId: '', quantity: 1, price: 0, serials: [] }]);
  };
  
  const removeItem = (index) => {
    onItemsChange(saleItems.filter((_, i) => i !== index));
  };

  const updateSaleItem = (index, updatedItem) => {
    const newSaleItems = [...saleItems];
    newSaleItems[index] = updatedItem;
    onItemsChange(newSaleItems);
  };

  const handleAddNewItemClick = (index) => {
    setItemCreationIndex(index);
    setIsItemModalOpen(true);
  };

  const handleSaveNewItemSuccess = async (newItem) => {
    try {
        await updateData(prevData => {
            const newItems = [...(prevData.items || []), newItem];
            return { ...prevData, items: newItems };
        });

        if (itemCreationIndex !== null) {
          const newSaleItems = [...saleItems];
          newSaleItems[itemCreationIndex].itemId = newItem.id;
          onItemsChange(newSaleItems);
        }
        
        toast({ title: 'Success', description: 'New item added and selected.' });
        setItemCreationIndex(null);
    } catch(error) {
        toast({ title: 'Error', description: 'Failed to update items list.', variant: 'destructive' });
    }
  };

  const getAvailableSerials = React.useCallback((itemId) => {
    if (!itemId) return [];
    
    const purchasedSerials = (purchases || [])
      .flatMap(p => p.items || [])
      .filter(item => item.itemId === itemId && Array.isArray(item.serials))
      .flatMap(item => item.serials.filter(s => s));
      
    const soldSerials = (sales || [])
      .filter(s => !sale || s.id !== sale.id)
      .flatMap(s => s.items || [])
      .filter(item => item.itemId === itemId && Array.isArray(item.serials))
      .flatMap(item => item.serials);

    return purchasedSerials.filter(ps => !soldSerials.includes(ps));
  }, [purchases, sales, sale]);

  const getItemStock = React.useCallback((itemId) => {
    if (!itemId) return 0;
    const itemData = (allItems || []).find(i => i.id === itemId);
    if (itemData?.hasImei) {
      return getAvailableSerials(itemId).length;
    }
    const openingStock = itemData?.openingStock || 0;
    const totalPurchased = (purchases || []).reduce((sum, p) => sum + ((p?.items || []).find(pi => pi.itemId === itemId)?.quantity || 0), 0);
    const totalSold = (sales || []).reduce((sum, s) => {
      if (sale && s.id === sale.id) return sum;
      return sum + ((s?.items || []).find(si => si.itemId === itemId)?.quantity || 0);
    }, 0);
    return openingStock + totalPurchased - totalSold;
  }, [allItems, getAvailableSerials, purchases, sales, sale]);

  const isAnyItemOutOfStock = saleItems.some(i => i.itemId && (parseInt(i.quantity) || 0) > getItemStock(i.itemId));

  return (
    <div className="space-y-2 border-t border-b py-6">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[41.66%]">Item</TableHead>
              <TableHead className="w-[16.66%] text-center">Quantity</TableHead>
              <TableHead className="w-[16.66%] text-right">Unit Price</TableHead>
              <TableHead className="w-[16.66%] text-right">Total</TableHead>
              <TableHead className="w-[8.33%] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>
      <div className="space-y-2">
        {(saleItems || []).map((item, index) => (
          <SaleItemRow
            key={index}
            item={item}
            index={index}
            onItemChange={updateSaleItem}
            onRemove={removeItem}
            onAddNewItem={() => handleAddNewItemClick(index)}
            items={allItems}
            getItemStock={getItemStock}
            getAvailableSerials={getAvailableSerials}
            sale={sale}
            itemProfit={itemProfits[item.itemId]}
          />
        ))}
      </div>
      {isAnyItemOutOfStock && (
        <div className="text-red-600 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Not enough stock for one or more items.
        </div>
      )}
      <Button type="button" variant="outline" onClick={addItem} className="mt-2">
        <Plus className="h-4 w-4 mr-2" />Add Item
      </Button>
      <MiniCreateModal
        open={isItemModalOpen}
        title="Add New Item"
        fields={[
          { key: 'name', label: 'Item Name', required: true },
          { key: 'sku', label: 'SKU (optional)' },
          { key: 'category', label: 'Category' },
          { key: 'unit', label: 'Unit (e.g., pcs, kg)' },
          { key: 'purchasePrice', label: 'Default Purchase Price', type: 'number' },
          { key: 'salePrice', label: 'Default Sale Price', type: 'number' },
          { key: 'openingStock', label: 'Opening Stock', type: 'number' },
          { key: 'hasImei', label: 'Track IMEI/Serial', type: 'checkbox' }
        ]}
        onSave={saveItem}
        onClose={() => setIsItemModalOpen(false)}
        onSaveSuccess={handleSaveNewItemSuccess}
      />
    </div>
  );
};

export default SalesFormItems;