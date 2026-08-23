"use client";
import { useState, useEffect, useRef } from "react";
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
  const [hasChanges, setHasChanges] = useState(false); // Tracks if we need to refresh the dashboard

  // Webcam State
  const [showWebcam, setShowWebcam] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeLog, setActiveLog] = useState<{
    date: string;
    weight_kg: number;
  } | null>(null);

  // Weight Editing State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<number | "">("");
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);

  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>(
    {},
  );
  const [activePhotoLogId, setActivePhotoLogId] = useState<string | null>(null);

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

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element when it opens
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, showWebcam]);

  const startWebcam = async (
    date: string,
    weight_kg: number,
    mode: "user" | "environment" = "environment",
  ) => {
    setActiveLog({ date, weight_kg });
    setFacingMode(mode);

    // Stop any existing stream before requesting a new camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      setStream(mediaStream);
      setShowWebcam(true);
    } catch (err) {
      console.error("Webcam error:", err);
      toast.error("Could not access camera. Please check your permissions.");
    }
  };

  const flipCamera = () => {
    if (!activeLog) return;
    const newMode = facingMode === "user" ? "environment" : "user";
    startWebcam(activeLog.date, activeLog.weight_kg, newMode);
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setShowWebcam(false);
    setActiveLog(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && activeLog) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // If front camera, we need to flip the canvas image horizontally so it saves correctly
        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File(
                [blob],
                `physique-capture-${Date.now()}.jpg`,
                { type: "image/jpeg" },
              );
              handlePhotoUpload(activeLog.date, activeLog.weight_kg, file);
              stopWebcam();
            }
          },
          "image/jpeg",
          0.9,
        );
      }
    }
  };

  const handlePhotoUpload = async (
    date: string,
    weight_kg: number,
    file: File,
  ) => {
    let uploadFile = file;
    const filenameLower = file.name.toLowerCase();

    if (
      filenameLower.endsWith(".heic") ||
      filenameLower.endsWith(".heif") ||
      file.type === "image/heic"
    ) {
      toast.loading("Converting Apple photo...", { id: "upload" });
      try {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8,
        });
        const finalBlob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;
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

    const objectUrl = URL.createObjectURL(uploadFile);
    setLocalPreviews((prev) => ({ ...prev, [date]: objectUrl }));

    let mimeType = uploadFile.type || "image/jpeg";
    let fileExt = "jpg";
    if (mimeType.includes("png")) fileExt = "png";
    else if (mimeType.includes("webp")) fileExt = "webp";
    else mimeType = "image/jpeg";

    const finalName = `physique-${session.user.id}-${date}-${Date.now()}.${fileExt}`;

    toast.loading("Uploading photo...", { id: "upload" });

    try {
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
        setHasChanges(true);
      } else {
        toast.error("Failed to save photo link to database", { id: "upload" });
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred", { id: "upload" });
    }
  };

  const saveWeightEdit = async (log: any) => {
    if (!editWeight || isNaN(Number(editWeight))) {
      setEditingLogId(null);
      return;
    }

    setIsUpdatingWeight(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/profile/weight`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            date: log.date,
            weight_kg: Number(editWeight),
            photo_url: log.photo_url,
          }),
        },
      );

      if (res.ok) {
        toast.success("Weight updated!");
        setEditingLogId(null);
        setRefreshKey((k) => k + 1);
        setHasChanges(true);
      } else {
        toast.error("Failed to update weight.");
      }
    } catch (err) {
      toast.error("An error occurred while updating.");
    } finally {
      setIsUpdatingWeight(false);
    }
  };

  const handleCloseModal = () => {
    if (hasChanges) {
      window.location.reload();
    } else {
      onClose();
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full p-6 text-white font-sans relative my-8 shadow-2xl max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6 shrink-0">
            <h2 className="text-lg font-bold font-mono tracking-wider">
              PHYSIQUE HISTORY
            </h2>
            <button
              onClick={handleCloseModal}
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
                      <div className="flex justify-between items-center z-10 h-7">
                        <span className="text-xs text-neutral-400 font-mono">
                          {log.date}
                        </span>

                        {/* Edit weight input */}
                        {editingLogId === log.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editWeight}
                              onChange={(e) =>
                                setEditWeight(
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                                )
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && saveWeightEdit(log)
                              }
                              className="w-16 bg-neutral-900 border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs font-mono text-white outline-none focus:border-indigo-400 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                              autoFocus
                            />
                            <button
                              onClick={() => saveWeightEdit(log)}
                              disabled={isUpdatingWeight}
                              className="text-emerald-400 hover:text-emerald-300 p-0.5"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingLogId(null)}
                              className="text-rose-400 hover:text-rose-300 p-0.5"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1.5 cursor-pointer group/edit hover:bg-neutral-900 px-2 py-1 -mr-2 rounded transition-colors"
                            onClick={() => {
                              setEditingLogId(log.id);
                              setEditWeight(log.weight_kg);
                            }}
                            title="Edit weight"
                          >
                            <span className="text-sm font-bold text-indigo-400 font-mono">
                              {log.weight_kg} kg
                            </span>
                            <svg
                              className="w-3 h-3 text-neutral-500 opacity-0 group-hover/edit:opacity-100 transition-opacity"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div
                        className="aspect-square bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center overflow-hidden relative cursor-pointer md:cursor-default"
                        onClick={() =>
                          setActivePhotoLogId(
                            activePhotoLogId === log.id ? null : log.id,
                          )
                        }
                      >
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

                        {/* Overlay: active state on mobile, but keep hover on desktop */}
                        <div
                          className={`absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 transition-opacity ${activePhotoLogId === log.id ? "opacity-100 z-20" : "opacity-0 z-0"} md:opacity-0 md:group-hover:opacity-100 md:z-20`}
                        >
                          <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors w-24 text-center">
                            Upload Photo
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

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startWebcam(
                                log.date,
                                log.weight_kg,
                                "environment",
                              );
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors w-24 text-center flex items-center justify-center gap-1"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            Camera
                          </button>

                          {log.photo_url && (
                            <a
                              href={log.photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-neutral-300 hover:text-white underline bg-black/50 px-2 py-1 rounded mt-1"
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

      {/* Webcam Overlay Modal */}
      {showWebcam && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-neutral-900 border border-emerald-500/50 rounded-xl max-w-sm w-full p-6 text-white shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <h3 className="text-lg font-bold font-mono tracking-wider mb-4 w-full text-center text-emerald-400">
              CAPTURE PROGRESS
            </h3>

            <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border border-neutral-800 mb-6 shadow-inner group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
              <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-lg pointer-events-none" />

              {/* Flip Camera Button */}
              <button
                onClick={flipCamera}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm transition-all border border-neutral-700 active:scale-95"
                title="Switch Camera"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>

            <div className="flex w-full gap-3">
              <button
                onClick={stopWebcam}
                className="flex-1 py-3 rounded-lg font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 py-3 rounded-lg font-mono text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
