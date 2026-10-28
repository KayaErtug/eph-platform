import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProjectRenderController } from './project-render.controller';
import { ProjectRenderService } from './project-render.service';

@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [ProjectRenderController],
  providers: [ProjectRenderService],
})
export class ProjectRenderModule {}
