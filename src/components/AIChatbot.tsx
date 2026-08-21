'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Award,
  Compass,
  Wallet,
  Languages,
  CheckCircle2,
  Target,
  GraduationCap,
  Trophy,
  MessageSquare,
  LayoutDashboard,
  Loader2,
  UserCheck,
  Zap,
  TrendingUp,
  Globe
} from 'lucide-react';
import { askAIAdvisor } from '@/app/actions/advisor';
import { getNexaData, completeNexaMission, getLeaderboard, awardEncouragementPoints } from '@/app/actions/student';
import { Volume2, VolumeX, Play, Pause, Mic } from 'lucide-react';

interface LeaderboardItem {
  name: string;
  level: number;
  xp: number;
  ep: number;
  preferred_countries: string[];
  preferred_currency: string;
}

// TypeScript Interfaces for Gamification & Dashboard data
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
}

interface NexaProfile {
  id?: number;
  name: string;
  degree: string;
  department: string;
  preferred_countries: string[];
  xp: number;
  level: number;
  achievements: Achievement[];
  missions: Mission[];
  eligibility_score: number;
  ep?: number;
  passport_stamps?: string[];
}

interface ReadinessData {
  academic: number;
  language: number;
  financial: number;
  application: number;
  total: number;
}

interface UnivRecommendation {
  name: string;
  ranking: number;
  country: string;
}

interface ScholarshipRecommendation {
  name: string;
  provider: string;
  amount: string;
}

interface RecommendationsData {
  universities: UnivRecommendation[];
  scholarships: ScholarshipRecommendation[];
  nextActions: string[];
}

// Guest mode fallback using default student profile
const defaultGuestData = {
  profile: {
    name: 'Ashwin',
    degree: 'MS',
    department: 'Computer Science',
    preferred_countries: ['Germany'],
    xp: 120,
    level: 1,
    achievements: [
      { id: 'onboarding', title: 'First Step', description: 'Complete onboarding profile', icon: 'UserCheck', unlockedAt: new Date().toISOString() }
    ],
    missions: [
      { id: 'ielts_profile', title: 'Complete IELTS Profile', description: 'Update language score details', xpReward: 150, completed: false },
      { id: 'bookmark_univ', title: 'Bookmark a University', description: 'Save 1 target university to your dashboard', xpReward: 100, completed: false },
      { id: 'explore_loans', title: 'Explore Loan Options', description: 'Compare top study abroad loans in the portal', xpReward: 120, completed: false }
    ],
    eligibility_score: 80
  } as NexaProfile,
  readiness: {
    academic: 95,
    language: 45,
    financial: 85,
    application: 30,
    total: 64
  } as ReadinessData,
  recommendations: {
    universities: [
      { name: 'Technical University of Munich', ranking: 37, country: 'Germany' },
      { name: 'Stanford University', ranking: 3, country: 'United States' },
      { name: 'University of Oxford', ranking: 4, country: 'United Kingdom' }
    ],
    scholarships: [
      { name: 'DAAD Scholarship (EPOS)', provider: 'German Academic Exchange', amount: 'Full Funding' },
      { name: 'Knight-Hennessy Scholars', provider: 'Stanford University', amount: 'Full Tuition' }
    ],
    nextActions: [
      'Complete IELTS section to unlock scholarship recommendations.',
      'Bookmark a university to track application requirements.',
      'Compare banking partners in the Education Loan Portal.'
    ]
  } as RecommendationsData
};

// Reusable Circular Progress Ring Widget
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
}

const CircularProgress = ({
  percentage,
  size = 65,
  strokeWidth = 6,
  color = 'stroke-teal-500',
  label
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1 p-2 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xs rounded-xl border border-teal-500/5 shadow-xs transition-all duration-300 hover:border-teal-500/20">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            className="text-slate-100 dark:text-slate-800 stroke-current"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle */}
          <motion.circle
            className={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{percentage}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center tracking-tight truncate max-w-[70px] mt-1">
        {label}
      </span>
    </div>
  );
};

// SVG Animated Globe Widget
interface GlobeWidgetProps {
  onClick: () => void;
  isOpen: boolean;
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  showBubble: boolean;
  setShowBubble: (val: boolean) => void;
  isSpeaking: boolean;
  chatLoading: boolean;
  isSleeping: boolean;
  isWandering: boolean;
  setIsWandering: (val: boolean) => void;
  direction: 'left' | 'right';
  isListeningForSpeech: boolean;
  isWakeWordMode: boolean;
  setIsWakeWordMode: (val: boolean) => void;
}

const NexaGlobe = ({ 
  onClick, 
  isOpen, 
  position, 
  setPosition, 
  isDragging, 
  setIsDragging, 
  showBubble, 
  setShowBubble,
  isSpeaking,
  chatLoading,
  isSleeping,
  isWandering,
  setIsWandering,
  direction,
  isListeningForSpeech,
  isWakeWordMode,
  setIsWakeWordMode
}: GlobeWidgetProps) => {
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.15}
      animate={{ 
        x: position.x, 
        y: position.y, 
        scale: isOpen ? 0 : 1,
        rotate: isDragging ? [0, -6, 6, 0] : (direction === 'left' ? -6 : 6)
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 60, 
        damping: 18,
        rotate: isDragging ? { repeat: Infinity, duration: 0.5 } : undefined
      }}
      whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(event, info) => {
        setIsDragging(false);
        setPosition({
          x: position.x + info.offset.x,
          y: position.y + info.offset.y
        });
      }}
      onClick={(e) => {
        if (isDragging) return;
        onClick();
      }}
      className={`fixed bottom-6 right-6 z-40 cursor-pointer ${
        isOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Sleep Zzz Indicators */}
      {isSleeping && !isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0, 0.8, 0], 
              y: [-10, -40], 
              x: [0, 10, -5, 5],
              scale: [0.6, 1, 0.8] 
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeOut'
            }}
            className="absolute -top-4 -right-1 text-[10px] font-black text-cyan-300 pointer-events-none select-none z-60"
          >
            Zz
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 5, x: 5, scale: 0.4 }}
            animate={{ 
              opacity: [0, 0.7, 0], 
              y: [-5, -30], 
              x: [5, 12, 2, 8],
              scale: [0.5, 0.8, 0.6] 
            }}
            transition={{ 
              duration: 3.5, 
              delay: 1.2,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeOut'
            }}
            className="absolute -top-6 right-4 text-[8px] font-extrabold text-teal-300 pointer-events-none select-none z-60"
          >
            z
          </motion.div>
        </>
      )}

      {/* Speech Bubble absolute positioned inside the container */}
      <AnimatePresence>
        {!isOpen && showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="absolute bottom-22 left-1/2 -translate-x-1/2 z-55 bg-slate-900 text-white text-[11px] font-bold px-3.5 py-2 rounded-xl shadow-xl border border-teal-500/30 w-[170px] text-center"
          >
            <div className="relative">
              {/* Wandering Control Toggle on the left */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWandering(!isWandering);
                }}
                className="absolute -top-3.5 -left-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-slate-700 text-[8px] shadow-md transition-colors cursor-pointer select-none"
                title={isWandering ? "Pause Nexa Character Wandering" : "Enable Nexa Character Wandering"}
              >
                {isWandering ? "⏸" : "▶"}
              </button>

              {/* Voice Wake Word Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWakeWordMode(!isWakeWordMode);
                }}
                className={`absolute -top-3.5 -left-0.5 rounded-full w-4.5 h-4.5 flex items-center justify-center border text-[8px] shadow-md transition-colors cursor-pointer select-none ${
                  isWakeWordMode 
                    ? 'bg-red-500 border-red-400 text-white animate-pulse font-bold' 
                    : 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-700'
                }`}
                title={isWakeWordMode ? "Disable Voice Assistant ('Hey Nexa')" : "Enable Jarvis Voice Assistant ('Hey Nexa')"}
              >
                🎙️
              </button>

              <div className="pt-1.5 space-y-1">
                {isListeningForSpeech ? (
                  <div className="space-y-1 text-teal-350">
                    <span className="text-[10px] text-cyan-300 animate-pulse block">Listening... 🎙️</span>
                    <div className="flex gap-1 justify-center items-center h-3">
                      <div className="w-0.5 bg-cyan-400 h-2 animate-bounce" />
                      <div className="w-0.5 bg-cyan-400 h-3 animate-bounce [animation-delay:0.1s]" />
                      <div className="w-0.5 bg-cyan-400 h-2 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-0.5 bg-cyan-400 h-1.5 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                ) : isWakeWordMode ? (
                  <span className="text-cyan-300 font-bold block text-[10px]">
                    Voice Assistant Active! Speak <span className="underline decoration-cyan-400">"Hey Nexa"</span> 🎙️
                  </span>
                ) : (
                  <span>Ask Nexa AI for study rules, visas & tips! 🌐</span>
                )}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBubble(false);
                }}
                className="absolute -top-3.5 -right-4 bg-slate-800 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-slate-700 hover:bg-slate-700 text-[8px] cursor-pointer"
              >
                ×
              </button>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-t-[6px] border-t-slate-900 border-x-[6px] border-x-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Globe Floating Container with Custom Floating Animation */}
      <div 
        className="relative w-20 h-20 flex items-center justify-center animate-[floating_4s_ease-in-out_infinite]"
        style={{
          animationPlayState: isSleeping ? 'paused' : 'running'
        }}
      >
        {/* Outer radial glow effect - Styled with Earth theme colors (Blue and Green) */}
        <div className="absolute inset-0 rounded-full bg-blue-500/15 blur-lg animate-pulse" />
        <div className="absolute w-18 h-18 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-500 opacity-60 blur-xs transition-opacity duration-300" />
        
        {/* Orbital Ring 1 */}
        <div 
          className="absolute border-2 border-blue-400/40 rounded-full pointer-events-none"
          style={{
            width: '86px',
            height: '32px',
            animation: 'orbital-spin-1 10s linear infinite',
            animationPlayState: isSleeping ? 'paused' : 'running'
          }}
        />

        {/* Orbital Ring 2 */}
        <div 
          className="absolute border border-emerald-400/30 rounded-full pointer-events-none"
          style={{
            width: '92px',
            height: '34px',
            animation: 'orbital-spin-2 15s linear infinite',
            animationPlayState: isSleeping ? 'paused' : 'running'
          }}
        />

        {/* Location Pins */}
        <div className="absolute top-2 left-4 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-bounce" />
        <div className="absolute bottom-4 right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#3b82f6] animate-bounce [animation-delay:0.3s]" />
        
        {/* Main Globe Sphere - Styled like Earth (Blue and Green) */}
        <div className="relative w-15 h-15 rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-blue-700 border border-blue-400/30 overflow-hidden flex flex-col items-center justify-center shadow-2xl shadow-blue-500/50">
          
          {/* stylized Glowing Continents - Colored Green */}
          <svg viewBox="0 0 100 100" className="absolute w-full h-full text-emerald-500 fill-current opacity-85">
            <path d="M15,45 Q25,35 40,48 T70,38 T85,55 Q75,75 55,78 T25,65 Z" />
            <path d="M25,20 Q35,15 45,22 T55,18 Z" />
            <path d="M35,80 Q45,88 52,82 T65,85 Z" />
          </svg>

          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(59,130,246,0.3))] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:5px_5px] pointer-events-none" />

          {/* Nexa Face: Eyes & Mouth Container */}
          <div className="relative z-10 flex flex-col items-center justify-center mt-3.5">
            {/* Cool Black Sunglasses */}
            <div className="absolute -top-2.5 z-20 pointer-events-none">
              <svg viewBox="0 0 44 14" className="w-11.5 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {/* Left Lens */}
                <rect x="2" y="1" width="16" height="10" rx="3.5" fill="#090d16" stroke="#475569" strokeWidth="1.2" />
                {/* Right Lens */}
                <rect x="26" y="1" width="16" height="10" rx="3.5" fill="#090d16" stroke="#475569" strokeWidth="1.2" />
                {/* Bridge */}
                <rect x="18" y="3" width="8" height="2" fill="#090d16" />
                {/* Sleek reflection lines */}
                <line x1="5" y1="3" x2="9" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
                <line x1="29" y1="3" x2="33" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
              </svg>
            </div>

            {/* Eyes Row (Behind the glasses) */}
            <div className="flex gap-2.5 items-center justify-center opacity-85 mt-0.5">
              {isDragging ? (
                // Dizzy Cross eyes when dragged
                <>
                  <span className="text-cyan-300 font-black text-xs leading-none select-none animate-pulse">×</span>
                  <span className="text-cyan-300 font-black text-xs leading-none select-none animate-pulse">×</span>
                </>
              ) : chatLoading ? (
                // Thinking/Calculating blinking dots
                <>
                  <span className="text-cyan-200 font-bold text-[9px] leading-none select-none animate-bounce">●</span>
                  <span className="text-cyan-200 font-bold text-[9px] leading-none select-none animate-bounce [animation-delay:0.25s]">●</span>
                </>
              ) : isSpeaking ? (
                // Happy speaking eyes ^ ^
                <>
                  <span className="text-cyan-200 font-extrabold text-[12px] leading-none select-none -mt-1 font-mono">^</span>
                  <span className="text-cyan-200 font-extrabold text-[12px] leading-none select-none -mt-1 font-mono">^</span>
                </>
              ) : isSleeping ? (
                // Dozing sleeping eyes - -
                <>
                  <span className="text-cyan-400/55 font-semibold text-xs leading-none select-none">-</span>
                  <span className="text-cyan-400/55 font-semibold text-xs leading-none select-none">-</span>
                </>
              ) : (
                // Standard Glowing Circular Eyes with Blinking keyframe
                <>
                  {/* Left Eye */}
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-450 shadow-[0_0_8px_#22d3ee] flex items-center justify-center animate-[blink_5s_infinite]">
                    <div className="w-0.5 h-0.5 rounded-full bg-white" />
                  </div>
                  {/* Right Eye */}
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-450 shadow-[0_0_8px_#22d3ee] flex items-center justify-center animate-[blink_5s_infinite]">
                    <div className="w-0.5 h-0.5 rounded-full bg-white" />
                  </div>
                </>
              )}
            </div>

            {/* Mouth Element */}
            <div className="mt-1.5 h-2 flex items-center justify-center">
              {isDragging ? (
                <div className="w-2 h-2 rounded-full border border-cyan-450 bg-transparent animate-ping" />
              ) : chatLoading ? (
                <span className="text-cyan-400 text-[10px] leading-none font-bold select-none">~</span>
              ) : isSpeaking ? (
                // Looping speech talking height animation
                <div className="bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-[talking_0.35s_infinite_alternate]" />
              ) : isSleeping ? (
                <div className="w-1.5 h-0.5 bg-cyan-500/50 rounded-full" />
              ) : (
                // Happy smile
                <span className="text-cyan-450 text-[9px] leading-none -mt-1 font-extrabold select-none">◡</span>
              )}
            </div>
          </div>

          {/* Moving Scan Line */}
          <div className="absolute left-0 right-0 h-[1.5px] bg-cyan-400/80 shadow-[0_0_4px_#22d3ee] animate-[scan_2.5s_linear_infinite]" />
        </div>
      </div>
    </motion.div>
  );
};

export default function AIChatbot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Dashboard & Profile data states
  const [profile, setProfile] = useState<NexaProfile | null>(null);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Chatbot states
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hello! I'm Nexa, your AI Career & Global Education Advisor. Ask me anything about university admissions, eligibility, funding, or visas!" }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gamification & Alert Animations
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [completingMissionId, setCompletingMissionId] = useState<string | null>(null);

  // Upgrade parameters
  const [isMuted, setIsMuted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [showBubble, setShowBubble] = useState(true);
  const [globePosition, setGlobePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Dynamic character states
  const [isWandering, setIsWandering] = useState(true);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);

  // Jarvis Voice Assistant States
  const [isWakeWordMode, setIsWakeWordMode] = useState(false);
  const [isListeningForSpeech, setIsListeningForSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);
  const hasNotAllowedErrorRef = useRef(false);
  const [isExternalListening, setIsExternalListening] = useState(false);
  const [wakeWordRestartToken, setWakeWordRestartToken] = useState(0);

  // References to keep hooks stable
  const messagesRef = useRef(messages);
  const profileRef = useRef(profile);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const handleVoiceStart = () => setIsExternalListening(true);
    const handleVoiceStop = () => setIsExternalListening(false);
    window.addEventListener('nexa-voice-start', handleVoiceStart);
    window.addEventListener('nexa-voice-stop', handleVoiceStop);
    return () => {
      window.removeEventListener('nexa-voice-start', handleVoiceStart);
      window.removeEventListener('nexa-voice-stop', handleVoiceStop);
    };
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (isMutedRef.current) {
      setIsSpeaking(false);
      return;
    }
    const cleanText = text.replace(/[*#_`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang.startsWith('en'));
    if (googleVoice) utterance.voice = googleVoice;
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Web Audio Context Synthesized Wake Chime
  const playWakeChime = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (err) {
      console.error('Audio chime error:', err);
    }
  }, []);

  // Voice Query Listening (Jarvis style)
  const triggerVoiceQueryListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const queryRec = new SpeechRecognition();
    queryRec.continuous = false;
    queryRec.interimResults = false;
    queryRec.lang = 'en-US';

    queryRec.onstart = () => {
      setIsListeningForSpeech(true);
    };

    queryRec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (!transcript.trim()) return;

      console.log('Nexa Voice Assistant Query:', transcript);
      
      // 1. Open the Chat Panel immediately
      setIsOpen(true);
      setActiveTab('chat');
      
      // 2. Add message and submit
      const userMessage = { role: 'user' as const, content: transcript };
      setMessages(prev => [...prev, userMessage]);
      setChatLoading(true);

      try {
        const result = await askAIAdvisor([...messagesRef.current, userMessage]);
        const aiResponse = {
          role: 'assistant' as const,
          content: result.response
        };
        setMessages(prev => [...prev, aiResponse]);
        speakText(result.response);

        // Award EP
        const currentProfile = profileRef.current;
        if (currentProfile && currentProfile.id) {
          const epRes = await awardEncouragementPoints(currentProfile.id, 10);
          if (epRes && epRes.success) {
            setProfile(prev => prev ? { ...prev, ep: epRes.ep } : null);
            const updatedLeaderboard = await getLeaderboard();
            if (updatedLeaderboard) setLeaderboard(updatedLeaderboard);
          }
        }
      } catch (err) {
        console.error('Error during voice advisor reply:', err);
      } finally {
        setChatLoading(false);
      }
    };

    queryRec.onerror = (event: any) => {
      const errType = event?.error;
      if (errType === 'no-speech' || errType === 'aborted') {
        console.log(`[Nexa Voice Query] Info: ${errType}`);
        return;
      }
      console.warn('Voice query transcription warning:', event);
    };

    queryRec.onend = () => {
      setIsListeningForSpeech(false);
      // Resume wake word monitoring after completing speech query
      setIsWakeWordMode(true);
    };

    try {
      queryRec.start();
    } catch (e) {
      console.error('Failed to start voice query listener:', e);
      setIsListeningForSpeech(false);
      setIsWakeWordMode(true);
    }
  }, [speakText]);

  // Background speech recognition for Wake Word
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!isWakeWordMode || isSpeaking || isListeningForSpeech || isExternalListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let fired = false;
    rec.onresult = (event: any) => {
      if (fired) return;
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript.toLowerCase();
      
      console.log('Nexa Speech Recognition (Wake Word):', transcript);
      
      if (transcript.includes('hey nexa') || transcript.includes('heyy nexa') || transcript.includes('nexa')) {
        fired = true;
        playWakeChime();
        setIsListeningForSpeech(true);
        setIsWakeWordMode(false); // suspend wake-word mode while transcribing query
        
        setShowBubble(true);
        
        setTimeout(() => {
          triggerVoiceQueryListening();
        }, 400);
      }
    };

    rec.onerror = (event: any) => {
      const errType = event?.error;
      if (errType === 'no-speech' || errType === 'aborted') {
        console.log(`[Nexa Wake Word] Info: ${errType}`);
        return;
      }
      console.warn(`[Nexa Wake Word] Speech recognition warning: ${errType}`, event);
      if (errType === 'not-allowed' || errType === 'service-not-allowed') {
        hasNotAllowedErrorRef.current = true;
      }
    };

    rec.onend = () => {
      if (hasNotAllowedErrorRef.current) {
        console.warn('[Nexa Wake Word] Auto-restart disabled due to microphone permission restriction.');
        return;
      }
      if (isWakeWordMode && !isSpeaking && !isListeningForSpeech) {
        setWakeWordRestartToken(prev => prev + 1);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.log('Failed to start wake word listener (microphone permission might be needed):', e);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [isWakeWordMode, isSpeaking, isListeningForSpeech, isExternalListening, playWakeChime, triggerVoiceQueryListening, wakeWordRestartToken]);

  // Smooth character wandering bounded by viewport
  useEffect(() => {
    if (isOpen || !isWandering || isDragging) return;

    const wander = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Bounded range relative to the bottom-right corner starting position
      const minX = -(width - 120);
      const maxX = 10;
      const minY = -(height - 120);
      const maxY = 10;

      const targetX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
      const targetY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

      setGlobePosition(prev => {
        const dx = targetX - prev.x;
        setDirection(dx >= 0 ? 'right' : 'left');
        return { x: targetX, y: targetY };
      });
    };

    const timeout = setTimeout(wander, 2000);
    const interval = setInterval(wander, 6000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isOpen, isWandering, isDragging]);

  // Park the globe back in the corner if wandering is disabled
  useEffect(() => {
    if (!isWandering) {
      setGlobePosition({ x: 0, y: 0 });
    }
  }, [isWandering]);

  // Idle sleeping detection
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      setIsSleeping(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsSleeping(true);
      }, 30005);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', resetIdleTimer);
      window.addEventListener('keydown', resetIdleTimer);
      window.addEventListener('click', resetIdleTimer);
      window.addEventListener('touchstart', resetIdleTimer);
      resetIdleTimer();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('keydown', resetIdleTimer);
        window.removeEventListener('click', resetIdleTimer);
        window.removeEventListener('touchstart', resetIdleTimer);
      }
      clearTimeout(idleTimer);
    };
  }, []);

  // Dynamic poll for profile & leaderboard updates every 5 seconds when open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      interval = setInterval(async () => {
        try {
          const data = await getNexaData();
          const leaderboardData = await getLeaderboard();
          if (leaderboardData && leaderboardData.length > 0) {
            setLeaderboard(leaderboardData);
          }
          if (data) {
            setProfile(data.profile);
            setReadiness(data.readiness);
            setRecommendations(data.recommendations);
            setIsLoggedIn(true);
          } else {
            setIsLoggedIn(false);
          }
        } catch (err) {
          console.error('Error polling Nexa data:', err);
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen]);



  // Mock fallback for guest mode
  const defaultLeaderboard = [
    { name: 'Sarah Jenkins', level: 4, xp: 850, ep: 200, preferred_countries: ['United States'] },
    { name: 'Ashwin', level: 3, xp: 620, ep: 150, preferred_countries: ['Germany'] },
    { name: 'Alex Rivera', level: 2, xp: 380, ep: 80, preferred_countries: ['Canada'] },
    { name: 'John Doe', level: 1, xp: 120, ep: 20, preferred_countries: ['Germany'] }
  ];

  useEffect(() => {
    async function loadProfileData() {
      setLoadingData(true);
      try {
        const data = await getNexaData();
        const leaderboardData = await getLeaderboard();
        if (leaderboardData && leaderboardData.length > 0) {
          setLeaderboard(leaderboardData);
        }
        if (data) {
          setProfile(data.profile);
          setReadiness(data.readiness);
          setRecommendations(data.recommendations);
          setIsLoggedIn(true);
          if (data.profile.onboarding_completed) {
            speakText(`Hi ${data.profile.name || 'Student'}! Welcome to Nexora, your smart AI-powered higher studies guidance platform. I am Nexa, your AI advisor. Nexora simplifies your global education journey by matching your profile with top universities, calculating eligibility, and organizing your visa checklist. Let's start building your global study roadmap together!`);
          } else {
            speakText(`Hi ${data.profile.name || 'Student'}! Welcome to Nexora, your smart AI-powered higher studies guidance platform. I am Nexa, your AI advisor. Let's complete your academic onboarding so we can start matching you with global universities and visa checklists!`);
          }
        } else {
          // Guest mode fallback
          setProfile(null);
          setReadiness(null);
          setRecommendations(null);
          setIsLoggedIn(false);
          speakText("Hello! I'm Nexa, your AI Career & Global Education Advisor. Let's explore global destinations together.");
        }
      } catch (err) {
        console.error('Nexa failed to fetch profile:', err);
        setProfile(null);
        setReadiness(null);
        setRecommendations(null);
        setIsLoggedIn(false);
      } finally {
        setLoadingData(false);
      }
    }

    if (isOpen) {
      loadProfileData();
    }
  }, [isOpen, speakText]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Complete a mission
  const handleCompleteMission = async (missionId: string) => {
    if (completingMissionId || !profile) return;
    setCompletingMissionId(missionId);

    try {
      if (profile.id) {
        // Logged in DB path
        const res = await completeNexaMission(profile.id, missionId);
        if (res && res.success) {
          setProfile((prev: NexaProfile | null) => {
            if (!prev) return null;
            return {
              ...prev,
              xp: res.xp,
              level: res.level,
              achievements: res.achievements,
              missions: res.missions
            };
          });

          // Trigger rewards alert
          if (res.unlockedAchievement) {
            setUnlockedAchievement(res.unlockedAchievement);
          }
          if (res.leveledUp) {
            setNewLevel(res.level);
            setShowLevelUp(true);
          }
          // Refresh dashboard context details (readiness changes etc)
          const data = await getNexaData();
          if (data) {
            setReadiness(data.readiness);
            setRecommendations(data.recommendations);
          }
        }
      } else {
        // Guest local simulation path
        const newMissions = profile.missions.map((m: Mission) => 
          m.id === missionId ? { ...m, completed: true } : m
        );
        const rewardXp = profile.missions.find((m: Mission) => m.id === missionId)?.xpReward || 100;
        const newXp = profile.xp + rewardXp;
        let newLvl = profile.level;
        let leveledUp = false;
        const localAchievements = [...profile.achievements];
        let newAch: Achievement | null = null;

        if (newXp >= newLvl * 250) {
          newLvl += 1;
          leveledUp = true;
          localAchievements.push({
            id: `level_${newLvl}`,
            title: `Rising Scholar Lvl ${newLvl}`,
            description: `Reached Level ${newLvl} in Nexora`,
            icon: 'Award',
            unlockedAt: new Date().toISOString()
          });
        }

        if (missionId === 'ielts_profile') {
          newAch = {
            id: 'lang_ace',
            title: 'Language Pioneer',
            description: 'Unlocked IELTS checklist parameters',
            icon: 'Languages',
            unlockedAt: new Date().toISOString()
          };
          localAchievements.push(newAch);
        } else if (missionId === 'bookmark_univ') {
          newAch = {
            id: 'scout',
            title: 'Global Pathfinder',
            description: 'Saved your first study abroad university choice',
            icon: 'Compass',
            unlockedAt: new Date().toISOString()
          };
          localAchievements.push(newAch);
        } else if (missionId === 'explore_loans') {
          newAch = {
            id: 'financier',
            title: 'Financially Prepared',
            description: 'Explored loans & budget options',
            icon: 'Wallet',
            unlockedAt: new Date().toISOString()
          };
          localAchievements.push(newAch);
        }

        setProfile((prev: NexaProfile | null) => {
          if (!prev) return null;
          return {
            ...prev,
            xp: newXp,
            level: newLvl,
            missions: newMissions,
            achievements: localAchievements
          };
        });

        if (newAch) {
          setUnlockedAchievement(newAch);
        }
        if (leveledUp) {
          setNewLevel(newLvl);
          setShowLevelUp(true);
        }

        // Adjust dynamic mock readiness based on local completions
        const isLanguageCompleted = newMissions.find((m: Mission) => m.id === 'ielts_profile')?.completed || false;
        const isLoanExplored = newMissions.find((m: Mission) => m.id === 'explore_loans')?.completed || false;
        const isBookmarked = newMissions.find((m: Mission) => m.id === 'bookmark_univ')?.completed || false;

        const langScore = isLanguageCompleted ? 90 : 45;
        const finScore = isLoanExplored ? 90 : 85;
        const appScore = isBookmarked ? 80 : 30;
        const academicScore = 95;

        setReadiness({
          academic: academicScore,
          language: langScore,
          financial: finScore,
          application: appScore,
          total: Math.round((academicScore + langScore + finScore + appScore) / 4)
        });

        // Adjust recommendations list
        const remainingActions: string[] = [];
        if (!isLanguageCompleted) remainingActions.push('Complete IELTS section to unlock scholarship recommendations.');
        if (!isBookmarked) remainingActions.push('Bookmark a university to track application requirements.');
        if (!isLoanExplored) remainingActions.push('Compare banking partners in the Education Loan Portal.');
        if (remainingActions.length === 0) remainingActions.push('Explore visa documents checklists for your target country.');

        setRecommendations((prev: RecommendationsData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            nextActions: remainingActions
          };
        });
      }
    } catch (error) {
      console.error('Error completing Nexa mission:', error);
    } finally {
      setCompletingMissionId(null);
    }
  };

  // Chat message submit
  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setChatLoading(true);

    try {
      const result = await askAIAdvisor(newMessages);
      const aiResponse = {
        role: 'assistant' as const,
        content: result.response
      };
      setMessages(prev => [...prev, aiResponse]);
      speakText(result.response);

      // Award +10 EP for chatbot interaction
      if (profile && profile.id) {
        const epRes = await awardEncouragementPoints(profile.id, 10);
        if (epRes && epRes.success) {
          setProfile(prev => {
            if (!prev) return null;
            return { ...prev, ep: epRes.ep };
          });
          const updatedLeaderboard = await getLeaderboard();
          if (updatedLeaderboard) setLeaderboard(updatedLeaderboard);
        }
      } else {
        setProfile(prev => {
          if (!prev) return null;
          return { ...prev, ep: (prev.ep || 0) + 10 };
        });
      }
    } catch (err: any) {
      console.error('Failed to get Nexa chat response:', err);
      const errMsg = err?.message || String(err) || 'Unknown error';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${errMsg}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Render achievement icon mapping
  const renderAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Languages':
        return <Languages className="h-4 w-4 text-cyan-400" />;
      case 'Compass':
        return <Compass className="h-4 w-4 text-emerald-400" />;
      case 'Wallet':
        return <Wallet className="h-4 w-4 text-amber-400" />;
      case 'UserCheck':
        return <UserCheck className="h-4 w-4 text-teal-400" />;
      default:
        return <Award className="h-4 w-4 text-teal-400" />;
    }
  };

  return (
    <>
      {/* Custom Embedded CSS Keyframes for Character animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes orbital-spin-1 {
          0% { transform: rotate(45deg) rotate(0deg); }
          100% { transform: rotate(45deg) rotate(360deg); }
        }
        @keyframes orbital-spin-2 {
          0% { transform: rotate(-45deg) rotate(360deg); }
          100% { transform: rotate(-45deg) rotate(0deg); }
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes talking {
          0% { height: 1.5px; width: 6px; border-radius: 2px; }
          100% { height: 6px; width: 10px; border-radius: 9999px; }
        }
        .glass-tab-active {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%);
          border-bottom: 2px solid #0d9488;
        }
        /* Scrollbar Styling */
        .nexa-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .nexa-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .nexa-scroll::-webkit-scrollbar-thumb {
          background: rgba(13, 148, 136, 0.2);
          border-radius: 4px;
        }
        .nexa-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(13, 148, 136, 0.4);
        }
      `}</style>

      {/* Globe Floating Trigger widget */}
      <NexaGlobe 
        onClick={() => setIsOpen(true)} 
        isOpen={isOpen} 
        position={globePosition}
        setPosition={setGlobePosition}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        showBubble={showBubble}
        setShowBubble={setShowBubble}
        isSpeaking={isSpeaking}
        chatLoading={chatLoading}
        isSleeping={isSleeping}
        isWandering={isWandering}
        setIsWandering={setIsWandering}
        direction={direction}
        isListeningForSpeech={isListeningForSpeech}
        isWakeWordMode={isWakeWordMode}
        setIsWakeWordMode={setIsWakeWordMode}
      />

      {/* Floating AI Panel Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 50, x: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 50, x: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2.5rem)] h-[620px] max-h-[calc(100vh-6rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 border border-teal-500/20"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              transformOrigin: 'bottom right',
            }}
          >
            {/* Header Area */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-950 to-slate-950 p-4 text-white flex items-center justify-between shadow-md relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-400/30 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-teal-400/20 animate-pulse" />
                  <Globe className="h-5 w-5 text-teal-400 animate-spin [animation-duration:15s]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-wider text-teal-300">NEXA</span>
                    <span className="text-[10px] bg-teal-400/20 text-teal-300 font-bold px-1.5 py-0.5 rounded-full border border-teal-400/10">AI Mentor</span>
                  </div>
                  <p className="text-[10px] text-teal-100/70 font-semibold">Study Abroad Navigator</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Voice Wake Word Mode Toggle */}
                <button
                  onClick={() => {
                    const nextVal = !isWakeWordMode;
                    if (nextVal) {
                      hasNotAllowedErrorRef.current = false;
                    }
                    setIsWakeWordMode(nextVal);
                  }}
                  className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors mr-1 cursor-pointer ${
                    isWakeWordMode ? 'text-red-400 animate-pulse' : 'text-slate-400'
                  }`}
                  title={isWakeWordMode ? "Disable Voice Assistant ('Hey Nexa')" : "Enable Voice Assistant ('Hey Nexa')"}
                >
                  <Mic className="h-4 w-4" />
                </button>

                {/* Wandering Control Toggle */}
                <button
                  onClick={() => setIsWandering(!isWandering)}
                  className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors mr-1 cursor-pointer ${
                    isWandering ? 'text-teal-300' : 'text-slate-400'
                  }`}
                  title={isWandering ? "Pause Nexa Character Wandering" : "Enable Nexa Character Wandering"}
                >
                  {isWandering ? <Pause className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => {
                    const nextMute = !isMuted;
                    setIsMuted(nextMute);
                    if (nextMute) {
                      if (typeof window !== 'undefined' && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                      }
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-teal-100/80 hover:text-white transition-colors mr-1"
                  title={isMuted ? "Unmute Voice" : "Mute Voice"}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-teal-100/80 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-teal-500/10 bg-white/50 backdrop-blur-xs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'dashboard' ? 'glass-tab-active text-teal-800' : 'text-slate-500 hover:text-teal-700'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {"Nexa Dashboard"}
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'chat' ? 'glass-tab-active text-teal-800' : 'text-slate-500 hover:text-teal-700'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {"Ask Advisor"}
              </button>
            </div>

            {/* Main Content scrollable panel */}
            <div className="flex-1 overflow-y-auto p-4 nexa-scroll space-y-4">
              
              {loadingData ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin mb-2" />
                  <p className="text-xs font-semibold">Connecting to Nexa...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'dashboard' ? (
                    !isLoggedIn ? (
                      /* BEAUTIFUL GUEST LOCK STATE */
                      <div className="flex flex-col items-center justify-center text-center p-6 py-12 bg-gradient-to-b from-teal-50/85 via-white to-cyan-50/50 dark:from-slate-900/40 dark:via-slate-900/60 dark:to-slate-950/40 rounded-2xl border border-teal-500/10 shadow-lg space-y-6 animate-[fadeIn_0.5s_ease-out] min-h-[400px]">
                        <div className="relative flex items-center justify-center">
                          {/* Pulsing ring behind the lock */}
                          <div className="absolute w-20 h-20 rounded-full bg-teal-500/10 animate-[ping_2s_infinite]" />
                          <div className="absolute w-24 h-24 rounded-full bg-cyan-500/5 animate-[ping_3s_infinite_0.5s]" />
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 border border-teal-400/30 flex items-center justify-center relative z-10 shadow-xl">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </div>
                        <div className="space-y-2 max-w-[280px]">
                          <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                            Personalized Mentor Locked
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Sign in to build your academic profile, evaluate your study abroad readiness, complete missions, and unlock customized university matching.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            router.push('/auth');
                          }}
                          className="w-full max-w-[220px] py-3 bg-gradient-to-r from-teal-650 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer hover:shadow-teal-500/20"
                        >
                          Sign In to Unlock Profile
                        </button>
                      </div>
                    ) : (
                      /* NEXA DASHBOARD VIEW */
                      <div className="space-y-4">
                      
                      {/* Welcome message banner */}
                      <div className="bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent p-4 rounded-xl border border-teal-500/10 shadow-xs relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
                        <h4 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                          Hi {profile?.name || 'Student'} 👋
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                          Welcome to Nexora AI Mentor
                        </p>
                      </div>

                      {/* Gamification Stats: Level & XP Progress bar */}
                      <div className="bg-white/90 border border-slate-100 rounded-xl p-3.5 shadow-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg p-1.5 text-white shadow-xs">
                              <Zap className="h-3.5 w-3.5 text-white fill-current" />
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-slate-900">Level {profile?.level || 1}</span>
                              <span className="text-[9px] font-bold text-slate-500 block">Explorer Status</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50">
                            {profile?.xp || 120} / { (profile?.level || 1) * 250 } XP
                          </span>
                        </div>

                        {/* XP Progress Slider */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, ((profile?.xp || 120) / ((profile?.level || 1) * 250)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Virtual Passport stamps section */}
                      <div>
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Nexora Passport Stamps</h5>
                        <div className="bg-white/80 border border-slate-100 rounded-xl p-3.5 shadow-xs flex justify-around items-center">
                          {[
                            { country: 'Germany', emoji: '🇩🇪' },
                            { country: 'Canada', emoji: '🇨🇦' },
                            { country: 'Australia', emoji: '🇦🇺' }
                          ].map((stamp) => {
                            const stampsList = profile?.passport_stamps || [];
                            const isUnlocked = stampsList.includes(stamp.country);
                            return (
                              <div key={stamp.country} className="flex flex-col items-center gap-1">
                                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl shadow-sm transition-all relative group ${
                                  isUnlocked 
                                    ? 'bg-emerald-50 border-emerald-450 text-slate-900 scale-100' 
                                    : 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 filter grayscale'
                                }`}>
                                  <span>{stamp.emoji}</span>
                                  {isUnlocked && (
                                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 text-[8px] font-black border border-white">✓</span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-650">{stamp.country}</span>
                                <span className="text-[8px] text-slate-400">{isUnlocked ? 'Earned' : 'Locked (+50 XP)'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Student Leaderboard */}
                      <div>
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                          <span>Student Leaderboard</span>
                        </h5>
                        <div className="bg-white/80 border border-slate-100 rounded-xl p-3 shadow-xs space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase px-2 border-b border-slate-100 pb-1">
                            <span>Rank & Name</span>
                            <div className="flex gap-4">
                              <span>LVL/XP</span>
                              <span>EP Points</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {(leaderboard.length > 0 ? leaderboard : defaultLeaderboard).map((student, index) => (
                              <div 
                                key={index} 
                                className={`flex justify-between items-center text-xs p-2 rounded-lg transition-colors ${
                                  student.name === (profile?.name || 'Ashwin') 
                                    ? 'bg-teal-50 border border-teal-500/20 font-bold' 
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                                    index === 0 ? 'bg-amber-100 text-amber-800' : index === 1 ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-650'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <div>
                                    <span className="text-slate-900 block truncate max-w-[125px]">{student.name}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-right">
                                  <div>
                                    <span className="text-slate-800 block text-[11px]">Lvl {student.level}</span>
                                    <span className="text-[9px] text-slate-455 block">{student.xp} XP</span>
                                  </div>
                                  <div className="bg-teal-500/10 text-teal-700 px-2 py-1 rounded-md text-[11px] font-extrabold min-w-[45px] text-center">
                                    {student.ep ?? 0} EP
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  )
                ) : (
                    /* CHAT TERMINAL VIEW */
                    <div className="h-full flex flex-col justify-between">
                      {/* Message History list */}
                      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 max-h-[420px] nexa-scroll">
                        {messages.map((message, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="flex items-start gap-2 max-w-[85%]">
                              {message.role === 'assistant' && (
                                <div className="w-6 h-6 rounded-full bg-teal-600/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                                  <Globe className="h-3.5 w-3.5 text-teal-600" />
                                </div>
                              )}
                              <div
                                className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                  message.role === 'user'
                                    ? 'bg-gradient-to-r from-teal-600 to-teal-800 text-white font-semibold shadow-sm'
                                    : 'bg-white border border-slate-100 text-slate-800 shadow-xs'
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="flex items-start gap-2 max-w-[85%]">
                              <div className="w-6 h-6 rounded-full bg-teal-600/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                                <Loader2 className="h-3 w-3 text-teal-600 animate-spin" />
                              </div>
                              <div className="bg-white border border-slate-100 rounded-2xl px-3.5 py-2.5 text-xs text-slate-500 font-medium">
                                Nexa is auditing data...
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat text Input panel */}
                      <div className="pt-3 border-t border-teal-500/10 mt-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            disabled={chatLoading}
                            placeholder={chatLoading ? 'Auditing details...' : 'Ask Nexa about study rules, visas...'}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-teal-600 transition-colors disabled:opacity-50 shadow-xs"
                          />
                          <button
                            onClick={handleSend}
                            disabled={chatLoading}
                            className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Send className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Achievement Unlocked Slide Alert popup */}
            <AnimatePresence>
              {unlockedAchievement && (
                <motion.div
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -60, opacity: 0 }}
                  className="absolute top-16 left-4 right-4 bg-slate-900 text-white rounded-xl p-3 border border-teal-500/30 shadow-2xl flex items-center justify-between z-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center animate-bounce">
                      <Trophy className="h-5 w-5 text-amber-400 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-widest block">Achievement Unlocked</span>
                      <span className="text-xs font-bold block">{unlockedAchievement.title}</span>
                      <span className="text-[9px] text-slate-400 font-medium block">{unlockedAchievement.description}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setUnlockedAchievement(null)}
                    className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LEVEL UP Overlay Alert popup */}
            <AnimatePresence>
              {showLevelUp && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center text-center p-6 text-white"
                >
                  <motion.div
                    initial={{ scale: 0.5, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.5, y: 50 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="space-y-4"
                  >
                    {/* Glowing Stars / Burst */}
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-xl animate-ping" />
                      <div className="absolute w-24 h-24 rounded-full border-4 border-amber-400/30 animate-spin" style={{ animationDuration: '6s' }} />
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 shadow-2xl flex items-center justify-center">
                        <Award className="h-10 w-10 text-white fill-current animate-bounce" />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-yellow-400 to-teal-300 bg-clip-text text-transparent">
                        LEVEL UP!
                      </h2>
                      <p className="text-slate-300 text-sm font-semibold mt-1">
                        You reached Level <span className="text-amber-400 font-extrabold text-lg">{newLevel}</span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                      Your global education profile is reaching competitive heights. New next actions are unlocked!
                    </p>

                    <button
                      onClick={() => setShowLevelUp(false)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-extrabold shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Awesome!
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
