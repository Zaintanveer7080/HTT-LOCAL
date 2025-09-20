// src/components/reports/PartyLedger.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Download, Eye, Search as SearchIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toDate as toDateInTz, format } from 'date-fns-tz';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import PartyLedgerReportTemplate from '@/components/pdf/PartyLedgerReportTemplate';
import { supabase } from '@/lib/customSupabaseClient';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buildLedgerData } from '@/lib/ledgerLogic';
import { formatMoney } from '@/lib/money';

const PartyLedger = () => {
  const { data, setTransactionToView } = useData();
  const { customers = [], suppliers = [], settings = {} } = data;
  const { toast } = useToast();

  const currency = settings?.currency || 'AED';
  const currencySymbol = settings?.currencySymbol || settings?.BusinessCurrency || currency;

  const [partyType, setPartyType] = useState('customer');
  const [selectedParty, setSelectedParty] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('partyLedger', []);

  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick(v => v + 1), []);
  useEffect(() => {
    const tables = ['sales', 'purchases', 'payments', 'sales_returns', 'purchase_returns', 'credit_notes', 'debit_notes'];
    const channels = tables.map(t =>
      supabase
        .channel(`ledger-${t}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: t }, bump)
        .subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [bump]);

  const partyList = useMemo(() => (partyType === 'customer' ? customers : suppliers), [partyType, customers, suppliers]);
  useEffect(() => { if (!selectedParty && partyList.length > 0) setSelectedParty(partyList[0].id); }, [partyList, selectedParty]);

  const ledgerData = useMemo(() => buildLedgerData({
    partyType, selectedParty, data, filters, timeZone, debouncedSearchTerm,
  }), [partyType, selectedParty, data, filters, timeZone, debouncedSearchTerm, tick]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return ledgerData.transactions.slice(start, start + rowsPerPage);
  }, [ledgerData.transactions, currentPage]);
  const pageCount = Math.ceil(ledgerData.transactions.length / rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [selectedParty, partyType, filters.dateRange, debouncedSearchTerm]);

  const handleExport = () => {
    if (ledgerData.transactions.length === 0 && ledgerData.openingBalance === 0) {
      toast({ title: 'No Data', description: 'Cannot export an empty ledger.', variant: 'destructive' });
      return;
    }
    const party = partyList.find((p) => p.id === selectedParty);
    const from = filters.dateRange.from ? format(filters.dateRange.from, 'PP', { timeZone }) : 'Start';
    const to = filters.dateRange.to ? format(filters.dateRange.to, 'PP', { timeZone }) : 'End';
    generatePdf(
      <PartyLedgerReportTemplate
        ledgerData={ledgerData}
        settings={settings}
        party={party}
        partyType={partyType}
        dateRange={{ from, to }}
      />,
      `${partyType}-Ledger-${party?.name}-${from}-to-${to}.pdf`,
      toast
    );
  };

  const selectedPartyDetails = partyList.find((p) => p.id === selectedParty);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Party Ledger</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={partyType}
            onValueChange={(val) => { setPartyType(val); setSelectedParty(''); }}
          >
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="supplier">Supplier</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedParty} onValueChange={setSelectedParty}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder={`Select a ${partyType}`} /></SelectTrigger>
            <SelectContent>
              {partyList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FilterToolbar
        filters={filters}
        onDateRangeChange={handleDateRangeChange}
        onSetDatePreset={setDatePreset}
        moduleName="ledger"
        showSearch={false}
      >
        <div className="relative sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Voucher # or Type..."
            className="pl-9 bg-background"
            value={filters.searchTerm || ''}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
        </div>
      </FilterToolbar>

      {selectedParty ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{selectedPartyDetails?.name}</CardTitle>
              <p className="text-muted-foreground">
                Statement for: {filters.dateRange.from ? format(filters.dateRange.from, 'PP', { timeZone }) : 'Start'} →
                {filters.dateRange.to ? ' ' + format(filters.dateRange.to, 'PP', { timeZone }) : ' End'}
              </p>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={ledgerData.transactions.length === 0 && ledgerData.openingBalance === 0}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                    <TableHead className="text-center">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell colSpan={5} className="text-right">Opening Balance</TableCell>
                    <TableCell className="text-right">{formatMoney(ledgerData.openingBalance, currencySymbol, currency)}</TableCell>
                    <TableCell />
                  </TableRow>

                  {paginated.length > 0 ? (
                    paginated.map((tx, idx) => (
                      <TableRow key={`${tx.refId}-${idx}`}>
                        <TableCell>{format(tx.date, 'PP', { timeZone })}</TableCell>
                        <TableCell className="font-medium">{tx.refId}</TableCell>
                        <TableCell className="text-muted-foreground">{tx.type}</TableCell>
                        <TableCell className="text-right">{tx.debit > 0 ? formatMoney(tx.debit, currencySymbol, currency) : '-'}</TableCell>
                        <TableCell className="text-right">{tx.credit > 0 ? formatMoney(tx.credit, currencySymbol, currency) : '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(tx.balance, currencySymbol, currency)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => setTransactionToView({ transaction: tx.doc, type: tx.docType })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        No transactions found for the selected criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-stretch gap-4 pt-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="text-lg font-bold">Closing Balance</span>
              <span className="text-lg font-bold text-primary">{formatMoney(ledgerData.closingBalance, currencySymbol, currency)}</span>
            </div>

            {pageCount > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)); }}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm font-medium px-4">Page {currentPage} of {pageCount}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(pageCount, p + 1)); }}
                      disabled={currentPage === pageCount}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardFooter>
        </Card>
      ) : (
        <Alert>
          <AlertDescription className="text-center">
            Please select a customer or supplier to view their ledger.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PartyLedger;