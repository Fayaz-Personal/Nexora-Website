'use client';

import { useState, useEffect } from 'react';
import { 
  Calculator, DollarSign, Info, ShieldAlert, Award, Plane, ChevronRight, CheckCircle2
} from 'lucide-react';
import { getLivingCostsDefaults } from '@/app/actions/student';
import { useCurrency } from '@/components/CurrencyContext';

interface LivingCosts {
  country_name: string;
  rent: string;
  food: string;
  transport: string;
  insurance: string;
  miscellaneous: string;
}

export default function CostCalculatorPage() {
  const [presets, setPresets] = useState<LivingCosts[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('Custom');
  const { formatPrice } = useCurrency();
  
  // Calculator States (Monthly)
  const [rent, setRent] = useState(500);
  const [food, setFood] = useState(250);
  const [transport, setTransport] = useState(50);
  const [insurance, setInsurance] = useState(100);
  const [misc, setMisc] = useState(100);
  
  // Program Details (Annual)
  const [tuition, setTuition] = useState(20000);
  const [duration, setDuration] = useState(2); // years

  // Load presets
  useEffect(() => {
    getLivingCostsDefaults().then(data => {
      setPresets(data);
    });
  }, []);

  // Update when country selection changes
  const handleCountryChange = (cName: string) => {
    setSelectedCountry(cName);
    if (cName === 'Custom') return;

    const matched = presets.find(p => p.country_name === cName);
    if (matched) {
      setRent(Math.round(Number(matched.rent)));
      setFood(Math.round(Number(matched.food)));
      setTransport(Math.round(Number(matched.transport)));
      setInsurance(Math.round(Number(matched.insurance)));
      setMisc(Math.round(Number(matched.miscellaneous)));
      
      // Update tuition estimates based on country averages
      if (cName === 'Germany') setTuition(3000);
      else if (cName === 'United States') setTuition(45000);
      else if (cName === 'United Kingdom') setTuition(32000);
      else if (cName === 'Canada') setTuition(28000);
      else if (cName === 'Australia') setTuition(30000);
    }
  };

  // Math
  const monthlyLiving = rent + food + transport + insurance + misc;
  const annualLiving = monthlyLiving * 12;
  const annualTotal = annualLiving + tuition;
  const programTotal = annualTotal * duration;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Cost of Living & Study <span className="text-gradient-teal-sunrise">Calculator</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Simulate tuition fees, housing, groceries, transport, and insurance to plan your higher education budgets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sliders Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-teal-dark" />
              <span>Budget Estimator</span>
            </h3>
            
            {/* Country Preset Select */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-600">Load Preset:</span>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg text-xs text-slate-800 p-1.5 focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark cursor-pointer shadow-sm"
              >
                <option value="Custom">Custom (Manual)</option>
                {presets.map(p => (
                  <option key={p.country_name} value={p.country_name}>{p.country_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tuition */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Annual Tuition Fee
              </label>
              <span className="text-xs font-bold text-teal-dark">{formatPrice(tuition, 'USD')}</span>
            </div>
            <input
              type="range"
              min="0"
              max="90000"
              step="1000"
              value={tuition}
              onChange={(e) => { setTuition(Number(e.target.value)); setSelectedCountry('Custom'); }}
              className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
            />
          </div>

          {/* Program Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Program Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 1.5, 2, 3].map(yr => (
                <button
                  key={yr}
                  onClick={() => setDuration(yr)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    duration === yr
                      ? 'bg-teal-dark/10 border-teal-dark text-teal-dark font-bold'
                      : 'bg-white/60 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {yr} {yr === 1 ? 'Year' : 'Years'}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rent */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monthly Rent / Housing
                </label>
                <span className="text-xs font-bold text-teal-dark">{formatPrice(rent, 'USD')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2500"
                step="50"
                value={rent}
                onChange={(e) => { setRent(Number(e.target.value)); setSelectedCountry('Custom'); }}
                className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
              />
            </div>

            {/* Food */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monthly Food / Groceries
                </label>
                <span className="text-xs font-bold text-teal-dark">{formatPrice(food, 'USD')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="25"
                value={food}
                onChange={(e) => { setFood(Number(e.target.value)); setSelectedCountry('Custom'); }}
                className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
              />
            </div>

            {/* Transport */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monthly Transport / Commute
                </label>
                <span className="text-xs font-bold text-teal-dark">{formatPrice(transport, 'USD')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={transport}
                onChange={(e) => { setTransport(Number(e.target.value)); setSelectedCountry('Custom'); }}
                className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
              />
            </div>

            {/* Health Insurance */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monthly Health Insurance
                </label>
                <span className="text-xs font-bold text-teal-dark">{formatPrice(insurance, 'USD')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="10"
                value={insurance}
                onChange={(e) => { setInsurance(Number(e.target.value)); setSelectedCountry('Custom'); }}
                className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
              />
            </div>

            {/* Miscellaneous */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Monthly Miscellaneous / Leisure
                </label>
                <span className="text-xs font-bold text-teal-dark">{formatPrice(misc, 'USD')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="800"
                step="20"
                value={misc}
                onChange={(e) => { setMisc(Number(e.target.value)); setSelectedCountry('Custom'); }}
                className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-teal-green/30 relative overflow-hidden bg-white/70">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-bright/5 rounded-full blur-xl pointer-events-none" />
            
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">
              Cost Calculation Summary
            </h3>

            <div className="space-y-6">
              {/* Monthly living cost */}
              <div>
                <span className="text-xs text-slate-600">Monthly Living Expenses</span>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {formatPrice(monthlyLiving, 'USD')}
                </div>
              </div>

              {/* Annual living cost */}
              <div>
                <span className="text-xs text-slate-600">Annual Living Expenses</span>
                <div className="text-sm font-semibold text-slate-800 mt-1">
                  {formatPrice(annualLiving, 'USD')}
                </div>
              </div>

              {/* Total Annual Budget */}
              <div className="border-t border-teal-green/20 pt-4">
                <span className="text-xs text-slate-600">Total Annual Budget (Tuition + Living)</span>
                <div className="text-lg font-bold text-teal-dark mt-1">
                  {formatPrice(annualTotal, 'USD')}
                </div>
              </div>

              {/* Program Total */}
              <div className="border-t border-teal-green/20 pt-4 bg-teal-bright/5 -mx-6 -mb-6 p-6">
                <span className="text-xs text-teal-dark font-bold uppercase tracking-wide">
                  Total Program Cost ({duration} yr)
                </span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {formatPrice(programTotal, 'USD')}
                </div>
              </div>
            </div>
          </div>

          {/* AI Advisor Guidance Box */}
          <div className="glass-card rounded-2xl p-5 border border-teal-green/15 space-y-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-teal-bright" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Budgeting Tips</h4>
            </div>
            <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-bright shrink-0 mt-0.5" />
                <span>Germany offers tuition-free courses at public universities; you only pay monthly living costs.</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-bright shrink-0 mt-0.5" />
                <span>Working part-time as a student (up to 20h/week) helps offset 60-80% of rent and grocery costs.</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-bright shrink-0 mt-0.5" />
                <span>Scholarships cover tuition, so apply 9-12 months prior to program enrollment.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
