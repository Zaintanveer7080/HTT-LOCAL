import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import MiniCreateModal from './MiniCreateModal';

const ProductCombobox = ({ value, onChange, onAddNewItem, items, getStock, placeholder = "Select a product..." }) => {
  const [open, setOpen] = useState(false);
  
  const selectedItem = useMemo(() => items.find((item) => item.id === value), [items, value]);

  return (
    <div className="flex gap-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedItem
              ? <div className="flex flex-col items-start"><span className="font-semibold">{selectedItem.name}</span><span className="text-xs text-muted-foreground">{selectedItem.sku}</span></div>
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command
             filter={(value, search) => {
                const item = items.find(i => i.id === value);
                if (!item) return 0;
                
                const s = search.toLowerCase();
                const match =
                  item.name.toLowerCase().includes(s) ||
                  (item.sku && item.sku.toLowerCase().includes(s));

                return match ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Search product..." />
            <CommandList>
              <CommandEmpty>No product found.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? '' : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === item.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                            SKU: {item.sku || 'N/A'} | Stock: {getStock ? `${getStock(item.id)} ${item.unit || ''}` : `N/A`}
                        </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {onAddNewItem && (
        <Button variant="outline" size="icon" type="button" onClick={onAddNewItem}>
            <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ProductCombobox;