const STORAGE_KEY = "ai-video-mvp-jobs";

export function getStoredJobs() {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addStoredJob(job) {
  const jobs = getStoredJobs();
  const existing = jobs.findIndex((j) => j.jobId === job.jobId);
  const entry = {
    ...job,
    createdAt: job.createdAt || new Date().toISOString(),
  };
  if (existing >= 0) {
    jobs[existing] = { ...jobs[existing], ...entry };
  } else {
    jobs.unshift(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 50)));
}

export function updateJobStatus(jobId, status) {
  const jobs = getStoredJobs();
  const idx = jobs.findIndex((j) => j.jobId === jobId);
  if (idx >= 0) {
    jobs[idx] = { ...jobs[idx], status };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }
}
