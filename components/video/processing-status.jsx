"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

export function VideoProcessingStatus({ assetId }) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    let timer;
    async function check() {
      try {
        const response = await fetch(`/api/videos/${assetId}/status`, { cache: "no-store" });
        if (!response.ok) throw new Error("Status video belum dapat diperiksa.");
        const { data } = await response.json();
        if (!active) return;
        if (data.status === "READY") {
          setDone(true);
          router.refresh();
        } else if (data.status === "FAILED") {
          toast.error("Pemrosesan video gagal. Silakan upload kembali.");
          setDone(true);
          router.refresh();
        } else {
          timer = setTimeout(check, 3000);
        }
      } catch {
        if (active) timer = setTimeout(check, 5000);
      }
    }
    check();
    return () => { active = false; clearTimeout(timer); };
  }, [assetId, router]);

  if (done) return null;
  return <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
    <LoaderCircle size={16} className="animate-spin" />
    <span>Video sedang disiapkan. Halaman akan diperbarui saat siap.</span>
  </div>;
}
