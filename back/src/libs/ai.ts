import "dotenv/config"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const apiKey = process.env.OPENROUTER_API_KEY

if (!apiKey) {
  throw new Error("Falta configurar OPENROUTER_API_KEY en el archivo .env")
}

export const openRouter = createOpenRouter({ apiKey })
