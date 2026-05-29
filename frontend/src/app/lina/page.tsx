import EphAppShell from "@/components/EphAppShell";
import LinaPanel from "@/components/LinaPanel";

export default function LinaPage() {
  return (
    <EphAppShell title="Lina">
      <div className="mx-auto w-full max-w-4xl">
        <LinaPanel />
      </div>
    </EphAppShell>
  );
}