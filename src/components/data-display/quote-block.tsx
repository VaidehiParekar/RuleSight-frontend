import { StatusTag } from "@/components/data-display/status-tag";
import { cn } from "@/lib/utils";

interface QuoteBlockProps {
  text: string;
  /** Phrase inside `text` to highlight. Ignored if it is not an exact substring. */
  highlight?: string | null;
  source: string;
  /** True when the critic confirmed the quote is an exact substring of the source document. */
  verified?: boolean;
  /** reading: default; large: the trace's opening clause; compact: one-line policy text. */
  size?: "reading" | "large" | "compact";
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
  if (size === "compact") {
    return (
      <figure className="quote compact">
        <blockquote>“{text}”</blockquote>
        <figcaption>{source}</figcaption>
      </figure>
    );
  }
  return (
    <figure
      className={cn("quote", size === "large" && "large", verified === false && "unverified")}
    >
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
        <span>{source}</span>
        {verified === undefined ? null : verified ? (
          <StatusTag tone="success" icon="✓">
            Verbatim
          </StatusTag>
        ) : (
          <StatusTag tone="warning" icon="!">
            Quote not verified
          </StatusTag>
        )}
      </figcaption>
    </figure>
  );
}
