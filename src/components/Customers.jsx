import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, UserCheck, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';

const CustomerForm = ({ customer, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    contact: customer?.contact || '',
    address: customer?.address || ''
  });
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="py-4 space-y-4">
      <div>
        <Label htmlFor="name">Customer Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Enter customer name"
        />
      </div>
      <div>
        <Label htmlFor="contact">Contact *</Label>
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
          {customer ? 'Update' : 'Add'} Customer
        </Button>
      </DialogFooter>
    </form>
  );
};

function Customers() {
  const { data, updateData } = useData();
  const { customers } = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const { toast } = useToast();

  const handleSave = (formData) => {
    const customerData = {
      id: editingCustomer ? editingCustomer.id : Date.now().toString(),
      ...formData
    };

    let updatedCustomers;
    if (editingCustomer) {
      updatedCustomers = customers.map(c => c.id === editingCustomer.id ? customerData : c);
      toast({
        title: "Success",
        description: "Customer updated successfully!"
      });
    } else {
      updatedCustomers = [...customers, customerData];
      toast({
        title: "Success",
        description: "Customer added successfully!"
      });
    }

    updateData({ customers: updatedCustomers });
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    const updatedCustomers = customers.filter(c => c.id !== id);
    updateData({ customers: updatedCustomers });
    toast({
      title: "Success",
      description: "Customer deleted successfully!"
    });
  };

  const resetForm = () => {
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Customer Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your customer database</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsDialogOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
            </DialogHeader>
            <CustomerForm 
              customer={editingCustomer}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No customers found. Add your first customer!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserCheck className="h-5 w-5 mr-2 text-green-600" />
                      <span className="text-lg">{customer.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="text-sm">{customer.contact}</span>
                  </div>
                  {customer.address && (
                    <div className="flex items-start text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                      <span className="text-sm">{customer.address}</span>
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

export default Customers;
export { CustomerForm };