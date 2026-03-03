"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Film, Sparkles, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoredJobs } from "@/lib/storage";

export default function DashboardPage() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    setJobs(getStoredJobs());
  }, []);

  const totalRenders = jobs.length;
  const doneCount = jobs.filter((j) => j.status === "done").length;
  const lastJob = jobs[0];

  const cards = [
    {
      title: "Total Renders",
      value: totalRenders,
      icon: Film,
      gradient: "from-purple-600/20 to-indigo-600/20",
    },
    {
      title: "Completed",
      value: doneCount,
      icon: Sparkles,
      gradient: "from-emerald-600/20 to-teal-600/20",
    },
    {
      title: "Remaining Credits",
      value: "∞",
      icon: TrendingUp,
      gradient: "from-blue-600/20 to-cyan-600/20",
    },
    {
      title: "Last Processed",
      value: lastJob
        ? new Date(lastJob.createdAt).toLocaleDateString()
        : "—",
      icon: Clock,
      gradient: "from-amber-600/20 to-orange-600/20",
    },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-zinc-400">
          Overview of your video processing activity
        </p>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card className="overflow-hidden transition-all duration-300 hover:border-zinc-700/50 hover:shadow-lg hover:shadow-purple-500/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    {card.title}
                  </CardTitle>
                  <div
                    className={`rounded-lg bg-gradient-to-br ${card.gradient} p-2`}
                  >
                    <Icon className="h-4 w-4 text-zinc-300" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zinc-100">
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-sm text-zinc-400">
              Your latest video processing jobs
            </p>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Film className="mb-4 h-12 w-12 text-zinc-600" />
                <p className="text-zinc-400">No videos yet</p>
                <p className="text-sm text-zinc-500">
                  Create your first video to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.jobId}
                    className="flex items-center justify-between rounded-xl bg-zinc-800/30 px-4 py-3"
                  >
                    <span className="font-mono text-sm text-zinc-400">
                      {job.jobId?.slice(0, 8)}...
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        job.status === "done"
                          ? "text-emerald-400"
                          : job.status === "failed"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
