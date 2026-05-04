import { pgTable, serial, integer, varchar, text, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";

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

// ─── Orders ──────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopifyOrderId: varchar("shopify_order_id", { length: 255 }).notNull().unique(),
  orderNumber: integer("order_number").notNull(),
  email: varchar("email", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  financialStatus: varchar("financial_status", { length: 50 }),   // paid, pending, refunded…
  fulfillmentStatus: varchar("fulfillment_status", { length: 50 }), // null=unfulfilled, fulfilled, partial
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  subtotalPrice: decimal("subtotal_price", { precision: 10, scale: 2 }),
  totalTax: decimal("total_tax", { precision: 10, scale: 2 }),
  totalDiscounts: decimal("total_discounts", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }),
  lineItems: jsonb("line_items"),       // [{title, variant_title, quantity, price, sku}]
  shippingAddress: jsonb("shipping_address"),
  note: text("note"),
  tags: text("tags"),
  rawPayload: jsonb("raw_payload"),     // payload completo para integraciones futuras (ERP, etc.)
  shopifyCreatedAt: timestamp("shopify_created_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
