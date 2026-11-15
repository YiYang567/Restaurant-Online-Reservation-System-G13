
import express, {
  type ErrorRequestHandler,
  type Express,
} from "express";

export type AppDependencies = object;

export function createApp(deps: AppDependencies): Express {
  const app = express();

  // Store dependencies for application routes
  app.locals.deps = deps;

  // Parse JSON request bodies
  app.use(express.json());

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        details: [],
      },
    });
  });

  // Central error handler
  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    _next,
  ) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON request body",
          details: [],
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        details: [],
      },
    });
  };

  app.use(errorHandler);

  return app;
}
