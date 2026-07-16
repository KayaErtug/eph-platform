import Project3DStudioClient from "./Project3DStudioClient";

type Project3DStudioPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Project3DStudioPage({
  params,
}: Project3DStudioPageProps) {
  const { projectId } = await params;

  return <Project3DStudioClient projectId={projectId} />;
}
