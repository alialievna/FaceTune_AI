"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-zinc-400">
          Manage your account and preferences
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <p className="text-sm text-zinc-400">
              Your account information
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-zinc-800/30 px-4 py-3">
              <p className="text-xs text-zinc-500">Email</p>
              <p className="text-zinc-300">demo@example.com</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
