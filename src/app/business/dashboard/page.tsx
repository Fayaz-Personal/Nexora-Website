'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, Plane, ShieldCheck, MapPin, Landmark, Trash2, Edit, Plus, X, 
  Clock, DollarSign, Loader2, Sparkles, LayoutDashboard, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { getBusinessDashboardData, saveAccommodation, deleteAccommodation, saveVisa, deleteVisa, saveFlight, deleteFlight } from '@/app/actions/business';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie
} from 'recharts';

const COLORS = ['#0d9488', '#06b6d4', '#10b981', '#fbbf24', '#f87171'];

export default function BusinessDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'accommodations' | 'visas' | 'flights'>('overview');
  const [data, setData] = useState<any>(null);

  // Modal open states
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [isVisaModalOpen, setIsVisaModalOpen] = useState(false);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);

  // Edit target states
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
  const [selectedVisaId, setSelectedVisaId] = useState<number | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);

  // Accommodation Form state
  const [houseTitle, setHouseTitle] = useState('');
  const [houseCountryId, setHouseCountryId] = useState(0);
  const [houseCityName, setHouseCityName] = useState('');
  const [houseType, setHouseType] = useState('student housing');
  const [houseRent, setHouseRent] = useState(500);
  const [houseDistance, setHouseDistance] = useState('');
  const [houseAvailability, setHouseAvailability] = useState(true);
  const [houseFacilities, setHouseFacilities] = useState('');
  const [houseDesc, setHouseDesc] = useState('');

  // Visa Form state
  const [visaCountryId, setVisaCountryId] = useState(0);
  const [visaReqs, setVisaReqs] = useState('');
  const [visaDocs, setVisaDocs] = useState('');
  const [visaTimeline, setVisaTimeline] = useState('');
  const [visaFee, setVisaFee] = useState(100);
  const [visaSteps, setVisaSteps] = useState('');

  // Flight Form state
  const [flightOrigin, setFlightOrigin] = useState('');
  const [flightDestId, setFlightDestId] = useState(0);
  const [flightCost, setFlightCost] = useState(600);
  const [flightTips, setFlightTips] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Fetch Dashboard collections
  const loadData = async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user || (user.role !== 'business' && user.role !== 'platform_admin')) {
      router.push('/auth');
      return;
    }

    const businessData = await getBusinessDashboardData();
    if (businessData) {
      setData(businessData);
      
      // Select first country by default in forms
      if (businessData.countries.length > 0) {
        setHouseCountryId(businessData.countries[0].id);
        setVisaCountryId(businessData.countries[0].id);
        setFlightDestId(businessData.countries[0].id);
      }
    } else {
      router.push('/auth');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [router]);

  // Handle Save Accommodation
  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const facilitiesArray = houseFacilities.split(',').map(f => f.trim()).filter(Boolean);

    const res = await saveAccommodation({
      id: selectedHouseId || undefined,
      countryId: Number(houseCountryId),
      cityName: houseCityName,
      type: houseType,
      rent: Number(houseRent),
      distanceToUniv: houseDistance,
      availability: houseAvailability,
      facilities: facilitiesArray,
      title: houseTitle,
      description: houseDesc
    });

    if (res.success) {
      setIsHouseModalOpen(false);
      resetHouseForm();
      loadData();
    } else {
      alert(res.error || 'Failed to save accommodation.');
    }
    setSubmitting(false);
  };

  // Handle Delete Accommodation
  const handleDeleteHouse = async (id: number) => {
    if (!confirm('Are you sure you want to remove this accommodation listing?')) return;
    const res = await deleteAccommodation(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to delete listing.');
    }
  };

  const resetHouseForm = () => {
    setSelectedHouseId(null);
    setHouseTitle('');
    setHouseCityName('');
    setHouseType('student housing');
    setHouseRent(500);
    setHouseDistance('');
    setHouseAvailability(true);
    setHouseFacilities('');
    setHouseDesc('');
  };

  const openEditHouse = (house: any) => {
    setSelectedHouseId(house.id);
    setHouseTitle(house.title);
    setHouseCountryId(house.country_id);
    setHouseCityName(house.city_name);
    setHouseType(house.type);
    setHouseRent(Number(house.rent));
    setHouseDistance(house.distance_to_univ);
    setHouseAvailability(house.availability);
    setHouseFacilities(house.facilities ? house.facilities.join(', ') : '');
    setHouseDesc(house.description || '');
    setIsHouseModalOpen(true);
  };

  // Handle Save Visa
  const handleSaveVisa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const docsArray = visaDocs.split(',').map(d => d.trim()).filter(Boolean);
    const stepsArray = visaSteps.split('\n').map(s => s.trim()).filter(Boolean);

    const res = await saveVisa({
      id: selectedVisaId || undefined,
      countryId: Number(visaCountryId),
      requirements: visaReqs,
      documentsRequired: docsArray,
      timeline: visaTimeline,
      fee: Number(visaFee),
      steps: stepsArray
    });

    if (res.success) {
      setIsVisaModalOpen(false);
      resetVisaForm();
      loadData();
    } else {
      alert(res.error || 'Failed to save visa details.');
    }
    setSubmitting(false);
  };

  // Handle Delete Visa
  const handleDeleteVisa = async (id: number) => {
    if (!confirm('Are you sure you want to remove these visa protocols?')) return;
    const res = await deleteVisa(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to delete visa details.');
    }
  };

  const resetVisaForm = () => {
    setSelectedVisaId(null);
    setVisaReqs('');
    setVisaDocs('');
    setVisaTimeline('');
    setVisaFee(100);
    setVisaSteps('');
  };

  const openEditVisa = (visa: any) => {
    setSelectedVisaId(visa.id);
    setVisaCountryId(visa.country_id);
    setVisaReqs(visa.requirements);
    setVisaDocs(visa.documents_required ? visa.documents_required.join(', ') : '');
    setVisaTimeline(visa.timeline);
    setVisaFee(Number(visa.fee));
    setVisaSteps(visa.checklist_json && visa.checklist_json.steps ? visa.checklist_json.steps.join('\n') : '');
    setIsVisaModalOpen(true);
  };

  // Handle Save Flight
  const handleSaveFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const tipsArray = flightTips.split('\n').map(t => t.trim()).filter(Boolean);

    const res = await saveFlight({
      id: selectedFlightId || undefined,
      origin: flightOrigin,
      destinationCountryId: Number(flightDestId),
      estCost: Number(flightCost),
      tips: tipsArray
    });

    if (res.success) {
      setIsFlightModalOpen(false);
      resetFlightForm();
      loadData();
    } else {
      alert(res.error || 'Failed to save flight travel details.');
    }
    setSubmitting(false);
  };

  // Handle Delete Flight
  const handleDeleteFlight = async (id: number) => {
    if (!confirm('Are you sure you want to remove this flight travel detail?')) return;
    const res = await deleteFlight(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to delete flight travel detail.');
    }
  };

  const resetFlightForm = () => {
    setSelectedFlightId(null);
    setFlightOrigin('');
    setFlightCost(600);
    setFlightTips('');
  };

  const openEditFlight = (flight: any) => {
    setSelectedFlightId(flight.id);
    setFlightOrigin(flight.origin);
    setFlightDestId(flight.destination_country_id);
    setFlightCost(Number(flight.est_cost));
    setFlightTips(flight.checklist_json && flight.checklist_json.tips ? flight.checklist_json.tips.join('\n') : '');
    setIsFlightModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
        <p className="text-sm text-white/60">Loading business operations center...</p>
      </div>
    );
  }

  // Pre-calculate chart details dynamically for stats visualization
  const accommodationsCount = data?.accommodations.length || 0;
  const visasCount = data?.visas.length || 0;
  const flightsCount = data?.flights.length || 0;

  // Chart data: Average rent by accommodation type
  const rentsMap: { [key: string]: { sum: number, count: number } } = {};
  data?.accommodations.forEach((h: any) => {
    if (!rentsMap[h.type]) rentsMap[h.type] = { sum: 0, count: 0 };
    rentsMap[h.type].sum += Number(h.rent);
    rentsMap[h.type].count += 1;
  });
  const rentChartData = Object.keys(rentsMap).map(type => ({
    name: type.toUpperCase(),
    value: Math.round(rentsMap[type].sum / rentsMap[type].count)
  }));

  // Chart data: Counts by Country
  const countryCountsMap: { [key: string]: number } = {};
  data?.accommodations.forEach((h: any) => {
    countryCountsMap[h.country_name] = (countryCountsMap[h.country_name] || 0) + 1;
  });
  const countryChartData = Object.keys(countryCountsMap).map(country => ({
    name: country,
    value: countryCountsMap[country]
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-white">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-teal-green/20 pb-6">
        <div>
          <span className="text-xs font-bold text-teal-bright uppercase tracking-wide">Business Partner Admin</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Global Logistics Console
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Manage student accommodations directory, consular visa requirements, and travel logistics checklists.
          </p>
        </div>
        
        {activeTab !== 'overview' && (
          <button
            onClick={() => {
              if (activeTab === 'accommodations') { resetHouseForm(); setIsHouseModalOpen(true); }
              if (activeTab === 'visas') { resetVisaForm(); setIsVisaModalOpen(true); }
              if (activeTab === 'flights') { resetFlightForm(); setIsFlightModalOpen(true); }
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-bright to-teal-green text-white font-bold px-4 py-2.5 text-xs hover:from-teal-green hover:to-yellow-green transition-all cursor-pointer shadow-md shadow-teal-bright/20"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeTab === 'accommodations' && 'Add Accommodation'}
              {activeTab === 'visas' && 'Add Visa Protocol'}
              {activeTab === 'flights' && 'Add Flight Route'}
            </span>
          </button>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-teal-green/20 bg-teal-dark/30 p-1 rounded-xl w-fit">
        {[
          { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
          { id: 'accommodations', label: 'Accommodations', icon: Building },
          { id: 'visas', label: 'Visa Guides', icon: ShieldCheck },
          { id: 'flights', label: 'Flights & Travel', icon: Plane }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-bright text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-teal-dark/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab contents */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
          {/* Key metrics cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'Listed Accommodations', value: accommodationsCount, icon: Building, color: 'text-teal-bright bg-teal-bright/10' },
              { label: 'Configured Visa Guides', value: visasCount, icon: ShieldCheck, color: 'text-teal-green bg-teal-green/10' },
              { label: 'Flight Routes Active', value: flightsCount, icon: Plane, color: 'text-yellow-green bg-yellow-green/10' }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="glass-card rounded-2xl p-6 border border-teal-green/20 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{card.label}</span>
                    <span className="text-3xl font-extrabold text-white block mt-1">{card.value}</span>
                  </div>
                  <div className={`p-3 rounded-xl ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analytics graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-teal-green/20 pb-3">
                Average Rent by Housing Type (USD)
              </h3>
              {rentChartData.length === 0 ? (
                <p className="text-xs text-white/50 py-12 text-center">No housing data to plot.</p>
              ) : (
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0d9488" opacity={0.2} />
                      <XAxis dataKey="name" stroke="#a5f3fc" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#a5f3fc" />
                      <Tooltip contentStyle={{ backgroundColor: '#0d2527', border: '1px solid #0d9488', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]}>
                        {rentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-teal-green/20 pb-3">
                Housing Properties by Destination
              </h3>
              {countryChartData.length === 0 ? (
                <p className="text-xs text-white/50 py-12 text-center">No country listings to plot.</p>
              ) : (
                <div className="h-64 w-full text-xs flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={countryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {countryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0d2527', border: '1px solid #0d9488', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accommodations' && (
        <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-teal-green/20 pb-4">
            Manage Property Listings
          </h3>

          {data?.accommodations.length === 0 ? (
            <div className="text-center py-16 text-white/50">
              <Building className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <p className="text-xs">No accommodations configured. Click "Add Accommodation" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-teal-green/20 text-white/50">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Country & City</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Monthly Rent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-green/10">
                  {data?.accommodations.map((house: any) => (
                    <tr key={house.id} className="hover:bg-teal-dark/20 transition-all">
                      <td className="py-4 px-4 font-bold text-white">{house.title}</td>
                      <td className="py-4 px-4 text-white/80">{house.city_name}, {house.country_name}</td>
                      <td className="py-4 px-4 capitalize text-teal-bright font-semibold">{house.type}</td>
                      <td className="py-4 px-4 font-extrabold text-white">${Number(house.rent).toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          house.availability ? 'bg-teal-500/20 text-teal-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {house.availability ? 'Available' : 'Booked'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditHouse(house)}
                          className="p-1.5 bg-teal-green/10 hover:bg-teal-green/25 border border-teal-green/20 rounded-lg text-teal-bright cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHouse(house.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-550/20 rounded-lg text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'visas' && (
        <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-teal-green/20 pb-4">
            Manage Country Visa Protocols
          </h3>

          {data?.visas.length === 0 ? (
            <div className="text-center py-16 text-white/50">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <p className="text-xs">No visa guidelines defined. Click "Add Visa Protocol" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data?.visas.map((visa: any) => (
                <div key={visa.id} className="p-5 bg-teal-dark/30 border border-teal-green/20 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-teal-green/10 pb-2">
                      <span className="font-extrabold text-base text-white">{visa.country_name}</span>
                      <span className="text-xs font-bold text-teal-bright">${Number(visa.fee).toLocaleString()} fee</span>
                    </div>
                    
                    <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
                      {visa.requirements}
                    </p>

                    <div className="flex items-center gap-1 text-[11px] text-white/50">
                      <Clock className="h-3.5 w-3.5 text-teal-bright" />
                      <span>Timeline: {visa.timeline}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-teal-green/10 pt-3">
                    <button
                      onClick={() => openEditVisa(visa)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-teal-green/20 hover:bg-teal-green/10 text-teal-bright text-xs font-bold cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVisa(visa.id)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'flights' && (
        <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-teal-green/20 pb-4">
            Manage Flights & Travel Costs
          </h3>

          {data?.flights.length === 0 ? (
            <div className="text-center py-16 text-white/50">
              <Plane className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <p className="text-xs">No flight details defined. Click "Add Flight Route" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-teal-green/20 text-white/50">
                    <th className="py-3 px-4">Origin Hub</th>
                    <th className="py-3 px-4">Destination Country</th>
                    <th className="py-3 px-4">Estimated Ticket Cost</th>
                    <th className="py-3 px-4">Packing Guidelines / Tips</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-green/10">
                  {data?.flights.map((flight: any) => (
                    <tr key={flight.id} className="hover:bg-teal-dark/20 transition-all">
                      <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5 text-teal-bright rotate-45" />
                        <span>{flight.origin}</span>
                      </td>
                      <td className="py-4 px-4 text-white/80 font-bold">{flight.country_name}</td>
                      <td className="py-4 px-4 font-extrabold text-white">${Number(flight.est_cost).toLocaleString()}</td>
                      <td className="py-4 px-4 max-w-xs truncate text-white/60">
                        {flight.checklist_json?.tips ? flight.checklist_json.tips.join(' | ') : 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditFlight(flight)}
                          className="p-1.5 bg-teal-green/10 hover:bg-teal-green/25 border border-teal-green/20 rounded-lg text-teal-bright cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFlight(flight.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-550/20 rounded-lg text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Accommodations CRUD Modal */}
      {isHouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-dark/80 backdrop-blur-md px-4">
          <div className="w-full max-w-xl glass-card rounded-2xl p-6 border border-teal-green/30 max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-white border-b border-teal-green/20 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>{selectedHouseId ? 'Edit Housing Listing' : 'Publish New Accommodation'}</span>
              <button onClick={() => setIsHouseModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveHouse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Listing Title</label>
                  <input
                    type="text"
                    value={houseTitle}
                    onChange={(e) => setHouseTitle(e.target.value)}
                    placeholder="e.g. Olympic Village Single Studio"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Destination Country</label>
                  <select
                    value={houseCountryId}
                    onChange={(e) => setHouseCountryId(Number(e.target.value))}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none"
                  >
                    {data?.countries.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">City Name</label>
                  <input
                    type="text"
                    value={houseCityName}
                    onChange={(e) => setHouseCityName(e.target.value)}
                    placeholder="e.g. Munich"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Housing Type</label>
                  <select
                    value={houseType}
                    onChange={(e) => setHouseType(e.target.value)}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none"
                  >
                    <option value="hostels">Hostel</option>
                    <option value="student housing">Student Housing</option>
                    <option value="PGs">PG Room</option>
                    <option value="apartments">Apartment</option>
                    <option value="shared rooms">Shared Room</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Monthly Rent (USD)</label>
                  <input
                    type="number"
                    value={houseRent}
                    onChange={(e) => setHouseRent(Number(e.target.value))}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Distance to Campus</label>
                  <input
                    type="text"
                    value={houseDistance}
                    onChange={(e) => setHouseDistance(e.target.value)}
                    placeholder="e.g. 15 mins by U-Bahn"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Status / Availability</label>
                  <select
                    value={houseAvailability ? 'true' : 'false'}
                    onChange={(e) => setHouseAvailability(e.target.value === 'true')}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none"
                  >
                    <option value="true">Available</option>
                    <option value="false">Booked</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Amenities (Comma separated)</label>
                  <input
                    type="text"
                    value={houseFacilities}
                    onChange={(e) => setHouseFacilities(e.target.value)}
                    placeholder="e.g. Wifi, Heating, Kitchenette, Laundry"
                    className="w-full glass-input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Listing Description</label>
                  <textarea
                    value={houseDesc}
                    onChange={(e) => setHouseDesc(e.target.value)}
                    placeholder="Describe housing room setup details, deposits, and target students..."
                    rows={3}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-teal-green/20 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsHouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-teal-green/20 font-bold text-white/70 hover:bg-teal-dark cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {submitting ? 'Saving...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visas CRUD Modal */}
      {isVisaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-dark/80 backdrop-blur-md px-4">
          <div className="w-full max-w-xl glass-card rounded-2xl p-6 border border-teal-green/30 max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-white border-b border-teal-green/20 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>{selectedVisaId ? 'Edit Visa Protocols' : 'Add Visa Guidelines'}</span>
              <button onClick={() => setIsVisaModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveVisa} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Target Country</label>
                  <select
                    value={visaCountryId}
                    onChange={(e) => setVisaCountryId(Number(e.target.value))}
                    disabled={!!selectedVisaId}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none disabled:opacity-50"
                  >
                    {data?.countries.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Embassy Timeline</label>
                  <input
                    type="text"
                    value={visaTimeline}
                    onChange={(e) => setVisaTimeline(e.target.value)}
                    placeholder="e.g. 6 - 12 Weeks"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Visa Application Fee (USD)</label>
                  <input
                    type="number"
                    value={visaFee}
                    onChange={(e) => setVisaFee(Number(e.target.value))}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Consular Requirements / Description</label>
                  <textarea
                    value={visaReqs}
                    onChange={(e) => setVisaReqs(e.target.value)}
                    placeholder="Enter basic visa procedures and financial proof requirements..."
                    rows={3}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Required Documents (Comma separated)</label>
                  <input
                    type="text"
                    value={visaDocs}
                    onChange={(e) => setVisaDocs(e.target.value)}
                    placeholder="e.g. Passport, Admission Letter, Blocked Account Proof, Photos"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Step-by-Step Action Checklist (One step per line)</label>
                  <textarea
                    value={visaSteps}
                    onChange={(e) => setVisaSteps(e.target.value)}
                    placeholder="Step 1: Open Blocked Account&#10;Step 2: Book Embassy Slot&#10;Step 3: Attend Interview"
                    rows={4}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-teal-green/20 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsVisaModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-teal-green/20 font-bold text-white/70 hover:bg-teal-dark cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {submitting ? 'Saving...' : 'Save Protocols'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flights CRUD Modal */}
      {isFlightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-dark/80 backdrop-blur-md px-4">
          <div className="w-full max-w-xl glass-card rounded-2xl p-6 border border-teal-green/30 max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-white border-b border-teal-green/20 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>{selectedFlightId ? 'Edit Flight Details' : 'Configure Flight Route'}</span>
              <button onClick={() => setIsFlightModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveFlight} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Origin Hub Airport</label>
                  <input
                    type="text"
                    value={flightOrigin}
                    onChange={(e) => setFlightOrigin(e.target.value)}
                    placeholder="e.g. New Delhi (DEL)"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Destination Country</label>
                  <select
                    value={flightDestId}
                    onChange={(e) => setFlightDestId(Number(e.target.value))}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none"
                  >
                    {data?.countries.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Est. Ticket Cost (USD)</label>
                  <input
                    type="number"
                    value={flightCost}
                    onChange={(e) => setFlightCost(Number(e.target.value))}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Travel Guidelines & Packing Tips (One tip per line)</label>
                  <textarea
                    value={flightTips}
                    onChange={(e) => setFlightTips(e.target.value)}
                    placeholder="Tip 1: Book 3 months early for student fares&#10;Tip 2: Confirm check-in student baggage limit (40kg)"
                    rows={5}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-teal-green/20 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFlightModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-teal-green/20 font-bold text-white/70 hover:bg-teal-dark cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {submitting ? 'Saving...' : 'Save Flight Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
