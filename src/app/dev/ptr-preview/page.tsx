import { notFound } from "next/navigation";
import { PtrPreviewClient } from "./PtrPreviewClient";

/** Local QA only — omitted from production builds. */
export default function PtrPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PtrPreviewClient />;
}
