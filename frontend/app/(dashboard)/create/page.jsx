"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Download, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoDropzone, ImageDropzone } from "@/components/upload/dropzone";
import { API_URL } from "@/lib/utils";
import { addStoredJob } from "@/lib/storage";

export default function CreatePage() {
  const [video, setVideo] = useState(null);
  const [image, setImage] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const pollStatus = useCallback(async (id) => {
    const res = await fetch(`${API_URL}/status/${id}`);
    const data = await res.json();
    setStatus(data);
    return data;
  }, []);

  useEffect(() => {
    if (!jobId || status?.status === "done" || status?.status === "failed") {
      if (status?.status === "done" || status?.status === "failed") setLoading(false);
      return;
    }
    const interval = setInterval(async () => {
      const data = await pollStatus(jobId);
      if (data.status === "done" || data.status === "failed") {
        addStoredJob({ jobId, status: data.status });
        setLoading(false);
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, status, pollStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!video || !image) {
      setError("Please select both video and image files");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("video", video);
      formData.append("image", image);
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const { job_id } = await res.json();
      setJobId(job_id);
      setStatus({ status: "pending" });
      addStoredJob({ jobId: job_id, status: "pending" });
      const data = await pollStatus(job_id);
      addStoredJob({ jobId: job_id, status: data.status });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const isProcessing = status && (status.status === "pending" || status.status === "processing");
  const canSubmit = video && image && !loading;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-zinc-100">Create Video</h1>
        <p className="mt-1 text-zinc-400">
          Upload a video and a face photo. The face will be swapped onto people in the video.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <p className="text-sm text-zinc-400">
              Drag and drop or click to select files
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <VideoDropzone
                  file={video}
                  onChange={setVideo}
                  disabled={loading}
                />
                <ImageDropzone
                  file={image}
                  onChange={setImage}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                size="lg"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Process Video
                  </>
                )}
              </Button>
            </form>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            {status && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 rounded-xl border border-zinc-800/50 bg-zinc-800/30 p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-400">Status</span>
                  <span
                    className={`text-sm font-medium ${
                      status.status === "done"
                        ? "text-emerald-400"
                        : status.status === "failed"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}
                  >
                    {status.status === "pending" && "Queued"}
                    {status.status === "processing" && "Processing"}
                    {status.status === "done" && "Ready"}
                    {status.status === "failed" && "Failed"}
                  </span>
                </div>
                {isProcessing && (
                  <div className="h-5 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    />
                  </div>
                )}
                {status.status === "done" && (
                  <a
                    href={`${API_URL}/download/${jobId}`}
                    download="output.mp4"
                    className="inline-flex"
                  >
                    <Button size="lg" className="w-full">
                      <Download className="h-5 w-5" />
                      Download Video
                    </Button>
                  </a>
                )}
                {status.status === "failed" && status.error && (
                  <p className="text-sm text-red-400">{status.error}</p>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
