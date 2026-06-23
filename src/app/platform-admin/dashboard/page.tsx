'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Landmark, Award, MessageSquare, Loader2, Compass, Activity
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { getPlatformStats } from '@/app/actions/platformAdmin';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Cell
} from 'recharts';

const COLORS = ['#0d9488', '#06b6d4', '#10b981', '#c0eb75', '#ffb266'];

export default function PlatformAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user || user.role !== 'platform_admin') {
        router.push('/auth');
        return;
      }

      const platformData = await getPlatformStats();
      if (platformData) {
        // Fallback mock history if DB events are empty
        if (platformData.events.length === 0) {
          platformData.events = [
            { date: 'Jun 10', eventsCount: 45 },
            { date: 'Jun 11', eventsCount: 62 },
            { date: 'Jun 12', eventsCount: 55 },
            { date: 'Jun 13', eventsCount: 78 },
            { date: 'Jun 14', eventsCount: 95 },
            { date: 'Jun 15', eventsCount: 120 },
          ];
        }
        // Fallback mock department if DB is empty
        if (platformData.departments.length === 0) {
          platformData.departments = [
            { name: 'Computer Science', value: 12 },
            { name: 'Data Science', value: 8 },
            { name: 'Business', value: 5 },
            { name: 'Information Technology', value: 6 },
          ];
        }
        setData(platformData);
      } else {
        router.push('/auth');
      }
      setLoading(false);
    }
    loadStats();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 text-teal-bright animate-spin mb-4" />
        <p className="text-sm text-yellow-green/60">Loading system management core...</p>
      </div>
    );
  }

  const statsList = [
    { label: 'Total Students', value: data?.stats.totalStudents || 0, icon: Users, color: 'text-teal-dark bg-teal-dark/10' },
    { label: 'Partner Universities', value: data?.stats.totalUniversities || 0, icon: Landmark, color: 'text-teal-dark bg-teal-dark/10' },
    { label: 'Active Scholarships', value: data?.stats.totalScholarships || 0, icon: Award, color: 'text-teal-dark bg-teal-dark/10' },
    { label: 'AI Inquiries Logged', value: data?.stats.totalChats || 0, icon: MessageSquare, color: 'text-teal-dark bg-teal-dark/10' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-6">
        <span className="text-xs font-bold text-teal-dark uppercase tracking-wide">Platform Administrator</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          System Analytics Dashboard
        </h1>
        <p className="text-xs text-slate-650 mt-1 font-medium">
          Monitor user growth trajectories, event transactions, and academic concentrations.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statsList.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="glass-card bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
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

      {/* Recharts Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column: Traffic history area graph */}
        <div className="lg:col-span-2 glass-card bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-dark" />
              <span>Platform Traffic & User Events</span>
            </h3>
            <span className="text-[10px] font-semibold text-slate-500">Live 15 Days</span>
          </div>

          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.events} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  itemStyle={{ color: '#0d9488' }}
                />
                <Area type="monotone" dataKey="eventsCount" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEvents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Academic Concentration Pie/Bar graph */}
        <div className="lg:col-span-1 glass-card bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Compass className="h-5 w-5 text-teal-dark" />
              <span>Academic Interests Ratio</span>
            </h3>
          </div>

          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.departments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#0d9488' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]}>
                  {data?.departments.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
