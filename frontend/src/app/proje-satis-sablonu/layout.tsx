import type { ReactNode } from "react";

import Project3DQuickNav from "./Project3DQuickNav";

export default function ProjectSalesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Project3DQuickNav />
    </>
  );
}
