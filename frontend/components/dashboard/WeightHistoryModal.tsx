"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
  XAxis,
} from "recharts";
import toast from "react-hot-toast";

export default function WeightHistoryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLogs = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/profile/weight`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (res.ok) setLogs(await res.json());
      setLoading(false);
    };
    fetchLogs();
  }, [isOpen, refreshKey]);

  const handlePhotoUpload = async (
    date: string,
    weight_kg: number,
    file: File,
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${session.user.id}-${date}-${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    toast.loading("Uploading photo...", { id: "upload" });

    const { error: uploadError } = await supabase.storage
      .from("physique_photos")
      .upload(filePath, file);
    if (uploadError) {
      toast.error("Upload failed", { id: "upload" });
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("physique_photos").getPublicUrl(filePath);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/weight`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ date, weight_kg, photo_url: publicUrl }),
    });

    toast.success("Photo saved!", { id: "upload" });
    setRefreshKey((k) => k + 1);
  };

  if (!isOpen) return null;

  const chartData = logs.map((log) => ({
    date: log.date,
    weight: log.weight_kg,
  }));
  const minWeight = logs.length
    ? Math.min(...logs.map((l) => l.weight_kg)) - 2
    : 0;
  const maxWeight = logs.length
    ? Math.max(...logs.map((l) => l.weight_kg)) + 2
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full p-6 text-white font-sans relative my-8 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6 shrink-0">
          <h2 className="text-lg font-bold font-mono tracking-wider">
            PHYSIQUE HISTORY
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-sm px-2"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
          {/* Chart */}
          <div className="h-48 sm:h-64 w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-500">
                Loading chart...
              </div>
            ) : logs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    stroke="#525252"
                    fontSize={10}
                    tickMargin={10}
                  />
                  <YAxis
                    domain={[minWeight, maxWeight]}
                    stroke="#525252"
                    fontSize={10}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      borderColor: "#262626",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#818cf8", fontWeight: "bold" }}
                    labelStyle={{ color: "#737373", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#818cf8",
                      strokeWidth: 2,
                      stroke: "#171717",
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-500">
                No data available
              </div>
            )}
          </div>

          {/* Logs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {logs
              .slice()
              .reverse()
              .map((log) => (
                <div
                  key={log.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3 group relative overflow-hidden"
                >
                  <div className="flex justify-between items-center z-10">
                    <span className="text-xs text-neutral-400 font-mono">
                      {log.date}
                    </span>
                    <span className="text-sm font-bold text-indigo-400 font-mono">
                      {log.weight_kg} kg
                    </span>
                  </div>

                  <div className="aspect-square bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center overflow-hidden relative">
                    {log.photo_url ? (
                      <img
                        src={log.photo_url}
                        alt="Physique"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-neutral-600 text-[10px] font-mono">
                        No Photo
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors">
                        {log.photo_url ? "Update Photo" : "Add Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handlePhotoUpload(
                                log.date,
                                log.weight_kg,
                                e.target.files[0],
                              );
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
