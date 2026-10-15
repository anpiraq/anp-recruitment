import { clerkClient, getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, anpManagersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const PRIMARY_ADMIN_EMAIL = "anp.iraq@gmail.com";

export type AnpAdminIdentity = {
  email: string;
  role: "primary" | "manager";
};

declare global {
  namespace Express {
    interface Locals {
      anpAdmin?: AnpAdminIdentity;
    }
  }
}

export const requireAnpAdmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "يرجى تسجيل الدخول أولاً." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    );

    if (
      !primaryEmail ||
      primaryEmail.verification?.status !== "verified"
    ) {
      res.status(403).json({ error: "يجب استخدام بريد إلكتروني موثّق." });
      return;
    }

    const email = primaryEmail.emailAddress.trim().toLowerCase();
    if (email === PRIMARY_ADMIN_EMAIL) {
      res.locals.anpAdmin = { email, role: "primary" };
      next();
      return;
    }

    const [manager] = await db
      .select({ email: anpManagersTable.email })
      .from(anpManagersTable)
      .where(eq(anpManagersTable.email, email))
      .limit(1);

    if (!manager) {
      res.status(403).json({ error: "هذا الحساب غير مخوّل للوصول إلى الطلبات." });
      return;
    }

    res.locals.anpAdmin = { email, role: "manager" };
    next();
  } catch {
    logger.error("ANP admin authorization check failed");
    res.status(503).json({ error: "تعذّر التحقق من صلاحية الحساب الآن." });
  }
};
