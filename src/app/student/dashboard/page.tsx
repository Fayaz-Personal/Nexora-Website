'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, BookOpen, Landmark, Award, Compass, HelpCircle, Save, Settings, 
  CheckCircle, Circle, ArrowRight, Loader2, RefreshCw, Star, Play,
  Sparkles, ShieldCheck, DollarSign, Calendar, MapPin, Plane, ShieldAlert,
  ChevronRight, Building, Brain, Globe, Trophy, X
} from 'lucide-react';
import { getCurrentUser, UserSession } from '@/app/actions/auth';
import { 
  getStudentProfile, getStudentRoadmap, getAdmissionPredictions, getSavedItems, 
  updateStudentProfile, toggleSaveUniversity, toggleSaveCourse, toggleSaveScholarship,
  getUniversities, getCourses, getScholarships, getVisaGuidance, getFlightsEstimates,
  getAccommodations, calculateAndSavePrediction, getStudentRequiredExams, updateStudentMilestones,
  getLeaderboard, getStudentApplications,
  getStudentRoomBookings, getStudentFlightBookings, payAccommodationDeposit, payFlightTicket,
  cancelRoomBooking, cancelFlightBooking, submitFlightReview
} from '@/app/actions/student';
import { useCurrency } from '@/components/CurrencyContext';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard data
  const [profile, setProfile] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any>({ universities: [], courses: [], scholarships: [] });
  const [requiredExams, setRequiredExams] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  
  // Bookings list states
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [flightBookings, setFlightBookings] = useState<any[]>([]);
  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);
  const [payingFlightId, setPayingFlightId] = useState<number | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);
  const [cancellingFlightId, setCancellingFlightId] = useState<number | null>(null);

  // Review & Ratings States
  const [activeReviewBooking, setActiveReviewBooking] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  
  
  // Recommendations data
  const [recommendedUnivs, setRecommendedUnivs] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [recommendedSchs, setRecommendedSchs] = useState<any[]>([]);
  
  // Travel & Visa & Housing Guidance data
  const [visaGuidance, setVisaGuidance] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [activeGuidanceTab, setActiveGuidanceTab] = useState<'exams' | 'milestones'>('exams');
  const [completedMilestones, setCompletedMilestones] = useState<string[]>([]);
  
  // Interactive Probability Tester
  const [allUnivs, setAllUnivs] = useState<any[]>([]);
  const [selectedTesterUnivId, setSelectedTesterUnivId] = useState<string>('');
  const [testerResult, setTesterResult] = useState<any>(null);
  const [calculatingChance, setCalculatingChance] = useState(false);

  // Loan & Currency Calculator states
  const [loanAmount, setLoanAmount] = useState<number>(2000000); // Default ₹20 Lakhs
  const [loanRate, setLoanRate] = useState<number>(9.5); // Default 9.5%
  const [loanTenure, setLoanTenure] = useState<number>(7); // Default 7 years
  const [calcUsdAmount, setCalcUsdAmount] = useState<string>('30000');

  // Edit Profile Form state
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [degree, setDegree] = useState('MS');
  const [department, setDepartment] = useState('Computer Science');
  const [cgpa, setCgpa] = useState<string | number>('3.0');
  const [budget, setBudget] = useState(30000);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [nationality, setNationality] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  const { changeCurrency, formatPriceShort } = useCurrency();

  // Load User & Profile data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const sessionUser = await getCurrentUser();
      if (!sessionUser) {
        router.push('/auth');
        return;
      }
      if (sessionUser.role !== 'student') {
        router.push('/auth');
        return;
      }
      setUser(sessionUser);

      const studProfile = await getStudentProfile(sessionUser.id);
      if (studProfile) {
        setProfile(studProfile);
        
        // Populate edit fields
        setName(studProfile.name || '');
        setDegree(studProfile.degree || 'MS');
        setDepartment(studProfile.department || 'Computer Science');
        setCgpa(studProfile.cgpa !== null && studProfile.cgpa !== undefined ? String(studProfile.cgpa) : '3.0');
        setBudget(Number(studProfile.budget) || 30000);
        setLinkedinUrl(studProfile.linkedin_url || '');
        setGithubUrl(studProfile.github_url || '');
        setPortfolioUrl(studProfile.portfolio_url || '');
        setNationality(studProfile.nationality || '');
        setCurrentCountry(studProfile.current_country || '');
        setAvatarUrl(studProfile.avatar_url || '');
        setCompletedMilestones(studProfile.milestones_completed || []);

        const preferredCountriesList = studProfile.preferred_countries || [];
        const firstCountry = preferredCountriesList[0] || 'Germany';

        // Parallelise all secondary data fetches for faster loading
        const [
          road, preds, saved, examsReq, leaderboardData, apps,
          rooms, travels, allU, matchingC, allSch, visa, flightEsts, acc
        ] = await Promise.all([
          getStudentRoadmap(studProfile.id),
          getAdmissionPredictions(studProfile.id),
          getSavedItems(studProfile.id),
          getStudentRequiredExams(studProfile.id),
          getLeaderboard(),
          getStudentApplications(studProfile.id),
          getStudentRoomBookings(studProfile.id),
          getStudentFlightBookings(studProfile.id),
          getUniversities({}),
          getCourses({ department: studProfile.department || 'Computer Science' }),
          getScholarships(studProfile.id),
          getVisaGuidance(firstCountry),
          getFlightsEstimates(),
          getAccommodations({ country: firstCountry }),
        ]);

        if (road) setRoadmap(road);
        setPredictions(preds);
        setSavedItems(saved);
        setRequiredExams(examsReq);
        setLeaderboard(leaderboardData);
        setApplications(apps);
        setRoomBookings(rooms);
        setFlightBookings(travels);
        setAllUnivs(allU);
        setRecommendedCourses(matchingC.slice(0, 3));
        setRecommendedSchs(allSch.slice(0, 3));
        setVisaGuidance(visa);
        setFlights(flightEsts.filter((f: any) => f.country_name === firstCountry));
        setAccommodations(acc.slice(0, 3));

        // Filter universities client-side (no extra DB call)
        const budgetVal = Number(studProfile.budget) || 30000;
        const matchingU = allU.filter((u: any) => {
          const countryMatch = preferredCountriesList.length === 0 || preferredCountriesList.includes(u.country_name);
          const feeMatch = Number(u.tuition_fee_min) <= budgetVal;
          return countryMatch && feeMatch;
        }).slice(0, 3);
        setRecommendedUnivs(matchingU);
      }
      setLoading(false);
    }
    loadData();
  }, [router]);

  // Run Real-time Admission Chance Probability Tester
  const handleTestProbability = async () => {
    if (!selectedTesterUnivId || !profile) return;
    setCalculatingChance(true);
    
    // Call calculation function
    const univId = Number(selectedTesterUnivId);
    await calculateAndSavePrediction(profile.id, univId);
    
    // Refresh predictions and retrieve result
    const preds = await getAdmissionPredictions(profile.id);
    setPredictions(preds);
    
    const matchedPred = preds.find(p => p.university_id === univId);
    if (matchedPred) {
      setTesterResult(matchedPred);
    }
    
    setCalculatingChance(false);
  };

  const handlePayAccommodationDeposit = async (bookingId: number) => {
    setPayingBookingId(bookingId);
    try {
      const res = await payAccommodationDeposit(bookingId);
      if (res.success) {
        alert('Payment of deposit successful! Your accommodation booking is confirmed.');
        if (profile) {
          const rooms = await getStudentRoomBookings(profile.id);
          setRoomBookings(rooms);
        }
      } else {
        alert(res.error || 'Failed to complete deposit payment.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayingBookingId(null);
    }
  };

  const handlePayFlightTicket = async (bookingId: number) => {
    setPayingFlightId(bookingId);
    try {
      const res = await payFlightTicket(bookingId);
      if (res.success) {
        alert('Payment of ticket successful! Your flight booking is confirmed.');
        if (profile) {
          const travels = await getStudentFlightBookings(profile.id);
          setFlightBookings(travels);
        }
      } else {
        alert(res.error || 'Failed to complete flight payment.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayingFlightId(null);
    }
  };

  const handleCancelRoomBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this accommodation booking request? This will restore room availability.')) return;
    setCancellingBookingId(bookingId);
    try {
      const res = await cancelRoomBooking(bookingId);
      if (res.success) {
        alert('Accommodation booking request successfully cancelled.');
        if (profile) {
          const rooms = await getStudentRoomBookings(profile.id);
          setRoomBookings(rooms || []);
        }
      } else {
        alert(res.error || 'Failed to cancel booking.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingBookingId(null);
    }
  };

  const handleCancelFlightBooking = async (booking: any) => {
    const isPaidOrConfirmed = booking.status === 'confirmed' || booking.status === 'paid';
    const confirmMessage = isPaidOrConfirmed
      ? `Are you sure you want to cancel your confirmed boarding pass? A full refund of $${Math.round(Number(booking.total_cost))} will be automatically processed back to your original payment method. This will release the assigned seat(s).`
      : 'Are you sure you want to cancel this flight booking request? This will free up the seats.';

    if (!confirm(confirmMessage)) return;
    setCancellingFlightId(booking.id);
    try {
      const res = await cancelFlightBooking(booking.id);
      if (res.success) {
        const successMessage = isPaidOrConfirmed
          ? `Flight booking successfully cancelled. A full refund of $${Math.round(Number(booking.total_cost))} has been credited back to your account.`
          : 'Flight booking request successfully cancelled.';
        alert(successMessage);
        if (profile) {
          const travels = await getStudentFlightBookings(profile.id);
          setFlightBookings(travels || []);
        }
      } else {
        alert(res.error || 'Failed to cancel flight booking.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingFlightId(null);
    }
  };

  const handleConfirmFlightReview = async () => {
    if (!activeReviewBooking || !profile) return;
    setSubmittingReview(true);
    try {
      const res = await submitFlightReview(
        activeReviewBooking.package_id,
        profile.name || 'Anonymous Student',
        reviewRating,
        reviewText.trim()
      );
      if (res.success) {
        alert('Thank you for your rating and review!');
        setActiveReviewBooking(null);
        setReviewText('');
        setReviewRating(5);
        const travels = await getStudentFlightBookings(profile.id);
        setFlightBookings(travels || []);
      } else {
        alert(res.error || 'Failed to submit review.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  };


  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setUpdating(true);
    const res = await updateStudentProfile(profile.id, {
      name,
      degree,
      department,
      cgpa: Number(cgpa),
      budget,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      nationality,
      currentCountry,
      avatarUrl
    });

    if (res.success) {
      if (res.predictedCurrency) {
        await changeCurrency(res.predictedCurrency);
      }

      // Refresh local profile state
      const updatedProfile = await getStudentProfile(user!.id);
      setProfile(updatedProfile);
      
      const preds = await getAdmissionPredictions(profile.id);
      setPredictions(preds);

      // Reload leaderboard
      const leaderboardData = await getLeaderboard();
      setLeaderboard(leaderboardData);

      setEditMode(false);
    } else {
      alert('Failed to update profile.');
    }
    setUpdating(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Image size must be less than 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleMilestone = async (milestone: string) => {
    if (!profile) return;
    const updated = completedMilestones.includes(milestone)
      ? completedMilestones.filter(m => m !== milestone)
      : [...completedMilestones, milestone];
    
    setCompletedMilestones(updated);
    await updateStudentMilestones(profile.id, updated);
  };

  // Saved Items removal triggers
  const handleUnsaveUniv = async (univId: number) => {
    if (!profile) return;
    const res = await toggleSaveUniversity(univId, profile.id, true);
    if (res.success) {
      setSavedItems((prev: any) => ({
        ...prev,
        universities: prev.universities.filter((u: any) => u.id !== univId)
      }));
    }
  };

  const handleUnsaveCourse = async (courseId: number) => {
    if (!profile) return;
    const res = await toggleSaveCourse(courseId, profile.id, true);
    if (res.success) {
      setSavedItems((prev: any) => ({
        ...prev,
        courses: prev.courses.filter((c: any) => c.id !== courseId)
      }));
    }
  };

  const handleUnsaveSch = async (schId: number) => {
    if (!profile) return;
    const res = await toggleSaveScholarship(schId, profile.id, true);
    if (res.success) {
      setSavedItems((prev: any) => ({
        ...prev,
        scholarships: prev.scholarships.filter((s: any) => s.id !== schId)
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-dark animate-spin mb-4" />
        <p className="text-sm text-slate-600 font-medium">Assembling your academic dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* 1. Onboarding Check Banner */}
      {!profile?.onboarding_completed && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-teal-dark/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-teal-sunrise" />
          <div className="space-y-1.5 text-center md:text-left">
            <h2 className="text-md font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="h-4.5 w-4.5 text-teal-bright animate-pulse" />
              <span>Complete Your AI Onboarding Profile</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Unlock personalized course recommendations, circular match gauges, visa guidance step checklists, and real-time eligibility scores by setting up your academic background.
            </p>
          </div>
          <button
            onClick={() => router.push('/student/onboarding')}
            className="px-5 py-2.5 bg-gradient-teal-sunrise text-slate-900 font-extrabold text-xs rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] shrink-0"
          >
            Start Onboarding (4 Steps)
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5 w-full">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.name || 'Student'} 
              className="h-14 w-14 rounded-full object-cover border-2 border-teal-dark shadow-md shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-teal-dark/10 border border-teal-dark/20 flex items-center justify-center text-teal-dark shrink-0">
              <User className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center flex-wrap gap-3">
              Welcome back, <span className="text-gradient-teal-sunrise">{profile?.name || user?.name}</span>
            <span className="inline-flex items-center gap-2">
              {profile?.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg hover:bg-slate-100 text-teal-dark hover:text-teal-bright transition-colors" title="LinkedIn Profile">
                  <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                </a>
              )}
              {profile?.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg hover:bg-slate-100 text-teal-dark hover:text-teal-bright transition-colors" title="GitHub Profile">
                  <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
                </a>
              )}
              {profile?.portfolio_url && (
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg hover:bg-slate-100 text-teal-dark hover:text-teal-bright transition-colors" title="Portfolio Website">
                  <Globe className="h-4.5 w-4.5" />
                </a>
              )}
            </span>
          </h1>
          <p className="text-xs text-slate-655 mt-1">
            Track admission rates, update target degrees, and follow your pre-enrollment milestones.
          </p>
        </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-dark text-white font-bold px-4 py-2 text-xs hover:bg-teal-bright transition-all cursor-pointer shadow-md"
          >
            <Settings className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Widgets Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Profile Completion */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="rounded-xl bg-teal-dark/10 p-3 text-teal-dark">
            <User className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Profile Completion</span>
            <span className="text-xl font-black text-slate-900">{profile?.onboarding_completed ? '100%' : '35%'}</span>
            <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-teal-dark h-full" style={{ width: profile?.onboarding_completed ? '100%' : '35%' }} />
            </div>
          </div>
        </div>

        {/* Metric 2: AI Readiness */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">AI Readiness Score</span>
            <span className="text-xl font-black text-slate-900">
              {profile?.ai_readiness_score > 0 ? profile.ai_readiness_score : (
                profile?.onboarding_completed ? Math.min(100, 45 + Math.round((Number(profile?.cgpa) || 3) * 10)) : 25
              )}/100
            </span>
            <span className="text-[9px] text-slate-500 block mt-1">
              {profile?.onboarding_completed ? 'Based on CGPA, skills & exams' : 'Complete onboarding to improve'}
            </span>
          </div>
        </div>

        {/* Metric 3: Scholarship Eligibility */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Scholarship Odds</span>
            <span className="text-xl font-black text-slate-900">
              {profile?.scholarship_eligibility_score > 0 ? profile.scholarship_eligibility_score : (
                profile?.onboarding_completed ? Math.min(100, 40 + (Number(profile?.cgpa) >= 3.7 ? 30 : Number(profile?.cgpa) >= 3.3 ? 15 : 0)) : 20
              )}%
            </span>
            <span className="text-[9px] text-slate-500 block mt-1">
              {profile?.onboarding_completed ? 'Based on CGPA & budget range' : 'Finish profile to unlock'}
            </span>
          </div>
        </div>

        {/* Metric 4: Admission Strength */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="rounded-xl bg-teal-bright/10 p-3 text-teal-dark animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Profile Strength</span>
            <span className="text-xl font-black text-slate-900">
              {profile?.admission_strength_score > 0 ? profile.admission_strength_score : (
                profile?.onboarding_completed ? Math.min(100, 50 + (Number(profile?.cgpa) >= 3.8 ? 20 : 0)) : 20
              )}/100
            </span>
            <span className="text-[9px] text-slate-500 block mt-1">
              {profile?.onboarding_completed ? 'CGPA + skills + experience' : 'Add skills & work experience'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column - Tester and Predictions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Eligibility Score Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal-dark" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-4">
              AI Global Eligibility Rating
            </span>
            
            <div className="relative inline-flex items-center justify-center mb-4">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-100"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-teal-dark"
                  fill="transparent"
                  strokeDasharray={289}
                  strokeDashoffset={289 - (289 * (profile?.eligibility_score || 50)) / 100}
                />
              </svg>
              <span className="absolute text-xl font-black text-slate-900">
                {profile?.eligibility_score || 50}%
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed max-w-xs mx-auto">
              Calculated using CGPA of <span className="font-bold text-teal-dark">{profile?.cgpa}</span> and budget of <span className="font-bold text-teal-dark">{formatPriceShort(Number(profile?.budget || 0), 'USD')}</span>. Setup your onboarding profile to recalibrate.
            </p>
          </div>

          {/* Dynamic Student Leaderboard Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="h-4.5 w-4.5 text-yellow-500 animate-pulse" />
                <span>Student Leaderboard</span>
              </h3>
              <button
                onClick={async () => {
                  const data = await getLeaderboard();
                  setLeaderboard(data);
                }}
                className="p-1 text-slate-400 hover:text-teal-dark rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                title="Refresh Leaderboard"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {leaderboard.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4 italic">Loading leader ranks...</div>
              ) : (
                leaderboard.map((student, idx) => (
                  <div 
                    key={idx} 
                    className={`flex justify-between items-center text-xs p-2.5 rounded-xl transition-all ${
                      student.name === (profile?.name || 'Ashwin') 
                        ? 'bg-teal-50 border border-teal-500/20 font-bold' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-slate-800 block font-semibold truncate max-w-[110px]">{student.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-right shrink-0">
                      <div>
                        <span className="text-slate-700 block text-[10px]">Lvl {student.level}</span>
                        <span className="text-[9px] text-slate-450 block">{student.xp} XP</span>
                      </div>
                      <div className="bg-teal-500/10 text-teal-700 px-2 py-1 rounded-lg text-[10px] font-extrabold min-w-[42px] text-center">
                        {student.ep} EP
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Saved Admission Predictions List */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3">
              AI Admission Probabilities
            </h3>
            
            {predictions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No university probabilities generated yet. Save universities to trigger predictions.</p>
            ) : (
              <div className="space-y-3">
                {predictions.map(pred => {
                  const statusColors = {
                    safe: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                    moderate: 'bg-amber-50 border-amber-200 text-amber-700',
                    dream: 'bg-orange-55 border-orange-200 text-orange-700',
                  };
                  return (
                    <div key={pred.id} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 truncate pr-4">{pred.university_name}</span>
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${
                          statusColors[pred.status as 'safe'|'moderate'|'dream']
                        }`}>
                          {pred.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex-grow bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className={`h-full transition-all ${
                            pred.probability >= 70 ? 'bg-emerald-600' : pred.probability >= 40 ? 'bg-amber-500' : 'bg-orange-550'
                          }`} style={{ width: `${pred.probability}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 shrink-0">{pred.probability}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Center/Right columns - Timeline Roadmap and Saved Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Custom Recommendations Block */}
          {profile?.onboarding_completed && (
            <div className="bg-slate-900 border border-teal-dark/30 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-teal-sunrise" />
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-teal-bright animate-pulse" />
                  <span>AI Personalized Matches (Based on DNA Profile)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Recommended Universities */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-teal-bright uppercase tracking-wider block">Universities</span>
                  {recommendedUnivs.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No matches. Try updating your target countries.</p>
                  ) : (
                    <div className="space-y-2">
                      {recommendedUnivs.map(u => (
                        <div key={u.id} className="text-xs border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                          <span className="font-semibold text-white block truncate">{u.name}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {u.country_name} &bull; Rank #{u.ranking}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended Courses */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-teal-bright uppercase tracking-wider block">Course Fields</span>
                  {recommendedCourses.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No matches. Try updating your target department.</p>
                  ) : (
                    <div className="space-y-2">
                      {recommendedCourses.map(c => (
                        <div key={c.id} className="text-xs border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                          <span className="font-semibold text-white block truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{c.university_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended Scholarships */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-teal-bright uppercase tracking-wider block">Scholarships</span>
                  {recommendedSchs.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No matches. Try matching your CGPA details.</p>
                  ) : (
                    <div className="space-y-2">
                      {recommendedSchs.map(s => (
                        <div key={s.id} className="text-xs border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                          <span className="font-semibold text-white block truncate">{s.name}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{s.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Roadmap */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Compass className="h-5 w-5 text-teal-dark" />
                <span>Personalized Pre-Enrollment Roadmap</span>
              </h3>
              <span className="rounded-lg bg-teal-dark/10 px-2 py-0.5 text-[10px] font-bold text-teal-dark">
                Active Pathway
              </span>
            </div>

            {roadmap.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No roadmap steps populated. Complete your profile details first.</p>
            ) : (
              <div className="relative pl-6 border-l border-slate-200 space-y-5">
                {roadmap.map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle indicators */}
                    <div className="absolute -left-[31px] top-0.5 bg-white p-0.5 rounded-full z-10">
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-teal-dark" />
                      ) : step.status === 'in_progress' ? (
                        <Play className="h-5 w-5 text-orange-500 fill-orange-500 animate-pulse" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-800">{step.title}</h4>
                        <span className="text-[10px] text-slate-500">{step.date}</span>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Academics & Roadmap Guidance Widgets */}
          {profile?.onboarding_completed && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="h-4.5 w-4.5 text-teal-dark" />
                  <span>Academics & Roadmap Guidance</span>
                </h3>

                {/* Tab controls */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                  <button
                    onClick={() => setActiveGuidanceTab('exams')}
                    className={`px-2 py-1 font-bold rounded-md transition-all cursor-pointer border-0 ${
                      activeGuidanceTab === 'exams' ? 'bg-white text-teal-dark shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    Exams
                  </button>
                  <button
                    onClick={() => setActiveGuidanceTab('milestones')}
                    className={`px-2 py-1 font-bold rounded-md transition-all cursor-pointer border-0 ${
                      activeGuidanceTab === 'milestones' ? 'bg-white text-teal-dark shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    Milestones
                  </button>
                </div>
              </div>

              {/* Tab content 4: Required Entrance Exams */}
              {activeGuidanceTab === 'exams' && (
                <div className="space-y-3">
                  {requiredExams.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <ShieldAlert className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-550 font-medium">No entrance exams are required by your bookmarked courses.</p>
                      <p className="text-[10px] text-slate-450 mt-0.5">Save courses to see mandatory exams like IELTS, TOEFL, GRE, or GATE here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {requiredExams.map((ex: any) => (
                        <div key={ex.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900">{ex.name} ({ex.full_name})</span>
                              <span className="bg-teal-dark/10 text-teal-dark font-bold px-1.5 py-0.5 rounded text-[9px]">
                                Min: {ex.min_score || 'N/A'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Required for: {ex.course_name} at {ex.university_name}</span>
                            
                            {ex.syllabus && (
                              <div className="mt-2 text-[10px] text-slate-650">
                                <span className="font-bold text-slate-755 block mb-0.5">Syllabus Overview</span>
                                <p className="line-clamp-2">{ex.syllabus}</p>
                              </div>
                            )}

                            {ex.resources_json?.prep_books && (
                              <div className="mt-2 text-[10px] text-slate-650">
                                <span className="font-bold text-slate-755 block mb-0.5">Recommended Books</span>
                                <ul className="list-disc pl-3.5 space-y-0.5">
                                  {ex.resources_json.prep_books.slice(0, 2).map((bk: string, i: number) => (
                                    <li key={i}>{bk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between items-center flex-wrap gap-2">
                            {ex.registration_link && (
                              <a
                                href={ex.registration_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-teal-dark font-extrabold hover:underline"
                              >
                                Register Online →
                              </a>
                            )}
                            {ex.test_dates?.upcoming && (
                              <span className="text-[9px] text-slate-500 font-medium">
                                Next Date: {ex.test_dates.upcoming[0] || 'N/A'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab content 5: Milestones Tracker */}
              {activeGuidanceTab === 'milestones' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">Pre-Enrollment Track Milestones</span>
                    <span className="text-[10px] text-teal-dark font-bold">
                      {completedMilestones.length} / 5 Completed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: 'sop_drafted', label: 'Statement of Purpose (SOP) Drafted', desc: 'Write a compelling personal statement outlining goals.' },
                      { id: 'lors_secured', label: 'Letters of Recommendation (LOR) Secured', desc: 'Collect 2-3 academic or professional recommendation letters.' },
                      { id: 'univs_applied', label: 'University Applications Submitted', desc: 'Submit completed portals and pay processing fees.' },
                      { id: 'offer_received', label: 'Admit Offer Letter Received', desc: 'Secure an official admission or conditional offer letter.' },
                      { id: 'visa_approved', label: 'Student Visa Approved', desc: 'Successfully clear embassy interviews and receive visa stamp.' }
                    ].map(item => {
                      const isDone = completedMilestones.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          onClick={() => handleToggleMilestone(item.id)}
                          className={`p-3 rounded-xl border flex items-start gap-3 transition-all cursor-pointer select-none ${
                            isDone 
                              ? 'bg-teal-dark/5 border-teal-dark/30 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className={`mt-0.5 rounded-md p-0.5 ${isDone ? 'text-teal-dark' : 'text-slate-400'}`}>
                            {isDone ? <CheckCircle className="h-4.5 w-4.5" /> : <Circle className="h-4.5 w-4.5" />}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${isDone ? 'text-teal-dark line-through' : 'text-slate-800'}`}>{item.label}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">{item.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submitted Applications */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-4 flex items-center justify-between">
              <span>Submitted Applications Status</span>
              <span className="text-[10px] text-[#00A896] bg-teal-50 border border-teal-100 font-extrabold px-2 py-0.5 rounded-full uppercase">
                {applications.length} Active
              </span>
            </h3>
            
            {applications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                You haven't submitted any course applications yet. Explore universities and courses to apply!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applications.map((app: any) => {
                  const getStatusBadge = (status: string) => {
                    const s = status ? status.toLowerCase() : 'submitted';
                    if (s === 'accepted') {
                      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    }
                    if (s === 'rejected') {
                      return 'bg-rose-50 text-rose-700 border-rose-200';
                    }
                    if (s === 'waitlisted') {
                      return 'bg-amber-50 text-amber-700 border-amber-200';
                    }
                    if (s === 'under_review') {
                      return 'bg-blue-50 text-blue-700 border-blue-200';
                    }
                    return 'bg-slate-50 text-slate-700 border-slate-200';
                  };

                  const getStatusLabel = (status: string) => {
                    const s = status ? status.toLowerCase() : 'submitted';
                    if (s === 'accepted') return 'Accepted / Approved';
                    if (s === 'rejected') return 'Rejected';
                    if (s === 'waitlisted') return 'Waitlisted';
                    if (s === 'under_review') return 'Under Review';
                    return 'Submitted (Pending)';
                  };

                  return (
                    <div key={app.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all">
                      <div className="flex gap-3 items-start">
                        <div className="h-10 w-10 bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-inner">
                          {app.logo_url ? (
                            <img src={app.logo_url} alt={app.university_name} className="h-full w-full object-contain" />
                          ) : (
                            <Landmark className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="space-y-0.5 truncate">
                          <span className="font-extrabold text-slate-900 text-xs block truncate">{app.course_name}</span>
                          <span className="text-[10px] font-bold text-slate-650 block truncate">{app.university_name}</span>
                          <span className="text-[9px] text-slate-400 block">Applied on: {new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Status:</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border uppercase tracking-wide ${getStatusBadge(app.status)}`}>
                          {getStatusLabel(app.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stay and Flight Bookings Tracker */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 md:col-span-2 text-slate-800">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-4 flex items-center justify-between">
              <span>Your Stay & Flight Bookings</span>
              <span className="text-[10px] text-teal-dark font-extrabold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                {roomBookings.length + flightBookings.length} Total Bookings
              </span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Stay Bookings */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="h-4.5 w-4.5 text-teal-650" />
                  <span>Stay Bookings</span>
                </h4>
                {roomBookings.length === 0 ? (
                  <p className="text-xs text-slate-450 italic bg-slate-50 border border-slate-100 p-4 rounded-xl">No accommodation bookings requested yet.</p>
                ) : (
                  <div className="space-y-3.5">
                    {roomBookings.map((booking: any) => (
                      <div key={booking.id} className="p-4 rounded-xl border border-slate-200/85 bg-white shadow-sm flex flex-col justify-between gap-3 text-xs text-slate-800">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-slate-900 block capitalize">{booking.property_title}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                              booking.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              booking.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              booking.status === 'cancelled' ? 'bg-slate-100 text-slate-700' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-1">{booking.property_address}</span>
                          {booking.room_type && (
                            <span className="text-[10px] text-teal-650 font-bold block mt-1">
                              Room Type: {booking.room_type}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-455 block mt-1 font-semibold">
                            Dates: {new Date(booking.check_in_date).toLocaleDateString()} to {new Date(booking.check_out_date).toLocaleDateString()}
                          </span>
                          {booking.document_url && (
                            <span className="text-[9px] font-bold text-slate-450 block mt-0.5">
                              Doc: {booking.document_url.split('/').pop()}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 block mt-1 font-bold">
                            Total cost: ${Math.round(Number(booking.total_cost))}
                          </span>
                        </div>

                        {booking.status === 'approved' && (
                          <button
                            onClick={() => handlePayAccommodationDeposit(booking.id)}
                            disabled={payingBookingId === booking.id}
                            className="w-full mt-2 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider shadow-sm hover:scale-[1.01] transition-transform border-0 cursor-pointer flex items-center justify-center gap-1"
                          >
                            {payingBookingId === booking.id ? (
                              <>
                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                <span>Processing Payment...</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-4 w-4" />
                                <span>Pay Deposit & Confirm Stay</span>
                              </>
                            )}
                          </button>
                        )}
                        {booking.status === 'paid' && (
                          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-[10px] font-bold flex items-center justify-center gap-1.5 uppercase tracking-wide">
                            <ShieldCheck className="h-4 w-4 text-emerald-650" />
                            <span>Booking Confirmed! Stay Secured</span>
                          </div>
                        )}
                        {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                          <button
                            onClick={() => handleCancelRoomBooking(booking.id)}
                            disabled={cancellingBookingId === booking.id}
                            className="w-full mt-1 py-1.5 border border-rose-250 hover:border-rose-400 hover:bg-rose-50 text-rose-600 font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 bg-transparent"
                          >
                            {cancellingBookingId === booking.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Cancelling...</span>
                              </>
                            ) : (
                              <span>Cancel Request / Booking</span>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Flight Bookings */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plane className="h-4.5 w-4.5 text-teal-650" />
                  <span>Flight Bookings</span>
                </h4>
                {flightBookings.length === 0 ? (
                  <p className="text-xs text-slate-450 italic bg-slate-50 border border-slate-100 p-4 rounded-xl">No flight package bookings requested yet.</p>
                ) : (
                  <div className="space-y-3.5">
                    {flightBookings.map((booking: any) => {
                      const isConfirmed = booking.status === 'confirmed' || booking.status === 'paid';
                      const details = booking.booking_details ? (typeof booking.booking_details === 'string' ? JSON.parse(booking.booking_details) : booking.booking_details) : {};
                      
                      return (
                        <div key={booking.id} className="p-0.5 rounded-3xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col gap-0 text-xs text-slate-805">
                          {/* Boarding Pass Tear-off Container */}
                          {isConfirmed ? (
                            <div className="bg-white text-slate-800 p-5 relative overflow-hidden flex flex-col md:flex-row gap-4 justify-between items-stretch rounded-t-3xl">
                              {/* Left Side: Passenger & Flight Details */}
                              <div className="space-y-4 flex-1">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-teal-600 rotate-45" />
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">Boarding Pass</span>
                                      <span className="text-sm font-black text-slate-900">{booking.flight_info}</span>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-0.5 bg-emerald-50 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-100 rounded">
                                    Confirmed
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-2 text-[11px] font-bold">
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Primary Passenger</span>
                                    <span className="text-slate-800 truncate block">{booking.passenger_name}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Passport Number</span>
                                    <span className="text-slate-800 block uppercase">{booking.passport_number}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Seats Assigned</span>
                                    <span className="text-teal-650 block">
                                      {details.selectedSeats && details.selectedSeats.length > 0 
                                        ? details.selectedSeats.join(', ') 
                                        : `Row ${booking.id} Standard`}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Class / Fare</span>
                                    <span className="text-slate-800 block">{details.cabinClass || 'Economy'} Class</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Travel Agency</span>
                                    <span className="text-slate-800 block truncate">{booking.travel_agency_name || 'Horizon Global'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Price Paid</span>
                                    <span className="text-teal-600 block font-black">${Math.round(Number(booking.total_cost))}</span>
                                  </div>
                                </div>

                                {/* Render Passenger List if seats > 1 */}
                                {details.passengers && details.passengers.length > 1 && (
                                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] space-y-1">
                                    <span className="text-[8px] text-slate-450 block uppercase font-black">All Seat Passengers</span>
                                    <div className="grid grid-cols-2 gap-1 font-medium">
                                      {details.passengers.map((p: any, i: number) => (
                                        <div key={i} className="truncate text-slate-700 font-semibold">
                                          {i + 1}. {p.name} ({p.passport})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Divider line with holes to represent perforated coupon tear off */}
                              <div className="border-t md:border-t-0 md:border-l border-dashed border-slate-200 my-2 md:my-0 md:mx-4 relative">
                                <div className="hidden md:block absolute top-0 -left-[9px] w-4.5 h-4.5 bg-slate-50 rounded-full border border-slate-200/50" />
                                <div className="hidden md:block absolute bottom-0 -left-[9px] w-4.5 h-4.5 bg-slate-50 rounded-full border border-slate-200/50" />
                              </div>

                              {/* Right Side: tear-off coupon details */}
                              <div className="md:w-44 flex flex-col justify-between space-y-3 md:text-right">
                                <div>
                                  <span className="text-[8px] text-slate-400 uppercase block mb-0.5">Electronic Ticket #</span>
                                  <span className="text-sm font-mono font-black text-teal-650 block tracking-wider">
                                    {booking.ticket_number || `TKT-${100000 + booking.id}`}
                                  </span>
                                </div>
                                <div className="text-[10px] space-y-1 font-semibold text-slate-650">
                                  <div>Boarding: 45m before dept</div>
                                  <div>Gate closes: 15m before</div>
                                  <div>Checked bag: 40kg allowance</div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <button
                                    onClick={() => {
                                      setActiveReviewBooking(booking);
                                      setReviewRating(5);
                                      setReviewText('');
                                    }}
                                    className="w-full py-1.5 bg-gradient-teal-sunrise text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-wider hover:scale-[1.02] transition-transform cursor-pointer border-0 shadow-sm"
                                  >
                                    Write Review
                                  </button>
                                  <button
                                    onClick={() => handleCancelFlightBooking(booking)}
                                    disabled={cancellingFlightId === booking.id}
                                    className="w-full py-1.5 border border-rose-250 hover:border-rose-400 hover:bg-rose-50 text-rose-600 font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 bg-transparent shadow-sm"
                                  >
                                    {cancellingFlightId === booking.id ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Cancelling...</span>
                                      </>
                                    ) : (
                                      <span>Cancel Booking</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Standard pending/approved ticket booking details */
                            <div className="p-5 flex flex-col gap-3">
                              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                <div>
                                  <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Flight Route Deal</span>
                                  <h4 className="font-extrabold text-slate-900 leading-tight">{booking.flight_info}</h4>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                  booking.status === 'approved' ? 'bg-blue-50 border border-blue-100 text-blue-700' :
                                  booking.status === 'rejected' ? 'bg-rose-50 border border-rose-100 text-rose-700' :
                                  booking.status === 'cancelled' ? 'bg-slate-50 border border-slate-200 text-slate-700' :
                                  'bg-amber-50 border border-amber-100 text-amber-700'
                                }`}>
                                  {booking.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-y-2 text-[11px] font-bold text-slate-700">
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase">Lead Passenger</span>
                                  <span>{booking.passenger_name} ({booking.seats_count} Ticket{booking.seats_count > 1 ? 's' : ''})</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase">Passport Number</span>
                                  <span className="uppercase">{booking.passport_number}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase">Travel Agency</span>
                                  <span>{booking.travel_agency_name || 'Horizon Global'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-400 block uppercase">Price Due</span>
                                  <span className="text-slate-900 font-extrabold">${Math.round(Number(booking.total_cost))}</span>
                                </div>
                              </div>

                              {details.passengers && details.passengers.length > 1 && (
                                <div className="bg-slate-50 p-2 rounded-xl text-[10px] space-y-0.5 text-slate-650 border border-slate-100">
                                  <span className="text-[8px] font-bold text-slate-400 block uppercase">All Passengers</span>
                                  <div className="grid grid-cols-2 gap-x-2 font-medium">
                                    {details.passengers.map((p: any, i: number) => (
                                      <div key={i} className="truncate">
                                        {i + 1}. {p.name} ({p.passport})
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {booking.status === 'approved' && (
                                <button
                                  onClick={() => handlePayFlightTicket(booking.id)}
                                  disabled={payingFlightId === booking.id}
                                  className="w-full py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow hover:scale-[1.01] transition-transform border-0 cursor-pointer flex items-center justify-center gap-1"
                                >
                                  {payingFlightId === booking.id ? (
                                    <>
                                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                      <span>Processing Payment...</span>
                                    </>
                                  ) : (
                                    <>
                                      <DollarSign className="h-4 w-4" />
                                      <span>Pay Invoice (${Math.round(Number(booking.total_cost))})</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                                <button
                                  onClick={() => handleCancelFlightBooking(booking)}
                                  disabled={cancellingFlightId === booking.id}
                                  className="w-full py-1.5 border border-rose-250 hover:border-rose-350 hover:bg-rose-50 text-rose-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 bg-transparent"
                                >
                                  {cancellingFlightId === booking.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      <span>Cancelling...</span>
                                    </>
                                  ) : (
                                    <span>Cancel Booking Request</span>
                                  )}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Bulletins Sent by Agency */}
                          {details.notifications && details.notifications.length > 0 && (
                            <div className="bg-blue-50 border-t border-blue-150 p-4 space-y-2 text-[10px] text-blue-900 font-semibold leading-relaxed">
                              <span className="text-[8px] font-black text-blue-800 uppercase tracking-wider block">Flight Travel Bulletin updates</span>
                              <div className="space-y-1.5">
                                {details.notifications.map((n: any, i: number) => (
                                  <div key={i} className="flex gap-2 items-start bg-white/70 p-2 rounded-lg border border-blue-200">
                                    <Sparkles className="h-3.5 w-3.5 text-blue-650 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="block text-slate-800 text-[10px]">{n.message}</span>
                                      <span className="block text-[8px] text-slate-400 font-medium mt-0.5">
                                        {new Date(n.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Bookmarked Items */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-4">
              Your Bookmarked Items
            </h3>
            
            <div className="space-y-6">
              {/* Saved Universities */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  Saved Universities
                </span>
                {savedItems.universities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-1">No bookmarked universities yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedItems.universities.map((univ: any) => (
                      <div key={univ.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                        <div className="truncate pr-4">
                          <span className="font-semibold block truncate text-slate-800">{univ.name}</span>
                          <span className="text-[10px] text-slate-500">{univ.country_name}</span>
                        </div>
                        <button
                          onClick={() => handleUnsaveUniv(univ.id)}
                          className="text-teal-dark hover:text-orange-500 transition-colors p-1"
                        >
                          <Star className="h-4 w-4 fill-teal-dark text-teal-dark hover:text-orange-500 hover:fill-none cursor-pointer" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Courses */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  Saved Courses
                </span>
                {savedItems.courses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-1">No bookmarked courses yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {savedItems.courses.map((course: any) => (
                      <div key={course.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                        <div>
                          <span className="font-semibold text-slate-800">{course.name}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{course.university_name} &bull; {course.degree_type}</span>
                        </div>
                        <button
                          onClick={() => handleUnsaveCourse(course.id)}
                          className="text-teal-dark hover:text-orange-500 transition-colors p-1"
                        >
                          <Star className="h-4 w-4 fill-teal-dark text-teal-dark hover:text-orange-500 hover:fill-none cursor-pointer" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Scholarships */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  Saved Scholarships
                </span>
                {savedItems.scholarships.length === 0 ? (
                  <p className="text-xs text-slate-400 italic pl-1">No bookmarked scholarships yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {savedItems.scholarships.map((sch: any) => (
                      <div key={sch.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                        <div>
                          <span className="font-semibold text-slate-800">{sch.name}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Amount: {sch.amount}</span>
                        </div>
                        <button
                          onClick={() => handleUnsaveSch(sch.id)}
                          className="text-teal-dark hover:text-orange-500 transition-colors p-1"
                        >
                          <Star className="h-4 w-4 fill-teal-dark text-teal-dark hover:text-orange-500 hover:fill-none cursor-pointer" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Form Modal */}
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 overflow-y-auto py-10">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl relative my-auto">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-5">
              Edit Academic & Social Profile
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              
              {/* Profile Picture Upload Section */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={avatarUrl}
                        alt="Profile Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-teal-dark shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 shadow-md transition-colors"
                        title="Remove Image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-teal-dark/10 border border-teal-dark/25 flex items-center justify-center text-teal-dark shrink-0">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex-grow">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-extrabold file:bg-teal-dark/10 file:text-teal-dark hover:file:bg-teal-dark/20 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, or WEBP. Max size 1MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    required
                  />
                </div>

                {/* CGPA */}
                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1.5 uppercase">CGPA (4.0 or 10.0 scale)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    max="10.00"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    required
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5 uppercase">Nationality</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    placeholder="e.g. Indian, Canadian, German"
                    required
                  />
                </div>

                {/* Current Country */}
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5 uppercase">Current Country</label>
                  <input
                    type="text"
                    value={currentCountry}
                    onChange={(e) => setCurrentCountry(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    placeholder="e.g. India, Canada, Germany"
                    required
                  />
                </div>

                {/* Degree Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1.5 uppercase">Target Degree</label>
                  <select
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark cursor-pointer shadow-sm"
                  >
                    <option value="MS">MS</option>
                    <option value="MSc">MSc</option>
                    <option value="MBA">MBA</option>
                    <option value="PhD">PhD</option>
                    <option value="BS">BS</option>
                    <option value="BSc">BSc</option>
                    <option value="B.Tech">B.Tech</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1.5 uppercase">Department / Major</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    required
                  />
                </div>

                {/* Budget */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5 uppercase">Annual Budget (USD)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Social links */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5 uppercase">LinkedIn URL</label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1.5 uppercase">GitHub URL</label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-655 mb-1.5 uppercase">Portfolio Website URL</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2.5 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-teal-dark text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer hover:bg-teal-bright"
                >
                  {updating ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
            )}

      {/* Flight Review & Star Rating Modal */}
      {activeReviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-xl text-slate-805 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Star className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500" />
                <span>Rate & Review Flight Deal</span>
              </h3>
              <button 
                onClick={() => setActiveReviewBooking(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-black mb-1">Flight Route Details</span>
                <span className="text-xs font-extrabold text-slate-800">{activeReviewBooking.flight_info}</span>
              </div>

              {/* Star Rating selector */}
              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-black mb-1.5">Select Flight Experience Rating</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="border-0 bg-transparent cursor-pointer hover:scale-110 transition-transform"
                    >
                      <Star className={`h-8 w-8 ${star <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-[10px] text-slate-455 uppercase font-black mb-1.5">Write Review Comment</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share details of your travel baggage convenience, transit smooth, seat comfort..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-3 text-xs focus:bg-white focus:outline-none focus:border-teal-dark transition-all resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveReviewBooking(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 text-slate-600 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReview || !reviewText.trim()}
                  onClick={handleConfirmFlightReview}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow hover:scale-[1.02] transition-transform border-0 cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
