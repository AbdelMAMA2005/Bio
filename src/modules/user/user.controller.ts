import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '../../dto/create-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) { 
    return this.userService.create(createUserDto.email, createUserDto.username, createUserDto.password);
  }
  // 2. Pour récupérer un utilisateur par son email (GET)
  // Utilisation : GET /user/email?email=test@test.com
  @Get('email')
  async findByEmail(@Query('email') email: string) {
    return this.userService.findByEmail(email);
  }
}