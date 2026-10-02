import { 
  Role, 
  MembershipStatus,
  InvitationStatus,
  EmployeeStatus, 
  AIExecutionStatus,
  EmployeeRole, 
  CallDirection, 
  CallStatus, 
  LeadStatus, 
  CampaignStatus, 
  MessageSender, 
  KnowledgeStatus 
} from './enums';
import { Permission } from './permissions';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipDTO {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  status: MembershipStatus;
  user?: UserDTO;
  organization?: OrganizationDTO;
  createdAt: string;
  updatedAt?: string;
}

export interface InvitationDTO {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  status: InvitationStatus;
  token?: string;
  expiresAt: string;
  invitedById: string;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuthenticatedContextDTO {
  user: UserDTO;
  organization: OrganizationDTO;
  membership: MembershipDTO;
  role: Role;
  permissions: Permission[];
  availableOrganizations: Array<{
    organization: OrganizationDTO;
    role: Role;
  }>;
}

export interface AIEmployeeVoiceConfig {
  provider: 'piper' | 'elevenlabs' | 'openai' | 'custom';
  voiceId: string;
  speed: number;
  pitch: number;
  temperature?: number;
}

export interface AIEmployeeLLMConfig {
  provider: 'gemini' | 'ollama' | 'openai' | 'anthropic' | 'custom';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface AIEmployeeToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface AIEmployeeDTO {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  voiceConfig: AIEmployeeVoiceConfig;
  llmConfig: AIEmployeeLLMConfig;
  tools: AIEmployeeToolConfig[];
  phoneNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIExecutionDTO {
  id: string;
  organizationId: string;
  aiEmployeeId: string;
  status: AIExecutionStatus;
  provider: string;
  model: string;
  prompt: string;
  response?: string | null;
  latencyMs?: number | null;
  tokensUsed?: number | null;
  error?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDTO {
  id: string;
  organizationId: string;
  campaignId?: string | null;
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  status: LeadStatus;
  customData?: Record<string, any>;
  lastContactedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDTO {
  id: string;
  organizationId: string;
  aiEmployeeId: string;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  scheduledAt?: string | null;
  totalLeads: number;
  contactedLeads: number;
  successfulCalls: number;
  createdAt: string;
  updatedAt: string;
}

export interface CallDTO {
  id: string;
  organizationId: string;
  aiEmployeeId: string;
  leadId?: string | null;
  campaignId?: string | null;
  direction: CallDirection;
  status: CallStatus;
  callerNumber: string;
  calleeNumber: string;
  durationSeconds: number;
  recordingUrl?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  audioUrl?: string | null;
  latencyMs?: number | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface KnowledgeBaseDTO {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  status: KnowledgeStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
