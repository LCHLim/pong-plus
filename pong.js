"use strict";
function pong() {
    const svg = document.getElementById("canvas"), mousemove = Observable.fromEvent(svg, 'mousemove'), playerOnePaddle = createPaddle(50, 260, svg), playerTwoPaddle = createPaddle(742, 260, svg), midPaddle = createPaddle(396, 50, svg), ball = new Elem(svg, 'circle')
        .attr('cx', 400).attr('cy', 300)
        .attr('r', 5).attr('fill', '#FFFFFF'), gap = new Elem(svg, 'rect')
        .attr('x', 399.5).attr('y', 50)
        .attr('width', 1).attr('height', 500)
        .attr('fill', '#FFFFFF'), p1Score = document.getElementById("player1Score"), p2Score = document.getElementById("player2Score"), game = Observable.interval(1).map(() => ({ playerOnePaddle, playerTwoPaddle, ball, p1Score, p2Score, midPaddle }));
    const initialBallSpeed = 3;
    const ballSpeed = { x: -initialBallSpeed, y: 0 };
    const midPaddleSpeed = { x: 0, y: 1 };
    let ballUnsub;
    let paddleColorUnsub;
    let playerOnePaddleUnsub;
    let playerTwoPaddleUnsub;
    let midPaddleUnsub;
    const paddleOneObs = mousemove.map(({ clientY }) => ({
        paddleTop: clientY - 100,
        paddleBottom: clientY - 100 + Number(playerOnePaddle.attr('height'))
    }));
    const paddleTwoObs = game.map(({ ball, playerTwoPaddle }) => ({
        ball, playerTwoPaddle,
        paddleTop: Number(playerTwoPaddle.attr('y')),
        paddleBottom: Number(playerTwoPaddle.attr('y'))
            + Number(playerTwoPaddle.attr('height'))
    }));
    Observable.interval(1000)
        .takeUntil(Observable.interval(3000))
        .subscribe(_ => {
        const counter = document.getElementById("countDown");
        counter.innerText = String(Number(counter.innerText) - 1);
    }, () => {
        const counter = document.getElementById("countDown");
        counter.innerText = "";
        ballUnsub = game.subscribe(({ ball }) => moveBall(ball, ballSpeed.x, ballSpeed.y));
        playerOnePaddleUnsub = paddleOneObs.filter(({ paddleTop, paddleBottom }) => (paddleTop >= 50 && paddleBottom <= 550))
            .subscribe(({ paddleTop }) => playerOnePaddle.attr('y', paddleTop));
        playerTwoPaddleUnsub = paddleTwoObs.filter(({ paddleTop, paddleBottom }) => (paddleTop >= 50 && paddleBottom <= 550))
            .subscribe(({ ball, playerTwoPaddle }) => paddleAIPattern(ball, playerTwoPaddle));
        midPaddleUnsub = game.subscribe(({ midPaddle }) => movePaddle(midPaddle, midPaddleSpeed.x, midPaddleSpeed.y));
        paddleColorUnsub = Observable.interval(3000).subscribe(_ => switchColor(midPaddle));
    });
    paddleTwoObs.filter(({ paddleTop }) => (paddleTop < 50))
        .subscribe(_ => playerTwoPaddle.attr('y', 50));
    paddleTwoObs.filter(({ paddleBottom }) => (paddleBottom > 550))
        .subscribe(_ => playerTwoPaddle.attr('y', 470));
    game.map(({ midPaddle }) => ({ y: Number(midPaddle.attr('y')) }))
        .filter(({ y }) => (y < 50 || y > 470))
        .subscribe(() => midPaddleSpeed.y *= -1);
    game.filter(({ ball, playerOnePaddle }) => hitPlayerOnePaddle(ball, playerOnePaddle))
        .subscribe(({ ball, playerOnePaddle }) => {
        const newSpeed = ballPhysics(ball, playerOnePaddle, initialBallSpeed);
        ballSpeed.x = newSpeed.ballVx;
        ballSpeed.y = newSpeed.ballVy;
    });
    game.filter(({ ball, playerTwoPaddle }) => hitPlayerTwoPaddle(ball, playerTwoPaddle))
        .subscribe(({ ball, playerTwoPaddle }) => {
        const newSpeed = ballPhysics(ball, playerTwoPaddle, initialBallSpeed);
        ballSpeed.x = newSpeed.ballVx;
        ballSpeed.y = newSpeed.ballVy;
    });
    game.filter(({ ball, midPaddle }) => hitMidPaddle(ball, midPaddle))
        .subscribe(({ ball, midPaddle }) => {
        const newSpeed = ballPhysics(ball, midPaddle, initialBallSpeed);
        ballSpeed.x = newSpeed.ballVx;
        ballSpeed.y = newSpeed.ballVy;
        ball.attr('fill', midPaddle.attr('fill'));
    });
    game.filter(({ ball }) => isOutOfBound(ball))
        .subscribe(_ => {
        ballSpeed.y *= -1;
    });
    game.filter(({ ball }) => playerOneScored(ball))
        .subscribe(({ p1Score }) => {
        const score = (ball) => (ball.attr('fill') == "#FFFFFF") ? 1 : 2;
        p1Score.innerText = String(Number(p1Score.innerText) + score(ball));
        ball.attr('cx', 392).attr('cy', 300);
        ballSpeed.x = -initialBallSpeed;
        ballSpeed.y = 0;
    });
    game.filter(({ ball }) => playerTwoScored(ball))
        .subscribe(({ p2Score }) => {
        const score = (ball) => (ball.attr('fill') == "#FFFFFF") ? 1 : 2;
        p2Score.innerText = String(Number(p2Score.innerText) + score(ball));
        ball.attr('cx', 408).attr('cy', 300);
        ballSpeed.x = initialBallSpeed;
        ballSpeed.y = 0;
    });
    game.filter(({ p1Score }) => (Number(p1Score.innerText) >= 11))
        .subscribe(_ => {
        const showResult = document.getElementById("result");
        showResult.innerText = "YOU WIN";
    });
    game.filter(({ p2Score }) => (Number(p2Score.innerText) >= 11))
        .subscribe(_ => {
        const showResult = document.getElementById("result");
        showResult.innerText = "YOU LOSE";
    });
    game.takeWhile(({ p1Score, p2Score }) => (Number(p1Score.innerText) < 11) && (Number(p2Score.innerText) < 11))
        .subscribe(() => { }, () => {
        ballUnsub();
        paddleColorUnsub();
        playerOnePaddleUnsub();
        playerTwoPaddleUnsub();
        midPaddleUnsub();
    });
}
function createPaddle(x, y, svg) {
    return new Elem(svg, 'rect')
        .attr('x', x).attr('y', y)
        .attr('width', 8).attr('height', 80)
        .attr('fill', '#FFFFFF');
}
function hitPlayerOnePaddle(ball, playerOnePaddle) {
    const ballX = Number(ball.attr('cx')), ballY = Number(ball.attr('cy')), ballRadius = Number(ball.attr('r')), paddleOneYTop = Number(playerOnePaddle.attr('y')), paddleOneYBottom = paddleOneYTop + Number(playerOnePaddle.attr('height')), paddleOneTouchSide = Number(playerOnePaddle.attr('x')) + Number(playerOnePaddle.attr('width')), hitPaddleOneX = (ballX - ballRadius) <= (paddleOneTouchSide) &&
        (ballX - ballRadius) >= (paddleOneTouchSide - 8), hitPaddleOneY = (ballY + ballRadius >= paddleOneYTop) && (ballY - ballRadius <= paddleOneYBottom);
    return (hitPaddleOneX && hitPaddleOneY);
}
function hitPlayerTwoPaddle(ball, playerTwoPaddle) {
    const ballX = Number(ball.attr('cx')), ballY = Number(ball.attr('cy')), ballRadius = Number(ball.attr('r')), paddleTwoYTop = Number(playerTwoPaddle.attr('y')), paddleTwoYBottom = paddleTwoYTop + Number(playerTwoPaddle.attr('height')), paddleTwoTouchSide = Number(playerTwoPaddle.attr('x')), hitPaddleTwoX = (ballX + ballRadius) >= (paddleTwoTouchSide) &&
        (ballX + ballRadius) <= (paddleTwoTouchSide + 8), hitPaddleTwoY = (ballY + ballRadius >= paddleTwoYTop) && (ballY - ballRadius <= paddleTwoYBottom);
    return (hitPaddleTwoX && hitPaddleTwoY);
}
function hitMidPaddle(ball, midPaddle) {
    const ballX = Number(ball.attr('cx')), ballY = Number(ball.attr('cy')), ballRadius = Number(ball.attr('r')), paddleTop = Number(midPaddle.attr('y')), paddleBottom = paddleTop + Number(midPaddle.attr('height')), paddleTouchSideL = Number(midPaddle.attr('x')), paddleTouchSideR = Number(midPaddle.attr('x')) + Number(midPaddle.attr('width')), hitMidPaddleX = ((ballX - ballRadius) <= (paddleTouchSideR) &&
        (ballX - ballRadius) >= (paddleTouchSideR - 8)) ||
        ((ballX + ballRadius) >= (paddleTouchSideL) &&
            (ballX + ballRadius) <= (paddleTouchSideL + 8)), hitMidPaddleY = (ballY + ballRadius >= paddleTop) && (ballY - ballRadius <= paddleBottom);
    return (hitMidPaddleX && hitMidPaddleY);
}
function isOutOfBound(ball) {
    return ((Number(ball.attr('cy')) - Number(ball.attr('r')) <= 50) ||
        (Number(ball.attr('cy')) + Number(ball.attr('r')) >= 550));
}
function playerOneScored(ball) {
    return (Number(ball.attr('cx')) >= 805);
}
function playerTwoScored(ball) {
    return (Number(ball.attr('cx')) <= -5);
}
function paddleAIPattern(ball, paddle) {
    const ballY = Number(ball.attr('cy')), paddleYTop = Number(paddle.attr('y')), paddleYCenter = paddleYTop + Number(paddle.attr('height')) / 2, adjustment = 4;
    if (paddleYCenter - 10 > ballY) {
        movePaddle(paddle, 0, -adjustment);
    }
    else if (paddleYCenter + 10 < ballY) {
        movePaddle(paddle, 0, adjustment);
    }
}
function moveBall(ball, x, y) {
    ball.attr('cx', Number(ball.attr('cx')) + Number(x))
        .attr('cy', Number(ball.attr('cy')) + Number(y));
}
function movePaddle(paddle, x, y) {
    paddle.attr('x', String(Number(paddle.attr('x')) + Number(x)))
        .attr('y', String(Number(paddle.attr('y')) + Number(y)));
}
function ballPhysics(ball, paddle, initialBallSpeed) {
    const paddleHalfHeight = Number(paddle.attr('height')) / 2, paddleCenterYAxis = Number(paddle.attr('y')) + paddleHalfHeight, distanceBetweenTouchpointAndCenter = paddleCenterYAxis - Number(ball.attr('cy')), distancePercentage = distanceBetweenTouchpointAndCenter / paddleHalfHeight, Pi = 3.14159265359, bounceAngle = distancePercentage * (7 / 18 * Pi), ballX = Number(ball.attr('cx')), ballVectorX = (ballX < 200 || (ballX > 400 && ballX < 600)) ? -1 : 1;
    return ({
        ballVx: Number(initialBallSpeed) * Math.cos(bounceAngle) * ballVectorX * -1,
        ballVy: Number(initialBallSpeed) * -Math.sin(bounceAngle)
    });
}
function switchColor(ele) {
    if (ele.attr('fill') == "#FFFFFF") {
        ele.attr('fill', "#00FFFF");
    }
    else {
        ele.attr('fill', "#FFFFFF");
    }
}
if (typeof window != 'undefined')
    window.onload = () => {
        pong();
    };
//# sourceMappingURL=pong.js.map