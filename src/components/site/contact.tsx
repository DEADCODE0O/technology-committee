"use client";

import { siteConfig } from "@/config/site";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { WhatsAppIcon, TelegramIcon, FacebookIcon } from "./icons";

const socialCards = [
  {
    key: "whatsapp",
    icon: WhatsAppIcon,
    data: siteConfig.socials.whatsapp,
    actionLabel: "تواصل عبر واتساب",
    ltr: true,
    hoverBorder: "hover:border-[#25D366]/50",
    iconContainer: "border-[#25D366]/35 bg-[#25D366]/10 text-[#25D366] group-hover:border-[#25D366] group-hover:shadow-[0_0_28px_-6px_rgba(37,211,102,0.5)]",
    buttonStyle: "bg-[#25D366] text-white hover:bg-[#20bd5a] hover:shadow-[0_8px_25px_-5px_rgba(37,211,102,0.45)] border border-[#25D366]",
  },
  {
    key: "telegram",
    icon: TelegramIcon,
    data: siteConfig.socials.telegram,
    actionLabel: "انضم إلى تيليجرام",
    ltr: true,
    hoverBorder: "hover:border-[#229ED9]/50",
    iconContainer: "border-[#229ED9]/35 bg-[#229ED9]/10 text-[#229ED9] group-hover:border-[#229ED9] group-hover:shadow-[0_0_28px_-6px_rgba(34,158,217,0.5)]",
    buttonStyle: "bg-[#229ED9] text-white hover:bg-[#1d8dc2] hover:shadow-[0_8px_25px_-5px_rgba(34,158,217,0.45)] border border-[#229ED9]",
  },
  {
    key: "facebook",
    icon: FacebookIcon,
    data: siteConfig.socials.facebook,
    actionLabel: "تابعنا على فيسبوك",
    ltr: false,
    hoverBorder: "hover:border-[#1877F2]/50",
    iconContainer: "border-[#1877F2]/35 bg-[#1877F2]/10 text-[#1877F2] group-hover:border-[#1877F2] group-hover:shadow-[0_0_28px_-6px_rgba(24,119,242,0.5)]",
    buttonStyle: "bg-[#1877F2] text-white hover:bg-[#166fe5] hover:shadow-[0_8px_25px_-5px_rgba(24,119,242,0.45)] border border-[#1877F2]",
  },
];

export function Contact() {
  return (
    <section id="contact" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <SectionHeading
          label="تواصل معنا"
          title={
            <>
              انضم إلى{" "}
              <span className="text-gold-gradient">مجتمعنا</span>
            </>
          }
          description="اختر الطريقة الأنسب لك وسنكون سعداء بانضمامك."
        />

        <div className="mt-12 grid grid-cols-1 gap-3.5 sm:mt-16 sm:grid-cols-3 sm:gap-4">
          {socialCards.map((card, i) => (
            <Reveal key={card.key} delay={0.08 * i}>
              <div className={`group flex h-full flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 ${card.hoverBorder} hover:shadow-md sm:p-7`}>
                <span className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${card.iconContainer}`}>
                  <card.icon className="h-7 w-7" />
                </span>

                <h3 className="mt-4 font-latin text-sm font-semibold tracking-[0.18em] text-muted-foreground">
                  {card.data.label}
                </h3>

                <p
                  dir={card.ltr ? "ltr" : undefined}
                  className="mt-1.5 text-lg font-extrabold text-foreground"
                >
                  {card.data.value}
                </p>

                <a
                  href={card.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-5 inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-bold transition-all duration-300 active:scale-[0.98] ${card.buttonStyle}`}
                >
                  {card.actionLabel}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
