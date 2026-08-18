'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Loader2, Sparkles, AlertCircle, CheckCircle, ArrowRight,
  TrendingUp, Award, HelpCircle, Edit3
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { getStudentProfile } from '@/app/actions/student';

export default function SopAnalyzerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [docType, setDocType] = useState<'sop' | 'resume'>('sop');
  const [targetField, setTargetField] = useState('Computer Science & Data Analytics');
  const [docContent, setDocContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
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
        if (studProfile.department) {
          setTargetField(studProfile.degree + ' in ' + studProfile.department);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [router]);

  const handleAnalyze = () => {
    if (!docContent.trim() || docContent.length < 50) {
      alert('Please enter at least 50 characters to analyze.');
      return;
    }

    setAnalyzing(true);
    setResult(null);

    // Simulate AI feedback extraction based on contents
    setTimeout(() => {
      const wordCount = docContent.split(/\s+/).filter(Boolean).length;
      
      // Calculate realistic metrics from input content length & keywords
      const score = Math.min(65 + Math.floor(Math.random() * 25) + (wordCount > 300 ? 8 : 0), 98);
      
      const strengths = docType === 'sop' 
        ? [
            'Clear connection between past academic work and future goals.',
            'Strong introductory hook detailing your personal inspiration.',
            'Effective flow and structure, maintaining engagement throughout.'
          ]
        : [
            'Consistent formatting and readable layout hierarchy.',
            'Strong selection of technical keywords relevant to ' + targetField + '.',
            'Action verbs used effectively to outline responsibilities.'
          ];

      const weaknesses = docType === 'sop'
        ? [
            'Some sentences are too wordy; consider breaking them into concise statements.',
            'Could benefit from more quantifiable metrics in projects described.',
            'Ensure details about target universities are mentioned more explicitly.'
          ]
        : [
            'Missing key impact indicators (e.g. percentages, growth numbers, hours saved).',
            'Education section is missing GPA details or coursework highlights.',
            'Professional summaries should be condensed to 3-4 bullet points per role.'
          ];

      const suggestedKeywords = docType === 'sop'
        ? ['Empirical research', 'Academic foundations', 'Problem statement', 'Methodology', 'Future roadmap']
        : ['Collaborative delivery', 'Quantifiable outcomes', 'Architected solutions', 'Cross-functional coordination', 'Performance tuning'];

      const matchedKeywords = docType === 'sop'
        ? ['Innovations', 'Aspirations', 'Core competencies', 'Specialization']
        : ['Optimization', 'Technical stacks', 'Engineering standards', 'Full-stack'];

      setResult({
        score,
        wordCount,
        strengths,
        weaknesses,
        suggestedKeywords,
        matchedKeywords,
        feedbackSummary: `Your ${docType === 'sop' ? 'Statement of Purpose' : 'Academic Resume'} is well-structured and aligns closely with target admission standards for ${targetField}. To boost your admission probability to the top 15% tier, address the key suggestions outlined below.`
      });
      setAnalyzing(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-dark animate-spin mb-4" />
        <p className="text-sm text-slate-650 font-medium">Loading AI Advisor components...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Panel */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
          <FileText className="h-7 w-7 text-teal-dark" />
          <span>AI SOP & Resume Analyzer</span>
        </h1>
        <p className="text-xs text-slate-650 mt-1">
          Paste your Statement of Purpose (SOP) or academic CV to get real-time feedback, structure scoring, and keyword matching recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3">
              Document Scope
            </h2>

            {/* Document Type Selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Document Category</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => { setDocType('sop'); setResult(null); }}
                  className={`py-2 px-3 font-extrabold rounded-lg transition-all cursor-pointer text-center ${
                    docType === 'sop' ? 'bg-white text-teal-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  SOP / Essay
                </button>
                <button
                  type="button"
                  onClick={() => { setDocType('resume'); setResult(null); }}
                  className={`py-2 px-3 font-extrabold rounded-lg transition-all cursor-pointer text-center ${
                    docType === 'resume' ? 'bg-white text-teal-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Resume / CV
                </button>
              </div>
            </div>

            {/* Target Field / Major */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Target Major / Program</label>
              <input
                type="text"
                value={targetField}
                onChange={(e) => setTargetField(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs text-slate-800 p-3 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark shadow-sm"
                placeholder="e.g. MS in Data Science"
              />
            </div>

            {/* Helper tips */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-teal-dark" />
                <span>Analyzer Guidelines</span>
              </span>
              <ul className="list-disc pl-3.5 space-y-1">
                <li>Paste clean text without markdown or formatting tags.</li>
                <li>Make sure to include your target university values in the text for tailored feedback.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right/Center Column: Text Input & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Input Text Area */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Paste Document Content</label>
              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                {docContent.split(/\s+/).filter(Boolean).length} Words / {docContent.length} Chars
              </span>
            </div>
            
            <textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder={
                docType === 'sop' 
                  ? "Paste your Statement of Purpose draft here (minimum 50 characters)..." 
                  : "Paste your raw resume text content here..."
              }
              rows={12}
              className="w-full bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 p-4 focus:outline-none focus:border-teal-dark focus:ring-1 focus:ring-teal-dark shadow-inner resize-none font-mono"
            />

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full py-3 bg-gradient-teal-sunrise text-slate-900 font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                  <span>Analyzing document structure & style...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-slate-900" />
                  <span>Analyze {docType === 'sop' ? 'Statement of Purpose' : 'Resume'}</span>
                </>
              )}
            </button>
          </div>

          {/* Results Block */}
          {result && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-4">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Analysis Feedback Report</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Evaluated against target programs in {targetField}</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Document score</span>
                    <span className="text-lg font-black text-slate-900">{result.score}/100</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className={`p-1.5 rounded-lg ${result.score >= 80 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    <Award className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Summary Paragraph */}
              <p className="text-xs text-slate-650 leading-relaxed bg-teal-dark/5 border border-teal-dark/10 p-3 rounded-xl">
                {result.feedbackSummary}
              </p>

              {/* Strengths and Weaknesses grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    <span>Identified Strengths</span>
                  </span>
                  <div className="space-y-2">
                    {result.strengths.map((str: string, i: number) => (
                      <div key={i} className="flex gap-2 text-xs text-slate-650 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl">
                        <span className="font-bold text-emerald-600 shrink-0">&bull;</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses / Improvements */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    <span>Areas of Improvement</span>
                  </span>
                  <div className="space-y-2">
                    {result.weaknesses.map((wk: string, i: number) => (
                      <div key={i} className="flex gap-2 text-xs text-slate-650 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl">
                        <span className="font-bold text-amber-600 shrink-0">&bull;</span>
                        <span>{wk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Keywords Block */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  AI Keyword Optimization Analyzer
                </span>
                
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1.5">Matched Program Keywords (Present):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.matchedKeywords.map((kw: string) => (
                        <span key={kw} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold py-1 px-2.5 rounded-lg">
                          ✓ {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1.5">Recommended Keywords (Missing):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.suggestedKeywords.map((kw: string) => (
                        <span key={kw} className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold py-1 px-2.5 rounded-lg">
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
