'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, Send, Bot, User, Trash2, ArrowRight, HelpCircle, Info, Database,
  Mic, MicOff, Volume2, VolumeX, GraduationCap, Wallet, BookOpen, Compass, Award, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askAIAdvisor } from '@/app/actions/advisor';
import { getStudentProfile } from '@/app/actions/student';
import { getCurrentUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions = [
  'What scholarships match my academic profile?',
  'How do I study in Germany on a low budget?',
  'What are the visa requirements for the United States?',
  'Help me plan a study roadmap for Computer Science.',
  'What are the accommodation options in Canada?',
  'Are there any top study loans for international students?'
];

export default function AdvisorPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am Nexa, your AI Career & Global Education Mentor. I've synced with your student profile to evaluate admission eligibility, matching scholarships, travel budgets, visa block accounts, and visa guidelines. Ask me or tap the microphone to speak!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Student profile state
  const [profile, setProfile] = useState<any>(null);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep references stable for audio callbacks
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Fetch student profile details on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const user = await getCurrentUser();
        if (user) {
          const prof = await getStudentProfile(user.id);
          if (prof) {
            setProfile(prof);
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }
    loadProfile();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Stop synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // TTS Voice Speak function
  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    if (isMutedRef.current) {
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#_`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    window.speechSynthesis.speak(utterance);
  }, []);

  // STT Voice Recognition triggers
  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      setIsListening(false);
      setRecognitionError(null);
      window.dispatchEvent(new CustomEvent('nexa-voice-stop'));
      return;
    }

    // Stop speaking if Nexa is talking
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setInterimTranscript('');
    setRecognitionError(null);

    // Clean up any stale instances
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Fire external voice start event to pause global chatbot listening
    window.dispatchEvent(new CustomEvent('nexa-voice-start'));

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    let lastRecognizedText = '';
    rec.onresult = (event: any) => {
      let interimTranscriptText = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscriptText += event.results[i][0].transcript;
        }
      }
      const displayText = finalTranscript || interimTranscriptText;
      if (displayText.trim()) {
        lastRecognizedText = displayText;
        setInterimTranscript(displayText);
      }
    };

    rec.onerror = (event: any) => {
      const errType = event?.error;
      console.warn('[Advisor STT] Error:', errType, event);
      
      let friendlyError = 'An error occurred during speech recognition.';
      if (errType === 'no-speech') {
        friendlyError = 'No speech was detected. Please try speaking closer to your microphone.';
      } else if (errType === 'not-allowed') {
        friendlyError = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (errType === 'aborted') {
        friendlyError = 'Speech recognition was cancelled.';
      } else if (errType === 'network') {
        friendlyError = 'A network error occurred. Please check your internet connection.';
      }

      setRecognitionError(friendlyError);
      window.dispatchEvent(new CustomEvent('nexa-voice-stop'));

      // If it's a real error, show it for 3 seconds, then close overlay
      if (errType !== 'aborted') {
        setTimeout(() => {
          setIsListening(false);
          setRecognitionError(null);
        }, 3000);
      } else {
        setIsListening(false);
        setRecognitionError(null);
      }
    };

    rec.onend = () => {
      // Small timeout to allow state synchronization
      setTimeout(() => {
        setIsListening(prev => {
          // If we had an error, keep it visible for the timeout instead of auto-closing
          if (recognitionError) return prev;
          
          window.dispatchEvent(new CustomEvent('nexa-voice-stop'));
          // Auto-submit if we captured speech and are closing normally
          if (lastRecognizedText.trim()) {
            handleSendMessage(lastRecognizedText);
          }
          return false;
        });
      }, 100);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error('[Advisor STT] Failed to start:', e);
      setRecognitionError('Failed to initialize microphone.');
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('nexa-voice-stop'));
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Stop listening/speaking modes
    setIsListening(false);
    window.dispatchEvent(new CustomEvent('nexa-voice-stop'));
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    try {
      const response = await askAIAdvisor([...messages, userMessage]);
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      speakText(response.response);
    } catch (error: any) {
      console.error(error);
      const fallback = `Error: ${error?.message || String(error)}`;
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
      speakText(fallback);
    } finally {
      setLoading(false);
    }
  };

  // Safe JSON Parsing for onboarding scores
  const getExamScores = () => {
    if (!profile || !profile.onboarding_data) return null;
    try {
      const data = typeof profile.onboarding_data === 'string' 
        ? JSON.parse(profile.onboarding_data) 
        : profile.onboarding_data;
      return data.exams || null;
    } catch (e) {
      return null;
    }
  };

  const exams = getExamScores();

  // HTML Formatter for Markdown Advisor responses
  const renderMarkdown = (text: string) => {
    let formatted = text
      .replace(/### (.*?)\n/g, '<h4 class="text-sm font-extrabold text-slate-900 mt-4 mb-2">$1</h4>')
      .replace(/## (.*?)\n/g, '<h3 class="text-base font-extrabold text-teal-900 mt-6 mb-3">$1</h3>')
      .replace(/# (.*?)\n/g, '<h2 class="text-lg font-extrabold text-teal-950 mt-8 mb-4">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-teal-950">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>')
      .replace(/- (.*?)\n/g, '<li class="ml-5 list-disc text-slate-700 my-1.5">$1</li>');

    return formatted.split('\n').map((line) => {
      if (line.trim().startsWith('<li') || line.trim().startsWith('<h')) return line;
      if (!line.trim()) return '';
      return `<p class="mb-2.5 leading-relaxed text-slate-700 font-medium">${line}</p>`;
    }).join('');
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden py-10 px-4 sm:px-6 lg:px-8">
      {/* Google-style Speech Listening Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-8 rounded-3xl border border-teal-500/20 max-w-md w-full mx-4 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Top Accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500" />
              
              {/* Close Button */}
              <button
                onClick={() => {
                  if (recognitionRef.current) {
                    recognitionRef.current.abort();
                  }
                  setIsListening(false);
                  window.dispatchEvent(new CustomEvent('nexa-voice-stop'));
                }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Pulsing Google-style Voice Indicator */}
              <div className="relative my-8 flex items-center justify-center">
                {/* Voice rings */}
                <span className="absolute w-24 h-24 rounded-full bg-teal-500/20 animate-ping" />
                <span className="absolute w-32 h-32 rounded-full bg-cyan-500/10 animate-pulse [animation-duration:1.5s]" />
                
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-xl relative z-10">
                  <Mic className="h-8 w-8 animate-pulse" />
                </div>
              </div>

              <h3 className="text-md font-black text-slate-900 uppercase tracking-wider mb-2">
                Listening to you...
              </h3>
              
              <p className="text-[11px] text-slate-500 mb-6 font-semibold">
                Speak now. Nexa will transcribe your voice in real time.
              </p>

              {/* Live transcript text box / Error display */}
              {recognitionError ? (
                <div className="my-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-700 w-full animate-shake">
                  {recognitionError}
                </div>
              ) : (
                <div className="min-h-[100px] w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-center">
                  <p className="text-xs font-bold text-slate-800 leading-relaxed italic">
                    {interimTranscript || "Say something like: 'What are the visa requirements for Germany?'"}
                  </p>
                </div>
              )}

              {/* Waveform graphic */}
              <div className="flex items-center gap-1.5 justify-center mt-6 h-6">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-gradient-to-t from-teal-500 to-cyan-500 rounded-full"
                    animate={{
                      height: [6, 24, 6]
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-4 w-full mt-8">
                <button
                  onClick={() => {
                    if (recognitionRef.current) {
                      recognitionRef.current.abort();
                    }
                    setIsListening(false);
                    window.dispatchEvent(new CustomEvent('nexa-voice-stop'));
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (interimTranscript.trim()) {
                      handleSendMessage(interimTranscript);
                    }
                  }}
                  className="flex-grow py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-extrabold rounded-xl transition-all cursor-pointer text-xs shadow-md"
                  disabled={!interimTranscript.trim()}
                >
                  Submit Query
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Dynamic Background visual blobs */}
      <div className="absolute top-10 left-1/4 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-800 text-xs font-bold mb-3"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
            <span>NEXA • Voice-Enabled Study Abroad Mentor</span>
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 sm:text-5xl tracking-tight">
            Meet <span className="bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-600 bg-clip-text text-transparent">Nexa AI Advisor</span>
          </h1>
          <p className="mt-2.5 text-slate-650 max-w-xl mx-auto text-xs md:text-sm font-semibold">
            Evaluate admission eligibility, scholarships, visas, and education roadmaps via continuous speech or text counselor interactions.
          </p>
        </div>

        {/* Dual Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT COLUMN: Synced Student Credentials & Suggestions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Student Profile sync status card */}
            <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-400" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Database className="h-4 w-4 text-teal-650" />
                <span>Profile Sync Status</span>
              </h3>

              {profile ? (
                <div className="space-y-3.5 text-xs font-semibold text-slate-650">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Student Name</span>
                    <span className="text-slate-900 font-extrabold">{profile.name || 'Ashwin'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Target Program</span>
                    <span className="text-slate-900 font-extrabold">{profile.degree || 'MS'} - {profile.department || 'Computer Science'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Academic CGPA</span>
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-750 border border-teal-200/50 rounded font-extrabold">
                      {profile.cgpa || '8.40'} / 10
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Display Budget</span>
                    <span className="text-slate-900 font-extrabold">
                      {profile.preferred_currency || 'INR'} {Number(profile.budget || 1500000).toLocaleString()}/yr
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Target Destinations</span>
                    <span className="text-slate-900 font-extrabold">
                      {profile.preferred_countries?.join(', ') || 'Germany'}
                    </span>
                  </div>
                  
                  {/* Exams */}
                  <div className="pt-1.5 space-y-2">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] block">Test Scores</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200/40 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-slate-400 block uppercase">IELTS</span>
                        <span className="text-xs text-slate-800 font-extrabold">{exams?.ielts || '7.5'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/40 p-2 rounded-xl text-center">
                        <span className="text-[9px] text-slate-400 block uppercase">GRE</span>
                        <span className="text-xs text-slate-800 font-extrabold">{exams?.gre || '320'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-450">
                    <Database className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-550 block">Guest Profile Mode</span>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-1 font-semibold">
                    Sign in to sync your CGPA, budgets, and exam scores for highly personalized mentoring advice.
                  </p>
                </div>
              )}
            </div>

            {/* Clickable Suggested Checklist Card */}
            <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5 shadow-lg flex-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-cyan-600" />
                <span>Suggested Questions</span>
              </h3>
              <div className="space-y-2.5">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200/60 bg-white/50 hover:bg-teal-50/60 hover:border-teal-500/25 transition-all text-xs font-bold text-slate-750 flex items-center justify-between group cursor-pointer"
                  >
                    <span className="group-hover:text-teal-950 transition-colors pr-2 leading-relaxed">{q}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Chat Desk & Floating Mic Panel */}
          <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden min-h-[600px] relative">
            
            {/* Top glowing gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500" />

            {/* Chat header status bar */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-800">
                    <Bot className="h-5.5 w-5.5 text-teal-700" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Nexa AI Desk</h4>
                  <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Always listening for your queries</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice mute toggle button */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50 transition-all cursor-pointer ${
                    isMuted ? 'text-rose-600 border-rose-200 bg-rose-50' : 'text-slate-650'
                  }`}
                  title={isMuted ? "Unmute Nexa Voice Output" : "Mute Nexa Voice Output"}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => {
                    setMessages([{
                      role: 'assistant',
                      content: "Hello! I am Nexa, your AI Career & Global Education Mentor. How can I help you plan your higher studies journey today?"
                    }]);
                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                    }
                    setIsSpeaking(false);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-extrabold"
                  title="Clear Chat Logs"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 max-h-[460px] scrollbar-thin scrollbar-thumb-slate-200">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3.5 items-start ${isAssistant ? '' : 'justify-end'}`}
                    >
                      {isAssistant && (
                        <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-800 shrink-0 shadow-xs">
                          <Bot className="h-4.5 w-4.5 text-teal-700" />
                        </div>
                      )}

                      <div className={`p-4 rounded-2xl text-xs max-w-[82%] shadow-sm leading-relaxed ${
                        isAssistant 
                          ? 'border border-slate-100 text-slate-800 rounded-tl-none bg-slate-50/70 font-semibold' 
                          : 'bg-gradient-to-r from-teal-600 to-teal-800 text-white font-extrabold rounded-tr-none'
                      }`}>
                        {isAssistant ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} 
                            className="space-y-2"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {!isAssistant && (
                        <div className="h-9 w-9 rounded-xl bg-teal-700 flex items-center justify-center text-white shrink-0 shadow-md">
                          <User className="h-4.5 w-4.5" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {loading && (
                <div className="flex gap-3.5 items-start">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-800 shrink-0 shadow-xs">
                    <Bot className="h-4.5 w-4.5 text-teal-700" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex space-x-1.5 items-center p-3 rounded-2xl bg-slate-50 border border-slate-200/50 h-10 w-20 justify-center">
                      <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" />
                    </div>
                    <span className="text-[10px] text-slate-450 italic font-bold">Nexa is matching database metrics...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Panel: Waveforms & Microphone Action */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/70 backdrop-blur-md space-y-4">
              
              {/* Dynamic Sound Waveforms */}
              <div className="h-12 flex items-center justify-center bg-white/50 rounded-xl border border-slate-200/40 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {isListening ? (
                    <motion.div 
                      key="listening-wave"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 justify-center"
                    >
                      <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mr-2 animate-pulse">Listening</span>
                      {[...Array(15)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-cyan-500 rounded-full"
                          animate={{
                            height: [8, 36, 8]
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.05,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </motion.div>
                  ) : isSpeaking ? (
                    <motion.div 
                      key="speaking-wave"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 justify-center"
                    >
                      <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest mr-2 animate-pulse">Nexa Speaking</span>
                      {[...Array(15)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-teal-600 rounded-full"
                          animate={{
                            height: [12, 28, 12]
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.04,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="idle-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <span>Microphone Idle</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Controls bar */}
              <div className="flex gap-3 items-center">
                
                {/* Floating Microphone Trigger Button */}
                <button
                  type="button"
                  onClick={startListening}
                  className={`p-4 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-lg transition-all relative group overflow-hidden ${
                    isListening
                      ? 'bg-red-500 text-white ring-4 ring-red-400/20 hover:scale-95'
                      : 'bg-gradient-to-r from-teal-600 to-teal-850 hover:from-teal-700 hover:to-teal-900 text-white hover:scale-105 active:scale-95'
                  }`}
                  title={isListening ? "Stop Speech Input" : "Click to speak to Nexa"}
                >
                  <AnimatePresence>
                    {isListening && (
                      <motion.div
                        className="absolute inset-0 bg-red-650 rounded-full"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    )}
                  </AnimatePresence>
                  <Mic className="h-5.5 w-5.5 relative z-10" />
                </button>

                {/* Keyboard typing fallback */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
                  className="flex-grow flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Or type your admission, visa or loan details..."
                    disabled={loading}
                    className="flex-grow bg-white border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-slate-800 rounded-xl px-4 py-3.5 text-xs outline-none transition-all placeholder:text-slate-400 font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:opacity-95 text-white font-extrabold px-5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer shadow-lg hover:scale-103 active:scale-97 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 text-xs"
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    <span>Send</span>
                  </button>
                </form>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
