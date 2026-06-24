'use server';

import { query } from '@/db';
import { getCurrentUser } from './auth';

// 1. Get Platform Statistics
export async function getPlatformStats() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') return null;

    const students = await query('SELECT COUNT(*) FROM student_profiles');
    const universities = await query('SELECT COUNT(*) FROM universities');
    const scholarships = await query('SELECT COUNT(*) FROM scholarships');
    const chats = await query('SELECT COUNT(*) FROM ai_chat_logs');

    // Aggregate monthly search activity/events
    const eventHistory = await query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM analytics_events
      GROUP BY date
      ORDER BY date ASC
      LIMIT 15
    `);

    // Distribution of students by department
    const deptDistribution = await query(`
      SELECT department, COUNT(*) as count
      FROM student_profiles
      GROUP BY department
    `);

    return {
      stats: {
        totalStudents: Number(students.rows[0].count),
        totalUniversities: Number(universities.rows[0].count),
        totalScholarships: Number(scholarships.rows[0].count),
        totalChats: Number(chats.rows[0].count),
      },
      events: eventHistory.rows.map(row => ({
        date: row.date,
        eventsCount: Number(row.count)
      })),
      departments: deptDistribution.rows.map(row => ({
        name: row.department || 'Undecided',
        value: Number(row.count)
      }))
    };
  } catch (error) {
    console.error('Error fetching platform statistics:', error);
    return null;
  }
}

// 2. Get Platform Detailed Data (for moderation and broadcaster tabs)
export async function getPlatformDetailedData() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') return null;

    // Fetch all users with profile names if available
    const usersRes = await query(`
      SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.is_active, 
        u.created_at,
        COALESCE(sp.name, uap.university_id::text, u.email) as name
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN uni_admin_profiles uap ON u.id = uap.user_id
      ORDER BY u.created_at DESC
    `);

    // Fetch universities for display/mapping
    const uniRes = await query('SELECT id, name FROM universities');
    const uniMap = new Map();
    uniRes.rows.forEach(row => {
      uniMap.set(row.id, row.name);
    });

    const users = usersRes.rows.map(row => {
      let displayName = row.name;
      if (row.role === 'uni_admin' && !isNaN(Number(row.name))) {
        displayName = uniMap.get(Number(row.name)) || `University Admin (${row.name})`;
      } else if (row.role === 'business') {
        displayName = row.email.split('@')[0];
      }
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
        name: displayName
      };
    });

    // Fetch announcements history
    const announcementsRes = await query(`
      SELECT id, title, message, target_role, created_at
      FROM announcements
      ORDER BY created_at DESC
    `);

    return {
      users,
      announcements: announcementsRes.rows.map(row => ({
        id: row.id,
        title: row.title,
        message: row.message,
        targetRole: row.target_role,
        createdAt: row.created_at
      }))
    };
  } catch (error) {
    console.error('Error fetching detailed platform data:', error);
    return null;
  }
}

// 3. Toggle User Active Status (Moderation Suspension)
export async function toggleUserStatus(userId: number, isActive: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') {
      return { error: 'Unauthorized' };
    }

    if (userId === user.id) {
      return { error: 'You cannot suspend your own administrator account.' };
    }

    await query(
      'UPDATE users SET is_active = $1 WHERE id = $2',
      [isActive, userId]
    );

    // Track in analytics_events
    await query(
      'INSERT INTO analytics_events (event_type, user_id, metadata_json) VALUES ($1, $2, $3)',
      ['user_moderation', user.id, JSON.stringify({ moderated_user_id: userId, set_active: isActive })]
    );

    return { success: true };
  } catch (error) {
    console.error('Error toggling user status:', error);
    return { error: 'Database update failed' };
  }
}

// 4. Broadcast Announcement
export async function broadcastAnnouncement(title: string, message: string, targetRole: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') {
      return { error: 'Unauthorized' };
    }

    if (!title || !message) {
      return { error: 'Title and message are required.' };
    }

    await query(
      'INSERT INTO announcements (title, message, target_role) VALUES ($1, $2, $3)',
      [title, message, targetRole]
    );

    // Track in analytics_events
    await query(
      'INSERT INTO analytics_events (event_type, user_id, metadata_json) VALUES ($1, $2, $3)',
      ['broadcast_notice', user.id, JSON.stringify({ title, target_role: targetRole })]
    );

    return { success: true };
  } catch (error) {
    console.error('Error broadcasting announcement:', error);
    return { error: 'Database insertion failed' };
  }
}

// 5. Get Export Dataset (for CSV reports)
export async function getExportDataset(type: 'users' | 'courses' | 'budgets') {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') return null;

    if (type === 'users') {
      const res = await query(`
        SELECT id, email, role, is_active, created_at 
        FROM users 
        ORDER BY id ASC
      `);
      return res.rows;
    } else if (type === 'courses') {
      const res = await query(`
        SELECT c.id, c.name as course_name, c.degree_type, c.department, c.duration, c.fees, u.name as university_name
        FROM courses c
        JOIN universities u ON c.university_id = u.id
        ORDER BY u.name ASC, c.name ASC
      `);
      return res.rows;
    } else if (type === 'budgets') {
      const res = await query(`
        SELECT sp.id, sp.name as student_name, u.email, sp.degree, sp.department, sp.budget, sp.preferred_countries
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        ORDER BY sp.budget DESC NULLS LAST
      `);
      return res.rows.map(row => ({
        ...row,
        preferred_countries: Array.isArray(row.preferred_countries) ? row.preferred_countries.join(', ') : (row.preferred_countries || '')
      }));
    }
    return null;
  } catch (error) {
    console.error('Error fetching export dataset:', error);
    return null;
  }
}
