import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`Server running on http://localhost:${env.PORT}`);
    app.log.info(`API docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.fatal(err, "Failed to start server");
    process.exit(1);
  }
}

main();
