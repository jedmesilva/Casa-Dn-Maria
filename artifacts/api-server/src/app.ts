import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const rawAllowed = process.env["CORS_ALLOWED_ORIGINS"] ?? "";
const allowedOrigins = rawAllowed
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use("/api/checkout/webhook", express.raw({ type: "*/*", limit: "32kb" }));

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const e = err as { message?: string; status?: number };
  if (e?.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  req.log?.error({ err }, "Unhandled error");
  return res.status(e?.status ?? 500).json({ error: "Internal server error" });
});

export default app;
