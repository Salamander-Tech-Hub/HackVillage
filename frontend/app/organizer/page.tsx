import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/access";

export default async function OrganizerIndexPage() {
  await requirePageRole("ORGANIZER");
  redirect("/organizer/overview");
}
