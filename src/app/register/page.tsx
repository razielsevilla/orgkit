import { redirect } from "next/navigation";

// Sign-up and sign-in are one flow: signing in with Google creates the account
// on first use (A1). Old links and bookmarks land on the sign-in page.
export default function RegisterPage() {
  redirect("/signin");
}
