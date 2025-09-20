import { toNumber } from './money';

export const formatFx = (foreignAmount, currencyCode, baseAmount, baseCurrencyCode) => {
  const fAmount = toNumber(foreignAmount);
  const bAmount = toNumber(baseAmount);

  const finalCurrencyCode = currencyCode || baseCurrencyCode;

  const foreignFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: finalCurrencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fAmount);

  if (finalCurrencyCode === baseCurrencyCode) {
    return foreignFormatted;
  }

  const baseFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: baseCurrencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bAmount);

  return `${foreignFormatted} (${baseFormatted})`;
};