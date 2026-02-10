import BattleRepository from "../repositories/battle.repo.js";
import UserRepository from "../repositories/user.repo.js";
import {
  calculateGainStar,
  calculateScore,
  calculateExp,
} from "../utils/scoring.js";
import { BATTLE_ROOM_STATUS } from "../common/constants.js";

/**
 * In-memory battle rooms
 * Key: battleId
 */
const rooms = new Map();

/**
 * Simple matchmaking queue
 */
const matchmakingQueue = [];

class BattleService {
  register(io, socket) {
    socket.on("matchmaking:join", (payload) =>
      this.joinMatchmaking(io, socket, payload),
    );

    socket.on("battle:match", (payload) =>
      this.handleMatch(io, socket, payload),
    );

    socket.on("disconnect", () => this.handleDisconnect(io, socket));

    socket.on("matchmaking:cancel", () => {
      this.cancelMatchmaking(socket);
    });

    socket.on("battle:leave", (payload) => {
      this.leaveBattle(socket, payload);
    });
  }

  // MATCHMAKING
  async joinMatchmaking(io, socket, { difficulty }) {
    matchmakingQueue.push({ socket, difficulty });

    if (matchmakingQueue.length < 2) return;

    const p1 = matchmakingQueue.shift();
    const p2 = matchmakingQueue.shift();

    const battleId = crypto.randomUUID();

    p1.socket.join(battleId);
    p2.socket.join(battleId);

    io.to(battleId).emit("matchmaking:matched", {
      battleId: battleId,
      status: BATTLE_ROOM_STATUS.PREPARING,
    });

    const player1Id = p1.socket.userId;
    const player2Id = p2.socket.userId;

    const [battle, battleQuestions, users] = await Promise.all([
      BattleRepository.createBattle(battleId, player1Id, player2Id),
      BattleRepository.loadBattleQuestions(difficulty),
      UserRepository.getByUsers([player1Id, player2Id]),
    ]);

    const now = Date.now();
    const battleDuration = 90;
    const delayDurationMs = 3000;
    const vocab = battleQuestions.vocab;
    const activeVocab = vocab.slice(0, 5);
    const remainingVocab = vocab.slice(5);

    const room = {
      id: battle.id,
      vocabMap: battleQuestions.vocabMap, // wordId -> meaningId
      vocab: battleQuestions.vocab,
      activeVocab,
      remainingVocab,
      matchedVocab: new Set(),
      difficulty,
      startAt: now + delayDurationMs,
      endAt: now + delayDurationMs + battleDuration * 1000,
      duration: battleDuration,
      status: BATTLE_ROOM_STATUS.ACTIVE,
      players: {
        [users[0]["id"]]: this._initPlayer(users[0]),
        [users[1]["id"]]: this._initPlayer(users[1]),
      },
    };

    rooms.set(battle.id, room);

    io.to(battle.id).emit("matchmaking:ready", {
      battleId: battle.id,
      startAt: room.startAt,
      endAt: room.endAt,
      duration: room.duration,
      countdownDuration: delayDurationMs / 1000,
    });

    setTimeout(() => {
      io.to(battle.id).emit("battle:start", {
        battleId: battle.id,
        duration: room.duration,
        startAt: room.startAt,
        endAt: room.endAt,
        vocab: room.vocab,
        pairs: activeVocab, //
        players: room.players,
      });

      io.to(battle.id).emit("battle:vocab_init", {
        pairs: activeVocab,
      });
    }, delayDurationMs);

    setTimeout(() => {
      const room = rooms.get(battle.id);
      if (!room || room.status !== BATTLE_ROOM_STATUS.ACTIVE) return;

      this.endBattle(io, battle.id, {
        reason: "TIME_UP",
      });
    }, room.endAt - now);
  }

  _initPlayer(user) {
    return {
      score: 0,
      combo: 0,
      maxCombo: 0,
      star: 0,
      earnedExp: 0,
      matched: new Set(),
      lastActionAt: 0,
      username: user.username,
      avatar: user.avatar_url,
    };
  }

  isAllVocabMatched(room) {
    return room.activeVocab.length === 0 && room.remainingVocab.length === 0;
  }

  async leaveBattle(socket, { battleId }) {
    const room = rooms.get(battleId);
    if (!room) return;

    const leaverId = socket.userId;
    if (!room.players[leaverId]) return;

    await this.endBattle(socket.server, battleId, {
      reason: "OPPONENT_LEFT",
      leaverId,
    });

    socket.leave(battleId);
  }

  cancelMatchmaking(socket) {
    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
      if (matchmakingQueue[i].socket.id === socket.id) {
        matchmakingQueue.splice(i, 1);
      }
    }
  }

  async endBattle(io, battleId, { reason, leaverId = null }) {
    const room = rooms.get(battleId);
    if (!room || room.status === BATTLE_ROOM_STATUS.FINISHED) return;

    room.status = BATTLE_ROOM_STATUS.FINISHED;

    const playerIds = Object.keys(room.players);
    let playerA = room.players[playerIds[0]];
    let playerB = room.players[playerIds[1]];

    playerA.earnedExp = calculateExp(playerA, playerB);
    console.log(playerA.earnedExp);
    playerB.earnedExp = calculateExp(playerB, playerA);
    console.log(playerB.earnedExp);
    // Determine winner
    let winnerId = null;

    if (reason === "OPPONENT_LEFT" && leaverId) {
      winnerId = playerIds.find((id) => id !== leaverId);
    } else {
      // Highest score wins
      winnerId = playerIds.reduce((a, b) => {
        if (room.players[a].score > room.players[b].score) {
          return a;
        } else if (room.players[a].score < room.players[b].score) {
          return b;
        }
        return null;
      });
    }

    try {
      // DB update
      await BattleRepository.finishBattle(battleId, winnerId, reason);

      // Notify clients
      io.to(battleId).emit("battle:end", {
        battleId,
        reason,
        winnerId,
        players: room.players,
      });
    } catch (err) {
      console.error("endBattle error:", err);
    } finally {
      rooms.delete(battleId);
    }
  }

  // MATCH ACTION
  async handleMatch(io, socket, { battleId, wordId, meaningId }) {
    const room = rooms.get(battleId);
    if (!room || room.status !== BATTLE_ROOM_STATUS.ACTIVE) return;

    const player = room.players[socket.userId];
    if (!player) return;

    // Rate limit (anti-spam)
    const now = Date.now();
    if (now - player.lastActionAt < 300) {
      console.log("battle:action_rejected 1");
      return socket.emit("battle:action_rejected", {
        reason: "RATE_LIMIT",
      });
    }
    player.lastActionAt = now;

    const pairKey = `${wordId}:${meaningId}`;
    if (player.matched.has(pairKey)) {
      console.log("battle:action_rejected 2");
      return io.to(battleId).emit("battle:action_rejected", {
        reason: "ALREADY_MATCHED",
      });
    }

    if (room.matchedVocab.has(wordId)) {
      console.log("battle:action_rejected ALREADY_MATCHED_GLOBAL");
      return socket.emit("battle:action_rejected", {
        reason: "ALREADY_MATCHED_GLOBAL",
      });
    }

    const activePair = room.activeVocab.find((pair) => pair.id === wordId);

    if (!activePair) {
      console.log("battle:action_rejected NOT_IN_ACTIVE");
      return socket.emit("battle:action_rejected", {
        reason: "NOT_IN_ACTIVE",
      });
    }

    // Guard: vocab must be active
    const activeIdx = room.activeVocab.findIndex((pair) => pair.id === wordId);
    if (activeIdx === -1) {
      console.log("battle:action_rejected NOT_IN_ACTIVE");
      return;
    }

    const isCorrect = room.vocabMap[wordId] === meaningId;

    if (isCorrect) {
      player.matched.add(pairKey);
      room.matchedVocab.add(wordId);
      player.combo += 1;
      if (player.combo > player.maxCombo) {
        player.maxCombo = player.combo;
      }
      const gainStar = calculateGainStar({
        combo: player.combo,
        correct: isCorrect,
      });
      player.star += gainStar;
      const gainScore = calculateScore({
        combo: player.combo,
        star: gainStar,
        difficulty: room.difficulty,
        correct: isCorrect,
      });

      player.score += gainScore;

      // REMOVE matched vocab from activeVocab
      room.activeVocab.splice(activeIdx, 1);
    } else {
      player.combo = 0;
    }

    // no need to await
    BattleRepository.logMatch(
      battleId,
      socket.userId,
      wordId,
      meaningId,
      isCorrect,
    );

    if (isCorrect) {
      io.to(battleId).emit("battle:match_result", {
        battleId,
        playerId: socket.userId,
        wordId,
        meaningId,
        isCorrect,
        score: player.score,
        combo: player.combo,
        maxCombo: player.maxCombo,
        star: player.star,
      });
    } else {
      // Incorrect → only sender sees it
      socket.emit("battle:match_result", {
        battleId,
        playerId: socket.userId,
        wordId,
        meaningId,
        isCorrect: false,
        score: player.score,
        combo: player.combo,
        maxCombo: player.maxCombo,
        star: player.star,
      });
    }

    this._trySendNextVocab(io, room, battleId);

    if (this.isAllVocabMatched(room)) {
      room.status = BATTLE_ROOM_STATUS.ENDING;
      this.endBattle(io, battleId, {
        reason: "ALL_MATCHED",
      });
    }
  }

  _trySendNextVocab(io, room, battleId) {
    const remaining = room.remainingVocab.length;
    if (remaining === 0) return;

    const freeSlots = 5 - room.activeVocab.length;
    if (freeSlots === 0) return;

    let countToSend = 0;

    // Rule 1: exactly 1 slot free & 1 remaining
    if (freeSlots === 1 && remaining === 1) {
      countToSend = 1;
    }
    // Rule 2 & 3: more than 1 slot free
    else if (freeSlots > 1) {
      countToSend = Math.min(freeSlots, remaining);
    }

    if (countToSend === 0) return;

    const nextPairs = room.remainingVocab.splice(0, countToSend);
    // update active vocab
    room.activeVocab.push(...nextPairs);

    // notify clients
    io.to(battleId).emit("battle:vocab_next", {
      pairs: nextPairs,
    });
  }

  // -------------------------
  // DISCONNECT
  // -------------------------
  handleDisconnect(io, socket) {
    for (const [battleId, room] of rooms.entries()) {
      if (!room.players[socket.userId]) continue;

      this.endBattle(io, battleId, {
        reason: "DISCONNECT",
        leaverId: socket.userId,
      });

      break;
    }
  }
}

export default new BattleService();
