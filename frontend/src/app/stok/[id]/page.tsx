import { redirect } from "next/navigation";

export default async function StokDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portfoy/${id}`);
}