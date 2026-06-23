'use client';

import { useState, useEffect } from 'react';
import {
  Search, Landmark, MapPin, Star, ExternalLink, BookOpen, Clock, Loader2
} from 'lucide-react';
import { getUniversities, getCourses, toggleSaveUniversity, toggleSaveCourse, getCountries, University, Course, earnPassportStamp } from '@/app/actions/student';
import { getCurrentUser, UserSession } from '@/app/actions/auth';
import { useCurrency } from '@/components/CurrencyContext';

export default function UniversitiesPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'universities' | 'courses'>('universities');
  const [loading, setLoading] = useState(true);

  // Lists
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [countriesList, setCountriesList] = useState<{ id: number; name: string; code: string }[]>([]);
  const [displayLimit, setDisplayLimit] = useState(12);

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
      const data = await getUniversities({
        country,
        budgetMax: budgetMax || undefined,
        rankingMax: rankingMax || undefined,
        search: search || undefined
      }, profileId);
      setUniversities(data);
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

  // Handle saving university
  const handleSaveUniv = async (univ: University) => {
    if (!user || !user.profileId) {
      alert('Please sign in to save universities.');
      return;
    }
    const currentlySaved = !!univ.is_saved;
    const res = await toggleSaveUniversity(univ.id, user.profileId, currentlySaved);
    if (res.success) {
      setUniversities(prev => prev.map(u => u.id === univ.id ? { ...u, is_saved: !currentlySaved } : u));
    }
  };

  // Handle saving course
  const handleSaveCourse = async (course: Course) => {
    if (!user || !user.profileId) {
      alert('Please sign in to save courses.');
      return;
    }
    const currentlySaved = !!course.is_saved;
    const res = await toggleSaveCourse(course.id, user.profileId, currentlySaved);
    if (res.success) {
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_saved: !currentlySaved } : c));
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
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer text-slate-700"
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
                            ? 'bg-teal-bright/15 border-teal-bright text-teal-bright'
                            : 'bg-white/40 border-teal-green/20 text-slate-700 hover:text-slate-950 hover:bg-white/60'
                            }`}
                        >
                          <Star className={`h-4 w-4 ${univ.is_saved ? 'fill-teal-bright' : ''}`} />
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
                            {Number(univ.tuition_fee_min) === 0 ? 'Free' : formatPrice(Number(univ.tuition_fee_min), univ.country_currency || 'USD')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center border-t border-teal-green/15 pt-3 mt-2">
                      <a
                        href={univ.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 transition-colors"
                      >
                        <span>Visit Website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => {
                          setActiveTab('courses');
                          setCourseFeesMax(80000);
                          setSearch(univ.name);
                        }}
                        className="text-xs font-semibold text-teal-dark hover:underline"
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
                          <span>{Number(course.fees) === 0 ? 'Tuition Free' : `${formatPrice(Number(course.fees), course.country_currency || 'USD')}/yr`}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 md:justify-end mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{course.duration}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveCourse(course)}
                          className={`rounded-lg p-1.5 border transition-all cursor-pointer ${course.is_saved
                            ? 'bg-teal-bright/15 border-teal-bright text-teal-bright'
                            : 'bg-white/40 border-teal-green/20 text-slate-700 hover:text-slate-950 hover:bg-white/60'
                            }`}
                        >
                          <Star className={`h-4 w-4 ${course.is_saved ? 'fill-teal-bright' : ''}`} />
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
    </div>
  );
}
