import type { Metadata } from "next";

const NEUTRAL_FORM_ICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230ea5e9'/><path d='M9 11h14M9 16h14M9 21h9' stroke='white' stroke-width='2.5' stroke-linecap='round'/></svg>";

export const metadata: Metadata = {
  title: "استمارة التسجيل",
  description: "استمارة التسجيل المباشر.",
  keywords: [],
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: NEUTRAL_FORM_ICON, type: "image/svg+xml" }],
    apple: [],
  },
  openGraph: {
    title: "استمارة التسجيل",
    description: "استمارة التسجيل المباشر.",
    type: "website",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "استمارة التسجيل",
    description: "استمارة التسجيل المباشر.",
    images: [],
  },
};

export default function ExternalRegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
