import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import morgan from "morgan"
import { corsConfig } from "./cors/cors"
import chatRoutes from "./routes/ChatRoutes"
import proveedorRoutes from "./routes/ProveedorRoutes"

dotenv.config()

const app = express()

app.use(cors(corsConfig))
app.use(morgan("dev"))
app.use(express.json())

app.get("/api/health", (_request, response) => {
  response.json({ ok: true })
})

app.use("/api/chat", chatRoutes)
app.use("/api/proveedores", proveedorRoutes)

export default app
