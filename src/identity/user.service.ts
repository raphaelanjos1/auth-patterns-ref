import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_EVENT, AuditEvent } from '../audit-log/events/audit.event';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from './domain/ports/user.repository.port';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from './domain/ports/password-hasher.port';
import { User, UserView } from './domain/user.entity';
import { DomainEvent } from './domain/events/domain-event';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: IPasswordHasher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string): Promise<UserView> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user.toView();
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
      data: data.map((u) => u.toView()),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async create(dto: CreateUserDto, performedBy?: string): Promise<UserView> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const user = await User.register(dto, this.hasher, performedBy ?? null);
    await this.userRepository.save(user);
    this.publishEvents(user.pullEvents());
    return user.toView();
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    performedBy?: string,
  ): Promise<UserView> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.applyUpdate(dto, performedBy ?? null);
    await this.userRepository.save(user);
    this.publishEvents(user.pullEvents());
    return user.toView();
  }

  async delete(id: string, performedBy?: string): Promise<UserView> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.markDeleted(performedBy ?? null);
    await this.userRepository.delete(id);
    this.publishEvents(user.pullEvents());
    return user.toView();
  }

  private publishEvents(events: DomainEvent[]): void {
    for (const event of events) {
      this.eventEmitter.emit(
        AUDIT_EVENT,
        new AuditEvent(
          event.action,
          event.entityId,
          event.performedBy,
          event.metadata,
        ),
      );
    }
  }
}
