generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  EMLAKCI
  MUTEAHHIT
  INSAAT_FIRMASI
  ADMIN
}

enum InvitationStatus {
  PENDING
  USED
  EXPIRED
  REVOKED
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  phone        String   @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role
  isVerified   Boolean  @default(false)
  isApproved   Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sentInvitations    Invitation[] @relation("InvitedBy")
  receivedInvitation Invitation?  @relation("UsedBy")
}

model Invitation {
  id        String           @id @default(uuid())
  code      String           @unique
  role      Role
  status    InvitationStatus @default(PENDING)
  maxUses   Int              @default(1)
  usedCount Int              @default(0)
  expiresAt DateTime
  createdAt DateTime         @default(now())

  invitedById String?
  invitedBy   User?   @relation("InvitedBy", fields: [invitedById], references: [id])

  usedById String? @unique
  usedBy   User?   @relation("UsedBy", fields: [usedById], references: [id])
}