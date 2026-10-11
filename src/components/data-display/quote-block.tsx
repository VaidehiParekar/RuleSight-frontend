import { StatusTag } from "@/components/data-display/status-tag";
import { cn } from "@/lib/utils";

interface QuoteBlockProps {
  text: string;
  /** Phrase inside `text` to highlight. Ignored if it is not an exact substring. */
  highlight?: string | null;
  source: string;
  /** True when the critic confirmed the quote is an exact substring of the source document. */
  verified?: boolean;
  size?: "reading" | "compact";
}

/**
 * Regulation or policy text, set like print. The footer always names the source
 * and whether the quote was verified as verbatim.
 */
export function QuoteBlock({
  text,
  highlight,
  source,
  verified,
  size = "reading",
}: QuoteBlockProps) {
  const index = highlight ? text.indexOf(highlight) : -1;
  return (
    <figure className={cn("quote", size)}>
      <blockquote>
        {index >= 0 && highlight ? (
          <>
            {text.slice(0, index)}
            <mark>{highlight}</mark>
            {text.slice(index + highlight.length)}
          </>
        ) : (
          text
        )}
      </blockquote>
      <figcaption>
        <span className="mono">{source}</span>
        {verified === undefined ? null : verified ? (
          <StatusTag tone="success">Verbatim ✓</StatusTag>
        ) : (
          <StatusTag tone="warning">Quote not verified</StatusTag>
        )}
      </figcaption>
    </figure>
  );
}
