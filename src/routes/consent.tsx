import { createFileRoute } from "@tanstack/react-router";
import { LegalDocPage } from "../components/legal-doc-page";
import { CONSENT_DOC } from "../lib/legal-docs";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Согласие на обработку персональных данных — Свежий ветер" },
      {
        name: "description",
        content:
          "Согласие на обработку персональных данных пользователя сайта ООО «Свежий ветер».",
      },
      {
        property: "og:title",
        content: "Согласие на обработку персональных данных — Свежий ветер",
      },
      {
        property: "og:description",
        content: "Согласие на обработку персональных данных пользователя сайта.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  return <LegalDocPage doc={CONSENT_DOC} />;
}
