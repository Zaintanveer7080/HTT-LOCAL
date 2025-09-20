import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, TrendingUp, Truck } from 'lucide-react';
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

const PaymentStatusBadge = ({ status }) => {
  const statusStyles = {
    Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    Credit: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || ''}`}>
      {status}
    </span>
  );
};

const SalesList = ({ sales, getCustomerName, handleEdit, handleDelete, getPaymentStatus }) => {
  if (sales.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No sales found. Record your first sale!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Sales Records
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Inv #</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Total Qty</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, index) => (
                <motion.tr
                  key={sale.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="p-2 font-mono">{sale.saleNumber}</td>
                  <td className="p-2">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="p-2">{getCustomerName(sale.customerId)}</td>
                  <td className="p-2 text-center">{sale.totalQuantity}</td>
                  <td className="p-2 font-semibold text-green-600">RS {sale.totalCost.toFixed(2)}</td>
                  <td className="p-2"><PaymentStatusBadge status={getPaymentStatus(sale)} /></td>
                  <td className="p-2">
                    <div className="flex space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(sale)}><Edit className="h-4 w-4" /></Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the sale invoice. This action is not recommended and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(sale.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesList;