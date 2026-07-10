'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Search, Award, Home, Sparkles, FileCheck, Compass,
  Calculator, GitCompare, ArrowRight, Landmark, Users, Star, Quote, Loader2, LogIn, UserPlus, Edit2
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { getStudentProfile, getEnrolledStudentsCount, getUniversities } from '@/app/actions/student';
import AuthPage from './auth/page';

const features = [
  {
    title: 'University Search',
    description: 'Explore top accredited universities worldwide. Compare rankings and acceptance rates.',
    icon: Search,
    href: '/student/universities',
    color: 'from-teal-dark to-teal-bright'
  },
  {
    title: 'Scholarships',
    description: 'Find the best scholarships you are eligible for. Match with government and private funds.',
    icon: Award,
    href: '/student/scholarships',
    color: 'from-teal-dark to-teal-bright'
  },
  {
    title: 'Accommodation',
    description: 'Discover safe and affordable housing. Search hostels, PGs, and shared student apartments.',
    icon: Home,
    href: '/student/accommodations',
    color: 'from-teal-dark to-teal-bright'
  },
  {
    title: 'AI Guidance',
    description: 'Get personalized advice from our AI expert. Ask questions about courses, visa rules and eligibility.',
    icon: Sparkles,
    href: '/student/advisor',
    color: 'from-teal-dark to-teal-bright'
  },
  {
    title: 'Visa Guidance',
    description: 'Track required documents, timelines, fees, and walk through step-by-step visa checklists.',
    icon: FileCheck,
    href: '/student/visa',
    color: 'from-orange-light to-yellow-green'
  },
  {
    title: 'Career Planning',
    description: 'Assess your skills, goals, and map them to potential global job opportunities and certifications.',
    icon: Compass,
    href: '/student/dashboard',
    color: 'from-orange-light to-yellow-green'
  },
  {
    title: 'Expense Calculator',
    description: 'Simulate tuition, rent, meals, transport, and insurance to plan your higher studies budgets.',
    icon: Calculator,
    href: '/student/cost-calculator',
    color: 'from-orange-light to-yellow-green'
  },
  {
    title: 'Country Comparison',
    description: 'Compare multiple study destinations on academic excellence, visa approval rates, and living costs.',
    icon: GitCompare,
    href: '/student/universities',
    color: 'from-orange-light to-yellow-green'
  }
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [univCount, setUnivCount] = useState<number>(0);
  const [countryCount, setCountryCount] = useState<number>(0);

  useEffect(() => {
    async function loadUser() {
      try {
        const count = await getEnrolledStudentsCount();
        setStudentCount(count);
      } catch (err) {
        console.error('Error fetching student count:', err);
      }

      try {
        const univList = await getUniversities({});
        setUnivCount(univList.length);
        const uniqueCountries = new Set(univList.map(u => u.country_name).filter(Boolean));
        setCountryCount(uniqueCountries.size);
      } catch (err) {
        console.error('Error fetching university count:', err);
      }

      const sessionUser = await getCurrentUser();
      if (sessionUser) {
        setUser(sessionUser);
        if (sessionUser.role === 'student') {
          const p = await getStudentProfile(sessionUser.id);
          if (!p || !p.onboarding_completed) {
            router.push('/student/onboarding');
            return;
          }
          setUser({ ...sessionUser, name: p.name });
        } else if (sessionUser.role === 'uni_admin') {
          router.push('/uni-admin/dashboard');
          return;
        } else if (sessionUser.role === 'platform_admin') {
          router.push('/platform-admin/dashboard');
          return;
        } else if (sessionUser.role === 'business') {
          router.push('/business/dashboard');
          return;
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-slate-800">
        <Loader2 className="h-10 w-10 text-[#00A896] animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">Setting up higher education portal...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const stats = [
    {
      value: `${univCount}`,
      label: 'Universities',
      sub: 'Accredited Partners',
      icon: Landmark
    },
    {
      value: `${countryCount}`,
      label: 'Countries',
      sub: 'Study Destinations',
      icon: Compass
    },
    {
      value: `${studentCount}`,
      label: 'Students Enrolled',
      sub: 'Successfully Enrolled',
      icon: Users
    }
  ];

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Image and Gradient overlay */}
      <div className="absolute inset-0 z-0 h-[85vh] md:h-[95vh]">
        <Image
          src="/images/teal_sunrise_hero.png"
          alt="Teal Sunrise Hero"
          fill
          priority
          className="object-cover opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-teal-bright/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-teal-bright/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-36 md:pb-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              Welcome, {user?.name || 'User'}.<br />
              Dream Big.<br />
              Study <span className="text-gradient-teal-sunrise">Anywhere.</span>
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-900 mb-10 max-w-xl leading-relaxed font-semibold"
          >
            Global education is now at your fingertips. Get AI-powered guidance on profile evaluation, university selection, scholarships, and visa checklist steps.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-row justify-start gap-4"
          >
            <Link
              href="/student/universities"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-dark to-teal-green hover:opacity-90 text-white font-extrabold px-6 py-3.5 text-base transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              Explore Universities
            </Link>
            <Link
              href="/student/advisor"
              className="inline-flex items-center justify-center rounded-xl border border-teal-dark/30 bg-white/40 text-teal-dark hover:bg-white/60 transition-all font-bold px-6 py-3.5 text-base cursor-pointer"
            >
              Ask AI Advisor
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="glass-card rounded-2xl p-8 border border-teal-500/10 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-teal-500/10">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-col items-center justify-center text-center p-4 md:first:pl-0 md:pl-8"
                >
                  <div className="mb-2.5 rounded-lg bg-teal-bright/10 p-2 text-teal-bright">
                    <Icon className="h-6 w-6 text-teal-bright" />
                  </div>
                  <span className="text-3xl font-extrabold text-teal-dark tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 mt-1">
                    {stat.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {stat.sub}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything You Need to <span className="text-gradient-teal-sunrise">Succeed</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-xl mx-auto">
            From discovering matching courses to getting visa checklist approvals, EduGuide AI supports you at each milestone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Link
                  href={feat.href}
                  className="group block h-full glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden border border-teal-500/10"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feat.color} opacity-80`} />
                  <div className="mb-5 inline-flex rounded-xl p-3 bg-teal-bright/10 text-teal-bright group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-teal-bright" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-dark transition-colors mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors leading-relaxed">
                    {feat.description}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
