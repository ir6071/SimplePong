# SimplePong

A browser-based Pong game using vanilla JavaScript and HTML5 Canvas. No build step or dependencies.

## Running

Open `index.html` directly in a browser (file:// works fine) or serve with any static server:

```
python3 -m http.server 8080
```

## File Structure

```
index.html   — entry point; loads canvas, style.css, game.js
game.js      — all game logic (loop, physics, input)
style.css    — dark background, centered canvas, touch-action: none
```

## Controls

| Input | Action |
|-------|--------|
| ArrowUp / W | Move player paddle up |
| ArrowDown / S | Move player paddle down |
| Touch drag | Slide finger to move player paddle (mobile) |

The right paddle is AI-controlled (tracks ball Y position).

## Game Mechanics

- Ball speed increases slightly on each paddle hit (capped at 12 px/frame)
- Paddle hit angle is influenced by where the ball strikes the paddle face
- Score is shown at the top; ball resets toward the scoring side after each point

## Key Constants (game.js)

| Constant | Value | Description |
|----------|-------|-------------|
| `PADDLE_SPEED` | 5 | Player paddle pixels/frame |
| `AI_SPEED` | 4 | AI paddle pixels/frame |
| `BALL_SIZE` | 10 | Ball diameter in pixels |
| `PADDLE_H` | 80 | Paddle height in pixels |
