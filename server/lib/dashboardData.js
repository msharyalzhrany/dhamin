// الصفقات التي تحتاج إجراءً مني الآن (قبول، توقيع، تأكيد تحويل/استلام، تقييم)
import { eq, or, desc } from 'drizzle-orm';
import { db, deals } from '../db/index.js';
import { buildDealItems } from './dealLogic.js';

export const ACTIONABLE = ['accept', 'sign', 'confirm_transfer', 'confirm_receipt', 'review'];

export async function myDealItems(userId) {
  const rows = await db.select().from(deals).where(or(eq(deals.ownerId, userId), eq(deals.counterpartyId, userId))).orderBy(desc(deals.updatedAt));
  return buildDealItems(rows, userId);
}

export async function actionDeals(userId, items) {
  return (items ?? (await myDealItems(userId))).filter((d) => ACTIONABLE.includes(d.nextAction));
}
