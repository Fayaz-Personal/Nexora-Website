'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LogOut, Menu, User, X } from 'lucide-react';
import { UserSession, logoutUser } from '@/app/actions/auth';
import { getStudentProfile } from '@/app/actions/student';


interface NavbarProps {
  user: UserSession | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isOnboarding = pathname === '/student/onboarding';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);


  useEffect(() => {
    async function fetchProfile() {
      if (user && user.role === 'student') {
        const p = await getStudentProfile(user.id);
        if (p) {
          setProfile(p);
        }
      }
    }
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    router.refresh();
    router.push('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/auth';
    if (user.role === 'platform_admin') return '/platform-admin/dashboard';
    if (user.role === 'uni_admin') return '/uni-admin/dashboard';
    return '/student/dashboard';
  };

  const linkClass = isHome
    ? "text-sm font-medium text-slate-800 hover:text-teal-dark transition-colors"
    : "text-sm font-medium text-white/90 hover:text-white transition-colors";

  const mobileLinkClass = isHome
    ? "block rounded-md px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 hover:text-teal-dark"
    : "block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-teal-700 hover:text-white";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
      isHome 
        ? 'border-slate-200 bg-white/90 backdrop-blur-md' 
        : 'border-teal-700 bg-[#00A896]'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 font-bold flex-row align-middle">
              <div className="rounded-xl overflow-hidden border border-slate-200/20 shadow-sm flex items-center justify-center bg-black/20 shrink-0">
                <Image 
                  src="/images/logo.png" 
                  alt="Nexora Logo" 
                  width={36} 
                  height={36} 
                  className="h-9 w-9 object-cover" 
                />
              </div>
              <span className={`text-xl tracking-tight font-extrabold transition-colors ${
                isHome ? 'text-slate-900' : 'text-white'
              }`}>
                Nexora
              </span>
            </Link>
          </div>

          {/* Navigation Links - Desktop */}
          {user && !isOnboarding && (
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-6">
                <Link href="/" className={linkClass}>
                  Home
                </Link>
                <Link href="/student/universities" className={linkClass}>
                  Universities
                </Link>
                <Link href="/student/scholarships" className={linkClass}>
                  Scholarships
                </Link>
                
                {/* Services Dropdown */}
                <div className="relative group py-2">
                  <button className={`${linkClass} flex items-center gap-1 cursor-pointer focus:outline-none`}>
                    <span>Services</span>
                    <svg className="h-3 w-3 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl opacity-0 scale-95 origin-top-left pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-250 z-50 text-slate-800 p-1">
                    <Link href="/student/accommodations" className="block px-4 py-2.5 text-xs font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-dark transition-colors">
                      Accommodation Finder
                    </Link>
                    <Link href="/student/visa" className="block px-4 py-2.5 text-xs font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-dark transition-colors">
                      Visa Guidance
                    </Link>
                    <Link href="/student/travel" className="block px-4 py-2.5 text-xs font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-dark transition-colors">
                      Travel & Flights
                    </Link>
                    <Link href="/student/loans" className="block px-4 py-2.5 text-xs font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-dark transition-colors">
                      Study Loans Guide
                    </Link>
                    <Link href="/student/recommendations" className="block px-4 py-2.5 text-xs font-semibold rounded-lg hover:bg-teal-50 hover:text-teal-dark transition-colors">
                      AI Predictor & Matcher
                    </Link>
                  </div>
                </div>

                <Link href="/student/advisor" className={linkClass}>
                  AI Advisor
                </Link>
                <Link href="/student/cost-calculator" className={linkClass}>
                  Calculator
                </Link>
                <Link href="/student/sop-analyzer" className={linkClass}>
                  SOP Analyzer
                </Link>
              </div>
            </div>
          )}

          <div className="hidden md:flex items-center gap-4">

            {user && !isOnboarding && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-2 rounded-full border p-1.5 transition-all cursor-pointer shadow-sm focus:outline-none ${
                    isHome 
                      ? 'border-slate-350 hover:border-teal-dark bg-white text-slate-800' 
                      : 'border-white/30 hover:border-white bg-[#00A896]/80 text-white'
                  }`}
                  title="View Profile Details"
                >
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={user.name || 'Account'} 
                      className="h-6 w-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className={`rounded-full p-1 shrink-0 ${
                      isHome ? 'bg-teal-dark/10 text-teal-dark' : 'bg-white/20 text-white'
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-xs font-bold pr-1.5 hidden lg:inline">{user.name || 'Account'}</span>
                </button>

                {/* Dropdown Card */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl z-50 text-slate-800 space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={user.name || 'Account'} 
                          className="h-12 w-12 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-teal-dark/10 border border-teal-dark/25 flex items-center justify-center text-teal-dark shrink-0">
                          <User className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-teal-dark uppercase tracking-wider block">Logged In As</span>
                        <span className="text-sm font-extrabold text-slate-900 block truncate mt-0.5">{user.name}</span>
                        <span className="text-xs text-slate-500 block truncate">{user.email}</span>
                        <span className="inline-block mt-1 text-[9px] font-extrabold uppercase bg-slate-100 text-slate-650 px-2 py-0.5 rounded-lg border border-slate-200">
                          {user.role === 'student' ? 'Student' : user.role === 'uni_admin' ? 'University Admin' : 'Platform Admin'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <Link
                        href={getDashboardLink()}
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-center py-2.5 bg-gradient-teal-sunrise text-slate-900 font-extrabold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer block"
                      >
                        {user.role === 'student' && !profile?.onboarding_completed 
                          ? 'Complete Onboarding' 
                          : 'Go to Dashboard'}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-center py-2 border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 text-slate-700"
                      >
                        <LogOut className="h-4 w-4 text-rose-600" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hamburger Menu - Mobile */}
          {user && !isOnboarding && (
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`inline-flex items-center justify-center rounded-md p-2 focus:outline-none ${
                  isHome 
                    ? 'text-teal-dark hover:bg-slate-100' 
                    : 'text-white hover:bg-teal-700'
                }`}
              >
                {mobileMenuOpen ? (
                  <X className={`h-6 w-6 ${isHome ? 'text-slate-900' : 'text-white'}`} />
                ) : (
                  <Menu className={`h-6 w-6 ${isHome ? 'text-slate-900' : 'text-white'}`} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && user && !isOnboarding && (
        <div className={`md:hidden border-b px-2 pt-2 pb-3 space-y-1 sm:px-3 ${
          isHome 
            ? 'border-slate-200 bg-white/95' 
            : 'border-teal-700 bg-[#00A896]'
        }`}>
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Home
          </Link>
          <Link
            href="/student/universities"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Universities
          </Link>
          <Link
            href="/student/scholarships"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Scholarships
          </Link>
          <Link
            href="/student/advisor"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            AI Advisor
          </Link>
          <Link
            href="/student/cost-calculator"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Calculator
          </Link>
          <Link
            href="/student/sop-analyzer"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            SOP Analyzer
          </Link>
          <Link
            href="/student/accommodations"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Accommodation
          </Link>
          <Link
            href="/student/visa"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Visa Guidance
          </Link>
          <Link
            href="/student/travel"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Travel Planner
          </Link>
          <Link
            href="/student/loans"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            Study Loans
          </Link>
          <Link
            href="/student/recommendations"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileLinkClass}
          >
            AI Predictor & Matcher
          </Link>
          {user ? (
            <div className={`border-t pt-4 mt-2 ${isHome ? 'border-slate-200' : 'border-teal-700'}`}>
              <Link
                href={getDashboardLink()}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-base font-medium ${
                  isHome ? 'text-teal-dark hover:bg-slate-50' : 'text-white hover:bg-teal-700'
                }`}
              >
                Dashboard ({user.name})
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className={`w-full text-left block rounded-md px-3 py-2 text-base font-medium ${
                  isHome ? 'text-rose-700 hover:bg-slate-50' : 'text-rose-200 hover:bg-teal-700 hover:text-white'
                }`}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className={`block rounded-md px-3 py-2 text-center text-base font-semibold border ${
                isHome 
                  ? 'border-teal-dark text-teal-dark hover:bg-teal-dark hover:text-white' 
                  : 'border-white text-white hover:bg-white hover:text-[#00A896]'
              } mt-4`}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
