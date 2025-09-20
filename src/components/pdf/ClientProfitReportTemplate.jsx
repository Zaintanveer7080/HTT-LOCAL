import React from 'react';
import { formatMoney } from '@/lib/money';

const ClientProfitReportTemplate = ({ data, settings, grandTotalProfit }) => {
  const { companyName, companyLogo, currencySymbol } = settings;

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Client-wise Profit Report</h1>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px' }}>
        {data.map(client => (
          <div key={client.id} style={{ marginBottom: '20px', border: '1px solid #ccc', borderRadius: '5px', overflow: 'hidden' }}>
            <h2 style={{ backgroundColor: '#eeeeee', padding: '10px', margin: 0, fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{client.name}</span>
              <span style={{ color: client.totalProfit >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>Total Profit: {formatMoney(client.totalProfit, currencySymbol)}</span>
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Invoice #</th>
                  <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Date</th>
                  <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {client.saleDetails.map((sale, idx) => (
                  <tr key={sale.id} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px' }}>{sale.saleNumber}</td>
                    <td style={{ padding: '8px' }}>{new Date(sale.date).toLocaleDateString()}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatMoney(sale.revenue, currencySymbol)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: sale.profit >= 0 ? 'green' : 'red' }}>{formatMoney(sale.profit, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '2px solid #333', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>
          <span>Grand Total Profit: </span>
          <span style={{ color: grandTotalProfit >= 0 ? 'green' : 'red' }}>{formatMoney(grandTotalProfit, currencySymbol)}</span>
        </div>
      </section>

      <footer style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
        <p>Page 1 of 1</p>
      </footer>
    </div>
  );
};

export default ClientProfitReportTemplate;