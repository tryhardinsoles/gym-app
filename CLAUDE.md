# Tryhard Training App

App de entrenamiento para alumnos (rutinas, agenda de llamadas, performance) con panel admin.

## Reglas de trabajo
- Cambios modulares: leer solo los archivos que toca el pedido; usar este documento para ubicarlos.
- Deploy: `git push origin main` → Render autodeploya (~2-3 min). URL: https://gym-app-5yh1.onrender.com
- Si cambia `server/prisma/schema.prisma`: correr `cd server && npx prisma db push` (contra Neon) ANTES del push.
- El server sirve el build del cliente (`client/dist/`) en producción.

## Stack
- Frontend `client/src/`: React 18, Vite, React Router v6, Axios, Tailwind, Recharts.
- Backend `server/src/`: Node + Express, Prisma, PostgreSQL (Neon), JWT, Resend (email).
- Entrada: `server/src/index.js` (puerto 3001 en dev o `PORT`).

## Base de datos (`server/prisma/schema.prisma`)
- **User**: id (cuid), username (único), password (texto plano), isAdmin, plan ("start"|"performance", default start), createdAt. Relaciones: routines, workoutSessions, wellbeingLogs, agendaBookings, exerciseLogs.
- **Routine**: id, userId, name ("Dia 1"), order, mes (default 1), completedAt (null = pendiente).
- **RoutineSection**: id, routineId, name, order.
- **Exercise**: id, sectionId, name, repetitions (String), weight (String?), series (Int), youtubeUrl?, order. weight/repetitions son String ("10 kg", "8-12", "AMRAP").
- **WorkoutSession**: id, userId, routineId, completedAt (null = en progreso), createdAt. Rel: feedbacks, exerciseLogs.
- **ExerciseFeedback**: id, exerciseId, sessionId, feedback ("green"|"yellow"|"red"), createdAt. Unique [exerciseId, sessionId].
- **ExerciseLog**: id, userId, exerciseId, sessionId, exerciseName, weight (Float? parseado), reps (Int? primer número), series, loggedAt (= completedAt sesión). Unique [exerciseId, sessionId].
- **AgendaSlot**: id, dayOfWeek (0-6), time ("HH:MM"), googleMeetUrl?, isActive, createdAt. Unique [dayOfWeek, time].
- **AgendaBooking**: id, userId, slotId, weekStart (DateTime UTC, lunes), meetUrl?, createdAt. Unique [slotId, weekStart]. weekStart sale del weekKey "YYYY-MM-DD" (lunes local) que manda el cliente.
- **WellbeingLog**: id, userId, score (1-10), createdAt.

## API (`server/src/routes/`)
Auth: middleware `requireAuth` (Bearer JWT, payload {id, username, isAdmin}). El plan NO está en el JWT: consultarlo en DB.

- `auth.js` — POST /api/auth/login → JWT 7d + {id, username, isAdmin}.
- `routines.js` — GET /api/routines/current (primera pendiente, precarga pesos del último entreno con mismo nombre, crea/recupera WorkoutSession) · GET /has-pending · GET /history · PATCH /exercises/:id (weight/repetitions, ownership).
- `workouts.js` — POST /api/workouts/:sessionId/feedback (upsert) · POST /:sessionId/complete (completa sesión+rutina y crea ExerciseLogs) · GET /last-completed.
- `performance.js` — GET /api/performance → {plan, exercises:[{id, name, logs:[{date "DD/MM", weight, volume}]}]}; agrupa por nombre lowercase/trim; volume = reps × series.
- `wellbeing.js` — POST /api/wellbeing (score 1-10).
- `agenda.js` (alumno) — GET /api/agenda?weekKey= → {slots, myBookings(+slot), plan, maxCalls, weekKey, bookedSlotIds (todos los usuarios)} · POST /book/:slotId (límite start=1, performance=3; email a admin vía Resend) · DELETE /booking/:id.
- `agenda.js` (admin) — GET/POST /api/agenda/admin/slots · POST /admin/slots/range (día, desde, hasta, intervalo min) · PATCH/DELETE /admin/slots/:id · GET /admin/bookings?weekKey=.
- `admin.js` — /api/admin/users (GET sin admins, POST) · PUT/DELETE /users/:id (plan validado) · GET/POST /users/:id/routines · PUT /routines/:id (reemplaza; propaga cambios de nombre a rutinas futuras) · POST /users/:id/import-csv (12 días, nuevo mes) · POST /users/:id/import-from-sheet · POST /import-from-sheets (hoja maestra username + sheet_url) · POST /users/:id/generate-routines (12 rutinas desde CSV + nivel/impacto/tipo/patrones) · PATCH /routines/:id/reset · DELETE /routines/:id · DELETE /users/:id/routines · PATCH /exercises/:id · GET /users/:userId/stats · GET /routines/:id/play-data · GET /youtube-search?q= (sin YOUTUBE_API_KEY devuelve link de búsqueda).

## Frontend (`client/src/`)
Router: `App.jsx`.
- `pages/Login.jsx` (/login) — admin → /admin/dashboard, alumno → /.
- `pages/Home.jsx` (/) — estado wellbeing, lastCompleted, hasPending, history. Sin pendiente: cita (`data/quotes.js`) + historial. Con pendiente: bienvenida (`data/messages.js`; "recentlyCompleted" si < 8 h), WellbeingScale, "Comenzar Rutina" → /routine, historial por mes.
- `pages/Routine.jsx` (/routine y /admin/users/:id/routines/:id/play con prop `adminPlay`) — full-screen; video YouTube 35% arriba (autoplay muted), secciones 65% abajo; navegación por bloques, "Finalizar" → POST complete → ConfettiScreen; vista overview en grid.
- `pages/Agenda.jsx` (/agenda) — semanas por weekKey; slots por día Lun→Dom. Botón Meet activo si diff ∈ [−6, +40] min (timer 10 s). Slots pasados opacidad 35%, badges "Reservado"/"Límite alcanzado". meetLink = `b.meetUrl || b.slot.googleMeetUrl`.
- `pages/Performance.jsx` (/performance) — solo plan performance (si start: pantalla upgrade). Chips de ejercicios; LineChart fuerza (#e01020, kg) y BarChart volumen (#3b82f6); toggle eje X Fecha / N° de clase; Y domain [dataMin*0.85, dataMax*1.1].
- Admin `pages/admin/`: `AdminDashboard.jsx` (alumnos, crear/borrar, ver contraseñas, links a import y agenda) · `UserDetail.jsx` (rutinas por mes, acciones, selector de plan → PUT user, stats) · `RoutineEditor.jsx` (5 secciones fijas: Entrada en calor, Bloque 1–4; youtubeUrl auto al salir del nombre) · `AdminAgenda.jsx` (alta por rango o individual, activar/desactivar, Meet por slot, reservas de la semana) · `UserStats.jsx` · `GenerateRoutines.jsx` · `ImportFromSheets.jsx`.

## Componentes
- `Sidebar.jsx` — drawer z-50; nav Entrenamientos (/), Agenda, Performance; props isOpen, onClose, user, logout (no recibe plan).
- `ExerciseRow.jsx` — nombre clicable (glow rojo) activa video; inputs inline weight/series (guardan en blur); badge de feedback.
- `WellbeingScale.jsx` — 1-10; 1-3 rojo, 4-6 amarillo, 7-10 verde.
- `ConfettiScreen.jsx` — celebración; "Volver" y opcional "Entrenar de nuevo".
- `ProtectedRoute.jsx` — sin token → /login; `adminOnly` y no admin → /.
- `AuthContext.jsx` — {user, token, login, logout, loading}; user en localStorage = {id, username, isAdmin}.

## Diseño (`client/tailwind.config.js`, `client/src/index.css`)
Dark-only. Fuente Outfit (fallback Inter). brand-500 #e01020, brand-400 #ff2a35, brand-600 #b3000e; gray-950 #080808 (fondo), 900 #111111 (cards), 800 #1f1f1f (bordes), 700 #3a3a3a.
Clases: `.btn-primary` (brand-500, rounded-2xl, w-full) · `.btn-secondary` (gray-800) · `.card` (gray-900, border gray-800, rounded-3xl, p-6) · `.input-field` (gray-800, rounded-2xl, px-4 py-4, text-lg) · `.exercise-name` (glow rojo).

## Variables de entorno (`server/.env`)
DATABASE_URL (Neon pooler), JWT_SECRET, PORT, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL (avisos de reservas), RESEND_API_KEY (vacío = sin emails), YOUTUBE_API_KEY (opcional), GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID. Los Meet no se generan por API (Gmail personal); se cargan a mano por slot en el admin.
