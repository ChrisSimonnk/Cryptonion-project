import { z } from 'zod';
import { 
  Role, 
  EmployeeStatus, 
  EmployeeRole, 
  CallDirection, 
  CallStatus, 
  LeadStatus, 
  CampaignStatus,
  MembershipStatus,
  InvitationStatus,
  MessageSender,
  MemoryType,
  MemorySource,
} from './enums';

export const UserRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters long'),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const SwitchOrganizationSchema = z.object({
  organizationId: z.string().uuid('Valid Organization UUID is required'),
});

export const OrganizationCreateSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  slug: z.string().min(2).optional(),
});

export const OrganizationUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  settings: z.record(z.any()).optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email('Valid recipient email is required'),
  role: z.nativeEnum(Role).default(Role.AGENT),
});

export const ChangeMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token is required'),
});

export const AIEmployeeCreateSchema = z.object({
  name: z.string().min(2, 'Name is required').max(128),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  role: z.nativeEnum(EmployeeRole).default(EmployeeRole.SALES_REP),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
  voiceConfig: z.object({
    provider: z.enum(['piper', 'elevenlabs', 'openai', 'custom']).default('piper'),
    voiceId: z.string().default('en_US-lessac-medium'),
    speed: z.number().min(0.5).max(2.0).default(1.0),
    pitch: z.number().min(0.5).max(2.0).default(1.0),
    temperature: z.number().min(0).max(2.0).optional(),
  }).default({}),
  llmConfig: z.object({
    provider: z.enum(['ollama', 'openai', 'anthropic', 'custom']).default('ollama'),
    model: z.string().min(1, 'Model name is required').default('llama3:8b'),
    temperature: z.number().min(0, 'Temperature cannot be negative').max(2.0, 'Temperature cannot exceed 2.0').default(0.7),
    maxTokens: z.number().int().min(10, 'Minimum 10 tokens required').max(8192, 'Max 8192 tokens allowed').default(512),
    systemPrompt: z.string().min(5, 'System prompt must be descriptive'),
  }),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    enabled: z.boolean().default(true),
    parameters: z.record(z.any()).default({}),
  })).default([]),
  phoneNumber: z.string().optional(),
});

export const AIEmployeeUpdateSchema = z.object({
  name: z.string().min(2).max(128).optional(),
  description: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.nativeEnum(EmployeeRole).optional(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  voiceConfig: z.object({
    provider: z.enum(['piper', 'elevenlabs', 'openai', 'custom']).default('piper'),
    voiceId: z.string().default('en_US-lessac-medium'),
    speed: z.number().min(0.5).max(2.0).default(1.0),
    pitch: z.number().min(0.5).max(2.0).default(1.0),
    temperature: z.number().min(0).max(2.0).optional(),
  }).optional(),
  llmConfig: z.object({
    provider: z.enum(['ollama', 'openai', 'anthropic', 'custom']).default('ollama'),
    model: z.string().min(1).default('llama3:8b'),
    temperature: z.number().min(0).max(2.0).default(0.7),
    maxTokens: z.number().int().min(10).max(8192).default(512),
    systemPrompt: z.string().min(5),
  }).optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    enabled: z.boolean().default(true),
    parameters: z.record(z.any()).default({}),
  })).optional(),
  phoneNumber: z.string().nullable().optional(),
});

export const AIEmployeeExecuteSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
  chatHistory: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  maxTurns: z.number().int().min(1).max(5).optional().default(1),
});

export const LeadCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phoneNumber: z.string().min(7, 'Valid phone number is required'),
  email: z.string().email().optional(),
  campaignId: z.string().uuid().optional(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  customData: z.record(z.any()).optional(),
});

export const CampaignCreateSchema = z.object({
  aiEmployeeId: z.string().uuid(),
  name: z.string().min(2, 'Campaign name is required'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  leadIds: z.array(z.string().uuid()).optional(),
});

export const CallInitiateSchema = z.object({
  aiEmployeeId: z.string().uuid(),
  calleeNumber: z.string().min(7),
  leadId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  direction: z.nativeEnum(CallDirection).default(CallDirection.OUTBOUND),
});

export const KnowledgeBaseCreateSchema = z.object({
  name: z.string().min(2, 'Knowledge Base name is required'),
  description: z.string().optional(),
});

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  topK: z.number().min(1).max(20).default(5),
});

// Phase 4: Memory & Context Engine Schemas
export const AIMemoryCreateSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  type: z.nativeEnum(MemoryType),
  key: z.string().trim().min(1, 'Memory key cannot be empty').max(128, 'Memory key cannot exceed 128 characters'),
  value: z.string().trim().min(1, 'Memory value cannot be empty').max(2000, 'Memory value cannot exceed 2000 characters'),
  confidence: z.number().min(0).max(1).default(1.0),
  source: z.nativeEnum(MemorySource).default(MemorySource.EXPLICIT_ADMIN),
  metadata: z.record(z.any()).default({}),
});

export const AIMemoryUpdateSchema = z.object({
  type: z.nativeEnum(MemoryType).optional(),
  value: z.string().trim().min(1, 'Memory value cannot be empty').max(2000, 'Memory value cannot exceed 2000 characters').optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.nativeEnum(MemorySource).optional(),
  metadata: z.record(z.any()).optional(),
});

export const ConversationCreateSchema = z.object({
  aiEmployeeId: z.string().uuid('Valid AI Employee UUID is required'),
  leadId: z.string().uuid().nullable().optional(),
  channel: z.enum(['voice', 'chat', 'sms', 'whatsapp']).default('chat'),
  context: z.record(z.any()).default({}),
});

export const ConversationMessageCreateSchema = z.object({
  content: z.string().trim().min(1, 'Message content cannot be empty'),
  sender: z.nativeEnum(MessageSender).default(MessageSender.USER),
  metadata: z.record(z.any()).default({}),
});

