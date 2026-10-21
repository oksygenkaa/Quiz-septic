import { Link } from "@tanstack/react-router";
import type { LegalDoc } from "../lib/legal-docs";

/* Общий шаблон страницы юридического документа: белый фон, узкая колонка
 * по центру, жирный заголовок и обычный текст. */
export function LegalDocPage({ doc }: { doc: LegalDoc }) {
  return (
    <main className="min-h-screen bg-card">
      <div className="mx-auto max-w-3xl px-5 py-10 md:py-16">
        <Link
          to="/"
          className="inline-block text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          ← На главную
        </Link>
        <h1 className="mt-6 text-2xl font-bold leading-snug text-foreground md:text-3xl">
          {doc.title}
        </h1>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground">
          {doc.blocks.map((block, i) =>
            block.t === "h" ? (
              <h2 key={i} className="pt-4 text-lg font-semibold text-foreground">
                {block.x}
              </h2>
            ) : block.t === "li" ? (
              <p key={i} className="pl-5">
                {block.x}
              </p>
            ) : (
              <p key={i}>{block.x}</p>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
