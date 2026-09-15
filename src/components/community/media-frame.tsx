"use client";

import { ExternalLink, Play, FolderOpen } from "lucide-react";
import { type MediaPlan } from "@/lib/media";
import { SmartImg } from "@/components/platform/smart-img";

// ═══════════════════════════════════════════════════════════════
//  مشغّل وسائط «موفر-واعٍ»:
//  يوتيوب → المدمج الرسمي (علامته ظاهرة — سياسة يوتيوب)
//  مباشر/تخزيننا → HTML5 بهويتنا (White-label حقيقي)
//  تليجرام → رابط خارجي واضح (لا نزيّف مشغّلًا حوله)
//  درايف → رابط المعاينة/التنزيل الرسمي
// ═══════════════════════════════════════════════════════════════

export function MediaFrame({ plan, title }: { plan: MediaPlan; title: string }) {
  if (plan.kind === "YOUTUBE_EMBED") {
    return (
      <figure className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
        <div className="relative aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${plan.videoId}`}
            title={title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            loading="lazy"
          />
        </div>
      </figure>
    );
  }

  if (plan.kind === "HTML5_VIDEO") {
    return (
      <figure className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
        <video controls playsInline preload="metadata" className="aspect-video w-full">
          <source src={plan.src} />
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </figure>
    );
  }

  if (plan.kind === "HTML5_AUDIO") {
    return (
      <figure className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <audio controls preload="metadata" className="w-full">
          <source src={plan.src} />
          متصفحك لا يدعم تشغيل الصوت.
        </audio>
      </figure>
    );
  }

  if (plan.kind === "EXTERNAL_LINK") {
    return (
      <a
        href={plan.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-gold/30"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/[0.08] text-gold">
          {plan.provider === "TELEGRAM" ? <Play className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-zinc-200">
            {plan.provider === "TELEGRAM" ? "شاهد عبر تليجرام" : "فتح من جوجل درايف"}
          </span>
          <span className="block text-[11px] text-zinc-500">المحتوى مستضاف خارج المنصة ويفتح في تبويب جديد</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
      </a>
    );
  }

  return null;
}

// غلاف صورة منشور — عبر بروكسي الصور مع بديل أنيق
export function PostImage({ url, alt }: { url: string; alt: string }) {
  const proxied = url.startsWith("/") ? url : `/api/img?u=${encodeURIComponent(url)}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
      <SmartImg src={proxied} alt={alt} className="max-h-[420px] w-full object-cover" />
    </div>
  );
}
