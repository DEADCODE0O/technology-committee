"use client";

import Image from "next/image";
import { siteConfig } from "@/config/site";
import { WhatsAppIcon, TelegramIcon, FacebookIcon } from "./icons";

const socialLinks = [
  {
    icon: WhatsAppIcon,
    url: siteConfig.socials.whatsapp.url,
    label: "WhatsApp",
    cls: "text-[#25D366] bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] hover:shadow-[0_0_20px_rgba(37,211,102,0.45)]",
  },
  {
    icon: TelegramIcon,
    url: siteConfig.socials.telegram.url,
    label: "Telegram",
    cls: "text-[#229ED9] bg-[#229ED9]/10 border-[#229ED9]/30 hover:bg-[#229ED9] hover:text-white hover:border-[#229ED9] hover:shadow-[0_0_20px_rgba(34,158,217,0.45)]",
  },
  {
    icon: FacebookIcon,
    url: siteConfig.socials.facebook.url,
    label: "Facebook",
    cls: "text-[#1877F2] bg-[#1877F2]/10 border-[#1877F2]/30 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:shadow-[0_0_20px_rgba(24,119,242,0.45)]",
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-12 sm:px-6 lg:px-8">
        {/* الشعار والاسم */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src={siteConfig.logo}
            alt="شعار اللجنة التكنولوجية"
            width={96}
            height={96}
            sizes="48px"
            className="h-12 w-12"
          />
          <div className="text-center">
            <p className="text-base font-extrabold text-foreground">
              اللجنة التكنولوجية
            </p>
            <p className="mt-1 font-latin text-[9px] font-medium tracking-[0.32em] text-gold">
              {siteConfig.nameEn}
            </p>
          </div>
        </div>

        {/* وسائل التواصل بألوانها الحقيقية */}
        <div className="flex items-center gap-3">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5 ${social.cls}`}
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        <div className="gold-hairline w-40" aria-hidden="true" />

        <p className="text-center text-xs text-muted-foreground">
          © 2026 اللجنة التكنولوجية — اتحاد الطلاب — جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
}
