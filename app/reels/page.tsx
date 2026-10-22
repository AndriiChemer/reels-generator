import { redirect } from "next/navigation";

/** The reel list lives next to the "new reel" form. */
export default function ReelsPage() {
  redirect("/reels/new");
}
