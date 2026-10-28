import { streamText } from "ai"
import { openRouter } from "../libs/ai"

export async function promptData(message: string): Promise<string> {
  const result = streamText({
    model: openRouter("nvidia/nemotron-3.5-lightning:free"),
    prompt: message,
  })

  return result.text
}
