// src/app/shop/success/page.tsx
export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-4">Thank you, birb! 🦉✨</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Your order was received. You’re order will be processed soon(ish).
      </p>
      <a
        href="/shop"
        className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-black text-white hover:bg-neutral-900"
      >
        Back to shop
      </a>
    </main>
  )
}