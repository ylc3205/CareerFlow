import { request } from './client.js'

// Backend analytics contract (all read-only, JWT protected, no AI calls):
//   GET /analytics/history?status=&interview=&page=&limit= -> { success, data: { sessions, pagination } }
//     history session item: { _id, status, interview: { _id, title, type,
//       scheduledDate, status } | null, job: { _id, title, company } | null,
//       answeredCount, totalQuestions, summary | null, completedAt, createdAt, updatedAt }
//   GET /analytics/dashboard -> { success, data: { dashboard } }
//     dashboard: { totals: { totalSessions, completedSessions, inProgressSessions,
//       notStartedSessions, answeredQuestions, totalQuestions },
//       averages: { overallScore, technicalScore, communicationScore,
//         behavioralScore, sessionsCount } (null when none),
//       bestSession: { sessionId, overallScore, completedAt, interview, job } | null,
//       recentSessions: [...], trend: [...],
//       strongAreas: [{ area, count }], weakAreas: [{ area, count }] }
//   GET /analytics/trends   -> { success, data: { trends: { completedCount, trend } } }
//   GET /analytics/areas?limit=N -> { success, data: { areas: { strongAreas, weakAreas } } }
//   GET /analytics/performance -> { success, data: { performance: {
//       totalEvaluations, averages, averageAttemptsPerQuestion,
//       byCategory: { technical, behavioral, situational: { count, averageScore } } } }
//   GET /analytics/applications/pipeline -> { success, data: { pipeline: { totalApplications, byStatus } } }

export const getAnalyticsDashboardApi = () =>
  request({ path: '/analytics/dashboard', method: 'GET' })

export const getAnalyticsHistoryApi = (params = {}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  const qs = query.toString()
  return request({ path: `/analytics/history${qs ? `?${qs}` : ''}`, method: 'GET' })
}

export const getAnalyticsTrendsApi = () =>
  request({ path: '/analytics/trends', method: 'GET' })

export const getAnalyticsAreasApi = (limit = 5) =>
  request({ path: `/analytics/areas?limit=${limit}`, method: 'GET' })

export const getAnalyticsPerformanceApi = () =>
  request({ path: '/analytics/performance', method: 'GET' })

export const getApplicationPipelineApi = () =>
  request({ path: '/analytics/applications/pipeline', method: 'GET' })