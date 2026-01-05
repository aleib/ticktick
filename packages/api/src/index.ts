import Fastify from "fastify";

import { registerRoutes } from "./routes.js";

const app = Fastify({
  logger: true,
});

await registerRoutes(app);

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
