import { Router } from "express"
import { ProveedorController } from "../controlers/ProveedorController"

const router = Router()

router.get("/:caso/solicitud", ProveedorController.leerSolicitud)
router.get("/:caso/formulario/descarga", ProveedorController.descargarFormulario)
router.post("/:caso/formulario", ProveedorController.generarFormulario)

export default router
