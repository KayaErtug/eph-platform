import type { Project } from "./stokTypes";
import StokUnitRow from "./StokUnitRow";

type Props = {
  project: Project;
};

export default function StokProjectCard({ project }: Props) {
  const activeStyle = project.isActive
    ? { color: "#2D6A4F", bg: "#F0FAF4" }
    : { color: "#8A8A8A", bg: "#F5F5F5" };

  return (
    <div className="st-project">
      <div className="st-project-header">
        <div>
          <div className="st-project-name">{project.name}</div>
          <div className="st-project-loc">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {project.city} / {project.district} — {project.address}
          </div>
          <div className="st-project-owner">
            {project.owner.firstName} {project.owner.lastName}
          </div>
        </div>

        <div className="st-project-meta">
          <span className="st-active-badge" style={{ borderColor: activeStyle.color, color: activeStyle.color, background: activeStyle.bg }}>
            {project.isActive ? "Aktif" : "Pasif"}
          </span>
          <span className="st-unit-count">{project._count.units} birim</span>
        </div>
      </div>

      {project.units && project.units.length > 0 && (
        <div className="st-units-list">
          {project.units.map((unit) => (
            <StokUnitRow key={unit.id} unit={unit} project={project} variant="small" />
          ))}
        </div>
      )}
    </div>
  );
}
