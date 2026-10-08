import { Hono } from 'hono';
import { CITY, JEDDAH_DISTRICTS, LISTING_TYPES, PROPERTY_TYPES, USAGES, RENT_PERIODS, LIMITS, AMENITIES, DEAL_STATUSES, TICKET_STATUSES } from '../lib/constants.js';

export const meta = new Hono();

// الواجهة تبني الفلاتر والقوائم من هنا بدل ما تكررها
meta.get('/', (c) =>
  c.json({
    city: CITY,
    districts: JEDDAH_DISTRICTS,
    listingTypes: LISTING_TYPES,
    propertyTypes: PROPERTY_TYPES,
    usages: USAGES,
    rentPeriods: RENT_PERIODS,
    amenities: AMENITIES,
    dealStatuses: DEAL_STATUSES,
    ticketStatuses: TICKET_STATUSES,
    limits: LIMITS,
  }),
);
