'use client';

import { useState, useEffect } from 'react';
import { 
  Home, MapPin, DollarSign, ShieldAlert, Award, Compass, Loader2, Sparkles, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { getAccommodations } from '@/app/actions/student';
import { useCurrency } from '@/components/CurrencyContext';

interface Accommodation {
  id: number;
  country_name: string;
  city_name: string;
  type: 'hostels' | 'student housing' | 'PGs' | 'apartments' | 'shared rooms';
  rent: string;
  distance_to_univ: string;
  availability: boolean;
  facilities: string[];
  title: string;
  description: string;
}

export default function AccommodationsPage() {
  const [loading, setLoading] = useState(true);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const { formatPrice } = useCurrency();
  
  // Filters
  const [country, setCountry] = useState('all');
  const [type, setType] = useState('all');

  const fetchHousing = async () => {
    setLoading(true);
    const data = await getAccommodations({ country, type });
    setAccommodations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHousing();
  }, [country, type]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Accommodation <span className="text-gradient-teal-sunrise">Finder</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Discover student-friendly hostels, shared rooms, PGs, and apartments near major university hubs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filters Side panel */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-teal-green/20 h-fit space-y-6">
          <h3 className="text-md font-bold text-slate-900 border-b border-teal-green/20 pb-3 flex items-center gap-2">
            <span>Filter Housing</span>
          </h3>

          {/* Country Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-teal-dark border border-teal-green/30 rounded-lg text-white p-2 text-xs focus:outline-none focus:border-yellow-green"
            >
              <option value="all">All Countries</option>
              <option value="Germany">Germany</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Housing Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-teal-dark border border-teal-green/30 rounded-lg text-white p-2 text-xs focus:outline-none focus:border-yellow-green"
            >
              <option value="all">All Types</option>
              <option value="hostels">Hostels</option>
              <option value="student housing">Student Housing</option>
              <option value="PGs">PGs</option>
              <option value="apartments">Apartments</option>
              <option value="shared rooms">Shared Rooms</option>
            </select>
          </div>

          <button
            onClick={() => { setCountry('all'); setType('all'); }}
            className="w-full py-2 bg-teal-dark border border-teal-green/20 rounded-xl text-xs font-semibold hover:bg-teal-bright/20 transition-all cursor-pointer text-white"
          >
            Reset Filters
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-teal-bright animate-spin mb-3" />
              <p className="text-xs text-slate-500">Searching available housing listings...</p>
            </div>
          ) : accommodations.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-teal-green/20">
              <Home className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-950">No Accommodation Found</p>
              <p className="text-xs text-slate-600 mt-1">Try changing country filters or resetting types.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accommodations.map(house => (
                <div key={house.id} className="glass-card glass-card-hover rounded-2xl p-6 border border-teal-green/20 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="rounded-lg bg-teal-bright/10 px-2 py-0.5 text-[10px] font-bold text-teal-bright uppercase">
                          {house.type}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5">
                          {house.title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                          <MapPin className="h-3.5 w-3.5 text-teal-green" />
                          <span>{house.city_name}, {house.country_name}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Monthly</span>
                        <span className="text-sm font-extrabold text-slate-900 block whitespace-nowrap">
                          {formatPrice(Number(house.rent), house.country_currency || 'USD')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed mb-4">
                      {house.description}
                    </p>

                    {/* Facilities */}
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-2">Amenities</span>
                      <div className="flex flex-wrap gap-1.5">
                        {house.facilities.map(facility => (
                          <span key={facility} className="text-[10px] bg-teal-dark/10 border border-teal-green/15 text-slate-800 px-2 py-1 rounded-lg">
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Distance and Availability */}
                  <div className="border-t border-teal-green/15 pt-3 flex justify-between items-center text-xs">
                    <span className="text-slate-600">
                      Distance: <span className="font-semibold text-slate-900">{house.distance_to_univ}</span>
                    </span>
                    <span className={`font-bold uppercase tracking-wider text-[10px] ${
                      house.availability ? 'text-teal-bright' : 'text-orange-light'
                    }`}>
                      {house.availability ? 'Available' : 'Booked'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
