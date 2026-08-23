"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
  initialFacingMode?: "user" | "environment";
}

export default function CameraModal({
  isOpen,
  onClose,
  onCapture,
  title = "CAPTURE PHOTO",
  initialFacingMode = "user",
}: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    initialFacingMode,
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle stream lifecycle
  useEffect(() => {
    if (isOpen) {
      startWebcam(facingMode);
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [isOpen]);

  // Attach stream to video tag
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isOpen]);

  const startWebcam = async (mode: "user" | "environment") => {
    setFacingMode(mode);
    if (stream) stream.getTracks().forEach((track) => track.stop());

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      setStream(mediaStream);
    } catch (err) {
      console.error("Webcam error:", err);
      toast.error("Could not access camera. Please check your permissions.");
    }
  };

  const flipCamera = () => {
    startWebcam(facingMode === "user" ? "environment" : "user");
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // If front camera, flip the canvas image horizontally so it saves correctly
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
                `camera-capture-${Date.now()}.jpg`,
                { type: "image/jpeg" },
              );
              onCapture(file);
              stopWebcam();
              onClose();
            }
          },
          "image/jpeg",
          0.9,
        );
      }
    }
  };

  const handleClose = () => {
    stopWebcam();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-neutral-900 border border-emerald-500/50 rounded-xl max-w-sm w-full p-6 text-white shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
        <h3 className="text-lg font-bold font-mono tracking-wider mb-4 w-full text-center text-emerald-400">
          {title}
        </h3>

        <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border border-neutral-800 mb-6 shadow-inner group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              facingMode === "user" ? "scale-x-[-1]" : ""
            }`}
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
            onClick={handleClose}
            className="flex-1 py-3 rounded-lg font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCapture}
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
  );
}
