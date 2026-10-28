import { Module } from "@nestjs/common";

import { PropertyDemandAdapter } from "./property-demand.adapter";

@Module({
  providers: [PropertyDemandAdapter],
  exports: [PropertyDemandAdapter],
})
export class PropertyDemandModule {}
