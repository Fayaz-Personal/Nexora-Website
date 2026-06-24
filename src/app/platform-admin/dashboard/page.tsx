'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Landmark, Award, MessageSquare, Loader2, Compass, Activity,
  Megaphone, FileSpreadsheet, Search, UserCheck, UserX, AlertCircle,
  Calendar, Send, Filter, ShieldAlert, Sparkles, CheckCircle2, ChevronRight
} from 'lucide-react';
import { getCurrentUser } from '@/app/actions/auth';
import { 
  getPlatformStats, 
  getPlatformDetailedData, 
  toggleUserStatus, 
  broadcastAnnouncement,
  getExportDataset
} from '@/app/actions/platformAdmin';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Cell
} from 'recharts';

const COLORS = ['#0d9488', '#06b6d4', '#10b981', '#fbbf24', '#f87171'];

export default function PlatformAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcast' | 'reports'>('overview');
  const [data, setData] = useState<any>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Broadcast Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  // Moderation state
  const [moderatingId, setModeratingId] = useState<number | null>(null);

  // Export state
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Notification/Feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') {
      router.push('/auth');
      return;
    }
    setCurrentUser(user);

    const stats = await getPlatformStats();
    const detailed = await getPlatformDetailedData();

    if (stats) {
      // Fallback mock history if DB events are empty
      if (stats.events.length === 0) {
        stats.events = [
          { date: 'Jun 10', eventsCount: 45 },
          { date: 'Jun 11', eventsCount: 62 },
          { date: 'Jun 12', eventsCount: 55 },
          { date: 'Jun 13', eventsCount: 78 },
          { date: 'Jun 14', eventsCount: 95 },
          { date: 'Jun 15', eventsCount: 120 },
        ];
      }
      // Fallback mock department if DB is empty
      if (stats.departments.length === 0) {
        stats.departments = [
          { name: 'Computer Science', value: 12 },
          { name: 'Data Science', value: 8 },
          { name: 'Business', value: 5 },
          { name: 'Information Technology', value: 6 },
        ];
      }
      setData(stats);
    }

    if (detailed) {
      setDetailedData(detailed);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [router]);

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    if (userId === currentUser?.id) {
      setFeedback({ type: 'error', text: 'Security restriction: You cannot suspend your own admin session.' });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    const actionText = currentStatus ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${actionText} this user's account?`)) return;

    setModeratingId(userId);
    const res = await toggleUserStatus(userId, !currentStatus);
    if (res.success) {
      setDetailedData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map((u: any) => 
            u.id === userId ? { ...u, isActive: !currentStatus } : u
          )
        };
      });
      setFeedback({ 
        type: 'success', 
        text: `Account ID ${userId} has been successfully ${currentStatus ? 'suspended' : 'reactivated'}.` 
      });
    } else {
      setFeedback({ type: 'error', text: res.error || 'Failed to update user status.' });
    }
    setModeratingId(null);
    setTimeout(() => setFeedback(null), 4500);
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setFeedback({ type: 'error', text: 'Announcement title and content message are required.' });
      return;
    }

    setSubmittingBroadcast(true);
    const res = await broadcastAnnouncement(broadcastTitle, broadcastMessage, broadcastTarget);
    if (res.success) {
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastTarget('all');
      setFeedback({ type: 'success', text: 'Announcement successfully broadcasted to target role!' });
      
      // Reload history log
      const detailed = await getPlatformDetailedData();
      if (detailed) {
        setDetailedData(detailed);
      }
    } else {
      setFeedback({ type: 'error', text: res.error || 'Failed to broadcast announcement.' });
    }
    setSubmittingBroadcast(false);
    setTimeout(() => setFeedback(null), 4500);
  };

  const triggerCSVDownload = async (type: 'users' | 'courses' | 'budgets', title: string) => {
    setExportingType(type);
    try {
      const exportData = await getExportDataset(type);
      if (!exportData || exportData.length === 0) {
        alert('No data records available to generate this CSV.');
        setExportingType(null);
        return;
      }

      // Build CSV String
      const headers = Object.keys(exportData[0]);
      const csvLines = [headers.join(',')];

      for (const row of exportData) {
        const line = headers.map(header => {
          const val = row[header];
          // Escape quotes in values
          const cleanVal = ('' + (val !== null && val !== undefined ? val : '')).replace(/"/g, '""');
          return `"${cleanVal}"`;
        });
        csvLines.push(line.join(','));
      }

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setFeedback({ type: 'success', text: `${title} successfully downloaded as CSV.` });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: 'Failed to compile report data.' });
    }
    setExportingType(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50">
        <Loader2 className="h-10 w-10 text-teal-dark animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading system management core...</p>
      </div>
    );
  }

  // Filter users lists
  const filteredUsers = detailedData?.users.filter((u: any) => {
    const queryStr = searchQuery.toLowerCase();
    const nameMatch = (u.name || '').toLowerCase().includes(queryStr);
    const emailMatch = (u.email || '').toLowerCase().includes(queryStr);
    const roleMatch = roleFilter === 'all' || u.role === roleFilter;
    return (nameMatch || emailMatch) && roleMatch;
  }) || [];

  const statsList = [
    { label: 'Total Students', value: data?.stats.totalStudents || 0, icon: Users, color: 'text-teal-dark bg-teal-dark/10' },
    { label: 'Partner Universities', value: data?.stats.totalUniversities || 0, icon: Landmark, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Active Scholarships', value: data?.stats.totalScholarships || 0, icon: Award, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'AI Inquiries Logged', value: data?.stats.totalChats || 0, icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Banner Alert Feedback */}
        {feedback && (
          <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border animate-[fadeIn_0.3s_ease-out] ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-rose-600" />}
            <span className="text-xs font-bold">{feedback.text}</span>
          </div>
        )}

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-teal-dark bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                System Command
              </span>
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              Nexora Administrator Console
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Monitor traffic activity metrics, moderate partner/student accounts, and broadcast system-wide notices.
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsList.map((card, i) => {
            const Icon = card.icon;
            return (
              <div 
                key={i} 
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-350"
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {card.label}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 block mt-1">
                    {card.value}
                  </span>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Controls Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {[
            { id: 'overview', label: 'Overview Metrics', icon: Activity },
            { id: 'users', label: 'User Auditing', icon: Users },
            { id: 'broadcast', label: 'Notice Broadcaster', icon: Megaphone },
            { id: 'reports', label: 'Report Center', icon: FileSpreadsheet }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2.5 px-4 sm:px-5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-teal-dark text-white shadow-md shadow-teal-dark/15'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 animate-[fadeIn_0.35s_ease-out]">
            
            {/* Area Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-teal-dark" />
                  <span>Platform Traffic & User Events</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                  Live 15 Days
                </span>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.events} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      itemStyle={{ color: '#0d9488' }}
                    />
                    <Area type="monotone" dataKey="eventsCount" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interest ratio bar chart */}
            <div className="lg:col-span-1 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Compass className="h-4.5 w-4.5 text-teal-dark" />
                  <span>Academic Interests Distribution</span>
                </h3>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.departments} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 8.5 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
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
        )}

        {/* TAB 2: USER AUDITING */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-[fadeIn_0.35s_ease-out]">
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-dark transition-all font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full sm:w-auto text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:bg-white focus:border-teal-dark text-slate-700"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students Only</option>
                  <option value="uni_admin">University Admins</option>
                  <option value="business">Business Partners</option>
                  <option value="platform_admin">Platform Admins</option>
                </select>
              </div>
            </div>

            {/* Users registry table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-4 px-6">Name / Registered Account</th>
                      <th className="py-4 px-6">System Role</th>
                      <th className="py-4 px-6">Joined Date</th>
                      <th className="py-4 px-6">Security Clearance</th>
                      <th className="py-4 px-6 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-450 font-bold">
                          No registered user records match the specified filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user: any) => {
                        const isSelf = user.id === currentUser?.id;
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-900 text-sm">{user.name}</span>
                                <span className="text-slate-450 text-[11px] mt-0.5">{user.email}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-bold ${
                                user.role === 'platform_admin' ? 'bg-purple-100 text-purple-700' :
                                user.role === 'uni_admin' ? 'bg-blue-100 text-blue-700' :
                                user.role === 'business' ? 'bg-amber-100 text-amber-700' :
                                'bg-teal-50 text-teal-700'
                              }`}>
                                {user.role === 'platform_admin' ? 'Platform Admin' :
                                 user.role === 'uni_admin' ? 'Uni Administrator' :
                                 user.role === 'business' ? 'Business Partner' :
                                 'Student Applicant'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-500">
                              {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className={`text-[11px] font-bold ${user.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {user.isActive ? 'Active Access' : 'Suspended'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {isSelf ? (
                                <span className="text-[10px] text-slate-400 italic">Self session active</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(user.id, user.isActive)}
                                  disabled={moderatingId === user.id}
                                  className={`px-3 py-1.5 rounded-lg border font-bold text-[10.5px] cursor-pointer transition-all ${
                                    user.isActive 
                                      ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                                      : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                >
                                  {moderatingId === user.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                                  ) : user.isActive ? (
                                    'Suspend Access'
                                  ) : (
                                    'Reactivate Access'
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BROADCASTER NODE */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.35s_ease-out]">
            
            {/* Broadcaster Form */}
            <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Megaphone className="h-4.5 w-4.5 text-teal-dark" />
                  <span>Transmit New Announcement</span>
                </h3>
                <p className="text-[10.5px] text-slate-400 mt-1">Publish global notifications for portal users.</p>
              </div>

              <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase">Notification Title</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. System upgrade maintenance notice"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-dark transition-all text-slate-850 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase">Target Role Audience</label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-dark transition-all text-slate-650"
                  >
                    <option value="all">Broadcast to All Portal Users</option>
                    <option value="student">Student Applicants Only</option>
                    <option value="uni_admin">University Admins Only</option>
                    <option value="business">Business Partners Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase">Announcement Details</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Provide notification info details here..."
                    rows={4}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-dark transition-all text-slate-850 font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingBroadcast}
                  className="w-full glow-btn font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submittingBroadcast ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Transmit Notice</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Broadcast history logs */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Broadcast Transmission Logs</h3>
                  <p className="text-[10.5px] text-slate-400 mt-1">Review previously transmitted notifications.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-450 bg-slate-100 px-2 py-0.5 rounded">
                  {detailedData?.announcements.length || 0} notices
                </span>
              </div>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {detailedData?.announcements.length === 0 ? (
                  <p className="text-center text-slate-450 py-16 font-bold text-xs">
                    No notice announcements have been transmitted yet.
                  </p>
                ) : (
                  detailedData?.announcements.map((log: any) => (
                    <div 
                      key={log.id} 
                      className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl space-y-2 hover:bg-slate-50 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-extrabold text-slate-900 text-sm leading-tight">{log.title}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-100 text-[9px] font-extrabold text-teal-700 capitalize">
                            Target: {log.targetRole}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </span>
                        </div>
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed font-medium">
                        {log.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: REPORT CENTER */}
        {activeTab === 'reports' && (
          <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.35s_ease-out]">
            
            <div className="bg-gradient-teal-sunrise rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Data Governance
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Platform SQL Analytics & Reports</h2>
                <p className="text-xs text-white/80 max-w-xl font-medium">
                  Export complete relational datasets to CSV formatting schemas for local offline audits, scholarship analysis, and demographic studies.
                </p>
              </div>
              <Sparkles className="h-10 w-10 text-white/25 hidden md:block" />
            </div>

            {/* Reports cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  id: 'users' as const, 
                  title: 'Users Directory Registry', 
                  desc: 'Download full user credentials list including role identifiers, registration active status checks, and enrollment timestamps.',
                  btnText: 'Download User Audit CSV'
                },
                { 
                  id: 'courses' as const, 
                  title: 'Academic Curriculum Index', 
                  desc: 'Export complete catalog database of course listings, academic departments, degree programs, and corresponding tuition fees.',
                  btnText: 'Download Curriculum CSV'
                },
                { 
                  id: 'budgets' as const, 
                  title: 'Student Budgets Analysis', 
                  desc: 'Generate demographic exports detailing student study budgets, preferred countries, degree levels, and department designations.',
                  btnText: 'Download Budgets Analytics CSV'
                }
              ].map((report) => (
                <div 
                  key={report.id} 
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 space-y-5"
                >
                  <div className="space-y-3">
                    <div className="p-3 bg-teal-50 text-teal-dark rounded-xl w-fit">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-base">{report.title}</h3>
                    <p className="text-[11.5px] text-slate-450 leading-relaxed font-medium">
                      {report.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => triggerCSVDownload(report.id, report.title)}
                    disabled={exportingType !== null}
                    className="w-full py-2.5 rounded-xl border border-teal-dark text-teal-dark hover:bg-teal-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {exportingType === report.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>{report.btnText}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
