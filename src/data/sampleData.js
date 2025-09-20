export const initializeSampleData = () => {
  const dataKey = 'erp_data';
  const initializedKey = 'erp_data_initialized';

  if (localStorage.getItem(initializedKey)) {
    return;
  }

  const sampleData = {
    customers: [
      { id: 'cust1', name: 'Retail Corp', contact: '111-222-3333', address: '123 Retail St' },
      { id: 'cust2', name: 'Tech Innovators', contact: '444-555-6666', address: '456 Tech Ave' }
    ],
    suppliers: [
      { id: 'sup1', name: 'Global Goods', contact: '777-888-9999', address: '789 Global Blvd' },
      { id: 'sup2', name: 'Component Co', contact: '101-112-1314', address: '101 Component Dr' }
    ],
    items: [
      { id: 'item1', sku: 'LP-001', name: 'Laptop Pro', category: 'Electronics' },
      { id: 'item2', sku: 'MS-002', name: 'Wireless Mouse', category: 'Accessories' }
    ],
    purchases: [
      { id: 'pur1', supplierId: 'sup1', itemId: 'item1', quantity: 20, price: 800, shippingFee: 100, packingFee: 50, otherExpenses: 0, totalCost: 16150, costPerUnit: 807.5, date: '2025-07-01' },
      { id: 'pur2', supplierId: 'sup2', itemId: 'item2', quantity: 100, price: 20, shippingFee: 50, packingFee: 20, otherExpenses: 0, totalCost: 2070, costPerUnit: 20.7, date: '2025-07-05' }
    ],
    sales: [
      { id: 'sale1', customerId: 'cust1', itemId: 'item1', quantity: 2, sellingPrice: 1200, discount: 50, totalRevenue: 2350, totalCost: 1615, profit: 735, costPerUnit: 807.5, date: '2025-07-10', isOnlineOrder: true },
      { id: 'sale2', customerId: 'cust2', itemId: 'item2', quantity: 10, sellingPrice: 35, discount: 0, totalRevenue: 350, totalCost: 207, profit: 143, costPerUnit: 20.7, date: '2025-07-12', isOnlineOrder: false },
      { id: 'sale3', customerId: 'cust1', itemId: 'item2', quantity: 5, sellingPrice: 35, discount: 0, totalRevenue: 175, totalCost: 103.5, profit: 71.5, costPerUnit: 20.7, date: '2025-07-15', isOnlineOrder: true }
    ],
    expenses: [
      { id: 'exp1', category: 'Rent', amount: 1500, notes: 'July Office Rent', date: '2025-07-01' },
      { id: 'exp2', category: 'Utilities', amount: 300, notes: 'Electricity & Internet', date: '2025-07-05' }
    ],
    banks: [
      { id: 'bank1', name: 'HDFC Bank', balance: 50000 },
      { id: 'bank2', name: 'SBI', balance: 150000 }
    ],
    cashInHand: 10000,
    cashTransactions: [
        { id: 'ctx1', date: '2025-07-01T10:00:00Z', type: 'add', amount: 10000, description: 'Initial cash setup' }
    ],
    payments: [
      { id: 'pay1', type: 'in', partyId: 'cust2', invoiceId: 'sale2', amount: 350, date: '2025-07-12', method: 'cash', bankId: '', notes: 'Full payment on sale' },
      { id: 'pay2', type: 'in', partyId: 'cust1', invoiceId: 'sale1', amount: 1000, date: '2025-07-11', method: 'bank', bankId: 'bank1', notes: 'Advance payment' }
    ],
    onlineOrders: [
        { id: 'ol1', saleId: 'sale1', orderNumber: 'A-101', courierName: 'BlueDart', trackingNumber: 'BD12345678', trackingLink: '#', deliveryCharges: 80, rtoCharges: 0, status: 'In Transit', statusHistory: [
            { status: 'Pending', date: '2025-07-10T11:00:00Z' },
            { status: 'In Transit', date: '2025-07-11T09:00:00Z' },
        ]},
        { id: 'ol2', saleId: 'sale3', orderNumber: 'A-102', courierName: 'Delhivery', trackingNumber: '', trackingLink: '', deliveryCharges: 0, rtoCharges: 0, status: 'Pending', statusHistory: [
            { status: 'Pending', date: '2025-07-15T14:00:00Z' },
        ]},
    ]
  };

  localStorage.setItem(dataKey, JSON.stringify(sampleData));
  localStorage.setItem(initializedKey, 'true');
};