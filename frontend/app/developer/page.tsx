import { requirePageRole } from "@/lib/access";
import { redirect } from "next/navigation";

export default async function DeveloperAliasPage() {
  await requirePageRole("DEVELOPER");
  redirect("/attendee");
}
