import cors from "cors";
import express from "express";
import helmet from "helmet";
import { HttpError } from "./errors.js";
import { logger } from "./lib/logger.js";
import developerRoutes from "./routes/developers.js";
import skillRoutes from "./routes/skills.js";
import taskRoutes from "./routes/tasks.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/tasks", taskRoutes);
app.use("/developers", developerRoutes);
app.use("/skills", skillRoutes);

app.use((_request, _response, next) => {
  next(new HttpError(404, "Route not found"));
});

// Return expected business-rule errors without exposing unexpected server errors.
app.use(
  (
    error: unknown,
    request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof HttpError) {
      if (error.statusCode >= 500) {
        logger.warn("request_failed", {
          method: request.method,
          path: request.path,
          status: error.statusCode,
        });
      }

      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    logger.error("unexpected_request_error", {
      method: request.method,
      path: request.path,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    response.status(500).json({ error: "Internal server error" });
  },
);

export default app;
