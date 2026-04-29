import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUser = {
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    role: 'ADMIN' as const,
  };

  const mockRequest = { user: { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<jest.Mocked<UserService>>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const expected = { data: [mockUser], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } };
      userService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({ page: 1, pageSize: 10 });

      expect(result).toEqual(expected);
      expect(userService.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await controller.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(userService.findById).toHaveBeenCalledWith('user-1');
    });
  });

  describe('create', () => {
    it('should create a user and pass performedBy', async () => {
      const dto = { fullName: 'Jane Doe', email: 'jane@example.com', password: 'pass123', role: 'USER' as const };
      userService.create.mockResolvedValue({ id: 'user-2', fullName: dto.fullName, email: dto.email, role: dto.role });

      const result = await controller.create(dto, mockRequest as any);

      expect(result.email).toBe(dto.email);
      expect(userService.create).toHaveBeenCalledWith(dto, 'admin-1');
    });
  });

  describe('update', () => {
    it('should update a user and pass performedBy', async () => {
      const dto = { fullName: 'John Updated' };
      userService.update.mockResolvedValue({ ...mockUser, fullName: 'John Updated' });

      const result = await controller.update('user-1', dto, mockRequest as any);

      expect(result.fullName).toBe('John Updated');
      expect(userService.update).toHaveBeenCalledWith('user-1', dto, 'admin-1');
    });
  });

  describe('delete', () => {
    it('should delete a user and pass performedBy', async () => {
      userService.delete.mockResolvedValue(mockUser);

      const result = await controller.delete('user-1', mockRequest as any);

      expect(result).toEqual(mockUser);
      expect(userService.delete).toHaveBeenCalledWith('user-1', 'admin-1');
    });
  });
});
