'use server';

import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

// Middleware-like verification
async function verifyBusinessOrAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'business' && user.role !== 'platform_admin')) {
    throw new Error('Unauthorized');
  }
  return user;
}

// 1. Get Business Dashboard detailed collections
export async function getBusinessDashboardData() {
  try {
    await verifyBusinessOrAdmin();

    const accommodations = await query(`
      SELECT a.*, c.name as country_name 
      FROM accommodations a
      JOIN countries c ON a.country_id = c.id
      ORDER BY a.id DESC
    `);

    const visas = await query(`
      SELECT v.*, c.name as country_name 
      FROM visas v
      JOIN countries c ON v.country_id = c.id
      ORDER BY v.id DESC
    `);

    const flights = await query(`
      SELECT f.*, c.name as country_name 
      FROM flights f
      JOIN countries c ON f.destination_country_id = c.id
      ORDER BY f.id DESC
    `);

    const countries = await query('SELECT id, name FROM countries ORDER BY name ASC');

    return {
      accommodations: accommodations.rows,
      visas: visas.rows,
      flights: flights.rows,
      countries: countries.rows
    };
  } catch (error) {
    console.error('Error fetching business dashboard data:', error);
    return null;
  }
}

// 2. Save Accommodation (Insert or Update)
export async function saveAccommodation(data: {
  id?: number;
  countryId: number;
  cityName: string;
  type: string;
  rent: number;
  distanceToUniv: string;
  availability: boolean;
  facilities: string[];
  title: string;
  description: string;
}) {
  try {
    await verifyBusinessOrAdmin();

    if (data.id) {
      // Update
      await query(`
        UPDATE accommodations 
        SET country_id = $1, city_name = $2, type = $3, rent = $4, 
            distance_to_univ = $5, availability = $6, facilities = $7, 
            title = $8, description = $9
        WHERE id = $10
      `, [
        data.countryId, data.cityName, data.type, data.rent,
        data.distanceToUniv, data.availability, data.facilities,
        data.title, data.description, data.id
      ]);
    } else {
      // Insert
      await query(`
        INSERT INTO accommodations (country_id, city_name, type, rent, distance_to_univ, availability, facilities, title, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        data.countryId, data.cityName, data.type, data.rent,
        data.distanceToUniv, data.availability, data.facilities,
        data.title, data.description
      ]);
    }

    revalidatePath('/student/accommodations');
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving accommodation:', error);
    return { error: error.message || 'Failed to save accommodation.' };
  }
}

// 3. Delete Accommodation
export async function deleteAccommodation(id: number) {
  try {
    await verifyBusinessOrAdmin();
    await query('DELETE FROM accommodations WHERE id = $1', [id]);
    
    revalidatePath('/student/accommodations');
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting accommodation:', error);
    return { error: error.message || 'Failed to delete accommodation.' };
  }
}

// 4. Save Visa details (Insert or Update)
export async function saveVisa(data: {
  id?: number;
  countryId: number;
  requirements: string;
  documentsRequired: string[];
  timeline: string;
  fee: number;
  steps: string[];
}) {
  try {
    await verifyBusinessOrAdmin();
    const checklistJson = JSON.stringify({ steps: data.steps });

    if (data.id) {
      // Update
      await query(`
        UPDATE visas
        SET country_id = $1, requirements = $2, documents_required = $3, 
            timeline = $4, fee = $5, checklist_json = $6
        WHERE id = $7
      `, [
        data.countryId, data.requirements, data.documentsRequired,
        data.timeline, data.fee, checklistJson, data.id
      ]);
    } else {
      // Check if visa guidelines already exist for this country (since country_id is UNIQUE)
      const existing = await query('SELECT id FROM visas WHERE country_id = $1', [data.countryId]);
      if (existing.rows.length > 0) {
        return { error: 'Visa protocols are already defined for this country. Please update the existing record instead.' };
      }

      // Insert
      await query(`
        INSERT INTO visas (country_id, requirements, documents_required, timeline, fee, checklist_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        data.countryId, data.requirements, data.documentsRequired,
        data.timeline, data.fee, checklistJson
      ]);
    }

    revalidatePath('/student/visa');
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving visa:', error);
    return { error: error.message || 'Failed to save visa.' };
  }
}

// 5. Delete Visa details
export async function deleteVisa(id: number) {
  try {
    await verifyBusinessOrAdmin();
    await query('DELETE FROM visas WHERE id = $1', [id]);
    
    revalidatePath('/student/visa');
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting visa:', error);
    return { error: error.message || 'Failed to delete visa.' };
  }
}

// 6. Save Flight/Travel details (Insert or Update)
export async function saveFlight(data: {
  id?: number;
  origin: string;
  destinationCountryId: number;
  estCost: number;
  tips: string[];
}) {
  try {
    await verifyBusinessOrAdmin();
    const checklistJson = JSON.stringify({ tips: data.tips });

    if (data.id) {
      // Update
      await query(`
        UPDATE flights
        SET origin = $1, destination_country_id = $2, est_cost = $3, checklist_json = $4
        WHERE id = $5
      `, [
        data.origin, data.destinationCountryId, data.estCost, checklistJson, data.id
      ]);
    } else {
      // Insert
      await query(`
        INSERT INTO flights (origin, destination_country_id, est_cost, checklist_json)
        VALUES ($1, $2, $3, $4)
      `, [
        data.origin, data.destinationCountryId, data.estCost, checklistJson
      ]);
    }

    revalidatePath('/student/travel');
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving flight travel details:', error);
    return { error: error.message || 'Failed to save flight details.' };
  }
}

// 7. Delete Flight details
export async function deleteFlight(id: number) {
  try {
    await verifyBusinessOrAdmin();
    await query('DELETE FROM flights WHERE id = $1', [id]);
    
    revalidatePath('/student/travel');
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting flight:', error);
    return { error: error.message || 'Failed to delete flight.' };
  }
}
