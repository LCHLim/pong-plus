// FIT2102 2018 Assignment 1
// https://docs.google.com/document/d/1woMAgJVf1oL3M49Q8N3E1ykTuTu5_r28_MQPVS5QIVo/edit?usp=sharing

/**
   * implement a pong game
   * @return void
   */
function pong() {
  // Inside this function you will use the classes and functions 
  // defined in svgelement.ts and observable.ts
  // to add visuals to the svg element in pong.html, animate them, and make them interactive.
  // Study and complete the tasks in basicexamples.ts first to get ideas.

  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!  
  // Explain which ideas you have used ideas from the lectures to 
  // create reusable, generic functions.

  const
    svg = document.getElementById("canvas")!,
    mousemove = Observable.fromEvent<MouseEvent>(svg, 'mousemove'),
    playerOnePaddle = createPaddle(50, 260, svg),
    playerTwoPaddle = createPaddle(742, 260, svg),
    midPaddle = createPaddle(396, 50, svg),
    ball = new Elem(svg, 'circle')
      .attr('cx', 400).attr('cy', 300)
      .attr('r', 5).attr('fill', '#FFFFFF'),
    gap = new Elem(svg, 'rect')
      .attr('x', 399.5).attr('y', 50)
      .attr('width', 1).attr('height', 500)
      .attr('fill', '#FFFFFF'),
    p1Score = document.getElementById("player1Score")!,
    p2Score = document.getElementById("player2Score")!,
    game = Observable.interval(1).map(() => ({ playerOnePaddle, playerTwoPaddle, ball, p1Score, p2Score, midPaddle }))


  // define the ball's initial speed and continuous speed
  // also define the middle paddle speed
  const initialBallSpeed = 3
  const ballSpeed = { x: - initialBallSpeed, y: 0 }
  const midPaddleSpeed = { x: 0, y: 1 }




  // define unsub variable for every subscription. 
  let ballUnsub: () => void;
  let paddleColorUnsub: () => void;
  let playerOnePaddleUnsub: () => void;
  let playerTwoPaddleUnsub: () => void;
  let midPaddleUnsub: () => void;




  // constructing paddleOne's Observable and paddleTwo's Observable
  const paddleOneObs = mousemove.map(({ clientY }) => ({
    paddleTop: clientY - 235,
    paddleBottom: clientY - 235 + Number(playerOnePaddle.attr('height'))
  }))

  const paddleTwoObs = game.map(({ ball, playerTwoPaddle }) => ({
    ball, playerTwoPaddle,
    paddleTop: Number(playerTwoPaddle.attr('y')),
    paddleBottom: Number(playerTwoPaddle.attr('y'))
      + Number(playerTwoPaddle.attr('height'))
  }))



  //counting down 3,2,1 and let the elems move (by subscribing all the elems inside the complete())
  Observable.interval(1000)
    .takeUntil(Observable.interval(3000))
    .subscribe(_ => {
      const counter = document.getElementById("countDown")!
      counter.innerText = String(Number(counter.innerText) - 1)
    },
      () => {
        const counter = document.getElementById("countDown")!
        counter.innerText = ""


        //link the subscription to the variable defined before.
        ballUnsub = game.subscribe(({ ball }) => moveBall(ball, ballSpeed.x, ballSpeed.y))

        playerOnePaddleUnsub = paddleOneObs.filter(({ paddleTop, paddleBottom }) => (paddleTop >= 50 && paddleBottom <= 550))
          .subscribe(({ paddleTop }) => playerOnePaddle.attr('y', paddleTop))

        playerTwoPaddleUnsub = paddleTwoObs.filter(({ paddleTop, paddleBottom }) => (paddleTop >= 50 && paddleBottom <= 550))
          .subscribe(({ ball, playerTwoPaddle }) => paddleAIPattern(ball, playerTwoPaddle))

        midPaddleUnsub = game.subscribe(({ midPaddle }) => movePaddle(midPaddle, midPaddleSpeed.x, midPaddleSpeed.y))

        paddleColorUnsub = Observable.interval(3000).subscribe(_ => switchColor(midPaddle))
      })




  // ###### GAME START ########                



  //construct paddleTwo moving range
  //if the paddle's Y is out of a certain range, then move the paddle to the limit of bound. 
  paddleTwoObs.filter(({ paddleTop }) => (paddleTop < 50))
    .subscribe(_ => playerTwoPaddle.attr('y', 50))

  paddleTwoObs.filter(({ paddleBottom }) => (paddleBottom > 550))
    .subscribe(_ => playerTwoPaddle.attr('y', 470))

  //----------------------------------------------------------------------------------


  //construct midPaddle moving range
  game.map(({ midPaddle }) => ({ y: Number(midPaddle.attr('y')) }))
    .filter(({ y }) => (y < 50 || y > 470))
    .subscribe(( ) => midPaddleSpeed.y *= -1)



  //if the ball collided with paddleOne, then give it a new ballSpeed
  game.filter(({ ball, playerOnePaddle }) => hitPlayerOnePaddle(ball, playerOnePaddle))
    .subscribe(({ ball, playerOnePaddle }) => {
      const newSpeed = ballPhysics(ball, playerOnePaddle, initialBallSpeed)
      ballSpeed.x = newSpeed.ballVx;
      ballSpeed.y = newSpeed.ballVy;
    })



  //if the ball collided with paddleTwo, then give it a new ballSpeed
  game.filter(({ ball, playerTwoPaddle }) => hitPlayerTwoPaddle(ball, playerTwoPaddle))
    .subscribe(({ ball, playerTwoPaddle }) => {
      const newSpeed = ballPhysics(ball, playerTwoPaddle, initialBallSpeed)
      ballSpeed.x = newSpeed.ballVx;
      ballSpeed.y = newSpeed.ballVy
    })



  //if the ball collided with midPaddle, then give it a new ballSpeed
  //ball color change to midPaddle's current color
  game.filter(({ ball, midPaddle }) => hitMidPaddle(ball, midPaddle))
    .subscribe(({ ball, midPaddle }) => {
      const newSpeed = ballPhysics(ball, midPaddle, initialBallSpeed)
      ballSpeed.x = newSpeed.ballVx;
      ballSpeed.y = newSpeed.ballVy;
      ball.attr('fill', midPaddle.attr('fill'))
    })




  //if the ball collided with the ceiling or floor, change its speedY to the negative of current speed Y
  game.filter(({ ball }) => isOutOfBound(ball))
    .subscribe(_ => {
      ballSpeed.y *= -1;
    })



  //if playerOneScored, increase playerOne's score, 
  //reset the ball position, speed x and speed y
  //and ball's direction goes to playerOne
  game.filter(({ ball }) => playerOneScored(ball))
    .subscribe(({ p1Score }) => {
      /**
       * get the score weight of the ball
       * @param ball an Elem insdie of svg
       * @return 1 point if the ball color is white, 2 point if it is blue
       */
      const score = (ball: Elem): number => (ball.attr('fill') == "#FFFFFF") ? 1 : 2

      p1Score.innerText = String(Number(p1Score.innerText) + score(ball));
      ball.attr('cx', 392).attr('cy', 300);
      ballSpeed.x = - initialBallSpeed;
      ballSpeed.y = 0;


    })


  //if playerTwoScored, increase playerTwo's score, 
  //reset the ball position, speed x and speed y
  //and ball's direction goes to playerTwo
  game.filter(({ ball }) => playerTwoScored(ball))
    .subscribe(({ p2Score }) => {
      /**
       * get the score weight of the ball
       * @param ball an Elem insdie of svg
       * @return 1 point if the ball color is white, 2 point if it is blue
       */
      const score = (ball: Elem): number => (ball.attr('fill') == "#FFFFFF") ? 1 : 2

      p2Score.innerText = String(Number(p2Score.innerText) + score(ball));
      ball.attr('cx', 408).attr('cy', 300)
      ballSpeed.x = initialBallSpeed;
      ballSpeed.y = 0;
    })




  //if playerOne first scores to 11, show "YOU WIN" !
  game.filter(({ p1Score }) => (Number(p1Score.innerText) >= 11))
    .subscribe(_ => {
      const showResult = document.getElementById("result")!;
      showResult.innerText = "YOU WIN"
    })



  //if playerTwo first scores to 11, show "YOU LOSE" !
  game.filter(({ p2Score }) => (Number(p2Score.innerText) >= 11))
    .subscribe(_ => {
      const showResult = document.getElementById("result")!;
      showResult.innerText = "YOU LOSE"
    })


  //unsubcribe all the elems when someone scored to 11
  game.takeWhile(({ p1Score, p2Score }) => (Number(p1Score.innerText) < 11) && (Number(p2Score.innerText) < 11))
    .subscribe(()=>{}, ()=> {
      ballUnsub()
      paddleColorUnsub()
      playerOnePaddleUnsub()
      playerTwoPaddleUnsub()
      midPaddleUnsub()
    })



  // ###### GAME END ######    
}


/**
   * create a rectangle inside the svg by using Elem class
   * @param x coordinate of the rectangle (left)
   * @param y coordinate of the rectangle (top)
   * @return an Elem object
   */
function createPaddle(x: number | string, y: number | string, svg: HTMLElement): Elem {
  return new Elem(svg, 'rect')
    .attr('x', x).attr('y', y)
    .attr('width', 8).attr('height', 80)
    .attr('fill', '#FFFFFF')
}

/**
   * check if the ball collided with playerOnePaddle
   * @param ball Elem inside of svg
   * @param playerOnePaddle Elem inside of svg
   * @return a boolean expression
   */
function hitPlayerOnePaddle(ball: Elem, playerOnePaddle: Elem): boolean {
  const
    ballX = Number(ball.attr('cx')),
    ballY = Number(ball.attr('cy')),
    ballRadius = Number(ball.attr('r')),
    paddleOneYTop = Number(playerOnePaddle.attr('y')),
    paddleOneYBottom = paddleOneYTop + Number(playerOnePaddle.attr('height')),
    paddleOneTouchSide = Number(playerOnePaddle.attr('x')) + Number(playerOnePaddle.attr('width')),

    hitPaddleOneX = (ballX - ballRadius) <= (paddleOneTouchSide) &&
      (ballX - ballRadius) >= (paddleOneTouchSide - 8),

    hitPaddleOneY = (ballY + ballRadius >= paddleOneYTop) && (ballY - ballRadius <= paddleOneYBottom)

  return (hitPaddleOneX && hitPaddleOneY)

}

/**
   * check if the ball collided with playerTwoPaddle
   * @param ball Elem inside of  svg
   * @param playerTwoPaddle Elem inside of svg
   * @return a boolean expression
   */
function hitPlayerTwoPaddle(ball: Elem, playerTwoPaddle: Elem): boolean {
  const
    ballX = Number(ball.attr('cx')),
    ballY = Number(ball.attr('cy')),
    ballRadius = Number(ball.attr('r')),
    paddleTwoYTop = Number(playerTwoPaddle.attr('y')),
    paddleTwoYBottom = paddleTwoYTop + Number(playerTwoPaddle.attr('height')),
    paddleTwoTouchSide = Number(playerTwoPaddle.attr('x')),

    hitPaddleTwoX = (ballX + ballRadius) >= (paddleTwoTouchSide) &&
      (ballX + ballRadius) <= (paddleTwoTouchSide + 8),

    hitPaddleTwoY = (ballY + ballRadius >= paddleTwoYTop) && (ballY - ballRadius <= paddleTwoYBottom)

  return (hitPaddleTwoX && hitPaddleTwoY)
}

/**
   * check if the ball collided with midPaddle
   * @param ball Elem inside of  svg
   * @param midPaddle Elem inside of svg
   * @return a boolean expression
   */
function hitMidPaddle(ball: Elem, midPaddle: Elem): boolean {
  const
    ballX = Number(ball.attr('cx')),
    ballY = Number(ball.attr('cy')),
    ballRadius = Number(ball.attr('r')),
    paddleTop = Number(midPaddle.attr('y')),
    paddleBottom = paddleTop + Number(midPaddle.attr('height')),
    paddleTouchSideL = Number(midPaddle.attr('x')),
    paddleTouchSideR = Number(midPaddle.attr('x')) + Number(midPaddle.attr('width')),

    //just a combination of hitPaddleOneX and hitPaddleTwoX
    hitMidPaddleX = ((ballX - ballRadius) <= (paddleTouchSideR) &&
      (ballX - ballRadius) >= (paddleTouchSideR - 8)) ||
      ((ballX + ballRadius) >= (paddleTouchSideL) &&
        (ballX + ballRadius) <= (paddleTouchSideL + 8)),

    hitMidPaddleY = (ballY + ballRadius >= paddleTop) && (ballY - ballRadius <= paddleBottom)

  return (hitMidPaddleX && hitMidPaddleY)

}


/**
   * check if the ball is out of a certain range
   * @param ball Elem inside of svg
   * @return a boolean expression
   */
function isOutOfBound(ball: Elem): boolean {
  return ((Number(ball.attr('cy')) - Number(ball.attr('r')) <= 50) ||
    (Number(ball.attr('cy')) + Number(ball.attr('r')) >= 550))
}


/**
   * check if playerOne has scored
   * @param ball Elem inside of svg
   * @return a boolean expression
   */
function playerOneScored(ball: Elem): boolean {
  return (Number(ball.attr('cx')) >= 805)
}

/**
   * check if playerTwo has scored
   * @param ball Elem inside of svg
   * @return a boolean expression
   */
function playerTwoScored(ball: Elem): boolean {
  return (Number(ball.attr('cx')) <= -5)
}

/**
   * keeptrack of ball coordinate and adjust the paddle's Y coordinate to catch it
   * @param ball Elem inside of svg
   * @param paddle Elem inside of svg
   * @return void
   */
function paddleAIPattern(ball: Elem, paddle: Elem): void {
  const
    ballY = Number(ball.attr('cy')),
    paddleYTop = Number(paddle.attr('y')),
    paddleYCenter = paddleYTop + Number(paddle.attr('height')) / 2,
    adjustment = 4


  if (paddleYCenter - 10 > ballY) {
    movePaddle(paddle, 0, - adjustment)
  }
  else if (paddleYCenter + 10 < ballY) {
    movePaddle(paddle, 0 , adjustment)
  }

}

/**
   * change the ball cx and cy coordinates
   * @param ball Elem inside of svg
   * @param x increment of ball's coordinate x
   * @param y increment of ball's coordinate y
   * @return void
   */
function moveBall(ball: Elem, x: number | string, y: number | string): void {
  ball.attr('cx', Number(ball.attr('cx')) + Number(x))
    .attr('cy', Number(ball.attr('cy')) + Number(y))
}


/**
 * change the paddle x and y coordinates
 * @param paddle Elem inside of svg
 * @param x increment of paddle's coordinate x
 * @param y increment of paddle's coordinate y
 * @return void
 */
function movePaddle(paddle: Elem, x: number | string, y: number | string): void {
  paddle.attr('x', String(Number(paddle.attr('x')) + Number(x)))
    .attr('y', String(Number(paddle.attr('y')) + Number(y)))
}


  
interface BallSpeed<T> {
  ballVx: T;
  ballVy: T;
}

/**
   * calculate the ball's new X increment and Y increment
   * @param ball Elem inside of svg
   * @param paddle Elem inside of svg
   * @param initialBallSpeed a constant speed of ball
   * @return an object with ballVx and ballVy property
   */
function ballPhysics(ball: Elem, paddle: Elem, initialBallSpeed: number | string): BallSpeed<number> {
  const
    paddleHalfHeight = Number(paddle.attr('height')) / 2,
    paddleCenterYAxis = Number(paddle.attr('y')) + paddleHalfHeight,
    distanceBetweenTouchpointAndCenter = paddleCenterYAxis - Number(ball.attr('cy')),
    distancePercentage = distanceBetweenTouchpointAndCenter / paddleHalfHeight,
    Pi = 3.14159265359,
    bounceAngle = distancePercentage * (7 / 18 * Pi),
    ballX = Number(ball.attr('cx')),

    ballVectorX = (ballX < 200 || (ballX > 400 && ballX < 600)) ? -1 : 1


  return ({
    ballVx: Number(initialBallSpeed) * Math.cos(bounceAngle) * ballVectorX * -1,
    ballVy: Number(initialBallSpeed) * -Math.sin(bounceAngle)
  })
}

/**
   * switch the color of element between white and blue
   * @param ele an Elem inside of svg
   * @return void
   */
function switchColor(ele: Elem): void {
  // #FFFFFF
  // #00FFFF  -- blue

  if (ele.attr('fill') == "#FFFFFF") {
    ele.attr('fill', "#00FFFF")
  }
  else {
    ele.attr('fill', "#FFFFFF")
  }
}


// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
  window.onload = () => {
    pong();
  }



