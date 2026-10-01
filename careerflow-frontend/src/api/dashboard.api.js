import { request } from './client.js'

export const getDashboardOverviewApi = () =>
  request({ path: '/dashboard/overview', method: 'GET' })
