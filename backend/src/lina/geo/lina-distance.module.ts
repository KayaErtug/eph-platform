import { Module } from "@nestjs/common";

import { LinaDistanceService } from "./lina-distance.service";

@Module({
  providers: [LinaDistanceService],
  exports: [LinaDistanceService],
})
export class LinaDistanceModule {}
