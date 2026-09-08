import cors from "cors";
import express from "express";
import helmet from "helmet";
import { HttpError } from "./errors.js";
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

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof HttpError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  },
);

export default app;
