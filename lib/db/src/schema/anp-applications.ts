import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const anpApplicationStatus = pgEnum("anp_application_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const anpApplicationsTable = pgTable("anp_applications", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  age: integer("age").notNull(),
  governorate: text("governorate").notNull(),
  socialContact: text("social_contact").notNull(),
  phone: text("phone"),
  contribution: text("contribution").notNull(),
  status: anpApplicationStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  managerEmail: text("manager_email"),
});

export const anpManagersTable = pgTable(
  "anp_managers",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    grantedBy: text("granted_by").notNull(),
    acceptedApplicationId: integer("accepted_application_id")
      .notNull()
      .references(() => anpApplicationsTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("anp_managers_email_unique").on(table.email),
    applicationUnique: uniqueIndex("anp_managers_application_unique").on(
      table.acceptedApplicationId,
    ),
  }),
);
