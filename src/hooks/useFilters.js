import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, subDays, startOfYear, endOfYear } from 'date-fns';
import { toDate } from 'date-fns-tz';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

export const useFilters = (moduleKey, defaultStatusOptions = []) => {
    const navigate = useNavigate();
    const location = useLocation();
    const timeZone = 'Asia/Dubai';

    const getDateRangeFromPreset = useCallback((preset) => {
        const now = toDate(new Date(), { timeZone });
        let from, to;
        switch (preset) {
            case 'today': from = startOfDay(now); to = endOfDay(now); break;
            case 'last7': from = startOfDay(subDays(now, 6)); to = endOfDay(now); break;
            case 'last30': from = startOfDay(subDays(now, 29)); to = endOfDay(now); break;
            case 'last90': from = startOfDay(subDays(now, 89)); to = endOfDay(now); break;
            case 'thisMonth': from = startOfMonth(now); to = endOfMonth(now); break;
            case 'lastMonth': const lm = subMonths(now, 1); from = startOfMonth(lm); to = endOfMonth(lm); break;
            case 'thisYear': from = startOfYear(now); to = endOfYear(now); break;
            default: from = null; to = null; break; 
        }
        return { from, to };
    }, [timeZone]);

    const [filters, setFilters] = useState(() => {
        const params = new URLSearchParams(location.search);
        const storedPreset = localStorage.getItem(`${moduleKey}_datePreset`);
        const defaultPreset = 'thisMonth';

        const initialDateRange = params.get(`${moduleKey}_from`)
            ? { from: new Date(params.get(`${moduleKey}_from`)), to: params.get(`${moduleKey}_to`) ? new Date(params.get(`${moduleKey}_to`)) : null }
            : getDateRangeFromPreset(storedPreset || defaultPreset);

        return {
            dateRange: initialDateRange,
            statuses: params.get(`${moduleKey}_statuses`)?.split(',') || defaultStatusOptions,
            searchTerm: params.get(`${moduleKey}_searchTerm`) || '',
            page: parseInt(params.get(`${moduleKey}_page`), 10) || 1,
            pageSize: parseInt(localStorage.getItem(`${moduleKey}_pageSize`), 10) || 25,
        };
    });

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

    const handleFilterChange = (key, value) => {
        if (key === 'pageSize') {
            try {
                localStorage.setItem(`${moduleKey}_pageSize`, value);
            } catch (error) {
                console.error("Could not persist pageSize to localStorage", error);
            }
        }
        setFilters(f => ({ ...f, [key]: value, page: key !== 'page' ? 1 : value }));
    };

    const handleDateRangeChange = (range) => {
        setFilters(f => ({ ...f, dateRange: range, page: 1 }));
        localStorage.removeItem(`${moduleKey}_datePreset`);
    };

    const setDatePreset = useCallback((preset) => {
        const range = getDateRangeFromPreset(preset);
        handleDateRangeChange(range);
        localStorage.setItem(`${moduleKey}_datePreset`, preset);
    }, [moduleKey, getDateRangeFromPreset, handleDateRangeChange]);

    const handleStatusChange = (status) => {
        setFilters(f => {
            const newStatuses = f.statuses.includes(status)
                ? f.statuses.filter(s => s !== status)
                : [...f.statuses, status];
            return { ...f, statuses: newStatuses, page: 1 };
        });
    };

    const resetFilters = useCallback(() => {
        const defaultRange = getDateRangeFromPreset('thisMonth');
        setFilters({
            dateRange: defaultRange,
            statuses: defaultStatusOptions,
            searchTerm: '',
            page: 1,
            pageSize: filters.pageSize, 
        });
        localStorage.setItem(`${moduleKey}_datePreset`, 'thisMonth');
    }, [defaultStatusOptions, filters.pageSize, moduleKey, getDateRangeFromPreset]);

    return {
        filters,
        setFilters,
        debouncedSearchTerm,
        setDatePreset,
        handleFilterChange,
        handleDateRangeChange,
        handleStatusChange,
        resetFilters,
        timeZone,
    };
};