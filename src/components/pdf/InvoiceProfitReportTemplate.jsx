import React from 'react';
import { formatMoney } from '@/lib/money';

const InvoiceProfitReportTemplate = ({ data, settings, totalProfit }) => {
  const { companyName, companyLogo, currencySymbol } = settings;

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Invoice-wise Profit Report</h1>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead style={{ backgroundColor: '#eeeeee' }}>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Invoice #</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Customer</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Revenue</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Cost</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Profit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((sale, idx) => (
              <tr key={sale.id} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{sale.saleNumber}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(sale.date).toLocaleDateString()}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{sale.customerName}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(sale.revenue, currencySymbol)}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(sale.itemsCost, currencySymbol)}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', color: sale.profit >= 0 ? 'green' : 'red' }}>{formatMoney(sale.profit, currencySymbol)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#eeeeee' }}>
              <td colSpan="5" style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Total Profit</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', color: totalProfit >= 0 ? 'green' : 'red' }}>{formatMoney(totalProfit, currencySymbol)}</td>
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

export default InvoiceProfitReportTemplate;