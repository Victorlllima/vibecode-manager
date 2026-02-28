/**
 * google-auth.js
 * Script de autorização OAuth2 — rode UMA vez para gerar o refresh_token.
 *
 * Uso:
 *   node api/google-auth.js
 *
 * Ele vai:
 * 1. Mostrar uma URL para você abrir no browser
 * 2. Você autoriza com sua conta Google
 * 3. Copia o código que aparece
 * 4. Cola aqui no terminal
 * 5. O script imprime o GOOGLE_REFRESH_TOKEN — copie para o .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { google } = require('googleapis')
const readline = require('readline')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no api/.env antes de rodar este script.')
  process.exit(1)
}

const auth = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

const authUrl = auth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // força retorno do refresh_token
  scope: SCOPES,
})

console.log('\n🌟 Polaris — Autorização Google Calendar\n')
console.log('1. Abra esta URL no browser:\n')
console.log(authUrl)
console.log('\n2. Autorize com sua conta Google')
console.log('3. Copie o código que aparecer na página\n')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('Cole o código aqui: ', async (code) => {
  rl.close()
  try {
    const { tokens } = await auth.getToken(code.trim())

    console.log('\n✅ Autorização bem-sucedida!\n')
    console.log('Adicione no api/.env:\n')
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log('\nDepois reinicie a API no Hetzner:')
    console.log('  pm2 restart rvm-api')

    if (!tokens.refresh_token) {
      console.log('\n⚠️  Refresh token não retornado. Acesse:')
      console.log('https://myaccount.google.com/permissions')
      console.log('Revogue o acesso do app e rode este script novamente.')
    }
  } catch (err) {
    console.error('\n❌ Erro:', err.message)
  }
})
