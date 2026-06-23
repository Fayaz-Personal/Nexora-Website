'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getCurrencyRates, updatePreferredCurrency } from '@/app/actions/student';
import { getCurrentUser } from '@/app/actions/auth';

// Mapping of Currency Code to Symbol & Display labels
export const CURRENCY_METADATA: { [code: string]: { symbol: string; label: string; suffix?: string } } = {
  USD: { symbol: '$', label: 'US Dollar' },
  EUR: { symbol: '€', label: 'Euro' },
  GBP: { symbol: '£', label: 'British Pound' },
  INR: { symbol: '₹', label: 'Indian Rupee' },
  CAD: { symbol: 'C$', label: 'Canadian Dollar' },
  AUD: { symbol: 'A$', label: 'Australian Dollar' },
  NZD: { symbol: 'NZ$', label: 'New Zealand Dollar' },
  CNY: { symbol: '¥', label: 'Chinese Yuan' },
  JPY: { symbol: '¥', label: 'Japanese Yen' },
  KRW: { symbol: '₩', label: 'South Korean Won' },
  SGD: { symbol: 'S$', label: 'Singapore Dollar' },
  MYR: { symbol: 'RM', label: 'Malaysian Ringgit' },
  RUB: { symbol: '₽', label: 'Russian Ruble' },
  CHF: { symbol: 'CHF', label: 'Swiss Franc' },
  SEK: { symbol: 'kr', label: 'Swedish Krona' },
  NOK: { symbol: 'kr', label: 'Norwegian Krone' },
  DKK: { symbol: 'kr', label: 'Danish Krone' },
  AED: { symbol: 'د.إ', label: 'UAE Dirham', suffix: 'د.إ' },
  SAR: { symbol: '﷼', label: 'Saudi Riyal', suffix: '﷼' }
};

interface CurrencyContextType {
  preferredCurrency: string;
  rates: { [code: string]: number };
  loading: boolean;
  changeCurrency: (code: string) => Promise<void>;
  formatPrice: (amount: number, originalCurrency: string) => string;
  formatPriceShort: (amount: number, originalCurrency: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferredCurrency, setPreferredCurrency] = useState('INR');
  const [rates, setRates] = useState<{ [code: string]: number }>({ USD: 1.0 });
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<number | null>(null);

  // Map Nationality name to its default Currency
  const getCurrencyFromNationality = (nationality: string): string => {
    const nation = nationality.toLowerCase().trim();
    if (nation.includes('india') || nation.includes('ind')) return 'INR';
    if (nation.includes('united states') || nation.includes('us') || nation.includes('american')) return 'USD';
    if (nation.includes('united kingdom') || nation.includes('uk') || nation.includes('british') || nation.includes('gb')) return 'GBP';
    if (nation.includes('canada') || nation.includes('canadian')) return 'CAD';
    if (nation.includes('australia') || nation.includes('australian')) return 'AUD';
    if (nation.includes('germany') || nation.includes('german') || nation.includes('france') || nation.includes('french') || nation.includes('spain') || nation.includes('spanish') || nation.includes('italy') || nation.includes('italian') || nation.includes('netherlands') || nation.includes('dutch') || nation.includes('ireland') || nation.includes('irish')) return 'EUR';
    if (nation.includes('new zealand') || nation.includes('kiwi')) return 'NZD';
    if (nation.includes('singapore') || nation.includes('singaporean')) return 'SGD';
    if (nation.includes('china') || nation.includes('chinese')) return 'CNY';
    if (nation.includes('japan') || nation.includes('japanese')) return 'JPY';
    if (nation.includes('korea') || nation.includes('korean')) return 'KRW';
    if (nation.includes('malaysia') || nation.includes('malaysian')) return 'MYR';
    if (nation.includes('russia') || nation.includes('russian')) return 'RUB';
    if (nation.includes('switzerland') || nation.includes('swiss')) return 'CHF';
    if (nation.includes('sweden') || nation.includes('swedish')) return 'SEK';
    if (nation.includes('norway') || nation.includes('norwegian')) return 'NOK';
    if (nation.includes('denmark') || nation.includes('danish')) return 'DKK';
    if (nation.includes('uae') || nation.includes('emirati')) return 'AED';
    if (nation.includes('saudi') || nation.includes('arabia')) return 'SAR';
    return 'USD';
  };

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const loadedRates = await getCurrencyRates();
        if (loadedRates && Object.keys(loadedRates).length > 0) {
          setRates(loadedRates);
        }

        const user = await getCurrentUser();
        if (user && user.role === 'student' && user.profileId) {
          setProfileId(user.profileId);
          // Import dynamic profile details
          const { getStudentProfile } = await import('@/app/actions/student');
          const profile = await getStudentProfile(user.id);
          if (profile) {
            if (profile.preferred_currency) {
              setPreferredCurrency(profile.preferred_currency);
            } else if (profile.nationality) {
              const defaultCurr = getCurrencyFromNationality(profile.nationality);
              setPreferredCurrency(defaultCurr);
              await updatePreferredCurrency(profile.id, defaultCurr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize currency context:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const changeCurrency = async (code: string) => {
    if (!CURRENCY_METADATA[code]) return;
    setPreferredCurrency(code);
    if (profileId) {
      try {
        await updatePreferredCurrency(profileId, code);
      } catch (err) {
        console.error('Failed to save currency selection to database:', err);
      }
    }
  };

  // Number helper to parse thousands, lakhs, or millions
  const formatNumberValue = (value: number, currencyCode: string): string => {
    const meta = CURRENCY_METADATA[currencyCode] || { symbol: '$' };
    
    if (currencyCode === 'INR') {
      // Lakhs formatting for rupees
      if (value >= 10000000) {
        return `${meta.symbol}${(value / 10000000).toFixed(1)} Crore`;
      }
      if (value >= 100000) {
        return `${meta.symbol}${(value / 100000).toFixed(1)} Lakhs`;
      }
      return `${meta.symbol}${Math.round(value).toLocaleString('en-IN')}`;
    }

    // Millions/Thousands formatting for other currencies
    if (value >= 1000000) {
      return `${meta.symbol}${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${meta.symbol}${(value / 1000).toFixed(1)}k`;
    }
    return `${meta.symbol}${Math.round(value).toLocaleString()}`;
  };

  const convertPrice = useCallback((amount: number, from: string, to: string): number => {
    if (amount === 0) return 0;
    const rateFrom = rates[from] || 1.0;
    const rateTo = rates[to] || 1.0;
    
    // Convert to USD base first, then to Target
    const valInUsd = amount / rateFrom;
    return valInUsd * rateTo;
  }, [rates]);

  // Formats to: EUR 18,000 ≈ ₹15.0 Lakhs
  const formatPrice = useCallback((amount: number, originalCurrency: string): string => {
    const orig = originalCurrency || 'USD';
    const metaOrig = CURRENCY_METADATA[orig] || { symbol: '$' };
    const metaTarget = CURRENCY_METADATA[preferredCurrency] || { symbol: '$' };
    
    const formattedOrig = `${metaOrig.symbol}${Math.round(amount).toLocaleString()}`;
    
    if (orig === preferredCurrency) {
      return formattedOrig;
    }

    const converted = convertPrice(amount, orig, preferredCurrency);
    const formattedConv = formatNumberValue(converted, preferredCurrency);
    
    return `${formattedOrig} ≈ ${formattedConv}`;
  }, [preferredCurrency, convertPrice]);

  // Formats short values for dashboard grids
  const formatPriceShort = useCallback((amount: number, originalCurrency: string): string => {
    const orig = originalCurrency || 'USD';
    const metaOrig = CURRENCY_METADATA[orig] || { symbol: '$' };
    
    if (orig === preferredCurrency) {
      return formatNumberValue(amount, orig);
    }
    
    const converted = convertPrice(amount, orig, preferredCurrency);
    return formatNumberValue(converted, preferredCurrency);
  }, [preferredCurrency, convertPrice]);

  return (
    <CurrencyContext.Provider value={{
      preferredCurrency,
      rates,
      loading,
      changeCurrency,
      formatPrice,
      formatPriceShort
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
