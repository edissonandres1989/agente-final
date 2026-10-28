import { createWriteStream } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import ExcelJS from "exceljs"
import PDFDocument from "pdfkit"

type Formato = "xlsx" | "pdf" | "portal"
type Maestro = Record<string, unknown>
type Glosario = Record<string, string>

type Solicitud = {
  pais: string
  cliente: string
  formato: Formato
}

type CampoExcel = {
  hoja: string
  celda_etiqueta: string
  etiqueta: string
  celda_valor: string
}

type CampoPdf = {
  etiqueta: string
  obligatorio: boolean
}

type CampoLleno = {
  campo: string
  estado: "lleno"
  ruta_maestro: string
  valor: unknown
}

type CampoFaltante = {
  campo: string
  estado: "faltante"
  ruta_maestro?: string
  motivo: string
}

type CampoConfirmacion = {
  campo: string
  estado: "requiere_confirmacion"
  ruta_maestro: string
  motivo: string
  propuesta: string
}

type Mapeo = {
  llenos: CampoLleno[]
  faltantes: CampoFaltante[]
  requiere_confirmacion: CampoConfirmacion[]
}

const identificadoresPorPais: Record<string, string> = {
  CO: "NIT",
  EC: "RUC",
  PE: "RUC",
  PA: "RUC",
  HN: "RTN",
}

const projectDirectory = process.cwd()
const fixturesDirectory = path.join(projectDirectory, "src", "fixtures")
const casosDirectory = path.join(fixturesDirectory, "casos")
const maestroPath = path.join(fixturesDirectory, "repositorio", "maestro.json")
const glosarioPath = path.join(fixturesDirectory, "glosario-campos.json")
const outDirectory = path.join(projectDirectory, "out")

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8")
  return JSON.parse(content) as T
}

function getValueByPath(data: Maestro, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined
    }

    return (current as Record<string, unknown>)[key]
  }, data)
}

function validarCaso(caso: string) {
  if (!/^[a-z0-9-]+$/i.test(caso)) {
    throw new Error("Nombre de caso no válido.")
  }
}

function valorTexto(valor: unknown): string {
  return typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean"
    ? String(valor)
    : ""
}

async function obtenerCampos(caso: string, formato: Formato): Promise<string[]> {
  const caseDirectory = path.join(casosDirectory, caso)

  if (formato === "xlsx") {
    const plantilla = await readJson<CampoExcel[]>(path.join(caseDirectory, "plantilla-celdas.json"))
    return plantilla.map((campo) => campo.etiqueta)
  }

  if (formato === "pdf") {
    const plantilla = await readJson<CampoPdf[]>(path.join(caseDirectory, "plantilla-campos.json"))
    return plantilla.map((campo) => campo.etiqueta)
  }

  return []
}

async function construirMapeo(campos: string[], solicitud: Solicitud): Promise<Mapeo> {
  const [maestro, glosario] = await Promise.all([
    readJson<Maestro>(maestroPath),
    readJson<Glosario>(glosarioPath),
  ])

  const llenos: CampoLleno[] = []
  const faltantes: CampoFaltante[] = []
  const requiere_confirmacion: CampoConfirmacion[] = []

  for (const campo of campos) {
    const rutaMaestro = glosario[campo]

    if (!rutaMaestro) {
      faltantes.push({ campo, estado: "faltante", motivo: "No existe una equivalencia para el campo en el glosario." })
      continue
    }

    if (rutaMaestro === "nit" && solicitud.pais !== "CO") {
      requiere_confirmacion.push({
        campo,
        estado: "requiere_confirmacion",
        ruta_maestro: rutaMaestro,
        motivo: "Identificador extranjero: el maestro solo contiene NIT colombiano.",
        propuesta: identificadoresPorPais[solicitud.pais] ?? "Identificador tributario por confirmar",
      })
      continue
    }

    const valor = getValueByPath(maestro, rutaMaestro)

    if (valor === undefined || valor === null || valor === "") {
      faltantes.push({
        campo,
        estado: "faltante",
        ruta_maestro: rutaMaestro,
        motivo: "La ruta existe, pero no tiene un valor verificable en el maestro.",
      })
      continue
    }

    llenos.push({ campo, estado: "lleno", ruta_maestro: rutaMaestro, valor })
  }

  return { llenos, faltantes, requiere_confirmacion }
}

async function leerContextoCaso(caso: string) {
  validarCaso(caso)

  const caseDirectory = path.join(casosDirectory, caso)
  const solicitud = await readJson<Solicitud>(path.join(caseDirectory, "solicitud.json"))
  const soportes = await readJson<string[]>(path.join(caseDirectory, "soportes-exigidos.json"))
  const campos = await obtenerCampos(caso, solicitud.formato)
  const mapeo = await construirMapeo(campos, solicitud)

  return { caseDirectory, solicitud, soportes, campos, mapeo }
}

export async function leerSolicitud(caso: string) {
  const { solicitud, soportes, campos, mapeo } = await leerContextoCaso(caso)

  return {
    pais: solicitud.pais,
    cliente: solicitud.cliente,
    formato: solicitud.formato,
    campos,
    soportes,
    mapeo,
  }
}

async function generarExcel(caso: string, plantilla: CampoExcel[], mapeo: Mapeo, rutaSalida: string) {
  const valores = new Map(mapeo.llenos.map((campo) => [campo.campo, valorTexto(campo.valor)]))
  const workbook = new ExcelJS.Workbook()

  for (const campo of plantilla) {
    const worksheet = workbook.getWorksheet(campo.hoja) ?? workbook.addWorksheet(campo.hoja)
    worksheet.getCell(campo.celda_etiqueta).value = campo.etiqueta
    worksheet.getCell(campo.celda_valor).value = valores.get(campo.etiqueta) ?? ""
  }

  await workbook.xlsx.writeFile(rutaSalida)
}

async function generarPdf(plantilla: CampoPdf[], mapeo: Mapeo, rutaSalida: string) {
  const valores = new Map(mapeo.llenos.map((campo) => [campo.campo, valorTexto(campo.valor)]))
  const document = new PDFDocument({ margin: 50 })
  const output = createWriteStream(rutaSalida)
  document.pipe(output)
  document.fontSize(18).text("Formulario de registro como proveedor")
  document.moveDown()

  for (const campo of plantilla) {
    document.fontSize(11).text(`${campo.etiqueta}: ${valores.get(campo.etiqueta) ?? ""}`)
    document.moveDown(0.5)
  }

  document.end()

  await new Promise<void>((resolve, reject) => {
    output.on("finish", resolve)
    output.on("error", reject)
  })
}

async function generarValoresPortal(campos: string[], mapeo: Mapeo, rutaSalida: string) {
  const valores = new Map(mapeo.llenos.map((campo) => [campo.campo, valorTexto(campo.valor)]))
  const contenido = [
    "# Valores para portal",
    "",
    ...campos.map((campo) => `- ${campo}: ${valores.get(campo) ?? ""}`),
  ].join("\n")

  await writeFile(rutaSalida, contenido, "utf8")
}

export async function generarFormulario(caso: string) {
  const { caseDirectory, solicitud, campos, mapeo } = await leerContextoCaso(caso)
  const caseOutDirectory = path.join(outDirectory, caso)
  await mkdir(caseOutDirectory, { recursive: true })

  if (solicitud.formato === "xlsx") {
    const plantilla = await readJson<CampoExcel[]>(path.join(caseDirectory, "plantilla-celdas.json"))
    const ruta = path.join(caseOutDirectory, "formulario.xlsx")
    await generarExcel(caso, plantilla, mapeo, ruta)
    return { ruta: path.relative(projectDirectory, ruta), formato: "xlsx", mapeo }
  }

  if (solicitud.formato === "pdf") {
    const plantilla = await readJson<CampoPdf[]>(path.join(caseDirectory, "plantilla-campos.json"))
    const ruta = path.join(caseOutDirectory, "formulario.pdf")
    await generarPdf(plantilla, mapeo, ruta)
    return { ruta: path.relative(projectDirectory, ruta), formato: "pdf", mapeo }
  }

  if (solicitud.formato === "portal") {
    const ruta = path.join(caseOutDirectory, "valores-portal.md")
    await generarValoresPortal(campos, mapeo, ruta)
    return {
      ruta: path.relative(projectDirectory, ruta),
      formato: "portal",
      error: "formato no soportado",
      mapeo,
    }
  }

  throw new Error("Formato de plantilla no soportado.")
}
