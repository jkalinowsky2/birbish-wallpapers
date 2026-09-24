"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Crosshair, Music, RotateCcw, Volume2, VolumeX } from "lucide-react";
import BeerMeBattlefield, {
  type Point,
  type Projectile,
  type ProjectileKind,
  type Explosion,
  type DamageFlash,
  type BurstCan,
  type MiniExplosion,
} from "./BeerMeBattlefield";
import { bodySettled, stepBody, terrainYAt, type Body } from "./terrainPhysics";
import { makeTerrain } from "./terrainGeneration";
import {
  playDamage,
  playExplosion,
  playFire,
  playMiniExplosion,
  playMove,
  playPackOpen,
  playVictory,
  setAudioMuted,
  setMusicMuted,
  startMusic,
  stopMusic,
  storedAudioMuted,
  storedMusicMuted,
} from "./audio";

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 540;
const GRAVITY = 420;
const VELOCITY_SCALE = 8;
const BLAST_RADIUS = 68;
const MINI_CRATER_RADIUS = 22;
const MINI_CRATER_DEPTH = 16;
const PLAYER_START_X = 105;
const PLAYER_MOVE_LIMIT = WORLD_WIDTH * 0.03;
const PLAYER_MOVE_STEP = WORLD_WIDTH * 0.01;
const OPPONENT_X = 895;
const INITIAL_TERRAIN_SEED = 82097041;
const AMMO_LIMITS = { tallboy: 6, twelvepack: 4, keg: 2 };
const PROJECTILE_STATS: Record<ProjectileKind, { damage: number; velocity: number }> = {
  classic: { damage: 1, velocity: 1 },
  tallboy: { damage: 1.25, velocity: 1 / 1.25 },
  keg: { damage: 1.5, velocity: 1 / 1.275 },
  twelvepack: { damage: 1, velocity: 1 },
};
const PROJECTILE_TERRAIN: Record<Exclude<ProjectileKind, "twelvepack">, { radius: number; depth: number }> = {
  classic: { radius: MINI_CRATER_RADIUS, depth: MINI_CRATER_DEPTH },
  tallboy: { radius: Math.round(MINI_CRATER_RADIUS * 1.25), depth: Math.round(MINI_CRATER_DEPTH * 1.25) },
  keg: { radius: Math.round(MINI_CRATER_RADIUS * 1.5), depth: Math.round(MINI_CRATER_DEPTH * 1.5) },
};
type Turn = "player" | "opponent" | "game-over";

function randomToken(exclude: number) {
  let token = Math.floor(Math.random() * 10000);
  if (token === exclude) token = (token + 1) % 10000;
  return token;
}

function forcedOpponentFromSearch(search: string) {
  const value = new URLSearchParams(search).get("opponent");
  if (value === null || !/^\d+$/.test(value)) return null;
  const token = Number(value);
  return token >= 0 && token <= 9999 ? token : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function carveCrater(
  points: Point[],
  impact: Point,
  radius: number,
  depth: number,
) {
  return points.map((point) => {
    const dx = Math.abs(point.x - impact.x);

    if (dx > radius) {
      return point;
    }

    const strength = Math.cos((dx / radius) * (Math.PI / 2));
    const craterY = impact.y + depth * strength;

    return {
      ...point,
      y: clamp(Math.max(point.y, craterY), 120, WORLD_HEIGHT - 18),
    };
  });
}

function miniBlastDamage(impact: Point, target: Point) {
  const hitDistance = distance(impact, target);
  if (hitDistance > 60) return 0;
  return Math.round(7 - (hitDistance / 60) * 5);
}

function blastDamage(impact: Point, target: Point, kind: ProjectileKind) {
  const hitDistance = distance(impact, target);

  if (hitDistance > BLAST_RADIUS) {
    return 0;
  }

  const baseDamage = 25 - (hitDistance / BLAST_RADIUS) * 20;
  return Math.round(baseDamage * PROJECTILE_STATS[kind].damage);
}

export default function BeerMeGame() {
  const [terrain, setTerrain] = useState(() => makeTerrain(INITIAL_TERRAIN_SEED));
  const [playerOffset, setPlayerOffset] = useState(0);
  const [player, setPlayer] = useState<Point>(() => ({ x: PLAYER_START_X, y: terrainYAt(terrain, PLAYER_START_X) }));
  const [opponent, setOpponent] = useState<Point>(() => ({ x: OPPONENT_X, y: terrainYAt(terrain, OPPONENT_X) }));
  const [settling, setSettling] = useState(false);
  const bodiesRef = useRef<Body[]>([]);
  const forcedOpponentTokenRef = useRef<number | null>(null);
  const consoleRef = useRef<HTMLElement>(null);

  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(72);
  const [projectileKind, setProjectileKind] = useState<ProjectileKind>("classic");
  const [tallboysRemaining, setTallboysRemaining] = useState(AMMO_LIMITS.tallboy);
  const [twelvePacksRemaining, setTwelvePacksRemaining] = useState(AMMO_LIMITS.twelvepack);
  const [kegsRemaining, setKegsRemaining] = useState(AMMO_LIMITS.keg);
  const [opponentTallboysRemaining, setOpponentTallboysRemaining] = useState(AMMO_LIMITS.tallboy);
  const [opponentTwelvePacksRemaining, setOpponentTwelvePacksRemaining] = useState(AMMO_LIMITS.twelvepack);
  const [opponentKegsRemaining, setOpponentKegsRemaining] = useState(AMMO_LIMITS.keg);
  const [playerToken, setPlayerToken] = useState(8209);
  const [playerTokenInput, setPlayerTokenInput] = useState("8209");
  const [opponentToken, setOpponentToken] = useState(7041);
  const [turn, setTurn] = useState<Turn>("player");
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [projectile, setProjectile] = useState<Projectile | null>(null);
  const [explosion, setExplosion] = useState<Explosion | null>(null);
  const [damageFlashes, setDamageFlashes] = useState<DamageFlash[]>([]);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [burstCans, setBurstCans] = useState<BurstCan[]>([]);
  const [miniExplosions, setMiniExplosions] = useState<MiniExplosion[]>([]);
  const [audioMuted, setAudioMutedState] = useState(false);
  const [musicMuted, setMusicMutedState] = useState(false);
  const [status, setStatus] = useState("Your shot. Tune the arc and let it fly.");
  const rafRef = useRef<number | null>(null);
  const opponentTimerRef = useRef<number | null>(null);
  const explosionTimerRef = useRef<number | null>(null);
  const damageTimerRefs = useRef<Set<number>>(new Set());

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
    for (const timer of damageTimerRefs.current) window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const forcedToken = forcedOpponentFromSearch(window.location.search);
    forcedOpponentTokenRef.current = forcedToken;
    setOpponentToken(forcedToken ?? randomToken(8209));
  }, []);

  useEffect(() => {
    const savedMuted = storedAudioMuted();
    setAudioMutedState(savedMuted);
    setAudioMuted(savedMuted);
    const savedMusicMuted = storedMusicMuted();
    setMusicMutedState(savedMusicMuted);
    setMusicMuted(savedMusicMuted);
    return stopMusic;
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
    for (const timer of damageTimerRefs.current) window.clearTimeout(timer);
    damageTimerRefs.current.clear();
    const nextTerrain = makeTerrain(Date.now());
    setTerrain(nextTerrain);
    setSettling(false);
    setPlayer({ x: PLAYER_START_X, y: terrainYAt(nextTerrain, PLAYER_START_X) });
    setOpponent({ x: OPPONENT_X, y: terrainYAt(nextTerrain, OPPONENT_X) });
    setPlayerOffset(0);
    setAngle(45);
    setPower(72);
    setProjectileKind("classic");
    setTallboysRemaining(AMMO_LIMITS.tallboy);
    setTwelvePacksRemaining(AMMO_LIMITS.twelvepack);
    setKegsRemaining(AMMO_LIMITS.keg);
    setOpponentTallboysRemaining(AMMO_LIMITS.tallboy);
    setOpponentTwelvePacksRemaining(AMMO_LIMITS.twelvepack);
    setOpponentKegsRemaining(AMMO_LIMITS.keg);
    setTurn("player");
    setPlayerHealth(100);
    setOpponentHealth(100);
    setProjectile(null);
    setExplosion(null);
    setDamageFlashes([]);
    setWinner(null);
    setBurstCans([]);
    setMiniExplosions([]);
    setOpponentToken(forcedOpponentTokenRef.current ?? randomToken(playerToken));
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
    if (parsed === opponentToken && forcedOpponentTokenRef.current === null) {
      setOpponentToken(randomToken(parsed));
    }
    setStatus(`Moonbird ${parsed} ready. Your shot.`);
  };

  const movePlayer = useCallback(
    (direction: -1 | 1) => {
      if (turn !== "player" || projectile || settling || explosion) return;
      const offset = clamp(playerOffset + direction * PLAYER_MOVE_STEP, -PLAYER_MOVE_LIMIT, PLAYER_MOVE_LIMIT);
      const x = clamp(player.x + offset - playerOffset, 24, WORLD_WIDTH - 24);
      setPlayerOffset(playerOffset + x - player.x);
      const moved = { x, y: terrainYAt(terrain, x) };
      playMove();
      setPlayer(moved);
      startSettling(moved, opponent);
    },
    [projectile, turn, settling, explosion, playerOffset, player, opponent, terrain, startSettling],
  );

  const showDamage = useCallback((
    target: "player" | "opponent",
    amount: number,
    offsetX = 0,
    offsetY = 0,
  ) => {
    const id = Date.now() + Math.random();
    setDamageFlashes((current) => [...current, { id, target, amount, offsetX, offsetY }]);
    const timer = window.setTimeout(() => {
      setDamageFlashes((current) => current.filter((flash) => flash.id !== id));
      damageTimerRefs.current.delete(timer);
    }, 1200);
    damageTimerRefs.current.add(timer);
  }, []);

  const finishShot = useCallback((
    owner: "player" | "opponent",
    damage: number,
    showCombinedDamage = true,
  ) => {
      if (damage === 0) {
        setStatus(owner === "player" ? "Ground hit. Incoming." : "Ground hit. Your shot.");
        setTurn(owner === "player" ? "opponent" : "player");
        return;
      }

      if (showCombinedDamage) {
        showDamage(owner === "player" ? "opponent" : "player", damage);
      }
      playDamage(damage);

      if (owner === "player") {
        setOpponentHealth((current) => {
          const next = Math.max(0, current - damage);
          if (next === 0) {
            setTurn("game-over");
            setWinner("player");
            playVictory();
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
            playVictory();
            setStatus("You got tagged. New game?");
          } else {
            setTurn("player");
            setStatus(`They blasted you for ${damage}. Your shot.`);
          }
          return next;
        });
      }
  }, [showDamage]);

  const launchTwelvePackBurst = useCallback(
    (owner: "player" | "opponent", impact: Point) => {
      setProjectile(null);
      playPackOpen();
      const count = 4 + Math.floor(Math.random() * 3);
      let cans = Array.from({ length: count }, (_, index) => ({
        id: Date.now() + index,
        x: impact.x,
        y: impact.y - 10,
        vx: -105 + (210 * index) / Math.max(1, count - 1) + (Math.random() - 0.5) * 20,
        vy: -145 - Math.random() * 75,
        rotation: Math.random() * Math.PI * 2,
      }));
      let workingTerrain = terrain;
      let totalDamage = 0;
      let lastTime = performance.now();
      const target = owner === "player" ? opponent : player;
      setBurstCans(cans);

      const frame = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.04);
        lastTime = now;
        const airborne: typeof cans = [];

        for (const can of cans) {
          const vy = can.vy + GRAVITY * dt;
          const next = {
            ...can,
            x: can.x + can.vx * dt,
            y: can.y + can.vy * dt + 0.5 * GRAVITY * dt * dt,
            vy,
            rotation: can.rotation + dt * 8,
          };
          const groundY = terrainYAt(workingTerrain, next.x);
          if (next.y >= groundY - 3 && vy > 0) {
            const canImpact = { x: next.x, y: groundY };
            workingTerrain = carveCrater(
              workingTerrain,
              canImpact,
              MINI_CRATER_RADIUS,
              MINI_CRATER_DEPTH,
            );
            const canDamage = miniBlastDamage(canImpact, target);
            totalDamage += canDamage;
            playMiniExplosion();
            if (canDamage > 0) {
              showDamage(
                owner === "player" ? "opponent" : "player",
                canDamage,
                (Math.random() - 0.5) * 52,
                -10 - Math.random() * 30,
              );
            }
            setTerrain(workingTerrain);
            setMiniExplosions((current) => [
              ...current.filter((item) => now - item.startedAt < 600),
              { ...canImpact, id: next.id, startedAt: now },
            ]);
          } else {
            airborne.push(next);
          }
        }

        cans = airborne;
        setBurstCans(airborne);
        if (airborne.length === 0) {
          rafRef.current = null;
          setTerrain(workingTerrain);
          startSettling(player, opponent);
          finishShot(owner, totalDamage, false);
          return;
        }
        rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);
    },
    [finishShot, opponent, player, showDamage, startSettling, terrain],
  );

  const resolveShot = useCallback(
    (owner: "player" | "opponent", impact: Point, shotKind: ProjectileKind) => {
      if (shotKind === "twelvepack") {
        launchTwelvePackBurst(owner, impact);
        return;
      }

      setProjectile(null);
      const crater = PROJECTILE_TERRAIN[shotKind];
      setTerrain(carveCrater(terrain, impact, crater.radius, crater.depth));
      playExplosion(shotKind);
      startSettling(player, opponent);
      setExplosion({ ...impact, id: Date.now(), kind: shotKind });
      explosionTimerRef.current = window.setTimeout(() => {
        setExplosion(null);
        explosionTimerRef.current = null;
      }, 1000);
      const target = owner === "player" ? opponent : player;
      finishShot(owner, blastDamage(impact, target, shotKind));
    },
    [finishShot, launchTwelvePackBurst, opponent, player, terrain, startSettling],
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
      playFire(shotKind);

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
    if (turn !== "player" || projectile || burstCans.length || settling || explosion) return;
    if (projectileKind === "tallboy") {
      if (tallboysRemaining <= 0) return;
      setTallboysRemaining((current) => current - 1);
      if (tallboysRemaining === 1) setProjectileKind("classic");
    } else if (projectileKind === "twelvepack") {
      if (twelvePacksRemaining <= 0) return;
      setTwelvePacksRemaining((current) => current - 1);
      if (twelvePacksRemaining === 1) setProjectileKind("classic");
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
    if (turn !== "opponent" || projectile || burstCans.length || settling || explosion) return;

    opponentTimerRef.current = window.setTimeout(() => {
      const availableProjectiles: ProjectileKind[] = ["classic", "classic", "classic"];
      if (opponentTallboysRemaining > 0) availableProjectiles.push("tallboy", "tallboy");
      if (opponentTwelvePacksRemaining > 0) availableProjectiles.push("twelvepack");
      if (opponentKegsRemaining > 0) availableProjectiles.push("keg");
      const opponentProjectile = availableProjectiles[Math.floor(Math.random() * availableProjectiles.length)];

      if (opponentProjectile === "tallboy") {
        setOpponentTallboysRemaining((current) => current - 1);
      } else if (opponentProjectile === "twelvepack") {
        setOpponentTwelvePacksRemaining((current) => current - 1);
      } else if (opponentProjectile === "keg") {
        setOpponentKegsRemaining((current) => current - 1);
      }

      const dx = opponent.x - player.x;
      const dy = player.y - opponent.y;
      const baseAngle = 42 + Math.random() * 12;
      const radians = (baseAngle * Math.PI) / 180;
      const requiredPower = Math.sqrt(
        Math.max(1, (dx * GRAVITY) / Math.max(0.2, Math.sin(2 * radians))),
      ) / VELOCITY_SCALE;
      const heightAdjustment = dy / 90;
      const projectilePower = (requiredPower + heightAdjustment + (Math.random() - 0.5) * 14) /
        PROJECTILE_STATS[opponentProjectile].velocity;
      const aiPower = clamp(projectilePower, 48, 100);

      launchShot("opponent", baseAngle, aiPower, opponentProjectile);
    }, 900);
    return () => {
      if (opponentTimerRef.current !== null) {
        window.clearTimeout(opponentTimerRef.current);
        opponentTimerRef.current = null;
      }
    };
  }, [
    launchShot,
    opponent,
    player,
    projectile,
    turn,
    settling,
    explosion,
    opponentTallboysRemaining,
    opponentTwelvePacksRemaining,
    opponentKegsRemaining,
    burstCans.length,
  ]);

  const canFire = turn === "player" && !projectile && burstCans.length === 0 && !settling && !explosion;

  return (
    <section ref={consoleRef} className="beerme-console" aria-label="Beer Me game">
      <div className="beerme-titlebar">
        <div>
          <h2>BEER ME</h2>
          <span className="beerme-subtitle">{playerToken} vs {opponentToken}</span>
        </div>

        <div className="beerme-title-actions">
          <button
            type="button"
            className={`beerme-button beerme-audio-toggle${musicMuted ? " is-muted" : ""}`}
            onClick={() => {
              const next = !musicMuted;
              setMusicMutedState(next);
              setMusicMuted(next);
              if (!next) startMusic();
            }}
            aria-label={musicMuted ? "Turn music on" : "Turn music off"}
            title={musicMuted ? "Turn music on" : "Turn music off"}
          >
            <Music size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="beerme-button beerme-audio-toggle"
            onClick={() => {
              const next = !audioMuted;
              setAudioMutedState(next);
              setAudioMuted(next);
              if (!next) playMove();
            }}
            aria-label={audioMuted ? "Unmute sound" : "Mute sound"}
            title={audioMuted ? "Unmute sound" : "Mute sound"}
          >
            {audioMuted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
          </button>
          <button type="button" className="beerme-button" onClick={() => { startMusic(); resetGame(); }}>
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
                <option value="twelvepack" disabled={twelvePacksRemaining === 0}>12 Pack ({twelvePacksRemaining} left)</option>
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
            damageFlashes={damageFlashes}
            winner={winner}
            burstCans={burstCans}
            miniExplosions={miniExplosions}
          />
        </div>
      </div>
      <p className="sr-only" role="status">{status}</p>
    </section>
  );
}
