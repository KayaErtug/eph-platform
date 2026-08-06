import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const files = {
  backend: path.join(root, "backend/src/units/units.service.ts"),
  frontend: path.join(root, "frontend/src/app/portfoy/[id]/page.tsx"),
};

for (const filePath of Object.values(files)) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya bulunamadı: ${filePath}`);
  }
}

const backups = Object.fromEntries(
  Object.entries(files).map(([key, filePath]) => {
    const backupPath = `${filePath}.backup-document-free-pool-${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
    return [key, backupPath];
  }),
);

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start >= 0 ? start : 0);

  if (start < 0 || end < 0) {
    throw new Error(`${label} sınırları bulunamadı.`);
  }

  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

let backend = fs.readFileSync(files.backend, "utf8");

const backendMethodStart = "  async submitApproval(id: string, user: CurrentUserPayload) {";
const backendMethodEnd = "  async markReviewing(";

const directPublishMethod = String.raw`  async submitApproval(id: string, user: CurrentUserPayload) {
    const unit = await this.getUnitWithProjectOrFail(id);

    this.ensureCanManageUnit(user, unit.project.ownerId);
    this.ensureProjectVisibleForPortfolioActions(unit.project);
    await this.ensurePoolActionMembership(user);

    if (
      unit.isPoolVisible &&
      unit.approvalStatus === PortfolioApprovalStatus.HAVUZDA
    ) {
      return this.prisma.unit.findUnique({
        where: { id },
        include: unitInclude,
      });
    }

    const ownerRole = unit.project.owner?.role || user.role;
    const normalizedOwnerRole = String(ownerRole || "").toUpperCase();
    const supportedPublisherRoles = new Set<string>([
      String(Role.EMLAKCI),
      String(Role.MUTEAHHIT),
      String(Role.INSAAT_FIRMASI),
    ]);

    if (!supportedPublisherRoles.has(normalizedOwnerRole)) {
      throw new BadRequestException(
        "Bu kullanıcı rolü için portföy yayınlama akışı tanımlı değildir.",
      );
    }

    const ownerRoleLabels: Record<string, string> = {
      [String(Role.EMLAKCI)]: "Emlakçı",
      [String(Role.MUTEAHHIT)]: "Müteahhit",
      [String(Role.INSAAT_FIRMASI)]: "İnşaat Firması",
    };
    const ownerRoleLabel =
      ownerRoleLabels[normalizedOwnerRole] || "Portföy sahibi";
    const publishedAt = new Date();
    const approvalNote =
      \`\${ownerRoleLabel} portföyü geçici belge muafiyeti kapsamında doğrudan havuzda yayınlandı.\`;

    return this.prisma.$transaction(async (tx) => {
      const updatedUnit = await tx.unit.update({
        where: { id },
        data: {
          approvalStatus: PortfolioApprovalStatus.HAVUZDA,
          submittedForApprovalAt: null,
          approvedAt: publishedAt,
          rejectedAt: null,
          approvalNote,
          isPoolVisible: true,
          poolPublishedAt: publishedAt,
          poolRemovedAt: null,
        },
        include: unitInclude,
      });

      await this.createPortfolioApprovalAuditLog(tx, {
        actorId: user.id,
        targetUserId: unit.project.ownerId,
        action: "PORTFOLIO_DIRECT_POOL_PUBLISH_DOCUMENT_EXEMPTION",
        unitId: id,
        description:
          "Portföy, geçici Tapu ve Yetki Belgesi muafiyeti kapsamında doğrudan havuzda yayınlandı.",
        metadata: {
          approvalStatusBefore: unit.approvalStatus,
          approvalStatusAfter: PortfolioApprovalStatus.HAVUZDA,
          ownerRole: normalizedOwnerRole,
          temporaryDocumentExemption: true,
          publishedAt: publishedAt.toISOString(),
        } as Prisma.InputJsonValue,
      });

      return updatedUnit;
    });
  }

`;

if (!backend.includes("PORTFOLIO_DIRECT_POOL_PUBLISH_DOCUMENT_EXEMPTION")) {
  backend = replaceBetween(
    backend,
    backendMethodStart,
    backendMethodEnd,
    directPublishMethod,
    "Backend submitApproval metodu",
  );
}

backend = backend.replace(
  String.raw`    const ownerRole = unit.project.owner?.role || user.role;
    const isDirectPoolPublisher =
      this.isDirectPoolPublisherRole(ownerRole);

`,
  "",
);

backend = backend.replace(
  String.raw`        approvalNote: isDirectPoolPublisher
          ? 'Portföy havuzdan kaldırıldı. Bilgileri güncelledikten sonra yeniden doğrudan havuzda yayınlayabilirsiniz.'
          : 'Portföy havuzdan kaldırıldı. Bilgileri güncelledikten sonra Tapu ve Yetki Belgesi ile yeniden incelemeye gönderin.',`,
  String.raw`        approvalNote:
          'Portföy havuzdan kaldırıldı. Bilgileri güncelledikten sonra yeniden havuza gönderebilirsiniz.',`,
);

fs.writeFileSync(files.backend, backend, "utf8");

let frontend = fs.readFileSync(files.frontend, "utf8");

const frontendSubmitStart = "  const handleSubmitApproval = async () => {";
const frontendSubmitEnd = "  const getPortfolioShareData";

const frontendSubmitMethod = String.raw`  const handleSubmitApproval = async () => {
    if (!unit) return;

    setApprovalActionLoading("DIRECT_POOL");
    setActionError("");

    try {
      await api.post(\`/units/\${unit.id}/submit-approval\`);
      await fetchUnit();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          "Portföy havuza gönderilemedi. Aktif üyeliğinizi ve zorunlu portföy bilgilerini kontrol ediniz.",
      );
    } finally {
      setApprovalActionLoading("");
    }
  };

  `;

if (!frontend.includes("Portföy havuza gönderilemedi. Aktif üyeliğinizi")) {
  frontend = replaceBetween(
    frontend,
    frontendSubmitStart,
    frontendSubmitEnd,
    frontendSubmitMethod,
    "Frontend havuza gönder metodu",
  );
}

frontend = frontend.replace(
  "  const canReviewPortfolio = canReviewDetailUnit(user);\n",
  "",
);
frontend = frontend.replace(
  String.raw`  const portfolioOwnerRole = String(
    unit.project?.owner?.role || user?.role || "",
  ).toUpperCase();
  const isDirectPoolPublisher =
    isDirectPoolPublisherRole(portfolioOwnerRole);
`,
  "",
);

const poolStateAnchor =
  "  const doorAccessInfo = String((unit as any)?.doorAccessInfo || \"\").trim();\n";
const poolStateLine = String.raw`  const isPoolPublished = Boolean(
    unit.isPoolVisible || unit.approvalStatus === "HAVUZDA",
  );
`;

if (!frontend.includes("const isPoolPublished = Boolean(")) {
  if (!frontend.includes(poolStateAnchor)) {
    throw new Error("Frontend havuz durum sabitleme noktası bulunamadı.");
  }
  frontend = frontend.replace(
    poolStateAnchor,
    `${poolStateAnchor}${poolStateLine}`,
  );
}

const approvalCenterStart = "        {canReviewPortfolio && (";
const managementStart = "        {canEditPortfolio && managementOpen && (";

if (frontend.includes(approvalCenterStart)) {
  frontend = replaceBetween(
    frontend,
    approvalCenterStart,
    managementStart,
    "",
    "Yönetici portföy onay merkezi",
  );
}

const legacyPublishStart =
  "        {canEditPortfolio && isDirectPoolPublisher && (";
const editDeleteSectionStart =
  "        {canEditPortfolio && (\n          <section className=\"mt-2 rounded-[20px] border border-rose-100";

const poolPublishSection = String.raw`        {canEditPortfolio && (
          <section className="mt-3 rounded-[22px] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#1557D6] text-white shadow-[0_10px_22px_rgba(21,87,214,0.22)]">
              <Send size={18} />
            </div>
            <h2 className="mt-2 text-[16px] font-black text-[#06194A]">
              {isPoolPublished ? "Havuzda Yayında" : "Havuza Gönder"}
            </h2>
            <p className="mx-auto mt-1 max-w-[350px] text-[11px] font-bold leading-5 text-[#64748B]">
              {isPoolPublished
                ? "Bu portföy EPH Havuzunda aktif olarak yayınlanıyor."
                : "Portföyünüz, aktif üyelik ve zorunlu bilgi kontrollerinden sonra doğrudan EPH Havuzunda yayınlanacaktır."}
            </p>
            <button
              type="button"
              onClick={handleSubmitApproval}
              disabled={Boolean(approvalActionLoading) || isPoolPublished}
              className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#1557D6] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(21,87,214,0.20)] disabled:bg-emerald-100 disabled:text-emerald-700 disabled:shadow-none"
            >
              {approvalActionLoading === "DIRECT_POOL" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {approvalActionLoading === "DIRECT_POOL"
                ? "Havuza Gönderiliyor..."
                : isPoolPublished
                  ? "Havuzda Yayında"
                  : "Havuza Gönder"}
            </button>
          </section>
        )}

`;

if (frontend.includes(legacyPublishStart)) {
  frontend = replaceBetween(
    frontend,
    legacyPublishStart,
    editDeleteSectionStart,
    poolPublishSection,
    "Eski belge ve yayın blokları",
  );
} else if (!frontend.includes("Portföyünüz, aktif üyelik ve zorunlu bilgi")) {
  throw new Error("Eski Belge Yükleme Merkezi/yayın bloğu bulunamadı.");
}

fs.writeFileSync(files.frontend, frontend, "utf8");

console.log("Geçici belgesiz havuz yayın politikası uygulandı.");
console.log("- Belge Yükleme Merkezi aktif portföy ekranından kaldırıldı.");
console.log("- Yönetici belge/onay merkezi aktif portföy ekranından kaldırıldı.");
console.log("- Tüm desteklenen portföy sahipleri Havuza Gönder butonunu kullanacak.");
console.log("- Backend Tapu/Yetki Belgesi kontrolü yapmadan doğrudan HAVUZDA durumuna geçirecek.");
console.log("- Aktif üyelik ve zorunlu portföy bilgi kontrolleri korunmuştur.");
console.log("- Eski belge/onay kodları geri dönüş için kaynakta pasif olarak korunmuştur.");
console.log(`Backend yedeği: ${backups.backend}`);
console.log(`Frontend yedeği: ${backups.frontend}`);
