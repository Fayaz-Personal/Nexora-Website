'use client';

import { useState, useEffect } from 'react';
import {
  Search, Landmark, MapPin, Star, ExternalLink, BookOpen, Clock, Loader2, X, ClipboardList, Award, ShieldAlert, Check, FileText
} from 'lucide-react';
import { getUniversities, getCourses, toggleSaveUniversity, toggleSaveCourse, getCountries, University, Course, earnPassportStamp, applyToCourse, getUniversitiesWithScholarships } from '@/app/actions/student';
import { getCurrentUser, UserSession } from '@/app/actions/auth';
import { useCurrency } from '@/components/CurrencyContext';
import { getUniScholarships } from '@/app/actions/uniAdmin';

export default function UniversitiesPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'universities' | 'courses'>('universities');
  const [loading, setLoading] = useState(true);

  // Application Modal States
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyCourseId, setApplyCourseId] = useState<number | null>(null);
  const [applyCourseName, setApplyCourseName] = useState('');
  const [selectedCourseForApply, setSelectedCourseForApply] = useState<Course | null>(null);
  const [sopText, setSopText] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);

  // Academic documents states
  const [cert10Name, setCert10Name] = useState<string | null>(null);
  const [cert10Data, setCert10Data] = useState<string | null>(null);
  const [cert12Name, setCert12Name] = useState<string | null>(null);
  const [cert12Data, setCert12Data] = useState<string | null>(null);
  const [ugName, setUgName] = useState<string | null>(null);
  const [ugData, setUgData] = useState<string | null>(null);
  const [tcName, setTcName] = useState<string | null>(null);
  const [tcData, setTcData] = useState<string | null>(null);
  const [migrationName, setMigrationName] = useState<string | null>(null);
  const [migrationData, setMigrationData] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [characterData, setCharacterData] = useState<string | null>(null);
  const [bonafideName, setBonafideName] = useState<string | null>(null);
  const [bonafideData, setBonafideData] = useState<string | null>(null);

  // Guidelines Modal States
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);
  const [isUnivSchModalOpen, setIsUnivSchModalOpen] = useState(false);
  const [selectedUnivForGuidelines, setSelectedUnivForGuidelines] = useState<University | null>(null);
  const [univScholarships, setUnivScholarships] = useState<any[]>([]);
  const [loadingUnivSch, setLoadingUnivSch] = useState(false);

  // Lists
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [countriesList, setCountriesList] = useState<{ id: number; name: string; code: string }[]>([]);
  const [displayLimit, setDisplayLimit] = useState(12);
  const [unisWithSch, setUnisWithSch] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('all');
  const [rankingMax, setRankingMax] = useState<number>(500);
  const [budgetMax, setBudgetMax] = useState<number>(80000);

  const [courseDegree, setCourseDegree] = useState('all');
  const [courseDept, setCourseDept] = useState('all');
  const [courseFeesMax, setCourseFeesMax] = useState<number>(80000);

  const { formatPrice } = useCurrency();
  const [newStampAlert, setNewStampAlert] = useState<string | null>(null);

  // Load User & Countries
  useEffect(() => {
    getCurrentUser().then(u => setUser(u));
    getCountries().then(list => setCountriesList(list));
  }, []);

  // Load University Specific Scholarships
  useEffect(() => {
    async function fetchUnivScholarships() {
      if (!selectedUnivForGuidelines) {
        setUnivScholarships([]);
        return;
      }
      setLoadingUnivSch(true);
      try {
        const list = await getUniScholarships(selectedUnivForGuidelines.name);
        setUnivScholarships(list);
      } catch (e) {
        console.error('Error loading university scholarships:', e);
      } finally {
        setLoadingUnivSch(false);
      }
    }
    fetchUnivScholarships();
  }, [selectedUnivForGuidelines]);

  // Earn stamp if viewing Germany, Canada or Australia
  useEffect(() => {
    async function checkAndEarnStamp() {
      if (user && user.profileId && (country === 'Germany' || country === 'Canada' || country === 'Australia')) {
        try {
          const res = await earnPassportStamp(user.profileId, country);
          if (res && res.success && !res.alreadyEarned) {
            setNewStampAlert(country);
            setTimeout(() => setNewStampAlert(null), 5000);
          }
        } catch (err) {
          console.error('Error earning stamp from dropdown:', err);
        }
      }
    }
    checkAndEarnStamp();
  }, [country, user]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    const profileId = user?.profileId;

    if (activeTab === 'universities') {
      const [data, schUnis] = await Promise.all([
        getUniversities({
          country,
          budgetMax: budgetMax || undefined,
          rankingMax: rankingMax || undefined,
          search: search || undefined
        }, profileId),
        getUniversitiesWithScholarships()
      ]);
      setUniversities(data);
      setUnisWithSch(schUnis);
    } else {
      const data = await getCourses({
        degreeType: courseDegree,
        department: courseDept,
        feesMax: courseFeesMax || undefined,
        search: search || undefined
      }, profileId);
      setCourses(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setDisplayLimit(12);
  }, [user, activeTab, country, rankingMax, budgetMax, courseDegree, courseDept, courseFeesMax, search]);

  // Handle saving university optimistically
  const handleSaveUniv = async (univ: University) => {
    if (!user || !user.profileId) {
      alert('Please sign in to save universities.');
      return;
    }
    const currentlySaved = !!univ.is_saved;
    // Optimistic Update
    setUniversities(prev => prev.map(u => u.id === univ.id ? { ...u, is_saved: !currentlySaved } : u));
    
    try {
      const res = await toggleSaveUniversity(univ.id, user.profileId, currentlySaved);
      if (!res.success) {
        // Revert on failure
        setUniversities(prev => prev.map(u => u.id === univ.id ? { ...u, is_saved: currentlySaved } : u));
        alert(res.error || 'Failed to update saved university.');
      }
    } catch (err) {
      // Revert on error
      setUniversities(prev => prev.map(u => u.id === univ.id ? { ...u, is_saved: currentlySaved } : u));
      console.error('Error saving university:', err);
    }
  };

  // Handle saving course optimistically
  const handleSaveCourse = async (course: Course) => {
    if (!user || !user.profileId) {
      alert('Please sign in to save courses.');
      return;
    }
    const currentlySaved = !!course.is_saved;
    // Optimistic Update
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_saved: !currentlySaved } : c));
    
    try {
      const res = await toggleSaveCourse(course.id, user.profileId, currentlySaved);
      if (!res.success) {
        // Revert on failure
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_saved: currentlySaved } : c));
        alert(res.error || 'Failed to update saved course.');
      }
    } catch (err) {
      // Revert on error
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_saved: currentlySaved } : c));
      console.error('Error saving course:', err);
    }
  };

  const closeApplyModal = () => {
    setIsApplyModalOpen(false);
    setSopText('');
    setCert10Name(null);
    setCert10Data(null);
    setCert12Name(null);
    setCert12Data(null);
    setUgName(null);
    setUgData(null);
    setTcName(null);
    setTcData(null);
    setMigrationName(null);
    setMigrationData(null);
    setCharacterName(null);
    setCharacterData(null);
    setBonafideName(null);
    setBonafideData(null);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.profileId || !applyCourseId) return;
    if (!cert10Data || !cert12Data || !ugData) {
      alert('Please upload all required academic documents (10th, 12th, and UG Marksheets).');
      return;
    }
    setSubmittingApply(true);
    const res = await applyToCourse(user.profileId, applyCourseId, sopText, {
      cert10Name: cert10Name || '',
      cert10Data: cert10Data || '',
      cert12Name: cert12Name || '',
      cert12Data: cert12Data || '',
      ugName: ugName || '',
      ugData: ugData || '',
      tcName: tcName || undefined,
      tcData: tcData || undefined,
      migrationName: migrationName || undefined,
      migrationData: migrationData || undefined,
      characterName: characterName || undefined,
      characterData: characterData || undefined,
      bonafideName: bonafideName || undefined,
      bonafideData: bonafideData || undefined
    });
    setSubmittingApply(false);
    if (res.success) {
      alert(`Successfully submitted application for: ${applyCourseName}! Check status in your Student Dashboard.`);
      closeApplyModal();
    } else {
      alert(res.error || 'Failed to submit application.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          University & Course <span className="text-gradient-teal-sunrise">Explorer</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Browse global degree pathways, filter by acceptance rate, tuition budget, rankings, and secure bookmarks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button
            onClick={() => { setActiveTab('universities'); setSearch(''); }}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'universities'
              ? 'bg-gradient-to-r from-teal-dark to-teal-bright text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
              }`}
          >
            <Landmark className="h-4 w-4" />
            Universities
          </button>
          <button
            onClick={() => { setActiveTab('courses'); setSearch(''); }}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'courses'
              ? 'bg-gradient-to-r from-teal-dark to-teal-bright text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
              }`}
          >
            <BookOpen className="h-4 w-4" />
            Courses
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Filters Side panel */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit space-y-6">
          <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>Filters</span>
          </h3>

          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Search Keywords
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark"
              />
            </div>
          </div>

          {activeTab === 'universities' ? (
            <>
              {/* Country Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark cursor-pointer"
                >
                  <option value="all">All Countries</option>
                  {countriesList.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Ranking Filter */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Max World Ranking
                  </label>
                  <span className="text-xs font-bold text-teal-dark">#{rankingMax}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="1500"
                  value={rankingMax}
                  onChange={(e) => setRankingMax(Number(e.target.value))}
                  className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>

              {/* Budget Filter */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Max Tuition (Year)
                  </label>
                  <span className="text-[10px] font-extrabold text-teal-dark">{formatPrice(budgetMax, 'USD')}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80000"
                  step="2000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>
            </>
          ) : (
            <>
              {/* Course Degree Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Degree Type
                </label>
                <select
                  value={courseDegree}
                  onChange={(e) => setCourseDegree(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark cursor-pointer"
                >
                  <option value="all">All Degrees</option>
                  <option value="MSc">MSc</option>
                  <option value="MS">MS</option>
                  <option value="MBA">MBA</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>

              {/* Course Department Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Department
                </label>
                <select
                  value={courseDept}
                  onChange={(e) => setCourseDept(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg text-slate-800 p-2 text-xs focus:outline-none focus:border-teal-dark/50 focus:ring-1 focus:ring-teal-dark cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Business">Business</option>
                  <option value="Information Technology">Information Technology</option>
                </select>
              </div>

              {/* Fees slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Max Annual Fees
                  </label>
                  <span className="text-[10px] font-extrabold text-teal-dark">{formatPrice(courseFeesMax, 'USD')}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80000"
                  step="2000"
                  value={courseFeesMax}
                  onChange={(e) => setCourseFeesMax(Number(e.target.value))}
                  className="w-full accent-teal-dark bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>
            </>
          )}

          <button
            onClick={() => {
              setSearch('');
              setCountry('all');
              setRankingMax(500);
              setBudgetMax(80000);
              setCourseDegree('all');
              setCourseDept('all');
              setCourseFeesMax(80000);
            }}
            className="w-full py-2.5 bg-teal-50/25 hover:bg-teal-50 border border-teal-600/20 hover:border-teal-600/45 rounded-xl text-xs font-bold transition-all cursor-pointer text-[#00A896]"
          >
            Clear Filters
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-teal-bright animate-spin mb-3" />
              <p className="text-xs text-slate-500">Loading matches from database...</p>
            </div>
          ) : activeTab === 'universities' ? (
            universities.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-teal-green/20">
                <Landmark className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-950">No Universities Found</p>
                <p className="text-xs text-slate-600 mt-1">Try widening your ranking, budget or search keywords filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {universities.slice(0, displayLimit).map(univ => (
                  <div key={univ.id} className="glass-card glass-card-hover rounded-2xl p-6 border border-teal-green/20 flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-teal-bright/10 flex items-center justify-center text-teal-bright font-bold text-sm">
                            {univ.name.split(' ').map(w => w[0]).join('').substring(0, 3)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 leading-tight hover:text-teal-dark transition-colors">
                              {univ.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                              <MapPin className="h-3 w-3 text-teal-green" />
                              <span>{univ.country_name}</span>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <button
                          onClick={() => handleSaveUniv(univ)}
                          className={`rounded-lg p-1.5 border transition-all cursor-pointer ${univ.is_saved
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                            : 'bg-white/40 border-teal-green/20 text-slate-700 hover:text-slate-950 hover:bg-white/60'
                            }`}
                        >
                          <Star className={`h-4 w-4 transition-all duration-300 ${univ.is_saved ? 'fill-amber-500 text-amber-500 scale-110' : ''}`} />
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-700 leading-relaxed mb-4 line-clamp-2">
                        {univ.description}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 bg-teal-dark/10 p-2.5 rounded-xl border border-teal-green/15 text-center mb-4">
                        <div>
                          <div className="text-[10px] font-semibold text-slate-600 uppercase">Rank</div>
                          <div className="text-xs font-bold text-teal-dark mt-0.5">#{univ.ranking}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-slate-600 uppercase">Tuition (Min)</div>
                          <div className="text-[11px] font-extrabold text-teal-dark mt-0.5">
                            {Number(univ.tuition_fee_min) === 0 ? 'Free' : formatPrice(Number(univ.tuition_fee_min), 'USD')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-2 border-t border-teal-green/15 pt-3 mt-2">
                      <a
                        href={univ.website?.startsWith('http') ? univ.website : `https://${univ.website}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 transition-colors"
                      >
                        <span>Visit Website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => {
                          setSelectedUnivForGuidelines(univ);
                          setIsGuidelinesModalOpen(true);
                        }}
                        className="text-xs font-semibold text-slate-700 hover:text-teal-dark flex items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>Guidelines</span>
                      </button>
                      {unisWithSch.includes(univ.name) && (
                        <button
                          onClick={() => {
                            setSelectedUnivForGuidelines(univ);
                            setIsUnivSchModalOpen(true);
                          }}
                          className="text-xs font-semibold text-slate-700 hover:text-teal-dark flex items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors"
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>Scholarships</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveTab('courses');
                          setCourseFeesMax(80000);
                          setSearch(univ.name);
                        }}
                        className="text-xs font-semibold text-teal-dark hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        View Courses &rarr;
                      </button>
                    </div>
                  </div>
                ))}

                {universities.length > displayLimit && (
                  <div className="flex justify-center mt-6 col-span-full">
                    <button
                      onClick={() => setDisplayLimit(prev => prev + 12)}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-dark to-teal-bright text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-xs"
                    >
                      Load More Universities ({universities.length - displayLimit} remaining)
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            courses.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-teal-green/20">
                <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-950">No Courses Found</p>
                <p className="text-xs text-slate-600 mt-1">Try relaxing degree filters or fee range sliders.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.slice(0, displayLimit).map(course => (
                  <div key={course.id} className="glass-card glass-card-hover rounded-2xl p-5 border border-teal-green/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="rounded-lg bg-teal-bright/10 px-2 py-0.5 text-[10px] font-bold text-teal-bright uppercase">
                          {course.degree_type}
                        </span>
                        <span className="text-xs text-slate-600">
                          {course.department}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-950">
                        {course.name}
                      </h3>
                      <p className="text-xs text-teal-dark font-medium">
                        {course.university_name} &bull; <span className="text-slate-650">{course.country_name}</span>
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-teal-green/15 pt-3 md:pt-0 gap-3">
                      <div className="text-right">
                        <div className="flex items-center text-xs font-bold text-slate-900 md:justify-end">
                          <span>{Number(course.fees) === 0 ? 'Tuition Free' : `${formatPrice(Number(course.fees), 'USD')}/yr`}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 md:justify-end mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{course.duration}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(!user || user.role === 'student') && (
                          <button
                            onClick={() => {
                              if (!user || !user.profileId) {
                                alert('Please sign in to submit a course application.');
                                return;
                              }
                              setApplyCourseId(course.id);
                              setApplyCourseName(course.name);
                              setSelectedCourseForApply(course);
                              setSopText('');
                              setIsApplyModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-teal-dark hover:bg-teal-700 text-white font-bold rounded-lg text-[10.5px] transition-all cursor-pointer border-0 shadow-sm"
                          >
                            Apply Now
                          </button>
                        )}
                        <button
                          onClick={() => handleSaveCourse(course)}
                          className={`rounded-lg p-1.5 border transition-all cursor-pointer ${course.is_saved
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                            : 'bg-white/40 border-teal-green/20 text-slate-700 hover:text-slate-950 hover:bg-white/60'
                            }`}
                        >
                          <Star className={`h-4 w-4 transition-all duration-300 ${course.is_saved ? 'fill-amber-500 text-amber-500 scale-110' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {courses.length > displayLimit && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setDisplayLimit(prev => prev + 15)}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-dark to-teal-bright text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-xs"
                    >
                      Load More Courses ({courses.length - displayLimit} remaining)
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
      {/* Passport Stamp Alert popup */}
      {newStampAlert && (
        <div className="fixed top-20 right-6 z-50 max-w-sm bg-slate-950 text-white rounded-2xl p-4 border border-teal-500/30 shadow-2xl flex items-center gap-3.5 animate-bounce">
          <div className="w-12 h-12 rounded-full bg-teal-500/25 border border-teal-400/40 flex items-center justify-center shrink-0">
            <span className="text-2xl">
              {newStampAlert === 'Germany' ? '🇩🇪' : newStampAlert === 'Canada' ? '🇨🇦' : '🇦🇺'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-widest block">Passport Stamp Earned!</span>
            <span className="text-xs font-bold block">{newStampAlert} Explorer</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Earned study destination stamp & +50 XP rewarded!</span>
          </div>
        </div>
      )}
      {/* Course Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex justify-between items-center shrink-0">
              <span>Apply for Course Admission</span>
              <button type="button" onClick={closeApplyModal} className="text-slate-400 hover:text-slate-650 cursor-pointer bg-transparent border-0"><X className="h-5 w-5" /></button>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 overflow-y-auto pr-1">
              
              {/* Left Column: Requirements & Procedures */}
              <div className="space-y-4 pr-0 md:pr-4 md:border-r border-slate-100 text-xs">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2 uppercase tracking-wide">
                  <ClipboardList className="h-4 w-4 text-teal-dark" />
                  <span>Admission Requirements</span>
                </h4>
                
                {/* Eligibility requirements */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    <span>Academic Eligibility</span>
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {selectedCourseForApply?.eligibility_requirements || "Standard academic eligibility criteria apply. Ensure you meet the department's grade points threshold."}
                  </p>
                </div>

                {/* Application procedure */}
                <div className="bg-teal-50/50 border border-teal-500/10 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>Application Steps</span>
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                    {selectedCourseForApply?.application_procedure || "1. Submit Statement of Purpose (SOP)\n2. Profile assessment & verification\n3. Interview / assessment if required\n4. Offer decision."}
                  </p>
                </div>
              </div>

              {/* Right Column: Submission Form */}
              <form onSubmit={handleApplySubmit} className="space-y-4 text-xs font-semibold text-slate-750 max-h-[60vh] overflow-y-auto pr-3 pb-4">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2 uppercase tracking-wide">
                  <BookOpen className="h-4 w-4 text-teal-dark" />
                  <span>Course & Submission</span>
                </h4>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                  <p className="font-extrabold text-slate-950">Target Path:</p>
                  <p className="text-slate-800 mt-1 font-bold text-sm leading-snug">{applyCourseName}</p>
                  <p className="text-teal-dark text-xs font-semibold mt-0.5">{selectedCourseForApply?.university_name}</p>
                </div>

                <div>
                  <label className="block text-slate-650 mb-1.5 uppercase font-bold text-[10px]">Statement of Purpose (SOP)</label>
                  <textarea
                    value={sopText}
                    onChange={(e) => setSopText(e.target.value)}
                    placeholder="Detail your academic background, research interests, and career goals for this specific course..."
                    rows={4}
                    className="w-full bg-white border border-slate-350 rounded-2xl p-3 text-slate-855 leading-relaxed font-medium focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark shadow-sm text-xs"
                    required
                  />
                </div>

                {/* Academic Documents Upload Section */}
                <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
                  <h5 className="font-bold text-[10px] text-slate-450 uppercase tracking-wider block">Academic Certificates (Required)</h5>
                  
                  {/* 10th Certificate Row */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-650 block">10th Class Certificate *</label>
                    <div className="relative border border-dashed border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCert10Name(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => setCert10Data(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                          {cert10Name ? cert10Name : 'Upload 10th Certificate'}
                        </span>
                      </div>
                      {cert10Name && <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><Check className="h-3.5 w-3.5" /></span>}
                    </div>
                  </div>

                  {/* 12th Certificate Row */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-650 block">12th Class Certificate *</label>
                    <div className="relative border border-dashed border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCert12Name(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => setCert12Data(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                          {cert12Name ? cert12Name : 'Upload 12th Certificate'}
                        </span>
                      </div>
                      {cert12Name && <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><Check className="h-3.5 w-3.5" /></span>}
                    </div>
                  </div>

                  {/* UG Marksheets Row */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-650 block">UG Degree Marksheets *</label>
                    <div className="relative border border-dashed border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUgName(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => setUgData(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                          {ugName ? ugName : 'Upload UG Marksheets'}
                        </span>
                      </div>
                      {ugName && <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><Check className="h-3.5 w-3.5" /></span>}
                    </div>
                  </div>
                </div>

                {/* Additional Documents Section */}
                <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
                  <h5 className="font-bold text-[10px] text-slate-450 uppercase tracking-wider block">Additional Documents (Optional)</h5>
                  
                  {/* Transfer Certificate (TC) */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-650 block">Transfer Certificate (TC)</label>
                    <div className="relative border border-dashed border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setTcName(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => setTcData(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                          {tcName ? tcName : 'Upload Transfer Certificate (TC)'}
                        </span>
                      </div>
                      {tcName && <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><Check className="h-3.5 w-3.5" /></span>}
                    </div>
                  </div>

                  {/* Migration Certificate */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-650 block">Migration Certificate</label>
                    <div className="relative border border-dashed border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMigrationName(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => setMigrationData(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                          {migrationName ? migrationName : 'Upload Migration Certificate'}
                        </span>
                      </div>
                      {migrationName && <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><Check className="h-3.5 w-3.5" /></span>}
                    </div>
                  </div>

                  {/* Character/Conduct Certificate */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-650 block">Character/Conduct Certificate</label>
                    <div className="relative border border-dashed border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCharacterName(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => setCharacterData(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                          {characterName ? characterName : 'Upload Character/Conduct'}
                        </span>
                      </div>
                      {characterName && <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><Check className="h-3.5 w-3.5" /></span>}
                    </div>
                  </div>

                  {/* Bonafide Certificate */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-650 block">Bonafide Certificate</label>
                    <div className="relative border border-dashed border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 bg-slate-50/50">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBonafideName(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => setBonafideData(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                          {bonafideName ? bonafideName : 'Upload Bonafide Certificate'}
                        </span>
                      </div>
                      {bonafideName && <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><Check className="h-3.5 w-3.5" /></span>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2 shrink-0">
                  <button
                    type="button"
                    onClick={closeApplyModal}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingApply}
                    className="bg-teal-dark hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm text-xs"
                  >
                    {submittingApply ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Submit Application</span>}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* University Guidelines Modal */}
      {isGuidelinesModalOpen && selectedUnivForGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xl relative">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6 uppercase tracking-wide flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-teal-dark" />
                <span>{selectedUnivForGuidelines.name} Admission Guidelines</span>
              </span>
              <button 
                type="button" 
                onClick={() => setIsGuidelinesModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"
              >
                <X className="h-5 w-5" />
              </button>
            </h3>

            <div className="space-y-6 text-xs text-slate-750">
              
              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">World Rank</span>
                  <span className="text-sm font-extrabold text-slate-950 mt-1 block">#{selectedUnivForGuidelines.ranking}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Acceptance Rate</span>
                  <span className="text-sm font-extrabold text-slate-950 mt-1 block">{selectedUnivForGuidelines.acceptance_rate}%</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tuition (Min)</span>
                  <span className="text-sm font-extrabold text-teal-dark mt-1 block">
                    {Number(selectedUnivForGuidelines.tuition_fee_min) === 0 ? 'Free' : formatPrice(Number(selectedUnivForGuidelines.tuition_fee_min), 'USD')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Overview</h4>
                <p className="leading-relaxed font-medium text-slate-600">
                  {selectedUnivForGuidelines.description}
                </p>
              </div>

              {/* Requirements & Procedures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Requirements */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-2">
                  <h4 className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-700" />
                    <span>Eligibility Requirements</span>
                  </h4>
                  <p className="leading-relaxed font-medium text-slate-700 whitespace-pre-line">
                    {selectedUnivForGuidelines.eligibility_requirements || "Standard academic eligibility criteria apply. Minimum CGPA requirements and required standardized test scores depend on the specific program."}
                  </p>
                </div>

                {/* Procedures */}
                <div className="bg-teal-500/5 border border-teal-500/10 rounded-2xl p-4 space-y-2">
                  <h4 className="font-extrabold text-teal-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-teal-700" />
                    <span>Application Procedure</span>
                  </h4>
                  <p className="leading-relaxed font-medium text-slate-700 whitespace-pre-line">
                    {selectedUnivForGuidelines.application_procedure || "1. Submit Statement of Purpose (SOP)\n2. Profile assessment & verification\n3. Interview / assessment if required\n4. Offer decision."}
                  </p>
                </div>

              </div>

              {/* Scholarships Offered by University */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-teal-dark" />
                  <span>University Funded Scholarships</span>
                </h4>
                
                {loadingUnivSch ? (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                    <span>Loading scholarships...</span>
                  </div>
                ) : univScholarships.length === 0 ? (
                  <p className="text-slate-500 italic leading-relaxed font-medium">
                    No university-funded scholarships are currently published by this institution.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-40 overflow-y-auto pr-1">
                    {univScholarships.map((sch) => (
                      <div key={sch.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">{sch.name}</span>
                          <span className="text-[10px] font-extrabold text-teal-dark bg-teal-50 px-2 py-0.5 rounded border border-teal-100 uppercase shrink-0">
                            {sch.amount}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium text-[11px] leading-relaxed line-clamp-3">
                          <strong>Criteria:</strong> {sch.eligibility_criteria}
                        </p>
                        <div className="text-[9.5px] text-slate-450 flex items-center gap-1">
                          <span className="font-bold uppercase">Scope:</span>
                          <span className="capitalize">{sch.coverage}</span>
                          <span className="mx-1">&bull;</span>
                          <span className="font-bold uppercase">Deadline:</span>
                          <span>{new Date(sch.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <a
                  href={selectedUnivForGuidelines.website?.startsWith('http') ? selectedUnivForGuidelines.website : `https://${selectedUnivForGuidelines.website}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-4 py-2 border border-slate-350 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm no-underline"
                >
                  <span>Visit Website</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsGuidelinesModalOpen(false)}
                  className="bg-teal-dark hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm border-0"
                >
                  Close Guidelines
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* University Scholarships Modal */}
      {isUnivSchModalOpen && selectedUnivForGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6 uppercase tracking-wide flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-dark" />
                <span>Scholarships offered by {selectedUnivForGuidelines.name}</span>
              </span>
              <button 
                type="button" 
                onClick={() => setIsUnivSchModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"
              >
                <X className="h-5 w-5" />
              </button>
            </h3>

            <div className="space-y-6">
              {loadingUnivSch ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <span>Loading scholarships...</span>
                </div>
              ) : univScholarships.length === 0 ? (
                <p className="text-slate-500 italic text-center py-8 text-xs font-semibold">
                  No university-funded scholarships are currently published by this institution.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {univScholarships.map((sch) => (
                    <div key={sch.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 text-xs truncate">{sch.name}</span>
                        <span className="text-[10px] font-extrabold text-teal-dark bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 uppercase shrink-0">
                          {sch.amount}
                        </span>
                      </div>
                      <p className="text-slate-650 font-medium text-[11px] leading-relaxed">
                        <strong>Academic Eligibility:</strong> {sch.eligibility_criteria}
                      </p>
                      <div className="text-[10px] text-slate-500 border-t border-slate-200/60 pt-2 mt-2 flex items-center justify-between font-semibold">
                        <div>
                          <span className="font-bold uppercase text-[9px] text-slate-400">Coverage:</span>
                          <span className="capitalize ml-1 text-slate-700">{sch.coverage}</span>
                        </div>
                        <div>
                          <span className="font-bold uppercase text-[9px] text-slate-400">Deadline:</span>
                          <span className="ml-1 text-slate-700">{new Date(sch.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsUnivSchModalOpen(false)}
                  className="bg-teal-dark hover:bg-teal-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm border-0"
                >
                  Close Scholarships
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
