import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { PromData } from "../services/prom.service"
import type { PromptDataInput } from "../models/chatModel"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  downloadUrl?: string
}

export const Generate = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PromptDataInput>()

  const { mutate, isPending, error } = useMutation({
    mutationFn: PromData,
    onSuccess: ({ reply, downloadUrl }) => {
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: crypto.randomUUID(), role: "assistant", content: reply, downloadUrl },
      ])
    },
  })

  const onSubmit = (data: PromptDataInput) => {
    const message = data.message.trim()
    if (!message || isPending) return

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: crypto.randomUUID(), role: "user", content: message },
    ])
    reset()
    mutate({ message })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#212121] text-white">
      <header className="border-b border-white/10 p-4">
        <h1 className="text-lg font-semibold">Agente Periferia</h1>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8">
        <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4">
          {messages.length === 0 && (
            <div className="my-auto text-center">
              <h2 className="text-3xl font-semibold">¿En qué puedo ayudarte?</h2>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setValue("message", "Procesa el caso co-industrias-delta")}
                className="mt-5 rounded-full border border-white/20 px-4 py-2 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50"
              >
                Procesa el caso co-industrias-delta
              </button>
            </div>
          )}

          {messages.map((chatMessage) => (
            <article
              key={chatMessage.id}
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-4 ${
                chatMessage.role === "user"
                  ? "ml-auto bg-blue-600"
                  : "mr-auto bg-[#303030]"
              }`}
            >
              {chatMessage.content}
              {chatMessage.downloadUrl && (
                <a
                  href={chatMessage.downloadUrl}
                  download
                  className="mt-3 inline-block rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-gray-200"
                >
                  Descargar formulario
                </a>
              )}
            </article>
          ))}

          {isPending && <p className="text-sm text-gray-400">Generando respuesta...</p>}
          {error && <p className="text-sm text-red-400">Error: {error.message}</p>}
        </section>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto mt-6 flex w-full max-w-2xl items-center gap-3 rounded-3xl bg-[#303030] p-3"
        >
          <input
            type="text"
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent p-2 outline-none placeholder:text-gray-400"
            disabled={isPending}
            {...register("message", { required: "Escribe un mensaje antes de enviar" })}
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-white p-3 text-black hover:bg-gray-200 disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
        {errors.message && <p className="mx-auto mt-2 w-full max-w-2xl text-sm text-red-400">{errors.message.message}</p>}
      </main>
    </div>
  )
}
