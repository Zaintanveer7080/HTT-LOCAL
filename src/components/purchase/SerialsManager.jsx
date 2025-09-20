import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const SerialsManager = ({ serials, onSerialsChange }) => {
  const [currentSerial, setCurrentSerial] = useState('');
  const { toast } = useToast();

  const handleAddSerial = () => {
    if (!currentSerial.trim()) return;
    if (serials.includes(currentSerial.trim())) {
      toast({
        title: 'Duplicate Serial',
        description: `The serial number "${currentSerial}" has already been added.`,
        variant: 'destructive',
      });
      return;
    }
    onSerialsChange([...serials, currentSerial.trim()]);
    setCurrentSerial('');
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSerial();
    }
  };

  const handleRemoveSerial = (serialToRemove) => {
    onSerialsChange(serials.filter(s => s !== serialToRemove));
  };

  return (
    <div className="space-y-3">
        <label className="text-sm font-medium">Add IMEI / Serial Numbers</label>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter serial number..."
          value={currentSerial}
          onChange={(e) => setCurrentSerial(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button onClick={handleAddSerial} type="button" className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg min-h-[4rem] border">
        <AnimatePresence>
            {serials.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                {serials.map((serial) => (
                    <motion.div
                    key={serial}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                    <Badge variant="secondary" className="text-base py-1 pl-3 pr-2">
                        {serial}
                        <button
                            onClick={() => handleRemoveSerial(serial)}
                            className="ml-2 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                    </motion.div>
                ))}
                </div>
            ) : (
                <p className="text-sm text-center text-muted-foreground py-2">No serial numbers added yet.</p>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};