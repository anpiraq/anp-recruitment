import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  CreateApplicationBody,
  ListApplicationsQueryParams,
  PromoteApplicationToManagerBody,
  UpdateApplicationStatusBody,
} from "@workspace/api-zod";
import {
  anpApplicationsTable,
  anpManagersTable,
  db,
} from "@workspace/db";
import { requireAnpAdmin } from "../middlewares/requireAnpAdmin";

const router: IRouter = Router();

const validationError = "تحقق من المعلومات المدخلة وحاول مرة أخرى.";

router.post("/applications", async (req, res) => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const [application] = await db
      .insert(anpApplicationsTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(application);
  } catch {
    res.status(503).json({ error: "تعذّر حفظ الطلب الآن. حاول لاحقاً." });
  }
});

router.get("/me", requireAnpAdmin, (_req, res) => {
  res.json(res.locals.anpAdmin);
});

router.get("/applications", requireAnpAdmin, async (req, res) => {
  const parsed = ListApplicationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const applications = parsed.data.status
      ? await db
          .select()
          .from(anpApplicationsTable)
          .where(eq(anpApplicationsTable.status, parsed.data.status))
          .orderBy(desc(anpApplicationsTable.createdAt))
      : await db
          .select()
          .from(anpApplicationsTable)
          .orderBy(desc(anpApplicationsTable.createdAt));

    res.json({ applications });
  } catch {
    res.status(503).json({ error: "تعذّر تحميل الطلبات الآن." });
  }
});

router.patch(
  "/applications/:id/status",
  requireAnpAdmin,
  async (req, res) => {
    const id = Number(req.params.id);
    const parsed = UpdateApplicationStatusBody.safeParse(req.body);
    if (!Number.isInteger(id) || id < 1 || !parsed.success) {
      res.status(400).json({ error: validationError });
      return;
    }

    try {
      const status = parsed.data.status;
      const [application] = await db
        .update(anpApplicationsTable)
        .set({
          status,
          reviewedAt: status === "pending" ? null : new Date(),
          reviewedBy: status === "pending" ? null : res.locals.anpAdmin!.email,
        })
        .where(eq(anpApplicationsTable.id, id))
        .returning();

      if (!application) {
        res.status(404).json({ error: "لم يتم العثور على الطلب." });
        return;
      }

      res.json(application);
    } catch {
      res.status(503).json({ error: "تعذّر تحديث حالة الطلب الآن." });
    }
  },
);

router.post(
  "/applications/:id/manager",
  requireAnpAdmin,
  async (req, res) => {
    if (res.locals.anpAdmin?.role !== "primary") {
      res.status(403).json({ error: "إضافة مدير متاحة للمالك فقط." });
      return;
    }

    const id = Number(req.params.id);
    const parsed = PromoteApplicationToManagerBody.safeParse(req.body);
    if (!Number.isInteger(id) || id < 1 || !parsed.success) {
      res.status(400).json({ error: validationError });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    if (email === res.locals.anpAdmin.email) {
      res.status(409).json({ error: "هذا الحساب هو المالك بالفعل." });
      return;
    }

    try {
      const manager = await db.transaction(async (tx) => {
        const [application] = await tx
          .select()
          .from(anpApplicationsTable)
          .where(eq(anpApplicationsTable.id, id))
          .for("update");

        if (!application) return { kind: "missing" as const };
        if (application.status !== "accepted") {
          return { kind: "not-accepted" as const };
        }

        const [existingEmail] = await tx
          .select({ id: anpManagersTable.id })
          .from(anpManagersTable)
          .where(eq(anpManagersTable.email, email))
          .limit(1);
        if (existingEmail) return { kind: "duplicate-email" as const };
        if (application.managerEmail) return { kind: "application-has-manager" as const };

        const [created] = await tx
          .insert(anpManagersTable)
          .values({
            email,
            grantedBy: res.locals.anpAdmin!.email,
            acceptedApplicationId: id,
          })
          .returning({ email: anpManagersTable.email });

        await tx
          .update(anpApplicationsTable)
          .set({ managerEmail: email })
          .where(eq(anpApplicationsTable.id, id));

        return { kind: "created" as const, manager: created };
      });

      if (manager.kind === "missing") {
        res.status(404).json({ error: "لم يتم العثور على الطلب." });
        return;
      }
      if (manager.kind === "not-accepted") {
        res.status(400).json({ error: "يمكن ترقية مدير من طلب مقبول فقط." });
        return;
      }
      if (manager.kind === "duplicate-email") {
        res.status(409).json({ error: "هذا البريد لديه صلاحية مدير مسبقاً." });
        return;
      }
      if (manager.kind === "application-has-manager") {
        res.status(409).json({ error: "تم تعيين مدير لهذا الطلب مسبقاً." });
        return;
      }

      res.status(201).json({ email: manager.manager.email, role: "manager" });
    } catch {
      res.status(503).json({ error: "تعذّرت إضافة المدير الآن." });
    }
  },
);

export default router;
