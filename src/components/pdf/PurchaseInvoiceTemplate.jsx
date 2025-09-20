import React from 'react';
import { formatFx } from '@/lib/fx';
import { toNumber } from '@/lib/money';

const PurchaseInvoiceTemplate = ({ purchase, supplier, items, settings, getInvoiceStatus }) => {
  const { status, balance } = getInvoiceStatus(purchase);
  const { companyName, companyLogo, currency: baseCurrency } = settings;
  const foreignCurrency = purchase.currency_code || baseCurrency;
  const fxRate = toNumber(purchase.fx_rate) || 1;

  const renderMoney = (foreignAmount, baseAmount) => {
    if (foreignCurrency === baseCurrency) {
      return `${baseCurrency} ${baseAmount.toFixed(2)}`;
    }
    return `${foreignCurrency} ${foreignAmount.toFixed(2)} (${baseCurrency} ${baseAmount.toFixed(2)})`;
  };

  const subTotalForeign = (purchase.items || []).reduce((acc, item) => acc + (toNumber(item.quantity) * toNumber(item.unitPrice)), 0);
  const discountForeign = toNumber(purchase.discount) || 0;
  const taxForeign = toNumber(purchase.tax) || 0;
  const shippingForeign = toNumber(purchase.shipping) || 0;
  const totalForeign = subTotalForeign - discountForeign + taxForeign + shippingForeign;
  const paidBase = purchase.totalCost_base - balance;
  const paidForeign = paidBase / fxRate;

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Purchase Invoice</h1>
            <p style={{ margin: '5px 0 0', fontSize: '14px' }}>Invoice #: {purchase.purchaseNumber}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#555' }}>SUPPLIER</h2>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{supplier?.name}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>{supplier?.contact}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>{supplier?.address}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0 }}><strong>Invoice Date:</strong> {new Date(purchase.date).toLocaleDateString()}</p>
          <p style={{ margin: '5px 0 0' }}><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: status === 'Paid' ? 'green' : 'red' }}>{status}</span></p>
          {foreignCurrency !== baseCurrency && <p style={{ margin: '5px 0 0' }}><strong>FX Rate:</strong> 1 {foreignCurrency} = {fxRate.toFixed(4)} {baseCurrency}</p>}
        </div>
      </section>

      <section style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#eeeeee' }}>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>Item</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>Qty</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>Unit Price</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item, idx) => {
              const itemDetails = items.find(i => i.id === item.itemId);
              const lineTotalForeign = toNumber(item.quantity) * toNumber(item.unitPrice);
              const lineTotalBase = toNumber(item.quantity) * toNumber(item.unitPrice_base);
              return (
                <tr key={item.itemId} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={{ border: '1px solid #ccc', padding: '10px' }}>{itemDetails?.name || 'N/A'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>{item.quantity} {itemDetails?.unit}</td>
                  <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>{renderMoney(toNumber(item.unitPrice), toNumber(item.unitPrice_base))}</td>
                  <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>{renderMoney(lineTotalForeign, lineTotalBase)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {purchase.notes && (
            <>
              <h3 style={{ fontSize: '14px', margin: '0 0 5px 0' }}>Notes</h3>
              <p style={{ fontSize: '12px', margin: 0 }}>{purchase.notes}</p>
            </>
          )}
        </div>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Subtotal</span><span>{renderMoney(subTotalForeign, purchase.subTotal_base || subTotalForeign * fxRate)}</span></div>
          {discountForeign > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Discount</span><span>- {renderMoney(discountForeign, discountForeign * fxRate)}</span></div>}
          {taxForeign > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Tax</span><span>+ {renderMoney(taxForeign, taxForeign * fxRate)}</span></div>}
          {shippingForeign > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Shipping</span><span>+ {renderMoney(shippingForeign, shippingForeign * fxRate)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}><span>Total</span><span>{renderMoney(totalForeign, purchase.totalCost_base)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Paid</span><span>{renderMoney(paidForeign, paidBase)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: 'bold' }}><span>Balance Due</span><span>{renderMoney(balance / fxRate, balance)}</span></div>
        </div>
      </section>

      <footer style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
        <p>Page 1 of 1</p>
      </footer>
    </div>
  );
};

export default PurchaseInvoiceTemplate;