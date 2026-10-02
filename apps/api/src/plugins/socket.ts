import fp from 'fastify-plugin';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Call } from '@cryptonion/db';

export interface AuthenticatedSocketUser {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

export default fp(async (fastify) => {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  // JWT Authentication Middleware for Socket.IO Connections
  io.use((socket: Socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!authHeader) {
      return next(new Error('Authentication error: Missing token'));
    }

    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    try {
      const decoded = fastify.jwt.verify<AuthenticatedSocketUser>(token);
      if (!decoded.userId || !decoded.organizationId) {
        return next(new Error('Authentication error: Malformed token payload'));
      }
      socket.data.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthenticatedSocketUser;
    fastify.log.info(`Authenticated Socket connected: ${socket.id} (User: ${user.email}, Org: ${user.organizationId})`);

    // Automatically join the user's authenticated tenant room
    const userOrgRoom = `org:${user.organizationId}`;
    socket.join(userOrgRoom);

    // Guard manual join_org against tenant spoofing
    socket.on('join_org', (organizationId: string) => {
      if (organizationId !== user.organizationId) {
        fastify.log.warn(`Unauthorized attempt by socket ${socket.id} to join foreign tenant room org:${organizationId}`);
        socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot join foreign organization stream' });
        return;
      }
      socket.join(`org:${organizationId}`);
    });

    // Guard call room joins with tenant verification
    socket.on('join_call', async (callId: string) => {
      try {
        const call = await Call.findOne({
          where: { id: callId, organizationId: user.organizationId },
        });

        if (!call) {
          socket.emit('error', { code: 'NOT_FOUND', message: 'Call not found in your organization' });
          return;
        }

        socket.join(`call:${callId}`);
        fastify.log.info(`Socket ${socket.id} joined verified call room call:${callId}`);
      } catch (err) {
        fastify.log.error(`Error joining call room: ${err}`);
      }
    });

    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id}`);
    });
  });

  fastify.decorate('io', io);

  fastify.addHook('onClose', (instance, done) => {
    instance.io.close();
    done();
  });
});
