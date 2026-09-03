import toast from 'react-hot-toast';

export async function nativeShare(title: string, text: string, url?: string) {
  const shareData = { title, text, url };

  if (navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share');
      }
      return false;
    }
  } else {
    try {
      await navigator.clipboard.writeText(
        `${title}\n${text}${url ? '\n' + url : ''}`,
      );
      toast.success('Copied to clipboard!');
      return true;
    } catch {
      toast.error('Sharing not supported on this device');
      return false;
    }
  }
}
