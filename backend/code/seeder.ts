import { PrismaClient, User } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

class dataSeeder extends PrismaClient {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async seed() {
    await this.$connect();
    const users = faker.helpers.multiple(this.createRandomUser, { count: 10 });
    const registeredUsers = await this.registerUser(users);
    await this.makeFriendship(registeredUsers);
    await this.makeMatch(registeredUsers);
    await this.createRoom(registeredUsers);
    await this.$disconnect();
  }

  private async registerUser(users: any): Promise<User[]> {
    if (fs.existsSync('users.txt')) {
      console.log('users.txt exists');
      fs.unlinkSync('users.txt');
    }
    const new_users: User[] = [];
    for await (const user of users) {
      fs.appendFile('users.txt', `${user.email}:${user.password}\n`, (err) => {
        if (err) throw err;
      });

      const hash = await bcrypt.hash(user.password, 10);

      const new_user = await this.user.create({
        data: {
          email: user.email,
          password: hash,
          Username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          discreption: user.bio,
          profileFinished: true,
        },
      });
      new_users.push(new_user);
    }
    return new_users;
  }

  private async makeFriendship(users: User[]) {
    for await (const user of users) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      if (randomUser.userId !== user.userId) {
        const friendshipid = [user.userId, randomUser.userId].sort().join('-');
        await this.friend.upsert({
          where: {
            id: friendshipid,
          },
          create: {
            id: friendshipid,
            from: {
              connect: {
                userId: user.userId,
              },
            },
            to: {
              connect: {
                userId: randomUser.userId,
              },
            },
            accepted: true,
          },
          update: {},
        });
      }
    }
  }

  private async makeMatch(users: User[]) {
    for await (const user of users) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      if (randomUser.userId !== user.userId) {
        await this.match.create({
          data: {
            participant1Id: user.userId,
            participant2Id: randomUser.userId,
            winner_id: Math.random() > 0.5 ? user.userId : randomUser.userId,
            score1: Math.floor(Math.random() * 10),
            score2: Math.floor(Math.random() * 10),
          },
        });
      }
    }
  }

  private createRandomUser() {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      avatar: 'v1698656518/nest-blog/clocnzgx80006q73seyj9hzx5.png',
      password: faker.internet.password(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      bio: faker.person.bio(),
    };
  }

  private async createRoom(users: User[]) {
    const owner = users[Math.floor(Math.random() * users.length)];
    const roomData = {
      name: faker.lorem.word(),
      ownerId: owner.userId,
    };

    // add random users to the room
    const filtredUsers = users.filter((user) => user.userId !== owner.userId);
    const randomUsers = filtredUsers.slice(
      0,
      Math.floor(Math.random() * filtredUsers.length),
    );

    const room = await this.room.create({
      data: {
        name: roomData.name,
        ownerId: roomData.ownerId,
        type: 'public',
      },
    });

    for await (const user of randomUsers) {
      await this.roomMember.create({
        data: {
          userId: user.userId,
          roomId: room.id,
          is_admin: Math.random() > 0.8 ? true : false,
        },
      });
    }
    await this.roomMember.create({
      data: {
        userId: owner.userId,
        roomId: room.id,
        is_admin: true,
      },
    });

		console.log("roomid: ", room.id)
		console.log("ownerid: ", owner.userId)
		console.log("randomUsers: ", randomUsers)
  }
}

(async () => {
  await new dataSeeder().seed();
})();
