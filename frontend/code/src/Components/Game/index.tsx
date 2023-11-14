import { useCallback, useEffect , useState} from "react"
import { Rect, Stage , Layer , Circle, Line} from "react-konva"
import { BsFillArrowRightCircleFill, BsFillArrowLeftCircleFill} from "react-icons/bs";
import { useUserStore } from "../../Stores/stores";
import { useGameState } from "./States/GameState";
import { useSocketStore } from "../Chat/Services/SocketsServices";
import { useNavigate } from "react-router-dom";

const DURATION = 25;
type Cords = {
  x:number;
  y:number;
  ballsize:number;
  p1Score:number;
  p2Score:number;
}

const throttle = (function() {
  let timeout:any = undefined;
  return function throttle(callback:any) {
    if (timeout === undefined) {
      callback();
      timeout = setTimeout(() => {
        timeout = undefined;
      }, DURATION);
    }
  }
})();


function throttlify(callback : any) {
  return function throttlified(event :any) {
    throttle(() => {
      callback(event);
    });
  }
}

export const Game = () => {
    const gameState = useGameState();
    const socketStore = useSocketStore();
    const navigate = useNavigate()
    const leave = useCallback(() => {
      socketStore.socket.emit("leave")
    },[])
    const handleMove = throttlify((e :any) => {
        socketStore.socket.emit("mouse",e.evt.layerY);
    })
    const ArrowUp = () => {
      socketStore.socket.emit("up");
    }
    const ArrowDown = () => {
      socketStore.socket.emit("down")
    }
    useEffect(() => {
      document.addEventListener('keydown', (event) =>{
        if (event.key === "ArrowUp")
          socketStore.socket.emit("up");
        if (event.key === "ArrowDown")
            socketStore.socket.emit("down")
      })
        socketStore.socket.on("ball", (cord:Cords) => {
          gameState.setBall({x:cord.x,y:cord.y,size:cord.ballsize,p1Score:cord.p1Score,p2Score:cord.p2Score})
          console.log(gameState.ball)
        })
        socketStore.socket.on("paddle", (paddles:any) => {
          gameState.setLPaddle(paddles.p1PaddleY);
          gameState.setRPaddle(paddles.p2PaddleY);
          if (gameState?.side != paddles.side)
            gameState.setSide(paddles.side);
        })
        socketStore.socket.on("screen Error", () =>{
          console.log("you lose")
          navigate("/home");
        })
        socketStore.socket.on("players", (players:any) => {
          gameState.setP1(players[0]);
          gameState.setP2(players[1]);
        })
        return () => {
          socketStore.socket.off("ball");
          socketStore.socket.off("mouse")
         }
    },[])
    /* eslint-disable */
    useEffect(() => {
      const divh = document.getElementById('Game')?.offsetHeight
      const divw = document.getElementById('Game')?.offsetWidth
      socketStore.socket.emit("screen",{h:divh,w:divw})
      if (divw) {divw <= 742 ? gameState.setMobile(true) : gameState.setMobile(false)}
        window.addEventListener('resize', () => {
            
            const divh = document.getElementById('Game')?.offsetHeight
            const divw = document.getElementById('Game')?.offsetWidth
            const aspectRatio = 16 / 9;
            const newWidth = divw ?? 0 ;
            const newHeight = newWidth / aspectRatio;
            socketStore.socket.emit("screen",{h:newHeight,w:newWidth})
            if (divh) gameState.setHeight(newHeight);
            if (divw) {gameState.setWidth(divw);divw <= 742 ? gameState.setMobile(true) : gameState.setMobile(false);}
        });

       return () => {
        socketStore.socket.off("screen");
       }
        // disable eslit next line
    },[])

    useEffect(() => {
        const divh = document.getElementById('Game')?.offsetHeight
        const divw = document.getElementById('Game')?.offsetWidth
        console.log(divh)
        console.log(divw)
        const aspectRatio = 16 / 9;
        const newWidth = divw ?? 0 ;
        const newHeight = newWidth / aspectRatio;
        if (divh) gameState.setHeight(newHeight);
        if (divw) gameState.setWidth(divw);
    
    },[gameState.width , gameState.height])

    return ( 
    <div className="flex flex-col gap-10 justify-start md:justify-center md:items-center items-center pt-12 md:pt-0  h-full w-full" >
        <div className="flex items-center justify-center gap-x10 w-full xl:pt-4">
            <div className="flex items-center justify-center w-1/4 gap-6">
                <img alt="" className="rounded-full w-auto h-auto max-w-[10vw] md:max-w-[20vw]" src={`https://res.cloudinary.com/trandandan/image/upload/c_thumb,h_72,w_72/${gameState.p1?.avatar}`} />
                <span className="font-lexend font-extrabold text-[4vw] xl:text-[2vw] text-current">{gameState.ball.p1Score}</span>
            </div>
            <div className="flex items-center justify-center w-1/4 gap-6">
                <span className="font-lexend font-extrabold text-[4vw] xl:text-[2vw] text-current">{gameState?.ball.p2Score}</span>
                <img alt="" className="rounded-full w-auto h-auto max-w-[10vw] md:max-w-[20vw]" src={`https://res.cloudinary.com/trandandan/image/upload/c_thumb,h_72,w_72/${gameState.p2?.avatar}`} />
                
            </div>
            <button className="btn" onClick={leave}>Leave</button>

        </div>
        <div className="flex items-center justify-center min-h-16 max-h-[80%] max-w-[1250px] min-w-92 w-[95%] rounded-xl aspect-video border-primary border-4" id="Game">
            <Stage onMouseMove={handleMove}  width={gameState.width - 12} height={gameState.height - 12}  >
                <Layer >
                    <Rect height={gameState.height} width={gameState.width} fill="#151B26" x={0} y={0} />
                    <Line points={[0, gameState.height , 0 , 0]} dash={[gameState.height / 30 , 10]} strokeWidth={2} stroke={"white"} height={gameState.height} width={20} fill="white" x={gameState.width / 2} y={0}  />
                    <Rect cornerRadius={12} height={gameState.height / 6} width={gameState.width / 70} x={10} y={gameState.lPaddle} fill="white" />
                    <Rect cornerRadius={12} height={gameState.height / 6} width={gameState.width / 70} x={gameState.width - 20 - (gameState.width / 70)} y={gameState.rPaddle} fill="white" />
                    <Circle fill="white" height={gameState.ball.size} width={gameState.ball.size} x={gameState.ball.x} y={gameState.ball.y} />
                </Layer>

            </Stage>
            
        </div>
        {gameState.mobile && (
        <div className="flex justify-around items-center w-full gap-20">
            <BsFillArrowLeftCircleFill onClick={ArrowUp} className="w-14 h-14 hover:cursor-pointer hover:fill-secondary hover:transition-colors delay-100 "/>
            <BsFillArrowRightCircleFill onClick={ArrowDown} className="w-14 h-14 hover:cursor-pointer hover:fill-secondary hover:transition-colors delay-100"/>
        </div>
    )
        
        }
    </div>

    )
} 
