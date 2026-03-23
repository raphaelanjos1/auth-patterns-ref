export class PrismaService {
  client = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  async onModuleInit() {}
  async onModuleDestroy() {}
}
