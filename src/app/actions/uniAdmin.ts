'use server';

import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

// 1. Get Uni Admin Profile & University details
export async function getUniAdminDetails() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'uni_admin') return null;

    const adminRes = await query('SELECT * FROM uni_admin_profiles WHERE user_id = $1', [user.id]);
    if (adminRes.rows.length === 0) return null;

    const admin = adminRes.rows[0];
    const univRes = await query('SELECT * FROM universities WHERE id = $1', [admin.university_id]);
    if (univRes.rows.length === 0) return null;

    return {
      admin,
      university: univRes.rows[0]
    };
  } catch (error) {
    console.error('Error fetching uni admin details:', error);
    return null;
  }
}

// 2. Get University Dashboard Stats
export async function getUniDashboardStats(universityId: number) {
  try {
    const coursesCount = await query('SELECT COUNT(*) FROM courses WHERE university_id = $1', [universityId]);
    
    // Count how many students saved this university
    const savedCount = await query('SELECT COUNT(*) FROM student_saved_universities WHERE university_id = $1', [universityId]);
    
    // Total potential admissions predictions
    const predictionsCount = await query('SELECT COUNT(*) FROM admission_predictions WHERE university_id = $1', [universityId]);

    // Average CGPA of interested students
    const avgCgpaRes = await query(`
      SELECT AVG(sp.cgpa) as avg_cgpa
      FROM student_saved_universities su
      JOIN student_profiles sp ON su.student_id = sp.id
      WHERE su.university_id = $1
    `, [universityId]);

    const avgCgpa = avgCgpaRes.rows[0]?.avg_cgpa ? Number(avgCgpaRes.rows[0].avg_cgpa).toFixed(2) : 'N/A';

    return {
      totalCourses: Number(coursesCount.rows[0].count),
      savedByStudents: Number(savedCount.rows[0].count),
      totalPredictions: Number(predictionsCount.rows[0].count),
      avgStudentCgpa: avgCgpa
    };
  } catch (error) {
    console.error('Error calculating university stats:', error);
    return {
      totalCourses: 0,
      savedByStudents: 0,
      totalPredictions: 0,
      avgStudentCgpa: 'N/A'
    };
  }
}

// 3. Get University Courses
export async function getUniCourses(universityId: number) {
  try {
    const res = await query('SELECT * FROM courses WHERE university_id = $1 ORDER BY id DESC', [universityId]);
    return res.rows;
  } catch (error) {
    console.error('Error fetching university courses:', error);
    return [];
  }
}

// 4. Create Course
export async function createCourse(data: {
  universityId: number;
  name: string;
  degreeType: string;
  department: string;
  duration: string;
  fees: number;
  description: string;
}) {
  try {
    await query(`
      INSERT INTO courses (university_id, name, degree_type, department, duration, fees, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      data.universityId,
      data.name,
      data.degreeType,
      data.department,
      data.duration,
      data.fees,
      data.description
    ]);

    revalidatePath('/uni-admin/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error creating course:', error);
    return { error: 'Failed to create course' };
  }
}

// 5. Delete Course
export async function deleteCourse(courseId: number, universityId: number) {
  try {
    await query('DELETE FROM courses WHERE id = $1 AND university_id = $2', [courseId, universityId]);
    revalidatePath('/uni-admin/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting course:', error);
    return { error: 'Failed to delete course' };
  }
}

// 6. Update University Profile details
export async function updateUniversityProfile(univId: number, data: {
  name: string;
  ranking: number;
  tuitionFeeMin: number;
  tuitionFeeMax: number;
  acceptanceRate: number;
  description: string;
  website: string;
  logoUrl: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'uni_admin') throw new Error('Unauthorized');

    await query(`
      UPDATE universities
      SET name = $1, ranking = $2, tuition_fee_min = $3, tuition_fee_max = $4,
          acceptance_rate = $5, description = $6, website = $7, logo_url = $8
      WHERE id = $9
    `, [
      data.name, data.ranking, data.tuitionFeeMin, data.tuitionFeeMax,
      data.acceptanceRate, data.description, data.website, data.logoUrl, univId
    ]);

    revalidatePath('/uni-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating university profile:', error);
    return { error: error.message || 'Failed to update university details.' };
  }
}

// 7. Get Scholarships by provider
export async function getUniScholarships(providerName: string) {
  try {
    const res = await query('SELECT * FROM scholarships WHERE provider = $1 ORDER BY id DESC', [providerName]);
    return res.rows;
  } catch (error) {
    console.error('Error fetching university scholarships:', error);
    return [];
  }
}

// 8. Save Scholarship (Insert or Update)
export async function saveScholarship(data: {
  id?: number;
  name: string;
  provider: string;
  type: 'government' | 'university' | 'private';
  amount: string;
  eligibilityCriteria: string;
  deadline: string;
  coverage: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'uni_admin' && user.role !== 'platform_admin')) throw new Error('Unauthorized');

    if (data.id) {
      // Update
      await query(`
        UPDATE scholarships
        SET name = $1, provider = $2, type = $3, amount = $4,
            eligibility_criteria = $5, deadline = $6, coverage = $7
        WHERE id = $8
      `, [
        data.name, data.provider, data.type, data.amount,
        data.eligibilityCriteria, data.deadline || null, data.coverage, data.id
      ]);
    } else {
      // Insert
      await query(`
        INSERT INTO scholarships (name, provider, type, amount, eligibility_criteria, deadline, coverage)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        data.name, data.provider, data.type, data.amount,
        data.eligibilityCriteria, data.deadline || null, data.coverage
      ]);
    }

    revalidatePath('/student/scholarships');
    revalidatePath('/uni-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving scholarship:', error);
    return { error: error.message || 'Failed to save scholarship.' };
  }
}

// 9. Delete Scholarship
export async function deleteScholarship(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'uni_admin' && user.role !== 'platform_admin')) throw new Error('Unauthorized');

    await query('DELETE FROM scholarships WHERE id = $1', [id]);
    
    revalidatePath('/student/scholarships');
    revalidatePath('/uni-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting scholarship:', error);
    return { error: error.message || 'Failed to delete scholarship.' };
  }
}

