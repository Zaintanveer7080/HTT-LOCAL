import React from 'react';
import { format } from 'date-fns';
import { formatMoney } from '@/lib/money';

const BankStatementTemplate = ({ transactions, bank, dateRange, settings }) => {
  const { companyName, companyLogo, currencySymbol } = settings;

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Bank Statement</h1>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', backgroundColor: '#eeeeee', padding: '10px', borderRadius: '5px' }}>
        <div>
          <p style={{ margin: 0 }}><strong>Bank:</strong> {bank.name}</p>
          <p style={{ margin: '5px 0 0' }}><strong>Statement Period:</strong> {format(new Date(dateRange.from), 'PP')} to {format(new Date(dateRange.to), 'PP')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Current Balance: {formatMoney(bank.balance, currencySymbol)}</p>
        </div>
      </section>

      <section style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead style={{ backgroundColor: '#eeeeee' }}>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Description</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Debit</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Credit</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{format(new Date(tx.date), 'PPpp')}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{tx.description}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#555' }}>{tx.type}</p>
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', color: 'red' }}>
                  {tx.flow === 'out' ? formatMoney(tx.amount, currencySymbol) : '-'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', color: 'green' }}>
                  {tx.flow === 'in' ? formatMoney(tx.amount, currencySymbol) : '-'}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{formatMoney(tx.balance, currencySymbol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
        <p>Page 1 of 1</p>
      </footer>
    </div>
  );
};

export default BankStatementTemplate;