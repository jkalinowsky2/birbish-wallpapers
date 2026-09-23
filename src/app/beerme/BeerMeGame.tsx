"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Crosshair, RotateCcw } from "lucide-react";
import BeerMeBattlefield, {
  type Point,
  type Projectile,
  type ProjectileKind,
  type Explosion,
  type DamageFlash,
} from "./BeerMeBattlefield";
import { bodySettled, stepBody, terrainYAt, type Body } from "./terrainPhysics";
import { makeTerrain } from "./terrainGeneration";

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 540;
const GRAVITY = 420;
const VELOCITY_SCALE = 8;
const CRATER_RADIUS = 68;
const CRATER_DEPTH = 54;
const PLAYER_START_X = 105;
const PLAYER_MOVE_LIMIT = WORLD_WIDTH * 0.03;
const PLAYER_MOVE_STEP = WORLD_WIDTH * 0.01;
const OPPONENT_X = 895;
const INITIAL_TERRAIN_SEED = 82097041;
const PROJECTILE_STATS: Record<ProjectileKind, { damage: number; velocity: number }> = {
  classic: { damage: 1, velocity: 1 },
  tallboy: { damage: 1.25, velocity: 1 / 1.25 },
  keg: { damage: 1.5, velocity: 1 / 1.275 },
};
type Turn = "player" | "opponent" | "game-over";

function randomToken(exclude: number) {
  let token = Math.floor(Math.random() * 10000);
  if (token === exclude) token = (token + 1) % 10000;
  return token;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function carveCrater(points: Point[], impact: Point) {
  return points.map((point) => {
    const dx = Math.abs(point.x - impact.x);

    if (dx > CRATER_RADIUS) {
      return point;
    }

    const strength = Math.cos((dx / CRATER_RADIUS) * (Math.PI / 2));
    const craterY = impact.y + CRATER_DEPTH * strength;

    return {
      ...point,
      y: clamp(Math.max(point.y, craterY), 120, WORLD_HEIGHT - 18),
    };
  });
}

function blastDamage(impact: Point, target: Point, kind: ProjectileKind) {
  const hitDistance = distance(impact, target);

  if (hitDistance > CRATER_RADIUS) {
    return 0;
  }

  const baseDamage = 25 - (hitDistance / CRATER_RADIUS) * 20;
  return Math.round(baseDamage * PROJECTILE_STATS[kind].damage);
}

export default function BeerMeGame() {
  const [terrain, setTerrain] = useState(() => makeTerrain(INITIAL_TERRAIN_SEED));
  const [playerOffset, setPlayerOffset] = useState(0);
  const [player, setPlayer] = useState<Point>(() => ({ x: PLAYER_START_X, y: terrainYAt(terrain, PLAYER_START_X) }));
  const [opponent, setOpponent] = useState<Point>(() => ({ x: OPPONENT_X, y: terrainYAt(terrain, OPPONENT_X) }));
  const [settling, setSettling] = useState(false);
  const bodiesRef = useRef<Body[]>([]);
  const consoleRef = useRef<HTMLElement>(null);

  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(72);
  const [projectileKind, setProjectileKind] = useState<ProjectileKind>("classic");
  const [tallboysRemaining, setTallboysRemaining] = useState(4);
  const [kegsRemaining, setKegsRemaining] = useState(1);
  const [playerToken, setPlayerToken] = useState(8209);
  const [playerTokenInput, setPlayerTokenInput] = useState("8209");
  const [opponentToken, setOpponentToken] = useState(7041);
  const [turn, setTurn] = useState<Turn>("player");
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [projectile, setProjectile] = useState<Projectile | null>(null);
  const [explosion, setExplosion] = useState<Explosion | null>(null);
  const [damageFlash, setDamageFlash] = useState<DamageFlash | null>(null);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [status, setStatus] = useState("Your shot. Tune the arc and let it fly.");
  const rafRef = useRef<number | null>(null);
  const opponentTimerRef = useRef<number | null>(null);
  const explosionTimerRef = useRef<number | null>(null);
  const damageTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (opponentTimerRef.current !== null) {
      window.clearTimeout(opponentTimerRef.current);
      opponentTimerRef.current = null;
    }

    if (explosionTimerRef.current !== null) {
      window.clearTimeout(explosionTimerRef.current);
      explosionTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => () => {
    if (damageTimerRef.current !== null) window.clearTimeout(damageTimerRef.current);
  }, []);

  useEffect(() => {
    setOpponentToken(randomToken(8209));
  }, []);

  useEffect(() => {
    const game = consoleRef.current;
    if (!game) return;
    const title = game.querySelector<HTMLElement>(".beerme-titlebar")!;
    const controls = game.querySelector<HTMLElement>(".beerme-controls")!;
    const fit = () => {
      const sideControls = window.matchMedia("(min-width: 700px)").matches;
      const top = game.getBoundingClientRect().top + window.scrollY;
      const overhead = top + title.offsetHeight + (sideControls ? 0 : controls.offsetHeight) + 28;
      const available = Math.max(80, (window.visualViewport?.height ?? window.innerHeight) - overhead);
      game.style.setProperty("--beerme-field-width", `${Math.floor(available * 50 / 27)}px`);
    };
    const observer = new ResizeObserver(fit);
    [title, controls, game.parentElement!].forEach(element => observer.observe(element));
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);

  const startSettling = useCallback((nextPlayer: Point, nextOpponent: Point) => {
    bodiesRef.current = [nextPlayer, nextOpponent].map(point => ({ ...point, vx: 0, vy: 0 }));
    setSettling(true);
  }, []);

  useEffect(() => {
    if (!settling) return;
    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    const animate = (now: number) => {
      accumulator += Math.min((now - previous) / 1000, 0.05);
      previous = now;
      while (accumulator >= 1 / 120) {
        bodiesRef.current = bodiesRef.current.map(body => stepBody(body, terrain, 1 / 120));
        accumulator -= 1 / 120;
      }
      setPlayer(bodiesRef.current[0]);
      setOpponent(bodiesRef.current[1]);
      if (bodiesRef.current.every(body => bodySettled(body, terrain))) setSettling(false);
      else frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [settling, terrain]);

  const resetGame = useCallback(() => {
    clearTimers();
    if (damageTimerRef.current !== null) {
      window.clearTimeout(damageTimerRef.current);
      damageTimerRef.current = null;
    }
    const nextTerrain = makeTerrain(Date.now());
    setTerrain(nextTerrain);
    setSettling(false);
    setPlayer({ x: PLAYER_START_X, y: terrainYAt(nextTerrain, PLAYER_START_X) });
    setOpponent({ x: OPPONENT_X, y: terrainYAt(nextTerrain, OPPONENT_X) });
    setPlayerOffset(0);
    setAngle(45);
    setPower(72);
    setProjectileKind("classic");
    setTallboysRemaining(4);
    setKegsRemaining(1);
    setTurn("player");
    setPlayerHealth(100);
    setOpponentHealth(100);
    setProjectile(null);
    setExplosion(null);
    setDamageFlash(null);
    setWinner(null);
    setOpponentToken(randomToken(playerToken));
    setStatus("New field. Your shot.");
  }, [clearTimers, playerToken]);

  const applyPlayerToken = () => {
    const parsed = Number(playerTokenInput);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 9999) {
      setPlayerTokenInput(String(playerToken));
      setStatus("Choose a Moonbird token from 0 to 9999.");
      return;
    }

    setPlayerToken(parsed);
    if (parsed === opponentToken) setOpponentToken(randomToken(parsed));
    setStatus(`Moonbird ${parsed} ready. Your shot.`);
  };

  const movePlayer = useCallback(
    (direction: -1 | 1) => {
      if (turn !== "player" || projectile || settling || explosion) return;
      const offset = clamp(playerOffset + direction * PLAYER_MOVE_STEP, -PLAYER_MOVE_LIMIT, PLAYER_MOVE_LIMIT);
      const x = clamp(player.x + offset - playerOffset, 24, WORLD_WIDTH - 24);
      setPlayerOffset(playerOffset + x - player.x);
      const moved = { x, y: terrainYAt(terrain, x) };
      setPlayer(moved);
      startSettling(moved, opponent);
    },
    [projectile, turn, settling, explosion, playerOffset, player, opponent, terrain, startSettling],
  );

  const resolveShot = useCallback(
    (owner: "player" | "opponent", impact: Point, shotKind: ProjectileKind) => {
      setProjectile(null);

      setTerrain(carveCrater(terrain, impact));
      startSettling(player, opponent);
      setExplosion({ ...impact, id: Date.now(), kind: shotKind });
      explosionTimerRef.current = window.setTimeout(() => {
        setExplosion(null);
        explosionTimerRef.current = null;
      }, 1000);

      const target = owner === "player" ? opponent : player;
      const damage = blastDamage(impact, target, shotKind);

      if (damage === 0) {
        setStatus(owner === "player" ? "Ground hit. Incoming." : "Ground hit. Your shot.");
        setTurn(owner === "player" ? "opponent" : "player");
        return;
      }

      if (damageTimerRef.current !== null) window.clearTimeout(damageTimerRef.current);
      setDamageFlash({
        id: Date.now(),
        target: owner === "player" ? "opponent" : "player",
        amount: damage,
      });
      damageTimerRef.current = window.setTimeout(() => {
        setDamageFlash(null);
        damageTimerRef.current = null;
      }, 1200);

      if (owner === "player") {
        setOpponentHealth((current) => {
          const next = Math.max(0, current - damage);
          if (next === 0) {
            setTurn("game-over");
            setWinner("player");
            setStatus("Direct enough. You win.");
          } else {
            setTurn("opponent");
            setStatus(`Blast hit for ${damage}. Opponent is lining up.`);
          }
          return next;
        });
      } else {
        setPlayerHealth((current) => {
          const next = Math.max(0, current - damage);
          if (next === 0) {
            setTurn("game-over");
            setWinner("opponent");
            setStatus("You got tagged. New game?");
          } else {
            setTurn("player");
            setStatus(`They blasted you for ${damage}. Your shot.`);
          }
          return next;
        });
      }
    },
    [opponent, player, terrain, startSettling],
  );

  const launchShot = useCallback(
    (
      owner: "player" | "opponent",
      shotAngle: number,
      shotPower: number,
      shotKind: ProjectileKind = "classic",
    ) => {
      clearTimers();
      setExplosion(null);

      const origin =
        owner === "player"
          ? { x: player.x + 18, y: player.y - 72 }
          : { x: opponent.x - 18, y: opponent.y - 72 };
      const direction = owner === "player" ? 1 : -1;
      const radians = (shotAngle * Math.PI) / 180;
      let x = origin.x;
      let y = origin.y;
      const projectileVelocity = PROJECTILE_STATS[shotKind].velocity;
      const vx = Math.cos(radians) * shotPower * VELOCITY_SCALE * direction * projectileVelocity;
      let vy = -Math.sin(radians) * shotPower * VELOCITY_SCALE * projectileVelocity;
      let lastTime = performance.now();

      setProjectile({ ...origin, owner, kind: shotKind, rotation: (Math.atan2(vy, vx) * 180) / Math.PI });
      setStatus(owner === "player" ? "Shot away." : "Opponent shot away.");

      const frame = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.04);
        lastTime = now;

        x += vx * dt;
        y += vy * dt + 0.5 * GRAVITY * dt * dt;
        vy += GRAVITY * dt;

        // Beyond either edge, continue the boundary terrain height so the shot
        // completes its real arc instead of detonating against the viewport.
        const groundY = terrainYAt(terrain, x);

        if (y >= groundY - 6) {
          resolveShot(owner, { x, y: groundY }, shotKind);
          return;
        }

        // This is only a failsafe for pathological trajectories. The impact is
        // kept far outside the field, so it cannot create an edge explosion.
        if (x < -WORLD_WIDTH * 4 || x > WORLD_WIDTH * 5) {
          resolveShot(owner, { x, y: groundY }, shotKind);
          return;
        }

        setProjectile({ x, y, owner, kind: shotKind, rotation: (Math.atan2(vy, vx) * 180) / Math.PI });
        rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);
    },
    [clearTimers, opponent, player, resolveShot, terrain],
  );

  const firePlayerShot = () => {
    if (turn !== "player" || projectile || settling || explosion) return;
    if (projectileKind === "tallboy") {
      if (tallboysRemaining <= 0) return;
      setTallboysRemaining((current) => current - 1);
      if (tallboysRemaining === 1) setProjectileKind("classic");
    } else if (projectileKind === "keg") {
      if (kegsRemaining <= 0) return;
      setKegsRemaining((current) => current - 1);
      if (kegsRemaining === 1) setProjectileKind("classic");
    }
    setTurn("opponent");
    launchShot("player", angle, power, projectileKind);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea, [contenteditable=true]")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePlayer(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePlayer(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer]);

  useEffect(() => {
    if (turn !== "opponent" || projectile || settling || explosion) return;

    opponentTimerRef.current = window.setTimeout(() => {
      const dx = opponent.x - player.x;
      const dy = player.y - opponent.y;
      const baseAngle = 42 + Math.random() * 12;
      const radians = (baseAngle * Math.PI) / 180;
      const requiredPower = Math.sqrt(
        Math.max(1, (dx * GRAVITY) / Math.max(0.2, Math.sin(2 * radians))),
      ) / VELOCITY_SCALE;
      const heightAdjustment = dy / 90;
      const aiPower = clamp(requiredPower + heightAdjustment + (Math.random() - 0.5) * 14, 48, 92);

      launchShot("opponent", baseAngle, aiPower);
    }, 900);
    return () => {
      if (opponentTimerRef.current !== null) {
        window.clearTimeout(opponentTimerRef.current);
        opponentTimerRef.current = null;
      }
    };
  }, [launchShot, opponent, player, projectile, turn, settling, explosion]);

  const canFire = turn === "player" && !projectile && !settling && !explosion;

  return (
    <section ref={consoleRef} className="beerme-console" aria-label="Beer Me game">
      <div className="beerme-titlebar">
        <div>
          <h2>BEER ME</h2>
          <span className="beerme-subtitle">{playerToken} vs {opponentToken}</span>
        </div>

        <div className="beerme-title-actions">
          <button type="button" className="beerme-button" onClick={resetGame}>
            <RotateCcw size={16} aria-hidden="true" />
            New game
          </button>
        </div>
      </div>

      <div className="beerme-layout">
        <aside className="beerme-controls" aria-label="Shot controls">
          <div className="beerme-controls-heading">Shot controls</div>

          <div className="beerme-inputs">
            <form
              className="beerme-token-select"
              onSubmit={(event) => {
                event.preventDefault();
                applyPlayerToken();
              }}
            >
              <label htmlFor="beerme-player-token">Your Moonbird</label>
              <div>
                <input
                  id="beerme-player-token"
                  type="number"
                  min="0"
                  max="9999"
                  step="1"
                  inputMode="numeric"
                  value={playerTokenInput}
                  onChange={(event) => setPlayerTokenInput(event.target.value)}
                  disabled={!canFire}
                />
                <button type="submit" className="beerme-button" disabled={!canFire || playerTokenInput === String(playerToken)}>
                  Apply
                </button>
              </div>
            </form>

            <label className="beerme-projectile-select">
              <div>
                <span>Projectile</span>
              </div>
              <select
                value={projectileKind}
                onChange={(event) => setProjectileKind(event.target.value as ProjectileKind)}
                disabled={!canFire}
                aria-label="Projectile"
              >
                <option value="classic">12oz (unlimited)</option>
                <option value="tallboy" disabled={tallboysRemaining === 0}>Tallboy ({tallboysRemaining} left)</option>
                <option value="keg" disabled={kegsRemaining === 0}>Keg ({kegsRemaining} left)</option>
              </select>
            </label>

            <div className="beerme-movement">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black">Move</span>
                <span className="text-sm font-black">
                  {playerOffset === 0 ? "Center" : `${playerOffset > 0 ? "+" : ""}${Math.round((playerOffset / WORLD_WIDTH) * 100)}%`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="beerme-button"
                  onClick={() => movePlayer(-1)}
                  disabled={!canFire || playerOffset <= -PLAYER_MOVE_LIMIT}
                  aria-label="Move left"
                  title="Move left"
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="beerme-button"
                  onClick={() => movePlayer(1)}
                  disabled={!canFire || playerOffset >= PLAYER_MOVE_LIMIT}
                  aria-label="Move right"
                  title="Move right"
                >
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black">Angle</span>
                <span className="text-sm font-black">{angle}°</span>
              </div>
              <input
                type="range"
                min="15"
                max="80"
                dir="rtl"
                value={angle}
                onChange={(event) => setAngle(Number(event.target.value))}
                disabled={!canFire}
                className="beerme-range"
                aria-label="Angle"
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black">Power</span>
                <span className="text-sm font-black">{power}</span>
              </div>
              <input
                type="range"
                min="35"
                max="100"
                value={power}
                onChange={(event) => setPower(Number(event.target.value))}
                disabled={!canFire}
                className="beerme-range"
                aria-label="Power"
              />
            </label>

            <button
              type="button"
              className="beerme-button beerme-fire"
              onClick={firePlayerShot}
              disabled={!canFire}
            >
              <Crosshair size={18} aria-hidden="true" /> Fire
            </button>
          </div>

        </aside>

        <div className="beerme-field-column">
          <BeerMeBattlefield
            key="beerme-projectiles-with-keg"
            terrain={terrain}
            player={player}
            opponent={opponent}
            projectile={projectile}
            explosion={explosion}
            angle={angle}
            power={power}
            canFire={canFire}
            playerHealth={playerHealth}
            opponentHealth={opponentHealth}
            playerToken={playerToken}
            opponentToken={opponentToken}
            damageFlash={damageFlash}
            winner={winner}
          />
        </div>
      </div>
      <p className="sr-only" role="status">{status}</p>
    </section>
  );
}
