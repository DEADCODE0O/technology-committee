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
      title: "الاستبيان غير موجود | اللجنة التكنولوجية",
    };
  }

  return {
    title: `${survey.title} | استبيانات اللجنة التكنولوجية`,
    description: survey.description || "شارك برأيك في استبيان واستطلاع رأي طلاب الكلية الرسمي من اللجنة التكنولوجية.",
    openGraph: {
      title: `${survey.title} | اللجنة التكنولوجية`,
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
