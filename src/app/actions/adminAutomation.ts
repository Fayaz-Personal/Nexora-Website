'use server';

import { query } from '@/db';
import { getCurrentUser } from './auth';
import { logSecurityEvent } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

// Fetch all pending updates
export async function getPendingUpdates() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') return null;

    const res = await query(
      `SELECT * FROM pending_updates WHERE status = 'pending' ORDER BY created_at DESC`
    );
    return res.rows;
  } catch (error) {
    console.error('Error fetching pending updates:', error);
    return null;
  }
}

// Approve pending update and apply to production
export async function approvePendingUpdate(updateId: number) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') {
      return { error: 'Unauthorized' };
    }

    // 1. Fetch update record
    const updateRes = await query('SELECT * FROM pending_updates WHERE id = $1', [updateId]);
    if (updateRes.rows.length === 0) {
      return { error: 'Pending update record not found.' };
    }

    const updateRecord = updateRes.rows[0];
    const { table_name, record_id, new_data } = updateRecord;

    // 2. Validate target table name to prevent SQL injection
    const allowedTables = ['universities', 'courses', 'scholarships', 'accommodations', 'visas', 'flights'];
    if (!allowedTables.includes(table_name)) {
      return { error: 'Invalid target table name.' };
    }

    // 3. Construct and execute the parameterized query
    if (record_id) {
      // UPDATE query
      const keys = Object.keys(new_data).filter(k => k !== 'id');
      const setClauses = keys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
      const values = keys.map(key => new_data[key]);
      
      const sql = `UPDATE "${table_name}" SET ${setClauses} WHERE id = $${keys.length + 1}`;
      values.push(record_id);

      await query(sql, values);
    } else {
      // INSERT query
      const keys = Object.keys(new_data).filter(k => k !== 'id');
      const columns = keys.map(key => `"${key}"`).join(', ');
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      const values = keys.map(key => new_data[key]);

      const sql = `INSERT INTO "${table_name}" (${columns}) VALUES (${placeholders})`;
      await query(sql, values);
    }

    // 4. Update status in pending_updates
    await query(
      `UPDATE pending_updates SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [updateId]
    );

    // 5. Log action in security audit logs
    await logSecurityEvent(
      'admin_action',
      user.id,
      `Approved and applied pending update ID ${updateId} for table "${table_name}" (Record ID: ${record_id || 'NEW'})`,
      { table_name, record_id, approved_by: user.email }
    );

    revalidatePath('/platform-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error approving pending update:', error);
    return { error: error.message || 'Failed to approve update.' };
  }
}

// Reject pending update
export async function rejectPendingUpdate(updateId: number) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') {
      return { error: 'Unauthorized' };
    }

    // Update status in pending_updates
    const res = await query(
      `UPDATE pending_updates SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [updateId]
    );

    if (res.rows.length === 0) {
      return { error: 'Pending update record not found.' };
    }

    const { table_name, record_id } = res.rows[0];

    // Log action in security audit logs
    await logSecurityEvent(
      'admin_action',
      user.id,
      `Rejected pending update ID ${updateId} for table "${table_name}" (Record ID: ${record_id || 'NEW'})`,
      { table_name, record_id, rejected_by: user.email }
    );

    revalidatePath('/platform-admin/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting pending update:', error);
    return { error: error.message || 'Failed to reject update.' };
  }
}

// Edit and then approve pending update
export async function editAndApprovePendingUpdate(updateId: number, editedNewData: any) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') {
      return { error: 'Unauthorized' };
    }

    // 1. Update the pending_updates record with edited new data
    await query(
      `UPDATE pending_updates SET new_data = $1 WHERE id = $2`,
      [JSON.stringify(editedNewData), updateId]
    );

    // 2. Call approval function to apply to database
    return await approvePendingUpdate(updateId);
  } catch (error: any) {
    console.error('Error editing and approving pending update:', error);
    return { error: error.message || 'Failed to edit and approve update.' };
  }
}

// Fetch all AI activity logs
export async function getAIActivityLogs() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') return null;

    const res = await query(`SELECT * FROM ai_activity_logs ORDER BY created_at DESC LIMIT 100`);
    return res.rows;
  } catch (error) {
    console.error('Error fetching AI activity logs:', error);
    return null;
  }
}

// Fetch all security audit logs
export async function getSecurityAuditLogs() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'platform_admin') return null;

    const res = await query(`SELECT * FROM security_audit_logs ORDER BY created_at DESC LIMIT 100`);
    return res.rows;
  } catch (error) {
    console.error('Error fetching security audit logs:', error);
    return null;
  }
}
