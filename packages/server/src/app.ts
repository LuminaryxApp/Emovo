import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";

import { env } from "./config/env.js";
import authPlugin from "./plugins/auth.plugin.js";
import requestIdPlugin from "./plugins/request-id.plugin.js";
import { authRoutes } from "./routes/auth.routes.js";
import { communityRoutes } from "./routes/community.routes.js";
import { exportRoutes } from "./routes/export.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { moodRoutes } from "./routes/mood.routes.js";
import { notificationRoutes } from "./routes/notification.routes.js";
import { pushTokenRoutes } from "./routes/push-token.routes.js";
import { sessionsRoutes } from "./routes/sessions.routes.js";
import { statsRoutes } from "./routes/stats.routes.js";
import { triggerRoutes } from "./routes/trigger.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { AppError } from "./utils/errors.js";

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
      redact: [
        "req.headers.authorization",
        "body.password",
        "body.newPassword",
        "body.refreshToken",
      ],
    },
    bodyLimit: 1_048_576, // 1MB
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  // Request ID plugin
  await fastify.register(requestIdPlugin);

  // Helmet — relaxed CSP for Swagger UI on /docs
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
      },
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  });

  // Rate limiting (global)
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // JWT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await fastify.register(jwt as any, {
    secret: env.JWT_SECRET,
    sign: {
      algorithm: "HS256",
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
    verify: {
      algorithms: ["HS256"],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      clockTolerance: 30, // 30 second clock skew tolerance
    },
  });

  // Auth plugin (depends on JWT)
  await fastify.register(authPlugin);

  // Swagger / OpenAPI
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Emovo API",
        description: "Personal Emotion Tracker API",
        version: "0.1.0",
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // Global error handler
  fastify.setErrorHandler(
    async (error: Error & { validation?: unknown[]; statusCode?: number }, request, reply) => {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            requestId: request.id,
          },
        });
      }

      // Fastify validation errors
      if (error.validation) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_FAILED",
            message: "Validation error",
            details: error.validation,
            requestId: request.id,
          },
        });
      }

      // Rate limit errors
      if (error.statusCode === 429) {
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
            requestId: request.id,
          },
        });
      }

      // Unexpected errors
      request.log.error(error, "Unhandled error");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: env.NODE_ENV === "production" ? "Internal server error" : error.message,
          requestId: request.id,
        },
      });
    },
  );

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: "/api/v1" });
  await fastify.register(sessionsRoutes, { prefix: "/api/v1/sessions" });
  await fastify.register(userRoutes, { prefix: "/api/v1" });
  await fastify.register(moodRoutes, { prefix: "/api/v1" });
  await fastify.register(triggerRoutes, { prefix: "/api/v1" });
  await fastify.register(statsRoutes, { prefix: "/api/v1" });
  await fastify.register(exportRoutes, { prefix: "/api/v1" });
  await fastify.register(communityRoutes, { prefix: "/api/v1" });
  await fastify.register(pushTokenRoutes, { prefix: "/api/v1/push-tokens" });
  await fastify.register(notificationRoutes, { prefix: "/api/v1/notifications" });

  return fastify;
}
