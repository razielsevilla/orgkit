import { redirect } from "next/navigation";
import { membersPath } from "@/src/lib/routes";

export default async function MemberJoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(membersPath(id));
}
