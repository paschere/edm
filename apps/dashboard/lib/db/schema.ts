import { pgTable, serial, varchar, text, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";

export const pixelEvents = pgTable("pixel_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  sessionId: varchar("session_id", { length: 255 }),
  customerId: varchar("customer_id", { length: 255 }),
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  productId: varchar("product_id", { length: 255 }),
  productTitle: text("product_title"),
  collectionId: varchar("collection_id", { length: 255 }),
  searchQuery: text("search_query"),
  cartTotal: decimal("cart_total", { precision: 10, scale: 2 }),
  orderId: varchar("order_id", { length: 255 }),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PixelEvent = typeof pixelEvents.$inferSelect;
export type NewPixelEvent = typeof pixelEvents.$inferInsert;
