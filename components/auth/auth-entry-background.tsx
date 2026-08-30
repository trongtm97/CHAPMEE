/** Full-page background for login/register — rendered once in AppShell auth layout. */
export function AuthEntryBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-[#070b11]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b1016_0%,#091018_42%,#070b11_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.11),transparent_40%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.08),transparent_36%)]" />
    </div>
  );
}
