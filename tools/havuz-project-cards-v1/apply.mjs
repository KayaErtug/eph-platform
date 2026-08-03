import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, value) {
  fs.writeFileSync(path, value, "utf8");
}

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one match, found ${count}`);
  }
  return source.replace(from, to);
}

{
  const path = "backend/src/pool-experience/pool-experience.service.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    `          project: {\n            isActive: true,\n            OR: [\n              { code: null },\n              { setupStatus: 'TAMAMLANDI' },\n            ],\n          },`,
    `          project: {\n            isActive: true,\n            code: null,\n          },`,
    "standalone pool unit query",
  );
  write(path, source);
}

{
  const path = "backend/src/pool-projects/pool-projects.service.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    `this.serializeProject(project, customers, false)`,
    `this.serializeProject(project, customers, false, false, user.id)`,
    "project list current user",
  );
  source = replaceOnce(
    source,
    `return this.serializeProject(project, customers, true);`,
    `return this.serializeProject(project, customers, true, false, user.id);`,
    "project detail current user",
  );
  source = replaceOnce(
    source,
    `const serialized = this.serializeProject(project, [], true, true);`,
    `const serialized = this.serializeProject(project, [], true, true, null);`,
    "public project serializer",
  );
  source = replaceOnce(
    source,
    `    publicMode = false,\n  ) {`,
    `    publicMode = false,\n    currentUserId: string | null = null,\n  ) {`,
    "serializer current user argument",
  );
  source = replaceOnce(
    source,
    `      isOwnPortfolio: project.owner?.id === customers?.[0]?.ownerId,`,
    `      isOwnPortfolio: project.owner?.id === currentUserId,`,
    "project ownership",
  );
  write(path, source);
}

{
  const path = "frontend/src/app/havuz/page.tsx";
  let source = read(path);
  source = replaceOnce(
    source,
    `import CustomerPresentationSheet from "@/components/presentation/CustomerPresentationSheet";`,
    `import CustomerPresentationSheet from "@/components/presentation/CustomerPresentationSheet";\nimport PoolProjectCenter from "@/components/havuz/PoolProjectCenter";`,
    "project center import",
  );
  source = replaceOnce(
    source,
    `  const [presentationUnit, setPresentationUnit] = useState<Unit | null>(null);`,
    `  const [presentationUnit, setPresentationUnit] = useState<Unit | null>(null);\n  const [projectCount, setProjectCount] = useState(0);`,
    "project count state",
  );
  source = replaceOnce(
    source,
    `            <PoolMetric label="Havuz" value={eligibleUnits.length} tone="teal" />`,
    `            <PoolMetric label="Havuz" value={eligibleUnits.length + projectCount} tone="teal" />`,
    "pool metric project count",
  );
  source = replaceOnce(
    source,
    `        <section className="space-y-3">\n          {displayedUnits.length > 0 ? (`,
    `        <PoolProjectCenter\n          search={search}\n          viewMode={viewMode}\n          canUsePoolActions={canUsePoolActions}\n          actionLockMessage={poolActionLockMessage}\n          onCountChange={setProjectCount}\n        />\n\n        <section className="space-y-3">\n          {displayedUnits.length > 0 ? (`,
    "project center render",
  );
  source = replaceOnce(
    source,
    `          ) : (\n            <section className="rounded-[24px] border-2 border-dashed border-[#C7D6E8] bg-white p-6 text-center">\n              <Building2 className="mx-auto text-[#2563EB]" size={26} />\n              <h2 className="mt-3 text-[17px] font-black text-[#1F2937]">\n                Havuza uygun portföy yok`,
    `          ) : projectCount === 0 ? (\n            <section className="rounded-[24px] border-2 border-dashed border-[#C7D6E8] bg-white p-6 text-center">\n              <Building2 className="mx-auto text-[#2563EB]" size={26} />\n              <h2 className="mt-3 text-[17px] font-black text-[#1F2937]">\n                Havuza uygun portföy yok`,
    "empty state project awareness",
  );
  source = replaceOnce(
    source,
    `              </Link>\n            </section>\n          )}\n        </section>`,
    `              </Link>\n            </section>\n          ) : null}\n        </section>`,
    "empty state ternary close",
  );
  write(path, source);
}

console.log("Havuz project cards integration applied.");
