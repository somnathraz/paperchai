import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  // If manual connection string is provided, use it. 
  // Otherwise let Prisma client read from env("DATABASE_URL") automatically.
  const params: any = {
    log: ["error", "warn"],
  };

  if (connectionString) {
    params.datasources = {
      db: {
        url: connectionString,
      },
    };
  }

  return new PrismaClient(params).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Disable prepared statements for connection pooling (optional, safe for local)
          return query(args);
        },
      },
    },
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
