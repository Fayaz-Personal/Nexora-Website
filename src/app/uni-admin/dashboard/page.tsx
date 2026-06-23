'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, BookOpen, Users, Star, Plus, Trash2, Award, Clock, DollarSign, Loader2
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { getUniAdminDetails, getUniDashboardStats, getUniCourses, createCourse, deleteCourse } from '@/app/actions/uniAdmin';

export default function UniAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminDetails, setAdminDetails] = useState<any>(null);
  const [stats, setStats] = useState<any>({ totalCourses: 0, savedByStudents: 0, totalPredictions: 0, avgStudentCgpa: 'N/A' });
  const [courses, setCourses] = useState<any[]>([]);
  
  // Create Course state
  const [isAddMode, setIsAddMode] = useState(false);
  const [name, setName] = useState('');
  const [degreeType, setDegreeType] = useState('MSc');
  const [department, setDepartment] = useState('Computer Science');
  const [duration, setDuration] = useState('2 Years');
  const [fees, setFees] = useState(15000);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Admin Data
  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user || user.role !== 'uni_admin') {
        router.push('/auth');
        return;
      }

      const details = await getUniAdminDetails();
      if (details) {
        setAdminDetails(details);
        
        const dashboardStats = await getUniDashboardStats(details.university.id);
        setStats(dashboardStats);

        const list = await getUniCourses(details.university.id);
        setCourses(list);
      } else {
        router.push('/auth');
      }
      setLoading(false);
    }
    loadAdminData();
  }, [router]);

  // Handle Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminDetails) return;

    setSubmitting(true);
    const res = await createCourse({
      universityId: adminDetails.university.id,
      name,
      degreeType,
      department,
      duration,
      fees,
      description
    });

    if (res.success) {
      // Reload list and stats
      const list = await getUniCourses(adminDetails.university.id);
      setCourses(list);
      
      const dashboardStats = await getUniDashboardStats(adminDetails.university.id);
      setStats(dashboardStats);

      // Reset form
      setName('');
      setDescription('');
      setIsAddMode(false);
    } else {
      alert('Failed to create course.');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
        <p className="text-sm text-white/60">Loading university management terminal...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-teal-green/20 pb-6">
        <div>
          <span className="text-xs font-bold text-teal-bright uppercase tracking-wide">University Admin Dashboard</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {adminDetails?.university.name}
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Publish courses, manage tuition fees, and analyze matching candidates' academic portfolios.
          </p>
        </div>
        <button
          onClick={() => setIsAddMode(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-bright to-teal-green text-white font-bold px-4 py-2.5 text-xs hover:from-teal-green hover:to-yellow-green transition-all cursor-pointer shadow-md shadow-teal-bright/20"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Course</span>
        </button>
      </div>

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
            <div key={i} className="glass-card rounded-2xl p-5 border border-teal-green/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{card.label}</span>
                <span className="text-2xl font-extrabold text-white block mt-1">{card.value}</span>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Courses management block */}
      <div className="glass-card rounded-2xl p-6 border border-teal-green/20 space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-teal-green/20 pb-4">
          Offered Courses Catalogue
        </h3>

        {courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-10 w-10 text-white/40 mx-auto mb-3" />
            <p className="text-xs text-white/50">No courses listed. Click 'Add New Course' to start advertising.</p>
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
                    className="text-white/60 hover:text-orange-light transition-colors p-1.5 hover:bg-orange-light/15 rounded-lg border border-transparent hover:border-orange-light/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isAddMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-dark/80 backdrop-blur-md px-4">
          <div className="w-full max-w-xl glass-card rounded-2xl p-6 border border-teal-green/30 max-h-[90vh] overflow-y-auto">
            <h3 className="text-md font-bold text-white border-b border-teal-green/20 pb-3 mb-5 uppercase tracking-wide">
              Add New Degree Course
            </h3>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Course Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">Course Title</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Master of Science in Data Engineering"
                    className="w-full glass-input text-xs"
                    required
                  />
                </div>

                {/* Degree Type */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">Degree Type</label>
                  <select
                    value={degreeType}
                    onChange={(e) => setDegreeType(e.target.value)}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 text-xs focus:outline-none focus:border-yellow-green"
                  >
                    <option value="MSc">MSc</option>
                    <option value="MS">MS</option>
                    <option value="MBA">MBA</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-teal-dark border border-teal-green/30 rounded-xl text-white/70 p-2.5 text-xs focus:outline-none focus:border-yellow-green"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Business">Business</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 2 Years"
                    className="w-full glass-input text-xs"
                    required
                  />
                </div>

                {/* Fees */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">Annual Tuition (USD)</label>
                  <input
                    type="number"
                    value={fees}
                    onChange={(e) => setFees(Number(e.target.value))}
                    className="w-full glass-input text-xs"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">Course Syllabus / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize course curriculum details and prerequisites..."
                  rows={4}
                  className="w-full glass-input text-xs"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-teal-green/20 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddMode(false)}
                  className="px-4 py-2 rounded-xl border border-teal-green/20 text-xs font-bold hover:bg-teal-dark text-white/70 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-btn text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Publish Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
