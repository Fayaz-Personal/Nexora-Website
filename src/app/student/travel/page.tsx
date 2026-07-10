'use client';

import { useState, useEffect } from 'react';
import { 
  Plane, Calendar, DollarSign, ListTodo, ShieldCheck, CheckCircle2, Info, Loader2, ArrowRight, UserCheck, ShieldAlert, X, FileText,
  ChevronLeft, ChevronRight, Upload, Check
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { 
  getVisaCountries, 
  getActiveTravelPackages, 
  bookFlightPackage,
  getStudentProfile,
  getStudentFlightBookings,
  getBookedSeatsForPackage
} from '@/app/actions/student';

export default function TravelPlannerPage() {
  const [countriesList, setCountriesList] = useState<string[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  
  // Student Profile details
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentProfileName, setStudentProfileName] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedDest, setSelectedDest] = useState('all');
  
  // Booking modal/process states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeBookingPkg, setActiveBookingPkg] = useState<any | null>(null);
  const [passengerName, setPassengerName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [numSeats, setNumSeats] = useState(1);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const [bookingStatus, setBookingStatus] = useState<{ [key: number]: 'idle' | 'booking' | 'success' | 'error' }>({});
  const [bookingFeedback, setBookingFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Slides and step-based booking flow
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [bookingStep, setBookingStep] = useState(1);
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [uploadedDocUrl, setUploadedDocUrl] = useState('');

  // Rich Booking Flow States
  const [selectedClass, setSelectedClass] = useState('Economy');
  const [passengersList, setPassengersList] = useState<{ name: string; passport: string }[]>([{ name: '', passport: '' }]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<{ [key: string]: string }>({});
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [bookedPkgId, setBookedPkgId] = useState<number | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);

  const isRowInClassRange = (row: number, rangeStr: string): boolean => {
    if (!rangeStr) return false;
    if (rangeStr.includes('-')) {
      const [start, end] = rangeStr.split('-').map(Number);
      return row >= start && row <= end;
    }
    return row === Number(rangeStr);
  };
  
  // Slide detail tab state
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'baggage' | 'requirements'>('info');

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch student profile context
        const sessionUser = await getCurrentUser();
        if (sessionUser) {
          const profile = await getStudentProfile(sessionUser.id);
          if (profile) {
            setStudentId(profile.id);
            setStudentProfileName(profile.name || '');
            setPassengerName(profile.name || '');

            // Fetch student flight bookings to check if they already booked a flight
            const bookings = await getStudentFlightBookings(profile.id);
            const activeBooking = bookings.find(b => ['pending', 'approved', 'paid', 'confirmed'].includes(b.status));
            if (activeBooking) {
              setHasActiveBooking(true);
              setBookedPkgId(activeBooking.package_id);
            } else {
              setHasActiveBooking(false);
              setBookedPkgId(null);
            }
          }
        }

        // Fetch valid destination countries from visa catalog
        const countriesData = await getVisaCountries();
        setCountriesList(countriesData || []);
        setSelectedDest('all'); // Show all by default
      } catch (err) {
        console.error('Error loading travel page baseline data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch active travel packages whenever filters change
  const loadPackagesList = async () => {
    setPackagesLoading(true);
    try {
      const destinationFilter = selectedDest === 'all' ? undefined : selectedDest;
      const data = await getActiveTravelPackages(destinationFilter);
      setPackages(data || []);
    } catch (err) {
      console.error('Error loading active flight packages:', err);
    } finally {
      setPackagesLoading(false);
    }
  };

  useEffect(() => {
    loadPackagesList();
  }, [selectedDest]);

  // Open booking modal
  const openBookingWizard = async (pkg: any) => {
    if (!studentId) {
      setBookingFeedback({ type: 'error', text: 'Please sign in as a student to book flight seats.' });
      setTimeout(() => setBookingFeedback(null), 4000);
      return;
    }
    setActiveBookingPkg(pkg);
    setPassengerName(studentProfileName || '');
    setPassportNumber('');
    setContactPhone('');
    setNumSeats(1);
    setSelectedClass('Economy');
    setPassengersList([{ name: studentProfileName || '', passport: '' }]);
    setSelectedSeats([]);
    setUploadedDocs({});
    setBookingStep(1);
    setUploadedDocName('');
    setUploadedDocUrl('');
    
    // Fetch occupied seats for this package
    try {
      const occupied = await getBookedSeatsForPackage(pkg.id);
      setOccupiedSeats(occupied || []);
    } catch (e) {
      console.error(e);
      setOccupiedSeats([]);
    }

    setIsBookingModalOpen(true);
  };

  // Handle student seat booking submission (with multi-step document uploads)
  const handleConfirmBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentId || !activeBookingPkg) return;

    setSubmittingBooking(true);
    setBookingStatus(prev => ({ ...prev, [activeBookingPkg.id]: 'booking' }));
    try {
      const primaryName = passengersList[0]?.name || passengerName;
      const primaryPassport = passengersList[0]?.passport || passportNumber;

      const flightDetails = activeBookingPkg.flight_details 
        ? (typeof activeBookingPkg.flight_details === 'string' 
            ? JSON.parse(activeBookingPkg.flight_details) 
            : activeBookingPkg.flight_details) 
        : {};

      const details = {
        passengers: passengersList,
        cabinClass: selectedClass,
        selectedSeats: selectedSeats,
        uploadedDocuments: uploadedDocs,
        booking_fee: flightDetails.ticket_details?.booking_fee || 25
      };

      const res = await bookFlightPackage(
        studentId, 
        activeBookingPkg.id,
        numSeats,
        primaryName.trim(),
        primaryPassport.trim().toUpperCase(),
        contactPhone.trim(),
        uploadedDocs['Photo'] || '/uploads/visas/student_passport_photo.jpg',
        details
      );
      if (res.success) {
        setBookingStatus(prev => ({ ...prev, [activeBookingPkg.id]: 'success' }));
        setBookingFeedback({ type: 'success', text: `Request Submitted! Pending Agency Approval for ${numSeats} seat(s) on ${activeBookingPkg.flight_info}.` });
        setIsBookingModalOpen(false);
        setHasActiveBooking(true);
        setBookedPkgId(activeBookingPkg.id);
        loadPackagesList(); // Refresh seats count
      } else {
        alert(res.error || 'Failed to complete booking reservation.');
        setBookingStatus(prev => ({ ...prev, [activeBookingPkg.id]: 'error' }));
      }
    } catch (err) {
      console.error('Error booking flight package:', err);
      alert('An unexpected error occurred during booking. Please try again.');
      setBookingStatus(prev => ({ ...prev, [activeBookingPkg.id]: 'error' }));
    } finally {
      setSubmittingBooking(false);
    }
    setTimeout(() => setBookingFeedback(null), 4500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Feedback Toast Notification */}
      {bookingFeedback && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border animate-[fadeIn_0.3s_ease-out] ${
          bookingFeedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {bookingFeedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-rose-600" />}
          <span className="text-xs font-bold">{bookingFeedback.text}</span>
        </div>
      )}

      {/* Header Block */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Travel & Flight <span className="text-gradient-teal-sunrise">Planner</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Browse, compare, and book international flight schedules and travel packages published directly by verified partner agencies.
        </p>
      </div>

      {/* Destination Select Controller */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-3 bg-teal-dark/95 p-3 rounded-xl border border-teal-green/20 shadow-inner">
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Select Destination:</span>
          <select
            value={selectedDest}
            onChange={(e) => setSelectedDest(e.target.value)}
            className="bg-teal-dark border border-teal-green/30 rounded-lg text-xs font-bold text-white p-2 focus:outline-none focus:border-yellow-green cursor-pointer"
          >
            <option value="all" className="text-black bg-white">-- Show All Destinations --</option>
            {countriesList.map(country => (
              <option key={country} value={country} className="text-black bg-white">{country}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
          <p className="text-sm text-slate-500 font-semibold">Setting up study travel indices...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-md font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Plane className="h-5 w-5 text-teal-bright rotate-45" />
              <span>Available Flights & Packages ({packages.length})</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500 italic">
              Showing active routes published by partners
            </span>
          </div>

          {hasActiveBooking && (
            <div className="p-4 bg-teal-50/70 border border-teal-150 rounded-2xl flex items-start gap-3 text-teal-855 text-xs font-semibold max-w-3xl mx-auto shadow-sm animate-[fadeIn_0.3s_ease-out]">
              <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-extrabold uppercase tracking-wider block text-teal-900 text-[10px]">Active Flight Booking Exists</span>
                <p className="leading-relaxed">
                  You already have an active or pending flight ticket reservation request. Students are limited to exactly **one active flight booking** at a time. You can review your request status and details in your student dashboard.
                </p>
              </div>
            </div>
          )}

          {packagesLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 text-teal-bright animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-teal-green/20 rounded-3xl bg-teal-bright/5 max-w-xl mx-auto space-y-3">
              <Info className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">No Active Flights Found</h3>
              <p className="text-xs text-slate-650 max-w-sm mx-auto leading-relaxed">
                There are no flight travel packages configured in the database for this destination country yet. Please check back soon as verified travel agencies continuously update flight schedules.
              </p>
            </div>
          ) : (
            <div className="relative max-w-3xl mx-auto">
              {/* Prev / Next controls */}
              <div className="absolute top-1/2 -translate-y-1/2 -left-14 z-10 hidden md:block">
                <button
                  onClick={() => {
                    setActiveSlideIndex(prev => prev === 0 ? packages.length - 1 : prev - 1);
                  }}
                  className="p-3 bg-teal-900 hover:bg-teal-800 text-white rounded-full transition-colors border-0 cursor-pointer shadow-md"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 -right-14 z-10 hidden md:block">
                <button
                  onClick={() => {
                    setActiveSlideIndex(prev => prev === packages.length - 1 ? 0 : prev + 1);
                  }}
                  className="p-3 bg-teal-900 hover:bg-teal-800 text-white rounded-full transition-colors border-0 cursor-pointer shadow-md"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Slide content */}
              {(() => {
                const pkgIdx = Math.min(activeSlideIndex, packages.length - 1);
                const pkg = packages[pkgIdx] || packages[0];
                if (!pkg) return null;
                
                // Map stock images based on destination
                const getDestImage = (dest: string) => {
                  const d = dest ? dest.toLowerCase() : '';
                  if (d.includes('germany')) return 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80';
                  if (d.includes('united states') || d.includes('usa')) return 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80';
                  if (d.includes('united kingdom') || d.includes('uk') || d.includes('london')) return 'https://images.unsplash.com/photo-1513635269975-59663e0ca1ad?auto=format&fit=crop&w=800&q=80';
                  if (d.includes('canada')) return 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=800&q=80';
                  if (d.includes('australia')) return 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80';
                  return 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80';
                };

                const imgList = Array.isArray(pkg.images) ? pkg.images : [];
                const coverImage = imgList.length > 0 ? imgList[0] : getDestImage(pkg.destination_country);

                return (
                  <div className="bg-white rounded-3xl border border-teal-green/25 shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col md:flex-row text-slate-800 animate-[fadeIn_0.3s_ease-out]">
                    {/* Left: Destination Image with overlays */}
                    <div className="relative h-64 md:h-auto md:w-1/2 bg-slate-100 overflow-hidden min-h-[420px] flex flex-col justify-end">
                      <img 
                        src={coverImage} 
                        alt={pkg.destination_country} 
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                      
                      <div className="relative p-6 text-white space-y-3 z-10">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-teal-600 text-[10px] font-black uppercase tracking-wider text-white">
                            {pkg.company_name}
                          </span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase">
                            {(() => {
                              const details = pkg.flight_details ? (typeof pkg.flight_details === 'string' ? JSON.parse(pkg.flight_details) : pkg.flight_details) : null;
                              return details?.flight_number || 'LH763';
                            })()}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight">{pkg.flight_info}</h3>
                        
                        <div className="text-xs text-white/80 font-bold flex items-center gap-2">
                          <span>{pkg.departure_country || 'Origin'}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-white shrink-0" />
                          <span>{pkg.destination_country}</span>
                        </div>

                        {/* Airline Brand Info */}
                        {(() => {
                          const details = pkg.flight_details ? (typeof pkg.flight_details === 'string' ? JSON.parse(pkg.flight_details) : pkg.flight_details) : null;
                          const logo = details?.airline_logo || 'https://logo.clearbit.com/lufthansa.com';
                          const name = details?.airline_name || 'Lufthansa';
                          const aircraft = details?.aircraft_model || 'Airbus A350';
                          return (
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
                              <img src={logo} alt={name} className="h-7 w-7 rounded-lg bg-white p-0.5 shrink-0 object-contain" />
                              <div className="text-left">
                                <span className="text-xs font-extrabold text-white block">{name}</span>
                                <span className="text-[9px] text-white/60 block">{aircraft} • Standard Charter</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right: Detailed Package Specs with Tab Switchers */}
                    <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Base Fare</span>
                            <span className="text-2xl font-black text-slate-900 block mt-0.5">${Math.round(Number(pkg.ticket_cost))}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                              pkg.available_seats <= 5 
                                ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                              {pkg.available_seats} Seats left
                            </span>
                            {pkg.flight_details && (
                              <span className="block text-[8px] font-bold text-slate-450 uppercase mt-1">Window/Aisle Seats Available</span>
                            )}
                          </div>
                        </div>

                        {/* Sub-tab Switcher */}
                        <div className="flex border border-slate-200 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                          <button
                            onClick={() => setActiveDetailTab('info')}
                            className={`flex-1 py-1 px-2 font-bold rounded transition-all cursor-pointer ${
                              activeDetailTab === 'info' ? 'bg-white text-teal-dark shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Pricing & Info
                          </button>
                          <button
                            onClick={() => setActiveDetailTab('baggage')}
                            className={`flex-1 py-1 px-2 font-bold rounded transition-all cursor-pointer ${
                              activeDetailTab === 'baggage' ? 'bg-white text-teal-dark shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Baggage & Schedule
                          </button>
                          <button
                            onClick={() => setActiveDetailTab('requirements')}
                            className={`flex-1 py-1 px-2 font-bold rounded transition-all cursor-pointer ${
                              activeDetailTab === 'requirements' ? 'bg-white text-teal-dark shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Visa Clearances
                          </button>
                        </div>

                        {/* Sub-tab: Info & Details */}
                        {activeDetailTab === 'info' && (
                          <div className="space-y-3 text-[11px] animate-[fadeIn_0.2s_ease-out]">
                            {pkg.description && (
                              <p className="text-slate-650 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line text-[10px]">
                                {pkg.description}
                              </p>
                            )}
                            
                            <div className="space-y-1.5 border border-slate-150 p-2.5 rounded-xl bg-slate-50/50">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Cabin Class Pricing Matrix</span>
                              <div className="flex justify-between items-center text-slate-700 font-bold">
                                <span>Economy Class:</span>
                                <span className="text-slate-900">${Math.round(Number(pkg.ticket_cost))}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-700 font-bold">
                                <span>Premium Economy:</span>
                                <span className="text-slate-900">${Math.round(Number(pkg.ticket_cost) * 1.4)}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-700 font-bold font-bold">
                                <span>Business Class:</span>
                                <span className="text-slate-900">${Math.round(Number(pkg.ticket_cost) * 2.5)}</span>
                              </div>
                            </div>

                            <div className="space-y-1 pt-1 font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className={`h-4 w-4 shrink-0 ${pkg.has_insurance ? 'text-teal-500' : 'text-slate-350'}`} />
                                <span className={pkg.has_insurance ? 'text-slate-800' : 'text-slate-400 line-through font-normal'}>Travel Health Insurance</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className={`h-4 w-4 shrink-0 ${pkg.has_airport_pickup ? 'text-teal-500' : 'text-slate-350'}`} />
                                <span className={pkg.has_airport_pickup ? 'text-slate-800' : 'text-slate-400 line-through font-normal'}>Airport Shuttle Pick-up</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className={`h-4 w-4 shrink-0 ${pkg.visa_assistance ? 'text-teal-500' : 'text-slate-350'}`} />
                                <span className={pkg.visa_assistance ? 'text-slate-800' : 'text-slate-400 line-through font-normal'}>Visa Document Support</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sub-tab: Baggage & Transit */}
                        {activeDetailTab === 'baggage' && (
                          <div className="space-y-3 text-[11px] animate-[fadeIn_0.2s_ease-out] font-bold text-slate-700">
                            {(() => {
                              const details = pkg.flight_details ? (typeof pkg.flight_details === 'string' ? JSON.parse(pkg.flight_details) : pkg.flight_details) : null;
                              
                              const cabinBag = details?.baggage?.cabin_baggage || '7kg';
                              const checkinBag = details?.baggage?.check_in_baggage || '40kg (Student Offer)';
                              const extraCharges = details?.baggage?.extra_baggage_charges || '$15/kg';

                              const deptCity = details?.route?.departure_city || 'New Delhi';
                              const deptAirport = details?.route?.departure_airport || 'DEL';
                              const destCity = details?.route?.destination_city || 'Munich';
                              const destAirport = details?.route?.destination_airport || 'MUC';
                              
                              const depDate = details?.schedule?.departure_date || '2026-08-15';
                              const depTime = details?.schedule?.departure_time || '08:30';
                              const dur = details?.schedule?.flight_duration || '8h 20m';
                              
                              const transitType = details?.transit?.transit_type || (pkg.flight_info.toLowerCase().includes('direct') ? 'direct' : 'one_stop');
                              const transitAirport = details?.transit?.transit_airport || (transitType === 'direct' ? '' : 'Dubai (DXB)');
                              
                              return (
                                <>
                                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                                    <div>
                                      <span className="text-[8px] font-black text-slate-450 block uppercase mb-1">Departure Schedule</span>
                                      <span className="text-slate-900 block font-black">{deptCity} ({deptAirport})</span>
                                      <span className="text-slate-500 block text-[9px] font-medium mt-0.5">{depDate} at {depTime}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-black text-slate-450 block uppercase mb-1">Arrival Destination</span>
                                      <span className="text-slate-900 block font-black">{destCity} ({destAirport})</span>
                                      <span className="text-slate-500 block text-[9px] font-medium mt-0.5">Duration: {dur}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-[10px] py-1 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 text-slate-800">
                                      <span className="text-slate-450 uppercase text-[8px] font-bold">Stops:</span>
                                      <span className="capitalize">{transitType === 'direct' ? 'Direct Flight' : `1 Stop (${transitAirport})`}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-800">
                                      <span className="text-slate-450 uppercase text-[8px] font-bold">Extra Bag:</span>
                                      <span>{extraCharges}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-150">
                                    <span className="text-[8px] font-black text-slate-450 block uppercase">Student Baggage Allowances</span>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500 font-medium">Cabin Baggage Allowance:</span>
                                      <span className="text-slate-950 font-black">{cabinBag}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500 font-medium">Check-in Baggage Allowance:</span>
                                      <span className="text-slate-950 font-black">{checkinBag}</span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Sub-tab: Travel Requirements */}
                        {activeDetailTab === 'requirements' && (
                          <div className="space-y-3 text-[10px] animate-[fadeIn_0.2s_ease-out] font-bold text-slate-700">
                            {(() => {
                              const details = pkg.flight_details ? (typeof pkg.flight_details === 'string' ? JSON.parse(pkg.flight_details) : pkg.flight_details) : null;
                              
                              const visaType = details?.requirements?.visa_type || 'Student Visa (D-Type)';
                              const visaVal = details?.requirements?.visa_validity || 'Duration of Course';
                              const vaccines = details?.requirements?.vaccination_reqs || 'COVID-19 Full Dose';
                              
                              return (
                                <>
                                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[10px]">
                                    <span className="text-[8px] font-black text-slate-450 block uppercase">Student Travel Checklist</span>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                      <div className="flex items-center gap-1">
                                        <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                        <span>Passport Required</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                        <span>Student Visa Valid</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                        <span>Vaccine Cleared</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                        <span>Health Declaration</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-1 border border-slate-150 p-2.5 rounded-xl bg-slate-50/50">
                                    <span className="text-[8px] font-black text-slate-450 block uppercase">Immigration Clearances</span>
                                    <div><strong>Visa Category:</strong> {visaType}</div>
                                    <div><strong>Validity Period:</strong> {visaVal}</div>
                                    <div><strong>Vaccinations Required:</strong> {vaccines}</div>
                                  </div>

                                  <div className="space-y-1 border border-amber-100 p-2.5 rounded-xl bg-amber-50 text-amber-900 text-[9px] leading-relaxed font-semibold">
                                    <span className="text-[8px] font-black text-amber-850 block uppercase mb-0.5">Required Checkout Documents</span>
                                    <span>Passport Photo • University Offer Letter • Student Visa • Travel Health Insurance • Student Resume (CV)</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="text-[9px] text-slate-500 italic">
                          Agency contact: {pkg.contact_info}
                        </div>

                        <button
                          onClick={() => openBookingWizard(pkg)}
                          disabled={
                            hasActiveBooking ||
                            bookingStatus[pkg.id] === 'booking' || 
                            bookingStatus[pkg.id] === 'success' || 
                            pkg.available_seats <= 0
                          }
                          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                            pkg.available_seats <= 0
                              ? 'bg-slate-150 text-slate-450 border border-slate-200 cursor-not-allowed text-[10px]'
                              : hasActiveBooking
                                ? pkg.id === bookedPkgId
                                  ? 'bg-emerald-500 text-white border-0 cursor-not-allowed shadow-md'
                                  : 'bg-slate-200 text-slate-400 border-0 cursor-not-allowed text-[10px]'
                                : bookingStatus[pkg.id] === 'success'
                                  ? 'bg-emerald-500 text-white border-0 shadow-md'
                                  : bookingStatus[pkg.id] === 'booking'
                                    ? 'bg-slate-100 text-slate-400 border-0'
                                    : 'bg-gradient-teal-sunrise text-slate-950 border-0 shadow-md hover:shadow-lg'
                          }`}
                        >
                          {pkg.available_seats <= 0 ? (
                            <span>Sold Out</span>
                          ) : hasActiveBooking ? (
                            pkg.id === bookedPkgId ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Booked (Active)</span>
                              </>
                            ) : (
                              <span>Booking Blocked (Limit 1)</span>
                            )
                          ) : bookingStatus[pkg.id] === 'booking' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : bookingStatus[pkg.id] === 'success' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Request Submitted!</span>
                            </>
                          ) : (
                            <>
                              <Plane className="h-3.5 w-3.5" />
                              <span>Request Flight Seat</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dots navigation indicator */}
              <div className="flex justify-center gap-1.5 mt-6">
                {packages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`h-2.5 rounded-full transition-all border-0 cursor-pointer ${
                      activeSlideIndex === idx ? 'bg-teal-650 w-6' : 'bg-slate-300 hover:bg-slate-450 w-2.5'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flight Booking Checkout Wizard Modal */}
      {isBookingModalOpen && activeBookingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-teal-green/20 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800 animate-[fadeIn_0.2s_ease-out]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-teal-bright rotate-45" />
                <div>
                  <h3 className="text-md font-bold text-slate-900 uppercase tracking-wide">
                    Flight Booking Checkout
                  </h3>
                  <span className="text-[10px] font-bold text-teal-650 uppercase tracking-wider block mt-0.5">
                    Step {bookingStep} of 4 • {bookingStep === 1 ? 'Passengers & Class' : bookingStep === 2 ? 'Documents checklist' : bookingStep === 3 ? 'Choose Seats' : 'Invoice & Review'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsBookingModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selected Flight Summary */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-4 text-xs font-semibold">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block mb-0.5">Selected Flight</span>
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-slate-900">{activeBookingPkg.flight_info}</h4>
                <span className="text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded text-[9px] uppercase font-black">
                  {selectedClass}
                </span>
              </div>
            </div>

            {/* STEP 1: CABIN CLASS & PASSENGER INFORMATION */}
            {bookingStep === 1 && (
              <div className="space-y-4 text-xs font-semibold">
                {/* Select Class & Seats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase text-[9px] font-bold">Select Cabin Class</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-dark transition-all text-slate-700 font-bold"
                    >
                      <option value="Economy">Economy Class</option>
                      <option value="Premium Economy">Premium Economy</option>
                      <option value="Business">Business Class</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1.5 uppercase text-[9px] font-bold">Number of Passengers</label>
                    <select
                      value={numSeats}
                      onChange={(e) => {
                        const count = Number(e.target.value);
                        setNumSeats(count);
                        // Resize passengers list
                        setPassengersList(prev => {
                          const list = [...prev];
                          if (list.length < count) {
                            for (let i = list.length; i < count; i++) {
                              list.push({ name: '', passport: '' });
                            }
                          } else if (list.length > count) {
                            list.length = count;
                          }
                          return list;
                        });
                        // Reset seat selections to match seats count
                        setSelectedSeats([]);
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-dark transition-all text-slate-700 font-bold"
                    >
                      {[...Array(Math.min(5, activeBookingPkg.available_seats || 1))].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} Passenger{i > 0 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Primary Contact Phone */}
                <div>
                  <label className="block text-slate-500 mb-1 uppercase text-[9px] font-bold">Primary Contact Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-dark transition-all text-slate-800 font-medium"
                    required
                  />
                </div>

                {/* Passenger details loop */}
                <div className="space-y-3.5 pt-2 max-h-[30vh] overflow-y-auto pr-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">
                    Passenger Credentials
                  </span>
                  
                  {passengersList.map((passenger, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-teal-650 block uppercase">
                        Passenger #{idx + 1} {idx === 0 && '(Lead Passenger)'}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            value={passenger.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPassengersList(prev => {
                                const copy = [...prev];
                                copy[idx].name = val;
                                return copy;
                              });
                              if (idx === 0) setPassengerName(val);
                            }}
                            placeholder="Full Name (as in Passport)"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={passenger.passport}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPassengersList(prev => {
                                const copy = [...prev];
                                copy[idx].passport = val;
                                return copy;
                              });
                              if (idx === 0) setPassportNumber(val);
                            }}
                            placeholder="Passport Number"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs uppercase"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={!contactPhone || passengersList.some(p => !p.name || !p.passport)}
                    onClick={() => setBookingStep(2)}
                    className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow hover:scale-[1.02] transition-transform border-0 cursor-pointer disabled:opacity-50"
                  >
                    Next: Upload Documents
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DOCUMENTS UPLOADS */}
            {bookingStep === 2 && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="p-3 bg-teal-50 border border-teal-100 text-teal-900 rounded-2xl text-[10px] leading-relaxed">
                  <span className="font-bold block mb-0.5">Required Document Uploads</span>
                  Verified travel agencies check these documents to clear border control requirements for university study packages.
                </div>

                <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                  {[
                    { label: 'Passport Photo', key: 'Photo' },
                    { label: 'University Offer Letter', key: 'Offer Letter' },
                    { label: 'Student Visa Approval', key: 'Student Visa' },
                    { label: 'Travel Health Insurance', key: 'Travel Insurance' },
                    { label: 'Student Resume (CV)', key: 'Resume' }
                  ].map((doc) => {
                    const hasDoc = !!uploadedDocs[doc.key];
                    return (
                      <div key={doc.key} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[11px] font-bold text-slate-800 block leading-tight">{doc.label}</span>
                            <span className="text-[8px] text-slate-400 block leading-none mt-0.5">
                              {uploadedDocs[doc.key] ? uploadedDocs[doc.key] : 'Not uploaded yet'}
                            </span>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadedDocs(prev => ({
                                  ...prev,
                                  [doc.key]: file.name
                                }));
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <button
                            type="button"
                            className={`px-3 py-1 text-[9px] font-black uppercase rounded tracking-wider border cursor-pointer ${
                              hasDoc 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                : 'bg-white border-slate-250 text-slate-650 hover:bg-slate-100'
                            }`}
                          >
                            {hasDoc ? 'Uploaded' : 'Upload'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="px-4 py-1.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer bg-transparent"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingStep(3)}
                    className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow hover:scale-[1.02] transition-transform border-0 cursor-pointer"
                  >
                    Next: Choose Seats
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SEAT ASSIGNMENT GRID */}
            {bookingStep === 3 && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-650 text-center font-semibold leading-relaxed">
                  Select <strong className="text-slate-900">{numSeats}</strong> seat{numSeats > 1 ? 's' : ''} for cabin class <strong className="text-teal-650 uppercase">{selectedClass}</strong>. 
                  Seats belonging to other classes are locked.
                </div>

                {/* Aircraft seating grid mapping */}
                {(() => {
                  const flightDetails = activeBookingPkg.flight_details 
                    ? (typeof activeBookingPkg.flight_details === 'string' 
                        ? JSON.parse(activeBookingPkg.flight_details) 
                        : activeBookingPkg.flight_details) 
                    : {};
                  const seatsConfig = flightDetails.seats || {};
                  const rowsCount = Number(seatsConfig.rows_count || 0);
                  const colsCount = Number(seatsConfig.columns_count || 6);

                  const businessRows = seatsConfig.business_rows || "1-2";
                  const premiumRows = seatsConfig.premium_rows || "3-4";
                  const economyRows = seatsConfig.economy_rows || "5-15";

                  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
                  
                  // If rows_count is present, render dynamically from 1 to rows_count. Otherwise fallback to default rows.
                  const seatRows = rowsCount 
                    ? Array.from({ length: rowsCount }, (_, i) => i + 1)
                    : [10, 11, 12, 14, 15];
                  const seatLetters = rowsCount
                    ? alphabet.slice(0, colsCount)
                    : ['A', 'B', 'C', 'D', 'E', 'F'];

                  const hasCustomConfig = !!rowsCount;

                  return (
                    <div className="space-y-2 max-w-sm mx-auto bg-slate-100/50 border border-slate-200 p-4 rounded-2xl">
                      <div className="flex justify-center text-[9px] text-slate-450 uppercase font-black tracking-wider mb-2">Aircraft Cabin Layout</div>
                      <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1">
                        {seatRows.map(row => {
                          let isRowAllowed = true;
                          if (hasCustomConfig) {
                            if (selectedClass === 'Business') {
                              isRowAllowed = isRowInClassRange(row, businessRows);
                            } else if (selectedClass === 'Premium Economy') {
                              isRowAllowed = isRowInClassRange(row, premiumRows);
                            } else {
                              isRowAllowed = isRowInClassRange(row, economyRows);
                            }
                          }

                          return (
                            <div key={row} className="flex justify-center items-center gap-1.5 text-[10px] font-bold">
                              <span className="w-4 text-center text-slate-400">{row}</span>
                              {seatLetters.map((letter, idx) => {
                                const seatId = `${row}${letter}`;
                                const isSelected = selectedSeats.includes(seatId);
                                const isOccupied = occupiedSeats.includes(seatId);
                                const isClassLocked = !isRowAllowed;
                                const isDisabled = isOccupied || isClassLocked;

                                const isAisle = letter === 'C' || letter === 'D';

                                return (
                                  <div key={letter} className="flex items-center">
                                    <button
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedSeats(prev => prev.filter(s => s !== seatId));
                                        } else {
                                          if (selectedSeats.length >= numSeats) {
                                            setSelectedSeats(prev => [...prev.slice(1), seatId]);
                                          } else {
                                            setSelectedSeats(prev => [...prev, seatId]);
                                          }
                                        }
                                      }}
                                      className={`w-6 h-6 rounded flex items-center justify-center font-black text-[9px] border transition-all ${
                                        isSelected 
                                          ? 'bg-teal-500 border-teal-650 text-white shadow-md' 
                                          : isOccupied
                                            ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                                            : isClassLocked
                                              ? 'bg-slate-100/55 border-slate-150 text-slate-300 cursor-not-allowed opacity-40'
                                              : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-100 cursor-pointer'
                                      }`}
                                      title={
                                        isOccupied 
                                          ? `Seat ${seatId} Occupied` 
                                          : isClassLocked 
                                            ? `Seat ${seatId} locked for ${selectedClass} Class` 
                                            : `Select Seat ${seatId}`
                                      }
                                    >
                                      {isOccupied ? '✕' : letter}
                                    </button>
                                    {isAisle && idx === 2 && <div className="w-3" />} {/* Aisle Gap */}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-450 uppercase mt-3 pt-2 border-t border-slate-150">
                        <span>Selected: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}</span>
                        <span>Required: {selectedSeats.length} / {numSeats}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBookingStep(2)}
                    className="px-4 py-1.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer bg-transparent"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={selectedSeats.length !== numSeats}
                    onClick={() => setBookingStep(4)}
                    className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow hover:scale-[1.02] transition-transform border-0 cursor-pointer disabled:opacity-50"
                  >
                    Next: Review Invoice
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW SUMMARY INVOICE */}
            {bookingStep === 4 && (
              <div className="space-y-4">
                {(() => {
                  const baseCost = Number(activeBookingPkg.ticket_cost);
                  const classMultiplier = selectedClass === 'Business' ? 2.5 : selectedClass === 'Premium Economy' ? 1.4 : 1.0;
                  const ticketCost = Math.round(baseCost * classMultiplier);
                  const subtotal = ticketCost * numSeats;
                  const flightDetails = activeBookingPkg.flight_details 
                    ? (typeof activeBookingPkg.flight_details === 'string' 
                        ? JSON.parse(activeBookingPkg.flight_details) 
                        : activeBookingPkg.flight_details) 
                    : {};
                  const bookingFee = flightDetails.ticket_details?.booking_fee || 25;
                  const taxes = Math.round(subtotal * 0.1);
                  const total = subtotal + bookingFee + taxes;

                  return (
                    <>
                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50 space-y-2 text-xs font-semibold text-slate-650">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Invoice Pricing Breakdown</span>
                        <div className="flex justify-between">
                          <span>Fare Class ({selectedClass}):</span>
                          <span>{numSeats} × ${ticketCost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Booking Administration Fee:</span>
                          <span>${bookingFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Government Airport Taxes (10%):</span>
                          <span>${taxes}</span>
                        </div>
                        {activeBookingPkg.has_insurance && (
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Travel Health Insurance:</span>
                            <span className="text-teal-600 font-bold">Included</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-2">
                          <span>Total Amount Due:</span>
                          <span>${total}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl text-[10px] font-semibold leading-relaxed">
                        <span>
                          <strong>Pending Seat Reservation:</strong> Reserving seats {selectedSeats.join(', ')} temporarily. 
                          Upon travel agency review and approval of uploaded visa documents, you will be prompted on your dashboard to pay the invoice and confirm the tickets.
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setBookingStep(3)}
                          className="px-4 py-1.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer bg-transparent"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmBooking}
                          disabled={submittingBooking}
                          className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform border-0 cursor-pointer"
                        >
                          {submittingBooking ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Reserving...</span>
                            </span>
                          ) : (
                            <span>Request Booking</span>
                          )}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
