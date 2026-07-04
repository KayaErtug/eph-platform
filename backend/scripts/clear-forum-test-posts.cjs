const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.networkPost.findMany({ select: { id: true } });
  const postIds = posts.map((post) => post.id);

  if (postIds.length === 0) {
    console.log("Silinecek Forum test talebi bulunamadı.");
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const notifications = await tx.networkNotification.deleteMany({ where: { postId: { in: postIds } } });
    const followers = await tx.networkPostFollower.deleteMany({ where: { postId: { in: postIds } } });
    const views = await tx.networkPostView.deleteMany({ where: { postId: { in: postIds } } });
    const updateLogs = await tx.networkPostUpdateLog.deleteMany({ where: { postId: { in: postIds } } });
    const postsResult = await tx.networkPost.updateMany({
      where: { id: { in: postIds } },
      data: { isActive: false, updatedAt: new Date() },
    });
    return {
      posts: postsResult.count,
      notifications: notifications.count,
      followers: followers.count,
      views: views.count,
      updateLogs: updateLogs.count,
    };
  });

  console.log("Forum test verileri temizlendi:");
  console.table(result);
}

main()
  .catch((error) => {
    console.error("Forum test verileri temizlenemedi:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
