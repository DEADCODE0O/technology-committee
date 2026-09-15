// ═══════════════════════════════════════════════════════════════
//  سجل الأفعال القابلة للتراجع — مشترك بين واجهة سجل العمليات
//  ومحرك التراجع (actions/undo.ts)
// ═══════════════════════════════════════════════════════════════

export const UNDOABLE_ACTIONS = new Set([
  // البرامج
  "PROGRAM_CREATED",
  "PROGRAM_UPDATED",
  "PROGRAM_DELETED",
  // الأنشطة
  "ACTIVITY_CREATED",
  "ACTIVITY_UPDATED",
  "ACTIVITY_DELETED",
  // الجلسات (محاضرة/موعد ورشة)
  "SESSION_SAVED",
  "SESSION_DELETED",
  "SESSION_REGISTRATION_TOGGLED",
  // أسئلة التسجيل
  "FORM_FIELDS_SAVED",
  // الإشعارات
  "NOTIFICATION_SENT",
  "NOTIFICATION_DELETED",
  // مرفقات درايف
  "DRIVE_ASSET_CREATED",
  "DRIVE_ASSET_UPDATED",
  "DRIVE_ASSET_DELETED",
  "POINTS_ADDED",
  "POINTS_REVERSED",
  "POINTS_BULK",
  "POINT_EVENT_DELETED",
  "POINT_RULE_SAVED",
  "POINT_RULE_TOGGLED",
  "BADGE_SAVED",
  "BADGE_AWARDED",
  "BADGE_REVOKED",
  "TALENT_STATUS",
  "TALENT_FEATURED",
  "STUDENT_STATUS",
  "STUDENT_UPDATED",
  "STAFF_ROLE_SET",
  "STAFF_DEMOTED",
  "ATTENDANCE_SET",
  "ATTENDANCE_ALL_PRESENT",
  "MANUAL_REGISTRATION",
  "ADMIN_CANCELLED_REGISTRATION",
  "ADMIN_PROMOTED_REGISTRATION",
  "DATA_REQUEST_CREATED",
  "DATA_REQUEST_STATUS",
  "SETTINGS_SAVED",
]);

export function isUndoableAction(action: string): boolean {
  return UNDOABLE_ACTIONS.has(action);
}
