import { Injectable, OnModuleInit } from '@nestjs/common';
import { Role } from '@prisma/client';

import { CrmService } from '../../crm/crm.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LinaToolRegistryService } from './lina-tool-registry.service';
import {
  LinaToolDefinition,
  LinaToolJsonSchema,
} from './lina-tool.types';

const ALL_EPH_ROLES: Role[] = [
  Role.EMLAKCI,
  Role.MUTEAHHIT,
  Role.INSAAT_FIRMASI,
  Role.ADMIN,
  Role.SUPER_ADMIN,
  Role.MODERATOR,
];

const NO_INPUT_SCHEMA: LinaToolJsonSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
};

@Injectable()
export class LinaCoordinationReadToolProviderService
  implements OnModuleInit
{
  constructor(
    private readonly registryService: LinaToolRegistryService,
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
  ) {}

  onModuleInit(): void {
    this.registryService.registerMany([
      {
        definition: this.getCrmInterestListDefinition(),
        handler: async (_input, context) => {
          const interests = await this.prisma.customerInterest.findMany({
            where: {
              isActive: true,
              customer: {
                ownerId: context.userId,
              },
            },
            select: {
              id: true,
              title: true,
              city: true,
              district: true,
              neighborhood: true,
              propertyTypes: true,
              statuses: true,
              minBudget: true,
              maxBudget: true,
              priceCurrency: true,
              minArea: true,
              maxArea: true,
              roomCounts: true,
              features: true,
              priority: true,
              lastMatchedAt: true,
              updatedAt: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  status: true,
                },
              },
            },
            orderBy: [
              { priority: 'desc' },
              { updatedAt: 'desc' },
            ],
            take: 30,
          });

          return {
            success: true,
            message: `${interests.length} aktif CRM talep profili getirildi.`,
            data: {
              total: interests.length,
              items: interests,
            },
          };
        },
      },
      {
        definition: this.getCrmPoolMatchesDefinition(),
        handler: async (input, context) => {
          const interestId = String(input.interestId || '').trim();
          const requestedLimit = Number(input.limit || 10);
          const limit = Math.max(
            1,
            Math.min(
              20,
              Number.isFinite(requestedLimit)
                ? Math.floor(requestedLimit)
                : 10,
            ),
          );

          if (!interestId) {
            return {
              success: false,
              message: 'CRM talep profili kimliği gereklidir.',
            };
          }

          const matches = await this.crmService.getCustomerInterestMatches(
            interestId,
            context.userId,
            context.role,
          );
          const items = matches.slice(0, limit);

          return {
            success: true,
            message:
              items.length > 0
                ? `${items.length} Havuz eşleşmesi puan sırasıyla getirildi.`
                : 'Bu CRM talebi için uygun Havuz eşleşmesi bulunamadı.',
            data: {
              interestId,
              totalMatches: matches.length,
              returnedMatches: items.length,
              items,
            },
          };
        },
      },
      {
        definition: this.getRequestCenterListDefinition(),
        handler: async (_input, context) => {
          const posts = await this.prisma.networkPost.findMany({
            where: {
              userId: context.userId,
              isActive: true,
            },
            select: {
              id: true,
              type: true,
              title: true,
              city: true,
              district: true,
              neighborhood: true,
              minBudget: true,
              maxBudget: true,
              propertyTypes: true,
              roomCounts: true,
              urgency: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 30,
          });

          return {
            success: true,
            message: `${posts.length} aktif Talep Merkezi kaydı getirildi.`,
            data: {
              total: posts.length,
              items: posts,
            },
          };
        },
      },
      {
        definition: this.getPoolPortfolioListDefinition(),
        handler: async (_input, context) => {
          const units = await this.prisma.unit.findMany({
            where: {
              isPoolVisible: true,
              project: {
                ownerId: context.userId,
                isActive: true,
              },
            },
            select: {
              id: true,
              type: true,
              status: true,
              price: true,
              priceCurrency: true,
              roomCount: true,
              area: true,
              features: true,
              poolPublishedAt: true,
              updatedAt: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  district: true,
                  neighborhood: true,
                },
              },
              images: {
                where: { isCover: true },
                select: { url: true },
                take: 1,
              },
            },
            orderBy: { poolPublishedAt: 'desc' },
            take: 50,
          });

          return {
            success: true,
            message: `${units.length} Havuzdaki portföyünüz getirildi.`,
            data: {
              total: units.length,
              items: units.map((unit) => ({
                ...unit,
                coverImage: unit.images[0]?.url || null,
                images: undefined,
              })),
            },
          };
        },
      },
    ]);
  }

  private getCrmInterestListDefinition(): LinaToolDefinition {
    return {
      name: 'list_my_crm_interests',
      description:
        'Kullanıcının kendi CRM müşterilerine ait aktif gayrimenkul talep profillerini güvenli özet alanlarıyla listeler.',
      family: 'coordination',
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: NO_INPUT_SCHEMA,
    };
  }

  private getCrmPoolMatchesDefinition(): LinaToolDefinition {
    return {
      name: 'find_crm_interest_pool_matches',
      description:
        'Seçilen CRM talep profilini Havuz portföyleriyle karşılaştırır; eşleşme puanı, gerekçeleri ve mesafe bilgisiyle en uygun sonuçları getirir.',
      family: 'coordination',
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: {
        type: 'object',
        properties: {
          interestId: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'CRM talep profili kimliği.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            description: 'Döndürülecek en fazla eşleşme sayısı.',
          },
        },
        required: ['interestId', 'limit'],
        additionalProperties: false,
      },
    };
  }

  private getRequestCenterListDefinition(): LinaToolDefinition {
    return {
      name: 'list_my_request_center_posts',
      description:
        'Kullanıcının kendi aktif Talep Merkezi kayıtlarını bütçe, konum, gayrimenkul türü ve geçerlilik bilgileriyle listeler.',
      family: 'coordination',
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: NO_INPUT_SCHEMA,
    };
  }

  private getPoolPortfolioListDefinition(): LinaToolDefinition {
    return {
      name: 'list_my_pool_portfolios',
      description:
        'Kullanıcının Havuzda yayınlanan kendi portföylerini güvenli satış ve konum özetleriyle listeler.',
      family: 'coordination',
      riskLevel: 0,
      allowedRoles: ALL_EPH_ROLES,
      inputSchema: NO_INPUT_SCHEMA,
    };
  }
}
