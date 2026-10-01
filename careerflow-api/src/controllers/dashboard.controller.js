import catchAsync from '../utils/catchAsync.js'
import * as dashboardService from '../services/dashboard.service.js'

const getOverview = catchAsync(async (req, res) => {
  const data = await dashboardService.getDashboardOverview(req.user.userId)

  res.status(200).json({
    success: true,
    data,
  })
})

export { getOverview }
