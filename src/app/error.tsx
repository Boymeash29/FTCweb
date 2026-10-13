"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell section-pad">
      <p className="eyebrow">Something went wrong</p>
      <h1>That page hit a snag.</h1>
      <p className="lede">Try loading it again. If the problem continues, come back later.</p>
      <button className="button button-primary" onClick={reset} type="button">
        Try again
      </button>
    </main>
  );
}
