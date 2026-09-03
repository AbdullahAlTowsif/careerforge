import { JobOpportunity } from "./jobOpportunity.model.js";
import AppError from "../../errorHelpers/AppError.js";
import type { QueryJobsInput } from "./jobOpportunity.validation.js";

const listJobs = async (filters: QueryJobsInput) => {
  const query: Record<string, unknown> = {};

  if (filters.track) {
    query.track = filters.track;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.location) {
    query.location = { $regex: filters.location, $options: "i" };
  }

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: "i" } },
      { company: { $regex: filters.search, $options: "i" } },
    ];
  }

  const jobs = await JobOpportunity.find(query).sort({ createdAt: -1 });
  return jobs;
};

const getJobById = async (id: string) => {
  const job = await JobOpportunity.findById(id);
  if (!job) {
    throw new AppError(404, "Job not found");
  }
  return job;
};

export const JobOpportunityServices = {
  listJobs,
  getJobById,
};
