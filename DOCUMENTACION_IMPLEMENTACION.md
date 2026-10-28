# Documentación de implementación — Registro de proveedor

## 1. Propósito

La aplicación procesa una solicitud de registro de proveedor a partir de fixtures locales. Lee los campos exigidos por el cliente, los cruza contra el maestro de Periferia mediante un glosario de sinónimos, genera el formulario solicitado y permite descargarlo desde el chat.

## 2. Arquitectura

```text
Front React + Vite
  └─ Axios /api
       └─ Proxy Vite
            └─ Backend Express + TypeScript
                 ├─ Fixtures: solicitud, plantilla, glosario y maestro
                 ├─ Servicio proveedorService
                 └─ out/<caso>/formulario.xlsx
```

El front usa `VITE_API_URL=/api`. El proxy configurado en `front/vite.config.ts` redirige las solicitudes `/api` al backend en `http://localhost:4000`, evitando problemas de CORS durante desarrollo.

## 3. Estructura de datos

### Caso

Cada caso vive en:

```text
back/src/fixtures/casos/<caso>/
```

Archivos usados:

- `solicitud.json`: cliente, país y formato solicitado.
- `plantilla-celdas.json`: ubicación de etiquetas y valores para formatos Excel.
- `plantilla-campos.json`: campos ordenados para formatos PDF.
- `soportes-exigidos.json`: soportes solicitados por el cliente.

### Fuente de datos

```text
back/src/fixtures/
├─ glosario-campos.json
└─ repositorio/
   └─ maestro.json
```

`glosario-campos.json` convierte la etiqueta de cada plantilla en una ruta del maestro. Ejemplo:

```json
{
  "Correo electrónico": "contacto_comercial.email",
  "Banco": "banco.nombre"
}
```

El maestro contiene los valores verificables. No se crean valores que no existan allí.

## 4. Backend

### Servicio principal

Archivo: `back/src/services/proveedorService.ts`.

#### `leerSolicitud(caso)`

1. Valida que el identificador del caso solo contenga letras, números y guiones.
2. Lee `solicitud.json`, los soportes y la plantilla correspondiente.
3. Extrae las etiquetas requeridas por el cliente.
4. Lee el glosario y el maestro.
5. Mapea cada campo a uno de estos estados:
   - `lleno`: hay equivalencia en el glosario y valor verificable en el maestro.
   - `faltante`: no existe equivalencia o la ruta no tiene valor.
   - `requiere_confirmacion`: aplica una regla de país; por ejemplo, el maestro contiene NIT colombiano y el cliente solicita RUC o RTN.

La respuesta incluye país, cliente, formato, campos, soportes y el bloque `mapeo`.

#### `generarFormulario(caso)`

1. Reutiliza el contexto y el mapeo de `leerSolicitud`.
2. Crea `back/out/<caso>/` si no existe.
3. Según el formato:
   - `xlsx`: crea `formulario.xlsx` con ExcelJS. Escribe cada etiqueta en `celda_etiqueta` y el valor del maestro en `celda_valor`, dentro de la hoja indicada por `plantilla-celdas.json`.
   - `pdf`: crea `formulario.pdf` con PDFKit, respetando el orden de `plantilla-campos.json`.
   - `portal`: crea `valores-portal.md` y devuelve `formato no soportado`; no automatiza el envío ni el acceso al portal.

### Controlador

Archivo: `back/src/controlers/ProveedorController.ts`.

- `leerSolicitud`: obtiene el caso desde la URL y devuelve la consulta/mapeo.
- `generarFormulario`: genera el archivo y devuelve la ruta generada.
- `descargarFormulario`: busca `out/<caso>/formulario.xlsx` y usa `response.download()` para enviarlo con encabezados de descarga al navegador.

`descargarFormulario` valida el nombre de caso antes de construir la ruta para bloquear intentos de recorrer carpetas como `../../archivo`.

### Rutas

Archivo: `back/src/routes/ProveedorRoutes.ts`.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/proveedores/:caso/solicitud` | Lee la solicitud y devuelve el mapeo. |
| POST | `/api/proveedores/:caso/formulario` | Genera el formulario en `out/`. |
| GET | `/api/proveedores/:caso/formulario/descarga` | Descarga el Excel generado. |

### Ejemplo de flujo backend

Para `co-industrias-delta`:

1. `GET /api/proveedores/co-industrias-delta/solicitud` retorna el mapeo.
2. Si `mapeo.faltantes` y `mapeo.requiere_confirmacion` están vacíos, se ejecuta `POST /api/proveedores/co-industrias-delta/formulario`.
3. Se produce `back/out/co-industrias-delta/formulario.xlsx`.
4. `GET /api/proveedores/co-industrias-delta/formulario/descarga` entrega el archivo al navegador.

## 5. Frontend

### Servicio

Archivo: `front/src/services/prom.service.tsx`.

La función `PromData` recibe el texto escrito por la persona.

1. Busca el comando con la expresión `Procesa el caso <id>`.
2. Si encuentra un caso, solicita su información al endpoint `/proveedores/:caso/solicitud`.
3. Evalúa:

```ts
const hayPendientes =
  solicitud.mapeo.faltantes.length > 0 ||
  solicitud.mapeo.requiere_confirmacion.length > 0
```

4. Si hay pendientes, muestra la solicitud sin generar archivo.
5. Si no hay pendientes, llama `POST /proveedores/:caso/formulario`.
6. Devuelve un objeto con el texto de respuesta y `downloadUrl`:

```ts
{
  reply: "...",
  downloadUrl: "/api/proveedores/co-industrias-delta/formulario/descarga"
}
```

Las fallas de Axios se transforman en mensajes legibles usando `isAxiosError`.

### Chat

Archivo: `front/src/components/Generate.tsx`.

- Mantiene el historial local en el estado `messages`.
- Agrega el mensaje de usuario antes de enviar la petición.
- Agrega la respuesta del agente al resolver la solicitud.
- Deshabilita el formulario durante la petición.
- Muestra errores de conexión o errores devueltos por el backend.
- Cuando la respuesta tiene `downloadUrl`, renderiza el enlace **Descargar formulario**.
- Incluye una sugerencia inicial que carga en el input:

```text
Procesa el caso co-industrias-delta
```

La persona revisa el comando y presiona **Enviar** para ejecutar el flujo.

## 6. Instalación local

### Requisitos

- Node.js 22 o superior.
- npm incluido con Node.js.
- Una clave de OpenRouter solo si se utilizará el chat general con IA. El flujo de proveedor por fixtures no depende de OpenRouter.

### Backend

1. Abre una terminal y entra al backend:

```bash
cd C:\react\reto-final\back
```

2. Instala dependencias:

```bash
npm install
```

3. Crea el archivo `back/.env` con esta configuración:

```env
PORT=4000
FRONTEND_URL=http://localhost:5173
OPENROUTER_API_KEY=tu_clave_opcional_de_openrouter
```

4. Inicia el servidor:

```bash
npm run dev
```

El backend queda disponible en `http://localhost:4000`.

### Frontend

1. Abre una segunda terminal y entra al frontend:

```bash
cd C:\react\reto-final\front
```

2. Instala dependencias:

```bash
npm install
```

3. Crea o actualiza `front/.env`:

```env
VITE_API_URL=/api
```

4. Inicia Vite:

```bash
npm run dev
```

Vite mostrará una dirección similar a `http://localhost:5173`. El proxy configurado en `vite.config.ts` reenvía `/api` al backend en el puerto `4000`.

## 7. Prueba local

Con ambos proyectos activos, abre la URL de Vite. Haz clic en la sugerencia, o escribe:

```text
Procesa el caso co-industrias-delta
```

Resultado esperado:

1. El historial muestra los campos y soportes leídos.
2. Como no hay faltantes ni confirmaciones en el fixture de Colombia, el backend genera el Excel.
3. El historial muestra la ruta del archivo.
4. El botón **Descargar formulario** descarga `formulario.xlsx`.

### Prueba con Postman

Consultar y mapear:

```text
GET http://localhost:4000/api/proveedores/co-industrias-delta/solicitud
```

Generar formulario:

```text
POST http://localhost:4000/api/proveedores/co-industrias-delta/formulario
```

Descargar formulario:

```text
GET http://localhost:4000/api/proveedores/co-industrias-delta/formulario/descarga
```

## 7. Restricciones actuales

- El formulario Excel se construye desde la definición JSON de celdas; no parte de un archivo `.xlsx` original.
- La descarga actual está configurada para `formulario.xlsx`; para habilitar descargas PDF o Markdown se debe identificar el archivo por formato en el controlador.
- No hay envío, firma ni acceso automatizado a portales.
- El historial vive en memoria del navegador y se reinicia al recargar la página.
- OpenRouter se utiliza para mensajes generales del chat; la lectura, mapeo y generación de formularios son deterministas y no dependen del modelo.
