import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getSurveyDetails } from "@/actions/surveys";
import { StandaloneSurveyView } from "@/components/surveys/standalone-survey-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const survey = await getSurveyDetails(id);

  if (!survey) {
    return {
      title: "الاستبيان غير موجود | النهاية والبداية",
    };
  }

  return {
    title: `${survey.title} | استبيانات النهاية والبداية`,
    description: survey.description || "شارك برأيك في استبيان واستطلاع رأي طلاب الكلية الرسمي من النهاية والبداية.",
    openGraph: {
      title: `${survey.title} | النهاية والبداية`,
      description: survey.description || "استطلاع رأي رسمي لطلاب الكلية",
      type: "website",
    },
  };
}

export default async function SurveyStandalonePage({ params }: PageProps) {
  const { id } = await params;
  const survey = await getSurveyDetails(id);

  if (!survey) {
    notFound();
  }

  return <StandaloneSurveyView survey={survey} />;
}
