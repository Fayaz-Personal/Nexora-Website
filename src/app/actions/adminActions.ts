'use server';

import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

// Middleware verification
async function verifyAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'platform_admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

// 1. Fetch pending/verified/rejected partner registrations
export async function getPartnerRegistrations(status?: 'pending' | 'verified' | 'rejected') {
  try {
    await verifyAdmin();
    let sql = `
      SELECT pr.*, u.email as user_email
      FROM partner_registrations pr
      JOIN users u ON pr.user_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      sql += ' WHERE pr.status = $1';
      params.push(status);
    }
    sql += ' ORDER BY pr.created_at DESC';
    const res = await query(sql, params);
    return res.rows;
  } catch (error) {
    console.error('Error fetching partner registrations:', error);
    return [];
  }
}

// 2. Approve registration
export async function approvePartnerRegistration(registrationId: number) {
  try {
    await verifyAdmin();
    const regRes = await query('SELECT * FROM partner_registrations WHERE id = $1', [registrationId]);
    if (regRes.rows.length === 0) return { error: 'Registration record not found' };

    const reg = regRes.rows[0];

    // Begin transaction
    await query('BEGIN');

    // Update status in partner_registrations
    await query('UPDATE partner_registrations SET status = \'verified\' WHERE id = $1', [registrationId]);

    // Update user status
    await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [reg.user_id]);

    if (reg.partner_type === 'university') {
      // Create a university entry if not exists
      const checkUni = await query('SELECT id FROM universities WHERE name = $1', [reg.entity_name]);
      let universityId;
      if (checkUni.rows.length === 0) {
        // Create country (Germany as default seed if not specified)
        const countryRes = await query('SELECT id FROM countries LIMIT 1');
        const countryId = countryRes.rows.length > 0 ? countryRes.rows[0].id : 1;

        const insUni = await query(
          'INSERT INTO universities (name, country_id, ranking, tuition_fee_min, tuition_fee_max, acceptance_rate, description) VALUES ($1, $2, 100, 0, 50000, 50, \'Accredited University Partner\') RETURNING id',
          [reg.entity_name, countryId]
        );
        universityId = insUni.rows[0].id;
      } else {
        universityId = checkUni.rows[0].id;
      }

      // Link user to university
      await query(
        'INSERT INTO uni_admin_profiles (user_id, university_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET university_id = $2',
        [reg.user_id, universityId]
      );
    } else if (reg.partner_type === 'business') {
      // Create a business profile
      await query(`
        INSERT INTO business_profiles (user_id, category, company_name, status)
        VALUES ($1, $2, $3, 'verified')
        ON CONFLICT (user_id) DO UPDATE SET status = 'verified', category = $2, company_name = $3
      `, [reg.user_id, reg.category || 'accommodation', reg.entity_name]);
    }

    await query('COMMIT');

    revalidatePath('/platform-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('Error approving partner registration:', error);
    return { error: error.message || 'Failed to approve registration' };
  }
}

// 3. Reject registration
export async function rejectPartnerRegistration(registrationId: number) {
  try {
    await verifyAdmin();

    // Clean up any existing profile links if the registration is being rejected
    const regRes = await query('SELECT user_id FROM partner_registrations WHERE id = $1', [registrationId]);
    if (regRes.rows.length > 0) {
      await query('DELETE FROM uni_admin_profiles WHERE user_id = $1', [regRes.rows[0].user_id]);
    }

    await query('UPDATE partner_registrations SET status = \'rejected\' WHERE id = $1', [registrationId]);
    revalidatePath('/platform-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting partner registration:', error);
    return { error: error.message || 'Failed to reject registration' };
  }
}

// 4. Fetch all students
export async function getAllStudents() {
  try {
    await verifyAdmin();
    const res = await query(`
      SELECT sp.*, u.email, u.is_active
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      ORDER BY sp.name ASC
    `);
    return res.rows;
  } catch (error) {
    console.error('Error fetching all students:', error);
    return [];
  }
}

// 5. Fetch all universities
export async function getAllUniversities() {
  try {
    await verifyAdmin();
    const res = await query(`
      SELECT u.*, c.name as country_name, COUNT(co.id) as total_courses
      FROM universities u
      LEFT JOIN countries c ON u.country_id = c.id
      LEFT JOIN courses co ON u.id = co.university_id
      GROUP BY u.id, c.name
      ORDER BY u.ranking ASC
    `);
    return res.rows;
  } catch (error) {
    console.error('Error fetching all universities:', error);
    return [];
  }
}

// 6. Fetch all business profiles
export async function getAllBusinesses() {
  try {
    await verifyAdmin();
    const res = await query(`
      SELECT bp.*, u.email, u.is_active
      FROM business_profiles bp
      JOIN users u ON bp.user_id = u.id
      ORDER BY bp.company_name ASC
    `);
    return res.rows;
  } catch (error) {
    console.error('Error fetching all businesses:', error);
    return [];
  }
}

// 7. Fetch user tickets/complaints
export async function getUserTickets() {
  try {
    await verifyAdmin();
    const res = await query(`
      SELECT t.*, u.email as user_email, u.role as user_role
      FROM user_tickets t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.status DESC, t.created_at DESC
    `);
    return res.rows;
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }
}

// 8. Resolve ticket
export async function resolveUserTicket(ticketId: number) {
  try {
    await verifyAdmin();
    await query('UPDATE user_tickets SET status = \'resolved\' WHERE id = $1', [ticketId]);
    revalidatePath('/platform-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error resolving user ticket:', error);
    return { error: error.message || 'Failed to resolve ticket' };
  }
}

// 9. Fetch advanced platform analytics
export async function getAdvancedAnalytics() {
  try {
    await verifyAdmin();

    // Student growth (count per month)
    const studentGrowth = await query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM student_profiles
      GROUP BY month
      ORDER BY month ASC
    `);

    // Popular countries
    const popularCountries = await query(`
      SELECT c.name, COUNT(su.id) as count
      FROM student_saved_universities su
      JOIN universities u ON su.university_id = u.id
      JOIN countries c ON u.country_id = c.id
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 5
    `);

    // Popular courses
    const popularCourses = await query(`
      SELECT c.name, u.name as university_name, COUNT(sc.id) as count
      FROM student_saved_courses sc
      JOIN courses c ON sc.course_id = c.id
      JOIN universities u ON c.university_id = u.id
      GROUP BY c.name, u.name
      ORDER BY count DESC
      LIMIT 5
    `);

    // University statistics
    const uniStats = await query(`
      SELECT 
        COUNT(id) as total,
        AVG(ranking) as avg_ranking,
        AVG(acceptance_rate) as avg_acceptance
      FROM universities
    `);

    // Business statistics
    const busStats = await query(`
      SELECT category, COUNT(*) as count
      FROM business_profiles
      GROUP BY category
    `);

    return {
      studentGrowth: studentGrowth.rows,
      popularCountries: popularCountries.rows,
      popularCourses: popularCourses.rows,
      universityStats: uniStats.rows[0],
      businessStats: busStats.rows
    };
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    return null;
  }
}

// 10. Delete a university
export async function deleteUniversity(id: number) {
  try {
    await verifyAdmin();
    await query('DELETE FROM universities WHERE id = $1', [id]);
    revalidatePath('/platform-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting university:', error);
    return { error: error.message || 'Failed to delete university' };
  }
}

// 11. Delete business partner profile
export async function deleteBusinessProfile(id: number) {
  try {
    await verifyAdmin();
    await query('DELETE FROM business_profiles WHERE id = $1', [id]);
    revalidatePath('/platform-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting business profile:', error);
    return { error: error.message || 'Failed to delete business profile' };
  }
}
