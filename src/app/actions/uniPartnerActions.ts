'use server';

import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

// Middleware verification
async function verifyUniAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'uni_admin') {
    throw new Error('Unauthorized: University partner role required');
  }
  return user;
}

// 1. Submit Registration verification request
export async function submitUniRegistration(data: {
  entityName: string;
  licenseNumber: string;
  accreditationDocs: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    // Create entry in partner_registrations
    await query(`
      INSERT INTO partner_registrations (user_id, partner_type, status, entity_name, uploaded_documents)
      VALUES ($1, 'university', 'pending', $2, $3)
    `, [user.id, data.entityName, JSON.stringify({
      license_number: data.licenseNumber,
      accreditation_docs_path: data.accreditationDocs
    })]);

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting university registration:', error);
    return { error: error.message || 'Failed to submit registration' };
  }
}

// 2. Fetch Registration request status for current user
export async function getMyRegistrationStatus() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const res = await query('SELECT * FROM partner_registrations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.id]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (error) {
    console.error('Error getting registration status:', error);
    return null;
  }
}

// 2b. Delete/reset registration request (used when re-submitting after rejection)
export async function deletePartnerRegistration(regId: number) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    await query('DELETE FROM partner_registrations WHERE id = $1 AND user_id = $2', [regId, user.id]);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting partner registration:', error);
    return { error: error.message || 'Failed to delete registration' };
  }
}

// 3. Update/Save University Profile with additional fields
export async function updateUniversityProfileExtended(univId: number, data: {
  name: string;
  logoUrl: string;
  description: string;
  countryId: number;
  city: string;
  ranking: number;
  accreditation: string;
  website: string;
  contactInfo: { phone?: string; email?: string; address?: string };
  applicationProcedure?: string;
  eligibilityRequirements?: string;
  tuitionFeeMin: number;
  tuitionFeeMax: number;
}) {
  try {
    await verifyUniAdmin();

    await query(`
      UPDATE universities
      SET name = $1, logo_url = $2, description = $3, country_id = $4,
          city = $5, ranking = $6, accreditation = $7, website = $8,
          contact_info = $9, application_procedure = $10, eligibility_requirements = $11,
          tuition_fee_min = $12, tuition_fee_max = $13
      WHERE id = $14
    `, [
      data.name, data.logoUrl, data.description, data.countryId,
      data.city, data.ranking, data.accreditation, data.website,
      JSON.stringify(data.contactInfo), data.applicationProcedure || '',
      data.eligibilityRequirements || '', data.tuitionFeeMin, data.tuitionFeeMax, univId
    ]);

    revalidatePath('/uni-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating university profile extended:', error);
    return { error: error.message || 'Failed to update university profile' };
  }
}

// 4. Course Management: Create/Update course with detailed requirement parameters
export async function saveCourseExtended(data: {
  id?: number;
  universityId: number;
  name: string;
  degreeType: 'MSc' | 'MTech' | 'MBA' | 'MS' | 'PhD' | 'Professional Certification';
  department: string;
  duration: string;
  fees: number;
  description: string;
  intake?: string;
  applicationDeadline?: string;
  seatsAvailable?: number;
  eligibilityCriteria?: string;
  requiredExams?: string;
  ieltsRequirement?: number;
  toeflRequirement?: number;
  greRequirement?: number;
  minCgpa?: number;
}) {
  try {
    await verifyUniAdmin();

    if (data.id) {
      // Update
      await query(`
        UPDATE courses
        SET name = $1, degree_type = $2, department = $3, duration = $4, fees = $5,
            description = $6, intake = $7, application_deadline = $8, seats_available = $9,
            eligibility_criteria = $10, required_exams = $11, ielts_requirement = $12,
            toefl_requirement = $13, gre_requirement = $14, min_cgpa = $15
        WHERE id = $16 AND university_id = $17
      `, [
        data.name, data.degreeType, data.department, data.duration, data.fees,
        data.description, data.intake, data.applicationDeadline || null, data.seatsAvailable,
        data.eligibilityCriteria, data.requiredExams, data.ieltsRequirement,
        data.toeflRequirement, data.greRequirement, data.minCgpa, data.id, data.universityId
      ]);
    } else {
      // Insert
      await query(`
        INSERT INTO courses (
          university_id, name, degree_type, department, duration, fees, description,
          intake, application_deadline, seats_available, eligibility_criteria,
          required_exams, ielts_requirement, toefl_requirement, gre_requirement, min_cgpa
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        data.universityId, data.name, data.degreeType, data.department, data.duration, data.fees, data.description,
        data.intake, data.applicationDeadline || null, data.seatsAvailable, data.eligibilityCriteria,
        data.requiredExams, data.ieltsRequirement, data.toeflRequirement, data.greRequirement, data.minCgpa
      ]);
    }

    revalidatePath('/uni-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving course extended:', error);
    return { error: error.message || 'Failed to save course parameters' };
  }
}

// 5. Applicant Application management: Get applicants for university
export async function getUniversityApplicants(universityId: number) {
  try {
    await verifyUniAdmin();

    const res = await query(`
      SELECT 
        sa.id as application_id,
        sa.status as application_status,
        sa.created_at as application_date,
        sa.documents_json,
        sa.university_feedback,
        sp.id as student_id,
        sp.name as student_name,
        sp.cgpa as student_cgpa,
        sp.degree as student_degree,
        sp.department as student_dept,
        c.id as course_id,
        c.name as course_name
      FROM student_applications sa
      JOIN courses c ON sa.course_id = c.id
      JOIN student_profiles sp ON sa.student_id = sp.id
      WHERE c.university_id = $1
      ORDER BY sa.created_at DESC
    `, [universityId]);

    return res.rows;
  } catch (error) {
    console.error('Error fetching university applicants:', error);
    return [];
  }
}

// 6. Update student application status and add internal feedback communication log
export async function evaluateStudentApplication(
  applicationId: number, 
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'waitlisted', 
  feedback: string
) {
  try {
    await verifyUniAdmin();

    await query(`
      UPDATE student_applications
      SET status = $1, university_feedback = $2
      WHERE id = $3
    `, [status, feedback, applicationId]);

    revalidatePath('/uni-admin/dashboard');
    revalidatePath('/student/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error evaluating student application:', error);
    return { error: error.message || 'Failed to update application status' };
  }
}

// 7. Get custom university dashboard analytics
export async function getUniversityAnalytics(universityId: number) {
  try {
    await verifyUniAdmin();

    // Mock profile visits (e.g. bookmarks * 12 + application counts * 34)
    const savedRes = await query('SELECT COUNT(*) FROM student_saved_universities WHERE university_id = $1', [universityId]);
    const bookmarks = Number(savedRes.rows[0].count);
    const profileVisits = bookmarks * 18 + 74;

    // Course popularity (number of student saved events / predictions per course)
    const coursePopularity = await query(`
      SELECT c.name as course_name, COUNT(sc.id) as saved_count
      FROM courses c
      LEFT JOIN student_saved_courses sc ON c.id = sc.course_id
      WHERE c.university_id = $1
      GROUP BY c.id, c.name
      ORDER BY saved_count DESC
    `, [universityId]);

    // Student application stats: total, pending, accepted, rejected
    const appStats = await query(`
      SELECT 
        COUNT(sa.id) as total,
        COUNT(CASE WHEN sa.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN sa.status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN sa.status = 'rejected' THEN 1 END) as rejected
      FROM student_applications sa
      JOIN courses c ON sa.course_id = c.id
      WHERE c.university_id = $1
    `, [universityId]);

    return {
      profileVisits,
      coursePopularity: coursePopularity.rows,
      interestStats: { bookmarks },
      applicationStats: appStats.rows[0] || { total: 0, pending: 0, accepted: 0, rejected: 0 }
    };
  } catch (error) {
    console.error('Error fetching university analytics:', error);
    return null;
  }
}
