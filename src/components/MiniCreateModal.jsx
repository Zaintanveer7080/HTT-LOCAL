import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

export default function MiniCreateModal({ open, title, fields, onSave, onClose, onSaveSuccess }) {
  const [values, setValues] = useState({});
  const [isBusy, setIsBusy] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    for (const field of fields) {
      if (field.required && !String(values[field.key] ?? '').trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setIsBusy(true);
    try {
      const newRecord = await onSave(values);
      toast.success('Created successfully!');
      if (onSaveSuccess) {
        onSaveSuccess(newRecord);
      }
      setValues({});
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create record.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleValueChange = (key, value, type) => {
    setValues(prev => ({ ...prev, [key]: type === 'checkbox' ? value : value }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="py-4 space-y-4">
            {fields.map(field => (
              <div key={field.key}>
                {field.type === 'checkbox' ? (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={field.key}
                      checked={!!values[field.key]}
                      onCheckedChange={(checked) => handleValueChange(field.key, checked, 'checkbox')}
                    />
                    <Label htmlFor={field.key}>{field.label}</Label>
                  </div>
                ) : (
                  <>
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type || 'text'}
                      value={values[field.key] || ''}
                      onChange={e => handleValueChange(field.key, e.target.value, field.type)}
                      placeholder={field.label}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}