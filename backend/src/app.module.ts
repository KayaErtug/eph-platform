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
import { CrmModule } from './crm/crm.module';
import { TrustModule } from './trust/trust.module';
import { MarketModule } from './market/market.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
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
    CrmModule,
    TrustModule,
    MarketModule,
    VisitsModule,
  ],
})
export class AppModule {}