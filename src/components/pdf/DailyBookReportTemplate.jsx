// src/components/pdf/DailyBookReportTemplate.jsx
import React from 'react';
import { format } from 'date-fns';
import { formatMoney, toNumber } from '@/lib/money';

const isValidDate = (v) => {
  if (!v) return false;
  const d = v instanceof Date ? v : new Date(v);
  return !isNaN(d.getTime());
};

const toDateSafe = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmt = (v, fmtStr) => {
  const d = toDateSafe(v);
  return d ? format(d, fmtStr) : '—';
};

const DailyBookReportTemplate = ({ data, settings, dateRange }) => {
  const companyName = settings?.companyName || 'Your Company';
  const currencySymbol = settings?.currencySymbol || 'AED';

  // Graceful date-range label (supports single day or missing 'to')
  const fromLabel = fmt(dateRange?.from, 'PP');
  const toLabelRaw = dateRange?.to ?? dateRange?.from; // single-day selection uses 'from'
  const toLabel = fmt(toLabelRaw, 'PP');
  const rangeLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} to ${toLabel}`;

  const rows = Array.isArray(data) ? data : [];

  return (
    <div
      className="p-8 bg-white font-sans text-sm text-gray-800 relative"
      style={{ width: '210mm', minHeight: '297mm' }}
    >
      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
          <p className="text-gray-500">Daily Book Report</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">Date Range:</p>
          <p className="text-gray-600">{rangeLabel}</p>
          <p className="font-semibold mt-2">Report Generated:</p>
          <p className="text-gray-600">{fmt(new Date(), 'PPpp')}</p>
        </div>
      </header>

      <main className="mt-8">
        <table className="w-full text-left table-auto">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
              <th className="py-2 px-4 font-semibold">Time</th>
              <th className="py-2 px-4 font-semibold">Type</th>
              <th className="py-2 px-4 font-semibold">Ref #</th>
              <th className="py-2 px-4 font-semibold">Party/Details</th>
              <th className="py-2 px-4 font-semibold text-right">Amount</th>
              <th className="py-2 px-4 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx, idx) => {
              // Accept various time fields; avoid crashes on invalid values
              const timeVal = tx?.time ?? tx?.date ?? tx?.createdAt ?? tx?.timestamp;
              const timeText = fmt(timeVal, 'p');
              const amount = toNumber(tx?.amount);

              return (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4">{timeText}</td>
                  <td className="py-2 px-4 font-medium">{tx?.type ?? '—'}</td>
                  <td className="py-2 px-4 font-mono text-xs">{tx?.ref ?? '—'}</td>
                  <td className="py-2 px-4">{tx?.party ?? tx?.details ?? '—'}</td>
                  <td className="py-2 px-4 text-right font-semibold">
                    {formatMoney(amount, currencySymbol)}
                  </td>
                  <td className="py-2 px-4 text-xs text-gray-500">{tx?.notes ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="text-center p-8 text-gray-500">
            No transactions recorded for this period.
          </p>
        )}
      </main>

      <footer className="absolute bottom-8 left-8 right-8 text-center text-xs text-gray-400 border-t pt-4">
        <p>This is a computer-generated report and does not require a signature.</p>
        <p>{companyName}</p>
      </footer>
    </div>
  );
};

export default DailyBookReportTemplate;