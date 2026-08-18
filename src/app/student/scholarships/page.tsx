'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { 
  Award, Calendar, DollarSign, Star, CheckCircle, ShieldAlert, Loader2, Sparkles, Filter
} from 'lucide-react';
import { getScholarships, toggleSaveScholarship, Scholarship } from '@/app/actions/student';
import { getCurrentUser, UserSession } from '@/app/actions/auth';

export default function ScholarshipsPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  // Load User
  useEffect(() => {
    getCurrentUser().then(u => setUser(u));
  }, []);

  // Fetch Scholarships
  const fetchScholarshipsList = async () => {
    setLoading(true);
    const profileId = user?.profileId;
    const data = await getScholarships(profileId);
    const commonData = data.filter(sch => sch.type !== 'university');
    setScholarships(commonData);
    setLoading(false);
  };

  useEffect(() => {
    fetchScholarshipsList();
  }, [user]);

  // Handle saving scholarship
  const handleSaveSch = async (sch: Scholarship) => {
    if (!user || !user.profileId) {
      alert('Please sign in to save scholarships.');
      return;
    }
    const currentlySaved = !!sch.is_saved;
    const res = await toggleSaveScholarship(sch.id, user.profileId, currentlySaved);
    if (res.success) {
      setScholarships(prev => prev.map(s => s.id === sch.id ? { ...s, is_saved: !currentlySaved } : s));
    }
  };

  const filteredScholarships = scholarships.filter(sch => 
    filterType === 'all' ? true : sch.type === filterType
  );

  // Helper to calculate remaining days
  const getRemainingDays = (dateStr: string) => {
    const deadline = new Date(dateStr);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Scholarship <span className="text-gradient-teal-sunrise">Finder</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Discover government grants, private fellowships, and university awards with personalized AI match ratings.
        </p>
      </div>

      {/* Profile Check Alert */}
      {!user && (
        <div className="mb-8 p-4 rounded-xl bg-teal-bright/10 border border-teal-bright/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-orange-light" />
            <p className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Want personalized matching?</span> Sign in and fill out your profile details to calculate your eligibility and match percentage.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filters Side panel */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit space-y-6">
          <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-teal-dark" />
            <span>Category</span>
          </h3>

          <div className="space-y-2">
            {[
              { id: 'all', label: 'All Scholarships' },
              { id: 'government', label: 'Government Grants' },
              { id: 'private', label: 'Private Fellowships' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`w-full text-left py-2 px-3 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-teal-dark/10 text-teal-dark border-l-2 border-teal-dark pl-4'
                    : 'text-slate-755 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scholarships List Panel */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-teal-dark animate-spin mb-3" />
              <p className="text-xs text-slate-500">Evaluating scholarship matching criteria...</p>
            </div>
          ) : filteredScholarships.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-teal-green/20">
              <Award className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-950">No Scholarships Found</p>
              <p className="text-xs text-slate-600 mt-1">Check back later for newly added education grants.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredScholarships.map(sch => {
                const daysLeft = getRemainingDays(sch.deadline);
                const isUrgent = daysLeft > 0 && daysLeft <= 60;
                
                return (
                  <div key={sch.id} className="glass-card glass-card-hover rounded-2xl p-6 border border-teal-green/20 relative overflow-hidden flex flex-col md:flex-row justify-between gap-6">


                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="rounded-lg bg-teal-dark/10 px-2 py-0.5 text-[10px] font-bold text-teal-dark uppercase">
                            {sch.type}
                          </span>
                          <span className="text-xs text-slate-600">
                            Provided by {sch.provider}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 pr-20">
                          {sch.name}
                        </h3>
                      </div>

                      {/* Criteria */}
                      <div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Eligibility Criteria
                        </span>
                        <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 border border-slate-200/60 p-3 rounded-lg">
                          {sch.eligibility_criteria}
                        </p>
                      </div>

                      {/* Coverage detail */}
                      <div className="flex gap-4 flex-wrap text-xs text-slate-700">
                        <div>
                          <span className="font-semibold text-slate-600">Funding:</span> {sch.amount}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">Coverage:</span> {sch.coverage}
                        </div>
                      </div>
                    </div>

                    {/* Deadline actions side panel */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-teal-green/15 pt-4 md:pt-0 gap-4 min-w-[150px]">
                      
                      {/* Saved star button */}
                      <button
                        onClick={() => handleSaveSch(sch)}
                        className={`rounded-lg p-2 border transition-all cursor-pointer md:order-first ${
                          sch.is_saved
                            ? 'bg-teal-bright/15 border-teal-bright text-teal-bright'
                            : 'bg-white/40 border-teal-green/20 text-slate-700 hover:text-slate-950'
                        }`}
                      >
                        <Star className={`h-4 w-4 ${sch.is_saved ? 'fill-teal-bright' : ''}`} />
                      </button>

                      {/* Deadline days */}
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 md:justify-end">
                          <Calendar className="h-4 w-4 text-teal-bright" />
                          <span>Deadline</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-900 mt-1">
                          {new Date(sch.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {daysLeft > 0 ? (
                          <div className={`text-[10px] font-bold mt-1 uppercase tracking-wider flex items-center gap-1 md:justify-end ${
                            isUrgent ? 'text-orange-light' : 'text-teal-green'
                          }`}>
                            {isUrgent ? <ShieldAlert className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            <span>{daysLeft} days left</span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                            Expired
                          </div>
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
    </div>
  );
}
