const fs = require('fs');
const path = 'd:/Projects/SM/backend/src/office/office-management.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add generateUniqueOfficeCode before async create(
const targetCreate = `  async create(userId: string, name: unknown) {`;
const replaceCreate = `  private async generateUniqueOfficeCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = 'OFS-' + Math.floor(10000 + Math.random() * 90000).toString();
      const existing = await tx.office.findUnique({ where: { code } });
      if (!existing) return code;
    }
    return 'OFS-' + randomUUID().substring(0, 6).toUpperCase();
  }

  async create(userId: string, name: unknown) {`;

if (content.includes(targetCreate) && !content.includes('generateUniqueOfficeCode')) {
  content = content.replace(targetCreate, replaceCreate);
  console.log('1. Added generateUniqueOfficeCode');
}

// 2. Set code in office.create
const targetOfficeCreate = `ownerUserId: userId, city: user.city, district: user.district, isActive: true } });`;
const replaceOfficeCreate = `ownerUserId: userId, city: user.city, district: user.district, isActive: true, code: await this.generateUniqueOfficeCode(tx) } });`;

if (content.includes(targetOfficeCreate)) {
  content = content.replace(targetOfficeCreate, replaceOfficeCreate);
  console.log('2. Added code to office.create');
}

// 3. Return office.code in dashboard
const targetDashboardReturn = `return { id: office.id, name: office.name, ownerName:`;
const replaceDashboardReturn = `return { id: office.id, name: office.name, code: office.code || ('OFS-' + office.id.substring(0, 5).toUpperCase()), ownerName:`;

if (content.includes(targetDashboardReturn)) {
  content = content.replace(targetDashboardReturn, replaceDashboardReturn);
  console.log('3. Added code to dashboard return');
}

// 4. Update requestJoin to accept Office Code (OFS-...) and check MUTEAHHIT role
const targetRequestJoin = `  async requestJoin(userId: string, rawCode: unknown) {
    if (typeof rawCode !== 'string' || rawCode.length > 200) throw new BadRequestException('Geçerli ofis davet kodunu girin.');
    const sanitized = rawCode.trim().toUpperCase();`;

// Let's find requestJoin in content
const rjIndex = content.indexOf('async requestJoin(userId: string, rawCode: unknown)');
if (rjIndex !== -1) {
  console.log('Found requestJoin at index', rjIndex);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Saved office-management.service.ts');
