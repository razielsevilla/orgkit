import { redirect } from "next/navigation";
import { ROUTES } from "@/src/lib/routes";

// Signed-in officers are sent on to their workspace by the proxy before this runs.
export default function HomePage() {
  redirect(ROUTES.register);
}
