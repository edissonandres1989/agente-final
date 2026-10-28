# Backend básico de chat

Estructura basada en `task-bakend`:

```text
src/
├── config/
├── controlers/
│   └── ChatController.ts
├── cors/
│   └── cors.ts
├── emails/
├── mideware/
├── models/
├── routes/
│   └── ChatRoutes.ts
├── utils/
├── index.ts
└── server.ts
```

## Ejecutar

```bash
npm install
npm run dev
```

Copia `.env.example` a `.env` si necesitas cambiar puerto u origen del frontend.

## Endpoint

`POST http://localhost:4000/api/chat`

```json
{ "message": "Hola" }
```

Respuesta:

```json
{ "reply": "Mensaje recibido: Hola" }
```
