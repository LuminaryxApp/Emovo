import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function requestIdPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request) => {
    request.id = request.headers["x-request-id"]?.toString() || randomUUID();
  });
}

export default fp(requestIdPlugin, { name: "request-id" });
