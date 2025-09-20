import React from 'react';
import { formatMoney } from '@/lib/money';

const StockSummaryReportTemplate = ({ data, settings, totalValue, totalQuantity }) => {
  const { companyName, companyLogo, currencySymbol } = settings;

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Stock Summary Report</h1>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <thead style={{ backgroundColor: '#eeeeee' }}>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>SKU</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', width: '25%' }}>Item Name</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Qty</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Avg. Pur. Price</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Last Sale Price</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Value</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', width: '25%' }}>IMEIs / Serials</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
               const avgPurchasePrice = item.currentStock > 0 ? item.stockValue / item.currentStock : 0;
               return (
                  <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.sku}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.name}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{item.currentStock} {item.unit}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(avgPurchasePrice, currencySymbol)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{item.lastSalePrice ? formatMoney(item.lastSalePrice, currencySymbol) : '—'}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(item.stockValue, currencySymbol)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', wordBreak: 'break-all' }}>{item.hasImei ? (item.availableSerials || []).join(', ') : 'N/A'}</td>
                  </tr>
                )
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#eeeeee' }}>
              <td colSpan="2" style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Totals</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{totalQuantity}</td>
              <td colSpan="2" style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Total Stock Value</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(totalValue, currencySymbol)}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
        <p>Page 1 of 1</p>
      </footer>
    </div>
  );
};

export default StockSummaryReportTemplate;