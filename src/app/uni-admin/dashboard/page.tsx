'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, BookOpen, Users, Star, Plus, Trash2, Edit, Award, Clock, 
  DollarSign, Loader2, Link, Globe, FileText, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { 
  getUniAdminDetails, getUniDashboardStats, getUniCourses, createCourse, deleteCourse,
  updateUniversityProfile, getUniScholarships, saveScholarship, deleteScholarship 
} from '@/app/actions/uniAdmin';

export default function UniAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'scholarships' | 'profile'>('overview');
  
  const [adminDetails, setAdminDetails] = useState<any>(null);
  const [stats, setStats] = useState<any>({ totalCourses: 0, savedByStudents: 0, totalPredictions: 0, avgStudentCgpa: 'N/A' });
  const [courses, setCourses] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  
  // Profile Form state
  const [uniName, setUniName] = useState('');
  const [uniRanking, setUniRanking] = useState(100);
  const [uniFeeMin, setUniFeeMin] = useState(0);
  const [uniFeeMax, setUniFeeMax] = useState(50000);
  const [uniAcceptance, setUniAcceptance] = useState(50);
  const [uniDesc, setUniDesc] = useState('');
  const [uniWebsite, setUniWebsite] = useState('');
  const [uniLogoUrl, setUniLogoUrl] = useState('');

  // Course Form state
  const [isAddMode, setIsAddMode] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseDegreeType, setCourseDegreeType] = useState('MSc');
  const [courseDept, setCourseDept] = useState('Computer Science');
  const [courseDuration, setCourseDuration] = useState('2 Years');
  const [courseFees, setCourseFees] = useState(15000);
  const [courseDesc, setCourseDesc] = useState('');

  // Scholarship Form state
  const [isSchModalOpen, setIsSchModalOpen] = useState(false);
  const [selectedSchId, setSelectedSchId] = useState<number | null>(null);
  const [schName, setSchName] = useState('');
  const [schAmount, setSchAmount] = useState('');
  const [schCriteria, setSchCriteria] = useState('');
  const [schDeadline, setSchDeadline] = useState('');
  const [schCoverage, setSchCoverage] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load Initial Admin Data
  const loadAdminData = async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user || user.role !== 'uni_admin') {
      router.push('/auth');
      return;
    }

    const details = await getUniAdminDetails();
    if (details) {
      setAdminDetails(details);
      
      // Seed profile form
      setUniName(details.university.name);
      setUniRanking(Number(details.university.ranking) || 100);
      setUniFeeMin(Number(details.university.tuition_fee_min) || 0);
      setUniFeeMax(Number(details.university.tuition_fee_max) || 50000);
      setUniAcceptance(Number(details.university.acceptance_rate) || 50);
      setUniDesc(details.university.description || '');
      setUniWebsite(details.university.website || '');
      setUniLogoUrl(details.university.logo_url || '');

      const dashboardStats = await getUniDashboardStats(details.university.id);
      setStats(dashboardStats);

      const list = await getUniCourses(details.university.id);
      setCourses(list);

      const schList = await getUniScholarships(details.university.name);
      setScholarships(schList);
    } else {
      router.push('/auth');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, [router]);

  // Handle Save University Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminDetails) return;
    setSubmitting(true);

    const res = await updateUniversityProfile(adminDetails.university.id, {
      name: uniName,
      ranking: Number(uniRanking),
      tuitionFeeMin: Number(uniFeeMin),
      tuitionFeeMax: Number(uniFeeMax),
      acceptanceRate: Number(uniAcceptance),
      description: uniDesc,
      website: uniWebsite,
      logoUrl: uniLogoUrl
    });

    if (res.success) {
      alert('University profile updated successfully!');
      loadAdminData();
    } else {
      alert(res.error || 'Failed to update profile.');
    }
    setSubmitting(false);
  };

  // Handle Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminDetails) return;
    setSubmitting(true);

    const res = await createCourse({
      universityId: adminDetails.university.id,
      name: courseName,
      degreeType: courseDegreeType,
      department: courseDept,
      duration: courseDuration,
      fees: Number(courseFees),
      description: courseDesc
    });

    if (res.success) {
      const list = await getUniCourses(adminDetails.university.id);
      setCourses(list);
      
      const dashboardStats = await getUniDashboardStats(adminDetails.university.id);
      setStats(dashboardStats);

      setCourseName('');
      setCourseDesc('');
      setIsAddMode(false);
    } else {
      alert(res.error || 'Failed to create course.');
    }
    setSubmitting(false);
  };

  // Handle Delete Course
  const handleDeleteCourse = async (courseId: number) => {
    if (!adminDetails) return;
    if (!confirm('Are you sure you want to delete this course?')) return;

    const res = await deleteCourse(courseId, adminDetails.university.id);
    if (res.success) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
      const dashboardStats = await getUniDashboardStats(adminDetails.university.id);
      setStats(dashboardStats);
    } else {
      alert('Failed to delete course.');
    }
  };

  // Handle Save Scholarship
  const handleSaveScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminDetails) return;
    setSubmitting(true);

    const res = await saveScholarship({
      id: selectedSchId || undefined,
      name: schName,
      provider: adminDetails.university.name,
      type: 'university',
      amount: schAmount,
      eligibilityCriteria: schCriteria,
      deadline: schDeadline,
      coverage: schCoverage
    });

    if (res.success) {
      setIsSchModalOpen(false);
      resetSchForm();
      const list = await getUniScholarships(adminDetails.university.name);
      setScholarships(list);
    } else {
      alert(res.error || 'Failed to save scholarship.');
    }
    setSubmitting(false);
  };

  // Handle Delete Scholarship
  const handleDeleteSch = async (id: number) => {
    if (!confirm('Are you sure you want to remove this scholarship option?')) return;
    const res = await deleteScholarship(id);
    if (res.success) {
      setScholarships(prev => prev.filter(s => s.id !== id));
    } else {
      alert(res.error || 'Failed to delete scholarship.');
    }
  };

  const resetSchForm = () => {
    setSelectedSchId(null);
    setSchName('');
    setSchAmount('');
    setSchCriteria('');
    setSchDeadline('');
    setSchCoverage('');
  };

  const openEditSch = (sch: any) => {
    setSelectedSchId(sch.id);
    setSchName(sch.name);
    setSchAmount(sch.amount);
    setSchCriteria(sch.eligibility_criteria || '');
    // Format date string for input element
    const rawDate = sch.deadline ? new Date(sch.deadline) : null;
    const formattedDate = rawDate ? rawDate.toISOString().split('T')[0] : '';
    setSchDeadline(formattedDate);
    setSchCoverage(sch.coverage || '');
    setIsSchModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
        <p className="text-sm text-white/60">Loading university management terminal...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-white">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-teal-green/20 pb-6">
        <div className="flex items-center gap-4">
          {uniLogoUrl && (
            <div className="w-16 h-16 rounded-xl bg-white border border-teal-green/20 overflow-hidden flex items-center justify-center p-2 shadow-inner">
              <img src={uniLogoUrl} alt={uniName} className="object-contain max-h-full max-w-full" />
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-teal-bright uppercase tracking-wide">University Admin Dashboard</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {uniName}
            </h1>
            <p className="text-xs text-white/60 mt-1">
              Publish degrees, manage sponsored financial fellowships, and update global ranking parameters.
            </p>
          </div>
        </div>

        {activeTab !== 'overview' && activeTab !== 'profile' && (
          <button
            onClick={() => {
              if (activeTab === 'courses') setIsAddMode(true);
              if (activeTab === 'scholarships') { resetSchForm(); setIsSchModalOpen(true); }
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-bright to-teal-green text-white font-bold px-4 py-2.5 text-xs hover:from-teal-green hover:to-yellow-green transition-all cursor-pointer shadow-md shadow-teal-bright/20"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === 'courses' ? 'Add New Course' : 'Add Scholarship'}</span>
          </button>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-teal-green/20 bg-teal-dark/30 p-1 rounded-xl w-fit">
        {[
          { id: 'overview', label: 'Dashboard', icon: GraduationCap },
          { id: 'courses', label: 'Offered Courses', icon: BookOpen },
          { id: 'scholarships', label: 'Sponsored Scholarships', icon: Award },
          { id: 'profile', label: 'University Profile', icon: FileText }
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
          {/* Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Published Courses', value: stats.totalCourses, icon: BookOpen, color: 'text-teal-bright bg-teal-bright/10' },
              { label: 'Student Bookmarks', value: stats.savedByStudents, icon: Star, color: 'text-teal-green bg-teal-green/10' },
              { label: 'Potential Candidates', value: stats.totalPredictions, icon: Users, color: 'text-yellow-green bg-yellow-green/10' },
              { label: 'Avg Candidate CGPA', value: stats.avgStudentCgpa, icon: Award, color: 'text-orange-light bg-orange-light/10' },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="glass-card rounded-2xl p-5 border border-teal-green/20 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{card.label}</span>
                    <span className="text-2xl font-extrabold text-white block mt-1">{card.value}</span>
                  </div>
                  <div className={`p-3 rounded-xl ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Profile Summary widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-teal-green/20 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-teal-green/20 pb-3">
                University Overview
              </h3>
              <div className="space-y-3 text-xs text-white/80">
                <p className="leading-relaxed">{uniDesc || 'No description listed yet. Go to the Profile tab to configure your description.'}</p>
                <div className="flex flex-wrap gap-6 pt-3 text-[11px] text-white/60">
                  {uniWebsite && (
                    <a href={uniWebsite} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-teal-bright transition-colors font-semibold">
                      <Globe className="h-4 w-4 text-teal-bright" />
                      <span>{uniWebsite}</span>
                    </a>
                  )}
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-teal-green" />
                    <span>Global QS Rank: <strong className="text-white">#{uniRanking}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-yellow-green" />
                    <span>Acceptance Rate: <strong className="text-white">{uniAcceptance}%</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-teal-green/20 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-teal-green/20 pb-3 mb-4">
                  Financial Setup
                </h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Min Tuition Cost:</span>
                    <span className="font-extrabold text-white">${uniFeeMin.toLocaleString()}/yr</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Max Tuition Cost:</span>
                    <span className="font-extrabold text-white">${uniFeeMax.toLocaleString()}/yr</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Total Scholarships:</span>
                    <span className="font-bold text-teal-bright bg-teal-bright/10 px-2 py-0.5 rounded-lg">{scholarships.length} Available</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('profile')}
                className="w-full mt-6 py-2.5 bg-teal-dark border border-teal-green/20 rounded-xl text-xs font-semibold hover:bg-teal-bright/20 transition-all cursor-pointer text-white flex items-center justify-center gap-1"
              >
                <span>Edit Profile</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-teal-green/20 pb-4">
            Offered Courses Catalogue
          </h3>

          {courses.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <p className="text-xs">No courses listed. Click 'Add New Course' to start advertising.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map(course => (
                <div key={course.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-teal-dark/40 border border-teal-green/15 rounded-2xl gap-4 hover:border-teal-green/30 transition-all">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-teal-bright/10 px-2 py-0.5 text-[9px] font-bold text-teal-bright uppercase">
                        {course.degree_type}
                      </span>
                      <span className="text-[10px] text-white/50 font-medium">{course.department}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{course.name}</h4>
                    <p className="text-xs text-white/70 leading-relaxed max-w-2xl">{course.description}</p>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-teal-green/15 pt-3 md:pt-0 gap-3">
                    <div className="text-right">
                      <div className="flex items-center text-xs font-bold text-white md:justify-end">
                        <DollarSign className="h-3.5 w-3.5 text-teal-bright" />
                        <span>{Number(course.fees).toLocaleString()}/yr</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/50 md:justify-end mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{course.duration}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="text-white/60 hover:text-orange-light transition-colors p-1.5 hover:bg-orange-light/15 rounded-lg border border-transparent hover:border-orange-light/20 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'scholarships' && (
        <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-teal-green/20 pb-4">
            Manage Sponsored Scholarships
          </h3>

          {scholarships.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <Award className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <p className="text-xs">No university scholarships configured. Click 'Add Scholarship' to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scholarships.map(sch => (
                <div key={sch.id} className="p-5 bg-teal-dark/30 border border-teal-green/20 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start border-b border-teal-green/10 pb-2">
                      <span className="font-extrabold text-sm text-white">{sch.name}</span>
                      <span className="text-[10px] bg-teal-bright/10 text-teal-bright font-bold px-2 py-0.5 rounded-full uppercase shrink-0">{sch.coverage}</span>
                    </div>

                    <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
                      {sch.eligibility_criteria}
                    </p>

                    <div className="flex justify-between items-center text-[10px] text-white/50">
                      <span>Fund: <strong className="text-white">{sch.amount}</strong></span>
                      {sch.deadline && (
                        <span>Deadline: <strong className="text-white">{new Date(sch.deadline).toLocaleDateString()}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-teal-green/10 pt-3">
                    <button
                      onClick={() => openEditSch(sch)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-teal-green/20 hover:bg-teal-green/10 text-teal-bright text-xs font-bold cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSch(sch.id)}
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

      {activeTab === 'profile' && (
        <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-teal-green/20 pb-4">
            Edit University Profile
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">University Official Name</label>
                <input
                  type="text"
                  value={uniName}
                  onChange={(e) => setUniName(e.target.value)}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">QS World Ranking</label>
                <input
                  type="number"
                  value={uniRanking}
                  onChange={(e) => setUniRanking(Number(e.target.value))}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">Min Tuition Fee (USD)</label>
                <input
                  type="number"
                  value={uniFeeMin}
                  onChange={(e) => setUniFeeMin(Number(e.target.value))}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">Max Tuition Fee (USD)</label>
                <input
                  type="number"
                  value={uniFeeMax}
                  onChange={(e) => setUniFeeMax(Number(e.target.value))}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">Acceptance Rate (%)</label>
                <input
                  type="number"
                  value={uniAcceptance}
                  onChange={(e) => setUniAcceptance(Number(e.target.value))}
                  max={100}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">Website Link</label>
                <input
                  type="url"
                  value={uniWebsite}
                  onChange={(e) => setUniWebsite(e.target.value)}
                  placeholder="https://www.university.edu"
                  className="w-full glass-input"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">Logo URL (public image path)</label>
                <input
                  type="text"
                  value={uniLogoUrl}
                  onChange={(e) => setUniLogoUrl(e.target.value)}
                  placeholder="e.g. /images/univ/logo.png"
                  className="w-full glass-input"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">University Profile Description</label>
                <textarea
                  value={uniDesc}
                  onChange={(e) => setUniDesc(e.target.value)}
                  rows={6}
                  className="w-full glass-input leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-teal-green/20 pt-4 mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="glow-btn text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {submitting ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Course Modal */}
      {isAddMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-dark/80 backdrop-blur-md px-4">
          <div className="w-full max-w-xl glass-card rounded-2xl p-6 border border-teal-green/30 max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-white border-b border-teal-green/20 pb-3 mb-5 uppercase tracking-wide flex justify-between items-center">
              <span>Add New Degree Course</span>
              <button onClick={() => setIsAddMode(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Course Title</label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g. Master of Science in Data Engineering"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Degree Type</label>
                  <select
                    value={courseDegreeType}
                    onChange={(e) => setCourseDegreeType(e.target.value)}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none"
                  >
                    <option value="MSc">MSc</option>
                    <option value="MS">MS</option>
                    <option value="MBA">MBA</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Department</label>
                  <select
                    value={courseDept}
                    onChange={(e) => setCourseDept(e.target.value)}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Business">Business</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Duration</label>
                  <input
                    type="text"
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(e.target.value)}
                    placeholder="e.g. 2 Years"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Annual Tuition (USD)</label>
                  <input
                    type="number"
                    value={courseFees}
                    onChange={(e) => setCourseFees(Number(e.target.value))}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">Course Syllabus / Description</label>
                <textarea
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Summarize course curriculum details and prerequisites..."
                  rows={4}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-teal-green/20 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddMode(false)}
                  className="px-4 py-2 rounded-xl border border-teal-green/20 font-bold text-white/70 hover:bg-teal-dark cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {submitting ? 'Creating...' : 'Publish Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Scholarship Modal */}
      {isSchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-dark/80 backdrop-blur-md px-4">
          <div className="w-full max-w-xl glass-card rounded-2xl p-6 border border-teal-green/30 max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-white border-b border-teal-green/20 pb-3 mb-5 uppercase tracking-wide flex justify-between items-center">
              <span>{selectedSchId ? 'Edit Scholarship details' : 'Add University Scholarship'}</span>
              <button onClick={() => setIsSchModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveScholarship} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Scholarship Title</label>
                  <input
                    type="text"
                    value={schName}
                    onChange={(e) => setSchName(e.target.value)}
                    placeholder="e.g. Fellowship Excellence Award"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Funding Amount / Allowance</label>
                  <input
                    type="text"
                    value={schAmount}
                    onChange={(e) => setSchAmount(e.target.value)}
                    placeholder="e.g. Full Tuition or $10,000 allowance"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Coverage Scope</label>
                  <select
                    value={schCoverage}
                    onChange={(e) => setSchCoverage(e.target.value)}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 focus:outline-none"
                  >
                    <option value="tuition fees">Tuition Fees</option>
                    <option value="living costs">Living Allowance</option>
                    <option value="partial funding">Partial Funding</option>
                    <option value="full coverage">Full Coverage</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white/70 mb-1.5 uppercase">Application Deadline</label>
                  <input
                    type="date"
                    value={schDeadline}
                    onChange={(e) => setSchDeadline(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1.5 uppercase">Academic Eligibility / Requirements</label>
                <textarea
                  value={schCriteria}
                  onChange={(e) => setSchCriteria(e.target.value)}
                  placeholder="Specify GPA guidelines, target programs, and test score cutoffs..."
                  rows={4}
                  className="w-full glass-input"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-teal-green/20 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-teal-green/20 font-bold text-white/70 hover:bg-teal-dark cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {submitting ? 'Saving...' : 'Publish Scholarship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
