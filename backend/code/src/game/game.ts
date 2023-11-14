import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

export class Game {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly server: Server,
  ) {}

  private screenAdapter(player, x: number, y: number, ballsize: number) {
    let scale_x = player.w / this.w;
    let scale_y = player.h / this.h;

    let new_x = x * scale_x;
    let new_y = y * scale_y;

    let new_ball_size = ballsize * Math.min(scale_x, scale_y);
    return {
      x: new_x,
      y: new_y,
      ballsize: new_ball_size,
      p1Score: this.p1Score,
      p2Score: this.p2Score,
    };
  }

  private paddleAdapterP1toP2(
    player1,
    player2,
    p1PaddleY: number,
    p2PaddleY: number,
    side: boolean,
  ) {
    let scale = this.h / player1.h;

    this.p1PaddleY = p1PaddleY * scale;

    let scale2 = player2.h / this.h;

    let newPos = this.p1PaddleY * scale2;
    let scale_y = player2.h / this.h;
    // let center = this.paddleHeight * scale_y;
    return { p1PaddleY: newPos, p2PaddleY: p2PaddleY, side: side };
  }
  private paddleAdapterP2toP1(
    player1,
    player2,
    p1PaddleY: number,
    p2PaddleY: number,
    side: boolean,
  ) {
    let scale = this.h / player2.h;

    this.p2PaddleY = p2PaddleY * scale;

    let scale2 = player1.h / this.h;

    let newPos = this.p2PaddleY * scale2;
    let scale_y = player1.h / this.h;

    // let center = this.paddleHeight * scale_y;
    return { p1PaddleY: p1PaddleY, p2PaddleY: newPos, side: side };
  }
  private up1() {
    if (this.p1PaddleY - this.paddleHeight / 6 >= 0) {
      this.eventp1Paddle -= this.paddleHeight / 6;
    }
  }

  private down1() {
    if (this.p1PaddleY + this.paddleHeight <= this.h) {
      this.eventp1Paddle += this.paddleHeight / 6;
    }
  }
  private up2() {
    if (this.p2PaddleY - this.paddleHeight / 6 >= 0) {
      this.eventp2Paddle -= this.paddleHeight / 6;
    }
  }

  private down2() {
    if (this.p2PaddleY + this.paddleHeight <= this.h) {
      this.eventp2Paddle += this.paddleHeight / 6;
    }
  }

  private async loop() {
    if (this.closeGame) return;
    console.log('loop');
    if (this.x + this.ballSize / 2 + this.dx >= this.w || this.x + this.dx <= 0)
      this.dx *= -1;
    if (this.y + this.ballSize / 2 + this.dy >= this.h || this.y + this.dy <= 0)
      this.dy *= -1;

    if (
      this.y >= this.p1PaddleY &&
      this.y <= this.p1PaddleY + this.paddleHeight &&
      this.x + this.ballSize <= this.paddleWidth + 40
    ) {
      this.dx *= -1;
      this.dy *= Math.random() * 2.5;
    }
    if (
      this.y >= this.p2PaddleY &&
      this.y <= this.p2PaddleY + this.paddleHeight &&
      this.x + this.ballSize >= this.w - (this.paddleWidth + 20)
    ) {
      this.dx *= -1;
      this.dy *= Math.random() * 2.5;
    }
    if (
      (this.y < this.p2PaddleY ||
        this.y > this.p2PaddleY + this.paddleHeight) &&
      this.x + this.ballSize >= this.w - (this.paddleWidth + 5)
    ) {
      this.p1Score += 1;
      this.init();
      this.checkForWinner();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (
      (this.y < this.p1PaddleY ||
        this.y > this.p1PaddleY + this.paddleHeight) &&
      this.x <= this.paddleWidth + 5
    ) {
      this.p2Score += 1;
      this.init();
      this.checkForWinner();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(this.x);
    console.log(this.y);
    this.x += this.dx;
    this.y += this.dy;
    console.log(this.p1Res);
    console.log(this.p2Res);
    if (
      parseFloat((this.p1Res.w / this.p1Res.h).toFixed(1)) !== 1.8 &&
      parseFloat((this.p2Res.w / this.p2Res.h).toFixed(1)) !== 1.9
    ) {
      this.p1socket.emit('screen Error');
      this.emitGameEnd('end');
      this.p1socket.emit('lose', 'trying cheat');
      this.p2socket.emit('win', 'you win other player try to cheat');
    } else {
      this.p1socket.emit(
        'ball',
        this.screenAdapter(this.p1Res, this.x, this.y, this.ballSize),
      );
      this.p2socket.emit(
        'paddle',
        this.paddleAdapterP1toP2(
          this.p1Res,
          this.p2Res,
          this.eventp1Paddle,
          this.eventp2Paddle,
          true,
        ),
      );
    }

    if (
      parseFloat((this.p2Res.w / this.p2Res.h).toFixed(1)) !== 1.8 &&
      parseFloat((this.p2Res.w / this.p2Res.h).toFixed(1)) !== 1.9
    ) {
      this.p1socket.emit('screen Error');
      this.emitGameEnd('end');
      this.p1socket.emit('win', 'you win other player try to cheat');
      this.p2socket.emit('lose', 'trying cheat');
    } else {
      this.p2socket.emit(
        'ball',
        this.screenAdapter(this.p2Res, this.x, this.y, this.ballSize),
      );
      this.p1socket.emit(
        'paddle',
        this.paddleAdapterP2toP1(
          this.p1Res,
          this.p2Res,
          this.eventp1Paddle,
          this.eventp2Paddle,
          true,
        ),
      );
    }

    await this.sleep(20);

    this.loop();
  }

  private async sleepCounter() {
    let timer = 5000;

    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.server.emit('timer', timer);
      timer -= 1000;
    }
  }
  async start(ngameid: string) {
    console.log('game started', ngameid);
    this.gameid = ngameid;
    await this.sleepCounter();
    // await this.setplayerScokets(this.p1socket, this.p2socket ,)
    this.loop();
  }

  setplayerScokets(
    p1socket: Socket,
    p2socket: Socket,
    p1Data: any,
    p2Data: any,
  ) {
    this.p1socket = p1socket;
    this.p2socket = p2socket;
    this.p1Data = p1Data;
    this.p2Data = p2Data;
    console.log(p1Data);
    console.log(p2Data);
    this.server.emit('players', [p1Data, p2Data]);
    console.log('newfunc');
    this.p1socket.on('up', () => {
      this.up1();
    });
    this.p1socket.on('down', () => {
      this.down1();
    });
    this.p2socket.on('up', () => {
      this.up2();
    });
    this.p2socket.on('down', () => {
      this.down2();
    });
    this.p1socket.on('mouse', (data) => {
      this.eventp1Paddle = data;
    });
    this.p2socket.on('mouse', (data) => {
      this.eventp2Paddle = data;
    });
    this.p1socket.on('screen', (data) => {
      this.p1Res = data;
    });
    this.p2socket.on('screen', (data) => {
      this.p2Res = data;
    });
    this.p1socket.on('disconnect', () => {
      console.log('p1 disconnected');
      this.emitGameEnd('p1 disconnected');
    });
    this.p2socket.on('disconnect', () => {
      console.log('p2 disconnected');
      this.emitGameEnd('p2 disconnected');
    });
    this.p1socket.on('leave', () => {
      this.emitGameEnd('end');
      this.p2socket.emit('win', 'you win other player leave the game');
      this.p1socket.emit('lose', 'you win other player leave the game');
      this.emitGameEnd('leave');
    });
    this.p2socket.on('leave', () => {
      this.emitGameEnd('end');
      this.p1socket.emit('win', 'you win other player leave the game');
      this.p2socket.emit('lose', 'you lost other player leave the game');
      this.emitGameEnd('leave');
    });
  }
  private checkForWinner() {
    if (this.p1Score >= 5) {
      this.p1socket.emit('win', 'you win');
      this.p2socket.emit('lose', 'you lose');
      this.emitGameEnd('end');
    }
    if (this.p2Score >= 5) {
      this.p2socket.emit('win', 'you win');
      this.p1socket.emit('lose', 'you lose');
      this.emitGameEnd('end');
    }
  }
  private emitGameEnd(message: string) {
    console.log('game end');
    this.eventEmitter.emit('game.end', {
      message: message,
      gameid: this.gameid,
      p1Data: this.p1Data,
      p2Data: this.p2Data,
      p1Score: this.p1Score,
      p2Score: this.p2Score,
    });
    this.closeGame = true;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private init() {
    this.x = this.w / 2;
    this.y = this.h / 2;
    this.ballSize = this.w / 42;
    this.dx = this.w / 200;
    this.dy = this.w / 200;
    this.p1PaddleY = this.h / 2;
    this.p2PaddleY = this.h / 2;
  }
  private gameid: string;
  private p1socket: Socket;
  private p2socket: Socket;
  private p1Data: any;
  private p2Data: any;
  private w: number = 1067;
  private h: number = 600;
  private x: number = this.w / 2;
  private y: number = this.h / 2;
  private ballSize: number = this.w / 42;
  private dx: number = this.w / 200;
  private dy: number = this.w / 200;
  private p1PaddleY: number = this.h / 2;
  private p2PaddleY: number = this.h / 2;
  private eventp1Paddle: number = 0;
  private eventp2Paddle: number = 0;
  private paddleHeight: number = this.h / 6;
  private paddleWidth: number = this.w / 70;
  private p1Score: number = 0;
  private p2Score: number = 0;
  private p1Res = { h: 0, w: 0 };
  private p2Res = { h: 0, w: 0 };
  private closeGame = false;
}
