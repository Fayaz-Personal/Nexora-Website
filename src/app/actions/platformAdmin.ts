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
