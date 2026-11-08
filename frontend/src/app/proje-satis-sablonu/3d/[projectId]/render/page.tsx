import ProjectRenderClient from "./ProjectRenderClient";

type ProjectRenderPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectRenderPage({
  params,
}: ProjectRenderPageProps) {
  const { projectId } = await params;

  return <ProjectRenderClient projectId={projectId} />;
}
