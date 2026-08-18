'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { 
  FileCheck, Calendar, DollarSign, Clock, ShieldCheck, CheckCircle2, ChevronRight, Loader2
} from 'lucide-react';
import { getVisaGuidance, getVisaCountries } from '@/app/actions/student';
import { useCurrency } from '@/components/CurrencyContext';

interface VisaInfo {
  country_name: string;
  country_currency?: string;
  requirements: string;
  documents_required: string[];
  timeline: string;
  fee: string;
  checklist_json: {
    steps: string[];
  };
}

export default function VisaPage() {
  const [country, setCountry] = useState('Germany');
  const [countriesList, setCountriesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [visaInfo, setVisaInfo] = useState<VisaInfo | null>(null);
  const { formatPrice } = useCurrency();
  
  // Interactive checklist state
  const [completedSteps, setCompletedSteps] = useState<{ [key: string]: boolean }>({});

  const fetchVisaData = async () => {
    setLoading(true);
    const data = await getVisaGuidance(country);
    setVisaInfo(data);
    
    // Initialize checklist checklist steps
    if (data && data.checklist_json && data.checklist_json.steps) {
      const initial: { [key: string]: boolean } = {};
      data.checklist_json.steps.forEach((step: string) => {
        initial[step] = false;
      });
      setCompletedSteps(initial);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function loadCountries() {
      const list = await getVisaCountries();
      setCountriesList(list);
      if (list.length > 0) {
        if (list.includes('Germany')) {
          setCountry('Germany');
        } else {
          setCountry(list[0]);
        }
      }
    }
    loadCountries();
  }, []);

  useEffect(() => {
    if (country) {
      fetchVisaData();
    }
  }, [country]);

  const handleCheckboxChange = (step: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [step]: !prev[step]
    }));
  };

  // Calculations
  const steps = visaInfo?.checklist_json?.steps || [];
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Visa Preparation & <span className="text-gradient-teal-sunrise">Guidance</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Plan, track, and verify your document checklists to satisfy official consular standards.
        </p>
      </div>

      {/* Select Country */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-3 bg-teal-dark/95 p-3 rounded-xl border border-teal-green/20 shadow-inner">
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Select Target Country:</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-teal-dark border border-teal-green/30 rounded-lg text-xs font-bold text-white p-2 focus:outline-none focus:border-yellow-green cursor-pointer"
          >
            {countriesList.map(c => (
              <option key={c} value={c} className="bg-white text-black">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-teal-bright animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading visa protocols from database...</p>
        </div>
      ) : !visaInfo ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-teal-green/20 max-w-md mx-auto">
          <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-950">No Visa Data Found</p>
          <p className="text-xs text-slate-650 mt-1">Visa guidance is currently not configured for this country.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main requirements details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Outline Card */}
            <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-4">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 border-b border-teal-green/20 pb-3">
                <FileCheck className="h-5 w-5 text-teal-bright" />
                <span>Visa Requirements Overview</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {visaInfo.requirements}
              </p>
            </div>

            {/* Documents Checklist */}
            <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-4">
              <h3 className="text-md font-bold text-slate-900 border-b border-teal-green/20 pb-3">
                Required Documents Checklist
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visaInfo.documents_required.map(doc => (
                  <div key={doc} className="flex gap-2.5 items-start p-3 bg-teal-dark/10 border border-teal-green/15 rounded-xl text-xs text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-teal-bright shrink-0 mt-0.5" />
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checklist progress tracker */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Timeline details widget */}
            <div className="glass-card rounded-2xl p-5 border border-teal-green/20 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] font-semibold text-slate-600 uppercase">Process Fees</div>
                <div className="text-xs font-bold text-teal-dark mt-2.5 flex items-center justify-center gap-0.5 whitespace-nowrap">
                  <span>{formatPrice(Number(visaInfo.fee), visaInfo.country_currency || 'USD')}</span>
                </div>
              </div>
              <div className="border-x border-teal-green/20">
                <div className="text-[10px] font-semibold text-slate-600 uppercase">Timeline</div>
                <div className="text-xs font-bold text-teal-dark mt-1.5 flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-teal-bright" />
                  <span>{visaInfo.timeline.split(' ')[0]} wks</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-600 uppercase">Visa Type</div>
                <div className="text-sm font-bold text-teal-dark mt-1 truncate" title={(() => {
                  const m = visaInfo.requirements.match(/Applying for the (.*?) requires/);
                  return m ? m[1] : 'Student Visa';
                })()}>
                  {(() => {
                    const m = visaInfo.requirements.match(/Applying for the (.*?) requires/);
                    return m ? m[1] : 'Student Visa';
                  })()}
                </div>
              </div>
            </div>

            {/* Checklist items with progress */}
            <div className="rounded-2xl p-6 border border-teal-green/30 bg-teal-dark/95 text-white space-y-5 shadow-lg backdrop-blur-md">
              <div>
                <span className="text-xs text-white/70 block mb-1">Visa Readiness Index</span>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-extrabold text-white">{progressPercent}%</div>
                  <div className="flex-grow bg-teal-dark/60 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-teal-bright h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>

              <div className="border-t border-teal-green/20 pt-4 space-y-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider block mb-1">
                  Task Milestones
                </span>
                
                {steps.map(step => (
                  <label key={step} className="flex gap-3 items-start cursor-pointer group text-xs text-white/70 hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={!!completedSteps[step]}
                      onChange={() => handleCheckboxChange(step)}
                      className="accent-teal-bright rounded h-4 w-4 shrink-0 mt-0.5 border border-teal-green/20 bg-teal-dark"
                    />
                    <span className={completedSteps[step] ? 'line-through text-white/40' : ''}>
                      {step}
                    </span>
                  </label>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 12-Step Common Student Visa Procedure Flowchart */}
      <div className="mt-16 glass-card rounded-2xl p-8 border border-teal-green/20 bg-white space-y-8 shadow-sm">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-bright animate-pulse" />
            <span>12-Step Common Student Visa Procedure</span>
          </h2>
          <p className="text-xs text-slate-600">
            A comprehensive, step-by-step roadmap of the general student visa application process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {[
            { step: 1, title: 'Receive Admission Offer', desc: 'Apply to your chosen university and receive the official Admission/Offer Letter (e.g., LOA, CAS, I-20, CoE).' },
            { step: 2, title: 'Accept the Offer', desc: 'Accept the admission offer, pay the tuition fee or deposit (if required), and receive the official enrollment confirmation.' },
            { step: 3, title: 'Arrange Financial Documents', desc: 'Prepare bank statements, education loan sanction letters, scholarship letters, or sponsor documents to prove financial capacity.' },
            { step: 4, title: 'Gather Required Documents', desc: 'Collect valid passport, passport photos, admission letter, academic transcripts, language scores, health insurance, and police clearance.' },
            { step: 5, title: 'Complete Visa Application', desc: 'Fill out the student visa application form, upload or submit all required documents, and review carefully.' },
            { step: 6, title: 'Pay the Visa Fee', desc: 'Pay the required visa application processing fee and save the payment confirmation receipt.' },
            { step: 7, title: 'Schedule Biometrics', desc: 'Book a biometrics appointment and visit the visa application center to submit fingerprints and photographs.' },
            { step: 8, title: 'Complete Medical Examination', desc: 'Visit an approved panel physician, complete the health exam, and submit the medical report.' },
            { step: 9, title: 'Attend Visa Interview', desc: 'Attend the visa interview at the consulate (e.g. USA) with all original documents, answering questions about your plans.' },
            { step: 10, title: 'Track Your Application', desc: 'Use the application reference number to monitor your visa application status online.' },
            { step: 11, title: 'Receive Visa Decision', desc: 'Receive your passport with visa approval, additional document request, or refusal details.' },
            { step: 12, title: 'Prepare for Travel', desc: 'Book flights, arrange student accommodation, pack original documents, and travel before your course start date.' }
          ].map((s) => (
            <div key={s.step} className="relative flex flex-col justify-between bg-slate-50 border border-slate-100 p-5 rounded-xl shadow-sm hover:border-teal-bright/35 transition-all group">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-teal-dark bg-teal-dark/10 px-2 py-0.5 rounded-md uppercase tracking-wide">
                    Step {s.step}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-teal-bright/10 text-teal-bright font-black text-xs flex items-center justify-center group-hover:bg-teal-bright group-hover:text-white transition-all">
                    {s.step}
                  </div>
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{s.title}</h3>
                <p className="text-xs text-slate-650 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
