import { request } from './client.js'

// Backend AI analysis contract:
//   GET /api/ai-analyses -> { success, data: { analyses } }
//     analyses items have `job` populated with `_id title company` and the match fields.

export const listAnalysesApi = () => request({ path: '/ai-analyses', method: 'GET' })
