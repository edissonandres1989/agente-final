import { CorsOptions } from "cors"

export const corsConfig: CorsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
}
