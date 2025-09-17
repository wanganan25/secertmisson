import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADGfYlLyMB-W5A2JM6uF8VqTiF3LL9lEI",
  authDomain: "secertmisson-19e11.firebaseapp.com",
  databaseURL: "https://secertmisson-19e11-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "secertmisson-19e11",
  storageBucket: "secertmisson-19e11.firebasestorage.app",
  messagingSenderId: "730645471093",
  appId: "1:730645471093:web:dacceb7a79256deb06fd3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  clientId: localStorage.getItem("yellowcard-client-id") || crypto.randomUUID(),
  nickname: "",
  roomsUnsub: null,
  roomDocUnsub: null,
  playersUnsub: null,
  submissionsUnsub: null,
  currentRoomId: null,
  currentRoomData: null,
  playerMap: new Map()
};
localStorage.setItem("yellowcard-client-id", state.clientId);

const nicknameInput = document.getElementById("nickname");
const roomCardsEl = document.getElementById("room-cards");
const currentRoomBox = document.getElementById("current-room-box");
const currentRoomName = document.getElementById("current-room-name");
const currentRoomInfo = document.getElementById("current-room-info");
const btnReady = document.getElementById("btn-ready");
const btnLeave = document.getElementById("btn-leave");
const btnStart = document.getElementById("btn-start");
const btnDrawTopic = document.getElementById("btn-draw-topic");
const btnRecycleTopic = document.getElementById("btn-recycle-topic");
const btnResetRoom = document.getElementById("btn-reset-room");
const statusPanel = document.getElementById("status-panel");
const playersPanel = document.getElementById("players-panel");
const hostPanel = document.getElementById("host-panel");
const playerPanel = document.getElementById("player-panel");
const gamePhaseEl = document.getElementById("game-phase");
const judgeInfoEl = document.getElementById("judge-info");
const topicTextEl = document.getElementById("topic-text");
const topicRemainingEl = document.getElementById("topic-remaining");
const playersBody = document.getElementById("players-body");
const submissionList = document.getElementById("submission-list");
const submitForm = document.getElementById("submit-form");
const handSelect = document.getElementById("hand-select");

nicknameInput.addEventListener("input", () => {
  state.nickname = nicknameInput.value.trim();
});

btnReady.addEventListener("click", () => {
  if (state.currentRoomId) toggleReady();
});

btnLeave.addEventListener("click", () => {
  if (state.currentRoomId) leaveRoom(state.currentRoomId);
});

btnStart.addEventListener("click", () => {
  if (state.currentRoomId) startRound();
});

btnDrawTopic.addEventListener("click", drawTopic);
btnRecycleTopic.addEventListener("click", recycleTopics);
btnResetRoom.addEventListener("click", resetRoom);

submitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.currentRoomId) return;
  const word = handSelect.value;
  if (!word) {
    alert("目前沒有可提交的詞語");
    return;
  }
  submitHand(word);
});

signInAnonymously(auth).catch(console.error);
onAuthStateChanged(auth, (user) => {
  if (user && !state.roomsUnsub) subscribeRooms();
});

function subscribeRooms() {
  const roomsRef = collection(db, "yellowRooms");
  state.roomsUnsub = onSnapshot(roomsRef, (snapshot) => {
    const rooms = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderRoomCards(rooms);
  });
}

function renderRoomCards(rooms) {
  roomCardsEl.innerHTML = "";
  rooms.forEach((room) => {
    const card = document.createElement("article");
    card.className = "room-card" + (room.id === state.currentRoomId ? " active" : "");
    const playerCount = Array.isArray(room.playerIds) ? room.playerIds.length : (room.playerCount || 0);
    const capacity = room.capacity || 8;
    card.innerHTML = `
      <div>
        <div class="room-name">${room.name || room.id}</div>
        <div class="room-meta">
          <span>玩家：${playerCount} / ${capacity}</span>
          <span>題目剩餘：${Array.isArray(room.topicDeck) ? room.topicDeck.length : 0}</span>
        </div>
      </div>
      <div class="badges"></div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn-primary" data-action="join">加入房間</button>
        <button class="btn-ghost" data-action="peek">僅檢視</button>
      </div>
    `;
    const badges = card.querySelector(".badges");
    if (room.hostId) {
      badges.appendChild(makeBadge(`房主 ${room.hostNickname || "—"}`, "host"));
    }
    if (room.currentTopic) {
      badges.appendChild(makeBadge("進行中", ""));
    }
    card.querySelector('[data-action="join"]').addEventListener("click", () => joinRoom(room.id));
    card.querySelector('[data-action="peek"]').addEventListener("click", () => watchRoom(room.id, true));
    roomCardsEl.appendChild(card);
  });
}

function makeBadge(text, extra) {
  const span = document.createElement("span");
  span.className = "badge" + (extra ? ` ${extra}` : "");
  span.textContent = text;
  return span;
}

async function joinRoom(roomId) {
  const nickname = (state.nickname || nicknameInput.value || "").trim();
  if (!nickname) {
    alert("請先輸入暱稱");
    nicknameInput.focus();
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, "yellowRooms", roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const capacity = data.capacity || 8;
      const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds] : [];
      const already = playerIds.includes(state.clientId);
      const playersRef = collection(roomRef, "players");
      const meRef = doc(playersRef, state.clientId);
      const meSnap = await tx.get(meRef);
      if (!already) {
        if (playerIds.length >= capacity) throw new Error("房間已滿");
        const sameName = await getDocs(playersRef);
        sameName.forEach((docSnap) => {
          if (docSnap.data().nickname === nickname) {
            throw new Error("房間內已有相同暱稱");
          }
        });
        playerIds.push(state.clientId);
        const isHost = !data.hostId;
        const wordDeck = Array.isArray(data.wordDeck) ? [...data.wordDeck] : [];
        const drawCount = Math.min(13, wordDeck.length);
        const hand = wordDeck.splice(0, drawCount);
        tx.update(roomRef, {
          playerIds,
          playerCount: playerIds.length,
          hostId: isHost ? state.clientId : (data.hostId || null),
          hostNickname: isHost ? nickname : (data.hostNickname || null),
          wordDeck,
          updatedAt: serverTimestamp()
        });
        tx.set(meRef, {
          nickname,
          hand,
          yellowCards: 0,
          ready: false,
          isHost,
          joinedAt: serverTimestamp(),
          lastActive: serverTimestamp()
        });
      } else {
        tx.update(meRef, {
          nickname,
          lastActive: serverTimestamp()
        });
      }
    });
    state.nickname = nickname;
    nicknameInput.value = nickname;
    await watchRoom(roomId, false);
  } catch (error) {
    console.error(error);
    alert(error.message || "加入房間失敗");
  }
}

async function leaveRoom(roomId) {
  cleanupRoomWatch();
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, "yellowRooms", roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) return;
      const data = roomSnap.data();
      const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds] : [];
      const index = playerIds.indexOf(state.clientId);
      if (index === -1) return;
      playerIds.splice(index, 1);
      const playersRef = collection(roomRef, "players");
      const meRef = doc(playersRef, state.clientId);
      const meSnap = await tx.get(meRef);
      const meData = meSnap.exists() ? meSnap.data() : null;
      tx.delete(meRef);
      let hostId = data.hostId || null;
      let hostNickname = data.hostNickname || null;
      if (hostId === state.clientId) {
        hostId = playerIds[0] || null;
        if (hostId) {
          const newHostRef = doc(playersRef, hostId);
          const newHostSnap = await tx.get(newHostRef);
          if (newHostSnap.exists()) {
            const newHost = newHostSnap.data();
            hostNickname = newHost.nickname || null;
            tx.update(newHostRef, { isHost: true });
          }
        } else {
          hostNickname = null;
        }
      }
      tx.update(roomRef, {
        playerIds,
        playerCount: playerIds.length,
        hostId,
        hostNickname,
        updatedAt: serverTimestamp()
      });
      if (meData && Array.isArray(meData.hand) && meData.hand.length) {
        const deck = Array.isArray(data.wordDeck) ? [...data.wordDeck] : [];
        tx.update(roomRef, { wordDeck: [...deck, ...meData.hand] });
      }
    });
  } catch (error) {
    console.error(error);
    alert(error.message || "離開房間失敗");
  }
  updateRoomUI(null, null);
}

async function toggleReady() {
  const roomId = state.currentRoomId;
  if (!roomId) return;
  const player = state.playerMap.get(state.clientId);
  if (!player) return;
  await updateDoc(doc(db, "yellowRooms", roomId, "players", state.clientId), {
    ready: !player.ready,
    lastActive: serverTimestamp()
  });
}

async function startRound() {
  const roomId = state.currentRoomId;
  const roomData = state.currentRoomData;
  if (!roomId || !roomData) return;
  if (roomData.hostId !== state.clientId) {
    alert("只有房主可以開始回合");
    return;
  }
  const readyPlayers = Array.from(state.playerMap.values()).filter((p) => p.ready);
  if (!readyPlayers.length) {
    alert("至少要有一位玩家按下準備");
    return;
  }
  const judgeEntry = readyPlayers[0] || state.playerMap.get(state.clientId);
  const judgeId = judgeEntry ? judgeEntry.id : state.clientId;
  const judgeNickname = judgeEntry ? (judgeEntry.nickname || "") : (state.nickname || "");
  await updateDoc(doc(db, "yellowRooms", roomId), {
    phase: "running",
    judgeId,
    judgeNickname,
    currentTopic: roomData.currentTopic || "",
    updatedAt: serverTimestamp()
  });
}
async function drawTopic() {
  const roomId = state.currentRoomId;
  const roomData = state.currentRoomData;
  if (!roomId || !roomData) return;
  if (roomData.hostId !== state.clientId) {
    alert("只有房主可以抽題目");
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, "yellowRooms", roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error("房間不存在");
      const data = roomSnap.data();
      const deck = Array.isArray(data.topicDeck) ? [...data.topicDeck] : [];
      if (!deck.length) throw new Error("題庫已空，請先重置題目");
      const topic = deck.shift();
      const used = Array.isArray(data.usedTopics) ? [...data.usedTopics, topic] : [topic];
      const judgeId = data.judgeId || state.clientId;
      const judgeNickname = data.judgeNickname || roomData.hostNickname || state.nickname || "";
      tx.update(roomRef, {
        topicDeck: deck,
        usedTopics: used,
        currentTopic: topic,
        phase: "topic",
        judgeId,
        judgeNickname,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error(error);
    alert(error.message || "抽題目失敗");
  }
}

async function recycleTopics() {
  const roomId = state.currentRoomId;
  const roomData = state.currentRoomData;
  if (!roomId || !roomData) return;
  if (roomData.hostId !== state.clientId) {
    alert("只有房主可以操作");
    return;
  }
  const used = Array.isArray(roomData.usedTopics) ? [...roomData.usedTopics] : [];
  const deck = Array.isArray(roomData.topicDeck) ? [...roomData.topicDeck] : [];
  const merged = shuffle([...deck, ...used]);
  await updateDoc(doc(db, "yellowRooms", roomId), {
    topicDeck: merged,
    usedTopics: [],
    currentTopic: "",
    judgeId: null,
    judgeNickname: "",
    phase: "idle",
    updatedAt: serverTimestamp()
  });
}

async function resetRoom() {
  const roomId = state.currentRoomId;
  const roomData = state.currentRoomData;
  if (!roomId || !roomData) return;
  if (roomData.hostId !== state.clientId) {
    alert("只有房主可以操作");
    return;
  }
  if (!confirm("確定要重設房間？所有玩家與牌組都會清除。")) return;
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, "yellowRooms", roomId);
      const playersRef = collection(roomRef, "players");
      const submissionsRef = collection(roomRef, "submissions");
      const players = await getDocs(playersRef);
      players.forEach((p) => tx.delete(doc(playersRef, p.id)));
      const submissions = await getDocs(submissionsRef);
      submissions.forEach((s) => tx.delete(doc(submissionsRef, s.id)));
      tx.update(roomRef, {
        playerIds: [],
        playerCount: 0,
        hostId: null,
        hostNickname: null,
        currentTopic: "",
        judgeId: null,
        judgeNickname: "",
        phase: "idle",
        usedTopics: [],
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error(error);
    alert(error.message || "重設房間失敗");
  }
}

async function submitHand(word) {
  const roomId = state.currentRoomId;
  const player = state.playerMap.get(state.clientId);
  if (!roomId || !player) return;
  if (!player.hand.includes(word)) {
    alert("手牌中沒有該詞語");
    return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const playerRef = doc(db, "yellowRooms", roomId, "players", state.clientId);
      const playerSnap = await tx.get(playerRef);
      if (!playerSnap.exists()) throw new Error("玩家不存在");
      const data = playerSnap.data();
      const newHand = (data.hand || []).filter((v) => v !== word);
      tx.update(playerRef, {
        hand: newHand,
        ready: false,
        lastActive: serverTimestamp()
      });
      const roomRef = doc(db, "yellowRooms", roomId);
      const roomSnap = await tx.get(roomRef);
      const roomData = roomSnap.data();
      const deck = Array.isArray(roomData.wordDeck) ? [...roomData.wordDeck] : [];
      const draw = deck.shift();
      tx.update(roomRef, {
        wordDeck: deck,
        updatedAt: serverTimestamp()
      });
      if (draw) {
        newHand.push(draw);
        tx.update(playerRef, { hand: newHand });
      }
      const submissionRef = doc(collection(roomRef, "submissions"), state.clientId);
      tx.set(submissionRef, {
        playerId: state.clientId,
        nickname: data.nickname,
        word,
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error(error);
    alert(error.message || "提交失敗");
  }
}

async function giveYellowCard(targetId) {
  const roomId = state.currentRoomId;
  const roomData = state.currentRoomData;
  if (!roomId || !roomData) return;
  if (roomData.hostId !== state.clientId) {
    alert("只有房主可以給黃牌");
    return;
  }
  await runTransaction(db, async (tx) => {
    const playerRef = doc(db, "yellowRooms", roomId, "players", targetId);
    const snap = await tx.get(playerRef);
    if (!snap.exists()) throw new Error("找不到玩家");
    const data = snap.data();
    const total = (data.yellowCards || 0) + 1;
    tx.update(playerRef, { yellowCards: total });
    if (total >= 3) {
      tx.update(doc(db, "yellowRooms", roomId), {
        phase: "finished",
        updatedAt: serverTimestamp()
      });
    }
  });
}

async function kickPlayer(targetId) {
  const roomId = state.currentRoomId;
  const roomData = state.currentRoomData;
  if (!roomId || !roomData) return;
  if (roomData.hostId !== state.clientId) {
    alert("只有房主可以踢人");
    return;
  }
  if (targetId === state.clientId) return;
  await runTransaction(db, async (tx) => {
    const roomRef = doc(db, "yellowRooms", roomId);
    const snap = await tx.get(roomRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const playerIds = Array.isArray(data.playerIds) ? [...data.playerIds] : [];
    const index = playerIds.indexOf(targetId);
    if (index === -1) return;
    playerIds.splice(index, 1);
    tx.update(roomRef, {
      playerIds,
      playerCount: playerIds.length,
      updatedAt: serverTimestamp()
    });
    tx.delete(doc(roomRef, "players", targetId));
  });
}

function cleanupRoomWatch() {
  if (state.roomDocUnsub) state.roomDocUnsub();
  if (state.playersUnsub) state.playersUnsub();
  if (state.submissionsUnsub) state.submissionsUnsub();
  state.roomDocUnsub = null;
  state.playersUnsub = null;
  state.submissionsUnsub = null;
  state.currentRoomId = null;
  state.currentRoomData = null;
  state.playerMap.clear();
  submissionList.innerHTML = "";
  playersBody.innerHTML = "";
  handSelect.innerHTML = "";
  playerPanel.classList.add("hidden");
  hostPanel.classList.add("hidden");
  playersPanel.classList.add("hidden");
  statusPanel.classList.add("hidden");
}

async function watchRoom(roomId, previewOnly) {
  if (!previewOnly && state.currentRoomId === roomId) return;
  if (!previewOnly) cleanupRoomWatch();
  const roomRef = doc(db, "yellowRooms", roomId);
  state.roomDocUnsub = onSnapshot(roomRef, (docSnap) => {
    if (!docSnap.exists()) {
      if (!previewOnly) cleanupRoomWatch();
      return;
    }
    const data = docSnap.data();
    state.currentRoomData = data;
    if (!previewOnly) {
      state.currentRoomId = roomId;
      updateRoomUI(roomId, data);
    }
    renderRoomStatus(data);
  });
  state.playersUnsub = onSnapshot(query(collection(roomRef, "players"), orderBy("joinedAt", "asc")), (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    state.playerMap = new Map(list.map((p) => [p.id, p]));
    if (!previewOnly && state.currentRoomId === roomId) {
      renderPlayers(list);
      renderHandOptions(state.playerMap.get(state.clientId));
    }
  });
  state.submissionsUnsub = onSnapshot(collection(roomRef, "submissions"), (snapshot) => {
    if (previewOnly || state.currentRoomId !== roomId) return;
    submissionList.innerHTML = "";
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement("div");
      item.className = "room-card";
      item.style.background = "rgba(239,236,255,.7)";
      item.innerHTML = `<strong style="font-size:1rem;">匿名投出</strong><span class="subtext">${data.word || "(尚未填寫)"}</span>`;
      if (state.currentRoomData && state.currentRoomData.hostId === state.clientId) {
        const btn = document.createElement("button");
        btn.className = "btn-ghost";
        btn.textContent = "給予黃牌";
        btn.addEventListener("click", () => giveYellowCard(data.playerId));
        item.appendChild(btn);
      }
      submissionList.appendChild(item);
    });
  });
  if (!previewOnly) {
    currentRoomBox.classList.remove("hidden");
  }
}

function renderRoomStatus(data) {
  statusPanel.classList.remove("hidden");
  gamePhaseEl.textContent = `遊戲狀態：${data.phase || "等待中"}`;
  judgeInfoEl.textContent = `本局裁判：${data.judgeNickname || "—"}`;
  topicTextEl.textContent = data.currentTopic || "尚未抽題目";
  const remaining = Array.isArray(data.topicDeck) ? data.topicDeck.length : 0;
  topicRemainingEl.textContent = `剩餘題目：${remaining}`;
}

function renderPlayers(players) {
  playersPanel.classList.remove("hidden");
  const room = state.currentRoomData;
  const isHost = room && room.hostId === state.clientId;
  hostPanel.classList.toggle("hidden", !isHost);
  btnStart.classList.toggle("hidden", !isHost);
  playerPanel.classList.toggle("hidden", !players.some((p) => p.id === state.clientId));

  playersBody.innerHTML = "";
  players.forEach((player) => {
    const tr = document.createElement("tr");
    if (player.id === state.clientId) tr.classList.add("me");
    if (player.isHost) tr.classList.add("host");
    tr.innerHTML = `
      <td>${player.nickname || "(未命名)"}</td>
      <td>${player.isHost ? "房主" : (player.id === room?.judgeId ? "裁判" : "玩家")}</td>
      <td>${player.yellowCards || 0}</td>
      <td>${player.ready ? "✅" : "⏳"}</td>
      <td>${Array.isArray(player.hand) ? player.hand.length : 0} 張</td>
      <td data-actions></td>
    `;
    const actionsCell = tr.querySelector("[data-actions]");
    if (player.id === state.clientId) {
      const btn = document.createElement("button");
      btn.className = "btn-ghost";
      btn.textContent = player.ready ? "取消準備" : "我準備好了";
      btn.addEventListener("click", toggleReady);
      actionsCell.appendChild(btn);
    } else if (isHost) {
      const kickBtn = document.createElement("button");
      kickBtn.className = "btn-ghost";
      kickBtn.textContent = "踢出";
      kickBtn.addEventListener("click", () => kickPlayer(player.id));
      const cardBtn = document.createElement("button");
      cardBtn.className = "btn-ghost";
      cardBtn.textContent = "黃牌 +1";
      cardBtn.addEventListener("click", () => giveYellowCard(player.id));
      actionsCell.appendChild(kickBtn);
      actionsCell.appendChild(cardBtn);
    }
    playersBody.appendChild(tr);
  });

  const count = players.length;
  const capacity = room?.capacity || 8;
  currentRoomInfo.textContent = `${count} / ${capacity} 人在線`;
  currentRoomName.textContent = `目前房間：${room?.name || room?.id || "—"}`;
}

function renderHandOptions(player) {
  handSelect.innerHTML = "";
  if (!player || !Array.isArray(player.hand) || !player.hand.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = player ? "目前沒有手牌" : "尚未加入房間";
    handSelect.appendChild(option);
    handSelect.disabled = true;
    return;
  }
  handSelect.disabled = false;
  player.hand.forEach((word) => {
    const option = document.createElement("option");
    option.value = word;
    option.textContent = word;
    handSelect.appendChild(option);
  });
}

function updateRoomUI(roomId, data) {
  if (!roomId || !data) {
    currentRoomBox.classList.add("hidden");
    btnReady.textContent = "我準備好了";
    return;
  }
  currentRoomBox.classList.remove("hidden");
  currentRoomName.textContent = `目前房間：${data.name || roomId}`;
  const count = Array.isArray(data.playerIds) ? data.playerIds.length : (data.playerCount || 0);
  const capacity = data.capacity || 8;
  currentRoomInfo.textContent = `${count} / ${capacity} 人在線`;
  btnReady.textContent = state.playerMap.get(state.clientId)?.ready ? "取消準備" : "我準備好了";
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
