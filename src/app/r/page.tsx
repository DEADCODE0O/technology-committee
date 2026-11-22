import type { Metadata } from "next";
import ExternalRegistrationNotFound from "./not-found";

export const metadata: Metadata = {
  title: "الرابط غير متاح",
  description: "رابط التسجيل غير متاح.",
  robots: { index: false, follow: false },
};

export default function ExternalRegistrationIndex() {
  return <ExternalRegistrationNotFound />;
}
