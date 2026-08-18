'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building, Plane, ShieldCheck, MapPin, Landmark, Trash2, Edit, Plus, X, 
  Clock, DollarSign, Loader2, Sparkles, LayoutDashboard, CheckCircle2, 
  AlertTriangle, MessageSquare, Users, Check, FileText, Star
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { 
  getBusinessDashboardData, 
  saveAccommodation, 
  deleteAccommodation, 
  saveVisa, 
  deleteVisa, 
  saveFlight, 
  deleteFlight 
} from '@/app/actions/business';
import { 
  getBusinessProfile, 
  getTravelPackages, 
  saveTravelPackage, 
  deleteTravelPackage, 
  getBusinessInquiries, 
  respondToInquiry,
  getMyPartnerRegistration,
  submitBusinessRegistration,
  getBusinessRoomBookings,
  getBusinessFlightBookings,
  updateRoomBookingStatus,
  updateFlightBookingStatus,
  sendPassengerNotification
} from '@/app/actions/businessActions';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie
} from 'recharts';

const COLORS = ['#0d9488', '#06b6d4', '#10b981', '#fbbf24', '#f87171'];

export default function BusinessDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'accommodations' | 'visas' | 'flights' | 'packages' | 'inquiries' | 'bookings'>('overview');
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // Bookings list states
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [flightBookings, setFlightBookings] = useState<any[]>([]);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // Onboarding Form States
  const [regEntityName, setRegEntityName] = useState('');
  const [regCategory, setRegCategory] = useState<'travel_agency' | 'accommodation' | 'loan_provider' | 'visa_consultancy'>('accommodation');
  const [regLicenseNumber, setRegLicenseNumber] = useState('');
  const [regDocPath, setRegDocPath] = useState('');
  const [regDocName, setRegDocName] = useState('');
  const [regContactNumber, setRegContactNumber] = useState('');

  // Business specific states
  const [packages, setPackages] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);

  // Modal open states
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [isVisaModalOpen, setIsVisaModalOpen] = useState(false);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

  // Edit target states
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
  const [selectedVisaId, setSelectedVisaId] = useState<number | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [selectedPkgId, setSelectedPkgId] = useState<number | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);

  // Accommodation Form state
  const [houseTitle, setHouseTitle] = useState('');
  const [houseCountryId, setHouseCountryId] = useState(0);
  const [houseCityName, setHouseCityName] = useState('');
  const [houseType, setHouseType] = useState('Hostel');
  const [houseRent, setHouseRent] = useState(500);
  const [houseDistance, setHouseDistance] = useState('');
  const [houseAvailability, setHouseAvailability] = useState(true);
  const [houseFacilities, setHouseFacilities] = useState('');
  const [houseDesc, setHouseDesc] = useState('');
  
  // Extended fields states
  const [houseMobile, setHouseMobile] = useState('');
  const [houseWebsite, setHouseWebsite] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [houseTotalRooms, setHouseTotalRooms] = useState(1);
  const [roomType, setRoomType] = useState('Single');
  const [roomOccupancy, setRoomOccupancy] = useState(1);
  const [roomGender, setRoomGender] = useState('Mixed');
  const [houseImages, setHouseImages] = useState('');
  const [houseVideos, setHouseVideos] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);

  // Async Upload States & Handlers
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVid, setUploadingVid] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImg(true);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        const current = houseImages.split(',').map(u => u.trim()).filter(Boolean);
        current.push(data.url);
        setHouseImages(current.join(', '));
      } else {
        alert(data.error || 'Failed to upload image.');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error uploading image.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingVid(true);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        const current = houseVideos.split(',').map(u => u.trim()).filter(Boolean);
        current.push(data.url);
        setHouseVideos(current.join(', '));
      } else {
        alert(data.error || 'Failed to upload video.');
      }
    } catch (err) {
      console.error('Error uploading video:', err);
      alert('Error uploading video.');
    } finally {
      setUploadingVid(false);
    }
  };

  const removeUploadedImage = (urlToRemove: string) => {
    const current = houseImages.split(',').map(u => u.trim()).filter(Boolean);
    const updated = current.filter(url => url !== urlToRemove);
    setHouseImages(updated.join(', '));
  };

  const removeUploadedVideo = (urlToRemove: string) => {
    const current = houseVideos.split(',').map(u => u.trim()).filter(Boolean);
    const updated = current.filter(url => url !== urlToRemove);
    setHouseVideos(updated.join(', '));
  };

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

  // Travel Package Form state
  const [pkgDestCountryId, setPkgDestCountryId] = useState(0);
  const [pkgDeptCountryId, setPkgDeptCountryId] = useState(0);
  const [pkgFlightInfo, setPkgFlightInfo] = useState('');
  const [pkgTicketCost, setPkgTicketCost] = useState(800);
  const [pkgHasInsurance, setPkgHasInsurance] = useState(true);
  const [pkgHasPickup, setPkgHasPickup] = useState(true);
  const [pkgVisaAssistance, setPkgVisaAssistance] = useState(false);
  const [pkgSeats, setPkgSeats] = useState(30);
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgContactEmail, setPkgContactEmail] = useState('');
  const [pkgContactPhone, setPkgContactPhone] = useState('');
  const [pkgRowsCount, setPkgRowsCount] = useState(15);
  const [pkgColsCount, setPkgColsCount] = useState(6);
  const [pkgBusinessRows, setPkgBusinessRows] = useState('1-2');
  const [pkgPremiumRows, setPkgPremiumRows] = useState('3-4');
  const [pkgEconomyRows, setPkgEconomyRows] = useState('5-15');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingLogo(true);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setAirlineLogo(data.url);
      } else {
        alert(data.error || 'Failed to upload logo.');
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      alert('Error uploading logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Rich Flight specifications form states
  const [airlineName, setAirlineName] = useState('Lufthansa');
  const [airlineLogo, setAirlineLogo] = useState('https://logo.clearbit.com/lufthansa.com');
  const [flightNumber, setFlightNumber] = useState('LH763');
  const [aircraftModel, setAircraftModel] = useState('Airbus A350-900');
  const [deptCity, setDeptCity] = useState('New Delhi');
  const [deptAirport, setDeptAirport] = useState('Indira Gandhi Intl (DEL)');
  const [destCity, setDestCity] = useState('Munich');
  const [destAirport, setDestAirport] = useState('Munich Airport (MUC)');
  const [depDate, setDepDate] = useState('2026-08-15');
  const [depTime, setDepTime] = useState('08:30');
  const [arrDate, setArrDate] = useState('2026-08-15');
  const [arrTime, setArrTime] = useState('14:20');
  const [duration, setDuration] = useState('8h 20m');
  const [timeZone, setTimeZone] = useState('GMT+2');
  const [transitType, setTransitType] = useState('direct');
  const [transitAirport, setTransitAirport] = useState('');
  const [transitDuration, setTransitDuration] = useState('');
  const [cabinBag, setCabinBag] = useState('7kg');
  const [checkinBag, setCheckinBag] = useState('40kg (Student Special)');
  const [extraBaggageCharges, setExtraBaggageCharges] = useState('$15/kg');

  // Passenger notifications & messages states
  const [notifBookingId, setNotifBookingId] = useState<number | null>(null);
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Inquiry Response state
  const [selectedInquiryText, setSelectedInquiryText] = useState('');
  const [inquiryReply, setInquiryReply] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Fetch Dashboard collections
  const loadData = async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user || (user.role !== 'business' && user.role !== 'platform_admin')) {
      router.push('/auth');
      return;
    }
    setUser(user);

    const businessData = await getBusinessDashboardData();
    if (businessData) {
      setData(businessData);
      
      // Select first country by default in forms
      if (businessData.countries.length > 0) {
        setHouseCountryId(businessData.countries[0].id);
        setVisaCountryId(businessData.countries[0].id);
        setFlightDestId(businessData.countries[0].id);
        setPkgDestCountryId(businessData.countries[0].id);
        setPkgDeptCountryId(businessData.countries[0].id);
      }
    }

    // Load business specific configuration
    if (user.role === 'business') {
      const bProf = await getBusinessProfile();
      if (bProf) {
        setProfile(bProf);
        
        // Fetch packages
        const pkgs = await getTravelPackages(bProf.id);
        setPackages(pkgs || []);
        
        // Fetch inquiries
        const inqs = await getBusinessInquiries(bProf.id);
        setInquiries(inqs || []);

        // Fetch bookings
        if (bProf.category === 'accommodation') {
          const rooms = await getBusinessRoomBookings(bProf.id);
          setRoomBookings(rooms || []);
        } else if (bProf.category === 'travel_agency') {
          const travels = await getBusinessFlightBookings(bProf.id);
          setFlightBookings(travels || []);
        }

        // Route default tab appropriately
        if (bProf.category === 'travel_agency') {
          setActiveTab('packages');
        } else {
          setActiveTab('accommodations');
        }
      } else {
        const reg = await getMyPartnerRegistration();
        setRegistration(reg);
      }
    } else {
      // Platform admin can see overview
      setActiveTab('overview');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEntityName || !regLicenseNumber || !regDocPath || !regContactNumber) {
      alert('Please fill out all required fields.');
      return;
    }
    setSubmitting(true);
    const res = await submitBusinessRegistration({
      entityName: regEntityName,
      category: regCategory,
      licenseNumber: regLicenseNumber,
      businessLicense: regDocPath,
      contactNumber: regContactNumber
    });
    if (res.success) {
      alert('Onboarding documents submitted successfully! Our administrators will review them.');
      loadData();
    } else {
      alert(res.error || 'Failed to submit onboarding request.');
    }
    setSubmitting(false);
  };

  // Handle Save Accommodation
  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const facilitiesArray = houseFacilities.split(',').map(f => f.trim()).filter(Boolean);
    const imagesArray = houseImages.split(',').map(img => img.trim()).filter(Boolean);
    const videosArray = houseVideos.split(',').map(vid => vid.trim()).filter(Boolean);

    // Calculate listing properties based on rooms array
    const minRent = rooms.length > 0 
      ? Math.min(...rooms.map(r => Number(r.rent || 0))) 
      : 500;
    const sumTotalRooms = rooms.length > 0 
      ? rooms.reduce((sum, r) => sum + Number(r.total_rooms || 0), 0) 
      : 1;

    const res = await saveAccommodation({
      id: selectedHouseId || undefined,
      countryId: Number(houseCountryId),
      cityName: houseCityName,
      type: houseType,
      rent: minRent,
      distanceToUniv: houseDistance,
      availability: houseAvailability,
      facilities: facilitiesArray,
      title: houseTitle,
      description: houseDesc,
      address: houseAddress,
      mobileNumber: houseMobile,
      website: houseWebsite,
      totalRooms: sumTotalRooms,
      roomInfoJson: rooms,
      images: imagesArray,
      videos: videosArray
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

  const handleUpdateRoomBookingStatus = async (bookingId: number, newStatus: 'approved' | 'rejected') => {
    setUpdatingStatusId(bookingId);
    try {
      const res = await updateRoomBookingStatus(bookingId, newStatus);
      if (res.success) {
        alert(`Booking status successfully updated to ${newStatus}.`);
        if (profile) {
          const rooms = await getBusinessRoomBookings(profile.id);
          setRoomBookings(rooms || []);
        }
      } else {
        alert(res.error || 'Failed to update booking status.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleUpdateFlightBookingStatus = async (bookingId: number, newStatus: 'approved' | 'rejected') => {
    setUpdatingStatusId(bookingId);
    try {
      const res = await updateFlightBookingStatus(bookingId, newStatus);
      if (res.success) {
        alert(`Flight booking status successfully updated to ${newStatus}.`);
        if (profile) {
          const travels = await getBusinessFlightBookings(profile.id);
          setFlightBookings(travels || []);
        }
      } else {
        alert(res.error || 'Failed to update flight booking status.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatusId(null);
    }
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

  const updateRoomsAndSync = (newRooms: any[]) => {
    setRooms(newRooms);
    
    // Sum total rooms
    const total = newRooms.reduce((sum, r) => sum + Number(r.total_rooms || 0), 0);
    setHouseTotalRooms(total);
    
    // Find min rent
    if (newRooms.length > 0) {
      const minRent = Math.min(...newRooms.map(r => Number(r.rent || 0)));
      setHouseRent(minRent);
    }
  };

  const resetHouseForm = () => {
    setSelectedHouseId(null);
    setHouseTitle('');
    setHouseCityName('');
    setHouseType('Hostel');
    setHouseRent(500);
    setHouseDistance('');
    setHouseAvailability(true);
    setHouseFacilities('');
    setHouseDesc('');
    setHouseMobile('');
    setHouseWebsite('');
    setHouseAddress('');
    setHouseTotalRooms(1);
    setRoomType('Single');
    setRoomOccupancy(1);
    setRoomGender('Mixed');
    setRooms([{ roomType: 'Single Room', occupancy: 1, gender: 'Mixed', rent: 500, total_rooms: 1, available_rooms: 1 }]);
    setHouseImages('');
    setHouseVideos('');
  };

  const openEditHouse = (house: any) => {
    setSelectedHouseId(house.id);
    setHouseTitle(house.title);
    setHouseCountryId(house.country_id);
    setHouseCityName(house.city_name);
    setHouseType(house.type);
    setHouseRent(Number(house.rent));
    setHouseDistance(house.distance_to_univ || '');
    setHouseAvailability(house.availability);
    setHouseFacilities(house.facilities ? house.facilities.join(', ') : '');
    setHouseDesc(house.description || '');
    setHouseMobile(house.mobile_number || '');
    setHouseWebsite(house.website || '');
    setHouseAddress(house.address || '');
    setHouseTotalRooms(Number(house.total_rooms) || 1);
    
    let parsedRooms = [];
    try {
      parsedRooms = typeof house.room_info_json === 'string'
        ? JSON.parse(house.room_info_json)
        : (house.room_info_json || []);
    } catch (e) {
      parsedRooms = [];
    }

    if (!Array.isArray(parsedRooms)) {
      // Legacy wrapper
      parsedRooms = [{
        roomType: parsedRooms.roomType || 'Single Room',
        occupancy: Number(parsedRooms.occupancy) || 1,
        gender: parsedRooms.gender || 'Mixed',
        rent: Number(house.rent) || 500,
        total_rooms: Number(house.total_rooms) || 1,
        available_rooms: house.available_rooms !== null ? Number(house.available_rooms) : 1
      }];
    }
    
    setRooms(parsedRooms);
    setRoomType(parsedRooms[0]?.roomType || 'Single');
    setRoomOccupancy(Number(parsedRooms[0]?.occupancy) || 1);
    setRoomGender(parsedRooms[0]?.gender || 'Mixed');
    
    setHouseImages(house.images ? house.images.join(', ') : '');
    setHouseVideos(house.videos ? house.videos.join(', ') : '');
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

  // Handle Save Flight (Admins views)
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

  // Handle Save Travel Package (Flight Travel Agency users)
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    const flightDetailsObj = {
      airline_name: airlineName,
      airline_logo: airlineLogo,
      flight_number: flightNumber,
      aircraft_model: aircraftModel,
      cabin_classes: ['Economy', 'Premium Economy', 'Business'],
      route: {
        departure_country: data?.countries.find((c: any) => c.id === Number(pkgDeptCountryId))?.name || 'India',
        departure_city: deptCity,
        departure_airport: deptAirport,
        destination_country: data?.countries.find((c: any) => c.id === Number(pkgDestCountryId))?.name || 'Germany',
        destination_city: destCity,
        destination_airport: destAirport
      },
      schedule: {
        departure_date: depDate,
        departure_time: depTime,
        arrival_date: arrDate,
        arrival_time: arrTime,
        flight_duration: duration,
        time_zone: timeZone
      },
      ticket_details: {
        prices: {
          'Economy': Number(pkgTicketCost),
          'Premium Economy': Number(pkgTicketCost) * 1.4,
          'Business': Number(pkgTicketCost) * 2.5
        },
        currency: 'USD',
        taxes_included: true,
        booking_fee: 25.00
      },
      seats: {
        total_seats: Number(pkgSeats),
        available_seats: Number(pkgSeats),
        seat_layout: '3-3-3',
        rows_count: Number(pkgRowsCount),
        columns_count: Number(pkgColsCount),
        business_rows: pkgBusinessRows.trim(),
        premium_rows: pkgPremiumRows.trim(),
        economy_rows: pkgEconomyRows.trim(),
        window_seats: Math.max(1, Math.floor(Number(pkgSeats) / 3)),
        aisle_seats: Math.max(1, Math.floor(Number(pkgSeats) / 3))
      },
      baggage: {
        cabin_baggage: cabinBag,
        check_in_baggage: checkinBag,
        extra_baggage_charges: extraBaggageCharges
      },
      transit: {
        transit_type: transitType,
        transit_airport: transitAirport,
        transit_duration: transitDuration
      },
      requirements: {
        passport_required: true,
        student_visa_required: true,
        visa_type: 'Student Visa (Subclass 500)',
        visa_validity: 'Duration of Course',
        immigration_docs: 'Enrollment Confirmation, Passport, Visa',
        vaccination_reqs: 'COVID-19 Full Dose',
        insurance_required: pkgHasInsurance,
        health_declaration_required: true
      }
    };

    if (!airlineLogo) {
      alert('Please upload an airline logo.');
      setSubmitting(false);
      return;
    }

    const res = await saveTravelPackage({
      id: selectedPkgId || undefined,
      businessId: profile.id,
      destinationCountryId: Number(pkgDestCountryId),
      departureCountryId: Number(pkgDeptCountryId),
      flightInfo: pkgFlightInfo,
      ticketCost: Number(pkgTicketCost),
      hasInsurance: pkgHasInsurance,
      hasAirportPickup: pkgHasPickup,
      visaAssistance: pkgVisaAssistance,
      description: pkgDesc,
      availableSeats: Number(pkgSeats),
      contactInfo: `Email: ${pkgContactEmail.trim()} | Phone: ${pkgContactPhone.trim()}`,
      flightDetails: flightDetailsObj
    });

    if (res.success) {
      setIsPkgModalOpen(false);
      resetPkgForm();
      loadData();
    } else {
      alert(res.error || 'Failed to save travel package.');
    }
    setSubmitting(false);
  };

  // Handle Delete Travel Package
  const handleDeletePackage = async (id: number) => {
    if (!confirm('Are you sure you want to remove this flight travel package?')) return;
    if (!profile) return;
    const res = await deleteTravelPackage(id, profile.id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to delete travel package.');
    }
  };

  const handleSendNotification = async () => {
    if (!notifBookingId || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      const res = await sendPassengerNotification(notifBookingId, notifMessage.trim());
      if (res.success) {
        alert('Notification successfully broadcasted to student!');
        setNotifBookingId(null);
        setNotifMessage('');
        loadData();
      } else {
        alert(res.error || 'Failed to send notification.');
      }
    } catch (err) {
      console.error(err);
      alert('Error broadcasting notification.');
    } finally {
      setSendingNotif(false);
    }
  };


  const resetPkgForm = () => {
    setSelectedPkgId(null);
    setPkgFlightInfo('');
    setPkgTicketCost(800);
    setPkgHasInsurance(true);
    setPkgHasPickup(true);
    setPkgVisaAssistance(false);
    setPkgSeats(30);
    setPkgDesc('');
    setPkgContactEmail(profile?.contact_info?.email || '');
    setPkgContactPhone(profile?.contact_info?.phone || '');
    setPkgRowsCount(15);
    setPkgColsCount(6);
    setPkgBusinessRows('1-2');
    setPkgPremiumRows('3-4');
    setPkgEconomyRows('5-15');

    // Reset rich details
    setAirlineName('Lufthansa');
    setAirlineLogo('https://logo.clearbit.com/lufthansa.com');
    setFlightNumber('LH763');
    setAircraftModel('Airbus A350-900');
    setDeptCity('New Delhi');
    setDeptAirport('Indira Gandhi Intl (DEL)');
    setDestCity('Munich');
    setDestAirport('Munich Airport (MUC)');
    setDepDate('2026-08-15');
    setDepTime('08:30');
    setArrDate('2026-08-15');
    setArrTime('14:20');
    setDuration('8h 20m');
    setTimeZone('GMT+2');
    setTransitType('direct');
    setTransitAirport('');
    setTransitDuration('');
    setCabinBag('7kg');
    setCheckinBag('40kg (Student Special)');
    setExtraBaggageCharges('$15/kg');
  };

  const openEditPkg = (pkg: any) => {
    setSelectedPkgId(pkg.id);
    setPkgDestCountryId(pkg.destination_country_id);
    setPkgDeptCountryId(pkg.departure_country_id || data?.countries[0]?.id || 0);
    setPkgFlightInfo(pkg.flight_info);
    setPkgTicketCost(Number(pkg.ticket_cost));
    setPkgHasInsurance(pkg.has_insurance);
    setPkgHasPickup(pkg.has_airport_pickup);
    setPkgVisaAssistance(pkg.visa_assistance);
    setPkgSeats(Number(pkg.available_seats));
    setPkgDesc(pkg.description || '');
    
    const rawContact = pkg.contact_info || '';
    let email = '';
    let phone = '';
    if (rawContact.includes(' | ')) {
      const parts = rawContact.split(' | ');
      for (const part of parts) {
        if (part.startsWith('Email: ')) {
          email = part.replace('Email: ', '');
        } else if (part.startsWith('Phone: ')) {
          phone = part.replace('Phone: ', '');
        }
      }
    } else {
      if (rawContact.includes('@')) {
        email = rawContact;
      } else {
        phone = rawContact;
      }
    }
    setPkgContactEmail(email);
    setPkgContactPhone(phone);

    // load rich flight details
    const fd = pkg.flight_details ? (typeof pkg.flight_details === 'string' ? JSON.parse(pkg.flight_details) : pkg.flight_details) : null;
    if (fd) {
      setAirlineName(fd.airline_name || 'Lufthansa');
      setAirlineLogo(fd.airline_logo || 'https://logo.clearbit.com/lufthansa.com');
      setFlightNumber(fd.flight_number || 'LH763');
      setAircraftModel(fd.aircraft_model || 'Airbus A350-900');
      setDeptCity(fd.route?.departure_city || 'New Delhi');
      setDeptAirport(fd.route?.departure_airport || 'Indira Gandhi Intl (DEL)');
      setDestCity(fd.route?.destination_city || 'Munich');
      setDestAirport(fd.route?.destination_airport || 'Munich Airport (MUC)');
      setDepDate(fd.schedule?.departure_date || '2026-08-15');
      setDepTime(fd.schedule?.departure_time || '08:30');
      setArrDate(fd.schedule?.arrival_date || '2026-08-15');
      setArrTime(fd.schedule?.arrival_time || '14:20');
      setDuration(fd.schedule?.flight_duration || '8h 20m');
      setTimeZone(fd.schedule?.time_zone || 'GMT+2');
      setTransitType(fd.transit?.transit_type || 'direct');
      setTransitAirport(fd.transit?.transit_airport || '');
      setTransitDuration(fd.transit?.transit_duration || '');
      setCabinBag(fd.baggage?.cabin_baggage || '7kg');
      setCheckinBag(fd.baggage?.check_in_baggage || '40kg (Student Special)');
      setExtraBaggageCharges(fd.baggage?.extra_baggage_charges || '$15/kg');
      
      const seatsConf = fd.seats || {};
      setPkgRowsCount(Number(seatsConf.rows_count || 15));
      setPkgColsCount(Number(seatsConf.columns_count || 6));
      setPkgBusinessRows(seatsConf.business_rows || "1-2");
      setPkgPremiumRows(seatsConf.premium_rows || "3-4");
      setPkgEconomyRows(seatsConf.economy_rows || "5-15");
    }

    setIsPkgModalOpen(true);
  };

  // Handle Inquiry reply submit
  const handleSendInquiryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiryId) return;
    setSubmitting(true);

    const res = await respondToInquiry(selectedInquiryId, inquiryReply);
    if (res.success) {
      setIsInquiryModalOpen(false);
      setInquiryReply('');
      loadData();
    } else {
      alert(res.error || 'Failed to save response.');
    }
    setSubmitting(false);
  };

  const openInquiryReply = (inq: any) => {
    setSelectedInquiryId(inq.id);
    setSelectedInquiryText(inq.message);
    setInquiryReply(inq.response || '');
    setIsInquiryModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
        <p className="text-sm text-white/60">Loading business operations center...</p>
      </div>
    );
  }

  const isBusinessUser = user?.role === 'business';
  const hasNoProfile = !profile;

  if (isBusinessUser && hasNoProfile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-slate-900 space-y-8 animate-[fadeIn_0.4s_ease-out]">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 bg-teal-50 border border-teal-200 text-teal-dark rounded-2xl">
            <Building className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Business Partner Onboarding</h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto font-medium">
            Become a verified Nexora partner to publish listings and connect with international students.
          </p>
        </div>

        {registration?.status === 'pending' ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6 shadow-xl">
            <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900">Verification Request Pending</h2>
              <p className="text-slate-600 text-xs font-semibold leading-relaxed max-w-md mx-auto">
                Thank you for submitting your business verification details for <strong className="text-slate-900">{registration.entity_name}</strong>. 
                Our platform administrators are currently auditing your business documents and license numbers. 
                You will receive full dashboard access once verified.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-600 text-left space-y-1.5 max-w-md mx-auto font-semibold">
              <div><strong>Business Entity:</strong> {registration.entity_name}</div>
              <div><strong>Category:</strong> {registration.category === 'travel_agency' ? 'Travel Agency & Flights' : 'Accommodation Agency'}</div>
              <div><strong>Submitted:</strong> {new Date(registration.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
            <h2 className="text-md font-bold border-b border-slate-100 pb-3 flex items-center gap-2 text-slate-900">
              <Sparkles className="h-5 w-5 text-teal-dark" />
              <span>Submit Verification Details</span>
            </h2>

            {registration?.status === 'rejected' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3 text-rose-700 text-xs">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <strong className="block font-bold">Previous Submission Rejected</strong>
                  <span className="text-[11px] text-rose-600">Your previous verification request was rejected. Please review your details and submit valid documentation.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleOnboardingSubmit} className="space-y-5 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-slate-600 mb-1.5">Business Entity Name</label>
                  <input
                    type="text"
                    required
                    value={regEntityName}
                    onChange={(e) => setRegEntityName(e.target.value)}
                    placeholder="e.g. Sunrise Accommodations Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-bright text-slate-800 text-xs placeholder:text-slate-400 hover:border-slate-350 hover:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5">Service Category</label>
                                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-bright text-slate-800 text-xs cursor-pointer hover:border-slate-350 hover:bg-white transition-colors"
                  >
                    <option value="accommodation">Accommodation Agency</option>
                    <option value="travel_agency">Travel Agency / Flights</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1.5">Business License / Registration Number</label>
                <input
                  type="text"
                  required
                  value={regLicenseNumber}
                  onChange={(e) => setRegLicenseNumber(e.target.value)}
                  placeholder="e.g. LIC-2026-X89B1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-bright text-slate-800 text-xs placeholder:text-slate-400 hover:border-slate-350 hover:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1.5">Business Contact Number</label>
                <input
                  type="tel"
                  required
                  value={regContactNumber}
                  onChange={(e) => setRegContactNumber(e.target.value)}
                  placeholder="e.g. +1 555-0199 or +91 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-bright text-slate-800 text-xs placeholder:text-slate-400 hover:border-slate-350 hover:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-650 mb-1.5">Verification Document / License File</label>
                <div className="relative border border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50 cursor-pointer">
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRegDocName(file.name);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setRegDocPath(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[250px]">
                      {regDocName || 'Click to select and upload document (PDF, PNG, JPG)'}
                    </span>
                  </div>
                  {regDocName && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase">
                      Ready
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Please upload your official business registration certificate or corporate operating license.</p>
              </div>

              <div className="border-t border-slate-100 pt-5 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#00A896] hover:bg-teal-700 text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-sm text-xs border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting Onboarding Request...</span>
                    </span>
                  ) : (
                    <span>Submit Verification Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Pre-calculate statistics details
  const accommodationsCount = data?.accommodations.length || 0;
  const visasCount = data?.visas.length || 0;
  const flightsCount = data?.flights.length || 0;

  const myAccommodationsCount = data?.accommodations.filter((a: any) => a.business_id === profile?.id).length || 0;
  const myPackagesCount = packages.length;
  const totalSeatsActive = packages.reduce((acc, p) => acc + Number(p.available_seats), 0);
  const openInquiriesCount = inquiries.filter(i => i.status === 'open').length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-slate-800">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-teal-dark uppercase tracking-wide">
            {profile ? `${profile.company_name} Console` : 'Global Logistics Console'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {profile?.category === 'travel_agency' ? 'Travel Agency Partner Console' : 'Business Partner Portal'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {profile?.category === 'travel_agency' 
              ? 'Configure available flight routes, seats, baggage journey instructions, and respond to bookings.'
              : 'Manage student accommodations, room availabilities, consular visa guides, and travel corridor costs.'
            }
          </p>
        </div>
        
        {(activeTab === 'accommodations' || activeTab === 'visas' || activeTab === 'flights' || activeTab === 'packages') && (
          <button
            onClick={() => {
              if (activeTab === 'accommodations') { resetHouseForm(); setIsHouseModalOpen(true); }
              if (activeTab === 'visas') { resetVisaForm(); setIsVisaModalOpen(true); }
              if (activeTab === 'flights') { resetFlightForm(); setIsFlightModalOpen(true); }
              if (activeTab === 'packages') { resetPkgForm(); setIsPkgModalOpen(true); }
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-bright to-teal-green text-white font-bold px-4 py-2.5 text-xs hover:from-teal-green hover:to-yellow-green transition-all cursor-pointer shadow-md shadow-teal-bright/20"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeTab === 'accommodations' && 'Add Accommodation'}
              {activeTab === 'visas' && 'Add Visa Protocol'}
              {activeTab === 'flights' && 'Add Flight Route'}
              {activeTab === 'packages' && 'Publish Flight Package'}
            </span>
          </button>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="flex border border-slate-200 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {/* Accommodation agencies options */}
        {profile?.category === 'accommodation' && (
          <>
            <button
              onClick={() => setActiveTab('accommodations')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'accommodations' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Properties</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'bookings' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Real-time Bookings</span>
            </button>
            <button
              onClick={() => setActiveTab('inquiries')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer relative whitespace-nowrap ${
                activeTab === 'inquiries' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Inquiries & Leads</span>
              {openInquiriesCount > 0 && (
                <span className="absolute -top-1.5 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                  {openInquiriesCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* Travel agencies options */}
        {profile?.category === 'travel_agency' && (
          <>
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'packages' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Plane className="h-4 w-4" />
              <span>Flight Packages</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'bookings' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Passenger Bookings</span>
            </button>
            <button
              onClick={() => setActiveTab('inquiries')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer relative whitespace-nowrap ${
                activeTab === 'inquiries' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Flight Bookings Inbox</span>
              {openInquiriesCount > 0 && (
                <span className="absolute -top-1.5 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                  {openInquiriesCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* Platform admins / fallback options */}
        {!profile && (
          <>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('accommodations')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'accommodations' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Properties</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'bookings' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Real-time Bookings</span>
            </button>
            <button
              onClick={() => setActiveTab('visas')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'visas' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Visa Guides</span>
            </button>
            <button
              onClick={() => setActiveTab('flights')}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'flights' ? 'bg-teal-bright text-white shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Plane className="h-4 w-4" />
              <span>Flight Estimates</span>
            </button>
          </>
        )}
      </div>

      {/* Overview stats layout (if admin) */}
      {activeTab === 'overview' && !profile && (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'Listed Accommodations', value: accommodationsCount, icon: Building, color: 'text-teal-bright bg-teal-bright/10' },
              { label: 'Configured Visa Guides', value: visasCount, icon: ShieldCheck, color: 'text-teal-green bg-teal-green/10' },
              { label: 'Flight Routes Active', value: flightsCount, icon: Plane, color: 'text-yellow-green bg-yellow-green/10' }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                    <span className="text-3xl font-extrabold text-slate-900 block mt-1">{card.value}</span>
                  </div>
                  <div className={`p-3 rounded-xl ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accommodations listings (Admin or housing agencies) */}
      {activeTab === 'accommodations' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Manage Property Listings
          </h3>

          {(profile ? data?.accommodations.filter((a: any) => a.business_id === profile.id) : data?.accommodations).length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Building className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No accommodations configured. Click "Add Accommodation" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Country & City</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Monthly Rent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.accommodations
                    .filter((house: any) => !profile || house.business_id === profile.id)
                    .map((house: any) => (
                      <tr key={house.id} className="hover:bg-slate-50 transition-all">
                        <td className="py-4 px-4 font-bold text-slate-900">{house.title}</td>
                        <td className="py-4 px-4 text-slate-600">{house.city_name}, {house.country_name}</td>
                        <td className="py-4 px-4 capitalize text-teal-dark font-bold">{house.type}</td>
                        <td className="py-4 px-4 font-extrabold text-slate-900">${Number(house.rent).toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            house.availability ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/30' : 'bg-rose-50 text-rose-700 border border-rose-250/30'
                          }`}>
                            {house.availability ? 'Available' : 'Booked'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditHouse(house)}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-teal-dark cursor-pointer transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHouse(house.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 cursor-pointer transition-colors"
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

      {/* Visas tab (Admin only) */}
      {activeTab === 'visas' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-[fadeIn_0.4s_ease-out] text-slate-800">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Manage Country Visa Protocols
          </h3>

          {data?.visas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No visa guidelines defined. Click "Add Visa Protocol" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data?.visas.map((visa: any) => (
                <div key={visa.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-350 transition-all text-slate-800">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-base text-slate-900">{visa.country_name}</span>
                      <span className="text-xs font-extrabold text-teal-dark">${Number(visa.fee).toLocaleString()} fee</span>
                    </div>
                    
                    <p className="text-xs text-slate-650 leading-relaxed line-clamp-3">
                      {visa.requirements}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                      <Clock className="h-3.5 w-3.5 text-teal-dark" />
                      <span>Timeline: {visa.timeline}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                    <button
                      onClick={() => openEditVisa(visa)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-teal-200 hover:bg-teal-50 text-teal-dark text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVisa(visa.id)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold cursor-pointer transition-colors"
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

      {/* Flights configuration tab (Admins only) */}
      {activeTab === 'flights' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-[fadeIn_0.4s_ease-out] text-slate-800">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Manage Flights & Travel Costs
          </h3>

          {data?.flights.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Plane className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No flight details defined. Click "Add Flight Route" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Origin Hub</th>
                    <th className="py-3 px-4">Destination Country</th>
                    <th className="py-3 px-4">Estimated Ticket Cost</th>
                    <th className="py-3 px-4">Packing Guidelines / Tips</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.flights.map((flight: any) => (
                    <tr key={flight.id} className="hover:bg-slate-50 transition-all text-slate-800">
                      <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5 text-teal-dark rotate-45" />
                        <span>{flight.origin}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-bold">{flight.country_name}</td>
                      <td className="py-4 px-4 font-extrabold text-slate-900">${Number(flight.est_cost).toLocaleString()}</td>
                      <td className="py-4 px-4 max-w-xs truncate text-slate-650">
                        {flight.checklist_json?.tips ? flight.checklist_json.tips.join(' | ') : 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditFlight(flight)}
                          className="p-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-teal-dark cursor-pointer transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFlight(flight.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 cursor-pointer transition-colors"
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

      {/* Flight Packages tab (Travel agency business category) */}
      {activeTab === 'packages' && profile?.category === 'travel_agency' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Manage Active Flight Journeys
            </h3>
            <div className="text-xs font-bold text-teal-dark">
              Active Seats Combined: {totalSeatsActive}
            </div>
          </div>

          {/* Revenue & Ratings Analytics Row */}
          {(() => {
            const confirmedBookings = flightBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'paid');
            const revenue = confirmedBookings.reduce((sum: number, b: any) => sum + Number(b.total_cost || 0), 0);
            
            const allFlightReviews = packages.flatMap((pkg: any) => {
              let revs = [];
              try {
                revs = pkg.ratings_reviews ? (typeof pkg.ratings_reviews === 'string' ? JSON.parse(pkg.ratings_reviews) : pkg.ratings_reviews) : [];
              } catch (e) {
                revs = [];
              }
              return (Array.isArray(revs) ? revs : []).map((r: any) => ({ ...r, flight_info: pkg.flight_info }));
            });

            const avgRating = allFlightReviews.length > 0
              ? (allFlightReviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / allFlightReviews.length).toFixed(1)
              : '5.0';

            return (
              <div className="space-y-6">
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] text-slate-450 uppercase block font-black">Gross Revenue</span>
                    <span className="text-xl font-extrabold text-slate-900 block mt-1">${revenue.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">From confirmed flight seats</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] text-slate-450 uppercase block font-black">Average Rating</span>
                    <span className="text-xl font-extrabold text-slate-900 block mt-1 flex items-center gap-1">
                      <span>{avgRating}</span>
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Based on {allFlightReviews.length} reviews</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[10px] text-slate-450 uppercase block font-black">Tickets Confirmed</span>
                    <span className="text-xl font-extrabold text-slate-900 block mt-1">{confirmedBookings.length} Passengers</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Active boarding passes</span>
                  </div>
                </div>

                {/* Ratings & Reviews List */}
                {allFlightReviews.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                    <span className="text-[10px] font-black text-slate-455 uppercase tracking-wider block">⭐ Recent Passenger Feedback</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[200px] overflow-y-auto pr-1">
                      {allFlightReviews.map((rev: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px] font-semibold text-slate-700">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-950 font-bold">{rev.student_name}</span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < rev.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200'}`} />
                              ))}
                            </div>
                          </div>
                          <span className="block text-[8px] text-slate-400 font-medium leading-none">{rev.flight_info}</span>
                          <p className="text-slate-650 font-normal leading-normal italic">
                            "{rev.review_text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {packages.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Plane className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No active travel flight offers created yet. Click "Publish Flight Package" to configure one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packages.map((pkg: any) => (
                <div key={pkg.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-350 transition-all text-slate-800">
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-sm text-slate-900">{pkg.flight_info}</span>
                      <span className="text-sm font-extrabold text-teal-dark">${Number(pkg.ticket_cost).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500">
                      <span>Destination: <strong className="text-slate-800 font-bold">{pkg.destination_country}</strong></span>
                      <span>Departure: <strong className="text-slate-800 font-bold">{pkg.departure_country || 'Any'}</strong></span>
                    </div>

                    {pkg.description && (
                      <p className="text-slate-700 leading-relaxed bg-slate-150 p-2.5 rounded-xl whitespace-pre-line">
                        {pkg.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-dark border border-teal-150 font-semibold text-[10px]">
                        Seats: {pkg.available_seats}
                      </span>
                      {pkg.has_insurance && <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150 font-semibold text-[10px]">Insurance</span>}
                      {pkg.has_airport_pickup && <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-150 font-semibold text-[10px]">Pickup</span>}
                      {pkg.visa_assistance && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-150 font-semibold text-[10px]">Visa Assist</span>}
                    </div>

                    <div className="text-[10px] text-slate-450 italic">
                      Contact: {pkg.contact_info}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                    <button
                      onClick={() => openEditPkg(pkg)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-teal-200 hover:bg-teal-50 text-teal-dark text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold cursor-pointer transition-colors"
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

      {/* Real-time Stay and Flight Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-[fadeIn_0.4s_ease-out] text-slate-800">
          
          {/* 1. ACCOMMODATION PROVIDER BOOKINGS REVIEW */}
          {profile?.category === 'accommodation' && (
            <>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
                Stay Booking Requests Inbox
              </h3>

              {roomBookings.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-xs">No stay bookings requested for your properties yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Booking ID</th>
                        <th className="py-3 px-4">Property</th>
                        <th className="py-3 px-4">Student Info</th>
                        <th className="py-3 px-4">Stay Duration</th>
                        <th className="py-3 px-4">Guests</th>
                        <th className="py-3 px-4">Deposit Due</th>
                        <th className="py-3 px-4">Verification Doc</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Action Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roomBookings.map((booking: any) => (
                        <tr key={booking.id} className="hover:bg-slate-50 transition-all text-slate-800">
                          <td className="py-4 px-4 font-extrabold text-slate-500">#BK-{booking.id}</td>
                          <td className="py-4 px-4 font-bold text-slate-905 capitalize">
                            <span>{booking.property_title}</span>
                            {booking.room_type && (
                              <span className="text-[9px] text-teal-650 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5 block w-fit mt-1 font-extrabold capitalize">{booking.room_type}</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700">
                            <span className="block">{booking.student_name}</span>
                            <span className="text-[10px] text-slate-450 block font-normal">{booking.student_email}</span>
                          </td>
                          <td className="py-4 px-4 text-slate-650 font-medium">
                            <span className="block font-bold">{new Date(booking.check_in_date).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400 block">to {new Date(booking.check_out_date).toLocaleDateString()}</span>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-700">{booking.guests_count} Guests</td>
                          <td className="py-4 px-4 font-extrabold text-teal-605">${Number(booking.total_cost).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            {booking.document_url ? (
                              <a
                                href={booking.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-650 font-bold hover:underline flex items-center gap-1"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>{booking.document_url.split('/').pop()}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">None Provided</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                              booking.status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                              booking.status === 'approved' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                              booking.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                              'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {booking.status === 'pending' ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleUpdateRoomBookingStatus(booking.id, 'approved')}
                                  disabled={updatingStatusId === booking.id}
                                  className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-200 cursor-pointer flex items-center gap-1"
                                  title="Approve stay booking request"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateRoomBookingStatus(booking.id, 'rejected')}
                                  disabled={updatingStatusId === booking.id}
                                  className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-200 cursor-pointer flex items-center gap-1"
                                  title="Reject request"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : booking.status === 'approved' ? (
                              <span className="text-[10px] text-blue-700 font-bold italic">Awaiting Student Deposit</span>
                            ) : booking.status === 'paid' ? (
                              <span className="text-[10px] text-emerald-700 font-extrabold flex items-center justify-center gap-1 uppercase tracking-wider">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Stay Confirmed</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">Closed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* 2. TRAVEL AGENCY / FLIGHT TICKET BOOKINGS REVIEW */}
          {profile?.category === 'travel_agency' && (
            <>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4 flex justify-between items-center">
                <span>Flight Ticket Requests Review</span>
                <span className="text-[10px] text-slate-450 lowercase">Passenger bookings lists ({flightBookings.length})</span>
              </h3>

              {flightBookings.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-xs">No flight passenger tickets requested yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Booking ID</th>
                        <th className="py-3 px-4">Flight Route</th>
                        <th className="py-3 px-4">Lead Passenger Details</th>
                        <th className="py-3 px-4">Cabin & Seats</th>
                        <th className="py-3 px-4">Total Cost</th>
                        <th className="py-3 px-4">Visa/Immigration Docs</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Action Review / Broadcast</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {flightBookings.map((booking: any) => {
                        const details = booking.booking_details ? (typeof booking.booking_details === 'string' ? JSON.parse(booking.booking_details) : booking.booking_details) : {};
                        const passengers = details.passengers || [];
                        const isConfirmed = booking.status === 'confirmed' || booking.status === 'paid';

                        return (
                          <tr key={booking.id} className="hover:bg-slate-50 transition-all text-slate-800 font-medium">
                            <td className="py-4 px-4 font-extrabold text-slate-500">
                              #FB-{booking.id}
                              {booking.ticket_number && (
                                <span className="block font-mono text-[8px] text-teal-650 bg-teal-50 px-1 py-0.5 rounded uppercase mt-1">
                                  {booking.ticket_number}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-900 max-w-[150px] truncate" title={booking.flight_info}>
                              {booking.flight_info}
                            </td>
                            <td className="py-4 px-4 text-slate-700">
                              <span className="block font-bold">{booking.passenger_name}</span>
                              <span className="text-[9px] text-slate-450 block font-normal mt-0.5">{booking.student_email} • {booking.contact_phone}</span>
                              {passengers.length > 1 && (
                                <div className="text-[8px] bg-slate-100 p-1.5 rounded-lg border border-slate-200 mt-1 space-y-0.5 text-slate-500 max-w-[150px]">
                                  <span className="block font-black text-slate-450 uppercase">All Seats:</span>
                                  {passengers.map((p: any, i: number) => (
                                    <div key={i} className="truncate">
                                      {i + 1}. {p.name} ({p.passport})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800">
                              <span className="block text-[10px] text-slate-600 uppercase">{details.cabinClass || 'Economy'}</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5 font-bold">Seats: {details.selectedSeats && details.selectedSeats.length > 0 ? details.selectedSeats.join(', ') : booking.seats_count}</span>
                            </td>
                            <td className="py-4 px-4 font-extrabold text-slate-900">${Number(booking.total_cost).toLocaleString()}</td>
                            <td className="py-4 px-4">
                              {details.uploadedDocuments && Object.keys(details.uploadedDocuments).length > 0 ? (
                                <div className="flex flex-col gap-1 text-[9px] font-bold">
                                  {Object.entries(details.uploadedDocuments).map(([key, filename]: any) => (
                                    <a
                                      key={key}
                                      href={`/uploads/travel/${filename}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-teal-650 hover:underline flex items-center gap-1 leading-tight"
                                    >
                                      <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                                      <span className="truncate max-w-[100px]">{key}</span>
                                    </a>
                                  ))}
                                </div>
                              ) : booking.document_url ? (
                                <a
                                  href={booking.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-650 font-bold hover:underline flex items-center gap-1"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Passport Photo</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">None Uploaded</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                isConfirmed ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-extrabold' :
                                booking.status === 'approved' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                                booking.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                'bg-amber-50 border-amber-100 text-amber-700'
                              }`}>
                                {booking.status === 'paid' || booking.status === 'confirmed' ? 'Confirmed' : booking.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex flex-col gap-1.5 items-center justify-center">
                                {booking.status === 'pending' && (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleUpdateFlightBookingStatus(booking.id, 'approved')}
                                      disabled={updatingStatusId === booking.id}
                                      className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-200 cursor-pointer flex items-center gap-1 transition-all"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleUpdateFlightBookingStatus(booking.id, 'rejected')}
                                      disabled={updatingStatusId === booking.id}
                                      className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-200 cursor-pointer flex items-center gap-1 transition-all"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                )}
                                {booking.status === 'approved' && (
                                  <span className="text-[10px] text-blue-700 font-bold italic">Awaiting Payment</span>
                                )}
                                {isConfirmed && (
                                  <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    <span>Boarded</span>
                                  </span>
                                )}
                                {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                                  <button
                                    onClick={() => {
                                      setNotifBookingId(booking.id);
                                      setNotifMessage('');
                                    }}
                                    className="p-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold border border-blue-200 cursor-pointer flex items-center gap-1 text-[10px] mt-1 transition-colors bg-transparent"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    <span>Send Announcement</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* 3. PLATFORM ADMIN OVERVIEW LISTING FALLBACK */}
          {!profile && (
            <>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
                Real-time Stay Booking Records (Platform Admin View)
              </h3>

              {((data?.bookings) || []).length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-xs">No active bookings recorded in the system yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Booking ID</th>
                        <th className="py-3 px-4">Stay Property</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Check-in</th>
                        <th className="py-3 px-4">Check-out</th>
                        <th className="py-3 px-4">Guests</th>
                        <th className="py-3 px-4">Total Cost</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((data?.bookings) || []).map((booking: any) => (
                        <tr key={booking.id} className="hover:bg-slate-50 transition-all text-slate-800">
                          <td className="py-4 px-4 font-extrabold text-slate-500">#BK-{booking.id}</td>
                          <td className="py-4 px-4 font-bold text-slate-900 capitalize">{booking.property_title}</td>
                          <td className="py-4 px-4 font-semibold text-slate-700">{booking.student_name}</td>
                          <td className="py-4 px-4 font-medium text-slate-650">{new Date(booking.check_in_date).toLocaleDateString()}</td>
                          <td className="py-4 px-4 font-medium text-slate-650">{new Date(booking.check_out_date).toLocaleDateString()}</td>
                          <td className="py-4 px-4 font-bold text-slate-800">{booking.guests_count} Guests</td>
                          <td className="py-4 px-4 font-extrabold text-teal-600">${Number(booking.total_cost).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250/30 uppercase tracking-wider">
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* Inquiries & Student bookings inbox */}
      {activeTab === 'inquiries' && profile && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Incoming Booking inquiries / leads ({inquiries.length})
          </h3>

          {inquiries.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No active booking inquiries received from students yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq: any) => (
                <div key={inq.id} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 text-slate-850">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{inq.student_name}</span>
                        <span className="text-[10px] bg-teal-50 text-teal-dark border border-teal-150 px-2 py-0.5 rounded font-bold">
                          GPA: {inq.student_cgpa}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{inq.student_email}</span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        inq.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-amber-50 text-amber-700 border border-amber-150'
                      }`}>
                        {inq.status === 'resolved' ? 'Responded' : 'Needs Response'}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        {new Date(inq.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="font-semibold text-slate-900">
                      Subject: {inq.subject}
                    </div>
                    <p className="text-slate-700 leading-relaxed bg-slate-100 p-3 rounded-xl italic">
                      "{inq.message}"
                    </p>
                  </div>

                  {inq.response && (
                    <div className="text-xs space-y-1.5 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-slate-800">
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <Check className="h-4 w-4" />
                        <span>Our Response:</span>
                      </span>
                      <p className="leading-relaxed">{inq.response}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => openInquiryReply(inq)}
                      className="flex items-center gap-1.5 px-4.5 py-2 bg-gradient-teal-sunrise text-slate-950 text-xs font-extrabold rounded-xl hover:shadow-lg cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{inq.response ? 'Update Response' : 'Reply & Close'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accommodations CRUD Modal */}
      {isHouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>{selectedHouseId ? 'Edit Housing Listing' : 'Publish New Accommodation'}</span>
              <button onClick={() => setIsHouseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveHouse} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Listing Title</label>
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
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Destination Country</label>
                  <select
                    value={houseCountryId}
                    onChange={(e) => setHouseCountryId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all font-semibold"
                  >
                    {data?.countries.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">City Name</label>
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
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Property Type</label>
                  <select
                    value={houseType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHouseType(val);
                      if (!['PG', 'Hostel', 'Shared Apartment', 'Dormitory'].includes(val)) {
                        setRoomType('Entire Unit');
                      } else {
                        setRoomType('Single');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all font-semibold"
                  >
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

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Monthly Rent (USD)</label>
                  <input
                    type="number"
                    value={houseRent}
                    onChange={(e) => setHouseRent(Number(e.target.value))}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Exact Address / Location</label>
                  <input
                    type="text"
                    value={houseAddress}
                    onChange={(e) => setHouseAddress(e.target.value)}
                    placeholder="e.g. 24 Leopoldstrasse, Schwabing, Munich"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Contact Mobile Number</label>
                  <input
                    type="tel"
                    value={houseMobile}
                    onChange={(e) => setHouseMobile(e.target.value)}
                    placeholder="e.g. +49 176 12345678"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Website Details</label>
                  <input
                    type="url"
                    value={houseWebsite}
                    onChange={(e) => setHouseWebsite(e.target.value)}
                    placeholder="e.g. https://studenthousing-munich.de"
                    className="w-full glass-input"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Distance to Campus</label>
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
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Total Rooms</label>
                  <input
                    type="number"
                    readOnly
                    value={houseTotalRooms}
                    className="w-full glass-input bg-slate-100 text-slate-500 cursor-not-allowed"
                    title="Calculated automatically from room configurations"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Status / Availability</label>
                  <select
                    value={houseAvailability ? 'true' : 'false'}
                    onChange={(e) => setHouseAvailability(e.target.value === 'true')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all font-semibold"
                  >
                    <option value="true">Available</option>
                    <option value="false">Booked</option>
                  </select>
                </div>

                {/* Room Configurations Section */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-250 pb-3">
                    <div>
                      <span className="block font-bold text-slate-900 uppercase text-[10px] tracking-wider">Room Type Configurations</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-semibold">Configure categories (e.g. Single sleeper, double sharing, etc.)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newRoom = {
                          roomType: houseType === 'Flat' || houseType === 'Villa' ? 'Entire Unit' : 'Single Room',
                          occupancy: 1,
                          gender: 'Mixed',
                          rent: 500,
                          total_rooms: 1,
                          available_rooms: 1
                        };
                        updateRoomsAndSync([...rooms, newRoom]);
                      }}
                      className="px-3 py-1.5 bg-teal-bright hover:bg-teal-600 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg border-0 cursor-pointer transition-all shadow-sm"
                    >
                      ➕ Add Room Type
                    </button>
                  </div>

                  {rooms.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No room configurations defined. Click "Add Room Type" to add one.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {rooms.map((room, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 relative space-y-3 shadow-sm">
                          {/* Remove button */}
                          {rooms.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newRooms = rooms.filter((_, i) => i !== idx);
                                updateRoomsAndSync(newRooms);
                              }}
                              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center"
                              title="Delete Room Type"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs font-semibold">
                            {/* Room Name/Type input */}
                            <div className="md:col-span-2">
                              <label className="block text-[9px] text-slate-500 uppercase tracking-wide mb-1">Room Category Name</label>
                              {houseType === 'Flat' || houseType === 'Villa' ? (
                                <input
                                  type="text"
                                  disabled
                                  value="Entire Unit"
                                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 focus:outline-none text-slate-500 cursor-not-allowed font-semibold text-xs"
                                />
                              ) : (
                                <input
                                  type="text"
                                  required
                                  value={room.roomType}
                                  onChange={(e) => {
                                    const newRooms = [...rooms];
                                    newRooms[idx].roomType = e.target.value;
                                    updateRoomsAndSync(newRooms);
                                  }}
                                  placeholder="e.g. Single Sleeper (AC)"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-bright text-slate-800 font-semibold text-xs"
                                />
                              )}
                            </div>

                            {/* Monthly Rent */}
                            <div>
                              <label className="block text-[9px] text-slate-500 uppercase tracking-wide mb-1">Monthly Rent ($)</label>
                              <input
                                type="number"
                                required
                                min={0}
                                value={room.rent}
                                onChange={(e) => {
                                  const newRooms = [...rooms];
                                  newRooms[idx].rent = Number(e.target.value);
                                  updateRoomsAndSync(newRooms);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-bright text-slate-800 font-semibold text-xs"
                              />
                            </div>

                            {/* Max Occupancy */}
                            <div>
                              <label className="block text-[9px] text-slate-500 uppercase tracking-wide mb-1">Max Guests</label>
                              <input
                                type="number"
                                required
                                min={1}
                                value={room.occupancy}
                                onChange={(e) => {
                                  const newRooms = [...rooms];
                                  newRooms[idx].occupancy = Number(e.target.value);
                                  updateRoomsAndSync(newRooms);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-bright text-slate-800 font-semibold text-xs"
                              />
                            </div>

                            {/* Total Rooms of this category */}
                            <div>
                              <label className="block text-[9px] text-slate-500 uppercase tracking-wide mb-1">Total Rooms</label>
                              <input
                                type="number"
                                required
                                min={1}
                                value={room.total_rooms}
                                onChange={(e) => {
                                  const newRooms = [...rooms];
                                  const diff = Number(e.target.value) - (room.total_rooms || 0);
                                  newRooms[idx].total_rooms = Number(e.target.value);
                                  newRooms[idx].available_rooms = Math.max(0, Number(room.available_rooms || 0) + diff);
                                  updateRoomsAndSync(newRooms);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-bright text-slate-800 font-semibold text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                            {/* Allowed Gender */}
                            <div>
                              <label className="block text-[9px] text-slate-500 uppercase tracking-wide mb-1">Allowed Gender</label>
                              <select
                                value={room.gender}
                                onChange={(e) => {
                                  const newRooms = [...rooms];
                                  newRooms[idx].gender = e.target.value;
                                  updateRoomsAndSync(newRooms);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-bright text-slate-800 font-semibold text-xs cursor-pointer"
                              >
                                <option value="Mixed">Mixed / All</option>
                                <option value="Male">Male Only</option>
                                <option value="Female">Female Only</option>
                              </select>
                            </div>

                            {/* Description/Features */}
                            <div>
                              <label className="block text-[9px] text-slate-500 uppercase tracking-wide mb-1">Specific Features</label>
                              <input
                                type="text"
                                value={room.description || ''}
                                onChange={(e) => {
                                  const newRooms = [...rooms];
                                  newRooms[idx].description = e.target.value;
                                  updateRoomsAndSync(newRooms);
                                }}
                                placeholder="e.g. AC, attached washroom, private balcony"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-bright text-slate-800 font-semibold text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Amenities / Facilities (ac, wifi, heater, washroom, etc. - Comma separated)</label>
                  <input
                    type="text"
                    value={houseFacilities}
                    onChange={(e) => setHouseFacilities(e.target.value)}
                    placeholder="e.g. Wifi, AC, Heater, Private Washroom, Laundry"
                    className="w-full glass-input"
                  />
                </div>

                <div className="md:col-span-2 text-slate-700 space-y-2">
                  <label className="block font-semibold text-slate-600 uppercase">Images of the stay</label>
                  
                  {/* File Upload Selector */}
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <input
                      type="file"
                      id="image-upload-input"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImg}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload-input"
                      className="px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-teal-700 font-extrabold text-xs cursor-pointer transition-colors shadow-sm"
                    >
                      {houseImages.split(',').map(u => u.trim()).filter(Boolean).length > 0 ? 'Upload' : 'Upload File'}
                    </label>
                    {uploadingImg && (
                      <span className="flex items-center gap-1.5 text-xs text-teal-650 font-bold">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Previews */}
                  {houseImages.split(',').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div className="grid grid-cols-4 gap-2.5 pt-2">
                      {houseImages.split(',').map(u => u.trim()).filter(Boolean).map((imgUrl, idx) => (
                        <div key={idx} className="relative h-20 w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50 group">
                          <img src={imgUrl} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(imgUrl)}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 cursor-pointer transition-colors shadow-md flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                <div className="md:col-span-2 text-slate-700 space-y-2">
                  <label className="block font-semibold text-slate-600 uppercase">Videos of the stay</label>
                  
                  {/* File Upload Selector */}
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <input
                      type="file"
                      id="video-upload-input"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={uploadingVid}
                      className="hidden"
                    />
                    <label
                      htmlFor="video-upload-input"
                      className="px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-teal-700 font-extrabold text-xs cursor-pointer transition-colors shadow-sm"
                    >
                      {houseVideos.split(',').map(u => u.trim()).filter(Boolean).length > 0 ? 'Upload' : 'Upload File'}
                    </label>
                    {uploadingVid && (
                      <span className="flex items-center gap-1.5 text-xs text-teal-650 font-bold">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </span>
                    )}
                  </div>

                  {/* Video Previews */}
                  {houseVideos.split(',').map(u => u.trim()).filter(Boolean).length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      {houseVideos.split(',').map(u => u.trim()).filter(Boolean).map((vidUrl, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] text-slate-800">
                          <span className="font-bold truncate max-w-[80%]">{vidUrl}</span>
                          <button
                            type="button"
                            onClick={() => removeUploadedVideo(vidUrl)}
                            className="text-red-500 hover:text-red-700 font-bold cursor-pointer transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Property Description</label>
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

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsHouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-250 font-bold text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-teal-sunrise text-slate-900 font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>{selectedVisaId ? 'Edit Visa Protocols' : 'Add Visa Guidelines'}</span>
              <button onClick={() => setIsVisaModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveVisa} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Target Country</label>
                  <select
                    value={visaCountryId}
                    onChange={(e) => setVisaCountryId(Number(e.target.value))}
                    disabled={!!selectedVisaId}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all font-semibold disabled:opacity-50"
                  >
                    {data?.countries.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Embassy Timeline</label>
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
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Visa Application Fee (USD)</label>
                  <input
                    type="number"
                    value={visaFee}
                    onChange={(e) => setVisaFee(Number(e.target.value))}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Consular Requirements / Description</label>
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
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Required Documents (Comma separated)</label>
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
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Step-by-Step Action Checklist (One step per line)</label>
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

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsVisaModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-250 font-bold text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs border-0"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>{selectedFlightId ? 'Edit Flight Details' : 'Configure Flight Route'}</span>
              <button onClick={() => setIsFlightModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveFlight} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Origin Hub Airport</label>
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
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Destination Country</label>
                  <select
                    value={flightDestId}
                    onChange={(e) => setFlightDestId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all font-semibold"
                  >
                    {data?.countries.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Est. Ticket Cost (USD)</label>
                  <input
                    type="number"
                    value={flightCost}
                    onChange={(e) => setFlightCost(Number(e.target.value))}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Travel Guidelines & Packing Tips (One tip per line)</label>
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

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFlightModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-250 font-bold text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs border-0"
                >
                  {submitting ? 'Saving...' : 'Save Flight Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flight Packages CRUD Modal */}
      {isPkgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>{selectedPkgId ? 'Edit Flight Package' : 'Publish Flight Journey Deal'}</span>
              <button onClick={() => setIsPkgModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSavePackage} className="space-y-4 text-xs font-semibold">
              
              {/* SECTION 1: AIRLINE & ROUTE DETAILS */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <span className="text-[10px] font-black text-teal-650 block uppercase tracking-wider">✈️ Airline & Aircraft Details</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Flight details / Title</label>
                    <input
                      type="text"
                      value={pkgFlightInfo}
                      onChange={(e) => setPkgFlightInfo(e.target.value)}
                      placeholder="e.g. Lufthansa LH763 - Direct flight DEL to MUC"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Airline Name</label>
                    <input
                      type="text"
                      value={airlineName}
                      onChange={(e) => setAirlineName(e.target.value)}
                      placeholder="e.g. Lufthansa"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Airline Logo</label>
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 h-[46px]">
                      <input
                        type="file"
                        id="logo-upload-input"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload-input"
                        className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-teal-700 font-extrabold text-[10px] uppercase cursor-pointer transition-colors shadow-sm"
                      >
                        {airlineLogo ? 'Change' : 'Upload Logo'}
                      </label>
                      {uploadingLogo ? (
                        <span className="flex items-center gap-1 text-[10px] text-teal-650 font-bold">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </span>
                      ) : airlineLogo ? (
                        <div className="flex items-center gap-2">
                          <img src={airlineLogo} className="h-6 w-16 object-contain rounded border border-slate-100 bg-white" />
                          <button
                            type="button"
                            onClick={() => setAirlineLogo('')}
                            className="text-red-500 hover:text-red-650 cursor-pointer bg-transparent border-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No logo uploaded</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Flight Number</label>
                    <input
                      type="text"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="e.g. LH763"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Aircraft Model</label>
                    <input
                      type="text"
                      value={aircraftModel}
                      onChange={(e) => setAircraftModel(e.target.value)}
                      placeholder="e.g. Airbus A350-900"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: SCHEDULE, AIRPORTS & TRANSITS */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <span className="text-[10px] font-black text-teal-650 block uppercase tracking-wider">📅 Journey Schedule & Airport Routes</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Departure Country</label>
                    <select
                      value={pkgDeptCountryId}
                      onChange={(e) => setPkgDeptCountryId(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      {data?.countries.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Destination Country</label>
                    <select
                      value={pkgDestCountryId}
                      onChange={(e) => setPkgDestCountryId(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      {data?.countries.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Departure City</label>
                    <input
                      type="text"
                      value={deptCity}
                      onChange={(e) => setDeptCity(e.target.value)}
                      placeholder="e.g. New Delhi"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Departure Airport (Code)</label>
                    <input
                      type="text"
                      value={deptAirport}
                      onChange={(e) => setDeptAirport(e.target.value)}
                      placeholder="e.g. Indira Gandhi Intl (DEL)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Destination City</label>
                    <input
                      type="text"
                      value={destCity}
                      onChange={(e) => setDestCity(e.target.value)}
                      placeholder="e.g. Munich"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Destination Airport (Code)</label>
                    <input
                      type="text"
                      value={destAirport}
                      onChange={(e) => setDestAirport(e.target.value)}
                      placeholder="e.g. Munich Airport (MUC)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Departure Date</label>
                    <input
                      type="date"
                      value={depDate}
                      onChange={(e) => setDepDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-805"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Departure Time</label>
                    <input
                      type="time"
                      value={depTime}
                      onChange={(e) => setDepTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-805"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Arrival Date</label>
                    <input
                      type="date"
                      value={arrDate}
                      onChange={(e) => setArrDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-805"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Arrival Time</label>
                    <input
                      type="time"
                      value={arrTime}
                      onChange={(e) => setArrTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-805"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Flight Duration</label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 8h 20m"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Time Zone</label>
                    <input
                      type="text"
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      placeholder="e.g. GMT+2"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>
                </div>

                {/* Transit Airport Stops */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 border-t border-slate-200 pt-3 mt-1">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Transit Stops</label>
                    <select
                      value={transitType}
                      onChange={(e) => setTransitType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-700"
                    >
                      <option value="direct">Direct Flight</option>
                      <option value="one_stop">1 Stop</option>
                      <option value="multi_stop">Multiple Stops</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Transit Airport</label>
                    <input
                      type="text"
                      value={transitAirport}
                      onChange={(e) => setTransitAirport(e.target.value)}
                      placeholder="e.g. Dubai (DXB)"
                      disabled={transitType === 'direct'}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Layover Duration</label>
                    <input
                      type="text"
                      value={transitDuration}
                      onChange={(e) => setTransitDuration(e.target.value)}
                      placeholder="e.g. 2h 15m"
                      disabled={transitType === 'direct'}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: TICKET DETAILS, SEATS & BAGGAGE */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <span className="text-[10px] font-black text-teal-650 block uppercase tracking-wider">🎒 Baggage Allowances & Ticket Price details</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Base Fare Cost (USD)</label>
                    <input
                      type="number"
                      value={pkgTicketCost}
                      onChange={(e) => setPkgTicketCost(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Charter Seats Allocated</label>
                    <input
                      type="number"
                      value={pkgSeats}
                      onChange={(e) => setPkgSeats(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Cabin Baggage Weight</label>
                    <input
                      type="text"
                      value={cabinBag}
                      onChange={(e) => setCabinBag(e.target.value)}
                      placeholder="e.g. 7kg"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Check-in Baggage Weight</label>
                    <input
                      type="text"
                      value={checkinBag}
                      onChange={(e) => setCheckinBag(e.target.value)}
                      placeholder="e.g. 40kg (Student Charter)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Extra Baggage Charges</label>
                    <input
                      type="text"
                      value={extraBaggageCharges}
                      onChange={(e) => setExtraBaggageCharges(e.target.value)}
                      placeholder="e.g. $15/kg"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>

                  {/* Dynamic Seat Layout Configuration Fields */}
                  <div className="md:col-span-2 border-t border-dashed border-slate-200 pt-3.5 space-y-3">
                    <span className="text-[10px] font-black text-teal-650 block uppercase tracking-wider">💺 Dynamic Seat Layout Configuration</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Rows Count</label>
                        <input
                          type="number"
                          value={pkgRowsCount}
                          onChange={(e) => setPkgRowsCount(Number(e.target.value))}
                          min="1"
                          max="40"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Cols Count (Letters)</label>
                        <input
                          type="number"
                          value={pkgColsCount}
                          onChange={(e) => setPkgColsCount(Number(e.target.value))}
                          min="1"
                          max="10"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Business Rows</label>
                        <input
                          type="text"
                          value={pkgBusinessRows}
                          onChange={(e) => setPkgBusinessRows(e.target.value)}
                          placeholder="e.g. 1-2"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Premium Rows</label>
                        <input
                          type="text"
                          value={pkgPremiumRows}
                          onChange={(e) => setPkgPremiumRows(e.target.value)}
                          placeholder="e.g. 3-4"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          required
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Economy Rows</label>
                        <input
                          type="text"
                          value={pkgEconomyRows}
                          onChange={(e) => setPkgEconomyRows(e.target.value)}
                          placeholder="e.g. 5-15"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2 py-1">
                    <label className="block font-semibold text-slate-600 uppercase">Features Included</label>
                    <div className="flex flex-wrap gap-4 text-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pkgHasInsurance}
                          onChange={(e) => setPkgHasInsurance(e.target.checked)}
                          className="rounded border-slate-300 text-teal-dark focus:ring-0 focus:ring-offset-0 bg-slate-50 cursor-pointer"
                        />
                        <span>Travel Insurance</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pkgHasPickup}
                          onChange={(e) => setPkgHasPickup(e.target.checked)}
                          className="rounded border-slate-300 text-teal-dark focus:ring-0 focus:ring-offset-0 bg-slate-50 cursor-pointer"
                        />
                        <span>Airport Pickup</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pkgVisaAssistance}
                          onChange={(e) => setPkgVisaAssistance(e.target.checked)}
                          className="rounded border-slate-300 text-teal-dark focus:ring-0 focus:ring-offset-0 bg-slate-50 cursor-pointer"
                        />
                        <span>Visa Support</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* OTHER DATA */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Baggage & Flight instructions</label>
                  <textarea
                    value={pkgDesc}
                    onChange={(e) => setPkgDesc(e.target.value)}
                    placeholder="Provide airline rules, departure dates, check-in baggage allowance, transit stops, and connection details..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-805"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Contact Email</label>
                    <input
                      type="email"
                      value={pkgContactEmail}
                      onChange={(e) => setPkgContactEmail(e.target.value)}
                      placeholder="e.g. bookings@nexa-travel.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-850"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1.5 uppercase">Contact Number</label>
                    <input
                      type="text"
                      value={pkgContactPhone}
                      onChange={(e) => setPkgContactPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 304-2938"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-850"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPkgModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-250 font-bold text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-dark text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs border-0"
                >
                  {submitting ? 'Saving...' : 'Publish Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inquiry Reply modal */}
      {isInquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl text-slate-800 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between">
              <span>Reply to Booking Inquiry</span>
              <button onClick={() => setIsInquiryModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSendInquiryReply} className="space-y-4 text-xs font-semibold">
              <div className="space-y-3 bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                <span className="font-extrabold text-teal-650 block">Student Query:</span>
                <p className="text-slate-700 leading-relaxed italic">"{selectedInquiryText}"</p>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-500 uppercase tracking-wider">Our Reply Response</label>
                <textarea
                  value={inquiryReply}
                  onChange={(e) => setInquiryReply(e.target.value)}
                  placeholder="Type your response instructions, confirmation numbers, or payment process steps..."
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 focus:outline-none focus:border-teal-bright focus:bg-white transition-all text-xs font-semibold"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsInquiryModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-250 font-bold text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  {submitting ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Bulletin Modal */}
      {notifBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl text-slate-805 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 uppercase tracking-wide flex justify-between items-center">
              <span>Broadcast Announcement</span>
              <button onClick={() => setNotifBookingId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"><X className="h-5 w-5" /></button>
            </h3>
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Type an updates message regarding departure timing changes, visa clearances requirements, or flight route details. This bulletin immediately updates on the lead passenger ticket.
              </p>
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="e.g. Flight LH763 checked baggage allowance upgraded to 45kg. Boarding commences at New Delhi Gate 12."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none"
              />
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-150 mt-2">
                <button
                  type="button"
                  onClick={() => setNotifBookingId(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs hover:bg-slate-50 text-slate-500 font-bold bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={sendingNotif || !notifMessage.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer border-0 animate-pulse-once"
                >
                  {sendingNotif ? 'Sending...' : 'Broadcast Bulletin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
