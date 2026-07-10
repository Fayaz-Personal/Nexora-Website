'use client';

import { useState, useEffect } from 'react';
import { 
  Home, MapPin, DollarSign, ShieldAlert, Award, Compass, Loader2, Sparkles, ShieldCheck, CheckCircle2, Star, Clock, Building, Users, X,
  ChevronLeft, ChevronRight, FileText, Check, Upload
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { 
  getAccommodations, 
  getUniversities, 
  getProximityAccommodationsForUniversity,
  getStudentProfile,
  submitStudentInquiry,
  bookAccommodationRoom,
  getStudentRoomBookings,
  uploadDocument
} from '@/app/actions/student';
import { useCurrency } from '@/components/CurrencyContext';

interface Accommodation {
  id: number;
  country_name: string;
  country_currency?: string;
  city_name: string;
  type: string;
  rent: string;
  distance_to_univ: string;
  commute_time?: string;
  availability: boolean;
  facilities: string[];
  title: string;
  description: string;
  rating?: number;
  review_count?: number;
  reviews?: string[];
  match_score?: number;
  business_id?: number;
  mobile_number?: string;
  website?: string;
  address?: string;
  total_rooms?: number;
  room_info_json?: any;
  images?: string[];
  videos?: string[];
}

const getRoomsArray = (house: any) => {
  if (!house || !house.room_info_json) return [];
  if (Array.isArray(house.room_info_json)) {
    return house.room_info_json;
  }
  // wrap legacy single room stay
  return [{
    roomType: house.room_info_json.roomType || 'Standard Room',
    occupancy: Number(house.room_info_json.occupancy || 1),
    gender: house.room_info_json.gender || 'Mixed',
    rent: Number(house.rent || 0),
    total_rooms: Number(house.total_rooms || 1),
    available_rooms: house.available_rooms !== null ? Number(house.available_rooms) : 1,
    description: 'Standard stay features'
  }];
};

export default function AccommodationsPage() {
  const [loading, setLoading] = useState(true);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const { formatPrice } = useCurrency();
  
  // Student Context
  const [studentId, setStudentId] = useState<number | null>(null);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<{ [key: number]: 'idle' | 'booking' | 'success' | 'error' }>({});
  
  // Real-time booking states
  const [bookingHouse, setBookingHouse] = useState<Accommodation | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  // Carousel, video player, and step-based booking states
  const [activeImageIndexes, setActiveImageIndexes] = useState<{ [key: number]: number }>({});
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedRoomType, setSelectedRoomType] = useState('Single');
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [uploadedDocUrl, setUploadedDocUrl] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');

  const roomsArray = bookingHouse ? getRoomsArray(bookingHouse) : [];
  const selectedRoom = bookingHouse 
    ? (roomsArray.find((r: any) => r.roomType === selectedRoomType) || roomsArray[0] || {
        rent: Number(bookingHouse.rent || 500),
        occupancy: Number(bookingHouse.room_info_json?.occupancy || 1),
        available_rooms: bookingHouse.available_rooms !== null ? Number(bookingHouse.available_rooms) : 1,
        gender: bookingHouse.room_info_json?.gender || 'Mixed'
      })
    : { rent: 500, occupancy: 1, available_rooms: 1, gender: 'Mixed' };

  // Filters
  const [country, setCountry] = useState('all');
  const [type, setType] = useState('all');
  const [selectedUnivId, setSelectedUnivId] = useState('all');
  const [universities, setUniversities] = useState<any[]>([]);
  
  // Radius and Sorting states
  const [radius, setRadius] = useState('all'); // '5', '10', '15', 'all'
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'rent', 'rating'

  // Load universities and student profile on mount
  useEffect(() => {
    getUniversities({}).then(data => setUniversities(data));

    async function loadStudent() {
      try {
        const user = await getCurrentUser();
        if (user) {
          const profile = await getStudentProfile(user.id);
          if (profile) {
            setStudentId(profile.id);
            const bookings = await getStudentRoomBookings(profile.id);
            const active = bookings.find((b: any) => b.status !== 'cancelled' && b.status !== 'rejected');
            if (active) {
              setActiveBooking(active);
            }
          }
        }
      } catch (err) {
        console.error('Error loading student profile:', err);
      }
    }
    loadStudent();
  }, []);

  const fetchHousing = async () => {
    setLoading(true);
    let data = [];
    if (selectedUnivId !== 'all') {
      data = await getProximityAccommodationsForUniversity(Number(selectedUnivId));
    } else {
      data = await getAccommodations({ country, type });
    }

    let filtered = data;
    
    // Apply radius filter if university is selected
    if (selectedUnivId !== 'all' && radius !== 'all') {
      const radiusNum = Number(radius);
      filtered = data.filter((h: any) => h.distance_km <= radiusNum);
    }

    // Apply type filter
    if (type !== 'all') {
      filtered = filtered.filter((h: any) => h.type === type);
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      if (sortBy === 'distance') {
        const distA = a.distance_km !== undefined ? a.distance_km : 9999;
        const distB = b.distance_km !== undefined ? b.distance_km : 9999;
        return distA - distB;
      } else if (sortBy === 'rent') {
        return Number(a.rent) - Number(b.rent);
      } else if (sortBy === 'rating') {
        const ratingA = a.rating !== undefined ? a.rating : 0;
        const ratingB = b.rating !== undefined ? b.rating : 0;
        return ratingB - ratingA;
      }
      return 0;
    });

    setAccommodations(filtered as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchHousing();
  }, [country, type, selectedUnivId, radius, sortBy]);

  // Handle Book Accommodation - Opens Booking Modal
  const handleBookAccommodation = (house: Accommodation) => {
    setErrorMessage(null);
    if (!studentId) {
      setErrorMessage('Please sign in as a student to book accommodation.');
      return;
    }
    
    if (activeBooking) {
      setErrorMessage('You already have an active or pending accommodation booking request. Please check your dashboard.');
      return;
    }
    
    setBookingHouse(house);
    setBookingStep(1);
    const rooms = getRoomsArray(house);
    setSelectedRoomType(rooms.length > 0 ? rooms[0].roomType : (house.room_info_json?.roomType || house.type || 'Single'));
    setUploadedDocName('');
    setUploadedDocUrl('');
    setPassengerName('');
    setPassengerPhone('');
    setPassengerEmail('');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const checkout = new Date();
    checkout.setMonth(checkout.getMonth() + 3);
    const checkoutStr = checkout.toISOString().split('T')[0];

    setCheckIn(tomorrowStr);
    setCheckOut(checkoutStr);
    setGuests(1);
  };

  // Confirm Real-time Booking
  const confirmRealTimeBooking = async () => {
    if (!bookingHouse || !studentId) return;

    setBookingStatus(prev => ({ ...prev, [bookingHouse.id]: 'booking' }));
    
    // Calculate total cost based on check-in / check-out days
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const months = Math.max(1, Math.round(diffDays / 30));
    const totalCost = Number(selectedRoom.rent) * months;

    try {
      const res = await bookAccommodationRoom(
        studentId, 
        bookingHouse.id, 
        checkIn, 
        checkOut, 
        guests, 
        totalCost,
        uploadedDocUrl || '/uploads/student_passport_id.pdf',
        selectedRoomType
      );
      if (res.success) {
        setBookingStatus(prev => ({ ...prev, [bookingHouse.id]: 'success' }));
        setBookingHouse(null); // Close modal
        fetchHousing(); // Refresh accommodations
        
        // Refresh active booking
        const bookings = await getStudentRoomBookings(studentId);
        const active = bookings.find((b: any) => b.status !== 'cancelled' && b.status !== 'rejected');
        if (active) {
          setActiveBooking(active);
        }
      } else {
        setErrorMessage(res.error || 'Failed to complete booking request.');
        setBookingStatus(prev => ({ ...prev, [bookingHouse.id]: 'error' }));
      }
    } catch (err) {
      console.error('Error confirming booking:', err);
      setBookingStatus(prev => ({ ...prev, [bookingHouse.id]: 'error' }));
    }
  };

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

      {/* Page Error Message Banner */}
      {errorMessage && !bookingHouse && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-100 rounded-lg text-rose-500 hover:text-rose-700 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active Booking Banner */}
      {activeBooking && (
        <div className="mb-8 p-5 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-xl">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                You have an active stay booking request: <span className="text-teal-600">#BK-{activeBooking.id}</span>
              </h4>
              <p className="text-xs text-slate-700 mt-1">
                Property: <span className="font-bold text-slate-800">{activeBooking.property_title}</span> • Room Type: <span className="capitalize font-bold text-slate-800">{activeBooking.room_type}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-end">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              activeBooking.status === 'pending'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : activeBooking.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {activeBooking.status}
            </span>
            <a
              href="/student/dashboard"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <span>View Dashboard</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filters Side panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 h-fit space-y-6 text-slate-800">
          <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>Filter Housing</span>
          </h3>

          {/* Smart University Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-teal-dark animate-pulse" />
              <span>Select University</span>
            </label>
            <select
              value={selectedUnivId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedUnivId(val);
                if (val !== 'all') {
                  const matched = universities.find(u => u.id === Number(val));
                  if (matched) {
                    setCountry(matched.country_name);
                  }
                  setSortBy('distance');
                } else {
                  setSortBy('rent');
                  setRadius('all');
                }
              }}
              className="w-full bg-white border border-slate-200 rounded-xl text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-bright transition-all font-semibold shadow-sm cursor-pointer"
            >
              <option value="all">-- None (Show All) --</option>
              {universities.map(univ => (
                <option key={univ.id} value={univ.id}>{univ.name}</option>
              ))}
            </select>
            {selectedUnivId !== 'all' && (
              <p className="text-[10px] text-teal-dark mt-1 font-semibold">
                Showing housing near selected university.
              </p>
            )}
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Country
            </label>
            <select
              value={country}
              disabled={selectedUnivId !== 'all'}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl text-slate-850 p-2.5 text-xs focus:outline-none focus:border-teal-bright transition-all font-semibold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full bg-white border border-slate-200 rounded-xl text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-bright transition-all font-semibold shadow-sm cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="PG">PG</option>
              <option value="Hostel">Hostel</option>
              <option value="Apartment">Apartment</option>
              <option value="Flat">Flat</option>
              <option value="Shared Apartment">Shared Apartment</option>
              <option value="Studio Apartment">Studio Apartment</option>
              <option value="Individual House">Individual House</option>
              <option value="Villa">Villa</option>
              <option value="Hotel">Hotel</option>
              <option value="Homestay">Homestay</option>
              <option value="Dormitory">Dormitory</option>
            </select>
          </div>

          {/* Proximity Radius */}
          {selectedUnivId !== 'all' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-teal-dark animate-spin-slow" />
                <span>Search Radius</span>
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-bright transition-all font-semibold shadow-sm cursor-pointer"
              >
                <option value="all">Show All</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="15">Within 15 km</option>
              </select>
            </div>
          )}

          {/* Sort By Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-bright transition-all font-semibold shadow-sm cursor-pointer"
            >
              {selectedUnivId !== 'all' && <option value="distance">Distance</option>}
              <option value="rent">Monthly Rent</option>
              <option value="rating">Rating</option>
            </select>
          </div>

          <button
            onClick={() => {
              setCountry('all');
              setType('all');
              setSelectedUnivId('all');
              setRadius('all');
              setSortBy('rent');
            }}
            className="w-full py-2.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-850 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
          >
            Reset Filters
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-teal-dark animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-semibold">Searching available housing listings...</p>
            </div>
          ) : accommodations.length === 0 ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 text-center">
              <Home className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-900">No Accommodation Found</p>
              <p className="text-xs text-slate-500 mt-1">Try changing country filters or resetting types.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accommodations.map(house => {
                const imgList = Array.isArray(house.images) ? house.images : [];
                const vidList = Array.isArray(house.videos) ? house.videos : [];
                const roomsArray = getRoomsArray(house);
                
                // Calculate display stats
                const rents = roomsArray.map((r: any) => Number(r.rent || 0));
                const minRent = rents.length > 0 ? Math.min(...rents) : Number(house.rent || 500);
                const maxRent = rents.length > 0 ? Math.max(...rents) : Number(house.rent || 500);
                const displayRent = minRent === maxRent 
                  ? formatPrice(minRent, house.country_currency || 'USD')
                  : `${formatPrice(minRent, house.country_currency || 'USD')} - ${formatPrice(maxRent, house.country_currency || 'USD')}`;
                  
                const occupancies = roomsArray.map((r: any) => Number(r.occupancy || 1));
                const minOccupancy = occupancies.length > 0 ? Math.min(...occupancies) : 1;
                const maxOccupancy = occupancies.length > 0 ? Math.max(...occupancies) : 1;
                const displayOccupancy = minOccupancy === maxOccupancy 
                  ? `${minOccupancy} Stud.` 
                  : `${minOccupancy}-${maxOccupancy} Stud.`;
                  
                const genders = Array.from(new Set(roomsArray.map((r: any) => r.gender || 'Mixed')));
                const displayGender = genders.length === 1 ? genders[0] : 'Multiple';
                
                const sumTotalRooms = roomsArray.reduce((sum: number, r: any) => sum + Number(r.total_rooms || 0), 0);
                const sumAvailableRooms = roomsArray.reduce((sum: number, r: any) => sum + Number(r.available_rooms || 0), 0);

                return (
                  <div key={house.id} className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-full text-slate-800">
                    <div>
                      {/* Image / Video Showcase with Overlay Badges */}
                      <div className="relative h-56 w-full bg-slate-100 overflow-hidden group">
                        {imgList.length > 0 ? (
                          <img 
                            src={imgList[activeImageIndexes[house.id] || 0]} 
                            alt={house.title} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";
                            }}
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
                            <Building className="h-14 w-14 text-teal-650/20" />
                          </div>
                        )}
                        
                        {/* Gradient Cover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                        {/* Interactive Carousel Arrows */}
                        {imgList.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const current = activeImageIndexes[house.id] || 0;
                                const prevIdx = current === 0 ? imgList.length - 1 : current - 1;
                                setActiveImageIndexes(prev => ({ ...prev, [house.id]: prevIdx }));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 cursor-pointer transition-all z-10 border-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const current = activeImageIndexes[house.id] || 0;
                                const nextIdx = current === imgList.length - 1 ? 0 : current + 1;
                                setActiveImageIndexes(prev => ({ ...prev, [house.id]: nextIdx }));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 cursor-pointer transition-all z-10 border-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            
                            {/* Slide dots */}
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 z-10">
                              {imgList.map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                                    (activeImageIndexes[house.id] || 0) === idx ? 'bg-white w-3' : 'bg-white/50'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {/* Floating Top Left Badges */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                          {house.type && house.type.trim() && (
                            <span className="bg-teal-600 text-white font-extrabold text-[9px] px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm">
                              {house.type}
                            </span>
                          )}
                          {roomsArray.length > 1 ? (
                            <span className="bg-slate-900/85 text-white font-extrabold text-[9px] px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm">
                              {roomsArray.length} Room Categories
                            </span>
                          ) : (
                            roomsArray[0]?.roomType && (
                              <span className="bg-slate-900/85 text-white font-extrabold text-[9px] px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm">
                                {roomsArray[0].roomType}
                              </span>
                            )
                          )}
                        </div>

                        {/* Floating Top Right Availability Badge */}
                        <span className={`absolute top-4 right-4 bg-white/95 backdrop-blur-sm font-extrabold text-[10px] px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md ${
                          sumAvailableRooms > 0 ? 'text-emerald-600 border border-emerald-100' : 'text-rose-600 border border-rose-100'
                        }`}>
                          {sumAvailableRooms > 0 ? 'Available' : 'Booked'}
                        </span>

                        {/* Pulsing Play Button overlay if video is available */}
                        {vidList.length > 0 && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActiveVideoUrl(vidList[0]);
                            }}
                            className="absolute inset-0 m-auto h-12 w-12 bg-white hover:bg-teal-50 text-teal-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border-0 group/play"
                          >
                            <svg className="h-5 w-5 fill-current ml-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="p-6 space-y-4">
                        {/* Title and Price */}
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="text-lg font-black text-slate-955 capitalize tracking-tight leading-tight line-clamp-1">
                              {house.title}
                            </h3>
                            <div className="text-right shrink-0">
                              <span className="text-lg font-black text-teal-600 block">
                                {displayRent}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">per month</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-semibold">
                            <MapPin className="h-4 w-4 text-teal-500 shrink-0" />
                            <span className="line-clamp-1">{house.address || `${house.city_name}, ${house.country_name}`}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {house.description}
                        </p>

                        {/* Redesigned Visual Specs widget */}
                        <div className="grid grid-cols-3 gap-2.5 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                          <div className="flex flex-col items-center justify-center p-1">
                            <Users className="h-4 w-4 text-teal-600 mb-1" />
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Max Occupancy</span>
                            <span className="text-[10px] font-extrabold text-slate-800 mt-0.5">
                              {displayOccupancy}
                            </span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-1 border-x border-slate-200/50">
                            <Compass className="h-4 w-4 text-teal-650 mb-1" />
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Gender Allowed</span>
                            <span className="text-[10px] font-extrabold text-slate-800 mt-0.5">
                              {displayGender}
                            </span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-1">
                            <Building className="h-4 w-4 text-yellow-600 mb-1" />
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Rooms</span>
                            <span className="text-[10px] font-extrabold text-slate-800 mt-0.5">
                              {sumTotalRooms} Rooms
                            </span>
                          </div>
                        </div>

                        {/* Facilities / Amenities */}
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Amenities</span>
                          <div className="flex flex-wrap gap-1.5">
                            {house.facilities.map(facility => (
                              <span key={facility} className="text-[9px] bg-slate-50 border border-slate-200/65 text-slate-650 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors">
                                {facility}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Phone & Website links */}
                        {(house.mobile_number || house.website) && (
                          <div className="flex gap-2 pt-1">
                            {house.mobile_number && (
                              <a
                                href={`tel:${house.mobile_number}`}
                                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold rounded-xl text-[10px] flex items-center justify-center gap-1 transition-all uppercase tracking-wider text-center"
                              >
                                Phone: {house.mobile_number}
                              </a>
                            )}
                            {house.website && (
                              <a
                                href={house.website.startsWith('http') ? house.website : `https://${house.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-teal-600 font-extrabold rounded-xl text-[10px] flex items-center justify-center gap-1 transition-all uppercase tracking-wider text-center"
                              >
                                Visit Website
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proximity and action footer */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4 rounded-b-3xl">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-450" />
                          <span>Univ. Distance: <span className="font-extrabold text-slate-800">{house.distance_to_univ}</span></span>
                        </span>
                        {house.commute_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-450" />
                            <span>Commute: <span className="font-extrabold text-slate-800">{house.commute_time}</span></span>
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        {house.rating ? (
                          <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            <span className="font-extrabold">{house.rating}</span>
                            <span className="text-slate-450 font-bold">({house.review_count} reviews)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                            <Star className="h-3.5 w-3.5 fill-slate-350 text-slate-350" />
                            <span className="font-extrabold">4.5</span>
                            <span className="text-slate-450 font-bold">(12 reviews)</span>
                          </div>
                        )}

                        {activeBooking ? (
                          house.id === activeBooking.accommodation_id ? (
                            <a
                              href="/student/dashboard"
                              className="px-5 py-2.5 bg-emerald-50 border border-emerald-250 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-600 font-extrabold" />
                              <span>Booked (Active)</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="px-5 py-2.5 bg-slate-150 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-not-allowed"
                            >
                              Booking Blocked (Limit 1)
                            </button>
                          )
                        ) : house.availability ? (
                          <button
                            onClick={() => handleBookAccommodation(house)}
                            disabled={bookingStatus[house.id] === 'booking' || bookingStatus[house.id] === 'success'}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] ${
                              bookingStatus[house.id] === 'success'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : bookingStatus[house.id] === 'booking'
                                  ? 'bg-slate-100 text-slate-400'
                                  : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md hover:shadow-lg'
                            }`}
                          >
                            {bookingStatus[house.id] === 'booking' && (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Booking...</span>
                              </>
                            )}
                            {bookingStatus[house.id] === 'success' && (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Booked!</span>
                              </>
                            )}
                            {bookingStatus[house.id] !== 'booking' && bookingStatus[house.id] !== 'success' && (
                              <span>Book Room</span>
                            )}
                          </button>
                        ) : (
                          <span className="px-5 py-2.5 bg-slate-150 border border-slate-200 text-slate-450 font-black rounded-xl text-xs uppercase tracking-wider text-center cursor-not-allowed">
                            Fully Booked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Multi-Step Booking Confirmation Modal */}
      {bookingHouse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5 animate-[scaleIn_0.2s_ease-out] text-slate-800">
            
            {/* Modal Header with steps */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <Building className="h-5 w-5 text-teal-650" />
                  <span>Stay Booking Wizard</span>
                </h3>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Step {bookingStep} of 3</span>
              </div>
              <button 
                onClick={() => { setBookingHouse(null); setErrorMessage(null); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-pulse">
                <span>⚠️ {errorMessage}</span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="p-0.5 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Step 1: Stay Dates & Occupancy Selection */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stay Selected</span>
                  <span className="text-sm font-extrabold text-slate-900 block capitalize">{bookingHouse.title}</span>
                  <span className="text-[11px] text-slate-505 font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{bookingHouse.address || `${bookingHouse.city_name}, ${bookingHouse.country_name}`}</span>
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 text-[11px] font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-650" />
                  <span>Rooms Available: <strong className="font-extrabold text-slate-900">{selectedRoom.available_rooms !== undefined && selectedRoom.available_rooms !== null ? selectedRoom.available_rooms : 1} Rooms left</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-in Date</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-teal-bright"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Check-out Date</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-teal-bright"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Room Configuration Type</label>
                  {roomsArray.length > 1 ? (
                    <select
                      value={selectedRoomType}
                      onChange={(e) => {
                        setSelectedRoomType(e.target.value);
                        setGuests(1);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-850 rounded-xl p-3 text-xs font-bold capitalize focus:outline-none focus:border-teal-bright cursor-pointer"
                    >
                      {roomsArray.map((r: any) => (
                        <option key={r.roomType} value={r.roomType}>
                          {r.roomType} - {formatPrice(r.rent, bookingHouse.country_currency || 'USD')} / month ({r.available_rooms} left)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs font-bold capitalize flex items-center justify-between">
                      <span>{selectedRoom.roomType || 'Standard Room'}</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-150 font-extrabold uppercase">Listed Option</span>
                    </div>
                  )}
                  <span className="text-[9px] text-slate-400 block mt-1 leading-relaxed">
                    ℹ️ Please choose your preferred room configuration type from the listing.
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Number of Guests</label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-850 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-teal-bright cursor-pointer"
                  >
                    {Array.from({ length: selectedRoom.occupancy || 2 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setBookingStep(2)}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform border-0 cursor-pointer"
                  >
                    Next: Student Info
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Passenger Info & Document Verification */}
            {bookingStep === 2 && (
              <div className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Passenger Name</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Full name as written on Passport"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-teal-bright"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                    <input
                      type="tel"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-teal-bright"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      value={passengerEmail}
                      onChange={(e) => setPassengerEmail(e.target.value)}
                      placeholder="student@nexora.com"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-teal-bright"
                      required
                    />
                  </div>
                </div>

                {/* Simulated Document Upload */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Upload Identification Document (Visa/Passport copy)</label>
                  <div className="relative border border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50 cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={docUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDocUploading(true);
                          setUploadedDocName(file.name);
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await uploadDocument(formData);
                            if (res.success && res.url) {
                              setUploadedDocUrl(res.url);
                            } else {
                              setErrorMessage(res.error || 'Failed to upload document.');
                              setUploadedDocName('');
                              setUploadedDocUrl('');
                            }
                          } catch (err) {
                            console.error('Upload error:', err);
                            setErrorMessage('Failed to upload document.');
                            setUploadedDocName('');
                            setUploadedDocUrl('');
                          } finally {
                            setDocUploading(false);
                          }
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-500 truncate max-w-[200px]">
                        {uploadedDocName ? uploadedDocName : 'Click to select and upload copy'}
                      </span>
                    </div>
                    {docUploading ? (
                      <span className="text-[9px] font-black text-teal-650 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded uppercase shrink-0 animate-pulse">
                        Uploading...
                      </span>
                    ) : uploadedDocName ? (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase shrink-0">
                        Uploaded
                      </span>
                    ) : (
                      <Upload className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">Please provide visa or passport verification copies to expedite provider approval review.</p>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3.5">
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer bg-transparent"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!passengerName || !passengerPhone || !passengerEmail || docUploading}
                    onClick={() => setBookingStep(3)}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform border-0 cursor-pointer disabled:opacity-50"
                  >
                    Next: Review Invoice
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review Invoice Details */}
            {bookingStep === 3 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2 text-xs font-semibold text-slate-600">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stay Rental Invoice</span>
                  <div className="flex justify-between">
                    <span>Monthly stay cost:</span>
                    <span className="text-slate-900 font-extrabold">{formatPrice(Number(selectedRoom.rent), bookingHouse.country_currency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calculated Stay duration:</span>
                    <span className="text-slate-900 font-extrabold">
                      {(() => {
                        const start = new Date(checkIn);
                        const end = new Date(checkOut);
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                        const months = Math.max(1, Math.round(diffDays / 30));
                        return `${months} Month${months > 1 ? 's' : ''} (${diffDays} days)`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Room type selected:</span>
                    <span className="text-slate-900 font-extrabold capitalize">{selectedRoomType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verification Document:</span>
                    <span className="text-slate-900 font-extrabold truncate max-w-[150px]">{uploadedDocName || 'passport_copy.pdf'}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900 uppercase tracking-tight">
                    <span>Total Deposit Due:</span>
                    <span className="text-teal-650 text-base font-black">
                      {(() => {
                        const start = new Date(checkIn);
                        const end = new Date(checkOut);
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                        const months = Math.max(1, Math.round(diffDays / 30));
                        return formatPrice(Number(selectedRoom.rent) * months, bookingHouse.country_currency || 'USD');
                      })()}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-[10.5px] font-semibold">
                  <span>Note: Submission registers the request as <strong className="text-slate-900 font-black">Pending Provider Approval</strong>. Once the provider reviews and approves, your dashboard will display a simulated payment button to pay your deposit.</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3.5">
                  <button
                    type="button"
                    onClick={() => setBookingStep(2)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer bg-transparent"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmRealTimeBooking}
                    disabled={bookingStatus[bookingHouse.id] === 'booking'}
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform border-0 cursor-pointer disabled:opacity-50"
                  >
                    {bookingStatus[bookingHouse.id] === 'booking' ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </span>
                    ) : (
                      <span>Submit Request</span>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Property Tour Video Player Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-4 max-w-3xl w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2.5">
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Building className="h-5 w-5 text-teal-650" />
                <span>Property Video Tour</span>
              </h3>
              <button 
                onClick={() => setActiveVideoUrl(null)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer font-bold border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black">
              <video 
                src={activeVideoUrl} 
                controls 
                autoPlay
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
