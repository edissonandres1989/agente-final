import { Router } from "express"
import { ChatController } from "../controlers/ChatController"

const router = Router()

router.post("/", ChatController.receiveMessage)

export default router
