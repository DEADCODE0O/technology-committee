import { Reveal } from "./reveal";

type SectionHeadingProps = {
  label: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "start";
};

/**
 * عنوان قسم موحد — كلمة تمهيدية ذهبية + عنوان كبير + وصف قصير
 */
export function SectionHeading({
  label,
  title,
  description,
  align = "center",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-start";

  return (
    <Reveal className={`flex flex-col gap-4 ${alignClass}`}>
      <span className="inline-flex items-center gap-2.5 text-sm font-bold tracking-wide text-gold">
        <span aria-hidden="true" className="h-px w-6 bg-gold/50" />
        {label}
        <span aria-hidden="true" className="h-px w-6 bg-gold/50" />
      </span>
      <h2 className="text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
