import React from 'react';
import { formatMoney } from '@/lib/money';

const SaleInvoiceTemplate = ({ sale, customer, items, settings, getInvoiceStatus }) => {
  const { status, balance, paidAmount } = getInvoiceStatus(sale);
  const { companyName, companyLogo, currencySymbol } = settings;

  const safeToFixed = (num) => (typeof num === 'number' ? num.toFixed(2) : '0.00');

  const totalCost = sale?.totalCost || 0;
  const subTotal = sale?.subTotal || 0;
  const saleItems = sale?.items || [];

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
         <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Sale Invoice</h1>
            <p style={{ margin: '5px 0 0', fontSize: '14px' }}>Invoice #: {sale.saleNumber}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#555' }}>BILL TO</h2>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{customer?.name}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>{customer?.contact}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>{customer?.address}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0 }}><strong>Invoice Date:</strong> {new Date(sale.date).toLocaleDateString()}</p>
          <p style={{ margin: '5px 0 0' }}><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: status === 'Paid' ? 'green' : 'red' }}>{status}</span></p>
        </div>
      </section>

      <section style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#eeeeee' }}>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>Item</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>Qty</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>Price</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {saleItems.map((item, index) => {
              const itemDetails = items.find(i => i.id === item.itemId);
              const price = item.price || 0;
              const quantity = item.quantity || 0;
              return (
                <tr key={`${item.itemId}-${index}`} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={{ border: '1px solid #ccc', padding: '10px' }}>{itemDetails?.name || 'N/A'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>{quantity} {itemDetails?.unit}</td>
                  <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>{formatMoney(price, currencySymbol)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>{formatMoney(quantity * price, currencySymbol)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {sale.notes && (
            <>
              <h3 style={{ fontSize: '14px', margin: '0 0 5px 0' }}>Notes</h3>
              <p style={{ fontSize: '12px', margin: 0 }}>{sale.notes}</p>
            </>
          )}
        </div>
        <div style={{ width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Subtotal</span><span>{formatMoney(subTotal, currencySymbol)}</span></div>
          {sale.discount?.value > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Discount</span><span>- {formatMoney(subTotal - totalCost, currencySymbol)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}><span>Total</span><span>{formatMoney(totalCost, currencySymbol)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Paid</span><span>{formatMoney(paidAmount, currencySymbol)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: 'bold' }}><span>Balance Due</span><span>{formatMoney(balance, currencySymbol)}</span></div>
        </div>
      </section>

      <footer style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
        <p>Page 1 of 1</p>
      </footer>
    </div>
  );
};

export default SaleInvoiceTemplate;