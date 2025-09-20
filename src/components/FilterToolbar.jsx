import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Search, RefreshCw, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FilterToolbar = ({
  filters,
  onFilterChange,
  onDateRangeChange,
  onStatusChange,
  onReset,
  onSetDatePreset,
  moduleName,
  showSearch = true,
  statusOptions = [],
  children
}) => {
  const { dateRange, searchTerm, statuses } = filters;

  const datePresets = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: 'last7' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'thisYear' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg">
      {onDateRangeChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal bg-background">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")
              ) : <span>Pick a date range</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={onDateRangeChange} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
      )}
      
      {onSetDatePreset && datePresets.map(preset => (
        <Button key={preset.value} variant="ghost" size="sm" onClick={() => onSetDatePreset(preset.value)}>
          {preset.label}
        </Button>
      ))}

      <div className="flex-grow" />

      {statusOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-background">
              <Filter className="mr-2 h-4 w-4" />
              Status ({statuses.length})
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map(status => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statuses.includes(status)}
                onCheckedChange={() => onStatusChange(status)}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showSearch && (
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`Search ${moduleName}...`} className="pl-9 bg-background" value={searchTerm || ''} onChange={e => onFilterChange('searchTerm', e.target.value)} />
        </div>
      )}

      {children}
      
      {onReset && (
        <Button variant="ghost" size="icon" onClick={onReset} aria-label="Refresh data">
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default FilterToolbar;