export const toNumber = (value) => {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const safeSum = (...args) => {
  return args.reduce((sum, val) => sum + toNumber(val), 0);
};

export const formatMoney = (value, currencySymbol = 'AED', currencyCode = 'AED', locale = 'en-AE') => {
  const num = toNumber(value);
  try {
    // Attempt to format using Intl.NumberFormat if currencyCode is a valid ISO code
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(num);
  } catch (error) {
    // Fallback to simple symbol prefix if currencyCode is invalid or not an ISO code
    const options = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };
    return `${currencySymbol} ${num.toLocaleString(locale, options)}`;
  }
};