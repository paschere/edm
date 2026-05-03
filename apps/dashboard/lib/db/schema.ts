import { pgTable, serial, varchar, text, decimal, timestamp } from "drizzle-orm/pg-core";

export const pixelEvents = pgTable("pixel_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  sessionId: varchar("session_id", { length: 255 }),
  customerId: varchar("customer_id", { length: 255 }),
  pageUrl: text("page_url"),
  productId: varchar("product_id", { length: 255 }),
  cartTotal: decimal("cart_total", { precision: 10, scale: 2 }),
  orderId: varchar("order_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PixelEvent = typeof pixelEvents.$inferSelect;
export type NewPixelEvent = typeof pixelEvents.$inferInsert;
