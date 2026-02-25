// import Contentpages from "@/components/Contentpages";

// export default function ContentPage() {
//   return <Contentpages />;
// }
// app/content/[id]/page.tsx
import { Suspense } from "react";
import Contentpage from "@/components/Contentpage";

export default function ContentPage() {
  return (
    <Suspense>
      <Contentpage />
    </Suspense>
  );
}
