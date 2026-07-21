export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="border-b border-amber-500/40 bg-amber-950/80 px-3 py-2 text-center text-xs leading-snug text-amber-100 sm:text-sm"
    >
      <strong className="font-semibold">Computer-side control plane only.</strong> Not a medical
      device. Not implant software. Not affiliated with Neuralink or any implant vendor. Simulator
      and generic intent streams — high-bandwidth intent / accessibility use.
    </div>
  );
}
