import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { z } from 'zod';
import { logAudit } from '../services/audit';

const router = Router();
router.use(authenticate);

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().optional(),
});

const preferencesUpdateSchema = z.object({
  workStartHour: z.number().int().min(0).max(23).optional(),
  workEndHour: z.number().int().min(0).max(23).optional(),
  preferredFocusSessionMins: z.number().int().min(1).max(240).optional(),
  enableSmartReminders: z.boolean().optional(),
  reminderLeadTimeMinutes: z.number().int().min(0).max(1440).optional(),
  productivityStyle: z.string().optional(),
  aiCoachingTone: z.string().optional(),
});

// ─── GET /api/v1/user/me ─────────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { preferences: true },
    });
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/v1/user/profile ──────────────────────────────────────────────
router.patch('/profile', async (req, res, next) => {
  try {
    const data = profileUpdateSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: data.name,
        timezone: data.timezone,
      },
      include: { preferences: true },
    });

    logAudit(req, {
      action: 'account.profile_update',
      resourceType: 'user',
      resourceId: req.user!.id,
      success: true,
      metadata: { updatedFields: Object.keys(data) },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logAudit(req, {
      action: 'account.profile_update',
      resourceType: 'user',
      resourceId: req.user!.id,
      success: false,
      errorCode: 'VALIDATION_OR_DB_ERROR',
      metadata: { error: (error as Error).message },
    });
    next(error);
  }
});

// ─── PATCH /api/v1/user/preferences ──────────────────────────────────────────
router.patch('/preferences', async (req, res, next) => {
  try {
    const data = preferencesUpdateSchema.parse(req.body);

    const updated = await prisma.userPreferences.upsert({
      where: { userId: req.user!.id },
      update: data,
      create: {
        userId: req.user!.id,
        workStartHour: data.workStartHour ?? 9,
        workEndHour: data.workEndHour ?? 18,
        preferredFocusSessionMins: data.preferredFocusSessionMins ?? 25,
        enableSmartReminders: data.enableSmartReminders ?? true,
        reminderLeadTimeMinutes: data.reminderLeadTimeMinutes ?? 60,
        productivityStyle: data.productivityStyle ?? 'balanced',
        aiCoachingTone: data.aiCoachingTone ?? 'friendly',
      },
    });

    logAudit(req, {
      action: 'account.profile_update',
      resourceType: 'user_preferences',
      resourceId: updated.id,
      success: true,
      metadata: { updatedFields: Object.keys(data) },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logAudit(req, {
      action: 'account.profile_update',
      resourceType: 'user_preferences',
      resourceId: 'unknown',
      success: false,
      errorCode: 'UPSERT_FAILED',
      metadata: { error: (error as Error).message },
    });
    next(error);
  }
});

// ─── GET /api/v1/user/me/export (GDPR Right to Access/Portability) ────────────
router.get('/me/export', async (req, res, next) => {
  try {
    const data = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        preferences: true,
        tasks: { where: { deletedAt: null } },
        goals: { where: { deletedAt: null } },
        habits: { where: { deletedAt: null } },
      },
    });

    logAudit(req, {
      action: 'account.data_export',
      resourceType: 'user',
      resourceId: req.user!.id,
      success: true,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logAudit(req, {
      action: 'account.data_export',
      resourceType: 'user',
      resourceId: req.user!.id,
      success: false,
      errorCode: 'EXPORT_FAILED',
      metadata: { error: (error as Error).message },
    });
    next(error);
  }
});

// ─── DELETE /api/v1/user/me (GDPR Right to Erasure) ──────────────────────────
router.delete('/me', async (req, res, next) => {
  try {
    // Soft delete user in database (scheduled for hard delete after 30-day grace period)
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { deletedAt: new Date() },
    });

    logAudit(req, {
      action: 'account.account_delete',
      resourceType: 'user',
      resourceId: req.user!.id,
      success: true,
    });

    res.json({
      success: true,
      message: 'Account scheduled for deletion. You have a 30-day grace period to recover your data.',
    });
  } catch (error) {
    logAudit(req, {
      action: 'account.account_delete',
      resourceType: 'user',
      resourceId: req.user!.id,
      success: false,
      errorCode: 'DELETE_FAILED',
      metadata: { error: (error as Error).message },
    });
    next(error);
  }
});

export default router;
