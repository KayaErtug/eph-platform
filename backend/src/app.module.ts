import { CrmModule } from './crm/crm.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { ProfileModule } from './profile/profile.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ProjectsModule } from './projects/projects.module';
import { UnitsModule } from './units/units.module';
import { NominationsModule } from './nominations/nominations.module';
import { ApplicationsModule } from './applications/applications.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  imports: [
    CrmModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SupabaseModule,
    InvitationsModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ProfileModule,
    ProjectsModule,
    UnitsModule,
    NominationsModule,
    ApplicationsModule,
    LeadsModule,
  ],
})
export class AppModule {}