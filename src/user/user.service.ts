import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HashingService } from '../shared/hashing/hashing.service';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
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

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    return this.userRepository.update(id, dto);
  }

  async create(dto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.hashingService.hash(dto.password);

    return this.userRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
  }
}
