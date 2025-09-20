import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';

const SupplierForm = ({ supplier, onSave, onCancel }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact: supplier?.contact || '',
    address: supplier?.address || ''
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Supplier Name is required.",
        variant: "destructive"
      });
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="py-4 space-y-4">
      <div>
        <Label htmlFor="name">Supplier Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Enter supplier name"
        />
      </div>
      <div>
        <Label htmlFor="contact">Contact</Label>
        <Input
          id="contact"
          value={formData.contact}
          onChange={(e) => setFormData({...formData, contact: e.target.value})}
          placeholder="Phone number or email"
        />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          placeholder="Enter address (optional)"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {supplier ? 'Update' : 'Add'} Supplier
        </Button>
      </DialogFooter>
    </form>
  );
};

function Suppliers() {
  const { data, updateData } = useData();
  const { suppliers = [] } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const { toast } = useToast();

  const handleSave = (formData) => {
    const supplierData = {
      id: editingSupplier ? editingSupplier.id : Date.now().toString(),
      ...formData
    };

    let updatedSuppliers;
    if (editingSupplier) {
      updatedSuppliers = suppliers.map(s => s.id === editingSupplier.id ? supplierData : s);
      toast({
        title: "Success",
        description: "Supplier updated successfully!"
      });
    } else {
      updatedSuppliers = [...suppliers, supplierData];
      toast({
        title: "Success",
        description: "Supplier added successfully!"
      });
    }

    updateData({ suppliers: updatedSuppliers });
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    const updatedSuppliers = suppliers.filter(s => s.id !== id);
    updateData({ suppliers: updatedSuppliers });
    toast({
      title: "Success",
      description: "Supplier deleted successfully!"
    });
  };

  const resetForm = () => {
    setEditingSupplier(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Supplier Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your supplier database</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsDialogOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </DialogTitle>
            </DialogHeader>
            <SupplierForm 
              supplier={editingSupplier}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No suppliers found. Add your first supplier!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier, index) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-purple-600" />
                      <span className="text-lg">{supplier.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="text-sm">{supplier.contact}</span>
                  </div>
                  {supplier.address && (
                    <div className="flex items-start text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                      <span className="text-sm">{supplier.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Suppliers;
export { SupplierForm };