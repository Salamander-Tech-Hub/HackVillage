import { prisma } from "@backend/lib/db";
import { verifyDemoPassword } from "@backend/lib/auth";
import { verifyPassword } from "@backend/lib/password";

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  });
  if (!user) {
    return null;
  }

  if (user.passwordHash) {
    const matches = await verifyPassword(password, user.passwordHash);
    return matches ? user : null;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return verifyDemoPassword(password) ? user : null;
}
