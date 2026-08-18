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

  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>(
    {},
  );

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
    let uploadFile = file;
    const filenameLower = file.name.toLowerCase();

    // 1. AUTOMATIC HEIC TO JPG CONVERSION
    if (
      filenameLower.endsWith(".heic") ||
      filenameLower.endsWith(".heif") ||
      file.type === "image/heic"
    ) {
      toast.loading("Converting Apple photo...", { id: "upload" });
      try {
        // Dynamically import to keep initial page load extremely fast
        const heic2any = (await import("heic2any")).default;

        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8,
        });

        // heic2any can return an array if it's a sequence, we just grab the first frame
        const finalBlob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;

        // Create a brand new JPG file out of the converted data
        const newName = file.name.replace(/\.heic|\.heif/gi, ".jpg");
        uploadFile = new File([finalBlob], newName, { type: "image/jpeg" });
      } catch (err) {
        console.error("HEIC Conversion error:", err);
        toast.error("Failed to convert iPhone photo. Try a different image.", {
          id: "upload",
        });
        return;
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // 2. INSTANT LOCAL PREVIEW (using the processed file)
    const objectUrl = URL.createObjectURL(uploadFile);
    setLocalPreviews((prev) => ({ ...prev, [date]: objectUrl }));

    // 3. FORCE STRICT MIME TYPES
    let mimeType = uploadFile.type || "image/jpeg";
    let fileExt = "jpg";
    if (mimeType.includes("png")) fileExt = "png";
    else if (mimeType.includes("webp")) fileExt = "webp";
    else mimeType = "image/jpeg";

    const finalName = `physique-${session.user.id}-${date}-${Date.now()}.${fileExt}`;

    toast.loading("Uploading photo...", { id: "upload" });

    try {
      // 4. CONVERT TO ARRAY BUFFER (Bypasses Supabase-js File Bug)
      const arrayBuffer = await uploadFile.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("physique_photos")
        .upload(finalName, arrayBuffer, {
          upsert: true,
          contentType: mimeType,
        });

      if (uploadError) {
        toast.error("Upload failed: " + uploadError.message, { id: "upload" });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("physique_photos").getPublicUrl(finalName);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/profile/weight`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ date, weight_kg, photo_url: publicUrl }),
        },
      );

      if (res.ok) {
        toast.success("Photo saved successfully!", { id: "upload" });
        setRefreshKey((k) => k + 1);
      } else {
        toast.error("Failed to save photo link to database", { id: "upload" });
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred", { id: "upload" });
    }
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {logs
              .slice()
              .reverse()
              .map((log) => {
                const displayImage = localPreviews[log.date] || log.photo_url;

                return (
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
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt="Physique"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-neutral-600 text-[10px] font-mono">
                          No Photo
                        </span>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors">
                          {displayImage ? "Replace Photo" : "Add Photo"}
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/heic, .heic, .heif"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handlePhotoUpload(
                                  log.date,
                                  log.weight_kg,
                                  e.target.files[0],
                                );
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>

                        {log.photo_url && (
                          <a
                            href={log.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-neutral-300 hover:text-white underline bg-black/50 px-2 py-1 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Raw Link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
