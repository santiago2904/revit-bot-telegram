# 📚 Bot de Seguimiento de Curso — Telegram + NestJS

Bot de Telegram que envía recordatorios diarios a usuarios para que avancen en un curso. Los usuarios responden con lenguaje natural ("ya avancé", "listo") y los recordatorios se detienen por ese día.

## Configuración

### 1. Crear el bot en Telegram

1. Abre Telegram → busca **@BotFather**
2. Envía `/newbot` → sigue las instrucciones → copia el token
3. (Opcional) Envía `/setuserpic` a BotFather para poner imagen personalizada al bot
4. (Opcional) Envía `/setdescription` para la descripción del bot

### 2. Obtener tu Chat ID

1. Inicia el bot y envía `/start`
2. El bot te responderá con tu chat ID

### 3. Instalar y ejecutar

```bash
npm install

cp .env.example .env
# Edita .env:
#   TELEGRAM_BOT_TOKEN=tu-token-aquí
#   ADMIN_CHAT_ID=tu-chat-id-aquí

mkdir -p data media/reminders media/celebrations

npm run start:dev
```

### 4. Agregar imágenes (opcional)

Coloca imágenes en estas carpetas para que el bot las envíe:

- `media/reminders/` — Imágenes que acompañan los recordatorios
- `media/celebrations/` — Imágenes de celebración cuando el usuario avanza

Formatos soportados: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

## Comandos

### Comandos de Admin

| Comando | Descripción | Ejemplo de respuesta |
|---------|-------------|---------------------|
| `/start` | Menú de admin | 👋 ¡Hola Admin! + lista de comandos |
| `/agregar 123456` | Agregar usuario al seguimiento | ✅ Usuario `123456` agregado |
| `/quitar 123456` | Quitar usuario del seguimiento | ❌ Usuario `123456` removido |
| `/lista` | Ver todos los usuarios | 📋 🟢 `123456` — Juan |
| `/estado` | Ver quién avanzó hoy | 📊 ✅ Juan / ⏳ María |
| `/recordar 123456` | Enviar recordatorio manual | 🔔 Recordatorio enviado |

### Respuestas del Usuario

El bot detecta frases en español como:
- "ya avancé", "avancé", "listo", "hecho"
- "ya estudié", "ya terminé", "ya lo hice"
- "ya le avancé", "completé", "ya acabé"

**Respuesta:** Mensaje motivacional + imagen de celebración 🎉

## Recordatorios Automáticos

| Hora | Mensaje |
|------|---------|
| 9:00 AM | ☀️ ¡Buenos días! No olvides avanzar en tu curso hoy. |
| 2:00 PM | 📚 ¿Ya avanzaste hoy? ¡Aún tienes tiempo! |
| 8:00 PM | 🌙 Última llamada del día. ¿Lograste avanzar? |

> Los recordatorios **solo se envían a usuarios que NO han registrado avance ese día**.

## Estructura del Proyecto

```
src/
├── main.ts                         # Bootstrap (sin HTTP, solo bot)
├── app.module.ts                   # Módulo raíz
├── common/
│   ├── entities/                   # TrackedUser + DailyProgress
│   └── utils/                      # date.utils.ts + nlp.utils.ts
├── user/
│   ├── user.module.ts
│   └── user.service.ts             # CRUD usuarios + consultas de progreso
├── bot/
│   ├── bot.module.ts
│   └── bot.service.ts              # Comandos + detección lenguaje natural
└── scheduler/
    ├── scheduler.module.ts
    └── scheduler.service.ts        # 3 cron jobs con skip inteligente

media/
├── reminders/                      # Imágenes para recordatorios
└── celebrations/                   # Imágenes para celebraciones
```

## Personalizar imagen del bot

La imagen de perfil del bot se configura directamente con BotFather:

1. Abre chat con @BotFather
2. Envía `/setuserpic`
3. Selecciona tu bot
4. Envía la imagen que quieras usar
