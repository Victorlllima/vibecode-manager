/**
 * google-calendar.js
 * Integração com Google Calendar para o Polaris (Squad Leader)
 *
 * Setup (uma única vez):
 * 1. Crie um projeto em https://console.cloud.google.com
 * 2. Habilite a Google Calendar API
 * 3. Crie credenciais OAuth2 (tipo: Desktop App)
 * 4. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env
 * 5. Rode: node google-auth.js  (gera o GOOGLE_REFRESH_TOKEN)
 * 6. Adicione o GOOGLE_REFRESH_TOKEN no .env
 */

const { google } = require('googleapis')

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google Calendar não configurado. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN no .env')
  }

  const auth = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob' // redirect URI para Desktop App
  )

  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
  return auth
}

/**
 * Busca eventos do Google Calendar
 * @param {Object} options
 * @param {string} options.timeMin - ISO string do início (default: hoje 00:00)
 * @param {string} options.timeMax - ISO string do fim (default: hoje 23:59)
 * @param {number} options.maxResults - Máximo de eventos (default: 20)
 * @param {string} options.calendarId - ID do calendário (default: 'primary')
 */
async function getEvents({ timeMin, timeMax, maxResults = 20, calendarId = 'primary' } = {}) {
  const auth = getOAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()

  // Default: hoje inteiro
  if (!timeMin) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    timeMin = start.toISOString()
  }
  if (!timeMax) {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    timeMax = end.toISOString()
  }

  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (response.data.items || []).map(event => ({
    id: event.id,
    title: event.summary || '(sem título)',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || null,
    description: event.description || null,
    isAllDay: !!event.start?.date && !event.start?.dateTime,
    meetLink: event.hangoutLink || null,
    status: event.status,
  }))
}

/**
 * Busca eventos de uma semana específica ou próximos N dias
 */
async function getUpcomingEvents(days = 7, calendarId = 'primary') {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + days)

  return getEvents({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    maxResults: 50,
    calendarId,
  })
}

/**
 * Cria um evento no Google Calendar
 */
async function createEvent({ title, startDateTime, endDateTime, description, location, calendarId = 'primary' }) {
  const auth = getOAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const event = {
    summary: title,
    description: description || undefined,
    location: location || undefined,
    start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' },
  }

  const response = await calendar.events.insert({
    calendarId,
    resource: event,
  })

  return {
    id: response.data.id,
    title: response.data.summary,
    start: response.data.start?.dateTime,
    end: response.data.end?.dateTime,
    link: response.data.htmlLink,
  }
}

/**
 * Lista os calendários disponíveis na conta do usuário
 */
async function listCalendars() {
  const auth = getOAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.calendarList.list()
  return (response.data.items || []).map(cal => ({
    id: cal.id,
    name: cal.summary,
    primary: !!cal.primary,
    color: cal.backgroundColor,
  }))
}

module.exports = { getEvents, getUpcomingEvents, createEvent, listCalendars }
