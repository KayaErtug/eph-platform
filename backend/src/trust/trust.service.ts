import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TrustScore {
  score: number;
  badge: string;
  badgeColor: string;
  breakdown: {
    documentScore: number;
    seniorityScore: number;
    portfolioScore: number;
    activityScore: number;
    profileScore: number;
    approvalScore: number;
  };
  details: {
    approvedDocs: number;
    totalDocs: number;
    daysSinceJoined: number;
    unitCount: number;
    customerCount: number;
    activityCount: number;
    profileComplete: boolean;
  };
}

@Injectable()
export class TrustService {
  constructor(private prisma: PrismaService) {}

  async calculateTrustScore(userId: string): Promise<TrustScore> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        documents: true,
        projects: { include: { units: true } },
        customers: true,
        activities: true,
      },
    });

    if (!user) throw new Error('Kullanıcı bulunamadı');

    // A) BELGE DOĞRULAMA (max 25 puan)
    const approvedDocs = user.documents.filter(d => d.status === 'APPROVED').length;
    const totalDocs = user.documents.length;
    const documentScore = Math.min(25, approvedDocs * 8);

    // B) PLATFORM KIDEMİ (max 10 puan)
    const daysSinceJoined = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    let seniorityScore = 0;
    if (daysSinceJoined >= 730) seniorityScore = 10;       // 2+ yıl
    else if (daysSinceJoined >= 365) seniorityScore = 7;   // 1+ yıl
    else if (daysSinceJoined >= 180) seniorityScore = 5;   // 6+ ay
    else if (daysSinceJoined >= 90) seniorityScore = 3;    // 3+ ay
    else if (daysSinceJoined >= 30) seniorityScore = 1;    // 1+ ay

    // C) PORTFÖY / İLAN SAYISI (max 15 puan)
    const unitCount = user.projects.reduce((sum, p) => sum + p.units.length, 0);
    let portfolioScore = 0;
    if (unitCount >= 50) portfolioScore = 15;
    else if (unitCount >= 20) portfolioScore = 10;
    else if (unitCount >= 10) portfolioScore = 7;
    else if (unitCount >= 5) portfolioScore = 4;
    else if (unitCount >= 1) portfolioScore = 2;

    // D) CRM AKTİVİTESİ (max 10 puan)
    const customerCount = user.customers.length;
    const activityCount = user.activities.length;
    let activityScore = 0;
    if (customerCount >= 20 || activityCount >= 50) activityScore = 10;
    else if (customerCount >= 10 || activityCount >= 20) activityScore = 7;
    else if (customerCount >= 5 || activityCount >= 10) activityScore = 4;
    else if (customerCount >= 1 || activityCount >= 1) activityScore = 2;

    // E) PROFİL DOLULUK (max 10 puan)
    const profileComplete = !!(user.firstName && user.lastName && user.email && user.phone);
    const profileScore = profileComplete ? 10 : 5;

    // F) HESAP ONAY DURUMU (10 puan sabit)
    const approvalScore = user.isApproved ? 10 : 0;

    const score = Math.min(100, documentScore + seniorityScore + portfolioScore + activityScore + profileScore + approvalScore);

    // ROZET
    let badge = 'Başlangıç Üye';
    let badgeColor = '#8A8A8A';
    if (score >= 81) { badge = 'Elite Network'; badgeColor = '#C9A84C'; }
    else if (score >= 61) { badge = 'Premium Partner'; badgeColor = '#0F2044'; }
    else if (score >= 41) { badge = 'Güvenilir Partner'; badgeColor = '#2D6A4F'; }
    else if (score >= 21) { badge = 'Doğrulanmış Üye'; badgeColor = '#1A4A7A'; }

    return {
      score,
      badge,
      badgeColor,
      breakdown: { documentScore, seniorityScore, portfolioScore, activityScore, profileScore, approvalScore },
      details: { approvedDocs, totalDocs, daysSinceJoined, unitCount, customerCount, activityCount, profileComplete },
    };
  }

  async getTrustScore(userId: string) {
    return this.calculateTrustScore(userId);
  }

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { isApproved: true, role: { not: 'ADMIN' } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    const scores = await Promise.all(
      users.map(async u => {
        const trust = await this.calculateTrustScore(u.id);
        return { ...u, score: trust.score, badge: trust.badge, badgeColor: trust.badgeColor };
      })
    );

    return scores.sort((a, b) => b.score - a.score).slice(0, 20);
  }
}