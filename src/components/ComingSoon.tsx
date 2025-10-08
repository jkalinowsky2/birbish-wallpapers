export default function ComingSoon({ label = "Coming soon" }: { label?: string }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-8 text-center">
      <h2 className="text-xl font-semibold mb-2">{label}</h2>
      <p className="text-neutral-600">We’re finishing this builder. Check back shortly!</p>
    </div>
  );
}