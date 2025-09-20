import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search } from 'lucide-react';

const SaleSerialsManager = ({ item, onSerialsChange, getAvailableSerials, sale }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availableSerials = useMemo(() => {
    return getAvailableSerials(item.itemId);
  }, [item.itemId, getAvailableSerials]);

  const currentSerialsInSale = useMemo(() => {
    return sale?.items?.find(i => i.itemId === item.itemId)?.serials || [];
  }, [sale, item.itemId]);

  const allSelectableSerials = useMemo(() => {
    return [...new Set([...availableSerials, ...currentSerialsInSale])];
  }, [availableSerials, currentSerialsInSale]);

  const filteredSerials = useMemo(() => {
    return allSelectableSerials.filter(serial =>
      serial.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allSelectableSerials, searchTerm]);
  
  const handleSelectionChange = (serial, checked) => {
    let newSerials = [...(item.serials || [])];
    if (checked) {
      newSerials.push(serial);
    } else {
      newSerials = newSerials.filter(s => s !== serial);
    }
    onSerialsChange(newSerials);
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="w-full mt-2">
          Select Serials ({item.serials?.length || 0} selected)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Serial Numbers</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search serials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
            {filteredSerials.length > 0 ? (
              filteredSerials.map(serial => (
                <div key={serial} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    id={`serial-${item.itemId}-${serial}`}
                    checked={item.serials?.includes(serial)}
                    onCheckedChange={(checked) => handleSelectionChange(serial, checked)}
                  />
                  <label
                    htmlFor={`serial-${item.itemId}-${serial}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    {serial}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">No matching serials found.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleSerialsManager;