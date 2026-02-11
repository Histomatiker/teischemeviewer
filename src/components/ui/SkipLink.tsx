export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-white"
    >
      Zum Hauptinhalt springen
    </a>
  );
}
