import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HashingService } from '../../shared/hashing/hashing.service';
import { publishAudit } from '../../audit-log/events/publish-audit';
import { UserRepository } from './user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FindAllUsersQueryDto } from '../dto/find-all-users-query.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll(query: FindAllUsersQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const skip = (page - 1) * pageSize;

    const { data, total } = await this.userRepository.findAll({
      skip,
      take: pageSize,
      search: query.search,
    });

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async update(id: string, dto: UpdateUserDto, performedBy?: string) {
    const beforeUser = await this.findById(id);
    const updatedUser = await this.userRepository.update(id, dto);

    const changes = (Object.keys(dto) as (keyof UpdateUserDto)[])
      .filter((key) => beforeUser[key] !== updatedUser[key])
      .map((key) => ({
        field: key,
        from: beforeUser[key],
        to: updatedUser[key],
      }));

    publishAudit(this.eventEmitter, {
      action: 'USER_UPDATED',
      entityId: id,
      userId: performedBy ?? null,
      metadata: { changes },
    });

    return updatedUser;
  }

  async delete(id: string, performedBy?: string) {
    const user = await this.findById(id);
    const deletedUser = await this.userRepository.delete(id);

    publishAudit(this.eventEmitter, {
      action: 'USER_DELETED',
      entityId: id,
      userId: performedBy ?? null,
      metadata: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });

    return deletedUser;
  }

  async create(dto: CreateUserDto, performedBy?: string) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.hashingService.hash(dto.password);

    const createdUser = await this.userRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    publishAudit(this.eventEmitter, {
      action: 'USER_CREATED',
      entityId: createdUser.id,
      userId: performedBy ?? null,
      metadata: {
        fullName: createdUser.fullName,
        email: createdUser.email,
        role: createdUser.role,
      },
    });

    return createdUser;
  }
}
