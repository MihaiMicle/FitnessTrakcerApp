'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, SendHorizonal, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MAX_ATTACHMENTS,
  rejectionMessage,
  toAttachment,
  validateFiles,
} from '@/lib/copilot/attachments';
import type { CopilotAttachment } from '@/lib/copilot/types';

interface ComposerProps {
  loading: boolean;
  onSend: (text: string, attachments: CopilotAttachment[]) => Promise<void>;
  placeholder: string;
}

export default function CopilotComposer({
  loading,
  onSend,
  placeholder,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [encoding, setEncoding] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /* Object URLs are not garbage collected on their own, and a long session of
     attaching progress photos would hold every one of them in memory */
  useEffect(() => {
    return () => {
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const { accepted, rejected } = validateFiles(
      Array.from(files),
      attachments.length,
    );

    /* One toast per distinct reason, not per file, or dropping six photos at
       once buries the screen */
    new Set(rejected.map((r) => r.reason)).forEach((reason) =>
      toast.error(rejectionMessage(reason)),
    );

    if (!accepted.length) return;
    setEncoding(true);
    try {
      const encoded = await Promise.all(accepted.map(toAttachment));
      setAttachments((prev) => [...prev, ...encoded]);
    } catch {
      toast.error('That image could not be read. Try a different one.');
    } finally {
      setEncoding(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const canSend = !loading && !encoding && (text.trim() || attachments.length);

  const handleSend = async () => {
    if (!canSend) return;
    const outgoing = attachments;
    setText('');
    setAttachments([]);
    await onSend(text, outgoing);
  };

  return (
    <div className="p-3 border-t border-neutral-800 bg-neutral-950 rounded-b-xl space-y-2">
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="relative">
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className="w-14 h-14 object-cover rounded-lg border border-neutral-700"
              />
              <button
                onClick={() => removeAttachment(attachment.id)}
                aria-label={`Remove ${attachment.name}`}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-800 border border-neutral-600 rounded-full text-neutral-300 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInput.current?.click()}
          disabled={attachments.length >= MAX_ATTACHMENTS || encoding}
          aria-label="Attach a photo"
          className="shrink-0 w-10 h-10 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/50 disabled:text-neutral-700 disabled:hover:border-neutral-700 flex items-center justify-center transition-colors"
        >
          <ImagePlus size={17} />
        </button>

        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,video/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.json,.xml,.txt,.bin"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
            // Reset value so selecting the same file again triggers onChange
            e.target.value = '';
          }}
          className="hidden"
          id="copilot-file-input"
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            /* Enter sends, shift+enter breaks the line. On a phone the send
               button is the real affordance, which is why it is always there */
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="flex-1 resize-none bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-emerald-500 outline-none transition-colors max-h-32"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="shrink-0 w-10 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white flex items-center justify-center transition-all active:scale-95"
        >
          <SendHorizonal size={17} />
        </button>
      </div>

      {encoding && (
        <p className="text-[11px] font-mono text-neutral-500">
          Preparing image...
        </p>
      )}
    </div>
  );
}
