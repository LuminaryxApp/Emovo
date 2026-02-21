// Constants
export { ErrorCode } from "./constants/error-codes.js";
export { MOOD_SCALE, MIN_MOOD_SCORE, MAX_MOOD_SCORE, MAX_NOTE_LENGTH } from "./constants/moods.js";
export { DEFAULT_TRIGGERS } from "./constants/triggers.js";

// Types
export type { User, UserProfile } from "./types/user.js";
export type {
  MoodEntry,
  Trigger,
  MoodStats,
  MoodTrend,
  TriggerBreakdown,
  StreakData,
  MoodCalendar,
} from "./types/mood.js";
export type {
  ApiResponse,
  ApiError,
  AuthTokens,
  AuthResponse,
  Session,
  PaginationParams,
  StatsPeriod,
} from "./types/api.js";
export type {
  Post,
  PostWithAuthor,
  Comment,
  Group,
  GroupWithMembership,
  GroupMember,
  Conversation,
  ConversationPreview,
  Message,
} from "./types/community.js";
export type { Notification } from "./types/notification.js";

// Schemas
export {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  logoutSchema,
  updateProfileSchema,
} from "./schemas/user.schema.js";
export type { RegisterInput, LoginInput, UpdateProfileInput } from "./schemas/user.schema.js";

export {
  createMoodSchema,
  updateMoodSchema,
  createTriggerSchema,
  moodQuerySchema,
  statsQuerySchema,
  calendarQuerySchema,
} from "./schemas/mood.schema.js";
export type {
  CreateMoodInput,
  UpdateMoodInput,
  CreateTriggerInput,
} from "./schemas/mood.schema.js";

export {
  createPostSchema,
  createCommentSchema,
  createGroupSchema,
  sendMessageSchema,
  createConversationSchema,
  feedQuerySchema,
  groupQuerySchema,
  messageQuerySchema,
} from "./schemas/community.schema.js";
export type {
  CreatePostInput,
  CreateCommentInput,
  CreateGroupInput,
  SendMessageInput,
  CreateConversationInput,
} from "./schemas/community.schema.js";
