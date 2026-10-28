import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

type RenderJobStatus =
  | 'YOK'
  | 'BEKLIYOR'
  | 'URETILIYOR'
  | 'TAMAMLANDI'
  | 'HATA';

type RenderJob = {
  id: string;
  projectId: string;
  status: RenderJobStatus;
  progress: number;
  message: string;
  model: string;
  sourceSceneVersion: number;
  resultUrl: string | null;
  supabaseUrl: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

type StartRenderInput = {
  projectId: string;
  userId: string;
  userRole: Role | string;
  referenceImage?: Express.Multer.File;
};

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

type SceneElementRecord = {
  id?: unknown;
  type?: unknown;
  name?: unknown;
  code?: unknown;
  geometryType?: unknown;
  floorCount?: unknown;
  spaceType?: unknown;
  position?: unknown;
  rotationY?: unknown;
  size?: unknown;
  facadeStyle?: unknown;
  stylePreset?: unknown;
};

const ACTIVE_JOB_STATUSES = new Set<RenderJobStatus>([
  'BEKLIYOR',
  'URETILIYOR',
]);

@Injectable()
export class ProjectRenderService {
  private readonly logger = new Logger(ProjectRenderService.name);
  private readonly jobs = new Map<string, RenderJob>();
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getRenderStatus(
    projectId: string,
    userId: string,
    userRole: Role | string,
  ) {
    const context = await this.getAuthorizedContext(
      projectId,
      userId,
      userRole,
    );
    const job = this.jobs.get(projectId) || null;
    const latestRenderUrl =
      job?.resultUrl || context.scene?.thumbnailUrl || null;

    return {
      configured: Boolean(this.openAiApiKey()),
      model: this.imageModel(),
      project: {
        id: context.project.id,
        name: context.project.name,
        code: context.project.code,
        city: context.project.city,
        district: context.project.district,
      },
      scene: context.scene
        ? {
            initialized: true,
            version: context.scene.version,
            status: context.scene.status,
            thumbnailUrl: context.scene.thumbnailUrl,
          }
        : {
            initialized: false,
            version: null,
            status: null,
            thumbnailUrl: null,
          },
      job: job
        ? this.publicJob(job)
        : {
            id: null,
            status: latestRenderUrl ? 'TAMAMLANDI' : 'YOK',
            progress: latestRenderUrl ? 100 : 0,
            message: latestRenderUrl
              ? 'Son sunum renderı hazır.'
              : 'Henüz sunum renderı oluşturulmadı.',
            model: this.imageModel(),
            sourceSceneVersion: context.scene?.version || null,
            resultUrl: latestRenderUrl,
            error: null,
            createdAt: null,
            startedAt: null,
            completedAt: null,
          },
      latestRenderUrl,
    };
  }

  async startRender(input: StartRenderInput) {
    const context = await this.getAuthorizedContext(
      input.projectId,
      input.userId,
      input.userRole,
    );

    if (!context.scene) {
      throw new BadRequestException(
        'Sunum renderı oluşturulmadan önce 3D proje sahnesi hazırlanmalıdır.',
      );
    }

    if (
      context.scene.status === 'ATLANDI' ||
      this.sceneWasSkipped(context.scene.sceneData)
    ) {
      throw new BadRequestException(
        '3D proje aşaması atlandığı için sunum renderı oluşturulamaz.',
      );
    }

    const blockCount = this.sceneElements(context.scene.sceneData).filter(
      (element) => String(element.type || '').toUpperCase() === 'BLOCK',
    ).length;

    if (blockCount === 0) {
      throw new BadRequestException(
        'Render alınacak sahnede aktif blok bulunamadı.',
      );
    }

    this.validateReferenceImage(input.referenceImage);

    if (!this.openAiApiKey()) {
      throw new BadRequestException(
        'Sunum renderı için OPENAI_API_KEY tanımlı değil.',
      );
    }

    const currentJob = this.jobs.get(input.projectId);

    if (
      currentJob &&
      ACTIVE_JOB_STATUSES.has(currentJob.status)
    ) {
      throw new ConflictException(
        'Bu proje için bir sunum renderı zaten oluşturuluyor.',
      );
    }

    const job: RenderJob = {
      id: randomUUID(),
      projectId: input.projectId,
      status: 'BEKLIYOR',
      progress: 5,
      message: 'Render görevi sıraya alındı.',
      model: this.imageModel(),
      sourceSceneVersion: context.scene.version,
      resultUrl: null,
      supabaseUrl: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    this.jobs.set(input.projectId, job);

    const referenceBuffer = Buffer.from(
      input.referenceImage!.buffer,
    );
    const referenceMimetype =
      input.referenceImage!.mimetype || 'image/png';

    setImmediate(() => {
      void this.processRender({
        context,
        jobId: job.id,
        referenceBuffer,
        referenceMimetype,
      });
    });

    return {
      accepted: true,
      job: this.publicJob(job),
    };
  }

  private async processRender(input: {
    context: Awaited<
      ReturnType<ProjectRenderService['getAuthorizedContext']>
    >;
    jobId: string;
    referenceBuffer: Buffer;
    referenceMimetype: string;
  }) {
    const { context, jobId } = input;
    const job = this.jobs.get(context.project.id);

    if (!job || job.id !== jobId) {
      return;
    }

    try {
      this.patchJob(context.project.id, {
        status: 'URETILIYOR',
        progress: 20,
        message:
          'Sahne verileri gerçekçi sunum renderına dönüştürülüyor.',
        startedAt: new Date().toISOString(),
      });

      const prompt = this.buildRenderPrompt(
        context.project,
        context.scene!.sceneData,
      );
      const imageBuffer = await this.generateImage({
        prompt,
        referenceBuffer: input.referenceBuffer,
        referenceMimetype: input.referenceMimetype,
      });

      this.patchJob(context.project.id, {
        progress: 82,
        message: 'Render güvenli görsel deposuna kaydediliyor.',
      });

      const path =
        `project-renders/${this.slug(context.project.ownerId)}/` +
        `${this.slug(context.project.id)}/` +
        `${Date.now()}-${job.id}.png`;

      await this.supabaseService.uploadFile(
        this.bucket,
        path,
        imageBuffer,
        'image/png',
      );

      const supabaseUrl =
        this.supabaseService.getPublicUrl(this.bucket, path);
      const resultUrl = supabaseUrl;

      await this.prisma.projectScene.update({
        where: {
          projectId: context.project.id,
        },
        data: {
          thumbnailUrl: resultUrl,
        },
      });

      this.patchJob(context.project.id, {
        status: 'TAMAMLANDI',
        progress: 100,
        message: 'Sunum renderı hazır.',
        resultUrl,
        supabaseUrl,
        completedAt: new Date().toISOString(),
      });

      this.logger.log(
        `Sunum renderı tamamlandı: project=${context.project.id}, job=${job.id}`,
      );
    } catch (error) {
      const message = this.errorMessage(error);

      this.patchJob(context.project.id, {
        status: 'HATA',
        progress: 0,
        message: 'Sunum renderı oluşturulamadı.',
        error: message,
        completedAt: new Date().toISOString(),
      });

      this.logger.error(
        `Sunum renderı başarısız: project=${context.project.id}, job=${job.id}, error=${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async generateImage(input: {
    prompt: string;
    referenceBuffer: Buffer;
    referenceMimetype: string;
  }) {
    const form = new FormData();
    const referenceBytes = new Uint8Array(
      input.referenceBuffer.byteLength,
    );
    referenceBytes.set(input.referenceBuffer);

    form.append('model', this.imageModel());
    form.append('prompt', input.prompt);
    form.append(
      'image',
      new Blob([referenceBytes.buffer], {
        type: input.referenceMimetype,
      }),
      'eph-vaziyet-referansi.png',
    );
    form.append('size', '1536x1024');
    form.append(
      'quality',
      process.env.OPENAI_RENDER_QUALITY || 'high',
    );
    form.append('input_fidelity', 'high');
    form.append('output_format', 'png');
    form.append('background', 'opaque');

    const response = await fetch(
      'https://api.openai.com/v1/images/edits',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openAiApiKey()}`,
        },
        body: form,
        signal: AbortSignal.timeout(360_000),
      },
    );

    const raw = await response.text();
    let payload: OpenAiImageResponse;

    try {
      payload = raw
        ? (JSON.parse(raw) as OpenAiImageResponse)
        : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const apiMessage =
        payload.error?.message ||
        raw ||
        `HTTP ${response.status}`;

      throw new BadRequestException(
        `Görsel üretim servisi hatası: ${apiMessage}`,
      );
    }

    const base64 = payload.data?.[0]?.b64_json;

    if (!base64) {
      throw new BadRequestException(
        'Görsel üretim servisi render verisi döndürmedi.',
      );
    }

    const buffer = Buffer.from(base64, 'base64');

    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      throw new BadRequestException(
        'Üretilen render geçerli PNG biçiminde değil.',
      );
    }

    return buffer;
  }

  private buildRenderPrompt(
    project: {
      name: string;
      city: string;
      district: string;
    },
    sceneData: unknown,
  ) {
    const elements = this.sceneElements(sceneData);
    const blocks = elements.filter(
      (element) =>
        String(element.type || '').toUpperCase() === 'BLOCK',
    );
    const amenities = elements.filter(
      (element) =>
        String(element.type || '').toUpperCase() !== 'BLOCK',
    );

    const blockLines = blocks.map((element, index) => {
      const size = this.objectValue(element.size);
      const facade = this.objectValue(element.facadeStyle);
      const position = Array.isArray(element.position)
        ? element.position
        : [];

      return [
        `${index + 1}. ${String(element.name || element.code || `Blok ${index + 1}`)}`,
        `kat: ${Number(element.floorCount) || 1}`,
        `geometri: ${String(element.geometryType || 'DIKDORTGEN')}`,
        `cephe paketi: ${String(facade.preset || element.stylePreset || 'MODERN_LIGHT')}`,
        `konum: x=${Number(position[0]) || 0}, z=${Number(position[2]) || 0}`,
        `taban: ${Number(size.width) || 0}x${Number(size.depth) || 0} m`,
      ].join(', ');
    });

    const amenityLines = amenities.map((element, index) => {
      const size = this.objectValue(element.size);
      const position = Array.isArray(element.position)
        ? element.position
        : [];

      return [
        `${index + 1}. ${String(element.name || 'Proje alanı')}`,
        `tür: ${String(element.spaceType || 'DIGER')}`,
        `konum: x=${Number(position[0]) || 0}, z=${Number(position[2]) || 0}`,
        `ölçek: ${Number(size.width) || 0}x${Number(size.depth) || 0} m`,
      ].join(', ');
    });

    return [
      'Transform the attached EPH architectural site-plan reference into one premium photorealistic real-estate marketing render.',
      'The input image is a strict composition and geometry reference, not a loose inspiration.',
      `Project location: ${project.city}, ${project.district}.`,
      `The project has exactly ${blocks.length} building blocks. Do not add, remove, merge, split or relocate any building.`,
      'Preserve the exact relative positions, footprints, building heights, floor counts, rotations, site entrance and amenity positions shown in the reference.',
      'Keep all buildings fully inside the plot and maintain believable roads, pedestrian paths and landscape clearances.',
      'Render style: high-end contemporary Turkish residential development, physically plausible materials, realistic windows and balconies, refined facade details, mature landscaping, clean roads, subtle parked cars, premium daylight architectural visualization, elevated oblique drone camera.',
      'Create a balanced wide 3:2 composition suitable for a property sales presentation.',
      'Do not include text, labels, logos, watermarks, UI panels, legends, arrows or people in the foreground.',
      'Building specification:',
      ...blockLines,
      'Amenity specification:',
      ...(amenityLines.length > 0
        ? amenityLines
        : ['No additional amenity was declared.']),
      'The result is a conceptual sales visualization; nevertheless, layout fidelity to the supplied reference is the highest priority.',
    ].join('\n');
  }

  private async getAuthorizedContext(
    projectId: string,
    userId: string,
    userRole: Role | string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        code: true,
        city: true,
        district: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    if (
      project.ownerId !== userId &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Bu projenin sunum renderına erişim yetkiniz yok.',
      );
    }

    const scene = await this.prisma.projectScene.findUnique({
      where: {
        projectId,
      },
    });

    return {
      project,
      scene,
    };
  }

  private validateReferenceImage(
    file?: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Render referans görseli hazırlanamadı.',
      );
    }

    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException(
        'Render referansı PNG, JPEG veya WEBP olmalıdır.',
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new BadRequestException(
        'Render referansı en fazla 8 MB olabilir.',
      );
    }

    if (!this.matchesSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'Render referansının dosya içeriği geçersiz.',
      );
    }
  }

  private matchesSignature(
    buffer: Buffer,
    mimetype: string,
  ) {
    if (mimetype === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }

    if (mimetype === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (mimetype === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }

    return false;
  }

  private sceneWasSkipped(sceneData: unknown) {
    return Boolean(this.objectValue(sceneData).skipped);
  }

  private sceneElements(
    sceneData: unknown,
  ): SceneElementRecord[] {
    const source = this.objectValue(sceneData);

    return Array.isArray(source.elements)
      ? (source.elements.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item),
        ) as SceneElementRecord[])
      : [];
  }

  private objectValue(
    value: unknown,
  ): Record<string, any> {
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private patchJob(
    projectId: string,
    patch: Partial<RenderJob>,
  ) {
    const current = this.jobs.get(projectId);

    if (!current) {
      return;
    }

    this.jobs.set(projectId, {
      ...current,
      ...patch,
    });
  }

  private publicJob(job: RenderJob) {
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      model: job.model,
      sourceSceneVersion: job.sourceSceneVersion,
      resultUrl: job.resultUrl,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  private openAiApiKey() {
    return String(process.env.OPENAI_API_KEY || '').trim();
  }

  private imageModel() {
    return String(
      process.env.OPENAI_RENDER_IMAGE_MODEL ||
        'gpt-image-1.5',
    ).trim();
  }

  private slug(value: string) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private errorMessage(error: unknown) {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (
        response &&
        typeof response === 'object' &&
        'message' in response
      ) {
        const message = (response as { message?: unknown })
          .message;

        return Array.isArray(message)
          ? message.join(' ')
          : String(message || error.message);
      }
    }

    return error instanceof Error
      ? error.message
      : String(error);
  }
}
