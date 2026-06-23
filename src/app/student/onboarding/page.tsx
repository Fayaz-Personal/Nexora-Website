'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, UserSession } from '@/app/actions/auth';
import { getStudentProfile, saveStudentOnboarding } from '@/app/actions/student';
import { 
  User, BookOpen, Target, Globe, DollarSign, Award, ClipboardCheck, 
  Home, Brain, ArrowRight, ArrowLeft, Save, Sparkles, Loader2, Check 
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [draftSaved, setDraftSaved] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    email: '',
    phone: '',
    dob: '',
    nationality: '',
    currentCountry: '',
    currentCity: '',

    // Step 2: Academic details
    currentDegree: 'B.Tech',
    department: 'Computer Science',
    college: '',
    universityName: '',
    cgpa: 3.0,
    graduationYear: 2026,

    // Step 3: Preferences
    preferredDegree: 'MS',
    preferredCourse: 'Computer Science',
    targetUniversity: '',

    // Step 4: Portfolios
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: ''
  });

  // Load user profile & draft on mount
  useEffect(() => {
    async function loadData() {
      const sessionUser = await getCurrentUser();
      if (!sessionUser || sessionUser.role !== 'student') {
        router.push('/auth');
        return;
      }
      setUser(sessionUser);

      const studProfile = await getStudentProfile(sessionUser.id);
      if (studProfile) {
        setProfile(studProfile);
        
        // Initial setup from database profile
        setFormData(prev => ({
          ...prev,
          name: studProfile.name || sessionUser.name || '',
          email: sessionUser.email || '',
          cgpa: Number(studProfile.cgpa) || 3.0,
          preferredDegree: studProfile.degree || 'MS',
          department: studProfile.department || 'Computer Science',
          linkedinUrl: studProfile.linkedin_url || '',
          githubUrl: studProfile.github_url || '',
          portfolioUrl: studProfile.portfolio_url || ''
        }));

        // Load local storage draft if available
        const draft = localStorage.getItem(`nexora_onboarding_draft_${studProfile.id}`);
        if (draft) {
          try {
            const parsedDraft = JSON.parse(draft);
            setFormData(prev => ({ ...prev, ...parsedDraft }));
          } catch (e) {
            console.error('Error parsing draft', e);
          }
        }
      }
      setLoading(false);
    }
    loadData();
  }, [router]);

  // Save Draft to localStorage
  const handleSaveDraft = () => {
    if (profile) {
      localStorage.setItem(`nexora_onboarding_draft_${profile.id}`, JSON.stringify(formData));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }
  };

  // Step validation
  const validateStep = () => {
    if (step === 1) {
      return (
        formData.name.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.phone.trim() !== '' &&
        formData.dob !== '' &&
        formData.nationality.trim() !== '' &&
        formData.currentCountry.trim() !== '' &&
        formData.currentCity.trim() !== ''
      );
    }
    if (step === 2) {
      return (
        formData.currentDegree.trim() !== '' &&
        formData.department.trim() !== '' &&
        formData.college.trim() !== '' &&
        formData.universityName.trim() !== '' &&
        formData.cgpa > 0 &&
        formData.graduationYear > 0
      );
    }
    if (step === 3) {
      return (
        formData.preferredDegree.trim() !== '' &&
        formData.preferredCourse.trim() !== '' &&
        formData.targetUniversity.trim() !== ''
      );
    }
    if (step === 4) {
      return (
        formData.linkedinUrl.trim() !== '' &&
        formData.githubUrl.trim() !== '' &&
        formData.portfolioUrl.trim() !== ''
      );
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      handleSaveDraft();
      setStep(prev => prev + 1);
    } else {
      alert('Please fill out all required fields in this step before proceeding.');
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  // Submit complete onboarding details
  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    
    // Save onboarding details to database
    const res = await saveStudentOnboarding(profile.id, formData);
    if (res.success) {
      // Clear draft storage
      localStorage.removeItem(`nexora_onboarding_draft_${profile.id}`);
      router.push('/');
    } else {
      alert(res.error || 'Failed to submit onboarding.');
      setSubmitting(false);
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[90vh] bg-slate-50 text-slate-800">
        <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
        <p className="text-sm text-slate-600">Loading AI Onboarding chamber...</p>
      </div>
    );
  }

  // Icons array for progress circles
  const stepsMetadata = [
    { label: 'Identity', icon: User },
    { label: 'Academic', icon: BookOpen },
    { label: 'Preferences', icon: Target },
    { label: 'Portfolios', icon: Globe }
  ];

  return (
    <div className="relative min-h-[95vh] bg-slate-50 text-slate-800 flex flex-col items-center justify-start py-8 px-4 overflow-hidden">
      
      {/* Radiant Glowing Background Spheres */}
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-teal-dark/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-teal-bright/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Section */}
      <div className="w-full max-w-4xl text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-dark/10 border border-teal-dark/20 px-3 py-1 text-xs text-teal-dark font-bold mb-3">
          <Sparkles className="h-4.5 w-4.5 text-teal-dark" />
          <span>AI Profile Assessment Onboarding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Build Your Academic DNA
        </h1>
        <p className="text-xs text-slate-650 mt-1 max-w-xl mx-auto">
          Complete the 4 milestones to complete your student profile setup and connect your academic and social portfolios.
        </p>
      </div>

      {/* Horizontal Milestones Stepper */}
      <div className="w-full max-w-4xl mb-8 relative z-10 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-teal-dark/30">
        <div className="flex items-center justify-between min-w-[700px] px-4">
          {stepsMetadata.map((sm, index) => {
            const stepNum = index + 1;
            const StepIcon = sm.icon;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            
            return (
              <div key={stepNum} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => {
                    if (stepNum < step) setStep(stepNum);
                  }}
                  disabled={stepNum >= step}
                  className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all ${
                    stepNum < step ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                    isActive 
                      ? 'bg-teal-dark border-teal-dark text-white font-bold shadow-md shadow-teal-dark/35 scale-110' 
                      : isCompleted 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                        : 'bg-white border-slate-200 text-slate-400 shadow-sm'
                  }`}>
                    {isCompleted ? <Check className="h-4.5 w-4.5 stroke-[3]" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs uppercase font-extrabold tracking-wider ${
                    isActive ? 'text-teal-dark font-extrabold' : isCompleted ? 'text-emerald-600' : 'text-slate-450'
                  }`}>
                    {sm.label}
                  </span>
                </button>
                {index < stepsMetadata.length - 1 && (
                  <div className={`h-[1px] flex-1 mx-2 ${
                    step > stepNum ? 'bg-emerald-500/50' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-3xl bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 flex flex-col min-h-[50vh] justify-between">
        
        {/* Step Content */}
        <div className="space-y-6 flex-1">
          
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold text-teal-dark flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span>Step 1: Basic Information</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">Provide your legal name and contact details for official visa recommendations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Phone Number *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nationality *</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="e.g. Indian"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Current Country *</label>
                  <input
                    type="text"
                    value={formData.currentCountry}
                    onChange={(e) => setFormData({ ...formData, currentCountry: e.target.value })}
                    placeholder="e.g. India"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Current City *</label>
                  <input
                    type="text"
                    value={formData.currentCity}
                    onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                    placeholder="e.g. New Delhi"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC DETAILS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold text-teal-dark flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Step 2: Academic Background</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">Specify your current degree and scoring details. Our algorithms evaluate CGPA strictly.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Current Degree *</label>
                  <select
                    value={formData.currentDegree}
                    onChange={(e) => setFormData({ ...formData, currentDegree: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark cursor-pointer"
                  >
                    {['B.Tech', 'BE', 'B.Sc', 'BCA', 'B.Com', 'BA', 'MBBS', 'Others'].map(d => (
                      <option key={d} value={d} className="bg-white text-slate-800">{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Department / Major *</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Computer Science & Eng"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">College Name *</label>
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    placeholder="e.g. Delhi Technological University"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Affiliated University Name *</label>
                  <input
                    type="text"
                    value={formData.universityName}
                    onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                    placeholder="e.g. Delhi University"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Current CGPA (10.0 or 4.0 scale) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="10"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Graduation Year *</label>
                  <input
                    type="number"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

                    {/* STEP 3: STUDY PREFERENCES */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold text-teal-dark flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  <span>Step 3: Study Preferences</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">Specify your desired degree, course of study, and target university.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase mb-1.5">Preferred Target Degree *</label>
                  <select
                    value={formData.preferredDegree}
                    onChange={(e) => setFormData({ ...formData, preferredDegree: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark cursor-pointer"
                  >
                    {['MS', 'MSc', 'MTech', 'MBA', 'PhD', 'BS', 'BSc', 'B.Tech'].map(d => (
                      <option key={d} value={d} className="bg-white text-slate-800">{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase mb-1.5">Preferred Course / Major *</label>
                  <input
                    type="text"
                    value={formData.preferredCourse}
                    onChange={(e) => setFormData({ ...formData, preferredCourse: e.target.value })}
                    placeholder="e.g. Data Science"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 uppercase mb-1.5">Target University *</label>
                  <input
                    type="text"
                    value={formData.targetUniversity}
                    onChange={(e) => setFormData({ ...formData, targetUniversity: e.target.value })}
                    placeholder="e.g. Technical University of Munich"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PORTFOLIOS */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold text-teal-dark flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <span>Step 4: Work & Social Portfolios</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">Please enter your professional profiles and personal portfolio links. All fields are required.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase mb-1.5">LinkedIn Profile URL *</label>
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase mb-1.5">GitHub Profile URL *</label>
                  <input
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase mb-1.5">Portfolio Website URL *</label>
                  <input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    placeholder="https://myportfolio.com"
                    className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-800 p-3.5 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark placeholder-slate-400 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

        </div>

{/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-650 hover:text-slate-800 hover:bg-slate-50 cursor-pointer transition-all"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </button>
            {draftSaved && (
              <span className="text-xs text-emerald-400 font-extrabold animate-pulse">
                ✓ Saved!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-650 rounded-xl cursor-pointer transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-teal-sunrise text-slate-950 text-sm font-extrabold rounded-xl cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01]"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-dark hover:from-emerald-400 hover:to-teal-bright text-slate-950 text-sm font-extrabold rounded-xl cursor-pointer hover:shadow-xl transition-all hover:scale-[1.01]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Setup Profile</span>
                    <Sparkles className="h-4 w-4 text-slate-950 animate-bounce" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
