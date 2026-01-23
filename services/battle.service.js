import BattleRepository from "../repositories/battle.repo.js";
import UserRepository from "../repositories/user.repo.js";
import { calculateScore } from "../utils/scoring.js";
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

  // -------------------------
  // MATCHMAKING
  // -------------------------
  async joinMatchmaking(io, socket, { difficulty }) {
    matchmakingQueue.push({ socket, difficulty });

    if (matchmakingQueue.length < 2) return;

    const p1 = matchmakingQueue.shift();
    const p2 = matchmakingQueue.shift();

    const battle = await BattleRepository.createBattle(
      p1.socket.userId,
      p2.socket.userId,
      difficulty,
    );

    const users = await UserRepository.getByUsers([
      p1.socket.userId,
      p2.socket.userId,
    ]);

    const vocab = battle.vocab;
    const activeVocab = vocab.slice(0, 5);
    const remainingVocab = vocab.slice(5);

    const room = {
      id: battle.id,
      vocabMap: battle.vocabMap, // wordId -> meaningId
      vocab: battle.vocab,
      activeVocab,
      remainingVocab,
      matchedVocab: new Set(),
      difficulty,
      startAt: Date.now() + 3000,
      duration: 60,
      status: BATTLE_ROOM_STATUS.ACTIVE,
      players: {
        [users[0]["id"]]: this._initPlayer(users[0]),
        [users[1]["id"]]: this._initPlayer(users[1]),
      },
    };

    rooms.set(battle.id, room);

    p1.socket.join(battle.id);
    p2.socket.join(battle.id);

    io.to(battle.id).emit("matchmaking:matched", {
      battleId: battle.id,
      startAt: room.startAt,
    });

    setTimeout(() => {
      io.to(battle.id).emit("battle:start", {
        battleId: battle.id,
        duration: 60,
        vocab: room.vocab,
        pairs: activeVocab, //
        players: room.players,
      });

      io.to(battle.id).emit("battle:vocab_init", {
        pairs: activeVocab,
      });
    }, 3000);

    setTimeout(() => {
      const room = rooms.get(battle.id);
      if (!room || room.status !== BATTLE_ROOM_STATUS.ACTIVE) return;

      this.endBattle(io, battle.id, {
        reason: "TIME_UP",
      });
    }, 600000);
  }

  _initPlayer(user) {
    return {
      score: 0,
      combo: 0,
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

    // Determine winner
    let winnerId = null;

    if (reason === "OPPONENT_LEFT" && leaverId) {
      winnerId = playerIds.find((id) => id !== leaverId);
    } else {
      // Highest score wins
      winnerId = playerIds.reduce((a, b) =>
        room.players[a].score >= room.players[b].score ? a : b,
      );
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

      const gain = calculateScore({
        combo: player.combo,
        // timeLeft: Math.max(0, Math.floor((room.startAt + 60000 - now) / 1000)),
        difficulty: room.difficulty,
      });

      player.score += gain;

      // REMOVE matched vocab from activeVocab
      console.log("BEFORE REMOVE" + room.activeVocab.length);
      //room.activeVocab = room.activeVocab.filter((pair) => pair.id !== wordId);
      room.activeVocab.splice(activeIdx, 1);
      console.log("AFTER REMOVE" + room.activeVocab.length);
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
    console.log("REMAINING " + room.remainingVocab.length);
    console.log("ACTIVE " + room.activeVocab.length);
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
    console.log("NEXT PAIRS");
    console.log(nextPairs);
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
