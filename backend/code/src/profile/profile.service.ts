import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { ProfileDto } from './dto/profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { PrismaService } from 'src/prisma/prisma.service';
import { Readable } from 'stream';

@Injectable()
export class ProfileService {
  constructor(
    private usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const wonMatches = await this.prisma.match.count({
      where: {
        winner_id: userId,
      },
    });

    const achievement =
      wonMatches === 0
        ? null
        : wonMatches >= 100
        ? 2
        : Math.floor(Math.log10(wonMatches));

    return new ProfileDto({ ...user, achievement }, false);
  }

  async getFriendProfile(
    userId: string,
    friendId: string,
  ): Promise<ProfileDto> {
    const blockid = [userId, friendId].sort().join('-');
    const block = await this.usersService.getBlockbyId(blockid);
    if (block) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const user = await this.usersService.getUserById(friendId, userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const wonMatches = await this.prisma.match.count({
      where: {
        winner_id: friendId,
      },
    });

    const achievement =
      wonMatches === 0
        ? null
        : wonMatches >= 100
        ? 2
        : Math.floor(Math.log10(wonMatches));
    return new ProfileDto({ ...user, achievement }, true);
  }

  async updateProfile(
    userId: string,
    update_data: UpdateProfileDto,
  ): Promise<ProfileDto> {
    let finishProfile = false;
    if ('finishProfile' in update_data) {
      finishProfile = update_data.finishProfile;
      delete update_data.finishProfile;
    }
    let user = await this.usersService.updateUser(userId, update_data);
    if (finishProfile) {
      if (user.firstName === null || user.lastName === null)
        throw new HttpException(
          'First name and last name are required',
          HttpStatus.BAD_REQUEST,
        );
      user = await this.usersService.updateUser(userId, {
        profileFinished: true,
      });
    }
    return new ProfileDto(user, false);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const fStream = new Readable();
    fStream.push(file.buffer);
    fStream.push(null);
    const promise = new Promise<UploadApiResponse>((resolve, reject) => {
      const streamLoad = cloudinary.uploader.upload_stream(
        {
          folder: 'nest-blog',
          overwrite: true,
          resource_type: 'image',
          unique_filename: false,
          filename_override: userId,
          use_filename: true,
        },
        (err, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(err);
          }
        },
      );
      fStream.pipe(streamLoad);
    });

    const result = await promise;
    await this.usersService.updateUser(userId, {
      avatar: `v${result.version}/${result.public_id}.${result.format}`,
    });
    return { message: 'avatar uploaded' };
  }

  async getAvatar(recourseId: string) {
    const result = await cloudinary.api.resources_by_asset_ids([recourseId], {
      max_results: 1,
      transformation: [
        { width: 200, height: 200, crop: 'fill' },
        { quality: 'auto' },
      ],
    });
    return result;
  }

  async getNotifications(userId: string, offset: number, limit: number) {
    const notifications = await this.prisma.notification.findMany({
      skip: offset,
      take: limit,
      where: {
        receiverId: userId,
        entity_type: {
          not: {
            equals: 'message',
          },
        },
      },
      include: {
        actor: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
    return notifications;
  }
}
