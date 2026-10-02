import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, Permission, hasPermission } from '@cryptonion/shared';
import { AuditLog } from '@cryptonion/db';
import { config } from '../config/env';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  organizationId: string;
  membershipId: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (allowedRoles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (permission: Permission) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    logAudit: (data: {
      organizationId?: string | null;
      userId?: string | null;
      action: string;
      resourceType: string;
      resourceId?: string | null;
      details?: Record<string, any>;
      request?: FastifyRequest;
    }) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUserPayload;
    user: AuthenticatedUserPayload;
  }
}

export default fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: '7d',
    },
  });

  // Base authentication decorator
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing authentication token',
          },
        });
      }
    }
  );

  // RBAC Role Enforcement Decorator Factory
  fastify.decorate(
    'requireRole',
    (allowedRoles: Role[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
          const userRole = request.user?.role as Role;

          if (!userRole || !allowedRoles.includes(userRole)) {
            return reply.status(403).send({
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: `Forbidden: User role '${userRole || 'UNKNOWN'}' is not authorized to access this resource. Required roles: [${allowedRoles.join(', ')}]`,
              },
            });
          }
        } catch (err) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required for role-protected resource',
            },
          });
        }
      };
    }
  );

  // Permission-based Authorization Decorator Factory
  fastify.decorate(
    'requirePermission',
    (permission: Permission) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
          const userRole = request.user?.role as Role;

          if (!userRole || !hasPermission(userRole, permission)) {
            return reply.status(403).send({
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: `Forbidden: User role '${userRole || 'UNKNOWN'}' lacks required permission '${permission}'`,
              },
            });
          }
        } catch (err) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required for permission-protected resource',
            },
          });
        }
      };
    }
  );

  // Audit Log Decorator
  fastify.decorate(
    'logAudit',
    async ({
      organizationId,
      userId,
      action,
      resourceType,
      resourceId,
      details = {},
      request,
    }: {
      organizationId?: string | null;
      userId?: string | null;
      action: string;
      resourceType: string;
      resourceId?: string | null;
      details?: Record<string, any>;
      request?: FastifyRequest;
    }) => {
      try {
        const ipAddress = request?.ip || (request?.headers['x-forwarded-for'] as string) || null;
        const userAgent = (request?.headers['user-agent'] as string) || null;

        await AuditLog.create({
          organizationId: organizationId || null,
          userId: userId || null,
          action,
          resourceType,
          resourceId: resourceId || null,
          details,
          ipAddress,
          userAgent,
        });
      } catch (err) {
        fastify.log.warn(`Failed to write audit log: ${err}`);
      }
    }
  );
});
