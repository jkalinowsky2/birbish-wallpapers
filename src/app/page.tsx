// src/app/page.tsx
import Composer from "@/components/Composer";
import type { Config } from "@/components/Composer";
import traits from "@/data/traits.json";
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/moonbirds/wallpaper");
}



