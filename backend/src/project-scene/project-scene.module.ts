import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectSceneController } from './project-scene.controller';
import { ProjectSceneService } from './project-scene.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectSceneController],
  providers: [ProjectSceneService],
})
export class ProjectSceneModule {}
