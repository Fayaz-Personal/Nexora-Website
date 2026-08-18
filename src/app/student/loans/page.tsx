'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { 
  Building2, Percent, Coins, FileText, CheckCircle2, ArrowRight, 
  HelpCircle, DollarSign, Calculator, Sparkles, AlertCircle, Loader2, 
  ExternalLink, Search, Check, Info, ArrowRightCircle, BookOpen, GraduationCap, ChevronDown, ChevronUp,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFundingProviders, getAIFundingRecommendations, FundingProvider, FundingRecommendation } from '@/app/actions/loans';
import { useCurrency } from '@/components/CurrencyContext';

export default function LoansPage() {
  const { formatPriceShort, preferredCurrency } = useCurrency();

  // Helper to convert text containing Rupees
  const convertTextAmount = (text: string) => {
    if (!text) return 'N/A';
    let newText = text;
    const matches = text.match(/₹\s*([0-9.,]+)\s*(Lakhs|Crores|Lakh|Crore)?/gi);
    if (matches && preferredCurrency !== 'INR') {
      matches.forEach(match => {
        const numMatch = match.match(/([0-9.,]+)/);
        if (numMatch) {
          let val = parseFloat(numMatch[1].replace(/,/g, ''));
          if (match.toLowerCase().includes('lakh')) {
            val = val * 100000;
          } else if (match.toLowerCase().includes('crore')) {
            val = val * 10000000;
          }
          const converted = formatPriceShort(val, 'INR');
          newText = newText.replace(match, `${match} (${converted})`);
        }
      });
    }
    return newText;
  };

  // DB Funding Providers
  const [providers, setProviders] = useState<FundingProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // AI Advisor Form States
  const [targetCountry, setTargetCountry] = useState('United States');
  const [courseCost, setCourseCost] = useState(3000000); // Default ₹30 Lakhs
  const [familyIncome, setFamilyIncome] = useState(800000); // Default ₹8 Lakhs
  const [collateralAvailable, setCollateralAvailable] = useState(false);
  
  // AI Recommendations Results
  const [aiRecommendations, setAiRecommendations] = useState<FundingRecommendation[] | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // EMI Calculator States
  const [loanAmount, setLoanAmount] = useState<number>(2500000); // Default ₹25 Lakhs
  const [loanRate, setLoanRate] = useState<number>(9.5); // Default 9.5%
  const [loanTenure, setLoanTenure] = useState<number>(7); // Default 7 years
  const [calcUsdAmount, setCalcUsdAmount] = useState<string>('40000');

  // Collapsible Accordion states for providers list (docs and processes)
  const [expandedDocs, setExpandedDocs] = useState<Record<number, boolean>>({});
  const [expandedProcess, setExpandedProcess] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getFundingProviders();
        setProviders(data);
      } catch (err) {
        console.error('Failed to load funding providers:', err);
      } finally {
        setLoadingProviders(false);
      }
    }
    loadData();
  }, []);

  const handleGetAIRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRecommendations(true);
    setAiError(null);
    setAiRecommendations(null);

    try {
      const recs = await getAIFundingRecommendations({
        country: targetCountry,
        courseCost: courseCost,
        familyIncome: familyIncome,
        collateralAvailable: collateralAvailable
      });
      setAiRecommendations(recs);
    } catch (err: any) {
      setAiError(err.message || 'Something went wrong while connecting to the AI Advisor.');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const toggleDocs = (id: number) => {
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProcess = (id: number) => {
    setExpandedProcess(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered providers based on search query and active category tab
  const filteredProviders = providers.filter(p => {
    const matchesTab = activeTab === 'all' || p.provider_type === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.provider_type.toLowerCase().replace(/_/g, ' ').includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getProviderTypeLabel = (type: string) => {
    switch(type) {
      case 'public_bank': return 'Public Sector Bank';
      case 'private_bank_nbfc': return 'Private Bank / NBFC';
      case 'government_portal': return 'Government Scheme / Agency';
      case 'marketplace': return 'Loan Marketplace';
      default: return type;
    }
  };

  const getProviderTypeColor = (type: string) => {
    switch(type) {
      case 'public_bank': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'private_bank_nbfc': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'government_portal': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'marketplace': return 'text-cyan-700 bg-cyan-50 border-cyan-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getLogoBg = (type: string) => {
    switch(type) {
      case 'public_bank': return 'bg-blue-600';
      case 'private_bank_nbfc': return 'bg-purple-600';
      case 'government_portal': return 'bg-emerald-600';
      case 'marketplace': return 'bg-cyan-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-12 bg-slate-50/50 min-h-screen">
      
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
          AI Funding Advisor & <span className="text-gradient-teal-sunrise">Loan Directory</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-600 text-base">
          Find matching education loans, explore government funding infrastructure, compare top public and private banks, and receive instant AI recommendations for your study abroad path.
        </p>
        <div className="h-1 w-20 bg-teal-dark mx-auto rounded-full" />
      </div>

      {/* Main Grid: AI Form & Calculator on Left, Database Catalog on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: AI Advisor & Calculator */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* AI Funding Advisor Card */}
          <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-white p-6 shadow-xl space-y-6">
            {/* Glowing Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-dark via-teal-bright to-teal-green" />
            
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-dark">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">AI Funding Advisor</h2>
                <p className="text-xs text-slate-500">Get personalized education funding recommendations</p>
              </div>
            </div>

            <form onSubmit={handleGetAIRecommendations} className="space-y-4">
              {/* Target Country */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Target Study Country</label>
                <select 
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark"
                >
                  <option value="United States">United States</option>
                  <option value="Germany">Germany</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                  <option value="Other">Other Global Destination</option>
                </select>
              </div>

              {/* Course Cost */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Estimated Course Cost (INR)</span>
                  <span className="text-teal-dark font-bold">₹{(courseCost / 100000).toFixed(1)} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max="15000000"
                  step="100000"
                  value={courseCost}
                  onChange={(e) => setCourseCost(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-dark"
                />
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-slate-400">₹2L</span>
                  <input
                    type="number"
                    value={courseCost}
                    onChange={(e) => setCourseCost(Math.max(0, Number(e.target.value)))}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-teal-dark"
                  />
                  <span className="text-[10px] text-slate-400">₹1.5Cr</span>
                </div>
              </div>

              {/* Family Income */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Family Annual Income (INR)</span>
                  <span className="text-teal-dark font-bold">₹{(familyIncome / 100000).toFixed(1)} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="5000000"
                  step="50000"
                  value={familyIncome}
                  onChange={(e) => setFamilyIncome(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-dark"
                />
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-slate-400">₹50K</span>
                  <input
                    type="number"
                    value={familyIncome}
                    onChange={(e) => setFamilyIncome(Math.max(0, Number(e.target.value)))}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-teal-dark"
                  />
                  <span className="text-[10px] text-slate-400">₹50L</span>
                </div>
              </div>

              {/* Collateral Toggle */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Collateral Available?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCollateralAvailable(true)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      collateralAvailable 
                        ? 'bg-teal-dark text-white border-teal-dark shadow-md' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Yes (Property/FD/LIC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollateralAvailable(false)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      !collateralAvailable 
                        ? 'bg-teal-dark text-white border-teal-dark shadow-md' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    No (Unsecured Loan)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingRecommendations}
                className="w-full glow-btn font-extrabold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
              >
                {loadingRecommendations ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing Criteria...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Get AI Recommendations</span>
                  </>
                )}
              </button>
            </form>

            {/* AI Advisor Output Section */}
            <AnimatePresence mode="wait">
              {loadingRecommendations && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center space-y-3"
                >
                  <Loader2 className="h-8 w-8 text-teal-dark animate-spin" />
                  <p className="text-xs font-medium text-slate-650 text-center animate-pulse">
                    Nexora AI is matching your profile with available student loans, portals, and marketplaces...
                  </p>
                </motion.div>
              )}

              {aiError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Advisor Error:</span> {aiError}
                  </div>
                </motion.div>
              )}

              {aiRecommendations && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4"
                >
                  <div className="border-t border-slate-150 pt-4">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-teal-dark mb-3">
                      <Check className="h-4 w-4" />
                      <span>Best Matches For You</span>
                    </h3>
                    
                    <div className="space-y-3">
                      {aiRecommendations.map((rec, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 rounded-xl border border-teal-500/10 bg-teal-50/10 shadow-sm space-y-2.5 transition-all hover:bg-teal-50/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-teal-dark" />
                              {rec.name}
                            </span>
                            <span className="text-[9px] font-extrabold text-teal-dark px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-100 uppercase">
                              Recommendation #{idx + 1}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5">
                            {rec.reasonChecklist.map((reason, rIdx) => (
                              <div key={rIdx} className="flex gap-2 items-start text-[11px] text-slate-650">
                                <CheckCircle2 className="h-3.5 w-3.5 text-teal-green shrink-0 mt-0.5" />
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Calculator Widgets */}
          <div className="glass-card rounded-2xl p-6 border border-teal-500/10 bg-white shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calculator className="h-5 w-5 text-teal-dark" />
              <span>Interactive Loan Tools</span>
            </h3>

            {/* Part A: Loan EMI Calculator */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Study Loan EMI Calculator</span>
              
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-650">Loan Amount:</span>
                  <span className="text-teal-dark font-extrabold">₹{(loanAmount / 100000).toFixed(1)} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="7500000"
                  step="100000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-650">Interest Rate:</span>
                    <span className="text-teal-dark font-bold">{loanRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="6.0"
                    max="16.0"
                    step="0.25"
                    value={loanRate}
                    onChange={(e) => setLoanRate(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-dark"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-650">Tenure:</span>
                    <span className="text-teal-dark font-bold">{loanTenure} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={loanTenure}
                    onChange={(e) => setLoanTenure(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-dark"
                  />
                </div>
              </div>

              {/* Calculated Monthly EMI */}
              <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-xl text-center shadow-inner">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Estimated Monthly EMI</span>
                <span className="text-2xl font-black text-teal-dark mt-0.5 block">
                  ₹{(() => {
                    const r = (loanRate / 12) / 100;
                    const n = loanTenure * 12;
                    const emi = loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
                    return Math.round(emi).toLocaleString('en-IN');
                  })()}
                </span>
              </div>
            </div>

            {/* Part B: Tuition Currency Converter */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. Tuition Fee Converter</span>
              <div className="flex gap-2">
                <div className="flex-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <span className="text-slate-500 text-xs">$</span>
                  </div>
                  <input
                    type="number"
                    value={calcUsdAmount}
                    onChange={(e) => setCalcUsdAmount(e.target.value)}
                    placeholder="Tuition in USD"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs text-slate-800 pl-6 pr-3 py-2.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark"
                  />
                </div>
                <div className="flex items-center text-xs font-bold text-slate-500">
                  ≈
                </div>
                <div className="flex-1 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900">
                    {formatPriceShort(Number(calcUsdAmount) || 0, 'USD')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{preferredCurrency}</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 italic text-center">Note: conversion uses dynamic index relative to USD.</p>
            </div>
          </div>

        </div>

        {/* Right Column: Database Directory & Portals details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Catalog Controls */}
          <div className="glass-card rounded-2xl p-6 border border-teal-500/10 bg-white shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-5.5 w-5.5 text-teal-dark" />
                  <span>Funding & Lenders Directory</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Explore direct links, limits, and interest rates dynamically matching the database catalog.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-teal-dark"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {[
                { id: 'all', label: 'All Lenders' },
                { id: 'public_bank', label: 'Public Sector Banks' },
                { id: 'private_bank_nbfc', label: 'Private & NBFCs' },
                { id: 'government_portal', label: 'Government Schemes & Agencies' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-teal-dark text-white border-teal-dark shadow-sm'
                      : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Listings */}
          <div className="space-y-6">
            {loadingProviders ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                <Loader2 className="h-8 w-8 text-teal-dark animate-spin" />
                <span className="text-xs font-semibold text-slate-500">Loading catalog from database...</span>
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                <AlertCircle className="h-10 w-10 text-slate-350 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">No Lenders Found</h3>
                <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProviders.map((provider) => (
                  <div 
                    key={provider.id} 
                    className="glass-card glass-card-hover rounded-2xl p-6 border border-teal-500/10 bg-white shadow-md flex flex-col justify-between gap-6"
                  >
                    {/* Header Details */}
                    <div className="space-y-4 flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${getLogoBg(provider.provider_type)} flex items-center justify-center text-white font-extrabold text-xs shadow-md`}>
                            {provider.name.substring(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                              {provider.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-extrabold border px-2 py-0.5 rounded-md uppercase ${getProviderTypeColor(provider.provider_type)}`}>
                                {getProviderTypeLabel(provider.provider_type)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Apply Button */}
                        {provider.website && (
                          <a 
                            href={provider.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-dark bg-teal-50 border border-teal-100 rounded-xl hover:bg-teal-150 transition-colors shadow-sm self-start sm:self-center"
                          >
                            <span>Visit Official Site</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {/* Main parameters block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                            <Percent className="w-3 h-3 text-slate-400" /> Interest Rate
                          </span>
                          <span className="font-extrabold text-xs text-slate-900">{provider.interest_rate || 'N/A'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                            <Coins className="w-3 h-3 text-slate-400" /> Max Loan Amount
                          </span>
                          <span className="font-extrabold text-xs text-slate-900">{convertTextAmount(provider.max_amount)}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                            <Shield className="w-3 h-3 text-slate-400" /> Collateral Requirement
                          </span>
                          <span className="font-bold text-slate-700 text-xs line-clamp-2" title={provider.collateral_requirement}>
                            {provider.collateral_requirement || 'N/A'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                            <Info className="w-3 h-3 text-slate-400" /> Income limit
                          </span>
                          <span className="font-extrabold text-xs text-slate-800">{provider.income_limit || 'None'}</span>
                        </div>
                      </div>

                      {/* Highlights */}
                      {provider.highlights && provider.highlights.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Highlights</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {provider.highlights.map((highlight, index) => (
                              <div key={index} className="flex gap-2 items-start text-xs text-slate-700">
                                <CheckCircle2 className="h-4 w-4 text-teal-green shrink-0 mt-0.5" />
                                <span>{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Special Government Portal Sections (e.g. flowchart or details) */}
                      {provider.provider_type === 'government_portal' && provider.name.includes('Vidya Lakshmi') && (
                        <div className="border border-emerald-100 bg-emerald-50/20 p-5 rounded-2xl space-y-4">
                          <div className="flex items-center gap-2 text-emerald-800">
                            <GraduationCap className="h-5 w-5" />
                            <h4 className="text-xs font-extrabold uppercase tracking-wider">Vidya Lakshmi Portal Application Flowchart (CELAF)</h4>
                          </div>
                          
                          {/* Visual Steps flowchart */}
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 relative">
                            {[
                              { step: 1, title: 'Register', desc: 'Create account on portal' },
                              { step: 2, title: 'Profile', desc: 'Fill student biodata & KYC' },
                              { step: 3, title: 'CELAF Form', desc: 'Fill common application form' },
                              { step: 4, title: 'Select Banks', desc: 'Choose 40+ banks & schemes' },
                              { step: 5, title: 'Submit', desc: 'Submit profile digitally' },
                              { step: 6, title: 'Track Status', desc: 'Track approval online' }
                            ].map((s, idx) => (
                              <div key={s.step} className="flex flex-col items-center text-center relative bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center mb-1.5">
                                  {s.step}
                                </div>
                                <span className="text-xs font-bold text-slate-900 block">{s.title}</span>
                                <span className="text-[9px] text-slate-500 leading-normal mt-0.5">{s.desc}</span>
                                {idx < 5 && (
                                  <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-emerald-400">
                                    <ArrowRightCircle className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {provider.provider_type === 'government_portal' && provider.name.includes('Central Sector Interest Subsidy') && (
                        <div className="border border-emerald-100 bg-emerald-50/20 p-5 rounded-2xl space-y-3">
                          <div className="flex items-center gap-2 text-emerald-800">
                            <Info className="h-5 w-5" />
                            <h4 className="text-xs font-extrabold uppercase tracking-wider">Subsidy Scheme Benefits & Conditions</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                            <div className="space-y-1.5">
                              <span className="font-bold text-slate-900 block">Family Income Cap:</span>
                              <p className="leading-relaxed">Must be under ₹4.5 Lakhs per annum. Required to submit verified income certificate from state-authorized bodies.</p>
                            </div>
                            <div className="space-y-1.5">
                              <span className="font-bold text-slate-900 block">Interest Coverage:</span>
                              <p className="leading-relaxed">Government pays 100% of the interest during the course moratorium (course period + 1 year after graduation).</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Collapsible Documents Required */}
                      {provider.documents_required && provider.documents_required.length > 0 && (
                        <div className="border-t border-slate-100 pt-3">
                          <button 
                            onClick={() => toggleDocs(provider.id)}
                            className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-4 w-4 text-teal-dark" />
                              Required Documents Checklist
                            </span>
                            {expandedDocs[provider.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          
                          <AnimatePresence>
                            {expandedDocs[provider.id] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mt-3"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  {provider.documents_required.map((doc, dIdx) => (
                                    <div key={dIdx} className="flex gap-2 items-start text-xs text-slate-700">
                                      <div className="w-1.5 h-1.5 rounded-full bg-teal-dark shrink-0 mt-2" />
                                      <span>{doc}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Collapsible Application Process */}
                      {provider.application_process && provider.application_process.length > 0 && (
                        <div className="border-t border-slate-100 pt-3">
                          <button 
                            onClick={() => toggleProcess(provider.id)}
                            className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-950 transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="h-4 w-4 text-teal-dark" />
                              Detailed Application Steps
                            </span>
                            {expandedProcess[provider.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          
                          <AnimatePresence>
                            {expandedProcess[provider.id] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mt-3"
                              >
                                <div className="relative pl-6 border-l border-slate-200 space-y-4 py-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                  {provider.application_process.map((stepText, pIdx) => (
                                    <div key={pIdx} className="relative">
                                      <div className="absolute -left-[27px] top-0 w-4 h-4 rounded-full bg-teal-dark text-white flex items-center justify-center text-[8px] font-bold">
                                        {pIdx + 1}
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed pl-1">{stepText}</p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Checklist & Document Guides Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-200 pt-10">
        
        {/* Left: General Application Steps */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-teal-500/10 bg-white shadow-sm space-y-6">
          <h3 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-dark" />
            <span>Standard Education Loan Milestones</span>
          </h3>

          <div className="relative pl-6 border-l border-slate-200 space-y-6">
            {[
              {
                title: 'Lender Comparison & Eligibility Check',
                description: 'Compare interest rates, limits, and collateral requirements between Indian public banks, private NBFCs, and global marketplaces.'
              },
              {
                title: 'University Offer Letter Receipt',
                description: 'Ensure you have received an official, valid admit letter or conditional offer from your target institute, stating exact fee schedules.'
              },
              {
                title: 'Documents Assembly & submission',
                description: 'Compile academic marksheets, tests (GRE/IELTS), co-borrower income statements (Form 16/ITRs), and collateral deed papers if securing a high-value loan.'
              },
              {
                title: 'Appraisal, Valuation & Approval',
                description: 'Lenders verify collateral papers or check future earning potentials for collateral-free options. The bank then issues a formal Sanction Letter.'
              },
              {
                title: 'Direct University Disbursal',
                description: 'Lender transfers tuition fee amounts directly to the university campus bank account in foreign currency (USD, EUR, etc.) per semester.'
              }
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[35px] top-0.5 w-6 h-6 rounded-full bg-teal-dark text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">{step.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: General Documents Checklist */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-teal-500/10 bg-white shadow-sm space-y-6">
          <h3 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-dark" />
            <span>Mandatory Documents List</span>
          </h3>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-extrabold text-teal-dark uppercase tracking-wider block mb-2">1. Student Records</span>
              <div className="space-y-2">
                {[
                  'Official University Admit Letter',
                  'Passport copy & visa applications',
                  'Entrance test marksheets (IELTS / GRE / GMAT)',
                  'Academic transcripts (High school & graduation)'
                ].map(item => (
                  <div key={item} className="flex gap-2 items-start text-xs text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-teal-green shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-[10px] font-extrabold text-teal-dark uppercase tracking-wider block mb-2">2. Co-Applicant Financials</span>
              <div className="space-y-2">
                {[
                  'Income tax returns (past 2 financial years)',
                  'Salary slips (past 3 months) & Form 16',
                  'Lender-format bank statements (past 6 months)',
                  'Collateral deeds & valuation certificates (if applicable)'
                ].map(item => (
                  <div key={item} className="flex gap-2 items-start text-xs text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-teal-green shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
