import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createLocalStore } from './localStore.js'
import { createSupabaseStore } from './supabaseStore.js'
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
})
const {
  DATA_MODE = 'local',
  FRONTEND_ORIGIN = 'http://localhost:5173',
  PORT = '3001',
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} = process.env
if (!['local', 'supabase'].includes(DATA_MODE))
  throw new Error('DATA_MODE must be local or supabase.')
if (!/^\d+$/.test(PORT) || +PORT < 1 || +PORT > 65535)
  throw new Error('Invalid PORT.')
const store =
  DATA_MODE === 'supabase'
    ? createSupabaseStore(SUPABASE_URL, SUPABASE_ANON_KEY)
    : await createLocalStore(
        fileURLToPath(new URL('./data/builds.json', import.meta.url)),
      )
const app = createApp({ store, frontendOrigin: FRONTEND_ORIGIN })
app.listen(+PORT, DATA_MODE === 'local' ? '127.0.0.1' : '0.0.0.0', () =>
  console.log(`ModMyCar API: http://localhost:${PORT} (${DATA_MODE})`),
)
