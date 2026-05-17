import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketService {
  constructor(private prisma: PrismaService) {}

  async getPulse() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Tüm aktif birimler
    const allUnits = await this.prisma.unit.findMany({
      where: { status: { not: 'PASIF' }, project: { isActive: true } },
      include: { project: { select: { city: true, district: true } } },
    });

    // Son 30 gün eklenen birimler
    const newUnits30 = await this.prisma.unit.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Son 7 gün eklenen birimler
    const newUnits7 = await this.prisma.unit.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // Satılan/kapanan ilanlar
    const closedUnits = await this.prisma.unit.count({
      where: { status: { in: ['SATILDI', 'KIRALANDII'] } },
    });

    // Toplam aktif
    const totalActive = allUnits.filter(u => !['SATILDI', 'KIRALANDII', 'PASIF'].includes(u.status)).length;

    // Bölgesel analiz
    const districtMap: Record<string, { count: number; totalPrice: number; totalArea: number; city: string }> = {};

    for (const unit of allUnits) {
      const key = unit.project.district || 'Bilinmiyor';
      if (!districtMap[key]) {
        districtMap[key] = { count: 0, totalPrice: 0, totalArea: 0, city: unit.project.city };
      }
      districtMap[key].count++;
      districtMap[key].totalPrice += unit.price;
      if (unit.area) districtMap[key].totalArea += unit.area;
    }

    // En aktif 8 bölge
    const topDistricts = Object.entries(districtMap)
      .map(([district, data]) => ({
        district,
        city: data.city,
        count: data.count,
        avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0,
        avgPricePerM2: data.totalArea > 0 ? Math.round(data.totalPrice / data.totalArea) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Fiyat istatistikleri
    const prices = allUnits.map(u => u.price).filter(p => p > 0);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // m² fiyatları
    const unitsWithArea = allUnits.filter(u => u.area && u.area > 0 && u.price > 0);
    const pricesPerM2 = unitsWithArea.map(u => u.price / u.area!);
    const avgPricePerM2 = pricesPerM2.length > 0
      ? Math.round(pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length)
      : 0;

    // Durum dağılımı
    const statusMap: Record<string, number> = {};
    for (const unit of allUnits) {
      statusMap[unit.status] = (statusMap[unit.status] || 0) + 1;
    }

    // Tip dağılımı
    const typeMap: Record<string, number> = {};
    for (const unit of allUnits) {
      typeMap[unit.type] = (typeMap[unit.type] || 0) + 1;
    }
    const topTypes = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Platform genel istatistikleri
    const totalUsers = await this.prisma.user.count({ where: { isApproved: true } });
    const totalProjects = await this.prisma.project.count({ where: { isActive: true } });
    const totalCustomers = await this.prisma.customer.count();

    return {
      summary: {
        totalActive,
        totalUnits: allUnits.length,
        newUnits30,
        newUnits7,
        closedUnits,
        closureRate: allUnits.length > 0 ? Math.round((closedUnits / allUnits.length) * 100) : 0,
        avgPrice,
        minPrice,
        maxPrice,
        avgPricePerM2,
        totalUsers,
        totalProjects,
        totalCustomers,
      },
      topDistricts,
      statusDistribution: statusMap,
      typeDistribution: topTypes,
    };
  }
}