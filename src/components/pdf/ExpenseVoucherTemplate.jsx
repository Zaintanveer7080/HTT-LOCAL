import React from 'react';
import { formatMoney } from '@/lib/money';

const ExpenseVoucherTemplate = ({ expense, settings }) => {
  const { companyName, companyLogo, currencySymbol } = settings;
  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', fontFamily: 'sans-serif', color: '#000', background: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {companyLogo && <img src={companyLogo} alt="Company Logo" style={{ width: '50px', height: '50px', marginRight: '15px' }} />}
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#1a237e' }}>Expense Voucher</h1>
            <p style={{ margin: '5px 0 0', fontSize: '14px' }}>Voucher ID: {expense.id}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{companyName}</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <section style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '14px' }}><strong>Voucher Date:</strong> {new Date(expense.date).toLocaleDateString()}</p>
          </div>
        </div>
      </section>

      <section>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#eeeeee' }}>
            <tr >
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'left' }}>Description</th>
              <th style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#f9f9f9' }}>
              <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{expense.category}</p>
                {expense.notes && <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#555' }}>{expense.notes}</p>}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(expense.amount, currencySymbol)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '30px', textAlign: 'right' }}>
        <div style={{ display: 'inline-block', width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #ccc' }}>
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Total</span>
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{formatMoney(expense.amount, currencySymbol)}</span>
          </div>
        </div>
      </section>

      <footer style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
        <p>Page 1 of 1</p>
      </footer>
    </div>
  );
};

export default ExpenseVoucherTemplate;