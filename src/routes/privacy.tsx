import { createFileRoute } from "@tanstack/react-router";
import { LegalDocPage } from "../components/legal-doc-page";
import { PRIVACY_DOC } from "../lib/legal-docs";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности — Свежий ветер" },
      {
        name: "description",
        content:
          "Политика в отношении обработки персональных данных ООО «Свежий ветер»: порядок обработки и меры по обеспечению безопасности персональных данных.",
      },
      { property: "og:title", content: "Политика конфиденциальности — Свежий ветер" },
      {
        property: "og:description",
        content:
          "Порядок обработки персональных данных и меры по обеспечению их безопасности.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalDocPage doc={PRIVACY_DOC} />;
}
