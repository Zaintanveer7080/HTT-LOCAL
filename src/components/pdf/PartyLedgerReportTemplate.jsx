import React from 'react';
import { format } from 'date-fns';
import { formatMoney } from '@/lib/money';

const PartyLedgerReportTemplate = ({ ledgerData, settings, party, partyType, dateRange }) => {
  const companyName = settings?.companyName || 'Your Company';
  const currency = settings?.currency || 'AED';
  const currencySymbol = settings?.currencySymbol || currency;

  return (
    <div className="p-8 bg-white font-sans text-sm text-gray-800" style={{ width: '210mm', minHeight: '297mm', position: 'relative' }}>
      <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
          <p className="text-gray-500">{partyType === 'customer' ? 'Customer' : 'Supplier'} Ledger Statement</p>
        </div>
        <div className="text-right">
          <p className="font-semibold mt-2">Date Range:</p>
          <p className="text-gray-600">{dateRange.from} to {dateRange.to}</p>
        </div>
      </header>

      <section className="my-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold text-gray-800">{party?.name}</h2>
        <p className="text-gray-600 font-semibold">
          Closing Balance: <span className="text-lg text-primary">{formatMoney(ledgerData.closingBalance, currencySymbol, currency)}</span>
        </p>
      </section>

      <main>
        <table className="w-full text-left table-auto">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
              <th className="py-2 px-4 font-semibold">Date</th>
              <th className="py-2 px-4 font-semibold">Voucher #</th>
              <th className="py-2 px-4 font-semibold">Type</th>
              <th className="py-2 px-4 font-semibold text-right">Debit</th>
              <th className="py-2 px-4 font-semibold text-right">Credit</th>
              <th className="py-2 px-4 font-semibold text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-semibold bg-gray-50">
              <td colSpan={5} className="py-2 px-4 text-right">Opening Balance</td>
              <td className="py-2 px-4 text-right">{formatMoney(ledgerData.openingBalance, currencySymbol, currency)}</td>
            </tr>
            {ledgerData.transactions.map((tx, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4">{format(tx.date, 'PP')}</td>
                  <td className="py-2 px-4 font-medium">{tx.refId}</td>
                  <td className="py-2 px-4 text-gray-600">{tx.type}</td>
                  <td className="py-2 px-4 text-right">{tx.debit > 0 ? formatMoney(tx.debit, currencySymbol, currency) : '-'}</td>
                  <td className="py-2 px-4 text-right">{tx.credit > 0 ? formatMoney(tx.credit, currencySymbol, currency) : '-'}</td>
                  <td className="py-2 px-4 text-right font-medium">{formatMoney(tx.balance, currencySymbol, currency)}</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t-2 bg-gray-100">
                <td colSpan={5} className="py-3 px-4 text-right text-base">Closing Balance</td>
                <td className="py-3 px-4 text-right text-base">{formatMoney(ledgerData.closingBalance, currencySymbol, currency)}</td>
            </tr>
          </tfoot>
        </table>
        {ledgerData.transactions.length === 0 && <p className="text-center p-8 text-gray-500">No transactions recorded for this period.</p>}
      </main>

      <footer className="absolute bottom-8 left-8 right-8 text-center text-xs text-gray-400 border-t pt-4">
        <p>This is a computer-generated report and does not require a signature.</p>
        <p>{companyName}</p>
      </footer>
    </div>
  );
};

export default PartyLedgerReportTemplate;