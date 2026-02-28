import { Suspense } from "react";
import Contentpage from "@/components/Contentpage";

export default function ContentPage() {
  return (
    <Suspense>
      <Contentpage />
    </Suspense>
  );
}
