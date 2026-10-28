import axios, { isAxiosError } from "axios"
import type { ChatResponse, ErrorResponse, PromptDataInput } from "../models/chatModel"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

type CampoMapeado = {
  campo: string
  estado: "lleno" | "faltante" | "requiere_confirmacion"
  ruta_maestro?: string
  valor?: unknown
  motivo?: string
  propuesta?: string
}

type SolicitudResponse = {
  pais: string
  cliente: string
  formato: string
  campos: string[]
  soportes: string[]
  mapeo: {
    llenos: CampoMapeado[]
    faltantes: CampoMapeado[]
    requiere_confirmacion: CampoMapeado[]
  }
}

type FormularioResponse = {
  ruta: string
  formato: string
  error?: string
}

export type PromptResult = {
  reply: string
  downloadUrl?: string
}

function obtenerCaso(message: string): string | null {
  const resultado = message.match(/procesa(?:r)?\s+(?:el\s+)?caso\s+["“]?([\w-]+)["”]?/i)
  return resultado?.[1] ?? null
}

function formatearSolicitud(data: SolicitudResponse): string {
  return [
    `Solicitud leída para ${data.cliente}.`,
    `País: ${data.pais}`,
    `Formato: ${data.formato}`,
    "",
    "Campos solicitados:",
    ...data.campos.map((campo) => `- ${campo}`),
    "",
    "Soportes exigidos:",
    ...data.soportes.map((soporte) => `- ${soporte}`),
  ].join("\n")
}

export async function PromData({ message }: PromptDataInput): Promise<PromptResult> {
  try {
    const caso = obtenerCaso(message)

    if (caso) {
      const { data: solicitud } = await api.get<SolicitudResponse>(`/proveedores/${caso}/solicitud`)
      const hayPendientes = solicitud.mapeo.faltantes.length > 0 || solicitud.mapeo.requiere_confirmacion.length > 0

      if (hayPendientes) {
        return { reply: formatearSolicitud(solicitud) }
      }

      const { data: formulario } = await api.post<FormularioResponse>(`/proveedores/${caso}/formulario`)

      return {
        reply: [
          formatearSolicitud(solicitud),
          "",
          `Formulario generado: ${formulario.ruta}`,
          `Formato: ${formulario.formato}`,
        ].join("\n"),
        downloadUrl: `/api/proveedores/${caso}/formulario/descarga`,
      }
    }

    const { data } = await api.post<ChatResponse>("/chat", { message })
    return { reply: data.reply }
  } catch (error) {
    if (isAxiosError<ErrorResponse>(error) && error.response) {
      throw new Error(error.response.data.error)
    }

    throw new Error("No fue posible conectar con el servidor.")
  }
}
