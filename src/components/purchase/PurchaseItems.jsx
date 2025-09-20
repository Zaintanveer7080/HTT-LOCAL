import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import PurchaseItemRow from './PurchaseItemRow';
import MiniCreateModal from '@/components/MiniCreateModal';
import { saveItem } from '@/data/create';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';

const PurchaseItems = ({ items, onItemsChange, allItems, currencyCode, fxRate, baseCurrency }) => {
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemCreationIndex, setItemCreationIndex] = useState(null);
  const { updateData } = useData();
  const { toast } = useToast();

  const addItem = () => {
    onItemsChange([...(items || []), { itemId: null, quantity: 1, unit_price_foreign: 0, unit_price_local: 0, serials: [] }]);
  };
  
  const removeItem = (index) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, updatedItem) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    onItemsChange(newItems);
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
          const newPurchaseItems = [...items];
          newPurchaseItems[itemCreationIndex].itemId = newItem.id;
          onItemsChange(newPurchaseItems);
        }
        
        toast({ title: 'Success', description: 'New item added and selected.' });
        setItemCreationIndex(null);
    } catch(error) {
        toast({ title: 'Error', description: 'Failed to update items list.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 border-t border-b py-6">
      <Label>Items</Label>
      {(items || []).map((item, index) => (
        <PurchaseItemRow
          key={index}
          item={item}
          index={index}
          onItemChange={updateItem}
          onRemove={removeItem}
          onAddNewItem={() => handleAddNewItemClick(index)}
          allItems={allItems}
          currencyCode={currencyCode}
          fxRate={fxRate}
          baseCurrency={baseCurrency}
        />
      ))}
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

export default PurchaseItems;