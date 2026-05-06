// lib/freelancehub/notifications.ts — SERVER ONLY
import { query, queryOne } from './db'

export type NotifType =
  | 'booking_confirmed'
  | 'new_booking'
  | 'review_request'
  | 'fund_released'
  | 'reminder'
  | 'booking_cancelled'
  | 'kyc_validated'
  | 'kyc_rejected'

export interface Notification {
  id:         string
  user_id:    string
  type:       NotifType
  title:      string
  message:    string | null
  data:       Record<string, unknown> | null
  is_read:    boolean
  created_at: string
}

export async function createNotification(
  userId:  string,
  type:    NotifType,
  title:   string,
  message?: string,
  data?:   Record<string, unknown>
): Promise<void> {
  await query(
    `INSERT INTO freelancehub.notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, message ?? null, data ? JSON.stringify(data) : null]
  )
}

export async function getUnreadCount(userId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM freelancehub.notifications
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  )
  return row?.count ?? 0
}

export async function listNotifications(
  userId: string,
  limit = 30
): Promise<Notification[]> {
  return query<Notification>(
    `SELECT id, user_id, type, title, message, data, is_read, created_at
     FROM freelancehub.notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  )
}

export async function markAllRead(userId: string): Promise<void> {
  await query(
    `UPDATE freelancehub.notifications SET is_read = true
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  )
}

export async function markOneRead(
  userId: string,
  notifId: string
): Promise<void> {
  await query(
    `UPDATE freelancehub.notifications SET is_read = true
     WHERE id = $1 AND user_id = $2`,
    [notifId, userId]
  )
}
