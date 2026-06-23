'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, ShieldCheck, HelpCircle, ArrowRight, Loader2, Landmark, 
  Award, Globe, BookOpen, Percent, ListTodo, Briefcase, FileText, CheckCircle2
} from 'lucide-react';
import { getUniversities } from '@/app/actions/student';
import { 
  predictAdmissionChance, 
  generateAIRecommendations, 
  PredictChanceResult, 
  RecommendationResult 
} from '@/app/actions/recommendations';

export default function RecommendationsHub() {
  const [activeTab, setActiveTab] = useState<'predictor' | 'recommender'>('predictor');
  const [dbUnivs, setDbUnivs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load universities list for target selection
  useEffect(() => {
    getUniversities({}).then(data => {
      setDbUnivs(data || []);
    });
  }, []);

  // --- Predictor Form States ---
  const [degree, setDegree] = useState('BTech');
  const [department, setDepartment] = useState('Computer Science');
  const [cgpa, setCgpa] = useState(8.5);
  const [ielts, setIelts] = useState(7.5);
  const [toefl, setToefl] = useState(100);
  const [greScore, setGreScore] = useState('320');
  const [projects, setProjects] = useState(3);
  const [researchPapers, setResearchPapers] = useState(1);
  const [workExperience, setWorkExperience] = useState(12);
  const [targetUnivId, setTargetUnivId] = useState('');
  const [targetCourse, setTargetCourse] = useState('MS in Computer Science');
  const [predictorResult, setPredictorResult] = useState<PredictChanceResult | null>(null);

  // --- Recommender Form States ---
  const [academicBackground, setAcademicBackground] = useState('Bachelor in Computer Science');
  const [recCgpa, setRecCgpa] = useState(8.5);
  const [skills, setSkills] = useState('Python, Machine Learning, SQL');
  const [interests, setInterests] = useState('Artificial Intelligence, Data Engineering');
  const [careerGoals, setCareerGoals] = useState('Become an AI Research Engineer');
  const [budget, setBudget] = useState(30000);
  const [preferredCountries, setPreferredCountries] = useState('Germany, United States');
  const [preferredDegree, setPreferredDegree] = useState('MS');
  const [recommenderResult, setRecommenderResult] = useState<RecommendationResult | null>(null);

  // --- Form Handlers ---
  const handlePredictorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUnivId) {
      alert('Please select a Target University');
      return;
    }
    setLoading(true);
    try {
      const res = await predictAdmissionChance({
        degree,
        department,
        cgpa,
        ielts,
        toefl,
        greScore,
        projects,
        researchPapers,
        workExperience,
        targetUnivId: Number(targetUnivId),
        targetCourse
      });
      setPredictorResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      const interestsArray = interests.split(',').map(i => i.trim()).filter(Boolean);
      const goalsArray = careerGoals.split(',').map(g => g.trim()).filter(Boolean);
      const countriesArray = preferredCountries.split(',').map(c => c.trim()).filter(Boolean);

      const res = await generateAIRecommendations({
        academicBackground,
        cgpa: recCgpa,
        skills: skillsArray,
        interests: interestsArray,
        careerGoals: goalsArray,
        budget,
        preferredCountries: countriesArray,
        preferredDegree
      });
      setRecommenderResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Page Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-bright/10 border border-teal-bright/20 text-teal-dark text-xs font-semibold mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>LLM-Powered Admission Analytics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          AI Smart Recommendation <span className="text-gradient-teal-sunrise">Hub</span>
        </h1>
        <p className="mt-3 text-slate-700 max-w-xl mx-auto text-sm">
          Run profile audits to check target university fit, or use our matching engine to discover courses and scholarships.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex justify-center">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold shadow-sm">
          <button
            onClick={() => { setActiveTab('predictor'); setPredictorResult(null); setRecommenderResult(null); }}
            className={`px-6 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'predictor' 
                ? 'bg-teal-dark text-white shadow-md' 
                : 'text-slate-600 hover:text-teal-dark'
            }`}
          >
            Admission Chance Predictor
          </button>
          <button
            onClick={() => { setActiveTab('recommender'); setPredictorResult(null); setRecommenderResult(null); }}
            className={`px-6 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'recommender' 
                ? 'bg-teal-dark text-white shadow-md' 
                : 'text-slate-600 hover:text-teal-dark'
            }`}
          >
            AI Course Recommender
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 text-teal-dark animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-800 animate-pulse">Evaluating parameters via Llama-3 AI...</p>
          <p className="text-xs text-slate-500 mt-1">Comparing academic parameters with university admission benchmarks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* TAB 1: ADMISSION PREDICTOR */}
          {activeTab === 'predictor' && (
            <>
              {/* Form Side */}
              <div className="lg:col-span-5">
                <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white space-y-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ListTodo className="h-5 w-5 text-teal-bright" />
                    <span>Audit Profile Details</span>
                  </h3>

                  <form onSubmit={handlePredictorSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Current Degree</label>
                        <input
                          type="text"
                          value={degree}
                          onChange={(e) => setDegree(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                          placeholder="e.g. BTech"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Department / Major</label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                          placeholder="e.g. Computer Science"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">CGPA (or %)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={cgpa}
                          onChange={(e) => setCgpa(Number(e.target.value))}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">IELTS Score</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ielts}
                          onChange={(e) => setIelts(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                          placeholder="e.g. 7.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">TOEFL Score</label>
                        <input
                          type="number"
                          value={toefl}
                          onChange={(e) => setToefl(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                          placeholder="e.g. 100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">GRE Score</label>
                        <input
                          type="text"
                          value={greScore}
                          onChange={(e) => setGreScore(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                          placeholder="e.g. 320"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Projects</label>
                        <input
                          type="number"
                          value={projects}
                          onChange={(e) => setProjects(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Research Papers</label>
                        <input
                          type="number"
                          value={researchPapers}
                          onChange={(e) => setResearchPapers(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Work Exp (Months)</label>
                        <input
                          type="number"
                          value={workExperience}
                          onChange={(e) => setWorkExperience(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Target Course</label>
                        <input
                          type="text"
                          value={targetCourse}
                          onChange={(e) => setTargetCourse(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                          placeholder="e.g. MS in Data Science"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Target University</label>
                      <select
                        value={targetUnivId}
                        onChange={(e) => setTargetUnivId(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark cursor-pointer"
                      >
                        <option value="">-- Select Target School --</option>
                        {dbUnivs.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.country_name})</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all cursor-pointer shadow-md text-xs"
                    >
                      <span>Predict Admission Chance</span>
                      <Sparkles className="h-4 w-4 text-teal-bright animate-pulse" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Results Side */}
              <div className="lg:col-span-7">
                {predictorResult ? (
                  <div className="space-y-6">
                    
                    {/* Gauge Card */}
                    <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white flex flex-col sm:flex-row items-center gap-8">
                      <div className="relative inline-flex items-center justify-center shrink-0">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="52"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-slate-100"
                            fill="transparent"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="52"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-teal-dark animate-pulse"
                            fill="transparent"
                            strokeDasharray={326}
                            strokeDashoffset={326 - (326 * (predictorResult.probability || 50)) / 100}
                          />
                        </svg>
                        <span className="absolute text-2xl font-black text-slate-900">
                          {predictorResult.probability}%
                        </span>
                      </div>

                      <div className="space-y-2 text-center sm:text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Computed Chance</span>
                        <h3 className="text-xl font-extrabold text-slate-900">
                          Admission Status: <span className="text-gradient-teal-sunrise">{predictorResult.status}</span>
                        </h3>
                        <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                          Your profile shows compatibility relative to competitive admission statistics for your selected target school.
                        </p>
                      </div>
                    </div>

                    {/* Explanations Card */}
                    <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <FileText className="h-5 w-5 text-teal-bright" />
                        <span>AI Profile Audit Explanation</span>
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {predictorResult.explanation}
                      </p>
                    </div>

                    {/* Alternatives Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Safe Category */}
                      <div className="glass-card rounded-2xl p-4 border border-teal-500/10 shadow-sm bg-white space-y-3">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider inline-block">Safe Universities</span>
                        <div className="space-y-1.5">
                          {predictorResult.safeUniversities?.map((u, i) => (
                            <div key={i} className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0 truncate">
                              {u}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Moderate Category */}
                      <div className="glass-card rounded-2xl p-4 border border-teal-500/10 shadow-sm bg-white space-y-3">
                        <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider inline-block">Moderate Universities</span>
                        <div className="space-y-1.5">
                          {predictorResult.moderateUniversities?.map((u, i) => (
                            <div key={i} className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0 truncate">
                              {u}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dream Category */}
                      <div className="glass-card rounded-2xl p-4 border border-teal-500/10 shadow-sm bg-white space-y-3">
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase tracking-wider inline-block">Dream Universities</span>
                        <div className="space-y-1.5">
                          {predictorResult.dreamUniversities?.map((u, i) => (
                            <div key={i} className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0 truncate">
                              {u}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-12 text-center border border-teal-green/20 max-w-md mx-auto">
                    <Sparkles className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-900">Run Admission Predictor</p>
                    <p className="text-xs text-slate-650 mt-1">Submit your profile parameters on the left to estimate probability indices.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: COURSE RECOMMENDER */}
          {activeTab === 'recommender' && (
            <>
              {/* Form Side */}
              <div className="lg:col-span-5">
                <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white space-y-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ListTodo className="h-5 w-5 text-teal-bright" />
                    <span>Audit Recommendation Filters</span>
                  </h3>

                  <form onSubmit={handleRecommenderSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Academic Background</label>
                      <input
                        type="text"
                        value={academicBackground}
                        onChange={(e) => setAcademicBackground(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        placeholder="e.g. Bachelor in Computer Science"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">CGPA</label>
                        <input
                          type="number"
                          step="0.01"
                          value={recCgpa}
                          onChange={(e) => setRecCgpa(Number(e.target.value))}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Preferred Degree</label>
                        <select
                          value={preferredDegree}
                          onChange={(e) => setPreferredDegree(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark cursor-pointer"
                        >
                          <option value="MS">MS</option>
                          <option value="MBA">MBA</option>
                          <option value="MSc">MSc</option>
                          <option value="MTech">MTech</option>
                          <option value="PhD">PhD</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Key Skills (comma separated)</label>
                      <input
                        type="text"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        placeholder="e.g. Python, SQL, Machine Learning"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Academic Interests (comma separated)</label>
                      <input
                        type="text"
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        placeholder="e.g. Deep Learning, Data Analytics"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Career Goals (comma separated)</label>
                      <input
                        type="text"
                        value={careerGoals}
                        onChange={(e) => setCareerGoals(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        placeholder="e.g. Become an AI Research Engineer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Budget Limit ($/yr)</label>
                        <input
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(Number(e.target.value))}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Target Countries (comma separated)</label>
                        <input
                          type="text"
                          value={preferredCountries}
                          onChange={(e) => setPreferredCountries(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-dark"
                          placeholder="e.g. Germany, USA"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all cursor-pointer shadow-md text-xs"
                    >
                      <span>Generate Recommendations</span>
                      <Sparkles className="h-4 w-4 text-teal-bright animate-pulse" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Results Side */}
              <div className="lg:col-span-7 space-y-6">
                {recommenderResult ? (
                  <>
                    {/* Recommended Universities */}
                    <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Landmark className="h-5 w-5 text-teal-bright" />
                        <span>Recommended Universities</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommenderResult.universities?.map((u, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900">{u.name}</span>
                              <span className="text-[10px] text-teal-dark bg-teal-50 px-1.5 py-0.5 rounded font-extrabold uppercase">Rank #{u.ranking}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">{u.country}</span>
                            <p className="text-[11px] text-slate-650 mt-1 leading-relaxed">{u.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommended Courses */}
                    <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <BookOpen className="h-5 w-5 text-teal-bright" />
                        <span>Top Matching Courses</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommenderResult.courses?.map((c, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-slate-900 block">{c.name}</span>
                            <span className="text-[10px] text-slate-500 block">{c.university} &bull; {c.duration}</span>
                            <span className="text-[10px] font-extrabold text-teal-dark block mt-0.5">Est. Cost: {c.fees}</span>
                            <p className="text-[11px] text-slate-650 mt-1 leading-relaxed italic">Match Reason: {c.matchReason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommended Scholarships */}
                    <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Award className="h-5 w-5 text-teal-bright" />
                        <span>Scholarship Opportunities</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommenderResult.scholarships?.map((s, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-slate-900 block">{s.name}</span>
                            <span className="text-[10px] text-slate-550 block">Provider: {s.provider}</span>
                            <span className="text-[10px] font-extrabold text-teal-dark block">Funding: {s.amount}</span>
                            <p className="text-[11px] text-slate-650 mt-1">{s.criteria}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suitable Countries */}
                    <div className="glass-card rounded-2xl p-6 border border-teal-500/10 shadow-lg bg-white space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Globe className="h-5 w-5 text-teal-bright" />
                        <span>Suitable Countries & Cost of Living</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommenderResult.countries?.map((c, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-slate-900 block">{c.name}</span>
                            <span className="text-[10px] text-slate-500 block">Avg. Cost: {c.averageCost}</span>
                            <p className="text-[11px] text-slate-650 mt-1">{c.visaInfo}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass-card rounded-2xl p-12 text-center border border-teal-green/20 max-w-md mx-auto">
                    <Sparkles className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-900">Run Recommendation Engine</p>
                    <p className="text-xs text-slate-650 mt-1">Submit your filters on the left to fetch matched universities, courses, and scholarships.</p>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
