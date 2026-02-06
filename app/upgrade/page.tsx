import { redirect } from "next/navigation";

// → UPGRADE PAGE: Redirect handler for payment success
export default async function UpgradePage({
  searchParams,
}: {
  searchParams: { payment?: string };
}) {
  redirect("/");
}
