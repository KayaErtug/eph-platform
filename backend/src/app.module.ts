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
import { PushModule } from './push/push.module';
import { MessagesModule } from './messages/messages.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReferralModule } from './referral/referral.module';
import { NetworkModule } from './network/network.module';
import { SystemMessagesModule } from './system-messages/system-messages.module';
import { PortfolioImagesModule } from './portfolio-images/portfolio-images.module';
import { PortfolioDocumentsModule } from './portfolio-documents/portfolio-documents.module';
import { KatilimTalepleriModule } from './katilim-talepleri/katilim-talepleri.module';

import { LinaModule } from './lina/lina.module';

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
    PushModule,
    MessagesModule,
    NetworkModule,
    SystemMessagesModule,
    PortfolioImagesModule,
    PortfolioDocumentsModule,
    KatilimTalepleriModule,

    DashboardModule,

    ReferralModule,

    LinaModule,
  ],
})
export class AppModule {}