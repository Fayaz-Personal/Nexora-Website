'use server';

import { query } from '@/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';

// Middleware verification
async function verifyBusiness() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'business') {
    throw new Error('Unauthorized: Business role required');
  }
  return user;
}

// 1. Submit Registration verification request
export async function submitBusinessRegistration(data: {
  entityName: string;
  category: 'travel_agency' | 'accommodation' | 'loan_provider' | 'visa_consultancy';
  licenseNumber: string;
  businessLicense: string;
  contactNumber: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    await query(`
      INSERT INTO partner_registrations (user_id, partner_type, status, entity_name, category, uploaded_documents)
      VALUES ($1, 'business', 'pending', $2, $3, $4)
    `, [user.id, data.entityName, data.category, JSON.stringify({
      license_number: data.licenseNumber,
      license_docs_path: data.businessLicense,
      contact_number: data.contactNumber
    })]);

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting business registration:', error);
    return { error: error.message || 'Failed to submit registration' };
  }
}

export async function getMyPartnerRegistration() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const res = await query('SELECT * FROM partner_registrations WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [user.id]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (error) {
    console.error('Error getting partner registration:', error);
    return null;
  }
}

// 2. Fetch current business profile for user
export async function getBusinessProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const res = await query('SELECT * FROM business_profiles WHERE user_id = $1', [user.id]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (error) {
    console.error('Error getting business profile:', error);
    return null;
  }
}

// 3. Save/update business profile
export async function saveBusinessProfile(data: {
  companyName: string;
  logoUrl?: string;
  website?: string;
  contactInfo?: { phone?: string; email?: string; address?: string };
}) {
  try {
    const user = await verifyBusiness();
    const existing = await getBusinessProfile();

    if (existing) {
      await query(`
        UPDATE business_profiles
        SET company_name = $1, logo_url = $2, website = $3, contact_info = $4
        WHERE user_id = $5
      `, [data.companyName, data.logoUrl, data.website, JSON.stringify(data.contactInfo), user.id]);
    } else {
      // Get category from registration or set default
      const regRes = await query('SELECT category FROM partner_registrations WHERE user_id = $1 AND status = \'verified\' LIMIT 1', [user.id]);
      const category = regRes.rows.length > 0 ? regRes.rows[0].category : 'accommodation';

      await query(`
        INSERT INTO business_profiles (user_id, category, company_name, logo_url, website, contact_info, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'verified')
      `, [user.id, category, data.companyName, data.logoUrl, data.website, JSON.stringify(data.contactInfo)]);
    }

    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving business profile:', error);
    return { error: error.message || 'Failed to save business profile' };
  }
}

// ==========================================
// TRAVEL AGENCY ACTIONS
// ==========================================
export async function getTravelPackages(businessId: number) {
  try {
    const res = await query(`
      SELECT tp.*, c.name as destination_country, c2.name as departure_country
      FROM business_travel_packages tp
      JOIN countries c ON tp.destination_country_id = c.id
      LEFT JOIN countries c2 ON tp.departure_country_id = c2.id
      WHERE tp.business_id = $1
      ORDER BY tp.created_at DESC
    `, [businessId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting travel packages:', error);
    return [];
  }
}

export async function saveTravelPackage(data: {
  id?: number;
  businessId: number;
  destinationCountryId: number;
  departureCountryId?: number;
  flightInfo: string;
  ticketCost: number;
  hasInsurance: boolean;
  hasAirportPickup: boolean;
  visaAssistance?: boolean;
  description?: string;
  images?: string[];
  availableSeats?: number;
  isActive?: boolean;
  contactInfo: string;
  flightDetails?: any;
}) {
  try {
    await verifyBusiness();
    if (data.id) {
      await query(`
        UPDATE business_travel_packages
        SET destination_country_id = $1, flight_info = $2, ticket_cost = $3,
            has_insurance = $4, has_airport_pickup = $5, contact_info = $6,
            departure_country_id = $7, visa_assistance = $8, description = $9,
            images = $10, available_seats = $11, is_active = $12, flight_details = $13
        WHERE id = $14 AND business_id = $15
      `, [
        data.destinationCountryId, data.flightInfo, data.ticketCost,
        data.hasInsurance, data.hasAirportPickup, data.contactInfo,
        data.departureCountryId || null, data.visaAssistance || false, data.description || '',
        data.images || [], data.availableSeats || 0, data.isActive !== false,
        JSON.stringify(data.flightDetails || {}),
        data.id, data.businessId
      ]);
    } else {
      await query(`
        INSERT INTO business_travel_packages (
          business_id, destination_country_id, flight_info, ticket_cost, 
          has_insurance, has_airport_pickup, contact_info, departure_country_id, 
          visa_assistance, description, images, available_seats, is_active, flight_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        data.businessId, data.destinationCountryId, data.flightInfo, data.ticketCost,
        data.hasInsurance, data.hasAirportPickup, data.contactInfo,
        data.departureCountryId || null, data.visaAssistance || false, data.description || '',
        data.images || [], data.availableSeats || 0, data.isActive !== false,
        JSON.stringify(data.flightDetails || {})
      ]);
    }
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving travel package:', error);
    return { error: error.message || 'Failed to save travel package' };
  }
}

export async function deleteTravelPackage(id: number, businessId: number) {
  try {
    await verifyBusiness();
    await query('DELETE FROM business_travel_packages WHERE id = $1 AND business_id = $2', [id, businessId]);
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting travel package:', error);
    return { error: error.message || 'Failed to delete travel package' };
  }
}

// ==========================================
// EDUCATION LOAN PROVIDER ACTIONS
// ==========================================
export async function getLoanSchemes(businessId: number) {
  try {
    const res = await query('SELECT * FROM business_loan_schemes WHERE business_id = $1 ORDER BY created_at DESC', [businessId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting loan schemes:', error);
    return [];
  }
}

export async function saveLoanScheme(data: {
  id?: number;
  businessId: number;
  schemeName: string;
  interestRate: string;
  maxLoanAmount: number;
  eligibilityCriteria: string;
  processingFee: number;
  repaymentDetails: string;
  collateralRequired: string;
}) {
  try {
    await verifyBusiness();
    if (data.id) {
      await query(`
        UPDATE business_loan_schemes
        SET scheme_name = $1, interest_rate = $2, max_loan_amount = $3,
            eligibility_criteria = $4, processing_fee = $5, repayment_details = $6,
            collateral_required = $7
        WHERE id = $8 AND business_id = $9
      `, [
        data.schemeName, data.interestRate, data.maxLoanAmount,
        data.eligibilityCriteria, data.processingFee, data.repaymentDetails,
        data.collateralRequired, data.id, data.businessId
      ]);
    } else {
      await query(`
        INSERT INTO business_loan_schemes (business_id, scheme_name, interest_rate, max_loan_amount, eligibility_criteria, processing_fee, repayment_details, collateral_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        data.businessId, data.schemeName, data.interestRate, data.maxLoanAmount,
        data.eligibilityCriteria, data.processingFee, data.repaymentDetails, data.collateralRequired
      ]);
    }
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving loan scheme:', error);
    return { error: error.message || 'Failed to save loan scheme' };
  }
}

export async function deleteLoanScheme(id: number, businessId: number) {
  try {
    await verifyBusiness();
    await query('DELETE FROM business_loan_schemes WHERE id = $1 AND business_id = $2', [id, businessId]);
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting loan scheme:', error);
    return { error: error.message || 'Failed to delete loan scheme' };
  }
}

// ==========================================
// VISA CONSULTANCY ACTIONS
// ==========================================
export async function getVisaServices(businessId: number) {
  try {
    const res = await query(`
      SELECT vs.*, c.name as country_name
      FROM business_visa_services vs
      JOIN countries c ON vs.country_id = c.id
      WHERE vs.business_id = $1
      ORDER BY vs.created_at DESC
    `, [businessId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting visa services:', error);
    return [];
  }
}

export async function saveVisaService(data: {
  id?: number;
  businessId: number;
  countryId: number;
  servicesOffered: string[];
  consultationCharges: number;
  processingFee: number;
  contactInfo: string;
}) {
  try {
    await verifyBusiness();
    if (data.id) {
      await query(`
        UPDATE business_visa_services
        SET country_id = $1, services_offered = $2, consultation_charges = $3,
            processing_fee = $4, contact_info = $5
        WHERE id = $6 AND business_id = $7
      `, [
        data.countryId, data.servicesOffered, data.consultationCharges,
        data.processingFee, data.contactInfo, data.id, data.businessId
      ]);
    } else {
      await query(`
        INSERT INTO business_visa_services (business_id, country_id, services_offered, consultation_charges, processing_fee, contact_info)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        data.businessId, data.countryId, data.servicesOffered, data.consultationCharges,
        data.processingFee, data.contactInfo
      ]);
    }
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving visa service:', error);
    return { error: error.message || 'Failed to save visa service' };
  }
}

export async function deleteVisaService(id: number, businessId: number) {
  try {
    await verifyBusiness();
    await query('DELETE FROM business_visa_services WHERE id = $1 AND business_id = $2', [id, businessId]);
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting visa service:', error);
    return { error: error.message || 'Failed to delete visa service' };
  }
}

// ==========================================
// ACCOMMODATION ENHANCEMENTS
// ==========================================
export async function getBusinessProperties(businessId: number) {
  try {
    const res = await query(`
      SELECT a.*, c.name as country_name
      FROM accommodations a
      JOIN countries c ON a.country_id = c.id
      WHERE a.business_id = $1
      ORDER BY a.id DESC
    `, [businessId]);
    return res.rows;
  } catch (error) {
    console.error('Error fetching business properties:', error);
    return [];
  }
}

export async function saveAccommodationExtended(data: {
  id?: number;
  businessId: number;
  countryId: number;
  cityName: string;
  type: string;
  rent: number;
  distanceToUniv: string;
  availability: boolean;
  facilities: string[];
  title: string;
  description: string;
  address?: string;
  deposit?: number;
  availableRooms?: number;
  wifi?: boolean;
  foodAvailability?: boolean;
  laundry?: boolean;
  furnishedStatus?: string;
  contactInfo?: string;
  latitude?: number;
  longitude?: number;
  roomCapacity?: number;
}) {
  try {
    await verifyBusiness();

    if (data.id) {
      await query(`
        UPDATE accommodations
        SET country_id = $1, city_name = $2, type = $3, rent = $4,
            distance_to_univ = $5, availability = $6, facilities = $7,
            title = $8, description = $9, address = $10, deposit = $11,
            available_rooms = $12, wifi = $13, food_availability = $14,
            laundry = $15, furnished_status = $16, contact_information = $17,
            latitude = $18, longitude = $19, room_capacity = $20
        WHERE id = $21 AND business_id = $22
      `, [
        data.countryId, data.cityName, data.type, data.rent,
        data.distanceToUniv, data.availability, data.facilities,
        data.title, data.description, data.address || '', data.deposit || 0,
        data.availableRooms || 1, data.wifi !== false, data.foodAvailability === true,
        data.laundry !== false, data.furnishedStatus || 'furnished', data.contactInfo || '',
        data.latitude || null, data.longitude || null, data.roomCapacity || 1,
        data.id, data.businessId
      ]);
    } else {
      await query(`
        INSERT INTO accommodations (
          business_id, country_id, city_name, type, rent, distance_to_univ,
          availability, facilities, title, description, address, deposit,
          available_rooms, wifi, food_availability, laundry, furnished_status, contact_information,
          latitude, longitude, room_capacity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `, [
        data.businessId, data.countryId, data.cityName, data.type, data.rent, data.distanceToUniv,
        data.availability, data.facilities, data.title, data.description, data.address || '', data.deposit || 0,
        data.availableRooms || 1, data.wifi !== false, data.foodAvailability === true,
        data.laundry !== false, data.furnishedStatus || 'furnished', data.contactInfo || '',
        data.latitude || null, data.longitude || null, data.roomCapacity || 1
      ]);
    }

    revalidatePath('/student/accommodations');
    revalidatePath('/business/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving extended accommodation:', error);
    return { error: error.message || 'Failed to save accommodation' };
  }
}

// ==========================================
// INQUIRY MANAGEMENT & LEADS
// ==========================================
export async function getBusinessInquiries(businessProfileId: number) {
  try {
    await verifyBusiness();
    const res = await query(`
      SELECT si.*, sp.name as student_name, sp.cgpa as student_cgpa, u.email as student_email
      FROM student_inquiries si
      JOIN student_profiles sp ON si.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE si.business_profile_id = $1
      ORDER BY si.status DESC, si.created_at DESC
    `, [businessProfileId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting student inquiries:', error);
    return [];
  }
}

export async function respondToInquiry(inquiryId: number, responseText: string) {
  try {
    await verifyBusiness();
    await query(`
      UPDATE student_inquiries
      SET response = $1, status = 'resolved'
      WHERE id = $2
    `, [responseText, inquiryId]);

    revalidatePath('/business/dashboard');
    revalidatePath('/student/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error responding to inquiry:', error);
    return { error: error.message || 'Failed to save response' };
  }
}

// 8. Fetch current business countries catalog for dropdown forms
export async function getCountriesCatalog() {
  try {
    const res = await query('SELECT id, name FROM countries ORDER BY name ASC');
    return res.rows;
  } catch (error) {
    console.error('Error fetching countries list:', error);
    return [];
  }
}

// 9. Get Business Room Bookings (Stay booking requests)
export async function getBusinessRoomBookings(businessProfileId: number) {
  try {
    await verifyBusiness();
    const res = await query(`
      SELECT rb.*, sp.name as student_name, u.email as student_email, a.title as property_title
      FROM room_bookings rb
      JOIN student_profiles sp ON rb.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN accommodations a ON rb.accommodation_id = a.id
      WHERE a.business_id = $1
      ORDER BY rb.created_at DESC
    `, [businessProfileId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting business room bookings:', error);
    return [];
  }
}

// 10. Get Business Flight Bookings
export async function getBusinessFlightBookings(businessProfileId: number) {
  try {
    await verifyBusiness();
    const res = await query(`
      SELECT fb.*, sp.name as student_name, u.email as student_email, tp.flight_info
      FROM flight_bookings fb
      JOIN student_profiles sp ON fb.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN business_travel_packages tp ON fb.package_id = tp.id
      WHERE tp.business_id = $1
      ORDER BY fb.created_at DESC
    `, [businessProfileId]);
    return res.rows;
  } catch (error) {
    console.error('Error getting business flight bookings:', error);
    return [];
  }
}

// 11. Update Room Booking Status
export async function updateRoomBookingStatus(bookingId: number, status: 'approved' | 'rejected') {
  try {
    await verifyBusiness();
    
    await query('BEGIN');
    
    // Fetch booking details
    const bRes = await query('SELECT accommodation_id, status, room_type FROM room_bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    if (bRes.rows.length === 0) {
      await query('ROLLBACK');
      return { error: 'Booking not found.' };
    }
    const booking = bRes.rows[0];

    await query(`
      UPDATE room_bookings
      SET status = $1
      WHERE id = $2
    `, [status, bookingId]);

    // If rejected, increment available rooms back
    if (status === 'rejected' && booking.status !== 'rejected') {
      const accId = booking.accommodation_id;
      const bookedRoomType = booking.room_type || 'Single';
      const accRes = await query('SELECT available_rooms, room_info_json FROM accommodations WHERE id = $1 FOR UPDATE', [accId]);
      if (accRes.rows.length > 0) {
        const house = accRes.rows[0];
        let rooms = [];
        try {
          rooms = typeof house.room_info_json === 'string'
            ? JSON.parse(house.room_info_json)
            : (house.room_info_json || []);
        } catch (e) {
          rooms = [];
        }

        if (!Array.isArray(rooms)) {
          rooms = [{
            roomType: rooms.roomType || 'Standard',
            occupancy: Number(rooms.occupancy || 1),
            gender: rooms.gender || 'Mixed',
            rent: Number(house.rent || 0),
            total_rooms: Number(house.total_rooms || 1),
            available_rooms: house.available_rooms !== null ? Number(house.available_rooms) : 1
          }];
        }

        const roomIndex = rooms.findIndex((r: any) => r.roomType === bookedRoomType);
        if (roomIndex !== -1) {
          rooms[roomIndex].available_rooms = Number(rooms[roomIndex].available_rooms || 0) + 1;
        }

        const totalAvailableAcrossRooms = rooms.reduce((sum: number, r: any) => sum + Number(r.available_rooms || 0), 0);
        await query(`
          UPDATE accommodations 
          SET available_rooms = $1, availability = true, room_info_json = $2
          WHERE id = $3
        `, [totalAvailableAcrossRooms, JSON.stringify(rooms), accId]);
      }
    }

    await query('COMMIT');
    revalidatePath('/business/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/student/accommodations');
    return { success: true };
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('Error updating room booking status:', error);
    return { error: error.message || 'Failed to update status.' };
  }
}

// 12. Update Flight Booking Status
export async function updateFlightBookingStatus(bookingId: number, status: 'approved' | 'rejected') {
  try {
    await verifyBusiness();

    await query('BEGIN');
    
    const bRes = await query('SELECT package_id, seats_count, status FROM flight_bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    if (bRes.rows.length === 0) {
      await query('ROLLBACK');
      return { error: 'Booking not found.' };
    }
    const booking = bRes.rows[0];

    await query(`
      UPDATE flight_bookings
      SET status = $1
      WHERE id = $2
    `, [status, bookingId]);

    // If rejected, increment available seats back
    if (status === 'rejected' && booking.status !== 'rejected') {
      const pkgId = booking.package_id;
      const seats = Number(booking.seats_count);
      const pkgRes = await query('SELECT available_seats FROM business_travel_packages WHERE id = $1 FOR UPDATE', [pkgId]);
      if (pkgRes.rows.length > 0) {
        const availableSeats = Number(pkgRes.rows[0].available_seats || 0) + seats;
        await query('UPDATE business_travel_packages SET available_seats = $1 WHERE id = $2', [availableSeats, pkgId]);
      }
    }

    await query('COMMIT');
    revalidatePath('/business/dashboard');
    revalidatePath('/student/dashboard');
    revalidatePath('/student/travel');
    return { success: true };
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('Error updating flight booking status:', error);
    return { error: error.message || 'Failed to update flight booking status.' };
  }
}

// 13. Send Notification to Flight Passenger
export async function sendPassengerNotification(bookingId: number, messageText: string) {
  try {
    await verifyBusiness();
    await query('BEGIN');

    const bRes = await query('SELECT booking_details FROM flight_bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    if (bRes.rows.length === 0) {
      await query('ROLLBACK');
      return { error: 'Booking not found.' };
    }

    const details = bRes.rows[0].booking_details || {};
    if (!details.notifications) {
      details.notifications = [];
    }

    details.notifications.push({
      id: Date.now(),
      message: messageText,
      created_at: new Date().toISOString()
    });

    await query(`
      UPDATE flight_bookings
      SET booking_details = $1
      WHERE id = $2
    `, [JSON.stringify(details), bookingId]);

    await query('COMMIT');
    revalidatePath('/business/dashboard');
    revalidatePath('/student/dashboard');
    return { success: true };
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('Error sending passenger notification:', error);
    return { error: error.message || 'Failed to send notification.' };
  }
}


