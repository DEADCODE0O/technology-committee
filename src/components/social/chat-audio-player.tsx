"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic, Loader2 } from "lucide-react";

interface ChatAudioPlayerProps {
  src: string;
  durationSec?: number;
  isMine?: boolean;
}

export function ChatAudioPlayer({
  src,
  durationSec = 0,
  isMine = false,
}: ChatAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec || 0);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoaded = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
      setIsLoaded(true);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = Number(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[200px] sm:min-w-[240px]">
      {/* زر التشغيل الدائري بنمط واتساب */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 shadow-md ${
          isMine
            ? "bg-gold text-night hover:bg-gold-light"
            : "bg-emerald-600 text-white hover:bg-emerald-500"
        }`}
        title={isPlaying ? "إيقاف مؤقت" : "تشغيل الرسالة الصوتية"}
        aria-label={isPlaying ? "إيقاف" : "تشغيل"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ms-0.5" />
        )}
      </button>

      {/* شريط التقدم وموجات الصوت والوقت */}
      <div className="flex-1 space-y-1">
        <div className="relative flex items-center h-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-gold bg-muted/60"
            title="تقديم / تأخير الصوت"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            <Mic className="h-3 w-3 text-gold" />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
