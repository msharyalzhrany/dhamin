// أشكال البيانات القادمة من الباك اند (راجع server/API.md)
export type Pair = { id: string; ar: string; en: string };
export type Meta = {
  city: { id: string; ar: string; en: string };
  districts: Pair[]; listingTypes: Pair[]; propertyTypes: Pair[]; usages: Pair[]; rentPeriods: Pair[];
  amenities: Pair[]; dealStatuses: Pair[]; ticketStatuses: Pair[];
  limits: { individual: { activeListings: number; activeDeals: number } };
};
export type Investment = { targetAmount: number; raisedAmount: number; progressPct: number; minInvestment: number; durationMonths: number; expectedReturnPct: number };
export type Property = {
  id: string; ownerId: string; ownerFirstName: string | null;
  listingType: 'sale' | 'rent' | 'invest'; propertyType: string; usage: string;
  title: string; description: string; price: number; rentPeriod: 'monthly' | 'yearly' | null;
  areaSqm: number | null; bedrooms: number | null; bathrooms: number | null;
  city: string; district: string; addressNote: string | null; amenities: string[];
  status: 'active' | 'reserved' | 'closed' | 'archived'; createdAt: string; updatedAt: string;
  cover: string | null; mediaCount: number; isFavorite?: boolean; viewsCount?: number;
  investment?: Investment;
  media?: string[];
  owner?: { id: string; firstName: string; avatarUrl: string | null; ratingAvg: number | null; ratingCount: number; memberSince: string; verified: { phone: boolean; address: boolean } };
};
export type Me = {
  user: { id: string; name: string; email: string; emailVerified: boolean; accountType: string; phone: string | null };
  profile: { userId: string; avatarUrl: string | null; bio: string | null; nationalAddress: string | null; nationalAddressVerified: boolean; phoneVerified: boolean; ratingAvg: number | null; ratingCount: number };
  stats: { completedDeals: number; favorites: number };
  welcome: { ar: string; en: string };
  limits: { activeListings: number; activeDeals: number };
  usage: { activeListings: number; activeDeals: number };
};
export type DealStatus = 'negotiating' | 'agreed' | 'awaiting_signatures' | 'awaiting_transfer' | 'awaiting_receipt' | 'completed' | 'cancelled' | 'disputed';
export type NextAction = 'accept' | 'wait' | 'sign' | 'wait_signature' | 'confirm_transfer' | 'wait_transfer' | 'confirm_receipt' | 'wait_receipt' | 'review' | null;
export type DealItem = {
  id: string; status: DealStatus; kind: 'sale' | 'rent' | 'invest'; agreedPrice: number; durationMonths: number | null;
  role: 'owner' | 'counterparty'; payerIsMe: boolean; proposedBy: string;
  property: { id: string; title: string; cover: string | null };
  other: { id: string; name: string; avatarUrl: string | null };
  conversationId: string; contractNumber: string | null; nextAction: NextAction; createdAt: string; updatedAt: string;
};
export type ConversationItem = {
  id: string;
  property: { id: string; title: string; cover: string | null; listingType: string; price: number; district: string; propertyType: string };
  other: { id: string; name: string; avatarUrl: string | null };
  lastMessage: { body: string; createdAt: string; senderId: string; kind: 'text' | 'system' } | null;
  unread: number; deal: { id: string; status: DealStatus } | null; updatedAt: string;
};
export type Message = { id: string; senderId: string; body: string; kind: 'text' | 'system'; createdAt: string };
