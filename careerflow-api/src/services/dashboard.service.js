import Job from '../models/job.model.js'
import Interview from '../models/interview.model.js'
import { getApplicationPipeline, getDashboard } from './analytics.service.js'

const getDashboardOverview = async (userId) => {
  const now = new Date()

  const [activeJobsCount, totalInterviewsCount, pipeline, nextInterview, practice] =
    await Promise.all([
      Job.countDocuments({ user: userId, isDeleted: { $ne: true } }),
      Interview.countDocuments({ user: userId }),
      getApplicationPipeline(userId),
      Interview.findOne({
        user: userId,
        status: 'scheduled',
        scheduledDate: { $gte: now },
      })
        .sort({ scheduledDate: 1 })
        .populate({
          path: 'application',
          select: 'job',
          populate: { path: 'job', select: 'title company' },
        })
        .lean(),
      getDashboard(userId),
    ])

  const overview = {
    jobs: activeJobsCount,
    applications: pipeline?.totalApplications ?? 0,
    interviews: totalInterviewsCount,
    offers: pipeline?.byStatus?.offer ?? 0,
  }

  return {
    overview,
    pipeline: pipeline || { totalApplications: 0, byStatus: {} },
    nextInterview: nextInterview || null,
    practice: practice || null,
  }
}

export { getDashboardOverview }
