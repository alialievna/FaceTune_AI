"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Film, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStoredJobs, updateJobStatus } from "@/lib/storage";
import { API_URL } from "@/lib/utils";

export default function VideosPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = () => {
    setJobs(getStoredJobs());
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const refreshStatus = async (jobId) => {
    try {
      const res = await fetch(`${API_URL}/status/${jobId}`);
      const data = await res.json();
      updateJobStatus(jobId, data.status);
      setJobs((prev) =>
        prev.map((j) =>
          j.jobId === jobId ? { ...j, status: data.status } : j
        )
      );
    } catch {
      //
    }
  };

  const getBadgeVariant = (status) => {
    switch (status) {
      case "done":
        return "done";
      case "failed":
        return "failed";
      case "processing":
        return "processing";
      default:
        return "pending";
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-zinc-100">My Videos</h1>
        <p className="mt-1 text-zinc-400">
          View and download your processed videos
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Videos</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchJobs}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-2xl bg-zinc-800/50 p-6">
                  <Film className="h-16 w-16 text-zinc-600" />
                </div>
                <p className="text-lg font-medium text-zinc-300">No videos yet</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Create your first video to see it here
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job, i) => (
                  <motion.div
                    key={job.jobId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    className="group overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/50 transition-all duration-300 hover:border-zinc-700/50 hover:shadow-lg hover:shadow-purple-500/5"
                  >
                    <div className="flex aspect-video items-center justify-center bg-zinc-800/50">
                      {job.status === "done" ? (
                        <video
                          src={`${API_URL}/stream/${job.jobId}`}
                          controls
                          className="h-full w-full rounded-none"
                        />
                      ) : (
                        <Film className="h-12 w-12 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-zinc-500">
                          {job.jobId?.slice(0, 8)}...
                        </span>
                        <Badge variant={getBadgeVariant(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleString()
                          : "—"}
                      </p>
                      {job.status === "done" && (
                        <div className="flex gap-2">
                          <a
                            href={`${API_URL}/download/${job.jobId}`}
                            download="output.mp4"
                            className="flex-1"
                          >
                            <Button size="sm" className="w-full">
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </a>
                        </div>
                      )}
                      {(job.status === "pending" || job.status === "processing") && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => refreshStatus(job.jobId)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Check Status
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
