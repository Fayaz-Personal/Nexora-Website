'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, BookOpen, Users, Star, Plus, Trash2, Edit, Award, Clock, 
  DollarSign, Loader2, Link, Globe, FileText, CheckCircle2, ChevronRight, X, Landmark
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { 
  getUniAdminDetails, getUniDashboardStats, getUniCourses, deleteCourse,
  getUniScholarships, saveScholarship, deleteScholarship 
} from '@/app/actions/uniAdmin';
import { 
  getUniversityApplicants, 
  evaluateStudentApplication,
  submitUniRegistration,
  deletePartnerRegistration,
  updateUniversityProfileExtended,
  saveCourseExtended
} from '@/app/actions/uniPartnerActions';

export default function UniAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'scholarships' | 'applications' | 'profile'>('overview');
  
  const [adminDetails, setAdminDetails] = useState<any>(null);
  const [stats, setStats] = useState<any>({ totalCourses: 0, savedByStudents: 0, totalPredictions: 0, avgStudentCgpa: 'N/A' });
  const [courses, setCourses] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  // Onboarding Form states
  const [regName, setRegName] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Onboarding File Upload states
  const [accFile, setAccFile] = useState<string | null>(null);
  const [accFileDataUrl, setAccFileDataUrl] = useState<string | null>(null);
  const [accFileProgress, setAccFileProgress] = useState(0);
  const [charterFile, setCharterFile] = useState<string | null>(null);
  const [charterFileProgress, setCharterFileProgress] = useState(0);
  const [authLetterFile, setAuthLetterFile] = useState<string | null>(null);
  const [authLetterFileProgress, setAuthLetterFileProgress] = useState(0);

  const simulateFileUpload = (fileType: 'acc' | 'charter' | 'auth', name: string) => {
    let progress = 0;
    if (fileType === 'acc') {
      setAccFile(name);
      setAccFileProgress(1);
      const timer = setInterval(() => {
        progress += 20;
        setAccFileProgress(progress);
        if (progress >= 100) clearInterval(timer);
      }, 150);
    } else if (fileType === 'charter') {
      setCharterFile(name);
      setCharterFileProgress(1);
      const timer = setInterval(() => {
        progress += 20;
        setCharterFileProgress(progress);
        if (progress >= 100) clearInterval(timer);
      }, 150);
    } else {
      setAuthLetterFile(name);
      setAuthLetterFileProgress(1);
      const timer = setInterval(() => {
        progress += 20;
        setAuthLetterFileProgress(progress);
        if (progress >= 100) clearInterval(timer);
      }, 150);
    }
  };

  // Logo Image Upload states
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);

  const simulateLogoUpload = (file: File) => {
    setLogoUploading(true);
    setLogoProgress(1);
    let progress = 0;
    const timer = setInterval(() => {
      progress += 25;
      setLogoProgress(progress);
      if (progress >= 100) {
        clearInterval(timer);
        const reader = new FileReader();
        reader.onload = (event) => {
          setUniLogoUrl(event.target?.result as string);
          setLogoUploading(false);
        };
        reader.readAsDataURL(file);
      }
    }, 100);
  };

  // Profile Form state
  const [uniName, setUniName] = useState('');
  const [uniRanking, setUniRanking] = useState(100);
  const [uniFeeMin, setUniFeeMin] = useState(0);
  const [uniFeeMax, setUniFeeMax] = useState(50000);
  const [uniAcceptance, setUniAcceptance] = useState(50);
  const [uniDesc, setUniDesc] = useState('');
  const [uniWebsite, setUniWebsite] = useState('');
  const [uniLogoUrl, setUniLogoUrl] = useState('');
  const [uniCity, setUniCity] = useState('');
  const [uniAccreditation, setUniAccreditation] = useState('');
  const [uniPhone, setUniPhone] = useState('');
  const [uniEmail, setUniEmail] = useState('');
  const [uniAddress, setUniAddress] = useState('');
  const [uniProcedure, setUniProcedure] = useState('');
  const [uniEligibility, setUniEligibility] = useState('');

  // Course Form state
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseDegreeType, setCourseDegreeType] = useState('MSc');
  const [courseDept, setCourseDept] = useState('Computer Science');
  const [courseDuration, setCourseDuration] = useState('2 Years');
  const [courseFees, setCourseFees] = useState(15000);
  const [courseDesc, setCourseDesc] = useState('');
  const [courseIntake, setCourseIntake] = useState('Fall 2026');
  const [courseDeadline, setCourseDeadline] = useState('');
  const [courseSeats, setCourseSeats] = useState(50);
  const [courseEligibility, setCourseEligibility] = useState('');
  const [courseExams, setCourseExams] = useState('GRE, IELTS');
  const [courseIelts, setCourseIelts] = useState(6.5);
  const [courseToefl, setCourseToefl] = useState(90);
  const [courseGre, setCourseGre] = useState(310);
  const [courseMinCgpa, setCourseMinCgpa] = useState(3.0);

  // Scholarship Form state
  const [isSchModalOpen, setIsSchModalOpen] = useState(false);
  const [selectedSchId, setSelectedSchId] = useState<number | null>(null);
  const [schName, setSchName] = useState('');
  const [schAmount, setSchAmount] = useState('');
  const [schCriteria, setSchCriteria] = useState('');
  const [schDeadline, setSchDeadline] = useState('');
  const [schCoverage, setSchCoverage] = useState('');

  // Evaluation states
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [evalStatus, setEvalStatus] = useState<'submitted' | 'under_review' | 'accepted' | 'rejected' | 'waitlisted'>('submitted');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // Document preview states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocName, setPreviewDocName] = useState('');
  const [previewDocData, setPreviewDocData] = useState<string | null>(null);

  const openDocPreview = (docKey: string, docData: string) => {
    setPreviewDocName(docKey.replace(/_/g, ' ').toUpperCase());
    setPreviewDocData(docData);
    setIsPreviewModalOpen(true);
  };

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
      
      if (details.verified && details.university) {
        // Seed profile form
        setUniName(details.university.name || '');
        setUniRanking(Number(details.university.ranking) || 100);
        setUniFeeMin(Number(details.university.tuition_fee_min) || 0);
        setUniFeeMax(Number(details.university.tuition_fee_max) || 50000);
        setUniAcceptance(Number(details.university.acceptance_rate) || 50);
        setUniDesc(details.university.description || '');
        setUniWebsite(details.university.website || '');
        setUniLogoUrl(details.university.logo_url || '');
        setUniCity(details.university.city || '');
        setUniAccreditation(details.university.accreditation || '');
        
        // Safely parse contact details
        let contact = { phone: '', email: '', address: '' };
        if (details.university.contact_info) {
          try {
            contact = typeof details.university.contact_info === 'string' 
              ? JSON.parse(details.university.contact_info)
              : details.university.contact_info;
          } catch (e) {
            console.error('Failed to parse contact details', e);
          }
        }
        setUniPhone(contact.phone || '');
        setUniEmail(contact.email || '');
        setUniAddress(contact.address || '');
        setUniProcedure(details.university.application_procedure || '');
        setUniEligibility(details.university.eligibility_requirements || '');
        
        const list = await getUniCourses(details.university.id);
        setCourses(list);

        const dashboardStats = await getUniDashboardStats(details.university.id);
        setStats(dashboardStats);

        const schList = await getUniScholarships(details.university.name);
        setScholarships(schList);

        const appList = await getUniversityApplicants(details.university.id);
        setApplications(appList || []);
      }
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
    if (!adminDetails || !adminDetails.university) return;
    setSubmitting(true);

    const res = await updateUniversityProfileExtended(adminDetails.university.id, {
      name: uniName,
      ranking: Number(uniRanking),
      logoUrl: uniLogoUrl,
      description: uniDesc,
      countryId: adminDetails.university.country_id,
      city: uniCity,
      accreditation: uniAccreditation,
      website: uniWebsite,
      contactInfo: {
        phone: uniPhone,
        email: uniEmail,
        address: uniAddress
      },
      applicationProcedure: uniProcedure,
      eligibilityRequirements: uniEligibility,
      tuitionFeeMin: Number(uniFeeMin),
      tuitionFeeMax: Number(uniFeeMax)
    });

    if (res.success) {
      alert('University profile updated successfully!');
      loadAdminData();
    } else {
      alert(res.error || 'Failed to update profile.');
    }
    setSubmitting(false);
  };

  // Handle Create/Update Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminDetails || !adminDetails.university) return;
    setSubmitting(true);

    const res = await saveCourseExtended({
      id: selectedCourseId || undefined,
      universityId: adminDetails.university.id,
      name: courseName,
      degreeType: courseDegreeType as any,
      department: courseDept,
      duration: courseDuration,
      fees: Number(courseFees),
      description: courseDesc,
      intake: courseIntake,
      applicationDeadline: courseDeadline || undefined,
      seatsAvailable: Number(courseSeats),
      eligibilityCriteria: courseEligibility,
      requiredExams: courseExams,
      ieltsRequirement: Number(courseIelts),
      toeflRequirement: Number(courseToefl),
      greRequirement: Number(courseGre),
      minCgpa: Number(courseMinCgpa)
    });

    if (res.success) {
      const list = await getUniCourses(adminDetails.university.id);
      setCourses(list);
      
      const dashboardStats = await getUniDashboardStats(adminDetails.university.id);
      setStats(dashboardStats);

      // Reset Form
      setSelectedCourseId(null);
      setCourseName('');
      setCourseDesc('');
      setCourseIntake('Fall 2026');
      setCourseDeadline('');
      setCourseSeats(50);
      setCourseEligibility('');
      setCourseExams('GRE, IELTS');
      setCourseIelts(6.5);
      setCourseToefl(90);
      setCourseGre(310);
      setCourseMinCgpa(3.0);
      setIsAddMode(false);
      alert(selectedCourseId ? 'Course updated successfully!' : 'Course created successfully!');
    } else {
      alert(res.error || 'Failed to save course.');
    }
    setSubmitting(false);
  };

  const handleEditCourse = (course: any) => {
    setSelectedCourseId(course.id);
    setCourseName(course.name || '');
    setCourseDegreeType(course.degree_type || 'MSc');
    setCourseDept(course.department || 'Computer Science');
    setCourseDuration(course.duration || '2 Years');
    setCourseFees(Number(course.fees) || 0);
    setCourseDesc(course.description || '');
    setCourseIntake(course.intake || 'Fall 2026');
    setCourseDeadline(course.application_deadline ? new Date(course.application_deadline).toISOString().split('T')[0] : '');
    setCourseSeats(Number(course.seats_available) || 50);
    setCourseEligibility(course.eligibility_criteria || '');
    setCourseExams(course.required_exams || '');
    setCourseIelts(Number(course.ielts_requirement) || 6.5);
    setCourseToefl(Number(course.toefl_requirement) || 90);
    setCourseGre(Number(course.gre_requirement) || 310);
    setCourseMinCgpa(Number(course.min_cgpa) || 3.0);
    setIsAddMode(true);
  };

  const closeCourseModal = () => {
    setSelectedCourseId(null);
    setCourseName('');
    setCourseDesc('');
    setCourseIntake('Fall 2026');
    setCourseDeadline('');
    setCourseSeats(50);
    setCourseEligibility('');
    setCourseExams('GRE, IELTS');
    setCourseIelts(6.5);
    setCourseToefl(90);
    setCourseGre(310);
    setCourseMinCgpa(3.0);
    setIsAddMode(false);
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

  const openEvalWizard = (app: any) => {
    setSelectedApp(app);
    setEvalStatus(app.application_status);
    setEvalFeedback(app.university_feedback || '');
    setIsEvalModalOpen(true);
  };

  const handleConfirmEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSubmittingEval(true);
    const res = await evaluateStudentApplication(selectedApp.application_id, evalStatus, evalFeedback);
    if (res.success) {
      alert('Application evaluation decision submitted successfully!');
      setIsEvalModalOpen(false);
      if (adminDetails) {
        const appList = await getUniversityApplicants(adminDetails.university.id);
        setApplications(appList || []);
      }
    } else {
      alert(res.error || 'Failed to submit evaluation.');
    }
    setSubmittingEval(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
        <p className="text-sm text-white/60">Loading university management terminal...</p>
      </div>
    );
  }

  if (adminDetails && !adminDetails.verified) {
    const isPending = adminDetails.status === 'pending';
    const isRejected = adminDetails.status === 'rejected';

    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-slate-800 animate-[fadeIn_0.5s_ease-out]">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Column: Requirements Guide */}
          <div className="md:col-span-5 bg-slate-50 border-r border-slate-200 p-8 space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-bright/10 text-teal-bright flex items-center justify-center mx-auto shadow-sm">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">Accreditation Guide</h2>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                To guarantee the authenticity of courses and protect student applications, universities are required to upload verifying credentials.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[9.5px] uppercase font-bold tracking-wider text-teal-bright block">Required Document</span>
                <h4 className="text-xs font-bold text-slate-900">Accreditation Certificate</h4>
                <p className="text-[10px] text-slate-600 leading-relaxed pt-0.5">
                  Please upload a PDF copy of your university's official accreditation certificate or government decree proving recognition by your local ministry of education or global educational board (ZEvA, HLC, etc.).
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed">
              * Accepted files: PDF, DOCX, JPEG, PNG. Maximum file size: 10MB.
            </div>
          </div>

          {/* Right Column: Verification Form */}
          <div className="md:col-span-7 p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">University Verification</h1>
              <p className="text-xs text-slate-400 mt-1">Submit onboarding files to verify your digital admin identity.</p>
            </div>

            {isPending && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 text-center">
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wider animate-pulse">
                  Verification Pending
                </span>
                <p className="text-xs text-slate-700 leading-relaxed max-w-sm mx-auto">
                  Your credentials for <strong>"{adminDetails.registration.entity_name}"</strong> are under review by the Super Admin. Once accepted, you will gain full dashboard access.
                </p>
                <div className="border-t border-amber-200/50 pt-3 text-[10px] text-slate-500">
                  Submitted on: {new Date(adminDetails.registration.created_at).toLocaleDateString()}
                </div>
              </div>
            )}

            {isRejected && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-4 text-center">
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wider">
                  Verification Rejected
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Your request was rejected. Reason: <em className="text-rose-700 font-semibold">"{adminDetails.registration.admin_feedback || 'No comments left.'}"</em>
                </p>
                <button
                  onClick={async () => {
                    if (confirm('Re-submit your registration request?')) {
                      await deletePartnerRegistration(adminDetails.registration.id);
                      loadAdminData();
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer shadow-sm animate-bounce"
                >
                  Start New Request
                </button>
              </div>
            )}

            {!isPending && !isRejected && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!accFile) {
                    alert('Please upload your official Accreditation Certificate.');
                    return;
                  }
                  setRegSubmitting(true);
                  const res = await submitUniRegistration({
                    entityName: regName,
                    licenseNumber: regLicense,
                    accreditationDocs: JSON.stringify({
                      contact_number: regContact,
                      accreditation_certificate: accFile,
                      accreditation_certificate_data: accFileDataUrl
                    })
                  });
                  if (res.success) {
                    alert('Verification request submitted successfully!');
                    setAccFileDataUrl(null);
                    loadAdminData();
                  } else {
                    alert(res.error || 'Failed to submit request.');
                  }
                  setRegSubmitting(false);
                }}
                className="space-y-4 text-xs font-semibold text-slate-700"
              >
                <div>
                  <label className="block mb-1.5 uppercase">Institution Official Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Technical University of Munich"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1.5 uppercase">Accreditation / Board License Number</label>
                  <input
                    type="text"
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value)}
                    placeholder="e.g. DE-EDU-9923-2025"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                    required
                  />
                </div>

                {/* File Upload Slot */}
                <div className="space-y-3 pt-2">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Required Document Upload</span>

                  {/* Slot 1: Accreditation Certificate */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-650 block">Accreditation Certificate (PDF/Image)</label>
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            simulateFileUpload('acc', file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setAccFileDataUrl(event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[240px]">
                          {accFile ? accFile : 'Click or Drag to Upload Certificate'}
                        </span>
                      </div>
                      {accFile ? (
                        <div className="flex items-center gap-2 shrink-0">
                          {accFileProgress < 100 ? (
                            <span className="text-[10px] text-slate-400 animate-pulse">{accFileProgress}%</span>
                          ) : (
                            <span className="rounded-full bg-teal-bright/10 p-0.5 text-teal-bright"><CheckCircle2 className="h-4 w-4" /></span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-teal-bright uppercase shrink-0">Upload</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block mb-1.5 uppercase">Contact Number</label>
                  <input
                    type="tel"
                    value={regContact}
                    onChange={(e) => setRegContact(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="w-full py-2.5 bg-gradient-teal-sunrise text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-all cursor-pointer shadow-md"
                >
                  {regSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      <span>Submitting Documents...</span>
                    </>
                  ) : (
                    <span>Submit Verification Request</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-slate-800">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          {uniLogoUrl && (
            <div className="w-16 h-16 rounded-xl bg-white border border-slate-250 overflow-hidden flex items-center justify-center p-2 shadow-inner">
              <img src={uniLogoUrl} alt={uniName} className="object-contain max-h-full max-w-full" />
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-teal-bright uppercase tracking-wide">University Admin Dashboard</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-0.5">
              {uniName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish degrees, manage sponsored financial fellowships, and update global ranking parameters.
            </p>
          </div>
        </div>

        {(activeTab === 'courses' || activeTab === 'scholarships') && (
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
      <div className="flex border border-slate-200 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'overview', label: 'Dashboard', icon: GraduationCap },
          { id: 'courses', label: 'Offered Courses', icon: BookOpen },
          { id: 'scholarships', label: 'Sponsored Scholarships', icon: Award },
          { id: 'applications', label: 'Student Applications', icon: Users },
          { id: 'profile', label: 'University Profile', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-bright text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
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
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                    <span className="text-2xl font-extrabold text-slate-900 block mt-1">{card.value}</span>
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
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
                University Overview
              </h3>
              <div className="space-y-3 text-xs text-slate-650">
                <p className="leading-relaxed">{uniDesc || 'No description listed yet. Go to the Profile tab to configure your description.'}</p>
                <div className="flex flex-wrap gap-6 pt-3 text-[11px] text-slate-500">
                  {uniWebsite && (
                    <a href={uniWebsite} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-teal-bright transition-colors font-semibold text-slate-600">
                      <Globe className="h-4 w-4 text-teal-bright" />
                      <span>{uniWebsite}</span>
                    </a>
                  )}
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-teal-green" />
                    <span>Global QS Rank: <strong className="text-slate-850">#{uniRanking}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-yellow-green" />
                    <span>Acceptance Rate: <strong className="text-slate-850">{uniAcceptance}%</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 mb-4">
                  Financial Setup
                </h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Min Tuition Cost:</span>
                    <span className="font-extrabold text-slate-900">${uniFeeMin.toLocaleString()}/yr</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Max Tuition Cost:</span>
                    <span className="font-extrabold text-slate-900">${uniFeeMax.toLocaleString()}/yr</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Total Scholarships:</span>
                    <span className="font-bold text-teal-bright bg-teal-bright/10 px-2 py-0.5 rounded-lg">{scholarships.length} Available</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('profile')}
                className="w-full mt-6 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer text-slate-700 flex items-center justify-center gap-1"
              >
                <span>Edit Profile</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 shadow-sm animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Offered Courses Catalogue
          </h3>

          {courses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No courses listed. Click 'Add New Course' to start advertising.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {courses.map(course => (
                <div key={course.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition-all space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-teal-bright/10 px-2 py-0.5 text-[9px] font-bold text-teal-bright uppercase">
                          {course.degree_type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{course.department}</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{course.name}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{course.description}</p>
                    </div>

                    <div className="flex flex-row md:flex-col items-end gap-3 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-200 pt-3 md:pt-0 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center text-sm font-extrabold text-slate-900 justify-end">
                          <DollarSign className="h-4 w-4 text-teal-bright" />
                          <span>{Number(course.fees).toLocaleString()}/yr</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 justify-end mt-0.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{course.duration}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="text-slate-400 hover:text-teal-bright transition-colors p-1.5 hover:bg-teal-bright/10 rounded-lg border border-transparent hover:border-teal-bright/20 cursor-pointer"
                          title="Edit Course Parameters"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-slate-400 hover:text-orange-light transition-colors p-1.5 hover:bg-orange-light/10 rounded-lg border border-transparent hover:border-orange-light/20 cursor-pointer"
                          title="Delete Course"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Requirements and Exams */}
                  <div className="border-t border-slate-200/60 pt-3.5 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-slate-650">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Intake Semester</span>
                      <strong className="text-slate-800">{course.intake || 'Fall/Spring'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Application Deadline</span>
                      <strong className="text-slate-800">
                        {course.application_deadline ? new Date(course.application_deadline).toLocaleDateString() : 'Rolling Admissions'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Seats Available</span>
                      <strong className="text-slate-800">{course.seats_available || 'N/A'} Seats</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Required Exams</span>
                      <strong className="text-slate-800">{course.required_exams || 'None Required'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Min Cutoffs</span>
                      <strong className="text-slate-800">GPA: {course.min_cgpa || '3.0'} | IELTS: {course.ielts_requirement || '6.5'}</strong>
                    </div>
                  </div>

                  {course.eligibility_criteria && (
                    <div className="bg-slate-100/50 rounded-xl p-3 border border-slate-200/40 text-[11px] text-slate-650 leading-relaxed">
                      <span className="font-bold text-[9px] uppercase text-slate-500 block mb-1">Additional Requirements Detail</span>
                      {course.eligibility_criteria}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'scholarships' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 shadow-sm animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Manage Sponsored Scholarships
          </h3>

          {scholarships.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Award className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No university scholarships configured. Click 'Add Scholarship' to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scholarships.map(sch => (
                <div key={sch.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-sm text-slate-900">{sch.name}</span>
                      <span className="text-[10px] bg-teal-bright/10 text-teal-bright font-bold px-2 py-0.5 rounded-full uppercase shrink-0">{sch.coverage}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {sch.eligibility_criteria}
                    </p>

                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Fund: <strong className="text-slate-800">{sch.amount}</strong></span>
                      {sch.deadline && (
                        <span>Deadline: <strong className="text-slate-800">{new Date(sch.deadline).toLocaleDateString()}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
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

      {activeTab === 'applications' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 shadow-sm animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Manage Student Applications
          </h3>

          {applications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs">No student applications submitted yet for this university.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {applications.map((app) => (
                <div 
                  key={app.application_id} 
                  className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-teal-bright/10 px-2 py-0.5 text-[9px] font-bold text-teal-bright uppercase">
                          {app.course_name}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded text-[9.5px] font-bold uppercase border ${
                          app.application_status === 'accepted' ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/20' :
                          app.application_status === 'rejected' ? 'bg-rose-500/20 text-rose-700 border-rose-500/20' :
                          app.application_status === 'waitlisted' ? 'bg-amber-500/20 text-amber-700 border-amber-500/20' :
                          app.application_status === 'under_review' ? 'bg-blue-500/20 text-blue-700 border-blue-500/20' :
                          'bg-slate-500/20 text-slate-700 border-slate-500/20'
                        }`}>
                          {app.application_status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-2">{app.student_name}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500 mt-2">
                        <div>
                          <span>GPA: </span>
                          <strong className="text-slate-800">{app.student_cgpa}</strong>
                        </div>
                        <div>
                          <span>Prior Degree: </span>
                          <strong className="text-slate-800">{app.student_degree}</strong>
                        </div>
                        <div>
                          <span>Department: </span>
                          <strong className="text-slate-800">{app.student_dept}</strong>
                        </div>
                        <div>
                          <span>Applied Date: </span>
                          <strong className="text-slate-800">
                            {new Date(app.application_date).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openEvalWizard(app)}
                      className="px-4 py-2 bg-gradient-teal-sunrise text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.01] transition-all shrink-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Evaluate Application</span>
                    </button>
                  </div>

                  {/* Documents & Logs */}
                  {app.documents_json?.statement_of_purpose && (
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-750 leading-relaxed italic shadow-inner">
                      <span className="text-[9px] font-bold text-teal-bright uppercase tracking-wider block not-italic mb-1">Statement of Purpose (SOP)</span>
                      "{app.documents_json.statement_of_purpose}"
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Submitted Academic Documents</span>
                      <div className="flex flex-wrap gap-3">
                        {app.documents_json && Object.keys(app.documents_json).length > 0 ? (
                          Object.entries(app.documents_json).map(([key, val]: any) => {
                            if (key === 'statement_of_purpose') return null;
                            if (key.endsWith('_name')) return null;
                            const isDataField = key.endsWith('_data');
                            const displayName = isDataField ? key.replace('_data', '') : key;
                            
                            const getFullDocLabel = (lbl: string) => {
                              const clean = lbl.toLowerCase();
                              if (clean === 'cert10') return '10th Class Certificate';
                              if (clean === 'cert12') return '12th Class Certificate';
                              if (clean === 'ug') return 'UG Degree Marksheet';
                              if (clean === 'tc') return 'Transfer Certificate (TC)';
                              if (clean === 'migration') return 'Migration Certificate';
                              if (clean === 'character') return 'Character/Conduct Certificate';
                              if (clean === 'bonafide') return 'Bonafide Certificate';
                              return lbl;
                            };
                            
                            const fullLabel = getFullDocLabel(displayName);
                            
                            // Find file name from name field
                            let fileName = 'document';
                            if (isDataField) {
                               const nameKey = key.replace('_data', '_name');
                               fileName = app.documents_json[nameKey] || 'document';
                            } else {
                               fileName = typeof val === 'string' ? val : 'document';
                            }
                            
                            const dataUrl = isDataField ? val : null;
                            if (!dataUrl) return null;
                            
                            return (
                              <button 
                                key={key} 
                                type="button"
                                onClick={() => openDocPreview(fullLabel, dataUrl)}
                                className="text-[10.5px] bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-800 flex items-center gap-1.5 shadow-sm font-bold cursor-pointer transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-teal-bright" />
                                <span>{fullLabel}</span>
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No attachments uploaded</span>
                        )}
                      </div>
                    </div>

                    {app.university_feedback && (
                      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 max-w-md text-xs text-slate-750 leading-relaxed italic shadow-inner">
                        <span className="text-[9px] font-bold text-teal-bright uppercase tracking-wider block not-italic mb-1">Feedback Log</span>
                        "{app.university_feedback}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6 shadow-sm animate-[fadeIn_0.4s_ease-out]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-4">
            Edit University Profile
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-semibold text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">University Official Name</label>
                <input
                  type="text"
                  value={uniName}
                  onChange={(e) => setUniName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">QS World Ranking</label>
                <input
                  type="number"
                  value={uniRanking}
                  onChange={(e) => setUniRanking(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Campus City Location</label>
                <input
                  type="text"
                  value={uniCity}
                  onChange={(e) => setUniCity(e.target.value)}
                  placeholder="e.g. Munich, Berlin"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Accreditation credentials / Body</label>
                <input
                  type="text"
                  value={uniAccreditation}
                  onChange={(e) => setUniAccreditation(e.target.value)}
                  placeholder="e.g. Ministry of Science and Education"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Contact Phone</label>
                <input
                  type="text"
                  value={uniPhone}
                  onChange={(e) => setUniPhone(e.target.value)}
                  placeholder="e.g. +49 89 289-01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Contact Email</label>
                <input
                  type="email"
                  value={uniEmail}
                  onChange={(e) => setUniEmail(e.target.value)}
                  placeholder="e.g. admissions@tum.de"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Contact Address</label>
                <input
                  type="text"
                  value={uniAddress}
                  onChange={(e) => setUniAddress(e.target.value)}
                  placeholder="e.g. Arcisstraße 21, 80333 München, Germany"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Min Tuition Fee (USD)</label>
                <input
                  type="number"
                  value={uniFeeMin}
                  onChange={(e) => setUniFeeMin(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Max Tuition Fee (USD)</label>
                <input
                  type="number"
                  value={uniFeeMax}
                  onChange={(e) => setUniFeeMax(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Acceptance Rate (%)</label>
                <input
                  type="number"
                  value={uniAcceptance}
                  onChange={(e) => setUniAcceptance(Number(e.target.value))}
                  max={100}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Website Link</label>
                <input
                  type="url"
                  value={uniWebsite}
                  onChange={(e) => setUniWebsite(e.target.value)}
                  placeholder="https://www.university.edu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">University Logo</label>
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  {/* Preview Avatar */}
                  <div className="h-16 w-16 rounded-2xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {uniLogoUrl ? (
                      <img src={uniLogoUrl} alt="Logo preview" className="h-full w-full object-contain" />
                    ) : (
                      <Landmark className="h-6 w-6 text-slate-350" />
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div className="flex-1 relative border border-dashed border-slate-300 hover:border-teal-bright hover:bg-white rounded-xl p-3 text-center transition-all cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) simulateLogoUpload(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="text-[11px] font-bold text-slate-700">
                      {logoUploading ? (
                        <span className="text-teal-bright animate-pulse">Uploading {logoProgress}%</span>
                      ) : (
                        <span>Choose Logo Image / Drag Here</span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">PNG, JPG, or SVG. Min 150x150px.</div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">University Profile Description</label>
                <textarea
                  value={uniDesc}
                  onChange={(e) => setUniDesc(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all leading-relaxed"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Application Procedure instructions</label>
                <textarea
                  value={uniProcedure}
                  onChange={(e) => setUniProcedure(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all leading-relaxed"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">General Eligibility Guidelines</label>
                <textarea
                  value={uniEligibility}
                  onChange={(e) => setUniEligibility(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-6">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md px-4">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex justify-between items-center">
              <span>{selectedCourseId ? 'Edit Course Parameters' : 'Add New Degree Course'}</span>
              <button onClick={closeCourseModal} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Course Title</label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g. Master of Science in Data Engineering"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Degree Type</label>
                  <select
                    value={courseDegreeType}
                    onChange={(e) => setCourseDegreeType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  >
                    <option value="MSc">MSc</option>
                    <option value="MS">MS</option>
                    <option value="MBA">MBA</option>
                    <option value="PhD">PhD</option>
                    <option value="Professional Certification">Professional Certification</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Department</label>
                  <select
                    value={courseDept}
                    onChange={(e) => setCourseDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Business">Business</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Duration</label>
                  <input
                    type="text"
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(e.target.value)}
                    placeholder="e.g. 2 Years"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Annual Tuition (USD)</label>
                  <input
                    type="number"
                    value={courseFees}
                    onChange={(e) => setCourseFees(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Intake Semester</label>
                  <select
                    value={courseIntake}
                    onChange={(e) => setCourseIntake(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  >
                    <option value="Fall 2026">Fall 2026</option>
                    <option value="Spring 2026">Spring 2026</option>
                    <option value="Summer 2026">Summer 2026</option>
                    <option value="Fall 2027">Fall 2027</option>
                    <option value="Spring 2027">Spring 2027</option>
                    <option value="Rolling Admissions">Rolling Admissions</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Application Deadline</label>
                  <input
                    type="date"
                    value={courseDeadline}
                    onChange={(e) => setCourseDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Seats Available</label>
                  <input
                    type="number"
                    value={courseSeats}
                    onChange={(e) => setCourseSeats(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Required Entrance Exams</label>
                  <div className="flex flex-wrap gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[38px] items-center">
                    {['GRE', 'IELTS', 'TOEFL', 'GMAT', 'SAT'].map((exam) => {
                      const checked = courseExams.split(',').map(e => e.trim().toUpperCase()).includes(exam.toUpperCase());
                      return (
                        <label key={exam} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-750 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const currentExams = courseExams.split(',').map(e => e.trim()).filter(Boolean);
                              let nextExams;
                              if (currentExams.map(e => e.toUpperCase()).includes(exam.toUpperCase())) {
                                nextExams = currentExams.filter(e => e.toUpperCase() !== exam.toUpperCase());
                              } else {
                                nextExams = [...currentExams, exam];
                              }
                              setCourseExams(nextExams.join(', '));
                            }}
                            className="rounded border-slate-350 text-teal-bright focus:ring-teal-bright h-3.5 w-3.5"
                          />
                          <span>{exam}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Min IELTS score</label>
                  <input
                    type="number"
                    step="0.5"
                    value={courseIelts}
                    onChange={(e) => setCourseIelts(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Min TOEFL score</label>
                  <input
                    type="number"
                    value={courseToefl}
                    onChange={(e) => setCourseToefl(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Min GRE score</label>
                  <input
                    type="number"
                    value={courseGre}
                    onChange={(e) => setCourseGre(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Minimum CGPA requirement</label>
                  <input
                    type="number"
                    step="0.01"
                    value={courseMinCgpa}
                    onChange={(e) => setCourseMinCgpa(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Course Syllabus / Description</label>
                <textarea
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Summarize course curriculum details and modules..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 uppercase">Academic Eligibility / Requirements detail</label>
                <textarea
                  value={courseEligibility}
                  onChange={(e) => setCourseEligibility(e.target.value)}
                  placeholder="e.g. Bachelor's degree in Computer Science or related engineering background with strong coding foundations."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 p-2.5 focus:bg-white focus:outline-none focus:border-teal-bright transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeCourseModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  {submitting ? 'Saving...' : selectedCourseId ? 'Save Updates' : 'Publish Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Scholarship Modal */}
      {isSchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex justify-between items-center shrink-0">
              <span>{selectedSchId ? 'Edit Scholarship details' : 'Add University Scholarship'}</span>
              <button onClick={() => setIsSchModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"><X className="h-5 w-5" /></button>
            </h3>

            <form onSubmit={handleSaveScholarship} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Scholarship Title</label>
                  <input
                    type="text"
                    value={schName}
                    onChange={(e) => setSchName(e.target.value)}
                    placeholder="e.g. Fellowship Excellence Award"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-teal-bright focus:bg-white rounded-xl text-slate-800 p-2.5 focus:outline-none transition-all leading-relaxed font-semibold shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Funding Amount / Allowance</label>
                  <input
                    type="text"
                    value={schAmount}
                    onChange={(e) => setSchAmount(e.target.value)}
                    placeholder="e.g. Full Tuition or $10,000 allowance"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-teal-bright focus:bg-white rounded-xl text-slate-800 p-2.5 focus:outline-none transition-all leading-relaxed font-semibold shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Coverage Scope</label>
                  <select
                    value={schCoverage}
                    onChange={(e) => setSchCoverage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-teal-bright focus:bg-white rounded-xl text-slate-800 p-2.5 focus:outline-none transition-all font-semibold shadow-sm"
                  >
                    <option value="tuition fees">Tuition Fees</option>
                    <option value="living costs">Living Allowance</option>
                    <option value="partial funding">Partial Funding</option>
                    <option value="full coverage">Full Coverage</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Application Deadline</label>
                  <input
                    type="date"
                    value={schDeadline}
                    onChange={(e) => setSchDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-teal-bright focus:bg-white rounded-xl text-slate-800 p-2.5 focus:outline-none transition-all font-semibold shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Academic Eligibility / Requirements</label>
                <textarea
                  value={schCriteria}
                  onChange={(e) => setSchCriteria(e.target.value)}
                  placeholder="Specify GPA guidelines, target programs, and test score cutoffs..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-teal-bright focus:bg-white rounded-xl text-slate-800 p-2.5 focus:outline-none transition-all leading-relaxed font-semibold shadow-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-bright hover:bg-teal-700 text-white font-extrabold px-5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm text-xs"
                >
                  {submitting ? 'Saving...' : 'Publish Scholarship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {isEvalModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex items-center justify-between shrink-0">
              <span>Evaluate Application: {selectedApp.student_name}</span>
              <button 
                onClick={() => setIsEvalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"
              >
                <X className="h-5 w-5" />
              </button>
            </h3>

            <form onSubmit={handleConfirmEvaluation} className="space-y-4 text-xs font-semibold text-slate-800">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Applicant Name & Target Course</label>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-slate-800 font-semibold shadow-sm">
                  <div className="font-extrabold text-slate-950">{selectedApp.student_name}</div>
                  <div className="text-[11px] text-[#00A896] mt-0.5">{selectedApp.course_name}</div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Select Admission Decision</label>
                <select
                  value={evalStatus}
                  onChange={(e) => setEvalStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-teal-bright focus:bg-white rounded-xl text-slate-800 p-2.5 focus:outline-none transition-all font-bold shadow-sm"
                >
                  <option value="submitted">Submitted (Pending review)</option>
                  <option value="under_review">Under Review</option>
                  <option value="accepted">Accepted (Approve admission)</option>
                  <option value="rejected">Rejected</option>
                  <option value="waitlisted">Waitlisted</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px]">Internal Feedback & Decision log</label>
                <textarea
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  placeholder="e.g. Acceptance package dispatched. Required IELTS threshold fulfilled, CGPA qualifies. Enrollment expected by Sept."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-teal-bright focus:bg-white rounded-xl text-slate-800 p-2.5 focus:outline-none transition-all leading-relaxed font-semibold shadow-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEval}
                  className="bg-teal-bright hover:bg-teal-700 text-white font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm text-xs"
                >
                  {submittingEval ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting decision...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Decision</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {isPreviewModalOpen && previewDocData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-md font-bold text-slate-900 border-b border-slate-100 pb-3 mb-5 uppercase tracking-wide flex justify-between items-center">
              <span>{previewDocName}</span>
              <button 
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewDocData(null);
                }} 
                className="text-slate-400 hover:text-slate-650 cursor-pointer bg-transparent border-0"
              >
                <X className="h-5 w-5" />
              </button>
            </h3>

            <div className="space-y-4">
              {previewDocData.startsWith('data:application/pdf') ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-bright/10 flex items-center justify-center text-teal-bright">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">PDF Document</h4>
                    <p className="text-[11px] text-slate-400 mt-1">This document is formatted as a PDF.</p>
                  </div>
                  <a 
                    href={previewDocData} 
                    download={`${previewDocName.toLowerCase().replace(/ /g, '_')}.pdf`}
                    className="px-6 py-2 bg-gradient-teal-sunrise text-slate-950 font-extrabold rounded-xl hover:scale-[1.02] transition-transform text-xs cursor-pointer shadow-sm text-center"
                  >
                    Download PDF Document
                  </a>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-2 relative">
                  <img 
                    src={previewDocData} 
                    alt={`${previewDocName} Preview`} 
                    className="max-h-80 w-auto rounded-xl object-contain border border-slate-100 shadow-sm"
                  />
                  <a 
                    href={previewDocData} 
                    target="_blank" 
                    rel="noreferrer"
                    className="mt-3 text-[10px] text-[#00A896] hover:underline font-bold"
                  >
                    Open Original Image in New Tab &rarr;
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-5 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewDocData(null);
                }}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-850 transition-colors text-xs cursor-pointer shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
