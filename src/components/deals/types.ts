// شكل GET /api/deals/:id (راجع server/API.md قسم 7)
import type { DealStatus, NextAction } from '@/lib/types';

export type Party = { id: string; name: string; avatarUrl: string | null; phone: string | null; ratingAvg: number | null };
export type SnapParty = { id: string; name: string; email: string | null; phone: string | null; nationalAddress: string | null };
export type Snapshot = {
  number: string; templateType: 'sale' | 'rent' | 'invest'; createdAt: string; price: number; durationMonths: number | null; rentPeriod?: 'monthly' | 'yearly' | null;
  investment?: { expectedReturnPct: number; durationMonths: number } | null;
  property: { id: string; title: string; propertyType: string; usage: string; district: string; areaSqm: number | null; addressNote: string | null };
  owner: SnapParty; counterparty: SnapParty;
};
export type Contract = {
  id: string; number: string; status: 'pending_signatures' | 'signed' | 'cancelled'; sealHash: string; signedAt: string | null;
  snapshot: Snapshot;
  signatures: { userId: string; role: 'owner' | 'counterparty'; signedName: string; signedAt: string }[];
};
export type DealDetail = {
  id: string; status: DealStatus; kind: 'sale' | 'rent' | 'invest'; agreedPrice: number; durationMonths: number | null; proposedBy: string; cancelReason: string | null;
  payerConfirmedAt: string | null; receiverConfirmedAt: string | null; createdAt: string; updatedAt: string;
  property: { id: string; title: string; cover: string | null; district: string; propertyType: string; price: number; listingType: 'sale' | 'rent' | 'invest' };
  owner: Party; counterparty: Party;
  role: 'owner' | 'counterparty'; payerIsMe: boolean; nextAction: NextAction; conversationId: string;
  contract: Contract | null;
  reviews: { mine: { rating: number; comment: string | null } | null; theirs: { rating: number; comment: string | null } | null };
};
