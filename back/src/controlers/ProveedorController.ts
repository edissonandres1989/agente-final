import path from "node:path"
import { Request, Response } from "express"
import { generarFormulario, leerSolicitud } from "../services/proveedorService"

export class ProveedorController {
  static async leerSolicitud(request: Request, response: Response) {
    const caso = request.params.caso

    if (typeof caso !== "string") {
      return response.status(400).json({ error: "El caso es obligatorio." })
    }

    try {
      const data = await leerSolicitud(caso)
      return response.status(200).json(data)
    } catch (error) {
      const fileError = error as NodeJS.ErrnoException

      if (fileError.code === "ENOENT") {
        return response.status(404).json({ error: "Caso o plantilla no encontrada." })
      }

      if (error instanceof Error && error.message === "Formato de plantilla no soportado.") {
        return response.status(400).json({ error: error.message })
      }

      return response.status(500).json({ error: "No fue posible leer la solicitud." })
    }
  }

  static descargarFormulario(request: Request, response: Response) {
    const caso = request.params.caso

    if (typeof caso !== "string" || !/^[a-z0-9-]+$/i.test(caso)) {
      return response.status(400).json({ error: "El caso es obligatorio." })
    }

    const filePath = path.join(process.cwd(), "out", caso, "formulario.xlsx")

    return response.download(filePath, "formulario.xlsx", (error) => {
      if (error && !response.headersSent) {
        response.status(404).json({ error: "El formulario aún no ha sido generado." })
      }
    })
  }

  static async generarFormulario(request: Request, response: Response) {
    const caso = request.params.caso

    if (typeof caso !== "string") {
      return response.status(400).json({ error: "El caso es obligatorio." })
    }

    try {
      const data = await generarFormulario(caso)
      const status = data.formato === "portal" ? 400 : 201
      return response.status(status).json(data)
    } catch (error) {
      const fileError = error as NodeJS.ErrnoException

      if (fileError.code === "ENOENT") {
        return response.status(404).json({ error: "Caso o plantilla no encontrada." })
      }

      if (error instanceof Error && error.message === "Formato de plantilla no soportado.") {
        return response.status(400).json({ error: error.message })
      }

      return response.status(500).json({ error: "No fue posible generar el formulario." })
    }
  }
}
