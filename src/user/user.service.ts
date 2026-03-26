import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HashingService } from '../shared/hashing/hashing.service';
import { AUDIT_EVENT, AuditEvent } from '../audit-log/events/audit.event';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto';

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

    const changes = Object.keys(dto)
      .filter((key) => beforeUser[key] !== updatedUser[key])
      .map((key) => ({ field: key, from: beforeUser[key], to: updatedUser[key] }));

    this.eventEmitter.emit(
      AUDIT_EVENT,
      new AuditEvent('USER_UPDATED', id, performedBy ?? null, { changes }),
    );

    return updatedUser;
  }

  async delete(id: string, performedBy?: string) {
    const user = await this.findById(id);
    const deletedUser = await this.userRepository.delete(id);

    this.eventEmitter.emit(
      AUDIT_EVENT,
      new AuditEvent('USER_DELETED', id, performedBy ?? null, {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }),
    );

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

    this.eventEmitter.emit(
      AUDIT_EVENT,
      new AuditEvent('USER_CREATED', createdUser.id, performedBy ?? null, {
        fullName: createdUser.fullName,
        email: createdUser.email,
        role: createdUser.role,
      }),
    );

    return createdUser;
  }
}
