import React from 'react';
import { formatMoney } from '@/lib/money';

const StockValueReportTemplate = ({ data, settings, totalValue, asOfDate }) => {
  const { companyName, companyLogo, currencySymbol } = settings;

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Stock Value Report</h1>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>As of: {new Date(asOfDate).toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead style={{ backgroundColor: '#eeeeee' }}>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Item</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>SKU</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Qty</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Unit Cost</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Stock Value</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <React.Fragment key={item.id}>
                <tr style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.sku}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{item.qtyOnHand} {item.unit}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(item.unitCost, currencySymbol)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(item.stockValue, currencySymbol)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.status}</td>
                </tr>
                {item.hasImei && item.availableSerials.length > 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '0 10px 10px 10px', border: '1px solid #ccc', borderTop: 'none' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginTop: '5px' }}>
                        <thead style={{ backgroundColor: '#fafafa' }}>
                          <tr>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Serial/IMEI</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Purchase Date</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.availableSerials.map(serial => (
                            <tr key={serial.serial}>
                              <td style={{ border: '1px solid #ddd', padding: '4px' }}>{serial.serial}</td>
                              <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{formatMoney(serial.price, currencySymbol)}</td>
                              <td style={{ border: '1px solid #ddd', padding: '4px' }}>{new Date(serial.purchaseDate).toLocaleDateString()}</td>
                              <td style={{ border: '1px solid #ddd', padding: '4px' }}>Available</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#eeeeee' }}>
              <td colSpan="4" style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Grand Total Stock Value</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(totalValue, currencySymbol)}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
        <p>This is a computer-generated report.</p>
      </footer>
    </div>
  );
};

export default StockValueReportTemplate;