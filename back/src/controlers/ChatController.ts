import { Request, Response } from "express"
import { promptData } from "../services/promptService"

export class ChatController {
  static async receiveMessage(request: Request, response: Response) {
    const { message } = request.body as { message?: unknown }

    if (typeof message !== "string" || !message.trim()) {
      return response.status(400).json({ error: "El campo message es obligatorio." })
    }

    try {
      const reply = await promptData(message.trim())
      return response.status(200).json({ reply })
    } catch (error) {
      console.error("Error al consultar OpenRouter:", error)
      return response.status(502).json({
        error: "No fue posible obtener una respuesta del modelo.",
      })
    }
  }
}
