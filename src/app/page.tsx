import { redirect } from "next/navigation";

// Signed-in officers are sent on to their workspace by the proxy before this runs.
export default function HomePage() {
  redirect("/register");
}
