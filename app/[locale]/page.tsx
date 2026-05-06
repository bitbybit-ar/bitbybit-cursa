import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("comingSoon");

  return (
    <Section>
      <Container>
        <h1>BitByBit Cursá</h1>
        <p>{t("tagline")}</p>
        <p>{t("body")}</p>
      </Container>
    </Section>
  );
}
