'use server';

import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

// Interface definitions
export interface University {
  id: number;
  name: string;
  country_name: string;
  country_code: string;
  logo_url: string;
  ranking: number;
  tuition_fee_min: number;
  tuition_fee_max: number;
  acceptance_rate: number;
  description: string;
  website: string;
  is_saved?: boolean;
  country_currency?: string;
}

export interface Course {
  id: number;
  university_id: number;
  university_name: string;
  country_name: string;
  name: string;
  degree_type: string;
  department: string;
  duration: string;
  fees: number;
  description: string;
  is_saved?: boolean;
  country_currency?: string;
}

export interface Scholarship {
  id: number;
  name: string;
  provider: string;
  type: 'government' | 'university' | 'private';
  amount: string;
  eligibility_criteria: string;
  deadline: string;
  coverage: string;
  match_percentage?: number;
  is_saved?: boolean;
}

// 1. Get Universities
export async function getUniversities(filters: {
  country?: string;
  degree?: string;
  budgetMax?: number;
  rankingMax?: number;
  search?: string;
}, studentProfileId?: number): Promise<University[]> {
  try {
    let sql = `
      SELECT u.*, c.name as country_name, c.code as country_code, c.currency as country_currency
      FROM universities u
      JOIN countries c ON u.country_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.country && filters.country !== 'all') {
      sql += ` AND c.name = $${paramIndex}`;
      params.push(filters.country);
      paramIndex++;
    }

    if (filters.budgetMax) {
      sql += ` AND u.tuition_fee_min <= $${paramIndex}`;
      params.push(filters.budgetMax);
      paramIndex++;
    }

    if (filters.rankingMax) {
      sql += ` AND u.ranking <= $${paramIndex}`;
      params.push(filters.rankingMax);
      paramIndex++;
    }

    if (filters.search) {
      sql += ` AND (u.name ILIKE $${paramIndex} OR u.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY u.ranking ASC`;

    const res = await query(sql, params);
    let universities: University[] = res.rows;

    // Check saved status if profile is logged in
    if (studentProfileId && universities.length > 0) {
      const savedRes = await query(
        'SELECT university_id FROM student_saved_universities WHERE student_id = $1',
        [studentProfileId]
      );
      const savedIds = new Set(savedRes.rows.map(row => row.university_id));
      universities = universities.map(u => ({
        ...u,
        is_saved: savedIds.has(u.id)
      }));
    }

    return universities;
  } catch (error) {
    console.error('Error fetching universities:', error);
    return [];
  }
}

// 2. Get Courses
export async function getCourses(filters: {
  universityId?: number;
  degreeType?: string;
  department?: string;
  feesMax?: number;
  search?: string;
}, studentProfileId?: number): Promise<Course[]> {
  try {
    let sql = `
      SELECT c.*, u.name as university_name, co.name as country_name, co.currency as country_currency
      FROM courses c
      JOIN universities u ON c.university_id = u.id
      JOIN countries co ON u.country_id = co.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.universityId) {
      sql += ` AND c.university_id = $${paramIndex}`;
      params.push(filters.universityId);
      paramIndex++;
    }

    if (filters.degreeType && filters.degreeType !== 'all') {
      sql += ` AND c.degree_type = $${paramIndex}`;
      params.push(filters.degreeType);
      paramIndex++;
    }

    if (filters.department && filters.department !== 'all') {
      sql += ` AND c.department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    if (filters.feesMax) {
      sql += ` AND c.fees <= $${paramIndex}`;
      params.push(filters.feesMax);
      paramIndex++;
    }

    if (filters.search) {
      sql += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const res = await query(sql, params);
    let courses: Course[] = res.rows;

    if (studentProfileId && courses.length > 0) {
      const savedRes = await query(
        'SELECT course_id FROM student_saved_courses WHERE student_id = $1',
        [studentProfileId]
      );
      const savedIds = new Set(savedRes.rows.map(row => row.course_id));
      courses = courses.map(c => ({
        ...c,
        is_saved: savedIds.has(c.id)
      }));
    }

    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

// 3. Get Scholarships with Personal Match Calculations
export async function getScholarships(studentProfileId?: number): Promise<Scholarship[]> {
  try {
    const res = await query('SELECT * FROM scholarships ORDER BY deadline ASC');
    let scholarships: Scholarship[] = res.rows;

    let studentProfile: any = null;
    let savedIds = new Set<number>();

    if (studentProfileId) {
      const profileRes = await query('SELECT * FROM student_profiles WHERE id = $1', [studentProfileId]);
      if (profileRes.rows.length > 0) {
        studentProfile = profileRes.rows[0];
      }

      const savedRes = await query(
        'SELECT scholarship_id FROM student_saved_scholarships WHERE student_id = $1',
        [studentProfileId]
      );
      savedIds = new Set(savedRes.rows.map(row => row.scholarship_id));
    }

    // Dynamic matching algorithm based on student details
    scholarships = scholarships.map(sch => {
      let match = 50; // default base match percentage
      let isSaved = false;

      if (savedIds.has(sch.id)) {
        isSaved = true;
      }

      if (studentProfile) {
        // Compare scholarship requirements with CGPA
        if (sch.eligibility_criteria.toLowerCase().includes('gpa') || sch.eligibility_criteria.toLowerCase().includes('academic')) {
          if (Number(studentProfile.cgpa) >= 3.7) match += 25;
          else if (Number(studentProfile.cgpa) >= 3.3) match += 15;
          else match -= 10;
        }

        // Check if student interests align with scholarship provider/criteria
        const dept = (studentProfile.department || '').toLowerCase();
        if (sch.eligibility_criteria.toLowerCase().includes(dept) || sch.name.toLowerCase().includes(dept)) {
          match += 15;
        }

        // Budget comparison (if student budget is low, government scholarships match higher)
        if (Number(studentProfile.budget) < 15000 && sch.type === 'government') {
          match += 10;
        }
      }

      // Bound between 0 and 100
      match = Math.max(10, Math.min(100, match));

      return {
        ...sch,
        is_saved: isSaved,
        match_percentage: match
      };
    });

    return scholarships;
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    return [];
  }
}

// 4. Save/Unsave university
export async function toggleSaveUniversity(univId: number, profileId: number, isCurrentlySaved: boolean) {
  try {
    if (isCurrentlySaved) {
      await query(
        'DELETE FROM student_saved_universities WHERE student_id = $1 AND university_id = $2',
        [profileId, univId]
      );
      // Delete the prediction too
      await query(
        'DELETE FROM admission_predictions WHERE student_id = $1 AND university_id = $2',
        [profileId, univId]
      );
    } else {
      await query(
        'INSERT INTO student_saved_universities (student_id, university_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [profileId, univId]
      );
      // Run prediction generator for this university
      await calculateAndSavePrediction(profileId, univId);
    }
    await recalculateStudentXpAndLevel(profileId);
    revalidatePath('/student/universities');
    revalidatePath('/student/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error toggling university save:', error);
    return { error: 'Failed to update saved university' };
  }
}

// 5. Save/Unsave course
export async function toggleSaveCourse(courseId: number, profileId: number, isCurrentlySaved: boolean) {
  try {
    if (isCurrentlySaved) {
      await query(
        'DELETE FROM student_saved_courses WHERE student_id = $1 AND course_id = $2',
        [profileId, courseId]
      );
    } else {
      await query(
        'INSERT INTO student_saved_courses (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [profileId, courseId]
      );
    }
    await recalculateStudentXpAndLevel(profileId);
    revalidatePath('/student/courses');
    return { success: true };
  } catch (error) {
    console.error('Error toggling course save:', error);
    return { error: 'Failed to update saved course' };
  }
}

// 6. Save/Unsave scholarship
export async function toggleSaveScholarship(schId: number, profileId: number, isCurrentlySaved: boolean) {
  try {
    if (isCurrentlySaved) {
      await query(
        'DELETE FROM student_saved_scholarships WHERE student_id = $1 AND scholarship_id = $2',
        [profileId, schId]
      );
    } else {
      await query(
        'INSERT INTO student_saved_scholarships (student_id, scholarship_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [profileId, schId]
      );
    }
    await recalculateStudentXpAndLevel(profileId);
    revalidatePath('/student/scholarships');
    return { success: true };
  } catch (error) {
    console.error('Error toggling scholarship save:', error);
    return { error: 'Failed to update saved scholarship' };
  }
}

// 7. Get Saved Items for Dashboard
export async function getSavedItems(profileId: number) {
  try {
    const univsRes = await query(`
      SELECT u.*, c.name as country_name, c.code as country_code
      FROM student_saved_universities su
      JOIN universities u ON su.university_id = u.id
      JOIN countries c ON u.country_id = c.id
      WHERE su.student_id = $1
    `, [profileId]);

    const coursesRes = await query(`
      SELECT co.*, u.name as university_name, cn.name as country_name
      FROM student_saved_courses sc
      JOIN courses co ON sc.course_id = co.id
      JOIN universities u ON co.university_id = u.id
      JOIN countries cn ON u.country_id = cn.id
      WHERE sc.student_id = $1
    `, [profileId]);

    const schsRes = await query(`
      SELECT s.*
      FROM student_saved_scholarships ss
      JOIN scholarships s ON ss.scholarship_id = s.id
      WHERE ss.student_id = $1
    `, [profileId]);

    return {
      universities: univsRes.rows,
      courses: coursesRes.rows,
      scholarships: schsRes.rows
    };
  } catch (error) {
    console.error('Error fetching saved items:', error);
    return { universities: [], courses: [], scholarships: [] };
  }
}

export async function updateStudentProfile(profileId: number, data: {
  name: string;
  degree: string;
  department: string;
  cgpa: number;
  budget: number;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  nationality: string;
  currentCountry: string;
  avatarUrl?: string | null;
}) {
  try {
    const predictedCurrency = getCurrencyFromNationality(data.nationality);

    await query(`
      UPDATE student_profiles
      SET name = $1, degree = $2, department = $3, cgpa = $4, budget = $5,
          linkedin_url = $6, github_url = $7, portfolio_url = $8,
          nationality = $9, current_country = $10, preferred_currency = $11,
          avatar_url = $12
      WHERE id = $13
    `, [
      data.name,
      data.degree,
      data.department,
      data.cgpa,
      data.budget,
      data.linkedinUrl || null,
      data.githubUrl || null,
      data.portfolioUrl || null,
      data.nationality,
      data.currentCountry,
      predictedCurrency,
      data.avatarUrl || null,
      profileId
    ]);

    // Update eligibility score based on criteria: cgpa and budget
    let eligibility = 50;
    if (data.cgpa >= 3.8) eligibility += 30;
    else if (data.cgpa >= 3.5) eligibility += 20;
    else if (data.cgpa >= 3.0) eligibility += 10;

    if (data.budget >= 25000) eligibility += 10;

    eligibility = Math.min(100, eligibility);

    await query('UPDATE student_profiles SET eligibility_score = $1 WHERE id = $2', [eligibility, profileId]);

    // Recalculate predictions for all bookmarked/saved universities
    const savedUnivs = await query('SELECT university_id FROM student_saved_universities WHERE student_id = $1', [profileId]);
    for (const row of savedUnivs.rows) {
      await calculateAndSavePrediction(profileId, row.university_id);
    }

    await recalculateStudentXpAndLevel(profileId);
    revalidatePath('/student/dashboard');
    return { success: true, predictedCurrency };
  } catch (error) {
    console.error('Error updating student profile:', error);
    return { error: 'Failed to update profile' };
  }
}

// 9. Get Living Costs Defaults
export async function getLivingCostsDefaults() {
  try {
    const res = await query(`
      SELECT lc.*, c.name as country_name
      FROM living_costs lc
      JOIN countries c ON lc.country_id = c.id
    `);
    return res.rows;
  } catch (error) {
    console.error('Error getting living costs:', error);
    return [];
  }
}

// Get all countries from database
export async function getCountries() {
  try {
    const res = await query('SELECT id, name, code, currency, average_living_cost FROM countries ORDER BY name ASC');
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      currency: r.currency || 'USD',
      average_living_cost: Number(r.average_living_cost) || 1000
    }));
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
}

// Get all countries that have visa guidance records
export async function getVisaCountries(): Promise<string[]> {
  try {
    const res = await query(`
      SELECT DISTINCT c.name
      FROM visas v
      JOIN countries c ON v.country_id = c.id
      ORDER BY c.name ASC
    `);
    return res.rows.map(r => r.name);
  } catch (error) {
    console.error('Error fetching visa countries:', error);
    return [];
  }
}

// 10. Get Visa Guidance for country
export async function getVisaGuidance(countryName: string) {
  try {
    const res = await query(`
      SELECT v.*, c.name as country_name, c.currency as country_currency
      FROM visas v
      JOIN countries c ON v.country_id = c.id
      WHERE c.name = $1
    `, [countryName]);
    return res.rows[0] || null;
  } catch (error) {
    console.error('Error getting visa guidance:', error);
    return null;
  }
}

// 11. Get Flights Estimates
export async function getFlightsEstimates() {
  try {
    const res = await query(`
      SELECT f.*, c.name as country_name
      FROM flights f
      JOIN countries c ON f.destination_country_id = c.id
    `);
    return res.rows;
  } catch (error) {
    console.error('Error getting flights estimates:', error);
    return [];
  }
}

// 12. Get Accommodations
export async function getAccommodations(filters: {
  country?: string;
  type?: string;
}) {
  try {
    let sql = `
      SELECT a.*, c.name as country_name, c.currency as country_currency
      FROM accommodations a
      JOIN countries c ON a.country_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.country && filters.country !== 'all') {
      sql += ` AND c.name = $${paramIndex}`;
      params.push(filters.country);
      paramIndex++;
    }

    if (filters.type && filters.type !== 'all') {
      sql += ` AND a.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    const res = await query(sql, params);
    return res.rows;
  } catch (error) {
    console.error('Error fetching accommodations:', error);
    return [];
  }
}

// 13. Get Student Profile
export async function getStudentProfile(userId: number) {
  try {
    // Dynamically migrate table schema to add onboarding and gamification columns if they don't exist
    await query(`
      ALTER TABLE student_profiles 
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS onboarding_data JSONB,
      ADD COLUMN IF NOT EXISTS ai_readiness_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS scholarship_eligibility_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS admission_strength_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
      ADD COLUMN IF NOT EXISTS github_url TEXT,
      ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
      ADD COLUMN IF NOT EXISTS milestones_completed JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 120,
      ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS missions JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS passport_stamps JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS ep INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);

    const res = await query('SELECT * FROM student_profiles WHERE user_id = $1', [userId]);
    return res.rows[0] || null;
  } catch (error) {
    console.error('Error getting student profile:', error);
    return null;
  }
}

// 14. Get Student Roadmap
export async function getStudentRoadmap(studentId: number) {
  try {
    const res = await query('SELECT * FROM student_roadmaps WHERE student_id = $1', [studentId]);
    return res.rows[0]?.steps_json || null;
  } catch (error) {
    console.error('Error getting student roadmap:', error);
    return null;
  }
}

// 15. Get Admission Predictions
export async function getAdmissionPredictions(studentId: number) {
  try {
    const res = await query(`
      SELECT ap.*, u.name as university_name, u.ranking, c.name as country_name
      FROM admission_predictions ap
      JOIN universities u ON ap.university_id = u.id
      JOIN countries c ON u.country_id = c.id
      WHERE ap.student_id = $1
      ORDER BY ap.probability DESC
    `, [studentId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting admission predictions:', error);
    return [];
  }
}

// 16. Calculate and Save Admission Prediction
export async function calculateAndSavePrediction(studentId: number, universityId: number) {
  try {
    // 1. Get student profile
    const profileRes = await query('SELECT * FROM student_profiles WHERE id = $1', [studentId]);
    const student = profileRes.rows[0];

    // 2. Get university
    const univRes = await query('SELECT * FROM universities WHERE id = $1', [universityId]);
    const univ = univRes.rows[0];

    if (!student || !univ) return;

    // 3. Compute probability
    let prob = Number(univ.acceptance_rate) || 50;

    // CGPA weight
    const gpa = Number(student.cgpa) || 3.0;
    if (gpa >= 3.8) prob += 25;
    else if (gpa >= 3.5) prob += 15;
    else if (gpa >= 3.0) prob += 5;
    else prob -= 20;

    // Ranking difficulty modifier
    const rank = Number(univ.ranking) || 100;
    if (rank <= 15) prob -= 30;
    else if (rank <= 50) prob -= 15;
    else if (rank <= 100) prob -= 5;
    else prob += 10;

    // Budget check
    const budget = Number(student.budget) || 50000;
    const tuition = Number(univ.tuition_fee_min) || 0;
    if (tuition > budget) {
      prob -= 15;
    }

    // Ensure probability is bounded
    prob = Math.max(10, Math.min(95, Math.round(prob)));

    // 4. Determine status
    let status: 'safe' | 'moderate' | 'dream' = 'dream';
    if (prob >= 75) status = 'safe';
    else if (prob >= 45) status = 'moderate';

    // 5. Insert/Update prediction without unique constraint
    const existing = await query(
      'SELECT id FROM admission_predictions WHERE student_id = $1 AND university_id = $2',
      [studentId, universityId]
    );

    if (existing.rows.length > 0) {
      await query(
        'UPDATE admission_predictions SET probability = $1, status = $2 WHERE id = $3',
        [prob, status, existing.rows[0].id]
      );
    } else {
      await query(
        'INSERT INTO admission_predictions (student_id, university_id, probability, status) VALUES ($1, $2, $3, $4)',
        [studentId, universityId, prob, status]
      );
    }
  } catch (error) {
    console.error('Error generating admission prediction:', error);
  }
}

// 17. Save Student Onboarding data
export async function saveStudentOnboarding(profileId: number, onboardingData: any) {
  try {
    // 1. Calculate scores
    const cgpa = Number(onboardingData.cgpa) || 3.0;
    const skills = onboardingData.skills || [];
    const exams = onboardingData.exams || {};
    const budgetRange = onboardingData.budgetRange || '';
    const budgetValue = Number(onboardingData.budget) || 30000;

    // AI Readiness Score: based on CGPA and exam presence
    let readiness = 45;
    if (cgpa >= 3.8) readiness += 25;
    else if (cgpa >= 3.5) readiness += 15;
    else if (cgpa >= 3.0) readiness += 5;

    if (skills.length > 3) readiness += 15;
    if (exams.gre && exams.gre !== 'Not Attempted') readiness += 10;
    if (exams.ielts && exams.ielts !== 'Not Attempted') readiness += 5;
    readiness = Math.min(100, readiness);

    // Scholarship Score: higher CGPA, low budget means higher eligibility
    let scholarshipScore = 40;
    if (cgpa >= 3.7) scholarshipScore += 30;
    else if (cgpa >= 3.3) scholarshipScore += 15;
    if (onboardingData.needScholarship === 'Yes') scholarshipScore += 20;
    if (budgetRange === 'Below ₹10 Lakhs') scholarshipScore += 10;
    scholarshipScore = Math.min(100, scholarshipScore);

    // Admission Strength: skills, exam scores, work experience
    let strength = 50;
    if (cgpa >= 3.8) strength += 20;
    if (skills.length > 5) strength += 10;
    if (onboardingData.workExperience && onboardingData.workExperience > 0) strength += 15;
    strength = Math.min(100, strength);

    // 2. Map core columns
    const name = onboardingData.name || '';
    const degree = onboardingData.preferredDegree || 'MS';
    const department = onboardingData.department || 'Computer Science';
    const preferredCountries = onboardingData.countries || [];
    const careerGoals = onboardingData.careerGoal ? [onboardingData.careerGoal] : [];

    const nationality = onboardingData.nationality || 'Indian';
    const currentCountry = onboardingData.currentCountry || 'India';
    const predictedCurrency = getCurrencyFromNationality(nationality);

    // Save profile update
    await query(`
      UPDATE student_profiles
      SET name = $1, degree = $2, department = $3, cgpa = $4,
          skills = $5, budget = $6, preferred_countries = $7, career_goals = $8,
          onboarding_completed = TRUE, onboarding_data = $9,
          ai_readiness_score = $10, scholarship_eligibility_score = $11, admission_strength_score = $12,
          linkedin_url = $13, github_url = $14, portfolio_url = $15,
          nationality = $16, current_country = $17, preferred_currency = $18
      WHERE id = $19
    `, [
      name,
      degree,
      department,
      cgpa,
      skills,
      budgetValue,
      preferredCountries,
      careerGoals,
      JSON.stringify(onboardingData),
      readiness,
      scholarshipScore,
      strength,
      onboardingData.linkedinUrl || null,
      onboardingData.githubUrl || null,
      onboardingData.portfolioUrl || null,
      nationality,
      currentCountry,
      predictedCurrency,
      profileId
    ]);

    // Update eligibility score in main table
    let eligibility = Math.round((readiness + scholarshipScore + strength) / 3);
    await query('UPDATE student_profiles SET eligibility_score = $1 WHERE id = $2', [eligibility, profileId]);

    // Recalculate predictions for all saved universities
    const savedUnivs = await query('SELECT university_id FROM student_saved_universities WHERE student_id = $1', [profileId]);
    for (const row of savedUnivs.rows) {
      await calculateAndSavePrediction(profileId, row.university_id);
    }

    await recalculateStudentXpAndLevel(profileId);
    revalidatePath('/student/dashboard');
    return { success: true, readiness, scholarshipScore, strength, eligibility, predictedCurrency };
  } catch (error) {
    console.error('Error saving student onboarding:', error);
    return { error: 'Failed to save onboarding details.' };
  }
}

// 18. Get Entrance Exams required for student's bookmarked courses
export async function getStudentRequiredExams(studentId: number) {
  try {
    const res = await query(`
      SELECT DISTINCT ee.*, cer.min_score, c.name as course_name, u.name as university_name
      FROM student_saved_courses sc
      JOIN courses c ON sc.course_id = c.id
      JOIN universities u ON c.university_id = u.id
      JOIN course_exam_requirements cer ON c.id = cer.course_id
      JOIN entrance_exams ee ON cer.exam_id = ee.id
      WHERE sc.student_id = $1
    `, [studentId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting student required exams:', error);
    return [];
  }
}

// 19. Update completed milestones
export async function updateStudentMilestones(profileId: number, milestones: string[]) {
  try {
    await query('UPDATE student_profiles SET milestones_completed = $1 WHERE id = $2', [JSON.stringify(milestones), profileId]);
    await recalculateStudentXpAndLevel(profileId);
    revalidatePath('/student/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error updating student milestones:', error);
    return { error: 'Failed to update milestones.' };
  }
}

// 20. Get Enrolled Students Count from Database
export async function getEnrolledStudentsCount(): Promise<number> {
  try {
    const res = await query("SELECT COUNT(*) FROM users WHERE role = 'student'");
    return parseInt(res.rows[0].count, 10) || 0;
  } catch (error) {
    console.error('Error getting enrolled students count:', error);
    return 0;
  }
}

// 21. Fetch Nexa AI Mentor and Gamification Data
export async function getNexaData() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    // Get student profile
    let profile = await getStudentProfile(user.id);
    if (!profile) {
      return null;
    }

    // Initialize missions if empty or null
    let missions = profile.missions;
    if (!missions || (Array.isArray(missions) && missions.length === 0)) {
      missions = [
        { id: 'ielts_profile', title: 'Complete IELTS Profile', description: 'Update language score details', xpReward: 150, completed: false },
        { id: 'bookmark_univ', title: 'Bookmark a University', description: 'Save 1 target university to your dashboard', xpReward: 100, completed: false },
        { id: 'explore_loans', title: 'Explore Loan Options', description: 'Compare top study abroad loans in the portal', xpReward: 120, completed: false }
      ];
      await query('UPDATE student_profiles SET missions = $1 WHERE id = $2', [JSON.stringify(missions), profile.id]);
      profile.missions = missions;
    }

    // Initialize achievements if null
    let achievements = profile.achievements || [];

    // Calculate dynamic readiness scores
    const cgpa = Number(profile.cgpa) || 3.0;
    const budget = Number(profile.budget) || 30000;
    const preferredCountries = profile.preferred_countries || ['Germany'];
    const milestones = profile.milestones_completed || [];

    // 1. Academic Readiness
    let academic = 70;
    if (cgpa >= 3.8) academic = 95;
    else if (cgpa >= 3.5) academic = 85;
    else if (cgpa >= 3.0) academic = 75;

    // 2. Language Readiness
    const isLanguageCompleted = missions.find((m: any) => m.id === 'ielts_profile')?.completed || false;
    let language = isLanguageCompleted ? 90 : 45;

    // 3. Financial Readiness
    const isLoanExplored = missions.find((m: any) => m.id === 'explore_loans')?.completed || false;
    let financial = 50;
    if (budget >= 30000) financial += 25;
    if (isLoanExplored) financial += 15;

    // 4. Application Readiness
    const isBookmarked = missions.find((m: any) => m.id === 'bookmark_univ')?.completed || false;
    let application = 30;
    if (profile.onboarding_completed) application += 30;
    if (isBookmarked) application += 20;
    if (milestones.length > 0) application += 10;

    // Recommendations (Universities, Scholarships)
    const targetCountry = preferredCountries[0] || 'Germany';
    const univRes = await query(`
      SELECT u.name, u.ranking, c.name as country_name 
      FROM universities u
      JOIN countries c ON u.country_id = c.id
      WHERE c.name = $1 OR c.name = 'Germany'
      ORDER BY u.ranking ASC LIMIT 3
    `, [targetCountry]);

    const schRes = await query(`
      SELECT name, provider, amount 
      FROM scholarships 
      ORDER BY id ASC LIMIT 2
    `);

    // Dynamic next actions
    const nextActions = [];
    if (!isLanguageCompleted) {
      nextActions.push("Complete IELTS section to unlock scholarship recommendations.");
    }
    if (!isBookmarked) {
      nextActions.push("Bookmark a university to track application requirements.");
    }
    if (!isLoanExplored) {
      nextActions.push("Compare banking partners in the Education Loan Portal.");
    }
    if (nextActions.length === 0) {
      nextActions.push("Explore visa documents checklists for your target country.");
    }

    const passportStamps = Array.isArray(profile.passport_stamps) 
      ? profile.passport_stamps 
      : JSON.parse(profile.passport_stamps || '[]');

    return {
      profile: {
        id: profile.id,
        name: profile.name || 'Ashwin',
        degree: profile.degree || 'MS',
        department: profile.department || 'Computer Science',
        preferred_countries: preferredCountries,
        xp: profile.xp ?? 120,
        level: profile.level ?? 1,
        achievements: achievements,
        missions: missions,
        eligibility_score: profile.eligibility_score || 50,
        nationality: profile.nationality || 'Indian',
        current_country: profile.current_country || 'India',
        preferred_currency: profile.preferred_currency || 'INR',
        passport_stamps: passportStamps,
        ep: profile.ep ?? 0,
        onboarding_completed: !!profile.onboarding_completed
      },
      readiness: {
        academic,
        language,
        financial,
        application,
        total: Math.round((academic + language + financial + application) / 4)
      },
      recommendations: {
        universities: univRes.rows.map(r => ({ name: r.name, ranking: r.ranking, country: r.country_name })),
        scholarships: schRes.rows.map(r => ({ name: r.name, provider: r.provider, amount: r.amount })),
        nextActions
      }
    };
  } catch (error) {
    console.error('Error fetching Nexa dashboard data:', error);
    return null;
  }
}

// 22. Complete Nexa AI Mentor Mission
export async function completeNexaMission(profileId: number, missionId: string) {
  try {
    const res = await query('SELECT * FROM student_profiles WHERE id = $1', [profileId]);
    if (res.rows.length === 0) {
      return { error: 'Student profile not found.' };
    }

    const profile = res.rows[0];
    let xp = profile.xp ?? 120;
    let level = profile.level ?? 1;
    let achievements = profile.achievements || [];
    let missions = profile.missions || [];

    // Find the mission
    const missionIndex = missions.findIndex((m: any) => m.id === missionId);
    if (missionIndex === -1) {
      return { error: 'Mission not found.' };
    }

    if (missions[missionIndex].completed) {
      return { error: 'Mission already completed.' };
    }

    // Complete the mission
    missions[missionIndex].completed = true;
    const reward = missions[missionIndex].xpReward || 100;
    xp += reward;

    // Add specific mission achievements
    let newAchievement = null;
    if (missionId === 'ielts_profile') {
      newAchievement = {
        id: 'lang_ace',
        title: 'Language Pioneer',
        description: 'Unlocked IELTS checklist parameters',
        icon: 'Languages',
        unlockedAt: new Date().toISOString()
      };
      achievements.push(newAchievement);
    } else if (missionId === 'bookmark_univ') {
      newAchievement = {
        id: 'scout',
        title: 'Global Pathfinder',
        description: 'Saved your first study abroad university choice',
        icon: 'Compass',
        unlockedAt: new Date().toISOString()
      };
      achievements.push(newAchievement);
    } else if (missionId === 'explore_loans') {
      newAchievement = {
        id: 'financier',
        title: 'Financially Prepared',
        description: 'Explored loans & budget options',
        icon: 'Wallet',
        unlockedAt: new Date().toISOString()
      };
      achievements.push(newAchievement);
    }

    let ep = Number(profile.ep) || 0;
    ep += 20; // Award 20 EP for mission completion

    // Save initial updates to DB first
    await query(
      'UPDATE student_profiles SET achievements = $1, missions = $2, ep = $3 WHERE id = $4',
      [JSON.stringify(achievements), JSON.stringify(missions), ep, profileId]
    );

    // Call dynamic recalculation which computes total XP, level, and handles level-up achievements
    const recalc = await recalculateStudentXpAndLevel(profileId);

    const finalXp = recalc?.xp ?? profile.xp;
    const finalLvl = recalc?.level ?? profile.level;
    const finalAchievements = recalc?.achievements ?? achievements;
    const leveledUp = finalLvl > (profile.level ?? 1);

    revalidatePath('/student/dashboard');
    return {
      success: true,
      xp: finalXp,
      level: finalLvl,
      achievements: finalAchievements,
      missions,
      ep,
      leveledUp,
      unlockedAchievement: newAchievement
    };
  } catch (error) {
    console.error('Error completing Nexa mission:', error);
    return { error: 'Failed to complete mission.' };
  }
}

// 23. Earn virtual passport stamp
export async function earnPassportStamp(profileId: number, countryName: string) {
  try {
    const res = await query('SELECT * FROM student_profiles WHERE id = $1', [profileId]);
    if (res.rows.length === 0) {
      return { error: 'Student profile not found.' };
    }

    const profile = res.rows[0];
    let stamps = profile.passport_stamps;
    if (!stamps) {
      stamps = [];
    } else if (typeof stamps === 'string') {
      stamps = JSON.parse(stamps);
    } else if (!Array.isArray(stamps)) {
      stamps = [];
    }

    // Check if already stamped
    if (stamps.includes(countryName)) {
      return { success: true, alreadyEarned: true };
    }

    // Add stamp
    stamps.push(countryName);

    // Award Stamp achievement
    const newAchievement = {
      id: `stamp_${countryName.toLowerCase()}`,
      title: `${countryName} Explorer`,
      description: `Earned the official ${countryName} virtual passport stamp`,
      icon: 'Compass',
      unlockedAt: new Date().toISOString()
    };
    achievements.push(newAchievement);

    let ep = Number(profile.ep) || 0;
    ep += 50; // Award 50 EP for passport stamp

    // Save passport stamps, ep and achievements to DB first
    await query(
      'UPDATE student_profiles SET passport_stamps = $1, achievements = $2, ep = $3 WHERE id = $4',
      [JSON.stringify(stamps), JSON.stringify(achievements), ep, profileId]
    );

    // Call dynamic recalculation which computes total XP, level, and handles level-up achievements
    const recalc = await recalculateStudentXpAndLevel(profileId);

    const finalXp = recalc?.xp ?? profile.xp;
    const finalLvl = recalc?.level ?? profile.level;
    const finalAchievements = recalc?.achievements ?? achievements;
    const leveledUp = finalLvl > (profile.level ?? 1);

    revalidatePath('/student/dashboard');
    return {
      success: true,
      newStamp: countryName,
      xp: finalXp,
      level: finalLvl,
      achievements: finalAchievements,
      ep,
      leveledUp,
      unlockedAchievement: newAchievement
    };
  } catch (error) {
    console.error('Error earning passport stamp:', error);
    return { error: 'Failed to earn passport stamp.' };
  }
}

// 24. Get currency rates map relative to USD
export async function getCurrencyRates() {
  try {
    const res = await query('SELECT * FROM currency_rates');
    const rates: { [code: string]: number } = {};
    res.rows.forEach(r => {
      rates[r.code] = Number(r.rate_to_usd);
    });
    return rates;
  } catch (error) {
    console.error('Error getting currency rates:', error);
    return {};
  }
}

// 25. Update preferred display currency
export async function updatePreferredCurrency(profileId: number, currencyCode: string) {
  try {
    await query('UPDATE student_profiles SET preferred_currency = $1 WHERE id = $2', [currencyCode, profileId]);
    revalidatePath('/student/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error updating preferred currency:', error);
    return { error: 'Failed to update preferred currency.' };
  }
}

// 26. Get student leaderboard
export async function getLeaderboard() {
  try {
    const res = await query(`
      SELECT name, level, xp, ep, preferred_countries, preferred_currency 
      FROM student_profiles 
      ORDER BY ep DESC, level DESC, xp DESC 
      LIMIT 10
    `);
    return res.rows.map(r => ({
      name: r.name,
      level: Number(r.level) || 1,
      xp: Number(r.xp) || 0,
      ep: Number(r.ep) || 0,
      preferred_countries: r.preferred_countries || [],
      preferred_currency: r.preferred_currency || 'USD'
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

// 27. Award Encouragement Points (EP)
export async function awardEncouragementPoints(profileId: number, points: number) {
  try {
    const res = await query('SELECT ep FROM student_profiles WHERE id = $1', [profileId]);
    if (res.rows.length === 0) return { error: 'Profile not found' };
    const currentEp = Number(res.rows[0].ep) || 0;
    const newEp = currentEp + points;
    await query('UPDATE student_profiles SET ep = $1 WHERE id = $2', [newEp, profileId]);
    revalidatePath('/student/dashboard');
    return { success: true, ep: newEp };
  } catch (error) {
    console.error('Error awarding EP:', error);
    return { error: 'Failed to award EP.' };
  }
}

// Helper function to map Nationality to default Currency code
function getCurrencyFromNationality(nationality: string): string {
  const nation = nationality.toLowerCase().trim();
  if (nation.includes('india') || nation.includes('ind')) return 'INR';
  if (nation.includes('united states') || nation.includes('us') || nation.includes('american')) return 'USD';
  if (nation.includes('united kingdom') || nation.includes('uk') || nation.includes('british') || nation.includes('gb')) return 'GBP';
  if (nation.includes('canada') || nation.includes('canadian')) return 'CAD';
  if (nation.includes('australia') || nation.includes('australian')) return 'AUD';
  if (nation.includes('germany') || nation.includes('german') || nation.includes('france') || nation.includes('french') || nation.includes('spain') || nation.includes('spanish') || nation.includes('italy') || nation.includes('italian') || nation.includes('netherlands') || nation.includes('dutch') || nation.includes('ireland') || nation.includes('irish')) return 'EUR';
  if (nation.includes('new zealand') || nation.includes('kiwi')) return 'NZD';
  if (nation.includes('singapore') || nation.includes('singaporean')) return 'SGD';
  if (nation.includes('china') || nation.includes('chinese')) return 'CNY';
  if (nation.includes('japan') || nation.includes('japanese')) return 'JPY';
  if (nation.includes('korea') || nation.includes('korean')) return 'KRW';
  if (nation.includes('malaysia') || nation.includes('malaysian')) return 'MYR';
  if (nation.includes('russia') || nation.includes('russian')) return 'RUB';
  if (nation.includes('switzerland') || nation.includes('swiss')) return 'CHF';
  if (nation.includes('sweden') || nation.includes('swedish')) return 'SEK';
  if (nation.includes('norway') || nation.includes('norwegian')) return 'NOK';
  if (nation.includes('denmark') || nation.includes('danish')) return 'DKK';
  if (nation.includes('uae') || nation.includes('emirati')) return 'AED';
  if (nation.includes('saudi') || nation.includes('arabia')) return 'SAR';
  return 'USD';
}

// 28. Recalculate Student XP and Level Dynamically
export async function recalculateStudentXpAndLevel(profileId: number) {
  try {
    // 1. Fetch current profile
    const profileRes = await query('SELECT * FROM student_profiles WHERE id = $1', [profileId]);
    if (profileRes.rows.length === 0) return null;
    const profile = profileRes.rows[0];

    // 2. Fetch counts of saved items
    const univRes = await query('SELECT COUNT(*) FROM student_saved_universities WHERE student_id = $1', [profileId]);
    const courseRes = await query('SELECT COUNT(*) FROM student_saved_courses WHERE student_id = $1', [profileId]);
    const scholarshipRes = await query('SELECT COUNT(*) FROM student_saved_scholarships WHERE student_id = $1', [profileId]);

    const univCount = parseInt(univRes.rows[0].count, 10) || 0;
    const courseCount = parseInt(courseRes.rows[0].count, 10) || 0;
    const scholarshipCount = parseInt(scholarshipRes.rows[0].count, 10) || 0;

    // 3. Extract JSON structures
    let milestones = [];
    if (profile.milestones_completed) {
      milestones = typeof profile.milestones_completed === 'string'
        ? JSON.parse(profile.milestones_completed)
        : profile.milestones_completed;
    }
    if (!Array.isArray(milestones)) milestones = [];

    let stamps = [];
    if (profile.passport_stamps) {
      stamps = typeof profile.passport_stamps === 'string'
        ? JSON.parse(profile.passport_stamps)
        : profile.passport_stamps;
    }
    if (!Array.isArray(stamps)) stamps = [];

    let missions = [];
    if (profile.missions) {
      missions = typeof profile.missions === 'string'
        ? JSON.parse(profile.missions)
        : profile.missions;
    }
    if (!Array.isArray(missions)) missions = [];

    const completedMissionsCount = missions.filter((m: any) => m.completed === true).length;

    // 4. Compute XP using dynamic formula
    let totalXp = 100; // Base XP
    if (profile.onboarding_completed) totalXp += 200;
    if (profile.avatar_url && profile.avatar_url.trim() !== '') totalXp += 50;
    totalXp += (univCount * 50);
    totalXp += (courseCount * 30);
    totalXp += (scholarshipCount * 30);
    totalXp += (milestones.length * 40);
    totalXp += (stamps.length * 50);
    totalXp += (completedMissionsCount * 100);

    // 5. Calculate Level
    let newLevel = Math.floor(totalXp / 250) + 1;

    // 6. Check achievements & Level changes
    let achievements = [];
    if (profile.achievements) {
      achievements = typeof profile.achievements === 'string'
        ? JSON.parse(profile.achievements)
        : profile.achievements;
    }
    if (!Array.isArray(achievements)) achievements = [];

    let currentLevel = Number(profile.level) || 1;
    let achievementsChanged = false;

    if (newLevel > currentLevel) {
      for (let lvl = currentLevel + 1; lvl <= newLevel; lvl++) {
        const achievementId = `level_${lvl}`;
        if (!achievements.some((a: any) => a.id === achievementId)) {
          achievements.push({
            id: achievementId,
            title: `Rising Scholar Lvl ${lvl}`,
            description: `Reached Level ${lvl} in Nexora`,
            icon: 'Award',
            unlockedAt: new Date().toISOString()
          });
          achievementsChanged = true;
        }
      }
    }

    // 7. Update database
    await query(
      'UPDATE student_profiles SET xp = $1, level = $2, achievements = $3 WHERE id = $4',
      [totalXp, newLevel, JSON.stringify(achievements), profileId]
    );

    revalidatePath('/student/dashboard');
    return { xp: totalXp, level: newLevel, achievements };
  } catch (error) {
    console.error('Error recalculating student XP/Level:', error);
    return null;
  }
}




