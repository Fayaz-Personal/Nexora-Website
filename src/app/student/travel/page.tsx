'use client';

import { useState, useEffect } from 'react';
import { 
  Plane, Calendar, DollarSign, ListTodo, ShieldCheck, CheckCircle2, Info, Loader2, ArrowRight
} from 'lucide-react';
import { getFlightsEstimates } from '@/app/actions/student';

interface FlightEstimate {
  id: number;
  origin: string;
  country_name: string;
  est_cost: string;
  checklist_json: {
    tips: string[];
    arrival_steps?: string[];
  };
}

export default function TravelPlannerPage() {
  const [flights, setFlights] = useState<FlightEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDest, setSelectedDest] = useState('Germany');

  useEffect(() => {
    getFlightsEstimates().then(data => {
      setFlights(data);
      setLoading(false);
    });
  }, []);

  const matchedFlight = flights.find(f => f.country_name === selectedDest);

  // Default Arrival Checklist items
  const arrivalSteps = (matchedFlight && matchedFlight.checklist_json && matchedFlight.checklist_json.arrival_steps)
    ? matchedFlight.checklist_json.arrival_steps
    : [
        'Register address at local town hall or municipality office',
        'Open a local student bank account',
        'Sign a student health insurance contract',
        'Enroll officially at the university campus registrar office',
        'Get a local mobile SIM card',
        'Purchase a regional transit student pass'
      ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Travel & Flight <span className="text-gradient-teal-sunrise">Planner</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Estimate airfare, review international baggage tips, and coordinate your first-week arrival checklist.
        </p>
      </div>

      {/* Select Destination */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-3 bg-teal-dark/95 p-3 rounded-xl border border-teal-green/20 shadow-inner">
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Select Destination:</span>
          <select
            value={selectedDest}
            onChange={(e) => setSelectedDest(e.target.value)}
            className="bg-teal-dark border border-teal-green/30 rounded-lg text-xs font-bold text-teal-bright p-2 focus:outline-none focus:border-yellow-green cursor-pointer"
          >
            {Array.from(new Set(flights.map(f => f.country_name)))
              .sort()
              .map(country => (
                <option key={country} value={country}>{country}</option>
              ))
            }
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-teal-bright animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading flight pricing corridors...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Flights Estimator */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Flight Cost Widget */}
            <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-5">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 border-b border-teal-green/20 pb-3">
                <Plane className="h-5 w-5 text-teal-bright animate-bounce" />
                <span>Estimated Flight Airfares</span>
              </h3>
              
              {matchedFlight ? (
                <div className="flex items-center justify-between p-4 bg-teal-dark/10 border border-teal-green/15 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-teal-dark uppercase tracking-wide">Typical Route</span>
                    <div className="text-sm font-semibold text-slate-800 mt-1 flex items-center gap-2">
                      <span>{matchedFlight.origin}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                      <span>{matchedFlight.country_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Est. One-Way Cost</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                      ${Math.round(Number(matchedFlight.est_cost))}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No direct flight pricing available for this destination.</p>
              )}
            </div>

            {/* Baggage & Booking Tips */}
            <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-4">
              <h3 className="text-md font-bold text-slate-900 border-b border-teal-green/20 pb-3">
                Pre-Flight Preparation & Baggage Tips
              </h3>
              
              {matchedFlight && matchedFlight.checklist_json && matchedFlight.checklist_json.tips ? (
                <div className="space-y-3">
                  {matchedFlight.checklist_json.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-3 items-start text-xs text-slate-700 leading-relaxed">
                      <div className="rounded-lg bg-teal-bright/10 p-1.5 text-teal-bright shrink-0 mt-0.5 font-bold">
                        {idx + 1}
                      </div>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Tips are being generated...</p>
              )}
            </div>

          </div>

          {/* Right panel: First Week Checklist */}
          <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6">
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 border-b border-teal-green/20 pb-3">
              <ListTodo className="h-5 w-5 text-teal-bright" />
              <span>First-Week Arrival Steps</span>
            </h3>

            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                As soon as you touch down, follow these standard administrative tasks to set up your student registration.
              </p>

              <div className="space-y-3.5">
                {arrivalSteps.map((step: string, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-teal-dark/10 border border-teal-green/15 rounded-xl text-xs text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-teal-bright shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
